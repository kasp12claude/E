import type { DrawingDoc, Report, ReportSection } from '../../types';
import { getSymbol } from '../../library/symbols';
import { uid } from '../../utils/id';

/** Symboler som er hjelpesymboler og ikke fysiske komponenter. */
export const NON_COMPONENT_SYMBOLS = new Set(['junction', 'ground', 'protective-earth', 'ref-tag', 'single-line', 'bus-3', 'bus-5', 'connection-point']);

export const COMPONENT_COLUMNS = ['Betegnelse', 'Komponent', 'Data', 'Antall'];

/** Teller komponenter i tegningene og lager rader til komponentlisten. */
export function componentRows(docs: DrawingDoc[]): string[][] {
  const groups = new Map<string, { name: string; summary: string; labels: string[]; count: number }>();
  for (const d of docs) {
    for (const el of d.elements) {
      if (el.type !== 'component' || NON_COMPONENT_SYMBOLS.has(el.symbolId)) continue;
      const def = getSymbol(el.symbolId);
      if (!def) continue;
      const summary = def.summary?.(el.props) ?? '';
      const key = `${def.id}|${summary}`;
      const g = groups.get(key) ?? { name: def.name, summary, labels: [], count: 0 };
      g.count++;
      if (el.label && !g.labels.includes(el.label)) g.labels.push(el.label);
      groups.set(key, g);
    }
  }
  return [...groups.values()]
    .sort((a, b) => (a.labels[0] ?? 'zz').localeCompare(b.labels[0] ?? 'zz', 'nb', { numeric: true }) || a.name.localeCompare(b.name, 'nb'))
    .map((g) => [g.labels.join(', '), g.name, g.summary, String(g.count)]);
}

export function isComponentListSection(s: ReportSection) {
  return s.kind === 'table' && (s.title.toLowerCase().includes('komponentliste') || s.columns?.[0] === 'Betegnelse');
}

export function sectionFilled(s: ReportSection): boolean {
  switch (s.kind) {
    case 'text':
    case 'list':
      return s.text.trim().length > 0;
    case 'table':
      return (s.rows ?? []).some((r) => r.some((c) => c.trim()));
    case 'checklist':
      return (s.items ?? []).some((i) => i.done);
    case 'drawing':
      return (s.drawingIds ?? []).length > 0;
    case 'images':
      return (s.imageIds ?? []).length > 0;
  }
}

export function reportProgress(r: Report) {
  if (r.sections.length === 0) return 0;
  return r.sections.filter(sectionFilled).length / r.sections.length;
}

export function cloneReport(r: Report): Report {
  const c: Report = structuredClone(r);
  c.id = uid('rep');
  c.title = `${r.title} (kopi)`;
  c.createdAt = Date.now();
  c.updatedAt = Date.now();
  c.sections = c.sections.map((s) => ({ ...s, id: uid('sec'), items: s.items?.map((i) => ({ ...i, id: uid('ci') })) }));
  return c;
}

export const KIND_LABEL: Record<ReportSection['kind'], string> = {
  text: 'Tekst',
  list: 'Liste',
  table: 'Tabell',
  checklist: 'Sjekkliste',
  drawing: 'Tegning',
  images: 'Bilder',
};

/** Erstatter tegn som standardfontene i PDF ikke støtter. */
export function pdfSafe(s: string): string {
  const map: Record<string, string> = {
    'Ω': 'ohm',
    'Δ': 'delta ',
    '−': '-',
    '≈': '~',
    '≥': '>=',
    '≤': '<=',
    'μ': 'µ',
    '√': 'rot',
    'π': 'pi',
    '→': '->',
    '☐': '[ ]',
    '☑': '[x]',
    '✓': 'x',
    '⋅': '·',
    '₁': '1',
    '₂': '2',
    '₃': '3',
    'φ': 'phi',
    'η': 'eta',
  };
  let out = '';
  for (const ch of s) {
    if (map[ch] !== undefined) out += map[ch];
    else if (ch.charCodeAt(0) <= 0xff || '–—‘’“”•…€'.includes(ch)) out += ch;
    else out += '?';
  }
  return out;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
