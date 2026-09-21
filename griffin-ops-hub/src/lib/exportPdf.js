import { expandField, isFilled, visibleSections } from "./schema.js";
import { STAGE_LABEL } from "./stages.js";
import {
  templateById,
  visibleFields,
  WORK_STATUS_LABEL,
} from "./operations.js";

const stringValue = (value) =>
  value == null || value === ""
    ? "Not recorded"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : Array.isArray(value)
        ? value.map(stringValue).join(", ")
        : typeof value === "object"
          ? Object.entries(value)
              .map(([key, item]) => `${key}: ${stringValue(item)}`)
              .join("; ")
          : String(value);
const sourceValue = (source) =>
  typeof source === "string"
    ? source
    : source?.label || source?.name || "Source reference not recorded";
const dateValue = (value) => {
  if (!value) return "Not recorded";
  const time = new Date(value);
  return Number.isFinite(time.getTime())
    ? `${time.toISOString().replace("T", " ").replace(".000Z", " UTC").replace(/Z$/, " UTC")}`
    : String(value);
};
const filename = (text) =>
  String(text || "record")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100) || "record";

// Built-in PDF fonts cover Latin text. Preserve unsupported characters explicitly
// as Unicode code points rather than silently emitting an incorrect glyph.
function printable(value, state) {
  const replacements = {
    "→": " -> ",
    "←": " <- ",
    "–": "-",
    "—": "-",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
    "•": "-",
    "✓": "Recorded",
    "×": "x",
    "≥": ">=",
    "≤": "<=",
    "€": "EUR ",
  };
  return stringValue(value)
    .normalize("NFC")
    .replace(/[^\x20-\x7e\u00a0-\u00ff\r\n\t]/gu, (character) => {
      if (replacements[character]) return replacements[character];
      state.unicodeEscapes = true;
      return `[U+${character.codePointAt(0).toString(16).toUpperCase()}]`;
    })
    .replace(/\t/g, "    ");
}

