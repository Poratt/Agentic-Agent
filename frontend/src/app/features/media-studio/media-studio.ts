import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ProgressSpinner } from 'primeng/progressspinner';
import { LlmProviderStore } from '../../core/store/llm-provider.store';
import { MediaService, MediaImageResult, MediaVideoTask, MediaVideoResult } from '../../core/services/media.service';

@Component({
    selector: 'app-media-studio',
    standalone: true,
    imports: [CommonModule, FormsModule, Select, Tabs, TabList, Tab, TabPanels, TabPanel, ProgressSpinner],
    templateUrl: './media-studio.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './media-studio.css',
})
export class MediaStudio implements OnInit, OnDestroy {
    protected llmProviderStore = inject(LlmProviderStore);
    private mediaService = inject(MediaService);

    activeTab = signal<'image' | 'video'>('image');

    imageModels = this.llmProviderStore.imageModels;
    videoModels = this.llmProviderStore.videoModels;

    // Image form
    imageModelId = signal<number | null>(null);
    imagePrompt = signal('');
    imageSize = signal('1024x1024');
    imageRatio = signal('');
    imageInputUrl = signal('');
    imageReturnBase64 = signal(false);
    imageLoading = signal(false);
    imageResult = signal<MediaImageResult | null>(null);
    imageError = signal<string | null>(null);

    // Video form
    videoModelId = signal<number | null>(null);
    videoPrompt = signal('');
    videoInputUrl = signal('');
    videoMode = signal<'ti2vid' | 'keyframes'>('ti2vid');
    videoNumFrames = signal<number | null>(81);
    videoFrameRate = signal<number | null>(24);
    videoLoading = signal(false);
    videoTask = signal<MediaVideoTask | null>(null);
    videoResult = signal<MediaVideoResult | null>(null);
    videoError = signal<string | null>(null);
    videoPolling = signal(false);

    private videoPollTimer: ReturnType<typeof setInterval> | null = null;

    imageSizeOptions = [
        { label: '1024x1024 (1:1)', value: '1024x1024' },
        { label: '1024x768', value: '1024x768' },
        { label: '768x1024', value: '768x1024' },
        { label: '2K · 16:9', value: '2K' },
        { label: '2K · 1:1', value: '2K' },
        { label: '1K · 16:9', value: '1K' },
        { label: '4K · 16:9', value: '4K' },
    ];

    imageTier = computed(() => ['1K', '2K', '3K', '4K'].includes(this.imageSize()));

    ngOnInit(): void {
        this.llmProviderStore.reload();
        const imgs = this.imageModels();
        if (imgs.length > 0 && this.imageModelId() == null) {
            this.imageModelId.set(imgs[0].id);
        }
        const vids = this.videoModels();
        if (vids.length > 0 && this.videoModelId() == null) {
            this.videoModelId.set(vids[0].id);
        }
    }

    ngOnDestroy(): void {
        this.stopVideoPolling();
    }

    generateImage(): void {
        if (this.imageLoading()) return;
        const prompt = this.imagePrompt().trim();
        if (!prompt) {
            this.imageError.set('נדרש פרומפט ליצירת תמונה.');
            return;
        }
        this.imageError.set(null);
        this.imageResult.set(null);
        this.imageLoading.set(true);

        const imageInput = this.imageInputUrl().trim();
        this.mediaService
            .generateImage({
                modelId: this.imageModelId() ?? undefined,
                prompt,
                size: this.imageSize(),
                ratio: this.imageRatio().trim() || undefined,
                image: imageInput ? [imageInput] : undefined,
                returnBase64: this.imageReturnBase64(),
            })
            .subscribe({
                next: (result) => {
                    this.imageResult.set(result);
                    this.imageLoading.set(false);
                },
                error: (err) => {
                    this.imageError.set(err?.error?.message ?? err?.message ?? 'יצירת התמונה נכשלה.');
                    this.imageLoading.set(false);
                },
            });
    }

    createVideo(): void {
        if (this.videoLoading()) return;
        const prompt = this.videoPrompt().trim();
        if (!prompt) {
            this.videoError.set('נדרש פרומפט ליצירת וידאו.');
            return;
        }
        this.videoError.set(null);
        this.videoResult.set(null);
        this.videoTask.set(null);
        this.videoLoading.set(true);

        const input = this.videoInputUrl().trim();
        this.mediaService
            .createVideo({
                modelId: this.videoModelId() ?? undefined,
                prompt,
                image: input || undefined,
                mode: this.videoMode(),
                numFrames: this.videoNumFrames() ?? undefined,
                frameRate: this.videoFrameRate() ?? undefined,
            })
            .subscribe({
                next: (task) => {
                    this.videoTask.set(task);
                    this.videoLoading.set(false);
                    this.startVideoPolling(task.videoId);
                },
                error: (err) => {
                    this.videoError.set(err?.error?.message ?? err?.message ?? 'יצירת הווידאו נכשלה.');
                    this.videoLoading.set(false);
                },
            });
    }

    private startVideoPolling(videoId: string): void {
        this.stopVideoPolling();
        this.videoPolling.set(true);
        this.pollVideo(videoId);
        this.videoPollTimer = setInterval(() => this.pollVideo(videoId), 5000);
    }

    private pollVideo(videoId: string): void {
        this.mediaService.getVideo(videoId, this.videoModelId() ?? undefined).subscribe({
            next: (result) => {
                this.videoResult.set(result);
                if (result.status === 'completed' || result.status === 'failed') {
                    this.stopVideoPolling();
                }
            },
            error: () => {
                this.stopVideoPolling();
                this.videoError.set('שגיאה בשאילתת סטטוס הווידאו.');
            },
        });
    }

    private stopVideoPolling(): void {
        if (this.videoPollTimer) {
            clearInterval(this.videoPollTimer);
            this.videoPollTimer = null;
        }
        this.videoPolling.set(false);
    }

    videoStatusLabel(status: string | undefined): string {
        switch (status) {
            case 'queued': return 'בתור';
            case 'pending': return 'ממתין';
            case 'in_progress': return 'בעיבוד';
            case 'completed': return 'הושלם';
            case 'failed': return 'נכשל';
            default: return status ?? 'לא ידוע';
        }
    }

    clearImageResult(): void {
        this.imageResult.set(null);
    }

    clearVideoResult(): void {
        this.stopVideoPolling();
        this.videoResult.set(null);
        this.videoTask.set(null);
    }
}
