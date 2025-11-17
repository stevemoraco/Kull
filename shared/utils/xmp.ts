import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { MetadataUpdate } from "../culling";

export interface XmpFragment {
  path: string;
  xml: string;
}

const NS = {
  x: "adobe:ns:meta/",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xmp: "http://ns.adobe.com/xap/1.0/",
  dc: "http://purl.org/dc/elements/1.1/",
  photoshop: "http://ns.adobe.com/photoshop/1.0/",
  xml: "http://www.w3.org/XML/1998/namespace",
};

const EMPTY_TEMPLATE = `
<x:xmpmeta xmlns:x="${NS.x}">
  <rdf:RDF xmlns:rdf="${NS.rdf}">
    <rdf:Description rdf:about=""
      xmlns:xmp="${NS.xmp}"
      xmlns:dc="${NS.dc}"
      xmlns:photoshop="${NS.photoshop}"
    />
  </rdf:RDF>
</x:xmpmeta>
`.trim();

const parser = new DOMParser();
const serializer = new XMLSerializer();

export const buildXmpFragment = (
  update: MetadataUpdate,
  existingXml = "",
): XmpFragment => {
  const doc = parseDocument(existingXml);
  const description = ensureDescription(doc);

  applyRating(description, update.starRating);
  applyColorLabel(description, update.colorLabel);
  applyAltText(doc, description, "dc:title", update.title);
  applyAltText(doc, description, "dc:description", update.description);
  applyKeywords(doc, description, update.tags);

  const xml = formatXml(serializer.serializeToString(doc));
  return {
    path: update.imageId,
    xml,
  };
};

const parseDocument = (xml: string) => {
  const source = xml && xml.trim().length ? xml : EMPTY_TEMPLATE;
  try {
    return parser.parseFromString(source, "application/xml");
  } catch {
    return parser.parseFromString(EMPTY_TEMPLATE, "application/xml");
  }
};

const ensureDescription = (doc: Document): Element => {
  const root = doc.documentElement ?? doc.appendChild(doc.createElementNS(NS.x, "x:xmpmeta")) as Element;
  if (!root.getAttribute("xmlns:x")) {
    root.setAttribute("xmlns:x", NS.x);
  }

  let rdf = findDirectChild(root, "rdf:RDF");
  if (!rdf) {
    rdf = doc.createElementNS(NS.rdf, "rdf:RDF");
    root.appendChild(rdf);
  }
  if (!rdf.getAttribute("xmlns:rdf")) {
    rdf.setAttribute("xmlns:rdf", NS.rdf);
  }

  let description = findDirectChild(rdf, "rdf:Description");
  if (!description) {
    description = doc.createElementNS(NS.rdf, "rdf:Description");
    description.setAttribute("rdf:about", "");
    rdf.appendChild(description);
  }

  ensureNamespace(description, "xmlns:xmp", NS.xmp);
  ensureNamespace(description, "xmlns:dc", NS.dc);
  ensureNamespace(description, "xmlns:photoshop", NS.photoshop);
  if (!description.getAttribute("rdf:about")) {
    description.setAttribute("rdf:about", "");
  }

  return description;
};

const ensureNamespace = (element: Element, attribute: string, value: string) => {
  if (!element.getAttribute(attribute)) {
    element.setAttribute(attribute, value);
  }
};

const findDirectChild = (parent: Element, name: string): Element | undefined => {
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && (node as Element).nodeName === name) {
      return node as Element;
    }
  }
  return undefined;
};

const removeChildIfExists = (parent: Element, name: string) => {
  const child = findDirectChild(parent, name);
  if (child) parent.removeChild(child);
};

const applyRating = (description: Element, rating?: number) => {
  if (rating === undefined || rating === null) {
    description.removeAttributeNS(NS.xmp, "Rating");
    description.removeAttribute("xmp:Rating");
    return;
  }
  description.setAttributeNS(NS.xmp, "xmp:Rating", String(rating));
};

