
import { ImageMetadata } from "../culling";

export type RawExifPayload = Partial<ImageMetadata> & {
  buffer?: ArrayBuffer | Buffer | Uint8Array;
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
 * Placeholder EXIF parser interface. Real implementation will wire exifr/libraw.
 */
export const createNullExifParser = (): ExifParser => ({
  async parse() {
    throw new Error("EXIF parser not configured");
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
