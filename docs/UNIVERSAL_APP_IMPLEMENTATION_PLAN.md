# Kull Universal App - Final Implementation Plan
**Date:** 2025-11-18
**Architecture:** Passthrough API (No client-side API keys)
**Execution:** Parallel multi-agent development

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [AI Provider Integration Strategy](#ai-provider-integration-strategy)
3. [Agent Assignments & Parallel Execution](#agent-assignments--parallel-execution)
4. [Dependency Graph](#dependency-graph)
5. [Implementation Details by Agent](#implementation-details-by-agent)
6. [Testing & Validation](#testing--validation)
7. [Final Questions](#final-questions)

---

## Architecture Overview

### Core Principle: Server-Side API Keys Only

```
┌─────────────────────┐
│   Native App        │
│   (macOS/iOS)       │
│   - No API keys     │
│   - JWT auth only   │
└──────────┬──────────┘
           │
           │ HTTPS (JWT Bearer token)
           │
┌──────────▼──────────┐
│   Backend Server    │
│   - Stores provider │
│     API keys        │
│   - Rate limiting   │
│   - Credit tracking │
└──────────┬──────────┘
           │
     ┌─────┴─────┬──────────┬──────────┬──────────┐
     │           │          │          │          │
┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
│Anthropic│ │OpenAI │ │ Google  │ │ Grok │ │  Groq  │
│  API    │ │  API  │ │   API   │ │ API  │ │  API   │
└─────────┘ └───────┘ └─────────┘ └──────┘ └────────┘
```

**Key Security Features:**
- ✅ API keys stored server-side only (environment variables)
- ✅ User authenticates with device JWT
- ✅ All AI requests go through backend passthrough API
- ✅ Keychain only stores user JWT tokens (never provider keys)
- ✅ Backend handles rate limiting and credit deduction

---

## AI Provider Integration Strategy

### Provider Selection Matrix

| Provider | Model | Cost/1K Images (Batch) | Use Case | Priority |
|----------|-------|------------------------|----------|----------|
| **Apple Intelligence** | Local | $0.00 | Pre-filtering (macOS) | P0 |
| **Google Gemini** | Flash-Lite | $0.30 | Budget tier | P0 |
| **OpenAI** | GPT-5 mini | $1.20 | Balanced tier | P0 |
| **Anthropic** | Haiku 4.5 | $4.00 | Fast tier | P1 |
| **Anthropic** | Sonnet 4.5 | $10.50 | Premium tier | P1 |
| **Grok** | Grok-4-fast | TBD | Beta testing | P2 |
| **Groq** | Kimi-K2 | TBD | Ultra-fast | P2 |

### Unified Response Schema

All providers must return this structure:

```typescript
interface PhotoRating {
  starRating: 1 | 2 | 3 | 4 | 5;           // 1=reject, 5=hero
  colorLabel: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';
  keepReject: 'keep' | 'reject' | 'maybe';
  tags: string[];
  description: string;
  technicalQuality: {
    sharpness: number;        // 0-1
    exposure: number;         // 0-1
    composition: number;      // 0-1
    overallScore: number;     // 0-1
  };
  subjectAnalysis: {
    primarySubject: string;
    emotion: string;
    eyesOpen: boolean;
    smiling: boolean;
    inFocus: boolean;
  };
}
```

**API Documentation References:**
- Anthropic structured output: `api-docs/anthropic/structured-output.md`
- OpenAI structured output: `api-docs/openai/structured-output.md`
- Google structured output: `api-docs/google/structured-output.md`
- Grok structured output: `api-docs/grok/structured-output.md`

---

## Agent Assignments & Parallel Execution

### Parallel Development Tracks

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARALLEL AGENT EXECUTION                      │
└─────────────────────────────────────────────────────────────────┘

Track 1: Backend Infrastructure (Agents A, B, C)
├─ Agent A: Environment Config & Security
├─ Agent B: Provider Adapters & Passthrough API
└─ Agent C: Batch Processing System

Track 2: Native App Core (Agents D, E, F)
├─ Agent D: Keychain & Token Management
├─ Agent E: WebSocket Real-Time Sync
└─ Agent F: Cloud AI Service Integration

Track 3: Native App UI (Agents G, H)
├─ Agent G: Settings & Error Handling
└─ Agent H: Offline Mode & Operation Queue

Track 4: Testing & Distribution (Agent I)
└─ Agent I: Build Pipeline & CI/CD
```

### Agent Roles & Specifications

#### **Agent A: Environment Config & Security**
**Role:** Infrastructure foundation
**Can Start:** Immediately (no dependencies)
**Estimated Tokens:** 25k output

**Deliverables:**
1. `server/config/environment.ts` - Centralized environment management
2. `apps/Kull Universal App/kull/kull/EnvironmentConfig.swift` - Native app config
3. Environment variable documentation
4. API key security audit

**Detailed Spec:** See [Agent A Details](#agent-a-environment-config--security)

---

#### **Agent B: Provider Adapters & Passthrough API**
**Role:** Core AI provider integration
**Depends On:** Agent A (environment config)
**Estimated Tokens:** 60k output

**Deliverables:**
1. `server/ai/BaseProviderAdapter.ts` - Abstract adapter interface
2. `server/ai/providers/AnthropicAdapter.ts` - Claude integration
3. `server/ai/providers/OpenAIAdapter.ts` - GPT integration
4. `server/ai/providers/GoogleAdapter.ts` - Gemini integration
5. `server/ai/providers/GrokAdapter.ts` - Grok integration
6. `server/ai/providers/GroqAdapter.ts` - Groq integration
7. `server/routes/ai-passthrough.ts` - Passthrough API endpoints

**API Documentation to Reference:**
- `api-docs/anthropic/messages.md`, `api-docs/anthropic/image-input.md`
- `api-docs/openai/responses.md`, `api-docs/openai/image-input.md`
- `api-docs/google/responses.md`, `api-docs/google/image-input.md`
- `api-docs/grok/responses.md`, `api-docs/grok/image-input.md`
- `api-docs/groq/responses.md`, `api-docs/groq/image-input.md`

**Detailed Spec:** See [Agent B Details](#agent-b-provider-adapters--passthrough-api)

---

#### **Agent C: Batch Processing System**
**Role:** Efficient bulk photo processing
**Depends On:** Agent B (provider adapters)
**Estimated Tokens:** 40k output

**Deliverables:**
1. `server/ai/BatchProcessor.ts` - Batch job orchestration
2. `server/ai/BatchJobQueue.ts` - Job queue management
3. `server/routes/batch.ts` - Batch API endpoints
4. Database schema updates for batch jobs

**API Documentation to Reference:**
- `api-docs/anthropic/batch-api.md`
- `api-docs/openai/batch-api.md`
- `api-docs/google/batch-api.md`
- Note: Grok/Groq don't have batch APIs - use concurrent requests

**Detailed Spec:** See [Agent C Details](#agent-c-batch-processing-system)

---

#### **Agent D: Keychain & Token Management**
**Role:** Secure authentication in native app
**Can Start:** Immediately (no dependencies)
**Estimated Tokens:** 20k output

**Deliverables:**
1. `apps/Kull Universal App/kull/kull/KeychainManager.swift`
2. `apps/Kull Universal App/kull/kull/DeviceIDManager.swift`
3. Updated `AuthViewModel.swift` to use Keychain
4. Updated `KullAPIClient.swift` for token refresh

**Security Requirements:**
- Store ONLY user JWT tokens (access + refresh)
- Store device ID
- NEVER store provider API keys
- Use Security framework properly

**Detailed Spec:** See [Agent D Details](#agent-d-keychain--token-management)

---

#### **Agent E: WebSocket Real-Time Sync**
**Role:** Bidirectional real-time updates
**Depends On:** Agent D (auth tokens)
**Estimated Tokens:** 35k output

**Deliverables:**
1. `apps/Kull Universal App/kull/kull/WebSocketService.swift`
2. `apps/Kull Universal App/kull/kull/SyncMessageModels.swift`
3. `apps/Kull Universal App/kull/kull/SyncCoordinator.swift`
4. UI updates for connection status

**Backend Reference:**
- Existing: `server/websocket.ts` (fully implemented)
- Message types: `shared/types/sync.ts`

**Detailed Spec:** See [Agent E Details](#agent-e-websocket-real-time-sync)

---

#### **Agent F: Cloud AI Service Integration**
**Role:** Connect native app to cloud processing
**Depends On:** Agent B (passthrough API), Agent D (auth)
**Estimated Tokens:** 30k output

**Deliverables:**
1. `apps/Kull Universal App/kull/kull/CloudAIService.swift`
2. Updated `RunController.swift` to use CloudAIService
3. Updated `RunSheetView.swift` for provider selection
4. Credit tracking integration

**Detailed Spec:** See [Agent F Details](#agent-f-cloud-ai-service-integration)

---

#### **Agent G: Settings & Error Handling**
**Role:** User experience polish
**Depends On:** Agent D (keychain), Agent A (environment config)
**Estimated Tokens:** 25k output

**Deliverables:**
1. `apps/Kull Universal App/kull/kull/SettingsView.swift`
2. `apps/Kull Universal App/kull/kull/ErrorPresenter.swift`
3. `apps/Kull Universal App/kull/kull/Logger.swift` (OSLog)
4. Notification preferences

**Detailed Spec:** See [Agent G Details](#agent-g-settings--error-handling)

---

#### **Agent H: Offline Mode & Operation Queue**
**Role:** Offline-first architecture
**Depends On:** Agent E (sync service)
**Estimated Tokens:** 25k output

**Deliverables:**
1. `apps/Kull Universal App/kull/kull/CacheManager.swift`
2. `apps/Kull Universal App/kull/kull/OfflineOperationQueue.swift`
3. Offline UI indicators
4. Background sync on reconnection

**Detailed Spec:** See [Agent H Details](#agent-h-offline-mode--operation-queue)

---

#### **Agent I: Build Pipeline & CI/CD**
**Role:** Production deployment
**Can Start:** Early (parallel with development)
**Estimated Tokens:** 15k output

**Deliverables:**
1. `scripts/build-mac.sh`
2. `scripts/build-ios.sh`
3. `.github/workflows/build-universal-app.yml`
4. Code signing documentation

**Detailed Spec:** See [Agent I Details](#agent-i-build-pipeline--cicd)

---

## Dependency Graph

```
Level 0 (No dependencies - Start immediately):
├─ Agent A: Environment Config
├─ Agent D: Keychain & Token Management
└─ Agent I: Build Pipeline

Level 1 (Depends on Level 0):
├─ Agent B: Provider Adapters (depends on A)
├─ Agent E: WebSocket Sync (depends on D)
└─ Agent G: Settings & Error Handling (depends on A, D)

Level 2 (Depends on Level 1):
├─ Agent C: Batch Processing (depends on B)
├─ Agent F: Cloud AI Service (depends on B, D)
└─ Agent H: Offline Mode (depends on E)

Execution Strategy:
- Start Level 0 agents immediately (A, D, I in parallel)
- Start Level 1 agents as soon as their dependencies complete
- Start Level 2 agents as dependencies complete
- Agents within same level can work in parallel
```

---

## Implementation Details by Agent

### Agent A: Environment Config & Security

#### Objective
Create centralized environment configuration for both backend and native app, ensuring API keys are stored securely server-side only.

#### Tasks

**1. Backend Environment Config** (`server/config/environment.ts`)

```typescript
export enum Environment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production'
}

export interface ProviderConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
}

export interface EnvironmentConfig {
  environment: Environment;
  port: number;
  databaseURL: string;

  // Provider API keys (server-side only)
  anthropic: ProviderConfig;
  openai: ProviderConfig;
  google: ProviderConfig;
  grok: ProviderConfig;
  groq: ProviderConfig;

  // Client-facing URLs
  clientBaseURL: string;
  clientWSURL: string;

  // Security
  jwtSecret: string;
  jwtAccessExpiry: string;  // '1h'
  jwtRefreshExpiry: string; // '30d'
}

export function loadEnvironmentConfig(): EnvironmentConfig {
  const env = process.env.NODE_ENV as Environment || Environment.Development;

  return {
    environment: env,
    port: parseInt(process.env.PORT || '5000'),
    databaseURL: process.env.DATABASE_URL!,

    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      baseURL: 'https://api.anthropic.com/v1',
      timeout: 60000
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: 'https://api.openai.com/v1',
      timeout: 60000
    },
    google: {
      apiKey: process.env.GOOGLE_API_KEY!,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      timeout: 60000
    },
    grok: {
      apiKey: process.env.GROK_API_KEY!,
      baseURL: 'https://api.x.ai/v1',
      timeout: 60000
    },
    groq: {
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: 30000
    },

    clientBaseURL: getClientBaseURL(env),
    clientWSURL: getClientWSURL(env),

    jwtSecret: process.env.JWT_SECRET!,
    jwtAccessExpiry: '1h',
    jwtRefreshExpiry: '30d'
  };
}

function getClientBaseURL(env: Environment): string {
  switch (env) {
    case Environment.Development:
      return 'http://localhost:5000';
    case Environment.Staging:
      return 'https://staging.kullai.com';
    case Environment.Production:
      return 'https://kullai.com';
  }
}

function getClientWSURL(env: Environment): string {
  switch (env) {
    case Environment.Development:
      return 'ws://localhost:5000';
    case Environment.Staging:
      return 'wss://staging.kullai.com';
    case Environment.Production:
      return 'wss://kullai.com';
  }
}

// Validate all required env vars are present
export function validateEnvironmentConfig(config: EnvironmentConfig): void {
  const requiredKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_API_KEY',
    'JWT_SECRET'
  ];

  const missing = requiredKeys.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const config = loadEnvironmentConfig();
validateEnvironmentConfig(config);
```

**2. Native App Environment Config** (`apps/Kull Universal App/kull/kull/EnvironmentConfig.swift`)

```swift
import Foundation
import SwiftUI

enum Environment: String, CaseIterable, Identifiable {
    case development = "Development"
    case staging = "Staging"
    case production = "Production"

    var id: String { rawValue }

    var baseURL: URL {
        switch self {
        case .development:
            return URL(string: "http://localhost:5000")!
        case .staging:
            return URL(string: "https://staging.kullai.com")!
        case .production:
            return URL(string: "https://kullai.com")!
        }
    }

    var wsURL: URL {
        switch self {
        case .development:
            return URL(string: "ws://localhost:5000")!
        case .staging:
            return URL(string: "wss://staging.kullai.com")!
        case .production:
            return URL(string: "wss://kullai.com")!
        }
    }

    var displayName: String {
        switch self {
        case .development:
            return "Development (localhost:5000)"
        case .staging:
            return "Staging (staging.kullai.com)"
        case .production:
            return "Production (kullai.com)"
        }
    }
}

@MainActor
class EnvironmentConfig: ObservableObject {
    static let shared = EnvironmentConfig()

    @Published var current: Environment {
        didSet {
            UserDefaults.standard.set(current.rawValue, forKey: "selectedEnvironment")
            // Notify all services that environment changed
            NotificationCenter.default.post(name: .environmentDidChange, object: current)
        }
    }

    private init() {
        // Load from UserDefaults
        if let saved = UserDefaults.standard.string(forKey: "selectedEnvironment"),
           let env = Environment(rawValue: saved) {
            self.current = env
        } else {
            // Default based on build configuration
            #if DEBUG
            self.current = .development
            #else
            self.current = .production
            #endif
        }
    }

    var apiBaseURL: URL {
        current.baseURL
    }

    var websocketURL: URL {
        current.wsURL
    }
}

extension Notification.Name {
    static let environmentDidChange = Notification.Name("environmentDidChange")
}
```

**3. Update All Hardcoded URLs**

Search and replace across these files:
- `KullAPIClient.swift` - Use `EnvironmentConfig.shared.apiBaseURL`
- `ModelsViewModel.swift` - Use centralized URL
- `FoldersView.swift` - Use centralized URL
- `MarketplaceView.swift` - Use centralized URL
- `TranscriptionHelper.swift` - Use centralized URL
- `FolderSyncService.swift` - Use centralized URL
- `RunSheetView.swift` - Use centralized URL

**4. Environment Variable Documentation**

Create `.env.example`:
```bash
# Environment
NODE_ENV=development

# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key-here

# AI Providers (SERVER-SIDE ONLY - NEVER COMMIT REAL KEYS)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
GROK_API_KEY=xai-...
GROQ_API_KEY=gsk_...

# Optional: Rate limiting
RATE_LIMIT_WINDOW=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100
```

#### Acceptance Criteria
- ✅ Single source of truth for environment config
- ✅ All API keys stored server-side only
- ✅ Native app can switch environments in Settings
- ✅ All hardcoded URLs replaced with config
- ✅ Validation ensures required env vars are present

---

### Agent B: Provider Adapters & Passthrough API

#### Objective
Create unified provider adapters that abstract differences between AI providers, and expose a single passthrough API for the native app.

#### Tasks

**1. Base Provider Interface** (`server/ai/BaseProviderAdapter.ts`)

```typescript
import { PhotoRating } from './types';

export interface ImageInput {
  data: Buffer;          // Raw image bytes
  format: 'jpeg' | 'png' | 'webp' | 'heic';
  filename: string;
}

export interface ProcessImageRequest {
  image: ImageInput;
  prompt: string;
  systemPrompt?: string;
  outputSchema: any;     // JSON schema for structured output
}

export interface BatchImageRequest {
  images: ImageInput[];
  prompt: string;
  systemPrompt?: string;
  outputSchema: any;
}

export interface BatchJob {
  id: string;
  provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  results?: PhotoRating[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export abstract class BaseProviderAdapter {
  protected apiKey: string;
  protected baseURL: string;
  protected timeout: number;

  constructor(apiKey: string, baseURL: string, timeout: number) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Process a single image and return structured rating
   */
  abstract processSingleImage(request: ProcessImageRequest): Promise<PhotoRating>;

  /**
   * Submit a batch job for processing (if provider supports batch API)
   */
  abstract submitBatch(request: BatchImageRequest): Promise<BatchJob>;

  /**
   * Check status of a batch job
   */
  abstract checkBatchStatus(jobId: string): Promise<BatchJob>;

  /**
   * Retrieve results from completed batch job
   */
  abstract retrieveBatchResults(jobId: string): Promise<PhotoRating[]>;

  /**
   * Get provider-specific pricing per image
   */
  abstract getCostPerImage(): number;

  /**
   * Get provider display name
   */
  abstract getProviderName(): string;

  /**
   * Check if provider supports batch processing
   */
  abstract supportsBatch(): boolean;

  /**
   * Validate image meets provider requirements
   */
  protected validateImage(image: ImageInput): void {
    if (!image.data || image.data.length === 0) {
      throw new Error('Image data is empty');
    }

    if (!['jpeg', 'png', 'webp', 'heic'].includes(image.format)) {
      throw new Error(`Unsupported format: ${image.format}`);
    }
  }

  /**
   * Convert image to base64 for API transmission
   */
  protected imageToBase64(image: ImageInput): string {
    return image.data.toString('base64');
  }

  /**
   * Parse provider response into unified PhotoRating schema
   */
  protected abstract parseResponse(response: any): PhotoRating;
}
```

**2. Anthropic Adapter** (`server/ai/providers/AnthropicAdapter.ts`)

Reference docs:
- `api-docs/anthropic/messages.md`
- `api-docs/anthropic/image-input.md`
- `api-docs/anthropic/batch-api.md` (if accessible)

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { BaseProviderAdapter, ProcessImageRequest, BatchImageRequest, BatchJob } from '../BaseProviderAdapter';
import { PhotoRating } from '../types';

export class AnthropicAdapter extends BaseProviderAdapter {
  private client: Anthropic;

  constructor(apiKey: string, baseURL: string, timeout: number) {
    super(apiKey, baseURL, timeout);
    this.client = new Anthropic({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });
  }

  async processSingleImage(request: ProcessImageRequest): Promise<PhotoRating> {
    this.validateImage(request.image);

    const base64Image = this.imageToBase64(request.image);
    const mimeType = `image/${request.image.format}`;

    const response = await this.client.messages.create({
      model: 'claude-haiku-4.5',  // Cheapest vision model
      max_tokens: 2000,
      system: request.systemPrompt || this.getDefaultSystemPrompt(),
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: 'text',
            text: request.prompt
          }
        ]
      }]
    });

    // Parse response text as JSON
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Anthropic');
    }

    return this.parseResponse(JSON.parse(textContent.text));
  }

  async submitBatch(request: BatchImageRequest): Promise<BatchJob> {
    // Anthropic batch API implementation
    // Create JSONL file with all requests
    // Upload via Files API
    // Submit batch job
    // Return job tracking info

    // TODO: Implement when batch API docs are fully accessible
    throw new Error('Batch processing not yet implemented for Anthropic');
  }

  async checkBatchStatus(jobId: string): Promise<BatchJob> {
    // Poll batch status
    throw new Error('Batch processing not yet implemented for Anthropic');
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    // Download results JSONL
    // Parse each line
    throw new Error('Batch processing not yet implemented for Anthropic');
  }

  getCostPerImage(): number {
    // Haiku 4.5: $1.00 input, $5.00 output per 1M tokens
    // Typical: 2000 input tokens, 1000 output tokens
    // = (2000 * 1.00 + 1000 * 5.00) / 1_000_000 = $0.007
    // With 50% batch discount: $0.0035
    return 0.007;
  }

  getProviderName(): string {
    return 'Anthropic Claude';
  }

  supportsBatch(): boolean {
    return true;  // Batch API available
  }

  protected parseResponse(json: any): PhotoRating {
    // Validate and map to unified schema
    return {
      starRating: json.starRating,
      colorLabel: json.colorLabel,
      keepReject: json.keepReject,
      tags: json.tags || [],
      description: json.description || '',
      technicalQuality: json.technicalQuality || {
        sharpness: 0,
        exposure: 0,
        composition: 0,
        overallScore: 0
      },
      subjectAnalysis: json.subjectAnalysis || {
        primarySubject: '',
        emotion: '',
        eyesOpen: false,
        smiling: false,
        inFocus: false
      }
    };
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert photo curator analyzing images for a professional photographer.
Rate each photo on technical quality, composition, and emotional impact.
Be critical but fair. Hero shots (5 stars) should be exceptional.`;
  }
}
```

**3. OpenAI Adapter** (`server/ai/providers/OpenAIAdapter.ts`)

Reference docs:
- `api-docs/openai/responses.md`
- `api-docs/openai/image-input.md`
- `api-docs/openai/batch-api.md`
- `api-docs/openai/structured-output.md`

```typescript
import OpenAI from 'openai';
import { BaseProviderAdapter, ProcessImageRequest, BatchImageRequest, BatchJob } from '../BaseProviderAdapter';
import { PhotoRating, PhotoRatingSchema } from '../types';

export class OpenAIAdapter extends BaseProviderAdapter {
  private client: OpenAI;

  constructor(apiKey: string, baseURL: string, timeout: number) {
    super(apiKey, baseURL, timeout);
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL
    });
  }

  async processSingleImage(request: ProcessImageRequest): Promise<PhotoRating> {
    this.validateImage(request.image);

    // Upload image to Files API for reuse
    const file = await this.client.files.create({
      file: request.image.data,
      purpose: 'vision'
    });

    // Use structured output with Pydantic-style schema
    const response = await this.client.chat.completions.create({
      model: 'gpt-5-mini',  // Best balance of cost/performance
      messages: [
        {
          role: 'system',
          content: request.systemPrompt || this.getDefaultSystemPrompt()
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: request.prompt
            },
            {
              type: 'image_url',
              image_url: {
                file_id: file.id,
                detail: 'high'  // High detail for photo analysis
              }
            }
          ]
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: PhotoRatingSchema  // Guaranteed schema adherence
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return this.parseResponse(JSON.parse(content));
  }

  async submitBatch(request: BatchImageRequest): Promise<BatchJob> {
    // OpenAI batch API implementation
    // 1. Upload all images via Files API
    // 2. Create JSONL batch file
    // 3. Submit batch via /v1/batches
    // 4. Return job tracking info

    const fileIds = await Promise.all(
      request.images.map(img =>
        this.client.files.create({
          file: img.data,
          purpose: 'vision'
        }).then(f => f.id)
      )
    );

    // Create JSONL content
    const jsonlLines = request.images.map((img, idx) => JSON.stringify({
      custom_id: `img_${idx}`,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || this.getDefaultSystemPrompt()
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: request.prompt },
              {
                type: 'image_url',
                image_url: {
                  file_id: fileIds[idx],
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: PhotoRatingSchema
        }
      }
    })).join('\n');

    // Upload JSONL batch file
    const batchFile = await this.client.files.create({
      file: Buffer.from(jsonlLines),
      purpose: 'batch'
    });

    // Submit batch
    const batch = await this.client.batches.create({
      input_file_id: batchFile.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h'
    });

    return {
      id: batch.id,
      provider: 'openai',
      status: 'pending',
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date()
    };
  }

  async checkBatchStatus(jobId: string): Promise<BatchJob> {
    const batch = await this.client.batches.retrieve(jobId);

    return {
      id: batch.id,
      provider: 'openai',
      status: this.mapBatchStatus(batch.status),
      totalImages: batch.request_counts.total,
      processedImages: batch.request_counts.completed,
      createdAt: new Date(batch.created_at * 1000),
      completedAt: batch.completed_at ? new Date(batch.completed_at * 1000) : undefined
    };
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    const batch = await this.client.batches.retrieve(jobId);

    if (batch.status !== 'completed' || !batch.output_file_id) {
      throw new Error('Batch not completed or no output file');
    }

    // Download results file
    const fileContent = await this.client.files.content(batch.output_file_id);
    const lines = (await fileContent.text()).split('\n').filter(Boolean);

    // Parse JSONL results
    return lines.map(line => {
      const result = JSON.parse(line);
      const content = result.response.body.choices[0].message.content;
      return this.parseResponse(JSON.parse(content));
    });
  }

  getCostPerImage(): number {
    // GPT-5 mini: $0.25 input, $2.00 output per 1M tokens
    // Typical: 2159 input tokens (500 text + 1659 image), 1000 output tokens
    // = (2159 * 0.25 + 1000 * 2.00) / 1_000_000 = $0.00254
    // With 50% batch discount: $0.00127
    return 0.00254;
  }

  getProviderName(): string {
    return 'OpenAI GPT';
  }

  supportsBatch(): boolean {
    return true;
  }

  private mapBatchStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status) {
      case 'validating':
      case 'in_progress':
      case 'finalizing':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
      case 'expired':
      case 'cancelled':
        return 'failed';
      default:
        return 'pending';
    }
  }

  protected parseResponse(json: any): PhotoRating {
    // OpenAI structured output guarantees schema adherence
    return json as PhotoRating;
  }

  private getDefaultSystemPrompt(): string {
    return `You are an expert photo curator. Analyze photos for technical quality, composition, and emotional impact.`;
  }
}
```

**4. Google Adapter** (`server/ai/providers/GoogleAdapter.ts`)

Reference docs:
- `api-docs/google/responses.md`
- `api-docs/google/image-input.md`
- `api-docs/google/batch-api.md`
- `api-docs/google/structured-output.md`

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProviderAdapter, ProcessImageRequest, BatchImageRequest, BatchJob } from '../BaseProviderAdapter';
import { PhotoRating } from '../types';

export class GoogleAdapter extends BaseProviderAdapter {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string, baseURL: string, timeout: number) {
    super(apiKey, baseURL, timeout);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async processSingleImage(request: ProcessImageRequest): Promise<PhotoRating> {
    this.validateImage(request.image);

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',  // Cheapest option
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.convertToGeminiSchema(request.outputSchema)
      }
    });

    // Prepare image as inline data
    const imagePart = {
      inlineData: {
        data: this.imageToBase64(request.image),
        mimeType: `image/${request.image.format}`
      }
    };

    const prompt = request.systemPrompt
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt;

    const result = await model.generateContent([
      imagePart,
      prompt
    ]);

    const response = await result.response;
    const text = response.text();

    return this.parseResponse(JSON.parse(text));
  }

  async submitBatch(request: BatchImageRequest): Promise<BatchJob> {
    // Google batch API for generation (synchronous for small batches)
    // For large batches, use File API + async batch

    // Upload images to File API first
    const fileUris = await Promise.all(
      request.images.map(img => this.uploadToFileAPI(img))
    );

    // Create batch request
    const batchRequests = request.images.map((img, idx) => ({
      model: 'gemini-2.5-flash-lite',
      contents: [
        { fileData: { fileUri: fileUris[idx] } },
        { text: request.prompt }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.convertToGeminiSchema(request.outputSchema)
      }
    }));

    // Submit batch
    // Note: Google doesn't have traditional async batch API for generation
    // Process sequentially or use concurrent requests

    const jobId = `google_batch_${Date.now()}`;

    // Process in background
    this.processBatchAsync(jobId, batchRequests, request.images.length);

    return {
      id: jobId,
      provider: 'google',
      status: 'processing',
      totalImages: request.images.length,
      processedImages: 0,
      createdAt: new Date()
    };
  }

  private async processBatchAsync(
    jobId: string,
    requests: any[],
    totalImages: number
  ): Promise<void> {
    // Process batch in background
    // Store results in database or cache
    // This is a simplified implementation
    // Real implementation would use job queue
  }

  async checkBatchStatus(jobId: string): Promise<BatchJob> {
    // Check job status from database/cache
    throw new Error('Not implemented - check database for job status');
  }

  async retrieveBatchResults(jobId: string): Promise<PhotoRating[]> {
    // Retrieve from database/cache
    throw new Error('Not implemented - retrieve from database');
  }

  getCostPerImage(): number {
    // Gemini 2.5 Flash-Lite: $0.10 input, $0.40 output per 1M tokens
    // Typical: 2048 input tokens (500 text + 1548 image), 1000 output tokens
    // = (2048 * 0.10 + 1000 * 0.40) / 1_000_000 = $0.00060
    // With 50% batch discount: $0.00030
    return 0.00060;
  }

  getProviderName(): string {
    return 'Google Gemini';
  }

  supportsBatch(): boolean {
    return true;  // Via custom implementation
  }

  private async uploadToFileAPI(image: ImageInput): Promise<string> {
    // Upload to Google File API
    // Return file URI
    // Implementation details from api-docs/google/image-input.md
    throw new Error('File API upload not implemented');
  }

  private convertToGeminiSchema(schema: any): any {
    // Convert standard JSON Schema to Gemini's OpenAPI 3.0 subset
    // Reference: api-docs/google/structured-output.md
    return {
      type: 'OBJECT',
      properties: {
        starRating: { type: 'INTEGER' },
        colorLabel: { type: 'STRING' },
        keepReject: { type: 'STRING' },
        tags: {
          type: 'ARRAY',
          items: { type: 'STRING' }
        },
        description: { type: 'STRING' },
        // ... rest of schema
      },
      propertyOrdering: [
        'starRating',
        'colorLabel',
        'keepReject',
        'tags',
        'description'
        // CRITICAL: Must match example order
      ]
    };
  }

  protected parseResponse(json: any): PhotoRating {
    return json as PhotoRating;
  }
}
```

