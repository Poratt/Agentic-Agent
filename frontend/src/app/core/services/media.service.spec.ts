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

  it('generateImage should call POST /llm/image/generate', () => {
    const request = { prompt: 'a cat', size: '1024x1024' };
    service.generateImage(request).subscribe();

    const req = httpMock.expectOne(`${base}/image/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ url: 'http://example.com/image.png' });
  });

  it('createVideo should call POST /llm/video/generate', () => {
    const request = { prompt: 'a dog running', mode: 'ti2vid' as const };
    service.createVideo(request).subscribe();

    const req = httpMock.expectOne(`${base}/video/generate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ videoId: 'v1', status: 'queued' });
  });

  it('getVideo should call GET /llm/video/:videoId', () => {
    service.getVideo('abc123').subscribe();

    const req = httpMock.expectOne(`${base}/video/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'completed', url: 'http://example.com/video.mp4' });
  });

  it('getVideo should include modelId query param when provided', () => {
    service.getVideo('abc123', 42).subscribe();

    const req = httpMock.expectOne(`${base}/video/abc123?modelId=42`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'in_progress' });
  });
});
