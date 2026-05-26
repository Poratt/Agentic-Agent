import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';
import { User } from '../models/user.interface';
import { ServiceResultContainer } from '../models/service-result-container.model';
import { UserRole } from '../enums/user-role.enum';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        provideZonelessChangeDetection()
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call list with correct endpoint', () => {
    const mockUsers: User[] = [
      { id: 1, email: 'user1@example.com', role: UserRole.User, createdAt: new Date(), updatedAt: new Date(), refreshToken: 'token' },
      { id: 2, email: 'user2@example.com', role: UserRole.Admin, createdAt: new Date(), updatedAt: new Date(), refreshToken: 'token' }
    ];
    const mockResponse: ServiceResultContainer<User[]> = {
      success: true,
      message: 'Success',
      result: mockUsers
    };

    service.list().subscribe();

    const req = httpMock.expectOne(`${baseUrl}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call getById with correct endpoint', () => {
    const userId = 1;
    const mockUser: User = {
      id: userId,
      email: 'user1@example.com',
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

    service.getById(userId).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/${userId}`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should call updateRole with correct endpoint and payload', () => {
    const userId = 1;
    const role = UserRole.Admin;
    const payload = { role };
    const mockUser: User = {
      id: userId,
      email: 'user1@example.com',
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      refreshToken: 'token'
    };
    const mockResponse: ServiceResultContainer<User> = {
      success: true,
      message: 'Success',
      result: mockUser
    };

    service.updateRole(userId, role).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/${userId}/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });
});
