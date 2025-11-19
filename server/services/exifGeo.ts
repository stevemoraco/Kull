import { mergeExifAndIptc, collectContentTags, type RawExifPayload, type RawIptcPayload } from "@shared/utils/exif";
import type { ImageMetadata } from "@shared/culling";
type FetchLike = typeof fetch;

type NearbyVenue = {
  name: string;
  category?: string;
  distanceMeters?: number;
};

type GeoLookupResult = {
  address?: string;
  pois: NearbyVenue[];
};

type ParseResult = {
  metadata: ImageMetadata;
  tags: string[];
};

const DEFAULT_TTL_MS = 1000 * 60 * 30;

class TTLCache<T> {
  private readonly store = new Map<string, { value: T; expires: number }>();
  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expires < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

class GeoClient {
  private readonly cache: TTLCache<GeoLookupResult>;
  constructor(
    private readonly token?: string,
    private readonly fetchImpl: FetchLike | undefined = globalThis.fetch,
    ttlMs = DEFAULT_TTL_MS,
  ) {
    this.cache = new TTLCache<GeoLookupResult>(ttlMs);
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeoLookupResult> {
    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const fallback: GeoLookupResult = { pois: [] };
    if (!this.token || !this.fetchImpl) {
      this.cache.set(cacheKey, fallback);
      return fallback;
    }

    const params = new URLSearchParams({
      access_token: this.token,
      types: "address,place,poi",
      limit: "6",
    });
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?${params.toString()}`;

    try {
      const resp = await this.fetchImpl(url);
      if (!resp.ok) {
        this.cache.set(cacheKey, fallback);
        return fallback;
      }
      const json = await resp.json();
      const features = Array.isArray(json?.features) ? json.features : [];
      const addressFeature = features.find((f: any) => Array.isArray(f?.place_type) && f.place_type.includes("address"))
        ?? features.find((f: any) => Array.isArray(f?.place_type) && f.place_type.includes("place"));
      const address: string | undefined = addressFeature?.place_name;
      const pois: NearbyVenue[] = features
        .filter((f: any) => Array.isArray(f?.place_type) && f.place_type.includes("poi"))
        .slice(0, 5)
        .map((f: any) => ({
          name: f?.text || f?.place_name || "",
          category: f?.properties?.category,
          distanceMeters: typeof f?.properties?.distance === "number" ? f.properties.distance : undefined,
        }))
        .filter((poi: any) => poi.name);

      const result: GeoLookupResult = { address, pois };
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.warn("reverse geocode failed", error);
      this.cache.set(cacheKey, fallback);
      return fallback;
    }
  }
}

type ExifParseOptions = {
  filename?: string;
};

type ServiceOptions = {
  fetchImpl?: FetchLike;
  mapboxToken?: string;
  ttlMs?: number;
};

export class ExifGeoContextService {
  private readonly geoClient: GeoClient;
  constructor(private readonly options: ServiceOptions = {}) {
    this.geoClient = new GeoClient(options.mapboxToken, options.fetchImpl, options.ttlMs);
  }

  async extractFromBuffer(buffer: ArrayBuffer | Buffer | Uint8Array, options: ExifParseOptions = {}): Promise<ParseResult> {
    const exifrModule: any = await import("exifr");
    const candidate = exifrModule?.default ?? exifrModule;
    const parseFn = typeof candidate === "function" ? candidate : candidate?.parse;
    if (typeof parseFn !== "function") {
      throw new Error("exifr.parse is not available");
    }
    const parsed = await parseFn(buffer, { tiff: true, ifd0: true, exif: true, gps: true, iptc: true });
    const exifPayload = this.buildExifPayload(parsed, options);
    const iptcPayload = this.buildIptcPayload(parsed?.iptc);

    let metadata = mergeExifAndIptc(exifPayload, iptcPayload);
    if (metadata.gps?.latitude !== undefined && metadata.gps?.longitude !== undefined) {
      const geo = await this.geoClient.reverseGeocode(metadata.gps.latitude, metadata.gps.longitude);
      metadata = {
        ...metadata,
        gps: {
          ...metadata.gps,
          resolvedAddress: geo.address ?? undefined,
          nearbyVenues: geo.pois.length ? geo.pois : [],
        },
      };
    }

    const tags = collectContentTags(metadata);
    return { metadata, tags };
  }

  private buildExifPayload(parsed: any, options: ExifParseOptions): RawExifPayload {
    const gps = this.extractGps(parsed);
    const exposure = this.extractExposure(parsed);
    return {
      filename: options.filename ?? parsed?.Name ?? parsed?.FileName,
      captureDate: this.normalizeDate(parsed?.DateTimeOriginal ?? parsed?.CreateDate),
      cameraMake: parsed?.Make,
      cameraModel: parsed?.Model,
      lensModel: parsed?.LensModel ?? parsed?.LensMake,
      width: parsed?.ImageWidth ?? parsed?.PixelXDimension,
      height: parsed?.ImageHeight ?? parsed?.PixelYDimension,
      gps,
      exposure,
    };
  }

  private buildIptcPayload(iptc: any): RawIptcPayload | undefined {
    if (!iptc) return undefined;
    const keywords = Array.isArray(iptc.Keywords) ? iptc.Keywords : undefined;
    const people = (() => {
      if (Array.isArray(iptc.Byline)) return iptc.Byline;
      if (typeof iptc.Byline === "string") return [iptc.Byline];
      return undefined;
    })();
    const location = iptc.City || iptc.ProvinceState || iptc.CountryName
      ? {
          city: iptc.City,
          state: iptc.ProvinceState,
          country: iptc.CountryName,
        }
      : undefined;

    return {
      title: iptc.ObjectName ?? iptc.Title ?? iptc.Headline,
      description: iptc.Caption ?? iptc.CaptionAbstract ?? iptc.Description,
      keywords,
      people,
      clientName: iptc.Credit,
      eventName: iptc.Event ?? iptc.Scene,
      location,
    };
  }

  private normalizeDate(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return undefined;
  }

  private extractGps(parsed: any): RawExifPayload["gps"] {
    if (!parsed) return undefined;
    const latitude = parsed.latitude ?? parsed.lat ?? parsed.GPSLatitude;
    const longitude = parsed.longitude ?? parsed.lon ?? parsed.GPSLongitude;
    if (typeof latitude === "number" && typeof longitude === "number") {
      return {
        latitude,
        longitude,
        nearbyVenues: [],
        altitude: typeof parsed.altitude === "number" ? parsed.altitude : undefined,
      };
    }
    return undefined;
  }

  private extractExposure(parsed: any): RawExifPayload["exposure"] {
    if (!parsed) return undefined;
    const shutterSpeed = parsed.ExposureTime ? `1/${Math.round(1 / parsed.ExposureTime)}` : parsed.ShutterSpeedValue;
    const aperture = parsed.FNumber ? `f/${parsed.FNumber}` : parsed.ApertureValue;
    const iso = parsed.ISO ?? parsed.ISOValue;
    const focalLength = parsed.FocalLength ? `${parsed.FocalLength}mm` : undefined;
    return {
      shutterSpeed: shutterSpeed ? String(shutterSpeed) : undefined,
      aperture: aperture ? String(aperture) : undefined,
      iso: typeof iso === "number" ? iso : undefined,
      focalLength,
      exposureCompensation: parsed.ExposureCompensation ? String(parsed.ExposureCompensation) : undefined,
    };
  }
}

export type { GeoLookupResult, NearbyVenue, ParseResult };