const COLOR_LABELS = new Map<string, string>([
  ["red", "Red"],
  ["yellow", "Yellow"],
  ["green", "Green"],
  ["blue", "Blue"],
  ["purple", "Purple"],
  ["white", "White"],
  ["black", "Black"],
]);

const applyColorLabel = (description: Element, colorLabel?: string) => {
  if (!colorLabel || colorLabel === "none") {
    description.removeAttributeNS(NS.xmp, "Label");
    description.removeAttribute("xmp:Label");
    return;
  }
  const normalized =
    COLOR_LABELS.get(colorLabel.toLowerCase()) ?? colorLabel;
  description.setAttributeNS(NS.xmp, "xmp:Label", normalized);
};

const applyAltText = (
  doc: Document,
  description: Element,
  qualifiedName: string,
  value?: string,
) => {
  const existing = findDirectChild(description, qualifiedName);
  if (!value || !value.trim()) {
    if (existing) description.removeChild(existing);
    return;
  }

  const element = existing ?? doc.createElementNS(
    qualifiedName.startsWith("dc:") ? NS.dc : NS.xmp,
    qualifiedName,
  );
  if (!existing) description.appendChild(element);

  let alt = findDirectChild(element, "rdf:Alt");
  if (!alt) {
    alt = doc.createElementNS(NS.rdf, "rdf:Alt");
    element.appendChild(alt);
  }

  let li = findLiWithLang(alt, "x-default");
  if (!li) {
    li = doc.createElementNS(NS.rdf, "rdf:li");
    li.setAttributeNS(NS.xml, "xml:lang", "x-default");
    alt.appendChild(li);
  }

  setTextContent(doc, li, value.trim());
};

const findLiWithLang = (parent: Element, lang: string): Element | undefined => {
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (el.nodeName === "rdf:li" && el.getAttribute("xml:lang") === lang) {
      return el;
    }
  }
  return undefined;
};

const setTextContent = (doc: Document, element: Element, value: string) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  element.appendChild(doc.createTextNode(value));
};

const applyKeywords = (
  doc: Document,
  description: Element,
  tags?: string[],
) => {
  const keywords = normaliseTags(tags);
  if (!keywords.length) {
    removeChildIfExists(description, "dc:subject");
    return;
  }

  let subject = findDirectChild(description, "dc:subject");
  if (!subject) {
    subject = doc.createElementNS(NS.dc, "dc:subject");
    description.appendChild(subject);
  }

  let bag = findDirectChild(subject, "rdf:Bag");
  if (!bag) {
    bag = doc.createElementNS(NS.rdf, "rdf:Bag");
    subject.appendChild(bag);
  }

  while (bag.firstChild) {
    bag.removeChild(bag.firstChild);
  }

  keywords.forEach((keyword) => {
    const li = doc.createElementNS(NS.rdf, "rdf:li");
    li.appendChild(doc.createTextNode(keyword));
    bag.appendChild(li);
  });
};

const normaliseTags = (tags?: string[]): string[] => {
  if (!tags?.length) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
};

const formatXml = (xml: string): string => {
  const singleLine = xml.replace(/>\s+</g, "><").trim();
  const tokens = singleLine.split(/(?=<)/g).map((token) => token.trim()).filter(Boolean);
  const lines: string[] = [];
  let depth = 0;

  tokens.forEach((token) => {
    const isClosing = token.startsWith("</");
    const isSelfClosing = token.endsWith("/>");
    const isOpening = token.startsWith("<") && !isClosing && !isSelfClosing && !token.includes("</");
    const isCombined = token.startsWith("<") && token.includes("</");

    if (isClosing && depth > 0) depth -= 1;
    const indent = "  ".repeat(depth);
    lines.push(`${indent}${token}`);
    if ((isOpening || isCombined) && !isClosing && !isSelfClosing) {
      depth += 1;
    }
    if (isCombined && depth > 0) {
      depth -= 1;
    }
  });

  return lines.join("\n");
};
