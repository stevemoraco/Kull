
import exifr from 'exifr';
import type { ImageMetadata } from '../culling';

export type RawExifPayload = Partial<ImageMetadata> & {
  buffer?: ArrayBuffer | Buffer | Uint8Array;
  id?: string;
  filename?: string;
  relativePath?: string;
  fileHash?: string;
  byteSize?: number;
  width?: number;
  height?: number;
};

export type RawIptcPayload = {
  title?: string;
  description?: string;
  keywords?: string[];
  people?: string[];
  clientName?: string;
  eventName?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
};

export interface ExifParser {
  parse: (input: ArrayBuffer | Buffer | Uint8Array) => Promise<ImageMetadata>;
}

/**
 * EXIF data extraction from RAW and JPEG images using exifr.
 * Supports all major formats: CR3, NEF, ARW, ORF, RAF, DNG, JPEG, etc.
 */

/**
 * Extract EXIF metadata from image file path or buffer
 */
export async function extractExif(input: string | Buffer | ArrayBuffer | Uint8Array): Promise<RawExifPayload> {
  try {
    // exifr can handle JPEG, CR3, NEF, ARW, ORF, RAF, DNG, etc.
    const exif = await exifr.parse(input, {
      // Extract standard EXIF tags
      tiff: true,
      exif: true,
      gps: true,
      iptc: true,  // Include IPTC for keywords, people, etc.

      // Extract maker notes (camera-specific data)
      xmp: false,   // Skip XMP for performance
      icc: false,   // Color profiles not needed

      // Specific fields we want
      pick: [
        'Make', 'Model',
        'LensModel', 'Lens',
        'ISO', 'FNumber', 'ExposureTime', 'FocalLength', 'ExposureCompensation',
        'DateTimeOriginal', 'CreateDate',
        'GPSLatitude', 'GPSLongitude', 'GPSAltitude',
        'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight',
        'Orientation',
        // IPTC fields
        'Keywords', 'PersonInImage', 'Title', 'Caption-Abstract', 'City', 'Province-State', 'Country-PrimaryLocationName'
      ]
    });

    if (!exif) {
      return {};  // No EXIF data found
    }

    // Convert to our RawExifPayload format
    const result: RawExifPayload = {
      cameraMake: exif.Make,
      cameraModel: exif.Model,
      lensModel: exif.Lens || exif.LensModel,
      width: exif.ImageWidth || exif.ExifImageWidth,
      height: exif.ImageHeight || exif.ExifImageHeight,
    };

    // Handle capture date
    if (exif.DateTimeOriginal || exif.CreateDate) {
      const dateValue = exif.DateTimeOriginal || exif.CreateDate;
      result.captureDate = dateValue instanceof Date ? dateValue.toISOString() : new Date(dateValue).toISOString();
    }

    // Handle exposure settings
    if (exif.ISO || exif.FNumber || exif.ExposureTime || exif.FocalLength) {
      result.exposure = {
        iso: exif.ISO,
        aperture: exif.FNumber ? formatAperture(exif.FNumber) : undefined,
        shutterSpeed: exif.ExposureTime ? formatExposureTime(exif.ExposureTime) : undefined,
        focalLength: exif.FocalLength ? `${Math.round(exif.FocalLength)}mm` : undefined,
        exposureCompensation: exif.ExposureCompensation ? `${exif.ExposureCompensation > 0 ? '+' : ''}${exif.ExposureCompensation}EV` : undefined,
      };
    }

    // Handle GPS coordinates
    if (exif.GPSLatitude !== undefined && exif.GPSLongitude !== undefined) {
      result.gps = {
        latitude: exif.GPSLatitude,
        longitude: exif.GPSLongitude,
        altitude: exif.GPSAltitude,
        nearbyVenues: [] // Empty array by default, can be enriched later by ExifGeoContextService
      };
    }

    // Handle IPTC data
    if (exif.Keywords || exif.PersonInImage || exif.Title || exif['Caption-Abstract'] || exif.City || exif['Province-State'] || exif['Country-PrimaryLocationName']) {
      const keywords = exif.Keywords ? (Array.isArray(exif.Keywords) ? exif.Keywords : [exif.Keywords]) : [];
      const people = exif.PersonInImage ? (Array.isArray(exif.PersonInImage) ? exif.PersonInImage : [exif.PersonInImage]) : [];

      result.iptc = {
        keywords: keywords.length > 0 ? normalizeKeywords(keywords) : undefined,
        people: people.length > 0 ? normalizeKeywords(people) : undefined,
        title: exif.Title,
        description: exif['Caption-Abstract'],
        location: (exif.City || exif['Province-State'] || exif['Country-PrimaryLocationName']) ? {
          city: exif.City,
          state: exif['Province-State'],
          country: exif['Country-PrimaryLocationName']
        } : undefined
      };
    }

    return result;
  } catch (error) {
    console.error('EXIF extraction error:', error);
    return {};  // Return empty object on error (graceful degradation)
  }
}

