import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, stat, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { writeSidecars } from "../../server/xmpWriter";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "kull-xmp-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("writeSidecars", () => {
  it("creates an XMP sidecar with structured metadata", async () => {
    await writeSidecars(tempDir, [
      {
        imageId: "IMG_0001",
        filename: "IMG_0001.CR3",
        starRating: 5,
        colorLabel: "blue",
        title: "Hero Shot",
        description: "Great composition",
        tags: ["Hero", "Marketing"],
      },
    ]);

    const xmpPath = path.join(tempDir, "IMG_0001.xmp");
    const xml = await readFile(xmpPath, "utf8");
    expect(xml).toContain('xmp:Rating="5"');
    expect(xml).toContain('xmp:Label="Blue"');
    expect(xml).toContain("<dc:title>");
    expect(xml).toContain("<rdf:Bag>");
    expect(xml).toMatch(/<rdf:li>\s*Hero\s*<\/rdf:li>/);
  });

  it("skips rewriting when metadata is unchanged", async () => {
    const updates = [
      {
        imageId: "IMG_0002",
        filename: "IMG_0002.CR3",
        starRating: 4,
        colorLabel: "red",
        title: "Candid Moment",
        description: "Laughing with friends",
        tags: ["Candid", "Event"],
      },
    ];

    await writeSidecars(tempDir, updates);
    const xmpPath = path.join(tempDir, "IMG_0002.xmp");
    const initialStat = await stat(xmpPath);

    // Second write should detect identical payload and skip disk write
    await writeSidecars(tempDir, updates);
    const afterStat = await stat(xmpPath);

    expect(afterStat.mtimeMs).toBe(initialStat.mtimeMs);
  });

  it("merges into existing documents without dropping unrelated nodes", async () => {
    const xmpPath = path.join(tempDir, "IMG_0003.xmp");
    const existing = `
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:lr="http://ns.adobe.com/lightroom/1.0/"
      xmp:Rating="2"
      lr:HierarchicalSubject="People|Alex"
    >
      <dc:subject>
        <rdf:Bag>
          <rdf:li>People</rdf:li>
        </rdf:Bag>
      </dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
    `.trim();
    await writeFile(xmpPath, existing, "utf8");

    await writeSidecars(tempDir, [
      {
        imageId: "IMG_0003",
        filename: "IMG_0003.CR3",
        starRating: 3,
        colorLabel: "green",
        title: "Updated Title",
        tags: ["People", "Portrait"],
      },
    ]);

    const xml = await readFile(xmpPath, "utf8");
    expect(xml).toContain('xmp:Rating="3"');
    expect(xml).toContain('xmp:Label="Green"');
    expect(xml).toContain("Updated Title");
    expect(xml).toMatch(/<rdf:li>\s*Portrait\s*<\/rdf:li>/);
    expect(xml).toContain("lr:HierarchicalSubject");
  });
});