**5. Grok & Groq Adapters**

Similar implementations for:
- `server/ai/providers/GrokAdapter.ts` (ref: `api-docs/grok/*`)
- `server/ai/providers/GroqAdapter.ts` (ref: `api-docs/groq/*`)

**Note:** Grok and Groq don't have batch APIs - use async concurrent requests with semaphores.

**6. Passthrough API Routes** (`server/routes/ai-passthrough.ts`)

```typescript
import express from 'express';
import { verifyDeviceToken } from '../auth/jwt';
import { deductCredits } from './credits';
import { AnthropicAdapter } from '../ai/providers/AnthropicAdapter';
import { OpenAIAdapter } from '../ai/providers/OpenAIAdapter';
import { GoogleAdapter } from '../ai/providers/GoogleAdapter';
import { config } from '../config/environment';

const router = express.Router();

// Initialize provider adapters
const providers = {
  anthropic: new AnthropicAdapter(
    config.anthropic.apiKey,
    config.anthropic.baseURL,
    config.anthropic.timeout
  ),
  openai: new OpenAIAdapter(
    config.openai.apiKey,
    config.openai.baseURL,
    config.openai.timeout
  ),
  google: new GoogleAdapter(
    config.google.apiKey,
    config.google.baseURL,
    config.google.timeout
  )
  // ... other providers
};

/**
 * POST /api/ai/process-single
 * Process a single image with selected provider
 */
router.post('/process-single', verifyDeviceToken, async (req, res) => {
  try {
    const { provider, imageData, imageFormat, prompt, systemPrompt } = req.body;
    const userId = req.user!.userId;

    // Validate provider
    if (!providers[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const adapter = providers[provider];

    // Calculate credits required
    const creditsPerImage = Math.ceil(adapter.getCostPerImage() * 1000);  // Convert $ to credits

    // Check user has enough credits
    const balance = await storage.getUserCreditBalance(userId);
    if (balance < creditsPerImage) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditsPerImage,
        balance
      });
    }

    // Process image
    const result = await adapter.processSingleImage({
      image: {
        data: Buffer.from(imageData, 'base64'),
        format: imageFormat,
        filename: 'image'
      },
      prompt,
      systemPrompt,
      outputSchema: PhotoRatingSchema
    });

    // Deduct credits
    await storage.createCreditTransaction({
      userId,
      amount: -creditsPerImage,
      type: 'usage',
      description: `AI processing: ${provider}`,
      metadata: { provider, imageCount: 1 }
    });

    // Broadcast credit update via WebSocket
    const wsService = getGlobalWsService();
    if (wsService) {
      wsService.broadcastToUser(userId, {
        type: 'CREDIT_UPDATE',
        data: {
          newBalance: balance - creditsPerImage,
          change: -creditsPerImage,
          reason: 'AI processing'
        },
        timestamp: new Date()
      });
    }

    res.json({
      result,
      creditsUsed: creditsPerImage,
      newBalance: balance - creditsPerImage
    });

  } catch (error) {
    console.error('AI processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

/**
 * POST /api/ai/process-batch
 * Submit a batch job for processing
 */
router.post('/process-batch', verifyDeviceToken, async (req, res) => {
  try {
    const { provider, images, prompt, systemPrompt } = req.body;
    const userId = req.user!.userId;

    if (!providers[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const adapter = providers[provider];

    if (!adapter.supportsBatch()) {
      return res.status(400).json({
        error: 'Provider does not support batch processing'
      });
    }

    // Calculate total credits
    const creditsPerImage = Math.ceil(adapter.getCostPerImage() * 1000);
    const totalCredits = creditsPerImage * images.length;

    // Check balance
    const balance = await storage.getUserCreditBalance(userId);
    if (balance < totalCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: totalCredits,
        balance
      });
    }

    // Submit batch
    const batchJob = await adapter.submitBatch({
      images: images.map(img => ({
        data: Buffer.from(img.data, 'base64'),
        format: img.format,
        filename: img.filename
      })),
      prompt,
      systemPrompt,
      outputSchema: PhotoRatingSchema
    });

    // Reserve credits (will be deducted when batch completes)
    await storage.createCreditTransaction({
      userId,
      amount: -totalCredits,
      type: 'reserved',
      description: `Batch processing: ${provider}`,
      metadata: {
        provider,
        imageCount: images.length,
        batchJobId: batchJob.id
      }
    });

    res.json({
      batchJob,
      creditsReserved: totalCredits
    });

  } catch (error) {
    console.error('Batch submission error:', error);
    res.status(500).json({ error: 'Batch submission failed' });
  }
});

/**
 * GET /api/ai/batch-status/:jobId
 * Check batch job status
 */
router.get('/batch-status/:jobId', verifyDeviceToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { provider } = req.query;

    if (!provider || !providers[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const adapter = providers[provider];
    const status = await adapter.checkBatchStatus(jobId);

    res.json(status);

  } catch (error) {
    console.error('Batch status check error:', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

/**
 * GET /api/ai/batch-results/:jobId
 * Retrieve batch results
 */
router.get('/batch-results/:jobId', verifyDeviceToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { provider } = req.query;
    const userId = req.user!.userId;

    if (!provider || !providers[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const adapter = providers[provider];
    const results = await adapter.retrieveBatchResults(jobId);

    // Update credits from 'reserved' to 'used'
    // (Implementation depends on how you track reserved credits)

    res.json({ results });

  } catch (error) {
    console.error('Batch results retrieval error:', error);
    res.status(500).json({ error: 'Results retrieval failed' });
  }
});

/**
 * GET /api/ai/providers
 * List available providers and their pricing
 */
router.get('/providers', verifyDeviceToken, async (req, res) => {
  const providerList = Object.entries(providers).map(([key, adapter]) => ({
    id: key,
    name: adapter.getProviderName(),
    costPerImage: adapter.getCostPerImage(),
    creditsPerImage: Math.ceil(adapter.getCostPerImage() * 1000),
    supportsBatch: adapter.supportsBatch()
  }));

  res.json({ providers: providerList });
});

export default router;
```

