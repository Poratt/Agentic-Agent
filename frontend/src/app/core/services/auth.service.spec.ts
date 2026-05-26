import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuthService } from './auth.service';
import { UserForLogin } from '../models/user-for-login.interface';
import { environment } from '../../environments/environment';
import { User } from '../models/user.interface';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { UserRole } from '../enums/user-role.enum';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        provideZonelessChangeDetection()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call login with correct payload', () => {
    const payload: UserForLogin = { email: 'test@example.com', password: 'password123' };
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.Admin,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'token'
    };
    const mockResponse: ServiceResultContainer<User> = {
      success: true,
      message: 'Success',
      result: mockUser
    };

    service.login(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should call register with correct payload', () => {
    const payload: UserForLogin = { email: 'new@example.com', password: 'password123' };
    const mockUser: User = {
      id: 2,
      email: 'new@example.com',
      role: UserRole.User,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'token'
    };
    const mockResponse: ServiceResultContainer<User> = {
      success: true,
      message: 'Success',
      result: mockUser
    };

    service.register(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should call refresh', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.Admin,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'token'
    };
    const mockResponse: ServiceResultContainer<User> = {
      success: true,
      message: 'Success',
      result: mockUser
    };

    service.refresh().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call logout', () => {
    const mockResponse: ServiceResultContainer<{ ok: true }> = {
      success: true,
      message: 'Success',
      result: { ok: true }
    };

    service.logout().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call me', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      role: UserRole.Admin,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'token'
    };
    const mockResponse: ServiceResultContainer<User> = {
      success: true,
      message: 'Success',
      result: mockUser
    };

    service.me().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  describe('checkSession', () => {
    it('should return user if me() is successful', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.Admin,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshToken: 'token'
      };
      const mockResponse: ServiceResultContainer<User> = {
        success: true,
        message: 'Success',
        result: mockUser
      };

      const userPromise = service.checkSession();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(mockResponse);

      expect(await userPromise).toEqual(mockUser);
    });

    it('should attempt refresh if me() fails', async () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        role: UserRole.Admin,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshToken: 'token'
      };
      const mockResponse: ServiceResultContainer<User> = {
        success: true,
        message: 'Success',
        result: mockUser
      };

      const userPromise = service.checkSession();

      const meReq = httpMock.expectOne(`${baseUrl}/me`);
      meReq.error(new ErrorEvent('Network error'));

      // We need to wait for the first promise to resolve/reject before the second request is made
      await Promise.resolve();

      const refreshReq = httpMock.expectOne(`${baseUrl}/refresh`);
      refreshReq.flush(mockResponse);

      expect(await userPromise).toEqual(mockUser);
    });

    it('should return null if both me() and refresh() fail', async () => {
      const userPromise = service.checkSession();

      const meReq = httpMock.expectOne(`${baseUrl}/me`);
      meReq.error(new ErrorEvent('Network error'));

      await Promise.resolve();

      const refreshReq = httpMock.expectOne(`${baseUrl}/refresh`);
      refreshReq.error(new ErrorEvent('Network error'));

      expect(await userPromise).toBeNull();
    });

    it('should return null if me() returns empty result', async () => {
      const mockResponse = {
        success: true,
        message: 'Success',
        result: null
      } as unknown as ServiceResultContainer<User>;

      const userPromise = service.checkSession();

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(mockResponse);

      expect(await userPromise).toBeNull();
    });
  });
});
