import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MediaService } from './media.service';
import { environment } from '../../environments/environment';

describe('MediaService', () => {
  let service: MediaService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/llm`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MediaService,
        provideZonelessChangeDetection(),
      ],
    });
    service = TestBed.inject(MediaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('generateImage should unwrap ServiceResultContainer and emit the image result', () => {
    const request = { prompt: 'a cat', size: '1024x1024' };
    service.generateImage(request).subscribe((result) => {
      expect(result.url).toBe('http://example.com/image.png');
    });

    const req = httpMock.expectOne(`${base}/image/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ success: true, message: 'התמונה נוצרה בהצלחה', result: { url: 'http://example.com/image.png' } });
  });

  it('createVideo should unwrap ServiceResultContainer and emit the video task', () => {
    const request = { prompt: 'a dog running', mode: 'ti2vid' as const };
    service.createVideo(request).subscribe((task) => {
      expect(task.videoId).toBe('v1');
      expect(task.status).toBe('queued');
    });

    const req = httpMock.expectOne(`${base}/video/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ success: true, message: 'משימת הווידאו הושלמה', result: { videoId: 'v1', status: 'queued' } });
  });

  it('getVideo should unwrap ServiceResultContainer and emit the status', () => {
    service.getVideo('abc123').subscribe((result) => {
      expect(result.status).toBe('completed');
      expect(result.url).toBe('http://example.com/video.mp4');
    });

    const req = httpMock.expectOne(`${base}/video/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: 'סטטוס משימה: completed', result: { status: 'completed', url: 'http://example.com/video.mp4' } });
  });

  it('getVideo should include modelId query param when provided', () => {
    service.getVideo('abc123', 42).subscribe((result) => {
      expect(result.status).toBe('in_progress');
    });

    const req = httpMock.expectOne(`${base}/video/abc123?modelId=42`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, message: '', result: { status: 'in_progress' } });
  });
});