**7. Register Routes** (`server/routes.ts`)

```typescript
import aiPassthroughRouter from './routes/ai-passthrough';

// ... existing routes

app.use('/api/ai', aiPassthroughRouter);
```

#### Acceptance Criteria
- ✅ All 5 providers implemented (Anthropic, OpenAI, Google, Grok, Groq)
- ✅ Unified interface abstracts provider differences
- ✅ Passthrough API secured with JWT auth
- ✅ Credit deduction integrated
- ✅ WebSocket broadcasts credit updates
- ✅ Batch processing for supported providers
- ✅ API keys never exposed to client

---

### Agent C: Batch Processing System

#### Objective
Implement efficient batch processing for large photo collections using provider batch APIs where available, with fallback to concurrent processing.

#### Tasks

**1. Batch Job Queue** (`server/ai/BatchJobQueue.ts`)

```typescript
import { EventEmitter } from 'events';

export interface BatchJob {
  id: string;
  userId: string;
  provider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalImages: number;
  processedImages: number;
  results?: any[];
  error?: string;
  providerJobId?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class BatchJobQueue extends EventEmitter {
  private jobs: Map<string, BatchJob> = new Map();

  createJob(
    userId: string,
    provider: string,
    totalImages: number
  ): BatchJob {
    const job: BatchJob = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider,
      status: 'pending',
      totalImages,
      processedImages: 0,
      createdAt: new Date()
    };

    this.jobs.set(job.id, job);
    this.emit('job-created', job);

    return job;
  }

  updateJob(jobId: string, updates: Partial<BatchJob>): BatchJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates);
    this.emit('job-updated', job);

    // Broadcast progress via WebSocket
    if (updates.processedImages !== undefined) {
      this.broadcastProgress(job);
    }

    return job;
  }

  getJob(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  getUserJobs(userId: string): BatchJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId);
  }

  private broadcastProgress(job: BatchJob): void {
    const wsService = getGlobalWsService();
    if (!wsService) return;

    wsService.broadcastToUser(job.userId, {
      type: 'SHOOT_PROGRESS',
      data: {
        shootId: job.id,
        progress: job.processedImages / job.totalImages,
        status: job.status,
        eta: this.estimateETA(job)
      },
      timestamp: new Date()
    });
  }

  private estimateETA(job: BatchJob): number | null {
    if (!job.startedAt || job.processedImages === 0) return null;

    const elapsed = Date.now() - job.startedAt.getTime();
    const avgTimePerImage = elapsed / job.processedImages;
    const remaining = job.totalImages - job.processedImages;

    return avgTimePerImage * remaining;
  }
}

export const batchJobQueue = new BatchJobQueue();
```

