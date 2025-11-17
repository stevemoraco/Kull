import { describe, expect, it } from "vitest";
import {
  buildMetadataFromExif,
  buildIptcMetadata,
  collectContentTags,
  mergeExifAndIptc,
  RawExifPayload,
} from "../utils/exif";

const sampleExif: RawExifPayload = {
  id: "00000000-0000-0000-0000-000000000001",
  filename: "IMG_0001.CR3",
  relativePath: "2025/IMG_0001.CR3",
  fileHash: "abc123",
  byteSize: 1024,
  captureDate: "2025-10-15T12:00:00.000Z",
  width: 4000,
  height: 3000,
};

describe("EXIF helpers", () => {
  it("builds metadata with sensible fallbacks", () => {
    const metadata = buildMetadataFromExif(sampleExif);
    expect(metadata.filename).toBe("IMG_0001.CR3");
    expect(metadata.iptc).toBeUndefined();
  });

  it("merges IPTC fields and deduplicates keywords", () => {
    const merged = mergeExifAndIptc(sampleExif, {
      title: "Hero",
      description: "Evening rooftop portrait",
      keywords: ["hero", "portrait", "hero"],
      people: ["Alex", "Pat"],
    });

    expect(merged.iptc?.title).toBe("Hero");
    expect(merged.iptc?.keywords).toEqual(["hero", "portrait"]);
    expect(merged.iptc?.people).toEqual(["Alex", "Pat"]);
  });

  it("collects tags from IPTC and GPS when available", () => {
    const merged = mergeExifAndIptc(
      {
        ...sampleExif,
        gps: { latitude: 1, longitude: 1, resolvedAddress: "Denver" },
      },
      { keywords: ["wedding"], eventName: "Fall Gala" },
    );

    const tags = collectContentTags(merged);
    expect(tags).toEqual(["wedding", "Fall Gala", "Denver"]);
  });

  it("builds IPTC payload with normalized keywords", () => {
    const iptc = buildIptcMetadata({ keywords: ["Hero", " hero ", "HQ"] });
    expect(iptc.keywords).toEqual(["Hero", "hero", "HQ"]);
  });
});
