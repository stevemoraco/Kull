import { describe, it, expect } from "vitest";
import { buildXmpFragment } from "../utils/xmp";

describe("XMP builder", () => {
  it("builds structured XMP with rating, label, text, and tags", () => {
    const frag = buildXmpFragment({
      imageId: "uuid",
      starRating: 5 as any,
      colorLabel: "blue" as any,
      title: "Hero Shot",
      description: "Great composition",
      tags: ["hero", "marketing"],
    });
    expect(frag.xml).toContain('xmp:Rating="5"');
    expect(frag.xml).toContain('xmp:Label="Blue"');
    expect(frag.xml).toContain("<dc:title>");
    expect(frag.xml).toContain("<rdf:Alt>");
    expect(frag.xml).toContain("<rdf:Bag>");
    expect(frag.xml).toMatch(/<rdf:li>\s*hero\s*<\/rdf:li>/);
  });

  it("deduplicates tags and removes fields when empty", () => {
    const existing = buildXmpFragment({
      imageId: "uuid",
      starRating: 3 as any,
      title: "Original",
      tags: ["hero", "hero", "Marketing "],
    }).xml;
    const frag = buildXmpFragment({
      imageId: "uuid",
      starRating: undefined,
      colorLabel: "none" as any,
      title: "",
      description: undefined,
      tags: [],
    }, existing);

    expect(frag.xml).not.toContain('xmp:Rating=');
    expect(frag.xml).not.toContain("dc:subject");
    expect(frag.xml).not.toContain("dc:title");
  });
});
