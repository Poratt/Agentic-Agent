# Video Agent Pipeline — Full Implementation Plan

## Overview

Full-stack NestJS pipeline that generates a short promotional video from a user prompt.
The user sends a prompt → the backend orchestrates LLM → ElevenLabs → Fal.ai → Shotstack →
stores the final MP4 locally → returns the URL.

## Architecture

```
Angular UI                    NestJS Backend
    │                              │
    │ POST /video/generate         │
    ├─────────────────────────────►│
    │                              ├── VideoAgentService (orchestrator)
    │   SSE: step events            │   1. Build storyboard (Gemma prompt)
    │◄──────────────────────────────┤   2. AudioService → ElevenLabs
    │   SSE: audio_url              │   3. ImageService → Fal.ai (n images)
    │◄──────────────────────────────┤   4. VideoAssemblerService → Shotstack
    │   SSE: images_ready            │   5. Poll Shotstack status
    │◄──────────────────────────────┤   6. Return final video URL
    │   SSE: video_url              │
    │◄──────────────────────────────┤
```

## Pipeline Steps (SSE Events)

| Event type | Description |
|---|---|
| `step` | Descriptive progress step with icon and message |
| `error` | Pipeline aborted with error message |
| `done` | Pipeline complete, includes `videoUrl` |

## Backend Module Structure

```
backend/src/modules/video-agent/
├── dto/
│   ├── generate-video.dto.ts       # POST body
│   └── video-status.dto.ts         # SSE response shapes
├── services/
│   ├── audio.service.ts            # ElevenLabs TTS
│   ├── image.service.ts            # Fal.ai image generation
│   └── video-assembler.service.ts  # Shotstack render + poll
├── video-agent.service.ts          # Orchestrator
├── video-agent.controller.ts       # SSE endpoint
├── video-agent.module.ts
└── video-agent.module.spec.ts
```

## Phase Checklist

- [x] Phase 1 — DTOs & Interfaces
  - [x] `generate-video.dto.ts`: `prompt`, `voiceId?`, `imageCount?`
  - [x] `video-status.dto.ts`: `VideoPipelineStepEvent`, `VideoPipelineErrorEvent`, `VideoPipelineDoneEvent`
  - [x] `pipeline.interfaces.ts`: `StoryboardSlide`, `AudioResult`, `ImageResult`, `VideoJobResult`

- [x] Phase 2 — AudioService (ElevenLabs)
  - [x] Inject `HttpService`, read `ELEVENLABS_API_KEY` from env
  - [x] `generateAudio(text, voiceId?)` → `Promise<AudioResult>`
  - [x] POST to `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`
  - [x] Save MP3 to `uploads/audio/{uuid}.mp3`
  - [x] Return `{ filePath, publicUrl, durationSeconds }`

- [x] Phase 3 — ImageService (Fal.ai)
  - [x] Inject `HttpService`, read `FALAI_API_KEY` from env
  - [x] `generateImages(prompts: string[])` → `Promise<ImageResult[]>`
  - [x] POST to `https://queue.fal.run/fal-ai/flux/schnell` for each prompt
  - [x] Poll until image is ready using `request_id`
  - [x] Download images to `uploads/images/{uuid}/`
  - [x] Return `[{ filePath, publicUrl, width, height, sceneIndex }]`

- [x] Phase 4 — VideoAssemblerService (Shotstack)
  - [x] Inject `HttpService`, read `SHOTSTACK_API_KEY` + `SHOTSTACK_BASE_URL` from env
  - [x] `renderVideo(audioUrl, imageUrls[], imageCount)` → `Promise<VideoJobResult>`
  - [x] POST to `{SHOTSTACK_BASE_URL}` with Shotstack v4 timeline JSON
  - [x] `pollJobStatus(jobId)` → polls GET until `status === 'done'`
  - [x] Download rendered MP4 to `uploads/videos/{jobId}.mp4`
  - [x] Return `{ jobId, status, videoUrl }`