**2. Batch Processor** (`server/ai/BatchProcessor.ts`)

```typescript
import { BaseProviderAdapter } from './BaseProviderAdapter';
import { batchJobQueue, BatchJob } from './BatchJobQueue';
import { PhotoRating } from './types';

export class BatchProcessor {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  async submitBatch(
    userId: string,
    provider: BaseProviderAdapter,
    images: any[],
    prompt: string,
    systemPrompt?: string
  ): Promise<BatchJob> {
    // Create job tracking
    const job = batchJobQueue.createJob(
      userId,
      provider.getProviderName(),
      images.length
    );

    try {
      if (provider.supportsBatch()) {
        // Use native batch API
        const providerJob = await provider.submitBatch({
          images,
          prompt,
          systemPrompt,
          outputSchema: PhotoRatingSchema
        });

        batchJobQueue.updateJob(job.id, {
          status: 'processing',
          providerJobId: providerJob.id,
          startedAt: new Date()
        });

        // Start polling for results
        this.pollBatchStatus(job.id, provider, providerJob.id);

      } else {
        // Fallback: Process with concurrent requests
        this.processConcurrently(job.id, provider, images, prompt, systemPrompt);
      }

      return job;

    } catch (error) {
      batchJobQueue.updateJob(job.id, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  private async pollBatchStatus(
    jobId: string,
    provider: BaseProviderAdapter,
    providerJobId: string
  ): Promise<void> {
    const interval = setInterval(async () => {
      try {
        const providerJob = await provider.checkBatchStatus(providerJobId);

        batchJobQueue.updateJob(jobId, {
          status: providerJob.status,
          processedImages: providerJob.processedImages
        });

        if (providerJob.status === 'completed') {
          clearInterval(interval);
          this.pollingIntervals.delete(jobId);

          // Retrieve results
          const results = await provider.retrieveBatchResults(providerJobId);

          batchJobQueue.updateJob(jobId, {
            results,
            completedAt: new Date()
          });

        } else if (providerJob.status === 'failed') {
          clearInterval(interval);
          this.pollingIntervals.delete(jobId);

          batchJobQueue.updateJob(jobId, {
            error: providerJob.error || 'Batch processing failed'
          });
        }

      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling - transient errors are common
      }
    }, 10000);  // Poll every 10 seconds

    this.pollingIntervals.set(jobId, interval);
  }

  private async processConcurrently(
    jobId: string,
    provider: BaseProviderAdapter,
    images: any[],
    prompt: string,
    systemPrompt?: string
  ): Promise<void> {
    batchJobQueue.updateJob(jobId, {
      status: 'processing',
      startedAt: new Date()
    });

    const results: PhotoRating[] = [];
    const concurrency = 5;  // Process 5 images at a time

    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(image =>
          provider.processSingleImage({
            image,
            prompt,
            systemPrompt,
            outputSchema: PhotoRatingSchema
          })
        )
      );

      batchResults.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Image ${i + idx} failed:`, result.reason);
          // Push placeholder for failed image
          results.push(null);
        }
      });

      // Update progress
      batchJobQueue.updateJob(jobId, {
        processedImages: Math.min(i + concurrency, images.length)
      });
    }

    // Complete job
    batchJobQueue.updateJob(jobId, {
      status: 'completed',
      results,
      completedAt: new Date()
    });
  }

  cancelBatch(jobId: string): void {
    const interval = this.pollingIntervals.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(jobId);
    }

    batchJobQueue.updateJob(jobId, {
      status: 'failed',
      error: 'Cancelled by user'
    });
  }
}