async function createWriter(title, reference) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  doc.setProperties({
    title,
    subject: "Operational copy for human review",
    author: "Griffin Funding",
    creator: "Griffin Ops Hub",
  });
  const state = { unicodeEscapes: false };
  const width = doc.internal.pageSize.getWidth(),
    height = doc.internal.pageSize.getHeight();
  const margin = 17,
    bottom = 20,
    lineHeight = 4.8,
    labelWidth = 53,
    gutter = 5;
  let y = 0,
    rowIndex = 0;
  const clean = (value) => printable(value, state);
  const header = (continued) => {
    doc.setFillColor(19, 36, 31);
    doc.rect(0, 0, width, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("GRIFFIN FUNDING / OPERATIONS HUB", margin, 9);
    doc.setTextColor(88, 100, 93);
    doc.setFontSize(8);
    doc.text(`OPERATIONAL COPY${continued ? " / CONTINUED" : ""}`, margin, 22);
    doc.setTextColor(23, 38, 31);
    doc.setFontSize(continued ? 13 : 20);
    const heading = doc.splitTextToSize(clean(title), width - margin * 2);
    doc.text(heading, margin, 30);
    y = 31 + heading.length * (continued ? 5 : 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(94, 104, 97);
    const ref = doc.splitTextToSize(clean(reference), width - margin * 2);
    doc.text(ref, margin, y);
    y += ref.length * 4 + 6;
  };
  const nextPage = () => {
    doc.addPage();
    header(true);
  };
  const ensure = (size) => {
    if (y + size > height - bottom) nextPage();
  };
  header(false);
  const paragraph = (text, muted = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(clean(text), width - margin * 2);
    for (const line of lines) {
      ensure(lineHeight);
      doc.setTextColor(...(muted ? [96, 107, 99] : [36, 49, 42]));
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += 3;
  };
  const section = (text) => {
    ensure(20);
    y += 3;
    doc.setFillColor(234, 239, 235);
    doc.rect(margin, y - 4.5, width - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 53, 40);
    doc.text(clean(text), margin + 3, y + 0.5);
    y += 9;
  };
  const row = (label, value) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const contentLines = doc.splitTextToSize(
      clean(value),
      width - margin * 2 - labelWidth - gutter,
    );
    const labelLines = doc.splitTextToSize(clean(label), labelWidth);
    let offset = 0;
    while (offset < contentLines.length) {
      ensure(Math.max(2, labelLines.length) * lineHeight + 4);
      const remaining = Math.max(
        1,
        Math.floor((height - bottom - y - 4) / lineHeight),
      );
      const chunk = contentLines.slice(offset, offset + remaining);
      const labels = offset
        ? [clean(label), "(continued)"].flatMap((line) =>
            doc.splitTextToSize(line, labelWidth),
          )
        : labelLines;
      const blockHeight =
        Math.max(labels.length, chunk.length) * lineHeight + 4;
      if (rowIndex % 2 === 0) {
        doc.setFillColor(248, 250, 248);
        doc.rect(margin, y - 3.5, width - margin * 2, blockHeight, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(91, 102, 95);
      doc.text(labels, margin + 2, y);
      doc.setFontSize(9);
      doc.setTextColor(26, 40, 32);
      doc.text(chunk, margin + labelWidth + gutter, y);
      y += blockHeight;
      doc.setDrawColor(225, 232, 226);
      doc.setLineWidth(0.15);
      doc.line(margin, y - 3.5, width - margin, y - 3.5);
      offset += chunk.length;
      if (offset < contentLines.length) nextPage();
    }
    rowIndex++;
  };
  const finish = () => {
    if (state.unicodeEscapes)
      paragraph(
        "Character note: characters outside the built-in font are preserved as [U+CODE] Unicode code points.",
        true,
      );
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(106, 116, 110);
      doc.setDrawColor(220, 227, 221);
      doc.line(margin, height - 15, width - margin, height - 15);
      doc.text(
        "Operational copy. Not a signed document, disclosure, or credit decision.",
        margin,
        height - 10,
      );
      doc.text(`${page} / ${pages}`, width - margin, height - 10, {
        align: "right",
      });
    }
    return doc;
  };
  return { section, paragraph, row, finish };
}

export async function buildWorksheetPdf(worksheet, schema, context = {}) {
  if (!worksheet?.id || !schema?.sections)
    throw new Error(
      "A saved worksheet and its schema are required for PDF export.",
    );
  const exported = new Date().toISOString();
  const profiles = context.profiles || [];
  const names = {
    ...Object.fromEntries(
      profiles.map((person) => [person.id, person.full_name]),
    ),
    ...context.names,
  };
  const actor = (id) => names[id] || id || "Not recorded";
  const data = worksheet.data || {};
  const ctx = {
    ...context,
    data,
    investor: worksheet.investor_snapshot || context.investor,
    product: worksheet.form_type,
  };
  const loan = context.loan || {};
  const synthetic = worksheet.sample === true || worksheet.synthetic === true;
  const pdf = await createWriter(
    `${schema.product_label || worksheet.form_type} submission worksheet`,
    `${synthetic ? "FICTIONAL DEMONSTRATION | " : ""}Loan ${worksheet.loan_number} | ${data.cln || loan.borrower_last || "Borrower not recorded"}`,
  );
  if (synthetic)
    pdf.paragraph(
      "Fictional demonstration; no actual human review or loan outcome. Seeded verification marks and workflow history are examples only.",
    );
  pdf.paragraph(
    "For operational review. Entered values and recorded verification actions are reproduced from the saved worksheet. Investor references remain subject to source-owner review.",
    true,
  );
  pdf.section("Record and audit status");
  pdf.row("Worksheet ID", worksheet.id);
  pdf.row("Recorded stage", STAGE_LABEL[worksheet.stage] || worksheet.stage);
  pdf.row(
    "Schema version",
    `${worksheet.form_type} v${worksheet.schema_version ?? schema.version ?? "Unknown"} / BASE v${worksheet.base_schema_version ?? schema.base_version ?? "Unknown"}`,
  );
  pdf.row("Saved revision", dateValue(worksheet.updated_at));
  pdf.row("Exported at", dateValue(exported));
  pdf.row(
    "Environment / audit boundary",
    context.mode === "local"
      ? "Local demonstration. Browser storage is editable and is not a protected production audit log."
      : context.mode === "supabase"
        ? "Connected workspace record. This PDF is an unsigned copy of saved data and is not independent evidence of source accuracy."
        : "Source environment not supplied. This PDF is an unsigned operational copy.",
  );
  pdf.row(
    "Loan officer / MLP / Processor",
    `LO: ${actor(loan.lo_id)}\nMLP: ${actor(loan.mlp_id)}\nProcessor: ${actor(loan.processor_id)}`,
  );
  pdf.row(
    "Investor reference",
    `${ctx.investor?.name || data.pr || "Not selected"}\n${ctx.investor?.source_status || "UNVERIFIED_REFERENCE"}`,
  );
  if (context.activity)
    pdf.row(
      "Recorded activity available",
      `${context.activity.transitions?.length || 0} stage transitions; ${context.activity.events?.length || 0} field events. Detailed history remains in the loan audit trail.`,
    );
  for (const section of visibleSections(schema, ctx)) {
    pdf.section(section.title);
    for (const field of section.fields) {
      if (["callout", "note", "scoreSummary"].includes(field.type)) continue;
      if (field.type === "checkgroup") {
        const key = expandField(field)[0].key;
        const values = field.items
          .filter((item) => data[item.key])
          .map((item) => item.label);
        const verified = worksheet.verified?.[key];
        pdf.row(
          field.label,
          `${values.join(", ") || "Not recorded"}${verified ? `\nVerification recorded by ${actor(verified.by)} at ${dateValue(verified.at)}.` : ""}`,
        );
        continue;
      }
      for (const leaf of expandField(field)) {
        const verified = worksheet.verified?.[leaf.key];
        const value =
          leaf.key === "pr"
            ? ctx.investor?.name || data[leaf.key]
            : data[leaf.key];
        pdf.row(
          leaf.label || leaf.key,
          `${isFilled(leaf, data) ? stringValue(value) : "Not recorded"}${verified ? `\nVerification recorded by ${actor(verified.by)} at ${dateValue(verified.at)}.` : ""}`,
        );
      }
    }
  }
  pdf.section("Outcome evidence boundary");
  pdf.paragraph(
    "LIA usage and result links are LO declarations. No LOS Connector funding evidence is included in this export. Worksheet completion is not loan funding and does not prove labor savings or application-to-funding improvement.",
  );
  return pdf.finish();
}

export async function downloadWorksheetPdf(worksheet, schema, context = {}) {
  const doc = await buildWorksheetPdf(worksheet, schema, context);
  doc.save(
    `${filename(worksheet.loan_number)}-${filename(worksheet.form_type)}-operational-copy.pdf`,
  );
}

export async function buildWorkItemPdf(item, profiles = []) {
  const template = item?.template_snapshot || templateById(item?.template_id);
  if (!item?.id || !template)
    throw new Error(
      "A saved work item and its template are required for PDF export.",
    );
  const names = Object.fromEntries(
    profiles.map((person) => [person.id, person.full_name]),
  );
  const data = item.data || {},
    checks = item.checks || {};
  const synthetic = item.synthetic === true || item.sample === true;
  const pdf = await createWriter(
    template.title,
    `${synthetic ? "FICTIONAL DEMONSTRATION | " : ""}${item.title || `Work item ${item.id}`}`,
  );
  if (synthetic)
    pdf.paragraph(
      "Fictional demonstration; no actual human review or loan outcome. Seeded checklist marks and workflow status are examples only.",
    );
  pdf.paragraph(
    "Operational copy for human review. Recorded completion is a workflow status, not an executed disclosure, closing authorization, compliance determination, or credit decision.",
    true,
  );
  pdf.section("Record and audit status");
  pdf.row("Work item ID", item.id);
  pdf.row(
    "Template version",
    `${template.id} v${item.template_version ?? template.version}`,
  );
  pdf.row("Source reference", sourceValue(template.source));
  pdf.row("Department", item.department || template.department);
  pdf.row("Status", WORK_STATUS_LABEL[item.status] || item.status);
  pdf.row("Owner", names[item.owner_id] || item.owner_id || "Unassigned");
  pdf.row("Loan number", item.loan_number || data.loan_number || "Not linked");
  pdf.row("Saved revision", dateValue(item.updated_at));
  pdf.row("Exported at", dateValue(new Date().toISOString()));
  pdf.row(
    "Audit boundary",
    "Unsigned snapshot of the saved work item. Detailed action history remains in the application. Checklist marks record user-entered completion; source accuracy is not independently verified.",
  );
  const visible = new Set(
    visibleFields(template, data).map((field) => field.key),
  );
  for (const section of template.sections) {
    const fields = section.fields.filter((field) => visible.has(field.key));
    if (!fields.length && !section.description) continue;
    pdf.section(section.title);
    if (section.description) pdf.paragraph(section.description);
    for (const field of fields)
      pdf.row(
        field.label,
        stringValue(field.optionLabels?.[data[field.key]] ?? data[field.key]),
      );
  }
  if (template.checklist.length) {
    pdf.section("Recorded checklist");
    for (const check of template.checklist)
      pdf.row(
        check.label,
        checks[check.id] === true ? "Completion recorded" : "Not completed",
      );
  }
  if (item.notes) {
    pdf.section("Work item notes");
    pdf.paragraph(item.notes);
  }
  if (template.boundary) {
    pdf.section("Source and review boundary");
    pdf.paragraph(template.boundary);
  }
  if (template.sourceFooter) {
    pdf.section("Original source disclaimer and footer");
    pdf.paragraph(template.sourceFooter);
  }
  return pdf.finish();
}

export async function downloadWorkItemPdf(item, profiles = []) {
  const doc = await buildWorkItemPdf(item, profiles);
  doc.save(
    `${filename(item.loan_number || item.id)}-${filename(item.template_id)}-operational-copy.pdf`,
  );
}
