import { ImageMetadata } from "../culling";

export type RawExifPayload = Partial<ImageMetadata> & {
  buffer?: ArrayBuffer;
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
  };
};
