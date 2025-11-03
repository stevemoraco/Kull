import { MetadataUpdate } from "../culling";

export interface XmpFragment {
  path: string;
  xml: string;
}

export const buildXmpFragment = (
  update: MetadataUpdate,
  existingXml = "",
): XmpFragment => {
  const rating = update.starRating ?? 0;
  const color =
    update.colorLabel && update.colorLabel !== "none"
      ? update.colorLabel
      : undefined;

  const title = update.title ? `<dc:title>${escapeXml(update.title)}</dc:title>` : "";
  const description = update.description
    ? `<dc:description>${escapeXml(update.description)}</dc:description>`
    : "";
  const keywords = update.tags?.length
    ? `<dc:subject>${update.tags
        .map((tag) => `<rdf:li>${escapeXml(tag)}</rdf:li>`)
        .join("")}</dc:subject>`
    : "";

  const xml = `
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmp:Rating="${rating}"
      ${color ? `photoshop:ColorLabels="${color}"` : ""}
    >
      ${title}
      ${description}
      ${keywords}
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
`.trim();

  return {
    path: update.imageId,
    xml: existingXml && existingXml.length > 0 ? mergeXml(existingXml, xml) : xml,
  };
};

const escapeXml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const mergeXml = (existing: string, incoming: string) => {
  // placeholder merge strategy until full XML DOM merge implemented
  return incoming.length >= existing.length ? incoming : existing;
};
