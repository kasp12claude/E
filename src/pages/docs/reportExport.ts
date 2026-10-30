import type { Project, Report, ReportSection } from '../../types';
import { drawingSvgString, drawingToPngDataUrl, printHtml } from '../../editor/exporters';
import { formatDate, safeFilename } from '../../utils/id';
import { attachmentAsJpeg } from './attachments';
import { escapeHtml, pdfSafe } from './reportUtils';

const DISCLAIMER =
  'Rapporten er laget i ElektroStudio som et lærings- og dokumentasjonsverktøy. Den er ikke en samsvarserklæring eller godkjenning av en elektrisk installasjon, og tegningene er ikke automatisk kontrollert mot gjeldende regler.';

interface ExportOpts {
  school?: string;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export async function exportReportPdf(report: Report, project: Project, opts: ExportOpts = {}) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const M = 20;
  const CW = PW - M * 2;
  const BOTTOM = PH - 18;
  let y = M;

  const setFont = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal', gray = 20) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
    pdf.setTextColor(gray, gray, gray);
  };
  const newPage = () => {
    pdf.addPage();
    y = M;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };
  const lineH = (size: number) => size * 0.42;

  const paragraph = (text: string, size = 10.5, style: 'normal' | 'bold' | 'italic' = 'normal', gray = 30) => {
    setFont(size, style, gray);
    const lines: string[] = pdf.splitTextToSize(pdfSafe(text), CW);
    const lh = lineH(size) * 1.25;
    for (const l of lines) {
      ensure(lh);
      pdf.text(l, M, y + lh * 0.8);
      y += lh;
    }
    y += 2;
  };

  // --- Tittelside -----------------------------------------------------------
  pdf.setFillColor(29, 78, 216);
  pdf.rect(0, 0, PW, 8, 'F');
  y = 60;
  setFont(11, 'bold', 90);
  pdf.text(pdfSafe(report.template === 'skole' ? 'SKOLEPROSJEKT – ELEKTROFAG' : 'RAPPORT'), M, y);
  y += 12;
  setFont(26, 'bold', 15);
  for (const l of pdf.splitTextToSize(pdfSafe(report.title || 'Rapport'), CW) as string[]) {
    pdf.text(l, M, y);
    y += 11;
  }
  y += 2;
  setFont(14, 'normal', 60);
  pdf.text(pdfSafe(project.name), M, y);
  y += 16;
  const meta: [string, string][] = [
    ['Forfatter', report.author],
    ['Klasse', report.className],
    ['Skole / firma', opts.school ?? ''],
    ['Dato', report.date ? formatDate(report.date) : ''],
  ];
  for (const [k, v] of meta) {
    if (!v) continue;
    setFont(10, 'bold', 90);
    pdf.text(pdfSafe(k), M, y);
    setFont(11, 'normal', 25);
    pdf.text(pdfSafe(v), M + 35, y);
    y += 7;
  }
  if (project.description) {
    y += 6;
    paragraph(project.description, 10.5, 'italic', 70);
  }
  // Innholdsfortegnelse
  y = Math.max(y + 8, 160);
  setFont(12, 'bold', 20);
  pdf.text('Innhold', M, y);
  y += 7;
  report.sections.forEach((s, i) => {
    if (y > BOTTOM - 20) return;
    setFont(10, 'normal', 50);
    pdf.text(pdfSafe(`${i + 1}  ${s.title}`), M + 2, y);
    y += 5.5;
  });
  setFont(8.5, 'italic', 110);
  const disc: string[] = pdf.splitTextToSize(pdfSafe(DISCLAIMER), CW);
  pdf.text(disc, M, PH - 14 - disc.length * 3.8);

  // --- Seksjoner ------------------------------------------------------------
  newPage();
  for (let i = 0; i < report.sections.length; i++) {
    const s = report.sections[i];
    ensure(20);
    y += i === 0 ? 0 : 4;
    setFont(14, 'bold', 20);
    pdf.text(pdfSafe(`${i + 1}  ${s.title}`), M, y + 5);
    y += 8;
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.line(M, y, M + 30, y);
    y += 5;
    await renderSectionPdf(s);
  }

  async function renderSectionPdf(s: ReportSection) {
    switch (s.kind) {
      case 'text':
      case 'list':
        if (s.text.trim()) paragraph(s.text);
        else paragraph('(Ikke utfylt)', 10, 'italic', 140);
        return;
      case 'table':
        table(s.columns ?? [], (s.rows ?? []).filter((r) => r.some((c) => c.trim())));
        break;
      case 'checklist':
        for (const it of s.items ?? []) {
          setFont(10.5, 'normal', 30);
          const lines: string[] = pdf.splitTextToSize(pdfSafe(it.text), CW - 10);
          ensure(lines.length * 5.5);
          // Avkrysningsboks tegnet som grafikk
          pdf.setDrawColor(60, 60, 60);
          pdf.setLineWidth(0.3);
          pdf.rect(M, y + 1, 3.6, 3.6);
          if (it.done) {
            pdf.setLineWidth(0.6);
            pdf.line(M + 0.7, y + 3, M + 1.6, y + 4);
            pdf.line(M + 1.6, y + 4, M + 3.2, y + 1.6);
          }
          lines.forEach((l, j) => pdf.text(l, M + 7, y + 4 + j * 5));
          y += lines.length * 5 + 1.5;
        }
        y += 2;
        break;
      case 'drawing': {
        const docs = (s.drawingIds ?? []).map((id) => project.docs.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d);
        if (docs.length === 0) paragraph('(Ingen tegning valgt)', 10, 'italic', 140);
        for (const d of docs) {
          try {
            const png = await drawingToPngDataUrl(d, project.name, report.author, 2);
            image(png.dataUrl, 'PNG', png.width, png.height, `Figur: ${d.name}`, PH - M * 2 - 20);
          } catch {
            paragraph(`(Kunne ikke legge inn tegningen «${d.name}»)`, 10, 'italic', 140);
          }
        }
        break;
      }
      case 'images': {
        const ids = s.imageIds ?? [];
        if (ids.length === 0) paragraph('(Ingen bilder valgt)', 10, 'italic', 140);
        for (const id of ids) {
          const img = await attachmentAsJpeg(id);
          if (img) image(img.dataUrl, 'JPEG', img.width, img.height, img.name, 120);
        }
        break;
      }
    }
    const kind: string = s.kind;
    if (kind !== 'text' && kind !== 'list' && s.text.trim()) paragraph(s.text);
  }

  function image(dataUrl: string, fmt: 'PNG' | 'JPEG', w: number, h: number, caption: string, maxH: number) {
    let iw = CW;
    let ih = (h / w) * iw;
    if (ih > maxH) {
      ih = maxH;
      iw = (w / h) * ih;
    }
    ensure(ih + 9);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.2);
    pdf.addImage(dataUrl, fmt, M + (CW - iw) / 2, y, iw, ih);
    pdf.rect(M + (CW - iw) / 2, y, iw, ih);
    y += ih + 4;
    setFont(9, 'italic', 90);
    pdf.text(pdfSafe(caption), PW / 2, y + 1, { align: 'center' });
    y += 6;
  }

  function table(columns: string[], rows: string[][]) {
    if (columns.length === 0) return;
    if (rows.length === 0) {
      paragraph('(Ingen rader utfylt)', 10, 'italic', 140);
      return;
    }
    const size = 9;
    const pad = 1.6;
    // Kolonnebredder etter innholdets lengde (med minimum)
    const weights = columns.map((c, ci) => Math.max(6, c.length, ...rows.map((r) => Math.min(40, (r[ci] ?? '').length))));
    const total = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((w) => (w / total) * CW);
    const lh = lineH(size) * 1.2;
    const rowLines = (cells: string[], bold: boolean) => {
      setFont(size, bold ? 'bold' : 'normal', 30);
      return cells.map((c, ci) => pdf.splitTextToSize(pdfSafe(c ?? ''), widths[ci] - pad * 2) as string[]);
    };
    const drawRow = (cells: string[], header: boolean) => {
      const lines = rowLines(cells, header);
      const h = Math.max(1, ...lines.map((l) => l.length)) * lh + pad * 2;
      if (y + h > BOTTOM) {
        newPage();
        if (!header) drawRow(columns, true);
      }
      let x = M;
      if (header) {
        pdf.setFillColor(232, 238, 250);
        pdf.rect(M, y, CW, h, 'F');
      }
      pdf.setDrawColor(170, 180, 200);
      pdf.setLineWidth(0.2);
      setFont(size, header ? 'bold' : 'normal', 30);
      lines.forEach((l, ci) => {
        pdf.rect(x, y, widths[ci], h);
        l.forEach((t, li) => pdf.text(t, x + pad, y + pad + lh * (li + 0.8)));
        x += widths[ci];
      });
      y += h;
    };
    drawRow(columns, true);
    for (const r of rows) drawRow(columns.map((_, ci) => r[ci] ?? ''), false);
    y += 4;
  }

  // --- Bunntekst med sidetall -------------------------------------------------
  const pages = pdf.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    pdf.setPage(p);
    setFont(8, 'normal', 120);
    pdf.setDrawColor(210, 215, 225);
    pdf.setLineWidth(0.2);
    pdf.line(M, PH - 13, PW - M, PH - 13);
    pdf.text(pdfSafe(`${report.title} – ${project.name}`), M, PH - 9);
    pdf.text(`Side ${p} av ${pages}`, PW - M, PH - 9, { align: 'right' });
  }
  pdf.setProperties({ title: report.title, author: report.author, creator: 'ElektroStudio' });
  pdf.save(`${safeFilename(report.title || 'rapport')}.pdf`);
}

