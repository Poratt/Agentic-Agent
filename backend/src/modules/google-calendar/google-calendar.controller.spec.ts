import { GoogleCalendarController } from './google-calendar.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { GoogleCalendarService } from './google-calendar.service';

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

describe('GoogleCalendarController — ServiceResultContainer shape', () => {
  const service = {
    listEvents: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getAuthUrl: jest.fn(),
    handleCallback: jest.fn(),
  } as unknown as GoogleCalendarService;
  const controller = new GoogleCalendarController(service as any);
  const req = { user: { sub: 1 } } as any;

  it('events wraps the Google event array', async () => {
    (service.listEvents as jest.Mock).mockResolvedValue([{ id: 'g1', summary: 'פגישה' }]);

    const result = await controller.events(req);

    expect(result.success).toBe(true);
    expect(result.message).toContain('נטענו');
    expect(result.result).toEqual([{ id: 'g1', summary: 'פגישה' }]);
  });

  it('createEvent wraps the created Google event', async () => {
    (service.createEvent as jest.Mock).mockResolvedValue({ id: 'g2', htmlLink: 'https://…' });

    const result = await controller.createEvent(req, {} as any);

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ id: 'g2', htmlLink: 'https://…' });
  });

  it('updateEvent wraps the updated Google event', async () => {
    (service.updateEvent as jest.Mock).mockResolvedValue({ id: 'g3', summary: 'עודכן' });

    const result = await controller.updateEvent(req, {} as any);

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ id: 'g3', summary: 'עודכן' });
  });
});