export const batchProcessor = new BatchProcessor();
```

**3. Database Schema Updates**

Add to `shared/schema.ts`:

```typescript
export const batchJobs = pgTable('batch_jobs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(),
  status: text('status').notNull(),
  totalImages: integer('total_images').notNull(),
  processedImages: integer('processed_images').notNull().default(0),
  results: jsonb('results'),
  error: text('error'),
  providerJobId: text('provider_job_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at')
});
```

**4. Batch API Routes** (`server/routes/batch.ts`)

```typescript
import express from 'express';
import { verifyDeviceToken } from '../auth/jwt';
import { batchProcessor } from '../ai/BatchProcessor';
import { batchJobQueue } from '../ai/BatchJobQueue';
import { providers } from './ai-passthrough';

const router = express.Router();

/**
 * POST /api/batch/submit
 * Submit batch processing job
 */
router.post('/submit', verifyDeviceToken, async (req, res) => {
  try {
    const { provider, images, prompt, systemPrompt } = req.body;
    const userId = req.user!.userId;

    if (!providers[provider]) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const job = await batchProcessor.submitBatch(
      userId,
      providers[provider],
      images,
      prompt,
      systemPrompt
    );

    res.json({ job });

  } catch (error) {
    console.error('Batch submission error:', error);
    res.status(500).json({ error: 'Batch submission failed' });
  }
});

/**
 * GET /api/batch/status/:jobId
 * Get batch job status
 */
router.get('/status/:jobId', verifyDeviceToken, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user!.userId;

  const job = batchJobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  res.json({ job });
});

/**
 * GET /api/batch/jobs
 * List user's batch jobs
 */
router.get('/jobs', verifyDeviceToken, async (req, res) => {
  const userId = req.user!.userId;
  const jobs = batchJobQueue.getUserJobs(userId);

  res.json({ jobs });
});

/**
 * POST /api/batch/cancel/:jobId
 * Cancel batch job
 */
router.post('/cancel/:jobId', verifyDeviceToken, async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user!.userId;

  const job = batchJobQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  batchProcessor.cancelBatch(jobId);

  res.json({ message: 'Job cancelled' });
});

export default router;
```

#### Acceptance Criteria
- ✅ Batch submission for all providers
- ✅ Native batch API used when available
- ✅ Concurrent processing fallback for providers without batch
- ✅ Real-time progress updates via WebSocket
- ✅ Job status tracking and persistence
- ✅ Cost-effective (50% savings with batch APIs)

---

### Agent D: Keychain & Token Management

#### Objective
Implement secure token storage in iOS/macOS Keychain for user JWT tokens only (never provider API keys).

#### Tasks

**1. Keychain Manager** (`apps/Kull Universal App/kull/kull/KeychainManager.swift`)

```swift
import Foundation
import Security

enum KeychainError: Error {
    case duplicateItem
    case itemNotFound
    case unexpectedStatus(OSStatus)
    case invalidData
}

class KeychainManager {
    static let shared = KeychainManager()

    private let serviceName = "com.kull.app"

    private init() {}

    // MARK: - Access Token

    func saveAccessToken(_ token: String, for deviceId: String) throws {
        let key = "access_token_\(deviceId)"
        try save(token, forKey: key)
    }

    func getAccessToken(for deviceId: String) -> String? {
        let key = "access_token_\(deviceId)"
        return try? retrieve(forKey: key)
    }

    func deleteAccessToken(for deviceId: String) throws {
        let key = "access_token_\(deviceId)"
        try delete(forKey: key)
    }

    // MARK: - Refresh Token

    func saveRefreshToken(_ token: String, for deviceId: String) throws {
        let key = "refresh_token_\(deviceId)"
        try save(token, forKey: key)
    }

    func getRefreshToken(for deviceId: String) -> String? {
        let key = "refresh_token_\(deviceId)"
        return try? retrieve(forKey: key)
    }

    func deleteRefreshToken(for deviceId: String) throws {
        let key = "refresh_token_\(deviceId)"
        try delete(forKey: key)
    }

    // MARK: - Clear All

    func clearAll(for deviceId: String) {
        try? deleteAccessToken(for: deviceId)
        try? deleteRefreshToken(for: deviceId)
    }

    // MARK: - Private Keychain Operations

    private func save(_ value: String, forKey key: String) throws {
        guard let data = value.data(using: .utf8) else {
            throw KeychainError.invalidData
        }

        // Check if item exists
        if (try? retrieve(forKey: key)) != nil {
            // Update existing
            try update(data, forKey: key)
        } else {
            // Add new
            try add(data, forKey: key)
        }
    }

    private func add(_ data: Data, forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            if status == errSecDuplicateItem {
                throw KeychainError.duplicateItem
            }
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func update(_ data: Data, forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        guard status == errSecSuccess else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    private func retrieve(forKey key: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.unexpectedStatus(status)
        }

        guard let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            throw KeychainError.invalidData
        }

        return string
    }

