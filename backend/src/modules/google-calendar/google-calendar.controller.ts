import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Query } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiOkResponse,
    ApiCreatedResponse,
    ApiBadRequestResponse,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { Credentials } from 'google-auth-library';

import { GoogleCalendarService } from './google-calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DeleteEventDto } from './dto/delete-event.dto';
import { CustomApiOperationOptions } from '../../core/types/custom-api-operation-options.type';

/**
 * Controller for Google Calendar integration.
 *
 * Base path: /calendar
 *
 * Endpoints summary:
 *
 * | Method | Path              | Description                                  |
 * | ------ | ----------------- | -------------------------------------------- |
 * | GET    | /calendar/auth    | Get Google OAuth consent URL                 |
 * | GET    | /calendar/callback| Handle Google OAuth callback                 |
 * | GET    | /calendar/events  | List upcoming calendar events                |
 * | POST   | /calendar/events  | Create a new calendar event                  |
 * | PATCH  | /calendar/events  | Update/reschedule a calendar event           |
 * | DELETE | /calendar/events  | Delete a calendar event                      |
 */
@ApiTags('calendar')
@Controller('calendar')
export class GoogleCalendarController {
    constructor(private calendarService: GoogleCalendarService) { }

    /**
     * Get the Google OAuth2 consent URL.
     *
     * The user must visit this URL to grant access to their Google Calendar.
     * After granting, Google redirects to /calendar/callback with an authorization code.
     *
     * @returns Object containing the OAuth consent URL.
     */
    @Get('auth')
    @ApiOperation({
        summary: 'Get Google OAuth URL',
        summaryHe: 'מקבלים את קישור האישור של Google untuk גישה ליומן',
        description:
            'Returns a URL that the user must visit to grant the application access to their Google Calendar. After granting consent, Google redirects to /calendar/callback with an authorization code.',
    } as CustomApiOperationOptions)
    @ApiOkResponse({
        description: 'OAuth consent URL returned successfully.',
    })
    @ApiBadRequestResponse({ description: 'Not applicable for this endpoint.' })
    auth() {
        return { url: this.calendarService.getAuthUrl() };
    }

    /**
     * Handle the Google OAuth2 callback.
     *
     * Google redirects here with a `code` query parameter after the user grants consent.
     * This endpoint exchanges the code for access and refresh tokens.
     *
     * @param code The authorization code from Google.
     * @returns The OAuth tokens (access_token, refresh_token, etc.).
     */
    @Get('callback')
    @ApiOperation({
        summary: 'Handle Google OAuth callback',
        summaryHe: 'מטפלים בהפנייה חזרה מ-Google אחרי אישור הגישה',
        description:
            'Handles the OAuth callback from Google. Exchanges the authorization code for access and refresh tokens. Typically called automatically by Google after user consent.',
    } as CustomApiOperationOptions)
    @ApiQuery({
        name: 'code',
        type: String,
        description: 'Authorization code received from Google after user consent.',
        example: '4/0Aae7Xt8...',
    })
    @ApiOkResponse({
        description: 'Tokens returned successfully. Contains access_token, refresh_token, etc.',
    })
    @ApiBadRequestResponse({ description: 'Invalid or expired authorization code.' })
    async callback(@Query('code') code: string): Promise<Credentials> {
        const tokens = await this.calendarService.handleCallback(code);
        return tokens;
    }

    /**
     * List upcoming calendar events.
     *
     * Returns events from the start of today up to 7 days ahead.
     * Requires a valid Google OAuth refresh token.
     *
     * @param refreshToken Google OAuth refresh token.
     * @returns Array of calendar events.
     */
    @Get('events')
    @ApiOperation({
        summary: 'List upcoming calendar events',
        summaryHe: 'מציגים את האירועים העתידיים ביומן Google',
        description:
            'Returns upcoming events from the primary Google Calendar. Events are fetched from the start of today up to 7 days ahead, ordered by start time. Maximum 20 events returned.',
    } as CustomApiOperationOptions)
    @ApiQuery({
        name: 'refreshToken',
        type: String,
        description: 'Google OAuth refresh token obtained from the OAuth flow.',
        example: '1//03k_esvioMjAPCgYIARAAGAMSNwF...',
    })
    @ApiOkResponse({
        description: 'Events fetched successfully. Returns an array of calendar events (may be empty).',
    })
    @ApiBadRequestResponse({ description: 'Missing or invalid refreshToken. Complete OAuth flow first via /calendar/auth.' })
    async events(@Query('refreshToken') refreshToken: string) {
        if (!refreshToken) {
            throw new BadRequestException('refreshToken is required. Complete OAuth flow first via /calendar/auth');
        }
        return this.calendarService.listEvents(refreshToken);
    }

