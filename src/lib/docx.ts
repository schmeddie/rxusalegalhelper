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

/**
 * Format exhibits into the evidence block text matching the document format:
 *
 * EVIDENCE
 *
 * EXHIBIT 1 — Exhibit A (Media Type)
 * Description: ...
 * Link/document filed: ...
 */
function formatEvidenceBlock(exhibits: Exhibit[]): string {
  if (exhibits.length === 0) return "";

  const lines: string[] = ["EVIDENCE", ""];

  for (const exhibit of exhibits) {
    // EXHIBIT 1 — Exhibit A (Video Recording)
    lines.push(
      `EXHIBIT ${exhibit.exhibitNumber} — Exhibit ${exhibit.exhibitLetter} (${exhibit.name})`
    );
    lines.push("");

    // Description
    lines.push(`Description: ${exhibit.description}`);
    lines.push("");

    // Link/source
    if (exhibit.source) {
      if (exhibit.mediaType === "link") {
        lines.push(`Link/document filed:`);
        lines.push(exhibit.source);
      } else if (exhibit.mediaType === "image") {
        lines.push(`Image filed: ${exhibit.source}`);
      } else {
        lines.push(`Source: ${exhibit.source}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
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

  const out = doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileName = `${caseData.caseName.replace(/\s+/g, "_")}_document.docx`;
  saveAs(out, fileName);
}
