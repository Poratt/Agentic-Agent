import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Query,
    Req,
    Res,
    UseGuards,
    UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiBadRequestResponse,
    ApiUnauthorizedResponse,
    ApiBody,
    ApiQuery,
    ApiBearerAuth,
} from '@nestjs/swagger';

import { GoogleCalendarService } from './google-calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DeleteEventDto } from './dto/delete-event.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RequestWithUser } from '../../core/interfaces/request-with-user.interface';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';

const STATE_COOKIE = 'gcal_state';
const STATE_COOKIE_TTL_MS = 10 * 60 * 1000; // must match the service's STATE_TTL_MS

/**
 * Controller for Google Calendar integration.
 *
 * Base path: /calendar
 *
 * Endpoints summary:
 *
 * | Method | Path              | Guard                  | Description                                  |
 * | ------ | ----------------- | ---------------------- | -------------------------------------------- |
 * | GET    | /calendar/auth    | JwtAuthGuard           | Get Google OAuth consent URL                 |
 * | GET    | /calendar/callback| CSRF state + cookie    | Handle Google OAuth callback                 |
 * | GET    | /calendar/events  | JwtAuthGuard           | List upcoming calendar events                |
 * | POST   | /calendar/events  | JwtAuthGuard           | Create a new calendar event                  |
 * | PATCH  | /calendar/events  | JwtAuthGuard           | Update/reschedule a calendar event           |
 * | DELETE | /calendar/events  | JwtAuthGuard           | Delete a calendar event                      |
 *
 * Security (C4):
 * - Every endpoint except `callback` requires a valid JWT; the user's Google
 *   refresh token is resolved server-side from the JWT identity and is never
 *   accepted from, or returned to, the client.
 * - `callback` is a browser redirect from Google (no JWT header can be sent),
 *   so it is protected by the OAuth `state` parameter: it must match both the
 *   httpOnly cookie set by `/auth` and a non-expired DB row bound to the user.
 * - Event ownership is enforced structurally: events are only ever accessed
 *   through the token stored for the authenticated userId.
 */
@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
export class GoogleCalendarController {
    constructor(private calendarService: GoogleCalendarService) { }

