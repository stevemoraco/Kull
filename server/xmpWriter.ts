import fs from "fs/promises";
import path from "path";
import { buildXmpFragment } from "@shared/utils/xmp";

export type SidecarUpdate = {
  imageId: string; // used as filename when filename unknown
  filename?: string; // original filename such as LNDR9447.CR3
  starRating?: number;
  colorLabel?: string;
  title?: string;
  description?: string;
  tags?: string[];
};

export async function writeSidecars(baseDir: string, updates: SidecarUpdate[]) {
  const results: { filename: string; xmpPath: string }[] = [];
  for (const u of updates) {
    const name = u.filename ?? u.imageId;
    const rawPath = path.join(baseDir, name);
    const xmpPath = rawPath.replace(/\.[^.]+$/, ".xmp");
    const frag = buildXmpFragment({
      imageId: u.imageId,
      starRating: u.starRating as any,
      colorLabel: (u.colorLabel as any) ?? "none",
      title: u.title,
      description: u.description,
      tags: u.tags,
    });
    await fs.writeFile(xmpPath, frag.xml, { encoding: "utf8" });
    results.push({ filename: name, xmpPath });
  }
  return results;
}

