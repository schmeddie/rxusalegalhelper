import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import type { Case, PlaceholderMapping, CaseVariable, Exhibit } from "./types";

/**
 * Parse a .docx file and extract placeholders matching the pattern {PLACEHOLDER}
 */
export function extractPlaceholders(fileData: ArrayBuffer): string[] {
  const zip = new PizZip(fileData);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  const text = doc.getFullText();
  const regex = /\{([^}]+)\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

// Unique marker prefix for image placeholders that we'll post-process
const IMG_MARKER_PREFIX = "%%IMG_EXHIBIT_";

/**
 * Format exhibits into the evidence block text.
 * For image exhibits, inserts a special marker that gets post-processed
 * into an actual embedded image.
 */
function formatEvidenceBlock(exhibits: Exhibit[]): string {
  if (exhibits.length === 0) return "";

  const lines: string[] = ["EVIDENCE", ""];

  for (const exhibit of exhibits) {
    lines.push(
      `EXHIBIT ${exhibit.exhibitNumber} \u2014 Exhibit ${exhibit.exhibitLetter} (${exhibit.name})`
    );
    lines.push("");

    lines.push(`Description: ${exhibit.description}`);
    lines.push("");

    if (exhibit.mediaType === "image" && exhibit.imageData) {
      // Insert a marker that we'll replace with an actual image in post-processing
      lines.push(`${IMG_MARKER_PREFIX}${exhibit.exhibitNumber}%%`);
    } else if (exhibit.source) {
      if (exhibit.mediaType === "link") {
        lines.push(`Link/document filed:`);
        lines.push(exhibit.source);
      } else {
        lines.push(`Source: ${exhibit.source}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Convert a base64 data URL to raw binary bytes
 */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { bytes: new Uint8Array(), mime: "image/png" };

  const mime = match[1];
  const raw = atob(match[2]);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return { bytes, mime };
}

function mimeToExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  return "jpeg";
}

/**
 * Post-process the docx zip to replace image markers with actual embedded images.
 *
 * .docx is a zip containing XML. To embed an image:
 * 1. Add the image binary to word/media/
 * 2. Add a relationship in word/_rels/document.xml.rels
 * 3. Replace the marker text in word/document.xml with DrawingML XML
 */
function embedImages(zip: PizZip, exhibits: Exhibit[]): void {
  const imageExhibits = exhibits.filter(
    (e) => e.mediaType === "image" && e.imageData
  );
  if (imageExhibits.length === 0) return;

  // Read the rels file to find the next available rId
  const relsPath = "word/_rels/document.xml.rels";
  let relsXml = zip.file(relsPath)?.asText() || "";

  // Find highest existing rId
  const rIdMatches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
  let nextRId = 1;
  for (const m of rIdMatches) {
    const n = parseInt(m[1], 10);
    if (n >= nextRId) nextRId = n + 1;
  }

  // Read document.xml
  const docPath = "word/document.xml";
  let docXml = zip.file(docPath)?.asText() || "";

  for (const exhibit of imageExhibits) {
    const marker = `${IMG_MARKER_PREFIX}${exhibit.exhibitNumber}%%`;

    // Check if the marker exists in the document
    if (!docXml.includes(marker)) continue;

    const { bytes, mime } = dataUrlToBytes(exhibit.imageData!);
    if (bytes.length === 0) continue;

    const ext = mimeToExt(mime);
    const imageName = `exhibit_${exhibit.exhibitNumber}.${ext}`;
    const rId = `rId${nextRId++}`;

    // 1. Add image to word/media/
    zip.file(`word/media/${imageName}`, bytes);

    // 2. Add relationship
    relsXml = relsXml.replace(
      "</Relationships>",
      `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageName}"/></Relationships>`
    );

    // 3. Replace marker in document.xml with an inline drawing
    // Image size: 4 inches wide max (3657600 EMU), height proportional
    // We'll use a reasonable default of 4" x 3" (can be resized in Word)
    const cx = 3657600; // 4 inches in EMU
    const cy = 2743200; // 3 inches in EMU

    const drawingXml =
      `<w:drawing>` +
      `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:docPr id="${exhibit.exhibitNumber}" name="Exhibit ${exhibit.exhibitLetter}"/>` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
      `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:nvPicPr>` +
      `<pic:cNvPr id="${exhibit.exhibitNumber}" name="${imageName}"/>` +
      `<pic:cNvPicPr/>` +
      `</pic:nvPicPr>` +
      `<pic:blipFill>` +
      `<a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
      `<a:stretch><a:fillRect/></a:stretch>` +
      `</pic:blipFill>` +
      `<pic:spPr>` +
      `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
      `</pic:spPr>` +
      `</pic:pic>` +
      `</a:graphicData>` +
      `</a:graphic>` +
      `</wp:inline>` +
      `</w:drawing>`;

    // The marker will be inside a <w:t> tag. We need to replace it with a drawing
    // which must be inside a <w:r> (run), not inside <w:t>
    // Strategy: find the <w:r>...<w:t>...MARKER...</w:t>...</w:r> and replace the whole run
    const markerEscaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const runPattern = new RegExp(
      `<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?\\s*<w:t[^>]*>[^<]*${markerEscaped}[^<]*</w:t>\\s*</w:r>`,
      "s"
    );

    const runMatch = docXml.match(runPattern);
    if (runMatch) {
      // Replace the entire run containing the marker with a run containing the drawing
      docXml = docXml.replace(runMatch[0], `<w:r>${drawingXml}</w:r>`);
    } else {
      // Fallback: simple text replacement (marker might be split across runs)
      // Replace just the text, wrapping drawing properly
      docXml = docXml.replace(marker, `</w:t></w:r><w:r>${drawingXml}</w:r><w:r><w:t>`);
    }
  }

  // Write back modified files
  zip.file(relsPath, relsXml);
  zip.file(docPath, docXml);
}

/**
 * Generate a filled .docx from a template and case data
 */
export function generateDocument(
  fileData: ArrayBuffer,
  caseData: Case,
  mappings: PlaceholderMapping[],
  exhibits: Exhibit[] = []
): void {
  const zip = new PizZip(fileData);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });

  const data: Record<string, string> = {};
  for (const mapping of mappings) {
    const variable = mapping.variable as CaseVariable;
    if (variable === "currentDate") {
      data[mapping.placeholder] = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (variable === "evidence") {
      data[mapping.placeholder] = formatEvidenceBlock(exhibits);
    } else {
      data[mapping.placeholder] = caseData[variable] || "";
    }
  }

  doc.render(data);

  // Post-process: replace image markers with actual embedded images
  const renderedZip = doc.getZip();
  embedImages(renderedZip, exhibits);

  const out = renderedZip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileName = `${caseData.caseName.replace(/\s+/g, "_")}_document.docx`;
  saveAs(out, fileName);
}
