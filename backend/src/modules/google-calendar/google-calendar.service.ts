import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google } from 'googleapis';
import { randomBytes } from 'crypto';

import { EncryptionService } from '../../core/services/encryption.service';
import { GoogleCalendarTokenEntity } from './entities/google-calendar-token.entity';

const STATE_TTL_MS = 10 * 60 * 1000; // OAuth state is valid for 10 minutes

@Injectable()
export class GoogleCalendarService {
  constructor(
    @InjectRepository(GoogleCalendarTokenEntity)
    private readonly tokenRepo: Repository<GoogleCalendarTokenEntity>,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Creates a fresh OAuth2 client per call. A shared singleton must not be used
   * because setCredentials() on a shared client would leak tokens between users.
   */
  private createOAuthClient() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    );
  }

  /**
   * Starts the OAuth flow for an authenticated user.
   *
   * Generates a short-lived random `state`, persists it bound to the user, and
   * returns the Google consent URL. The controller stores `state` in an
   * httpOnly cookie so /calendar/callback can validate it (CSRF protection).
   */
  async getAuthUrl(userId: number): Promise<{ url: string; state: string }> {
    const state = randomBytes(32).toString('hex');
    const stateExpiresAt = new Date(Date.now() + STATE_TTL_MS);

    let row = await this.tokenRepo.findOneBy({ userId });
    if (!row) {
      row = this.tokenRepo.create({ userId, state, stateExpiresAt });
    } else {
      // Preserve any existing refreshToken; only refresh the CSRF state.
      row.state = state;
      row.stateExpiresAt = stateExpiresAt;
    }
    await this.tokenRepo.save(row);

    const url = this.createOAuthClient().generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar'],
      state,
    });

    return { url, state };
  }

  /**
   * Handles the Google OAuth callback (browser redirect — no JWT header).
   *
   * Validates the CSRF state (must match the httpOnly cookie set by /auth and a
   * non-expired row in the DB), exchanges the code for tokens, and stores the
   * refresh token encrypted at rest, bound to the user that started the flow.
   *
   * The response intentionally never contains access_token / refresh_token.
   */
  async handleCallback(code: string, state: string | undefined, cookieState: string | undefined) {
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    if (!state || !cookieState || state !== cookieState) {
      throw new BadRequestException('OAuth state mismatch. The flow was not started from this browser.');
    }

    const row = await this.tokenRepo.findOneBy({ state });
    if (!row || !row.stateExpiresAt || row.stateExpiresAt.getTime() < Date.now()) {
      if (row) {
        row.state = null;
        row.stateExpiresAt = null;
        await this.tokenRepo.save(row);
      }
      throw new BadRequestException('OAuth state is invalid or expired. Start the flow again via /calendar/auth');
    }

    const oauth2Client = this.createOAuthClient();
    const { tokens } = await oauth2Client.getToken({ code });

    if (!tokens.refresh_token) {
      throw new BadRequestException('Google did not return a refresh token. Reconnect with consent.');
    }

    row.refreshToken = this.encryption.encrypt(tokens.refresh_token);
    row.state = null;
    row.stateExpiresAt = null;
    await this.tokenRepo.save(row);

    return { success: true, message: 'Google Calendar connected' };
  }

  /**
   * Loads and decrypts the refresh token for the authenticated user.
   * The token is always resolved server-side from the JWT identity — it is
   * never accepted as client input and can never target another user's calendar.
   */
  private async getRefreshToken(userId: number): Promise<string> {
    const row = await this.tokenRepo.findOneBy({ userId });
    if (!row?.refreshToken) {
      throw new BadRequestException('Google Calendar is not connected. Start the OAuth flow via /calendar/auth');
    }
    return this.encryption.decrypt(row.refreshToken);
  }

  private getCalendar(refreshToken: string) {
    const oauth2Client = this.createOAuthClient();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.calendar({ version: 'v3', auth: oauth2Client });
  }

  async listEvents(userId: number) {
    const refreshToken = await this.getRefreshToken(userId);
    const calendar = this.getCalendar(refreshToken);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfWeek.toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items;
  }

  async createEvent(
    userId: number,
    summary: string,
    startTime: string,
    endTime: string,
    description?: string,
    location?: string,
  ) {
    const refreshToken = await this.getRefreshToken(userId);
    const calendar = this.getCalendar(refreshToken);

    const event = {
      summary,
      description,
      location,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Jerusalem',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Jerusalem',
      },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return res.data;
  }

  async deleteEvent(userId: number, eventId: string) {
    const refreshToken = await this.getRefreshToken(userId);
    const calendar = this.getCalendar(refreshToken);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });

    return { success: true, message: 'Event deleted successfully' };
  }

  async updateEvent(
    userId: number,
    eventId: string,
    summary?: string,
    startTime?: string,
    endTime?: string,
    description?: string,
    location?: string,
  ) {
    const refreshToken = await this.getRefreshToken(userId);
    const calendar = this.getCalendar(refreshToken);

    const requestBody: any = {};
    if (summary) requestBody.summary = summary;
    if (description) requestBody.description = description;
    if (location) requestBody.location = location;
    if (startTime) {
      requestBody.start = { dateTime: startTime, timeZone: 'Asia/Jerusalem' };
    }
    if (endTime) {
      requestBody.end = { dateTime: endTime, timeZone: 'Asia/Jerusalem' };
    }

    const res = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody,
    });

    return res.data;
  }
}
