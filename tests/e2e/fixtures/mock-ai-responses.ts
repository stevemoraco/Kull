/**
 * Mock AI responses for E2E testing
 * Simulates AI provider responses without making real API calls
 */

export interface MockPhotoRating {
  imageId: string;
  filename: string;
  starRating: 1 | 2 | 3 | 4 | 5;
  colorLabel: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'none';
  keepReject: 'keep' | 'reject' | 'maybe';
  technicalQuality: {
    focusAccuracy: number;
    exposureQuality: number;
    compositionScore: number;
    lightingQuality: number;
    colorHarmony: number;
    noiseLevel: number;
    sharpnessDetail: number;
    dynamicRange: number;
    overallTechnical: number;
  };
  subjectAnalysis: {
    primarySubject: string;
    emotionIntensity: number;
    eyesOpen: boolean;
    eyeContact: boolean;
    genuineExpression: number;
    facialSharpness: number;
    bodyLanguage: number;
    momentTiming: number;
    storyTelling: number;
    uniqueness: number;
  };
  tags: string[];
  description: string;
  similarityGroup?: string;
  shootContext?: {
    eventType: string;
    shootPhase: string;
    timeOfDay: string;
    location: string;
  };
}

export function generateMockRating(
  filename: string,
  options: Partial<MockPhotoRating> = {}
): MockPhotoRating {
  const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Generate realistic random ratings
  const starRating = (options.starRating || Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5;

  return {
    imageId,
    filename,
    starRating,
    colorLabel: options.colorLabel || 'none',
    keepReject: options.keepReject || (starRating >= 3 ? 'keep' : 'maybe'),
    technicalQuality: {
      focusAccuracy: Math.floor(Math.random() * 500) + 500,
      exposureQuality: Math.floor(Math.random() * 500) + 500,
      compositionScore: Math.floor(Math.random() * 500) + 500,
      lightingQuality: Math.floor(Math.random() * 500) + 500,
      colorHarmony: Math.floor(Math.random() * 500) + 500,
      noiseLevel: Math.floor(Math.random() * 500) + 500,
      sharpnessDetail: Math.floor(Math.random() * 500) + 500,
      dynamicRange: Math.floor(Math.random() * 500) + 500,
      overallTechnical: Math.floor(Math.random() * 500) + 500,
    },
    subjectAnalysis: {
      primarySubject: 'Person',
      emotionIntensity: Math.floor(Math.random() * 500) + 500,
      eyesOpen: true,
      eyeContact: Math.random() > 0.5,
      genuineExpression: Math.floor(Math.random() * 500) + 500,
      facialSharpness: Math.floor(Math.random() * 500) + 500,
      bodyLanguage: Math.floor(Math.random() * 500) + 500,
      momentTiming: Math.floor(Math.random() * 500) + 500,
      storyTelling: Math.floor(Math.random() * 500) + 500,
      uniqueness: Math.floor(Math.random() * 500) + 500,
    },
    tags: ['test', 'e2e'],
    description: `Test photo rating for ${filename}`,
    shootContext: {
      eventType: 'wedding',
      shootPhase: 'ceremony',
      timeOfDay: 'afternoon',
      location: 'outdoor',
    },
    ...options,
  };
}

export function generateBatchMockRatings(count: number): MockPhotoRating[] {
  return Array.from({ length: count }, (_, i) =>
    generateMockRating(`test-photo-${i}.jpg`)
  );
}

export const mockProviderResponse = {
  openai: (imageFilename: string) => ({
    rating: generateMockRating(imageFilename),
    cost: 0.002,
    userCharge: 0.004,
    processingTimeMs: Math.floor(Math.random() * 500) + 200,
    provider: 'openai',
    model: 'gpt-5-nano',
  }),

  anthropic: (imageFilename: string) => ({
    rating: generateMockRating(imageFilename),
    cost: 0.003,
    userCharge: 0.006,
    processingTimeMs: Math.floor(Math.random() * 500) + 200,
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
  }),

  google: (imageFilename: string) => ({
    rating: generateMockRating(imageFilename),
    cost: 0.001,
    userCharge: 0.002,
    processingTimeMs: Math.floor(Math.random() * 500) + 200,
    provider: 'google',
    model: 'gemini-2.5-flash-lite',
  }),
};

export const mockBatchResponse = {
  success: (imageCount: number, provider: string = 'openai') => ({
    results: generateBatchMockRatings(imageCount).map((rating, idx) => ({
      rating,
      cost: 0.002,
      userCharge: 0.004,
      processingTimeMs: Math.floor(Math.random() * 500) + 200,
      provider,
      success: true,
    })),
    summary: {
      totalImages: imageCount,
      successful: imageCount,
      failed: 0,
      totalCost: imageCount * 0.002,
      totalUserCharge: imageCount * 0.004,
      provider,
      processingTimeMs: Math.floor(Math.random() * 2000) + 1000,
    },
  }),

  partialFailure: (imageCount: number, failureCount: number, provider: string = 'openai') => {
    const successCount = imageCount - failureCount;
    const results = [
      ...generateBatchMockRatings(successCount).map((rating) => ({
        rating,
        cost: 0.002,
        userCharge: 0.004,
        processingTimeMs: Math.floor(Math.random() * 500) + 200,
        provider,
        success: true,
      })),
      ...Array.from({ length: failureCount }, (_, i) => ({
        error: 'Rate limit exceeded',
        filename: `test-photo-${successCount + i}.jpg`,
        success: false,
      })),
    ];

    return {
      results,
      summary: {
        totalImages: imageCount,
        successful: successCount,
        failed: failureCount,
        totalCost: successCount * 0.002,
        totalUserCharge: successCount * 0.004,
        provider,
        processingTimeMs: Math.floor(Math.random() * 2000) + 1000,
      },
    };
  },
};

export const mockWebSocketMessages = {
  shootProgress: (shootId: string, processedCount: number, totalCount: number) => ({
    type: 'SHOOT_PROGRESS',
    data: {
      shootId,
      status: processedCount === totalCount ? 'completed' : 'processing',
      processedCount,
      totalCount,
      currentImage: `test-photo-${processedCount}.jpg`,
      eta: Math.floor((totalCount - processedCount) * 0.5),
      provider: 'openai',
    },
    timestamp: Date.now(),
    deviceId: 'test-device',
    userId: 'test-user',
  }),

  creditUpdate: (userId: string, change: number) => ({
    type: 'CREDIT_UPDATE',
    data: {
      userId,
      newBalance: 100 - Math.abs(change),
      change,
      reason: 'Photo processing',
    },
    timestamp: Date.now(),
    deviceId: 'test-device',
    userId,
  }),

  deviceConnected: (deviceId: string, userId: string) => ({
    type: 'DEVICE_CONNECTED',
    data: {
      deviceId,
      platform: 'macos',
      deviceName: 'Test Device',
      connectedAt: Date.now(),
    },
    timestamp: Date.now(),
    deviceId,
    userId,
  }),
};