/**
 * Format exposure time from seconds to human-readable string
 * @example formatExposureTime(0.0025) => "1/400"
 * @example formatExposureTime(2.5) => "2.5s"
 */
export function formatExposureTime(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds}s`;
  }
  return `1/${Math.round(1 / seconds)}`;
}

/**
 * Format aperture value
 * @example formatAperture(2.8) => "f/2.8"
 */
export function formatAperture(fNumber: number): string {
  return `f/${fNumber.toFixed(1)}`;
}

/**
 * Create EXIF parser instance (for backwards compatibility)
 */
export const createNullExifParser = (): ExifParser => ({
  async parse(input: ArrayBuffer | Buffer | Uint8Array) {
    const exifData = await extractExif(input);
    return buildMetadataFromExif(exifData);
  },
});

export const buildMetadataFromExif = (
  exif: RawExifPayload,
): ImageMetadata => {
  return {
    id: exif.id ?? crypto.randomUUID(),
    filename: exif.filename ?? "unknown",
    relativePath: exif.relativePath ?? exif.filename ?? "unknown",
    fileHash: exif.fileHash ?? "",
    byteSize: exif.byteSize ?? 0,
    captureDate: exif.captureDate ?? new Date().toISOString(),
    cameraMake: exif.cameraMake,
    cameraModel: exif.cameraModel,
    lensModel: exif.lensModel,
    exposure: exif.exposure,
    gps: exif.gps,
    width: exif.width ?? 0,
    height: exif.height ?? 0,
    iptc: exif.iptc,
  };
};

export const buildIptcMetadata = (
  iptc: RawIptcPayload = {},
): NonNullable<ImageMetadata["iptc"]> => ({
  title: iptc.title,
  description: iptc.description,
  keywords: iptc.keywords ? normalizeKeywords(iptc.keywords) : undefined,
  people: iptc.people ? normalizeKeywords(iptc.people) : undefined,
  clientName: iptc.clientName,
  eventName: iptc.eventName,
  location: iptc.location,
});

const normalizeKeywords = (values: string[]): string[] => {
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    seen.add(trimmed);
  }
  return Array.from(seen);
};

export const mergeExifAndIptc = (
  exif: RawExifPayload,
  iptc?: RawIptcPayload,
): ImageMetadata => {
  const base = buildMetadataFromExif(exif);
  if (!iptc) return base;
  const merged = buildIptcMetadata(iptc);
  base.iptc = {
    ...base.iptc,
    ...merged,
    keywords: merged.keywords ?? base.iptc?.keywords,
    people: merged.people ?? base.iptc?.people,
  };
  return base;
};

export const collectContentTags = (metadata: ImageMetadata): string[] => {
  const tags = new Set<string>();
  const iptc = metadata.iptc;
  if (iptc?.keywords) iptc.keywords.forEach((keyword) => tags.add(keyword));
  if (iptc?.people) iptc.people.forEach((person) => tags.add(person));
  if (iptc?.eventName) tags.add(iptc.eventName);
  if (iptc?.clientName) tags.add(iptc.clientName);
  if (metadata.gps?.resolvedAddress)
    tags.add(metadata.gps.resolvedAddress);
  return Array.from(tags);
};
