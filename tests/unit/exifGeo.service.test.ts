import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExifGeoContextService } from "../../server/services/exifGeo";

const parseMock = vi.fn();

vi.mock("exifr", () => ({
  __esModule: true,
  default: {
    parse: (...args: unknown[]) => parseMock(...args),
  },
}), { virtual: true });

describe("ExifGeoContextService", () => {
  const sampleExif = {
    Make: "Canon",
    Model: "R5",
    LensModel: "24-70mm",
    DateTimeOriginal: new Date("2024-05-04T10:11:12Z"),
    ImageWidth: 6000,
    ImageHeight: 4000,
    ExposureTime: 0.0025,
    FNumber: 2.8,
    ISO: 400,
    FocalLength: 35,
    latitude: 39.7392,
    longitude: -104.9903,
    iptc: {
      ObjectName: "Networking Event",
      Keywords: ["Denver", "Tech"],
      Byline: ["Steve"],
      City: "Denver",
      ProvinceState: "CO",
      CountryName: "USA",
    },
  };

  const mapboxResponse = {
    features: [
      {
        place_type: ["address"],
        place_name: "Union Station, Denver, Colorado",
      },
      {
        place_type: ["poi"],
        text: "The Cooper Lounge",
        properties: { category: "cocktail bar", distance: 120 },
      },
    ],
  };

  const fetchMock = vi.fn();

  beforeEach(() => {
    parseMock.mockResolvedValue(sampleExif as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => mapboxResponse,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("extracts metadata, enriches with geocode, and builds tags", async () => {
    const service = new ExifGeoContextService({ fetchImpl: fetchMock as any, mapboxToken: "token" });
    const result = await service.extractFromBuffer(new Uint8Array(), { filename: "IMG_0001.CR3" });

    expect(parseMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.metadata.cameraMake).toBe("Canon");
    expect(result.metadata.gps?.resolvedAddress).toBe("Union Station, Denver, Colorado");
    expect(result.metadata.gps?.nearbyVenues?.[0]?.name).toBe("The Cooper Lounge");
    expect(result.tags).toContain("Denver");
    expect(result.tags).toContain("Tech");
  });

  it("caches reverse geocode lookups", async () => {
    const service = new ExifGeoContextService({ fetchImpl: fetchMock as any, mapboxToken: "token" });
    await service.extractFromBuffer(new Uint8Array(), {});
    await service.extractFromBuffer(new Uint8Array(), {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back gracefully when no geocoder token is provided", async () => {
    const service = new ExifGeoContextService();
    const result = await service.extractFromBuffer(new Uint8Array(), {});
    expect(result.metadata.gps?.resolvedAddress).toBeUndefined();
    expect(result.metadata.gps?.nearbyVenues).toBeUndefined();
  });
});