    /**
     * Get the Google OAuth2 consent URL.
     *
     * Starts the OAuth flow for the authenticated user. Sets a short-lived
     * httpOnly `gcal_state` cookie (CSRF protection for the callback).
     *
     * @returns Object containing the OAuth consent URL.
     */
    @Get('auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Get Google OAuth URL',
        summaryHe: 'מקבלים את קישור האישור של Google כדי לחבר את היומן',
        description:
            'Returns a URL that the authenticated user must visit to grant the application access to their Google Calendar. After granting consent, Google redirects to /calendar/callback with an authorization code and state.',
    } as CustomApiOperationOptions)
    @ApiOkResponse({
        description: 'OAuth consent URL returned successfully.',
    })
    @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid.' })
    async auth(@Req() req: RequestWithUser, @Res({ passthrough: true }) res: Response) {
        if (!req.user) {
            throw new UnauthorizedException();
        }
        const { url, state } = await this.calendarService.getAuthUrl(req.user.sub);
        res.cookie(STATE_COOKIE, state, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: STATE_COOKIE_TTL_MS,
            path: '/calendar',
        });
        return { url };
    }

    /**
     * Handle the Google OAuth2 callback.
     *
     * Google redirects the browser here with `code` and `state` after the user
     * grants consent. This is a browser redirect, not a JSON API call, so it is
     * intentionally NOT protected by JwtAuthGuard — instead the `state` must
     * match the httpOnly cookie set by `/auth` and a non-expired DB row.
     *
     * The refresh token is stored server-side (encrypted). The response is a
     * plain success object and never contains access_token / refresh_token.
     *
     * @param code The authorization code from Google.
     * @param state The CSRF state echoed back by Google.
     * @returns A minimal success object.
     */
    @Get('callback')
    @ApiOperation({
        summary: 'Handle Google OAuth callback',
        summaryHe: 'מטפלים בהפנייה חזרה מ-Google אחרי אישור הגישה',
        description:
            'Handles the OAuth callback from Google. Validates the CSRF state, exchanges the authorization code for tokens, and stores the refresh token server-side, encrypted. Typically called automatically by Google after user consent.',
    } as CustomApiOperationOptions)
    @ApiQuery({
        name: 'code',
        type: String,
        description: 'Authorization code received from Google after user consent.',
        example: '4/0Aae7Xt8...',
    })
    @ApiQuery({
        name: 'state',
        type: String,
        description: 'CSRF state value issued by /calendar/auth (also sent as the gcal_state cookie).',
        example: 'a1b2c3...',
    })
    @ApiOkResponse({
        description: 'Calendar connected. Tokens are stored server-side and never returned.',
    })
    @ApiBadRequestResponse({ description: 'Missing code, invalid/expired state, or Google rejected the code.' })
    async callback(@Query('code') code: string, @Query('state') state: string, @Req() req: Request) {
        const cookieState = (req.cookies as Record<string, string> | undefined)?.[STATE_COOKIE];
        return this.calendarService.handleCallback(code, state, cookieState);
    }

    /**
     * List upcoming calendar events.
     *
     * Returns events from the start of today up to 7 days ahead, using the
     * refresh token stored server-side for the authenticated user.
     *
     * @returns Array of calendar events.
     */
    @Get('events')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'List upcoming calendar events',
        summaryHe: 'מציגים את האירועים העתידיים ביומן Google',
        description:
            'Returns upcoming events from the authenticated user\'s primary Google Calendar. Events are fetched from the start of today up to 7 days ahead, ordered by start time. Maximum 20 events returned.',
    } as CustomApiOperationOptions)
    @ApiOkResponse({
        description: 'Events fetched successfully. Returns an array of calendar events (may be empty).',
    })
    @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid.' })
    @ApiBadRequestResponse({ description: 'Calendar not connected. Complete the OAuth flow first via /calendar/auth.' })
    async events(@Req() req: RequestWithUser) {
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return this.calendarService.listEvents(req.user.sub);
    }

    /**
     * Create a new calendar event.
     *
     * @param dto Event creation data including summary, start/end times.
     * @returns The created event details.
     */
    @Post('events')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Create a new calendar event',
        summaryHe: 'יוצרים אירוע חדש ביומן Google',
        description:
            'Creates a new event in the authenticated user\'s primary Google Calendar. Requires summary, start time, and end time. Optional fields: description, location. Times should be in ISO 8601 format.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: CreateEventDto,
        description: 'Event creation payload. summary, startTime, and endTime are required.',
        examples: {
            basic: {
                summary: 'Basic meeting',
                value: {
                    summary: 'פגישת עבודה',
                    startTime: '2026-08-03T20:00:00+03:00',
                    endTime: '2026-08-03T21:00:00+03:00',
                    description: 'פגישת סיכום חודשית',
                    location: 'משרד ראשי',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Event created successfully. Returns the created event details.',
    })
    @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid.' })
    @ApiBadRequestResponse({ description: 'Missing required fields or calendar not connected.' })
    async createEvent(@Req() req: RequestWithUser, @Body() dto: CreateEventDto) {
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return this.calendarService.createEvent(
            req.user.sub,
            dto.summary,
            dto.startTime,
            dto.endTime,
            dto.description,
            dto.location,
        );
    }

    /**
     * Delete a calendar event.
     *
     * @param dto Event deletion data including eventId.
     * @returns Success confirmation.
     */
    @Delete('events')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Delete a calendar event',
        summaryHe: 'מוחקים אירוע מהיומן Google',
        description:
            'Deletes an event from the authenticated user\'s primary Google Calendar by its event ID. Use GET /calendar/events first to retrieve the eventId of the event to delete.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: DeleteEventDto,
        description: 'Event deletion payload. Requires eventId.',
        examples: {
            basic: {
                summary: 'Delete an event',
                value: {
                    eventId: 'abc123def456...',
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Event deleted successfully.',
    })
    @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid.' })
    @ApiBadRequestResponse({ description: 'Missing eventId or calendar not connected.' })
    async deleteEvent(@Req() req: RequestWithUser, @Body() dto: DeleteEventDto) {
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return this.calendarService.deleteEvent(req.user.sub, dto.eventId);
    }

    /**
     * Update/reschedule a calendar event.
     *
     * @param dto Event update data including eventId and optional new values.
     * @returns The updated event details.
     */
    @Patch('events')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: 'Update/reschedule a calendar event',
        summaryHe: 'מעדכנים או מזיזים אירוע ביומן Google',
        description:
            'Updates an existing event in the authenticated user\'s primary Google Calendar. All fields except eventId are optional — only provided fields are modified. Use GET /calendar/events first to retrieve the eventId.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: UpdateEventDto,
        description: 'Event update payload. Only provided fields will be updated.',
        examples: {
            reschedule: {
                summary: 'Reschedule event',
                value: {
                    eventId: 'abc123def456...',
                    startTime: '2026-08-04T15:00:00+03:00',
                    endTime: '2026-08-04T16:00:00+03:00',
                },
            },
            rename: {
                summary: 'Rename event',
                value: {
                    eventId: 'abc123def456...',
                    summary: 'פגישת עבודה - שם חדש',
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Event updated successfully. Returns the updated event details.',
    })
    @ApiUnauthorizedResponse({ description: 'JWT token missing or invalid.' })
    @ApiBadRequestResponse({ description: 'Missing eventId or calendar not connected.' })
    async updateEvent(@Req() req: RequestWithUser, @Body() dto: UpdateEventDto) {
        if (!req.user) {
            throw new UnauthorizedException();
        }
        return this.calendarService.updateEvent(
            req.user.sub,
            dto.eventId,
            dto.summary,
            dto.startTime,
            dto.endTime,
            dto.description,
            dto.location,
        );
    }
}
