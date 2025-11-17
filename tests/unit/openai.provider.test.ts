import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { submitOpenAIBatch } from "../../server/providers/openai";

type FetchMock = ReturnType<typeof vi.fn>;

const fetchMock: FetchMock = vi.fn();
const originalFetch = globalThis.fetch;

type MockResponseInit = {
  status?: number;
  ok?: boolean;
  json?: unknown;
  headers?: Record<string, string>;
};

function createResponse(init: MockResponseInit): any {
  const headers = init.headers ?? {};
  return {
    status: init.status ?? 200,
    ok: init.ok ?? true,
    headers: {
      get: (key: string) => {
        const lower = key.toLowerCase();
        return headers[lower] ?? headers[key] ?? null;
      },
    },
    json: async () => init.json,
  };
}

describe("submitOpenAIBatch", () => {
  const defaultArgs = {
    apiKey: "sk-test",
    model: "gpt-5",
    prompt: "Rate each image hero(5) to reject(1).",
    images: [
      { id: "img-1", url: "https://cdn.example.com/img-1.jpg", filename: "IMG_0001.JPG" },
      { id: "img-2", url: "https://cdn.example.com/img-2.jpg" },
    ],
  } as const;

  beforeEach(() => {
    fetchMock.mockReset();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it("parses structured output embedded in response content", async () => {
    const payload = {
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                ratings: [
                  { imageId: "img-1", starRating: 4, tags: ["keeper"] },
                  { imageId: "img-2", starRating: 2 },
                ],
              }),
            },
          ],
        },
      ],
    };
    fetchMock.mockResolvedValue(createResponse({ json: payload }));

    const result = await submitOpenAIBatch(defaultArgs);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ratings).toHaveLength(2);
      expect(result.ratings[0]).toMatchObject({
        imageId: "img-1",
        filename: "IMG_0001.JPG",
        starRating: 4,
        tags: ["keeper"],
      });
    }
  });

  it("returns retry delay when rate limited", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ status: 429, ok: false, headers: { "retry-after": "4" } }),
    );

    const result = await submitOpenAIBatch(defaultArgs);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBe(4000);
    }
  });

  it("fails gracefully when schema isn't returned", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ json: { unexpected: true } }),
    );

    const result = await submitOpenAIBatch(defaultArgs);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ratings).toEqual([]);
    }
  });

  it("includes metadata context in the IMAGE_REF descriptor", async () => {
    fetchMock.mockResolvedValue(createResponse({ json: {} }));
    const metadata: any = {
      filename: "IMG_0001.JPG",
      relativePath: "IMG_0001.JPG",
      fileHash: "hash",
      byteSize: 123,
      captureDate: "2025-01-01T00:00:00.000Z",
      width: 4000,
      height: 3000,
      cameraMake: "Canon",
      cameraModel: "R5",
      lensModel: "24-70mm",
      gps: {
        latitude: 39.7392,
        longitude: -104.9903,
        resolvedAddress: "Denver, Colorado",
        nearbyVenues: [{ name: "Union Station" }],
      },
      iptc: {
        title: "Networking Event",
        keywords: ["Denver"],
      },
    };

    await submitOpenAIBatch({
      ...defaultArgs,
      images: [
        {
          ...defaultArgs.images[0],
          metadata,
          tags: ["Denver"],
        },
      ],
    });

    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse((requestInit as any).body);
    const promptEntries = body.input[0].content;
    const refEntry = promptEntries.find(
      (entry: any) =>
        entry.type === "input_text" &&
        typeof entry.text === "string" &&
        entry.text.startsWith("IMAGE_REF "),
    );
    expect(refEntry).toBeTruthy();
    const refPayload = JSON.parse(refEntry.text.replace("IMAGE_REF ", ""));
    expect(refPayload.context).toBeDefined();
    expect(refPayload.context.camera.make).toBe("Canon");
    expect(refPayload.context.location.address).toBe("Denver, Colorado");
    expect(refPayload.context.tags).toEqual(["Denver"]);
  });
});
