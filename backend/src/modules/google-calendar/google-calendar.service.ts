import { Injectable, BadRequestException } from '@nestjs/common';
import { google } from 'googleapis';
import { Credentials } from 'google-auth-library';

@Injectable()
export class GoogleCalendarService {
    private oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CALENDAR_CLIENT_ID,
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI,
    );

    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/calendar'],
        });
    }

    async handleCallback(code: string): Promise<Credentials> {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    async listEvents(refreshToken: string) {
        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

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
        refreshToken: string,
        summary: string,
        startTime: string,
        endTime: string,
        description?: string,
        location?: string,
    ) {
        if (!refreshToken) {
            throw new BadRequestException('refreshToken is required');
        }

        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

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

    async deleteEvent(refreshToken: string, eventId: string) {
        if (!refreshToken) {
            throw new BadRequestException('refreshToken is required');
        }

        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
        });

        return { success: true, message: 'Event deleted successfully' };
    }

    async updateEvent(
        refreshToken: string,
        eventId: string,
        summary?: string,
        startTime?: string,
        endTime?: string,
        description?: string,
        location?: string,
    ) {
        if (!refreshToken) {
            throw new BadRequestException('refreshToken is required');
        }

        this.oauth2Client.setCredentials({ refresh_token: refreshToken });
        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

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