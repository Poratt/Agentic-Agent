import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/admin-agent`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ChatService,
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: { refresh: () => ({ subscribe: () => {} }) } },
      ],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listSessions should unwrap ServiceResultContainer and emit the sessions array', () => {
    const sessions = [{ id: 1, title: 'S' }];

    service.listSessions().subscribe((result) => {
      expect(result).toEqual(sessions as any);
    });

    const req = httpMock.expectOne(`${base}/sessions`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'נטענו 1 שיחות', result: sessions });
  });

  it('listSessions with limit should pass query param', () => {
    service.listSessions(10).subscribe();

    const req = httpMock.expectOne(`${base}/sessions?limit=10`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', result: [] });
  });

  it('createSession should unwrap ServiceResultContainer and emit the session', () => {
    const session = { id: 1, title: 'New', userId: 1, createdAt: new Date(), updatedAt: new Date() };

    service.createSession().subscribe((result) => {
      expect(result).toEqual(session as any);
    });

    const req = httpMock.expectOne(`${base}/sessions`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, message: 'השיחה נוצרה בהצלחה', result: session });
  });

  it('deleteSession should call DELETE /admin-agent/sessions/:id', () => {
    service.deleteSession(42).subscribe();

    const req = httpMock.expectOne(`${base}/sessions/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getSessionMessages should unwrap container body and keep header flag', () => {
    service.getSessionMessages(5).subscribe((result) => {
      expect(result.messages).toEqual([]);
      expect(result.hasMoreImages).toBe(false);
    });

    const req = httpMock.expectOne(`${base}/sessions/5/messages`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'נטענו 0 הודעות', result: [] }, { headers: { 'x-has-more-images': 'false' } });
  });
});