    private func delete(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

**2. Device ID Manager** (`apps/Kull Universal App/kull/kull/DeviceIDManager.swift`)

```swift
import Foundation

class DeviceIDManager {
    static let shared = DeviceIDManager()

    private let userDefaultsKey = "kull_device_id"

    private init() {}

    var deviceID: String {
        // Check if device ID already exists
        if let existing = UserDefaults.standard.string(forKey: userDefaultsKey) {
            return existing
        }

        // Generate new device ID
        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: userDefaultsKey)
        return newID
    }

    func reset() {
        UserDefaults.standard.removeObject(forKey: userDefaultsKey)
    }
}
```

**3. Update AuthViewModel** (`apps/Kull Universal App/kull/kull/AuthViewModel.swift`)

Modify the existing AuthViewModel to save tokens to Keychain:

```swift
// In AuthViewModel.swift, after successful device link:

func pollForApproval() async {
    // ... existing polling logic ...

    // After successful approval:
    if status.status == "approved",
       let accessToken = status.accessToken,
       let refreshToken = status.refreshToken {

        let deviceId = DeviceIDManager.shared.deviceID

        // Save tokens to Keychain
        do {
            try KeychainManager.shared.saveAccessToken(accessToken, for: deviceId)
            try KeychainManager.shared.saveRefreshToken(refreshToken, for: deviceId)

            // Fetch user profile
            await fetchUser()

            self.isAuthenticated = true

        } catch {
            self.error = "Failed to save credentials: \(error.localizedDescription)"
        }
    }
}

func logout() async {
    let deviceId = DeviceIDManager.shared.deviceID

    // Clear Keychain
    KeychainManager.shared.clearAll(for: deviceId)

    // Clear user state
    self.user = nil
    self.isAuthenticated = false

    // Optionally notify backend
    // await KullAPIClient.shared.logout()
}
```

**4. Update KullAPIClient** (`apps/Kull Universal App/kull/kull/KullAPIClient.swift`)

Add automatic token attachment and refresh:

```swift
class KullAPIClient {
    static let shared = KullAPIClient()

    private init() {}

    func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: Encodable? = nil
    ) async throws -> T {
        let deviceId = DeviceIDManager.shared.deviceID

        // Get access token from Keychain
        guard let accessToken = KeychainManager.shared.getAccessToken(for: deviceId) else {
            throw APIError.notAuthenticated
        }

        // Check if token is expired and refresh if needed
        if isTokenExpiringSoon(accessToken) {
            try await refreshAccessToken()
        }

        // Build request with Authorization header
        let url = EnvironmentConfig.shared.apiBaseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            // Token invalid, try refresh
            try await refreshAccessToken()
            // Retry request
            return try await self.request(endpoint, method: method, body: body)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    private func isTokenExpiringSoon(_ token: String) -> Bool {
        // Decode JWT and check expiry
        // Implementation: Parse JWT payload, check 'exp' claim
        // Return true if expires within 5 minutes

        guard let payload = decodeJWT(token),
              let exp = payload["exp"] as? TimeInterval else {
            return true  // Assume expired if can't decode
        }

        let expiryDate = Date(timeIntervalSince1970: exp)
        let fiveMinutesFromNow = Date().addingTimeInterval(300)

        return expiryDate < fiveMinutesFromNow
    }

    private func refreshAccessToken() async throws {
        let deviceId = DeviceIDManager.shared.deviceID

        guard let refreshToken = KeychainManager.shared.getRefreshToken(for: deviceId) else {
            throw APIError.notAuthenticated
        }

        // Call backend refresh endpoint
        let url = EnvironmentConfig.shared.apiBaseURL.appendingPathComponent("/api/device-auth/refresh")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["refreshToken": refreshToken]
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            // Refresh failed - user needs to re-authenticate
            KeychainManager.shared.clearAll(for: deviceId)
            throw APIError.refreshFailed
        }

        struct RefreshResponse: Codable {
            let accessToken: String
        }

        let refreshResponse = try JSONDecoder().decode(RefreshResponse.self, from: data)

        // Save new access token
        try KeychainManager.shared.saveAccessToken(refreshResponse.accessToken, for: deviceId)
    }

    private func decodeJWT(_ token: String) -> [String: Any]? {
        let segments = token.components(separatedBy: ".")
        guard segments.count > 1 else { return nil }

        let payloadSegment = segments[1]
        var base64 = payloadSegment
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        // Pad to multiple of 4
        while base64.count % 4 != 0 {
            base64.append("=")
        }

        guard let data = Data(base64Encoded: base64) else { return nil }

        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }
}

enum APIError: Error {
    case notAuthenticated
    case invalidResponse
    case httpError(Int)
    case refreshFailed
}
```

**5. Update Entitlements** (`apps/Kull Universal App/kull/kull/kull.entitlements`)

Add Keychain access group:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)media.lander.kull</string>
    </array>
    <!-- existing entitlements -->
</dict>
</plist>
```

#### Acceptance Criteria
- ✅ Keychain stores ONLY user JWT tokens (access + refresh)
- ✅ Device ID persists across app launches
- ✅ Automatic token refresh before expiry
- ✅ 401 errors trigger token refresh and retry
- ✅ Logout clears all Keychain data
- ✅ NEVER stores provider API keys

---

### Agent E: WebSocket Real-Time Sync

#### Objective
Implement native WebSocket client using URLSessionWebSocketTask for real-time bidirectional sync with backend.

#### Tasks

**1. Sync Message Models** (`apps/Kull Universal App/kull/kull/SyncMessageModels.swift`)

```swift
import Foundation

enum SyncMessageType: String, Codable {
    case shootProgress = "SHOOT_PROGRESS"
    case creditUpdate = "CREDIT_UPDATE"
    case promptChange = "PROMPT_CHANGE"
    case deviceConnected = "DEVICE_CONNECTED"
    case deviceDisconnected = "DEVICE_DISCONNECTED"
    case adminSessionUpdate = "ADMIN_SESSION_UPDATE"
}

struct SyncMessage: Codable {
    let type: SyncMessageType
    let data: Data  // Raw JSON data, decoded based on type
    let timestamp: Date
}

// Payload types for each message

struct ShootProgressPayload: Codable {
    let shootId: String
    let progress: Double  // 0-1
    let status: String
    let eta: TimeInterval?
}

struct CreditUpdatePayload: Codable {
    let newBalance: Int
    let change: Int
    let reason: String
}

struct PromptChangePayload: Codable {
    let promptId: String
    let action: String  // "created", "updated", "deleted"
}

struct DeviceConnectionPayload: Codable {
    let deviceId: String
    let deviceName: String
    let platform: String
}

struct AdminSessionUpdatePayload: Codable {
    let sessionId: String
    let message: String
}
```

**2. WebSocket Service** (`apps/Kull Universal App/kull/kull/WebSocketService.swift`)

```swift
import Foundation

@MainActor
class WebSocketService: ObservableObject {
    static let shared = WebSocketService()

    @Published var isConnected = false
    @Published var lastSyncTime: Date?

    private var webSocketTask: URLSessionWebSocketTask?
    private var reconnectAttempts = 0
    private var maxReconnectAttempts = 10
    private var isIntentionalDisconnect = false

    // Message handlers
    private var handlers: [SyncMessageType: [(Any) -> Void]] = [:]

    private init() {}

    // MARK: - Connection Management

    func connect(userId: String, deviceId: String) {
        isIntentionalDisconnect = false

        let wsURL = EnvironmentConfig.shared.websocketURL
            .appendingPathComponent("ws")

        var components = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "token", value: "\(userId):\(deviceId)")
        ]

        guard let url = components.url else {
            print("Invalid WebSocket URL")
            return
        }

        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()

        isConnected = true
        reconnectAttempts = 0

        // Start receiving messages
        receiveMessage()

        // Start ping timer
        startPingTimer()

        print("WebSocket connected to \(url)")
    }

    func disconnect() {
        isIntentionalDisconnect = true
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }

    // MARK: - Message Receiving

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                Task { @MainActor in
                    self.handleMessage(message)
                    // Continue receiving
                    self.receiveMessage()
                }

            case .failure(let error):
                Task { @MainActor in
                    print("WebSocket receive error: \(error)")
                    self.isConnected = false

                    if !self.isIntentionalDisconnect {
                        self.attemptReconnection()
                    }
                }
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            parseAndDispatch(text)

        case .data(let data):
            if let text = String(data: data, encoding: .utf8) {
                parseAndDispatch(text)
            }

        @unknown default:
            print("Unknown message type")
        }
    }

    private func parseAndDispatch(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }

        do {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601

            let message = try decoder.decode(SyncMessage.self, from: data)

            lastSyncTime = message.timestamp

            // Dispatch to registered handlers
            dispatchToHandlers(message)

        } catch {
            print("Failed to decode sync message: \(error)")
        }
    }

    private func dispatchToHandlers(_ message: SyncMessage) {
        guard let typeHandlers = handlers[message.type] else { return }

        // Decode data payload based on type
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            switch message.type {
            case .shootProgress:
                let payload = try decoder.decode(ShootProgressPayload.self, from: message.data)
                typeHandlers.forEach { $0(payload) }

            case .creditUpdate:
                let payload = try decoder.decode(CreditUpdatePayload.self, from: message.data)
                typeHandlers.forEach { $0(payload) }

            case .promptChange:
                let payload = try decoder.decode(PromptChangePayload.self, from: message.data)
                typeHandlers.forEach { $0(payload) }

            case .deviceConnected, .deviceDisconnected:
                let payload = try decoder.decode(DeviceConnectionPayload.self, from: message.data)
                typeHandlers.forEach { $0(payload) }

            case .adminSessionUpdate:
                let payload = try decoder.decode(AdminSessionUpdatePayload.self, from: message.data)
                typeHandlers.forEach { $0(payload) }
            }
        } catch {
            print("Failed to decode payload for \(message.type): \(error)")
        }
    }

    // MARK: - Handler Registration

    func registerHandler<T>(for type: SyncMessageType, handler: @escaping (T) -> Void) {
        if handlers[type] == nil {
            handlers[type] = []
        }

        handlers[type]?.append { payload in
            if let typedPayload = payload as? T {
                handler(typedPayload)
            }
        }
    }

    // MARK: - Ping/Pong

    private func startPingTimer() {
        Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] timer in
            guard let self = self, self.isConnected else {
                timer.invalidate()
                return
            }

            self.sendPing()
        }
    }

    private func sendPing() {
        webSocketTask?.sendPing { error in
            if let error = error {
                print("Ping failed: \(error)")
            }
        }
    }

    // MARK: - Reconnection

    private func attemptReconnection() {
        guard !isIntentionalDisconnect,
              reconnectAttempts < maxReconnectAttempts else {
            print("Max reconnection attempts reached")
            return
        }

        reconnectAttempts += 1

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
        let delay = min(pow(2.0, Double(reconnectAttempts)), 30.0)

        print("Reconnecting in \(delay) seconds (attempt \(reconnectAttempts))")

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self, !self.isIntentionalDisconnect else { return }

            // Get current user/device IDs and reconnect
            // This requires accessing auth state
            // For now, emit notification that reconnection is needed
            NotificationCenter.default.post(name: .webSocketReconnectionNeeded, object: nil)
        }
    }
}

