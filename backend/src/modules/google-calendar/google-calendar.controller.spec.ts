import { GoogleCalendarController } from './google-calendar.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

/**
 * C4 guard matrix — every calendar endpoint must require a valid JWT, except
 * `callback` which is a browser redirect from Google (no Authorization header
 * can be sent) and is instead protected by the OAuth CSRF `state` + httpOnly
 * cookie + non-expired DB row validation inside GoogleCalendarService.
 */
function guardsFor(method: string): unknown[] {
  return Reflect.getMetadata('__guards__', GoogleCalendarController.prototype[method]) ?? [];
}

describe('GoogleCalendarController — guard matrix (C4)', () => {
  it('requires JWT on /calendar/auth (starts the OAuth flow)', () => {
    expect(guardsFor('auth')).toContain(JwtAuthGuard);
  });

  it('requires JWT on GET /calendar/events', () => {
    expect(guardsFor('events')).toContain(JwtAuthGuard);
  });

  it('requires JWT on POST /calendar/events', () => {
    expect(guardsFor('createEvent')).toContain(JwtAuthGuard);
  });

  it('requires JWT on PATCH /calendar/events', () => {
    expect(guardsFor('updateEvent')).toContain(JwtAuthGuard);
  });

  it('requires JWT on DELETE /calendar/events', () => {
    expect(guardsFor('deleteEvent')).toContain(JwtAuthGuard);
  });

  it('leaves /calendar/callback unguarded (browser redirect) — CSRF state is the protection', () => {
    expect(guardsFor('callback')).not.toContain(JwtAuthGuard);
  });
});
