/**
 * Renders a PO document model (see po-document.js) to PDF bytes.
 *
 * Uses pdf-lib with the built-in Helvetica faces: pure JavaScript and no font
 * files, so it runs on Oxygen's Workers runtime as well as in Node tests.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { wrapText } from "./po-document.js";

const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const LABEL_WIDTH = 120;
const INK = rgb(0.196, 0.212, 0.251); // #323640
const MUTED = rgb(0.4, 0.42, 0.46);
const RULE = rgb(0.82, 0.83, 0.85);
const ALERT = rgb(0.827, 0.314, 0.333); // #D35055

/** Standard fonts only encode WinAnsi; swap anything else for "?". */
function makeSafe(font) {
  const supported = new Set(font.getCharacterSet());
  return (text) => {
    let out = "";
    for (const char of String(text ?? "").replace(/[\r\t]/g, " ")) {
      if (char === "\n" || supported.has(char.codePointAt(0))) {
        out += char;
      } else {
        out += "?";
      }
    }
    return out;
  };
}

/**
 * @param {ReturnType<typeof import("./po-document.js").buildPoDocument>} doc
 * @returns {Promise<Uint8Array>}
 */
export async function renderPoPdf(doc) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.number} - ${doc.company}`);
  pdf.setAuthor(doc.company);
  pdf.setCreator(doc.company);
  pdf.setProducer(doc.company);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe = makeSafe(regular);

  const pages = [];
  let page;
  let y;

  const newPage = () => {
    page = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(page);
    y = PAGE.height - MARGIN;
    if (doc.draft) {
      page.drawText("DRAFT - NOT APPROVED - DO NOT BUILD", {
        x: MARGIN,
        y: PAGE.height - 30,
        size: 10,
        font: bold,
        color: ALERT,
      });
    }
  };
  const ensure = (height) => {
    if (y - height < MARGIN + 24) {
      newPage();
    }
  };
  const text = (
    value,
    { x = MARGIN, size = 10, font = regular, color = INK } = {},
  ) => {
    page.drawText(safe(value), { x, y, size, font, color });
  };
  const rule = () => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE.width - MARGIN, y },
      thickness: 0.5,
      color: RULE,
    });
  };
  const measure = (size, font) => (value) =>
    font.widthOfTextAtSize(safe(value), size);

  // Label / value row; the value wraps beside the label.
  const row = (label, value) => {
    const size = 10;
    const lines = wrapText(
      safe(value),
      CONTENT_WIDTH - LABEL_WIDTH,
      measure(size, regular),
    );
    ensure(lines.length * 14 + 2);
    text(label, { size, font: bold, color: MUTED });
    for (const line of lines) {
      text(line, { x: MARGIN + LABEL_WIDTH, size });
      y -= 14;
    }
  };

  const heading = (value) => {
    ensure(40);
    y -= 10;
    text(value, { size: 12, font: bold });
    y -= 6;
    rule();
    y -= 16;
  };

  newPage();

  // Header
  text(doc.company, { size: 20, font: bold });
  const title = "PURCHASE ORDER";
  page.drawText(title, {
    x: PAGE.width - MARGIN - bold.widthOfTextAtSize(title, 14),
    y,
    size: 14,
    font: bold,
    color: INK,
  });
  y -= 22;
  rule();
  y -= 18;

  row("PO number", doc.number);
  row("Date", doc.issuedAt);
  row("Order", doc.orderName);
  row("To", doc.partner);

  // Pieces
  heading("Pieces to build");
  for (const line of doc.lines) {
    ensure(70);
    const titleLines = wrapText(
      safe(`${line.number}. ${line.quantity} x ${line.product}`),
      CONTENT_WIDTH,
      measure(11, bold),
    );
    for (const titleLine of titleLines) {
      text(titleLine, { size: 11, font: bold });
      y -= 15;
    }
    for (const [label, value] of [
      ["Size", line.size],
      ["Species", line.species],
      ["Leaf", line.leaf],
      ["Finish", line.finish],
      ["Other options", line.other],
      ["Notes", line.notes],
    ]) {
      if (value) {
        row(label, value);
      }
    }
    y -= 8;
  }

  // Delivery
  heading("Delivery and logistics (white glove, in-home assembly)");
  if (doc.delivery) {
    for (const [label, value] of doc.delivery) {
      row(label, value);
    }
  } else {
    row("Status", "Delivery details have not been provided yet.");
  }

  // Footers (after layout, so the page count is known)
  pages.forEach((p, index) => {
    const footer = `${doc.number}  |  Page ${index + 1} of ${pages.length}`;
    p.drawText(safe(footer), {
      x: MARGIN,
      y: MARGIN - 20,
      size: 8,
      font: regular,
      color: MUTED,
    });
  });

  return pdf.save();
}