// ---------------------------------------------------------------------------
// Utskrift (HTML)
// ---------------------------------------------------------------------------
export async function printReport(report: Report, project: Project, opts: ExportOpts = {}) {
  const e = escapeHtml;
  const parts: string[] = [];
  parts.push(`<header class="title">
    <div class="kicker">${report.template === 'skole' ? 'Skoleprosjekt – elektrofag' : 'Rapport'}</div>
    <h1>${e(report.title)}</h1>
    <div class="proj">${e(project.name)}</div>
    <table class="meta">
      ${report.author ? `<tr><th>Forfatter</th><td>${e(report.author)}</td></tr>` : ''}
      ${report.className ? `<tr><th>Klasse</th><td>${e(report.className)}</td></tr>` : ''}
      ${opts.school ? `<tr><th>Skole / firma</th><td>${e(opts.school)}</td></tr>` : ''}
      ${report.date ? `<tr><th>Dato</th><td>${e(formatDate(report.date))}</td></tr>` : ''}
    </table>
    <p class="disc">${e(DISCLAIMER)}</p>
  </header>`);

  for (let i = 0; i < report.sections.length; i++) {
    const s = report.sections[i];
    let body = '';
    const text = s.text.trim() ? `<p class="txt">${e(s.text)}</p>` : '';
    switch (s.kind) {
      case 'text':
      case 'list':
        body = text || '<p class="empty">(Ikke utfylt)</p>';
        break;
      case 'table': {
        const rows = (s.rows ?? []).filter((r) => r.some((c) => c.trim()));
        body =
          rows.length === 0
            ? '<p class="empty">(Ingen rader utfylt)</p>'
            : `<table class="tbl"><thead><tr>${(s.columns ?? []).map((c) => `<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${rows
                .map((r) => `<tr>${(s.columns ?? []).map((_, ci) => `<td>${e(r[ci] ?? '')}</td>`).join('')}</tr>`)
                .join('')}</tbody></table>`;
        body += text;
        break;
      }
      case 'checklist':
        body = `<ul class="check">${(s.items ?? []).map((it) => `<li>${it.done ? '☑' : '☐'} ${e(it.text)}</li>`).join('')}</ul>${text}`;
        break;
      case 'drawing': {
        const docs = (s.drawingIds ?? []).map((id) => project.docs.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => !!d);
        body = docs.length
          ? docs.map((d) => `<figure>${drawingSvgString(d, project.name, report.author).replace(/^<\?xml[^>]*>\s*/, '')}<figcaption>Figur: ${e(d.name)}</figcaption></figure>`).join('')
          : '<p class="empty">(Ingen tegning valgt)</p>';
        body += text;
        break;
      }
      case 'images': {
        const imgs = await Promise.all((s.imageIds ?? []).map((id) => attachmentAsJpeg(id, 1400)));
        body = imgs.filter(Boolean).length
          ? imgs
              .filter((x): x is NonNullable<typeof x> => !!x)
              .map((im) => `<figure><img src="${im.dataUrl}" alt="${e(im.name)}"/><figcaption>${e(im.name)}</figcaption></figure>`)
              .join('')
          : '<p class="empty">(Ingen bilder valgt)</p>';
        body += text;
        break;
      }
    }
    parts.push(`<section><h2>${i + 1}&nbsp; ${e(s.title)}</h2>${body}</section>`);
  }

  const css = `
    @page { size: A4; margin: 18mm 16mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1f2b; font-size: 10.5pt; line-height: 1.45; }
    .title { page-break-after: always; padding-top: 40mm; }
    .kicker { text-transform: uppercase; letter-spacing: .08em; color: #555; font-weight: 700; font-size: 10pt; }
    h1 { font-size: 26pt; margin: 6px 0 4px; }
    .proj { font-size: 14pt; color: #444; margin-bottom: 24px; }
    .meta th { text-align: left; padding: 3px 18px 3px 0; color: #666; font-weight: 600; }
    .disc { margin-top: 60mm; font-size: 8.5pt; color: #777; font-style: italic; }
    h2 { font-size: 14pt; border-bottom: 2px solid #3b82f6; padding-bottom: 3px; margin: 18px 0 8px; page-break-after: avoid; }
    .txt { white-space: pre-wrap; }
    .empty { color: #999; font-style: italic; }
    .tbl { border-collapse: collapse; width: 100%; font-size: 9pt; margin: 6px 0; }
    .tbl th, .tbl td { border: 1px solid #b8c2d6; padding: 4px 6px; text-align: left; vertical-align: top; }
    .tbl th { background: #e8eefa; }
    .tbl tr { page-break-inside: avoid; }
    .check { list-style: none; padding-left: 0; }
    .check li { margin: 3px 0; }
    figure { margin: 8px 0 14px; text-align: center; page-break-inside: avoid; }
    figure svg, figure img { max-width: 100%; max-height: 230mm; height: auto; border: 1px solid #ddd; }
    figcaption { font-size: 9pt; color: #555; font-style: italic; margin-top: 4px; }
  `;
  printHtml(`<style>${css}</style>${parts.join('\n')}`, report.title);
}
