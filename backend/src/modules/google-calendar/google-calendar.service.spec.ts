import { google } from 'googleapis';
import { BadRequestException } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';

jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn() },
    calendar: jest.fn(),
  },
}));

const mockOAuth2Instance = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn(),
};

const mockCalendarInstance = {
  events: {
    list: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
};

function makeService(overrides: { repo?: any; encryption?: any } = {}) {
  const repo = overrides.repo ?? {
    findOneBy: jest.fn(),
    create: jest.fn((data: any) => data),
    save: jest.fn((row: any) => Promise.resolve(row)),
  };
  const encryption = overrides.encryption ?? { encrypt: jest.fn(), decrypt: jest.fn() };
  return {
    service: new GoogleCalendarService(repo, encryption),
    repo,
    encryption,
  };
}

describe('GoogleCalendarService — C4 security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (google.auth.OAuth2 as unknown as jest.Mock).mockImplementation(() => mockOAuth2Instance);
    (google.calendar as unknown as jest.Mock).mockReturnValue(mockCalendarInstance);
    mockOAuth2Instance.generateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/auth?state=abc');
    mockOAuth2Instance.getToken.mockResolvedValue({ tokens: { refresh_token: 'google-rt-123' } });
    mockCalendarInstance.events.list.mockResolvedValue({ data: { items: [{ id: 'evt-1' }] } });
  });

  describe('getAuthUrl — starts OAuth flow bound to the user', () => {
    it('creates a row with a random state for a first-time user', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      const result = await service.getAuthUrl(7);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, state: expect.any(String), stateExpiresAt: expect.any(Date) }),
      );
      expect(repo.save).toHaveBeenCalled();
      expect(result.url).toContain('state=');
      expect(result.state).toMatch(/^[0-9a-f]{64}$/); // 32 random bytes hex
    });

    it('preserves an existing refreshToken when re-running the flow', async () => {
      const { service, repo } = makeService();
      const existing = {
        userId: 7,
        refreshToken: 'encrypted-old-token',
        state: 'old-state',
        stateExpiresAt: new Date(),
      };
      repo.findOneBy.mockResolvedValue(existing);

      await service.getAuthUrl(7);

      expect(existing.refreshToken).toBe('encrypted-old-token'); // never wiped
      expect(existing.state).not.toBe('old-state'); // refreshed
    });

    it('generates a different state on every call (unguessable)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      const a = await service.getAuthUrl(1);
      const b = await service.getAuthUrl(1);

      expect(a.state).not.toBe(b.state);
    });

    it('regression: repeated auth calls reuse the fresh state — the first flow still completes', async () => {
      const { service, repo } = makeService();
      // auth call #1: user has no row yet → a new state is issued.
      repo.findOneBy.mockResolvedValue(null);
      const first = await service.getAuthUrl(7);
      expect(first.state).toMatch(/^[0-9a-f]{64}$/);

      // auth call #2 while the state is still fresh: same state, nothing written.
      // (Before the fix this overwrote the row and killed the first flow.)
      repo.findOneBy.mockResolvedValue({
        userId: 7,
        state: first.state,
        stateExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        refreshToken: null,
      });
      const second = await service.getAuthUrl(7);
      expect(second.state).toBe(first.state);
      expect(repo.save).toHaveBeenCalledTimes(1); // only the initial creation

      // The callback for the FIRST flow must still validate and complete.
      const result = await service.handleCallback('google-code', first.state, first.state);
      expect(result).toEqual({ success: true, message: expect.any(String) });
    });

    it('regenerates the state when the stored one has expired', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue({
        userId: 7,
        state: 'expired-state',
        stateExpiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.getAuthUrl(7);

      expect(result.state).not.toBe('expired-state');
      expect(repo.save).toHaveBeenCalled();
    });
  });

  describe('handleCallback — CSRF state validation', () => {
    it('rejects a missing code', async () => {
      const { service } = makeService();
      await expect(service.handleCallback('', 'state', 'state')).rejects.toThrow(BadRequestException);
    });

    it('rejects when the URL state does not match the cookie (CSRF / account binding)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue({ userId: 7, state: 'cookie-state', stateExpiresAt: new Date(Date.now() + 60000) });

      await expect(service.handleCallback('code', 'attacker-state', 'victim-cookie-state')).rejects.toThrow(
        BadRequestException,
      );
      expect(repo.save).not.toHaveBeenCalled(); // never stores the token
    });

    it('rejects an unknown state (not issued by /calendar/auth)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.handleCallback('code', 'bogus', 'bogus')).rejects.toThrow(BadRequestException);
      expect(mockOAuth2Instance.getToken).not.toHaveBeenCalled();
    });

    it('rejects and clears an expired state', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue({
        userId: 7,
        state: 'old-state',
        stateExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.handleCallback('code', 'old-state', 'old-state')).rejects.toThrow(BadRequestException);
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ state: null, stateExpiresAt: null }));
      expect(mockOAuth2Instance.getToken).not.toHaveBeenCalled();
    });
  });

  describe('handleCallback — success stores tokens server-side, never returns them', () => {
    it('stores the encrypted refresh token and returns no tokens', async () => {
      const { service, repo, encryption } = makeService();
      encryption.encrypt.mockReturnValue('encrypted:rt:value');
      repo.findOneBy.mockResolvedValue({
        userId: 7,
        state: 'valid-state',
        stateExpiresAt: new Date(Date.now() + 60000),
      });

      const result = await service.handleCallback('code', 'valid-state', 'valid-state');

      expect(mockOAuth2Instance.getToken).toHaveBeenCalledWith({ code: 'code' });
      expect(encryption.encrypt).toHaveBeenCalledWith('google-rt-123');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'encrypted:rt:value', state: null }),
      );

      // The response must never leak access_token / refresh_token
      expect(result).toEqual({ success: true, message: expect.any(String) });
      expect(JSON.stringify(result)).not.toContain('token');
      expect(JSON.stringify(result)).not.toContain('google-rt-123');
    });

    it('rejects when Google returns no refresh_token (offline access missing)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue({
        userId: 7,
        state: 'valid-state',
        stateExpiresAt: new Date(Date.now() + 60000),
      });
      mockOAuth2Instance.getToken.mockResolvedValue({ tokens: { access_token: 'at' } });

      await expect(service.handleCallback('code', 'valid-state', 'valid-state')).rejects.toThrow(BadRequestException);
    });
  });

  describe('event operations — ownership via server-side token lookup', () => {
    it('listEvents throws when the user has no connected token (no Google call)', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.listEvents(42)).rejects.toThrow(BadRequestException);
      expect(mockCalendarInstance.events.list).not.toHaveBeenCalled();
    });

    it('listEvents resolves the token by the authenticated userId only', async () => {
      const { service, repo, encryption } = makeService();
      repo.findOneBy.mockResolvedValue({ userId: 42, refreshToken: 'enc:rt' });
      encryption.decrypt.mockReturnValue('plain-rt');
      mockCalendarInstance.events.list.mockResolvedValue({ data: { items: [{ id: 'evt-1' }] } });

      const items = await service.listEvents(42);

      expect(repo.findOneBy).toHaveBeenCalledWith({ userId: 42 }); // never by refresh token / other user
      expect(encryption.decrypt).toHaveBeenCalledWith('enc:rt');
      expect(items).toEqual([{ id: 'evt-1' }]);
    });

    it('createEvent/updateEvent/deleteEvent all require the user token', async () => {
      const { service, repo } = makeService();
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.createEvent(1, 's', '2026-01-01T10:00:00Z', '2026-01-01T11:00:00Z')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.deleteEvent(1, 'evt')).rejects.toThrow(BadRequestException);
      await expect(service.updateEvent(1, 'evt', 'new title')).rejects.toThrow(BadRequestException);
    });
  });
});