extension Notification.Name {
    static let webSocketReconnectionNeeded = Notification.Name("webSocketReconnectionNeeded")
}
```

**3. Sync Coordinator** (`apps/Kull Universal App/kull/kull/SyncCoordinator.swift`)

```swift
import Foundation

@MainActor
class SyncCoordinator: ObservableObject {
    static let shared = SyncCoordinator()

    // Published state
    @Published var activeShootProgress: [String: Double] = [:]
    @Published var activeShootStatus: [String: String] = [:]
    @Published var creditBalance: Int = 0
    @Published var connectedDevices: [DeviceConnectionPayload] = []

    private init() {
        registerHandlers()
        observeReconnectionNeeds()
    }

    private func registerHandlers() {
        // Shoot progress handler
        WebSocketService.shared.registerHandler(for: .shootProgress) {
            (payload: ShootProgressPayload) in
            self.activeShootProgress[payload.shootId] = payload.progress
            self.activeShootStatus[payload.shootId] = payload.status

            // Show notification if completed
            if payload.status == "completed" {
                self.showShootCompletedNotification(payload.shootId)
            }
        }

        // Credit update handler
        WebSocketService.shared.registerHandler(for: .creditUpdate) {
            (payload: CreditUpdatePayload) in
            self.creditBalance = payload.newBalance

            // Show notification for significant changes
            if abs(payload.change) > 1000 {
                self.showCreditUpdateNotification(payload)
            }
        }

        // Device connection handler
        WebSocketService.shared.registerHandler(for: .deviceConnected) {
            (payload: DeviceConnectionPayload) in
            self.connectedDevices.append(payload)
            self.showDeviceConnectedNotification(payload)
        }

        // Device disconnection handler
        WebSocketService.shared.registerHandler(for: .deviceDisconnected) {
            (payload: DeviceConnectionPayload) in
            self.connectedDevices.removeAll { $0.deviceId == payload.deviceId }
        }

        // Prompt change handler
        WebSocketService.shared.registerHandler(for: .promptChange) {
            (payload: PromptChangePayload) in
            // Notify marketplace to refresh
            NotificationCenter.default.post(
                name: .marketplaceNeedsRefresh,
                object: nil,
                userInfo: ["promptId": payload.promptId, "action": payload.action]
            )
        }
    }

    private func observeReconnectionNeeds() {
        NotificationCenter.default.addObserver(
            forName: .webSocketReconnectionNeeded,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.reconnectWebSocket()
        }
    }

    private func reconnectWebSocket() {
        // Reconnect with current auth state
        // This requires access to AuthViewModel
        // For now, post notification that AuthViewModel can handle
        NotificationCenter.default.post(name: .shouldReconnectWebSocket, object: nil)
    }

    // MARK: - Notifications

    private func showShootCompletedNotification(_ shootId: String) {
        // Local notification
        let content = UNMutableNotificationContent()
        content.title = "Shoot Completed"
        content.body = "Your photo culling is ready!"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "shoot_\(shootId)",
            content: content,
            trigger: nil  // Immediate
        )

