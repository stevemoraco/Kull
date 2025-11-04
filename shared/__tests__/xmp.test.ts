import { describe, it, expect } from "vitest";
import { buildXmpFragment } from "../utils/xmp";

describe("XMP builder", () => {
  it("builds xmp with rating, title, description, and tags", () => {
    const frag = buildXmpFragment({
      imageId: "uuid",
      starRating: 5 as any,
      colorLabel: "blue" as any,
      title: "Hero Shot",
      description: "Great composition",
      tags: ["hero", "marketing"],
    });
    expect(frag.xml).toContain("xmp:Rating=\"5\"");
    expect(frag.xml).toContain("<dc:title>");
    expect(frag.xml).toContain("<dc:description>");
    expect(frag.xml).toContain("<dc:subject>");
  });
});