- [x] Phase 5 — VideoAgentService (Orchestrator)
  - [x] `generateVideo(body)` — async method that emits events via `EventEmitter`
  - [x] Build storyboard: simple round-robin split (Gemma call deferred)
  - [x] Generate audio from concatenated narration
  - [x] Generate images for each scene
  - [x] Call Shotstack with all images as slideshow
  - [x] Emit SSE events after each step
  - [x] Emit `error` on failure, `done` on success

- [x] Phase 6 — Controller
  - [x] `POST /video/generate` — `@Sse()` streaming endpoint
  - [x] `@UseGuards(JwtAuthGuard)`
  - [x] `@ApiBearerAuth()`
  - [x] Returns `Observable<MessageEvent>` with pipeline events

- [x] Phase 7 — Module Wiring
  - [x] Added `VideoAgentModule` to `app.module.ts`
  - [x] `HttpModule` imported in `VideoAgentModule`
  - [x] Static file serving added in `main.ts` (`/uploads` → `uploads/` dir)

- [x] Phase 8 — Verification
  - [x] `npm run build` from `backend` passes
  - [x] 32/32 backend tests pass (pre-existing `app.controller.spec.ts` FAIL unrelated)
  - [ ] Manual smoke test with a real prompt (pending)

## API Shapes

### POST /video/generate

**Request body:**
```ts
{
  prompt: string;         // required — e.g. "Generate a short promo for Tiltan dispensary"
  voiceId?: string;       // optional — ElevenLabs voice ID, defaults to env default
  imageCount?: number;    // optional — scenes count, default 3
}
```

**SSE event types:**

```ts
// step
{ "type": "step", "icon": "ph-magic-wand", "message": "מייצר תסריט..." }

// audio_done
{ "type": "audio_done", "audioUrl": "/uploads/audio/abc.mp3", "durationSeconds": 12 }

// images_done
{ "type": "images_done", "images": [{ "url": "/uploads/images/...", "sceneIndex": 0 }] }

// video_done
{ "type": "video_done", "videoUrl": "/uploads/videos/output.mp4" }

// error
{ "type": "error", "message": "שגיאה בשלב יצירת התמונות" }

// done
{ "type": "done", "videoUrl": "/uploads/videos/output.mp4" }
```

## Environment Variables

| Variable | Source | Used by |
|---|---|---|
| `ELEVENLABS_API_KEY` | `.env` | AudioService |
| `FALAI_API_KEY` | `.env` | ImageService |
| `SHOTSTACK_API_KEY` | `.env` | VideoAssemblerService |
| `SHOTSTACK_BASE_URL` | `.env` | VideoAssemblerService |

## Shotstack JSON Timeline Shape

```json
{
  "timeline": {
    "soundtrack": { "src": "<audio_url>" },
    "tracks": [
      {
        "clips": [
          { "type": "image", "src": "<image_url_1>", "start": 0, "length": 5 },
          { "type": "image", "src": "<image_url_2>", "start": 5, "length": 5 }
        ]
      }
    ]
  },
  "output": { "format": "mp4", "resolution": "720" }
}
```

## Local File Storage

| Type | Directory |
|---|---|
| Audio MP3 | `uploads/audio/{uuid}.mp3` |
| Downloaded images | `uploads/images/{uuid}/{index}.png` |
| Final videos | `uploads/videos/{uuid}.mp4` |

The `uploads/` directory is served statically via `ServeStaticModule` at `/uploads`.

## Open Decisions (deferred to future phases)

1. **Concurrency** — Generate all scene images in parallel (Phase 1 implements sequential for safety)
2. **Subtitles / SRT** — Burn captions into video using Whisper transcription
3. **Cloud storage** — Migrate from local `uploads/` to S3/R2
4. **Frontend UI** — Angular video generator page with progress bar (future phase)
5. **LLM storyboard** — Use Gemma for smart storyboard generation vs. simple split (future phase)
6. **Scene concatenation** — Single long video vs. scene-by-scene stitching (future phase)