    /**
     * Create a new calendar event.
     *
     * @param dto Event creation data including refreshToken, summary, start/end times.
     * @returns The created event details.
     */
    @Post('events')
    @ApiOperation({
        summary: 'Create a new calendar event',
        summaryHe: 'יוצרים אירוע חדש ביומן Google',
        description:
            'Creates a new event in the primary Google Calendar. Requires summary, start time, and end time. Optional fields: description, location. Times should be in ISO 8601 format.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: CreateEventDto,
        description: 'Event creation payload. summary, startTime, and endTime are required.',
        examples: {
            basic: {
                summary: 'Basic meeting',
                value: {
                    refreshToken: '1//03k_esvioMjAPCgYIARAAGAMSNwF...',
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
    @ApiBadRequestResponse({ description: 'Missing required fields or invalid refreshToken.' })
    async createEvent(@Body() dto: CreateEventDto) {
        if (!dto.refreshToken) {
            throw new BadRequestException('refreshToken is required. Complete OAuth flow first via /calendar/auth');
        }
        return this.calendarService.createEvent(
            dto.refreshToken,
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
     * @param dto Event deletion data including refreshToken and eventId.
     * @returns Success confirmation.
     */
    @Delete('events')
    @ApiOperation({
        summary: 'Delete a calendar event',
        summaryHe: 'מוחקים אירוע מהיומן Google',
        description:
            'Deletes an event from the primary Google Calendar by its event ID. Use GET /calendar/events first to retrieve the eventId of the event to delete.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: DeleteEventDto,
        description: 'Event deletion payload. Requires refreshToken and eventId.',
        examples: {
            basic: {
                summary: 'Delete an event',
                value: {
                    refreshToken: '1//03k_esvioMjAPCgYIARAAGAMSNwF...',
                    eventId: 'abc123def456...',
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Event deleted successfully.',
    })
    @ApiBadRequestResponse({ description: 'Missing refreshToken or eventId.' })
    async deleteEvent(@Body() dto: DeleteEventDto) {
        if (!dto.refreshToken) {
            throw new BadRequestException('refreshToken is required. Complete OAuth flow first via /calendar/auth');
        }
        return this.calendarService.deleteEvent(dto.refreshToken, dto.eventId);
    }

    /**
     * Update/reschedule a calendar event.
     *
     * @param dto Event update data including refreshToken, eventId, and optional new values.
     * @returns The updated event details.
     */
    @Patch('events')
    @ApiOperation({
        summary: 'Update/reschedule a calendar event',
        summaryHe: 'מעדכנים או מזיזים אירוע ביומן Google',
        description:
            'Updates an existing event in the primary Google Calendar. All fields except refreshToken and eventId are optional — only provided fields are modified. Use GET /calendar/events first to retrieve the eventId.',
    } as CustomApiOperationOptions)
    @ApiBody({
        type: UpdateEventDto,
        description: 'Event update payload. Only provided fields will be updated.',
        examples: {
            reschedule: {
                summary: 'Reschedule event',
                value: {
                    refreshToken: '1//03k_esvioMjAPCgYIARAAGAMSNwF...',
                    eventId: 'abc123def456...',
                    startTime: '2026-08-04T15:00:00+03:00',
                    endTime: '2026-08-04T16:00:00+03:00',
                },
            },
            rename: {
                summary: 'Rename event',
                value: {
                    refreshToken: '1//03k_esvioMjAPCgYIARAAGAMSNwF...',
                    eventId: 'abc123def456...',
                    summary: 'פגישת עבודה - שם חדש',
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Event updated successfully. Returns the updated event details.',
    })
    @ApiBadRequestResponse({ description: 'Missing refreshToken or eventId.' })
    async updateEvent(@Body() dto: UpdateEventDto) {
        if (!dto.refreshToken) {
            throw new BadRequestException('refreshToken is required. Complete OAuth flow first via /calendar/auth');
        }
        return this.calendarService.updateEvent(
            dto.refreshToken,
            dto.eventId,
            dto.summary,
            dto.startTime,
            dto.endTime,
            dto.description,
            dto.location,
        );
    }
}
