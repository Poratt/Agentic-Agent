import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceResultContainer } from '../models/service-result-container.model';

export interface MediaImageResult {
    url?: string;
    b64Json?: string;
    mimeType?: string;
    size?: string;
}

export interface MediaVideoTask {
    taskId?: string;
    videoId: string;
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    seconds?: number | string;
    size?: string;
}

export interface MediaVideoResult {
    status: 'queued' | 'in_progress' | 'completed' | 'failed';
    url?: string;
    error?: string | Record<string, unknown> | null;
    seconds?: number | string;
}

export interface MediaImageRequest {
    modelId?: number;
    prompt: string;
    size?: string;
    ratio?: string;
    image?: string | string[];
    returnBase64?: boolean;
    providerOverride?: string;
}

export interface MediaVideoRequest {
    modelId?: number;
    prompt: string;
    image?: string;
    mode?: 'ti2vid' | 'keyframes';
    height?: number;
    width?: number;
    numFrames?: number;
    frameRate?: number;
    seed?: number;
    negativePrompt?: string;
}

@Injectable({
    providedIn: 'root',
})
export class MediaService {
    private http = inject(HttpClient);
    private base = `${environment.apiUrl}/llm`;

    generateImage(request: MediaImageRequest): Observable<MediaImageResult> {
        return this.http
            .post<ServiceResultContainer<MediaImageResult>>(`${this.base}/image/generate`, request)
            .pipe(map((res) => res.result));
    }

    createVideo(request: MediaVideoRequest): Observable<MediaVideoTask> {
        return this.http
            .post<ServiceResultContainer<MediaVideoTask>>(`${this.base}/video/generate`, request)
            .pipe(map((res) => res.result));
    }

    getVideo(videoId: string, modelId?: number): Observable<MediaVideoResult> {
        const query = modelId ? `?modelId=${modelId}` : '';
        return this.http
            .get<ServiceResultContainer<MediaVideoResult>>(`${this.base}/video/${encodeURIComponent(videoId)}${query}`)
            .pipe(map((res) => res.result));
    }
}