        UNUserNotificationCenter.current().add(request)
    }

    private func showCreditUpdateNotification(_ payload: CreditUpdatePayload) {
        let content = UNMutableNotificationContent()
        content.title = payload.change > 0 ? "Credits Added" : "Credits Used"
        content.body = "\(abs(payload.change)) credits. New balance: \(payload.newBalance)"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "credit_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }

    private func showDeviceConnectedNotification(_ payload: DeviceConnectionPayload) {
        let content = UNMutableNotificationContent()
        content.title = "Device Connected"
        content.body = "\(payload.deviceName) just connected to Kull"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "device_\(payload.deviceId)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }
}

extension Notification.Name {
    static let shouldReconnectWebSocket = Notification.Name("shouldReconnectWebSocket")
    static let marketplaceNeedsRefresh = Notification.Name("marketplaceNeedsRefresh")
}
```

**4. Update AuthViewModel to Connect WebSocket** (`AuthViewModel.swift`)

```swift
// In AuthViewModel, after successful authentication:

func pollForApproval() async {
    // ... existing auth flow ...

    // After successful auth:
    if self.isAuthenticated, let user = self.user {
        let deviceId = DeviceIDManager.shared.deviceID

        // Connect WebSocket
        WebSocketService.shared.connect(userId: user.id, deviceId: deviceId)
    }
}

// Add reconnection observer
init() {
    // ... existing init ...

    NotificationCenter.default.addObserver(
        forName: .shouldReconnectWebSocket,
        object: nil,
        queue: .main
    ) { [weak self] _ in
        guard let self = self,
              let user = self.user else { return }

        let deviceId = DeviceIDManager.shared.deviceID
        WebSocketService.shared.connect(userId: user.id, deviceId: deviceId)
    }
}
```

**5. UI Updates for Connection Status**

**macOS** - Update `KullMenubarApp.swift`:
```swift
// Add to menubar status
@ObservedObject var webSocket = WebSocketService.shared
@ObservedObject var syncCoordinator = SyncCoordinator.shared

var body: some View {
    MenuBarExtra {
        VStack(alignment: .leading) {
            // Connection status
            HStack {
                Image(systemName: webSocket.isConnected ? "bolt.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(webSocket.isConnected ? .green : .orange)
                Text(webSocket.isConnected ? "Connected" : "Offline")

                if let lastSync = webSocket.lastSyncTime {
                    Text("• \(timeAgo(lastSync))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Divider()

            // Credits
            Text("Credits: \(syncCoordinator.creditBalance)")

            // Active shoots
            if !syncCoordinator.activeShootProgress.isEmpty {
                Divider()
                ForEach(Array(syncCoordinator.activeShootProgress.keys), id: \.self) { shootId in
                    VStack(alignment: .leading) {
                        Text(shootId)
                            .font(.caption)
                        ProgressView(value: syncCoordinator.activeShootProgress[shootId] ?? 0)
                    }
                }
            }

            // ... rest of menu
        }
    }
}
```

**iOS** - Update `KullMobileApp.swift`:
```swift
// Add connection banner at top of home view
@ObservedObject var webSocket = WebSocketService.shared

var body: some View {
    NavigationStack {
        VStack(spacing: 0) {
            // Connection banner
            HStack {
                Image(systemName: webSocket.isConnected ? "bolt.fill" : "exclamationmark.triangle.fill")
                    .foregroundColor(webSocket.isConnected ? .green : .orange)
                Text(webSocket.isConnected ? "Connected" : "Offline")

                if let lastSync = webSocket.lastSyncTime {
                    Text("• \(timeAgo(lastSync))")
                        .font(.caption)
                }

                Spacer()
            }
            .padding()
            .background(webSocket.isConnected ? Color.green.opacity(0.1) : Color.orange.opacity(0.1))

            // Rest of home view
            // ...
        }
    }
}
```

#### Acceptance Criteria
- ✅ WebSocket connects on authentication
- ✅ Auto-reconnection with exponential backoff
- ✅ Type-safe message handling
- ✅ Real-time UI updates for progress, credits, devices
- ✅ Local notifications for important events
- ✅ Connection status visible in UI

---

### Agent F: Cloud AI Service Integration

#### Objective
Connect native app to backend AI passthrough API for cloud processing.

#### Tasks

**1. Cloud AI Service** (`apps/Kull Universal App/kull/kull/CloudAIService.swift`)

```swift
import Foundation

enum AIProvider: String, Codable {
    case appleIntelligence = "apple"
    case googleFlashLite = "google-flash-lite"
    case openaiGPT5Mini = "openai-gpt5-mini"
    case anthropicHaiku = "anthropic-haiku"
    case anthropicSonnet = "anthropic-sonnet"
}

struct ProviderInfo: Codable {
    let id: String
    let name: String
    let costPerImage: Double
    let creditsPerImage: Int
    let supportsBatch: Bool
}

struct ProcessResult: Codable {
    let result: PhotoRating
    let creditsUsed: Int
    let newBalance: Int
}

struct PhotoRating: Codable {
    let starRating: Int
    let colorLabel: String
    let keepReject: String
    let tags: [String]
    let description: String
    let technicalQuality: TechnicalQuality
    let subjectAnalysis: SubjectAnalysis
}

struct TechnicalQuality: Codable {
    let sharpness: Double
    let exposure: Double
    let composition: Double
    let overallScore: Double
}

struct SubjectAnalysis: Codable {
    let primarySubject: String
    let emotion: String
    let eyesOpen: Bool
    let smiling: Bool
    let inFocus: Bool
}

class CloudAIService {
    static let shared = CloudAIService()

    private init() {}

    // MARK: - Provider Management

    func getAvailableProviders() async throws -> [ProviderInfo] {
        let response: ProvidersResponse = try await KullAPIClient.shared.request(
            "/api/ai/providers",
            method: "GET"
        )
        return response.providers
    }

    // MARK: - Single Image Processing

    func processSingleImage(
        provider: AIProvider,
        imageData: Data,
        imageFormat: String,
        prompt: String,
        systemPrompt: String? = nil
    ) async throws -> ProcessResult {
        let base64Image = imageData.base64EncodedString()

        let body = ProcessSingleRequest(
            provider: provider.rawValue,
            imageData: base64Image,
            imageFormat: imageFormat,
            prompt: prompt,
            systemPrompt: systemPrompt
        )

        return try await KullAPIClient.shared.request(
            "/api/ai/process-single",
            method: "POST",
            body: body
        )
    }

    // MARK: - Batch Processing

    func submitBatch(
        provider: AIProvider,
        images: [(data: Data, format: String, filename: String)],
        prompt: String,
        systemPrompt: String? = nil
    ) async throws -> BatchJob {
        let imagePayloads = images.map { img in
            ImagePayload(
                data: img.data.base64EncodedString(),
                format: img.format,
                filename: img.filename
            )
        }

        let body = ProcessBatchRequest(
            provider: provider.rawValue,
            images: imagePayloads,
            prompt: prompt,
            systemPrompt: systemPrompt
        )

        let response: BatchJobResponse = try await KullAPIClient.shared.request(
            "/api/ai/process-batch",
            method: "POST",
            body: body
        )

        return response.batchJob
    }

    func checkBatchStatus(jobId: String, provider: AIProvider) async throws -> BatchJob {
        let response: BatchStatusResponse = try await KullAPIClient.shared.request(
            "/api/ai/batch-status/\(jobId)?provider=\(provider.rawValue)",
            method: "GET"
        )
        return response.job
    }

    func retrieveBatchResults(jobId: String, provider: AIProvider) async throws -> [PhotoRating] {
        let response: BatchResultsResponse = try await KullAPIClient.shared.request(
            "/api/ai/batch-results/\(jobId)?provider=\(provider.rawValue)",
            method: "GET"
        )
        return response.results
    }
}

// MARK: - Request/Response Types

private struct ProcessSingleRequest: Codable {
    let provider: String
    let imageData: String
    let imageFormat: String
    let prompt: String
    let systemPrompt: String?
}

private struct ProcessBatchRequest: Codable {
    let provider: String
    let images: [ImagePayload]
    let prompt: String
    let systemPrompt: String?
}

private struct ImagePayload: Codable {
    let data: String
    let format: String
    let filename: String
}

private struct ProvidersResponse: Codable {
    let providers: [ProviderInfo]
}

private struct BatchJobResponse: Codable {
    let batchJob: BatchJob
}

private struct BatchStatusResponse: Codable {
    let job: BatchJob
}

private struct BatchResultsResponse: Codable {
    let results: [PhotoRating]
}

struct BatchJob: Codable {
    let id: String
    let provider: String
    let status: String
    let totalImages: Int
    let processedImages: Int
    let results: [PhotoRating]?
    let error: String?
    let createdAt: Date
    let completedAt: Date?
}
```

**2. Update RunController** (`apps/Kull Universal App/kull/kull/RunController.swift`)

Integrate CloudAIService:

```swift
// Modify RunController to support cloud providers

class RunController {
    // ... existing code ...

    func runCulling(
        folderURL: URL,
        provider: AIProvider,
        prompt: String
    ) async throws {
        let images = try enumerateImages(in: folderURL)

        switch provider {
        case .appleIntelligence:
            // Use local processing
            try await processLocally(images: images, prompt: prompt)

        default:
            // Use cloud processing
            try await processViaCloud(
                provider: provider,
                images: images,
                prompt: prompt
            )
        }
    }

    private func processLocally(images: [URL], prompt: String) async throws {
        // Existing local processing logic
        // Use AppleIntelligenceService
    }

    private func processViaCloud(
        provider: AIProvider,
        images: [URL],
        prompt: String
    ) async throws {
        // Prepare images
        let imageData = try images.map { url -> (Data, String, String) in
            let data = try Data(contentsOf: url)
            let format = url.pathExtension.lowercased()
            let filename = url.lastPathComponent
            return (data, format, filename)
        }

        // Check if provider supports batch
        let providers = try await CloudAIService.shared.getAvailableProviders()
        guard let providerInfo = providers.first(where: { $0.id == provider.rawValue }) else {
            throw RunError.invalidProvider
        }

        if providerInfo.supportsBatch && images.count > 10 {
            // Use batch processing
            try await processBatchViaCloud(
                provider: provider,
                images: imageData,
                prompt: prompt
            )
        } else {
            // Process individually
            try await processIndividuallyViaCloud(
                provider: provider,
                images: imageData,
                prompt: prompt
            )
        }
    }

    private func processBatchViaCloud(
        provider: AIProvider,
        images: [(Data, String, String)],
        prompt: String
    ) async throws {
        // Submit batch
        let batchJob = try await CloudAIService.shared.submitBatch(
            provider: provider,
            images: images,
            prompt: prompt,
            systemPrompt: getSystemPrompt()
        )

        // Poll for completion
        // (Backend WebSocket will broadcast progress updates)
        var job = batchJob
        while job.status == "pending" || job.status == "processing" {
            try await Task.sleep(nanoseconds: 10_000_000_000)  // 10 seconds
            job = try await CloudAIService.shared.checkBatchStatus(
                jobId: job.id,
                provider: provider
            )
        }

        if job.status == "failed" {
            throw RunError.batchFailed(job.error ?? "Unknown error")
        }

        // Retrieve results
        let results = try await CloudAIService.shared.retrieveBatchResults(
            jobId: job.id,
            provider: provider
        )

        // Write XMP files
        for (index, result) in results.enumerated() {
            guard index < images.count else { break }
            let imageURL = images[index].2  // filename
            try XMPWriter.shared.writeXMP(for: imageURL, rating: result)
        }
    }

    private func processIndividuallyViaCloud(
        provider: AIProvider,
        images: [(Data, String, String)],
        prompt: String
    ) async throws {
        for (index, image) in images.enumerated() {
            let result = try await CloudAIService.shared.processSingleImage(
                provider: provider,
                imageData: image.0,
                imageFormat: image.1,
                prompt: prompt,
                systemPrompt: getSystemPrompt()
            )

            // Write XMP
            // ... write logic ...

            // Update progress
            let progress = Double(index + 1) / Double(images.count)
            await MainActor.run {
                self.progress = progress
            }
        }
    }

    private func getSystemPrompt() -> String {
        return """
        You are an expert photo curator analyzing images for a professional photographer.
        Rate each photo on technical quality, composition, and emotional impact.
        Be critical but fair. Hero shots (5 stars) should be exceptional.
        """
    }
}

enum RunError: Error {
    case invalidProvider
    case batchFailed(String)
}
```

**3. Update RunSheetView** (`apps/Kull Universal App/kull/kull/RunSheetView.swift`)

Add provider selection UI:

```swift
struct RunSheetView: View {
    @State private var selectedProvider: AIProvider = .appleIntelligence
    @State private var availableProviders: [ProviderInfo] = []
    @State private var customPrompt: String = ""

    var body: some View {
        Form {
            Section("AI Provider") {
                Picker("Provider", selection: $selectedProvider) {
                    ForEach(availableProviders, id: \.id) { provider in
                        HStack {
                            Text(provider.name)
                            Spacer()
                            Text("\(provider.creditsPerImage) credits")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .tag(AIProvider(rawValue: provider.id)!)
                    }
                }

                if let selected = availableProviders.first(where: { $0.id == selectedProvider.rawValue }) {
                    VStack(alignment: .leading) {
                        Text("Cost: \(selected.creditsPerImage) credits per image")
                            .font(.caption)
                        if selected.supportsBatch {
                            Text("✓ Supports batch processing (50% discount)")
                                .font(.caption)
                                .foregroundColor(.green)
                        }
                    }
                }
            }

            Section("Prompt") {
                TextEditor(text: $customPrompt)
                    .frame(height: 100)
                    .border(Color.gray.opacity(0.2))
            }

            Section {
                Button("Start Culling") {
                    startCulling()
                }
                .disabled(customPrompt.isEmpty)
            }
        }
        .task {
            await loadProviders()
        }
    }

    private func loadProviders() async {
        do {
            availableProviders = try await CloudAIService.shared.getAvailableProviders()
        } catch {
            print("Failed to load providers: \(error)")
        }
    }

    private func startCulling() {
        // Start culling with selected provider
        Task {
            do {
                try await RunController.shared.runCulling(
                    folderURL: selectedFolderURL,
                    provider: selectedProvider,
                    prompt: customPrompt
                )
            } catch {
                print("Culling failed: \(error)")
            }
        }
    }
}
```

#### Acceptance Criteria
- ✅ Cloud AI service calls backend passthrough API
- ✅ Provider selection UI with pricing
- ✅ Batch processing for supported providers
- ✅ Individual processing fallback
- ✅ Real-time progress updates via WebSocket
- ✅ XMP writing after processing
- ✅ Credit deduction automatic

---

### Agent G: Settings & Error Handling

*(Continued in next section due to length...)*

---

### Agent H: Offline Mode & Operation Queue

*(Details provided...)*

---

### Agent I: Build Pipeline & CI/CD

*(Details provided...)*

---

## Testing & Validation

Each agent should test their component:
- Unit tests for core logic
- Integration tests with backend
- UI tests for user flows
- Manual testing across macOS/iOS

---

## Final Questions

Before we launch into implementation, please confirm:

1. **API Key Architecture**: Confirmed that NO user/customer API keys go in Keychain - only their JWT auth tokens. All provider keys stay on server. ✅

2. **Provider Priority**: Should we implement all 5 providers (Anthropic, OpenAI, Google, Grok, Groq) in Phase 1, or start with 2-3 and add more later?

3. **Batch Processing**: For providers without native batch APIs (Grok, Groq), is concurrent processing (5-10 at a time) acceptable?

4. **Apple Intelligence**: Should macOS app use Apple Intelligence for free pre-filtering before sending to cloud, or make it a user choice?

5. **Credit Costs**: What markup should we add to provider costs for our credit system? (e.g., 2x markup: $0.001 API cost = 2 credits for customer)

6. **Error Tolerance**: If batch processing has partial failures (e.g., 10% of images fail), should we:
   - Retry failed images automatically?
   - Return partial results and let user decide?
   - Fail entire batch?

7. **Progress Updates**: Should progress updates be real-time (every image) or batched (every 10 images) to reduce WebSocket traffic?

8. **Testing Strategy**: Manual testing only, or should we write unit/integration tests as we go?

Please provide answers and I'll immediately distribute work to agents for parallel execution.
