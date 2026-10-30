import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DrawingDoc } from '../types';
import { StaticDrawing, drawingBounds } from './StaticDrawing';
import { downloadBlob, safeFilename } from '../utils/id';

export function drawingSvgString(doc: DrawingDoc, projectName: string, author = ''): string {
  const markup = renderToStaticMarkup(createElement(StaticDrawing, { doc, projectName, author }));
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`;
}

export function exportSvg(doc: DrawingDoc, projectName: string, author = '') {
  const svg = drawingSvgString(doc, projectName, author);
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), `${safeFilename(doc.name)}.svg`);
}

/** Rasteriserer tegningen til et canvas. */
export async function drawingToCanvas(doc: DrawingDoc, projectName: string, author = '', scale = 2): Promise<HTMLCanvasElement> {
  const svg = drawingSvgString(doc, projectName, author);
  const b = drawingBounds(doc);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Kunne ikke tegne SVG til bilde'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    // Begrens størrelsen slik at nettleseren ikke går tom for minne
    const maxSide = 8000;
    const s = Math.min(scale, maxSide / Math.max(b.w, b.h));
    canvas.width = Math.round(b.w * s);
    canvas.height = Math.round(b.h * s);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function drawingToPngDataUrl(doc: DrawingDoc, projectName: string, author = '', scale = 2) {
  const c = await drawingToCanvas(doc, projectName, author, scale);
  return { dataUrl: c.toDataURL('image/png'), width: c.width, height: c.height };
}

export async function exportPng(doc: DrawingDoc, projectName: string, author = '', scale = 2) {
  const canvas = await drawingToCanvas(doc, projectName, author, scale);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (blob) downloadBlob(blob, `${safeFilename(doc.name)}.png`);
}

export async function exportPdf(doc: DrawingDoc, projectName: string, author = '') {
  const { jsPDF } = await import('jspdf');
  const b = drawingBounds(doc);
  const landscape = doc.sheet.show ? doc.sheet.orientation === 'landscape' : b.w >= b.h;
  const format = doc.sheet.show ? doc.sheet.size.toLowerCase() : 'a4';
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = doc.sheet.show ? 0 : 10;
  const s = Math.min((pw - margin * 2) / b.w, (ph - margin * 2) / b.h);
  const w = b.w * s;
  const h = b.h * s;
  const x = (pw - w) / 2;
  const y = (ph - h) / 2;
  try {
    // Vektor-eksport
    const { svg2pdf } = await import('svg2pdf.js');
    const holder = document.createElement('div');
    holder.style.position = 'fixed';
    holder.style.left = '-10000px';
    holder.innerHTML = drawingSvgString(doc, projectName, author).replace(/^<\?xml[^>]*>\s*/, '');
    document.body.appendChild(holder);
    const svgEl = holder.querySelector('svg')!;
    try {
      await svg2pdf(svgEl, pdf, { x, y, width: w, height: h });
    } finally {
      holder.remove();
    }
  } catch (e) {
    console.warn('Vektor-PDF feilet, bruker bilde', e);
    const png = await drawingToPngDataUrl(doc, projectName, author, 3);
    pdf.addImage(png.dataUrl, 'PNG', x, y, w, h);
  }
  pdf.setProperties({ title: doc.name, creator: 'ElektroStudio' });
  pdf.save(`${safeFilename(doc.name)}.pdf`);
}

/** Skriver ut via en skjult iframe slik at bare tegningen kommer med. */
export function printDrawing(doc: DrawingDoc, projectName: string, author = '') {
  const svg = drawingSvgString(doc, projectName, author).replace(/^<\?xml[^>]*>\s*/, '');
  const b = drawingBounds(doc);
  const landscape = doc.sheet.show ? doc.sheet.orientation === 'landscape' : b.w >= b.h;
  const size = doc.sheet.show ? doc.sheet.size : 'A4';
  printHtml(
    `<style>@page{size:${size} ${landscape ? 'landscape' : 'portrait'};margin:${doc.sheet.show ? '0' : '10mm'}}html,body{margin:0;height:100%}svg{width:100%;height:100%;display:block}</style>${svg}`,
    doc.name,
  );
}

export function printHtml(bodyHtml: string, title: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const d = iframe.contentDocument!;
  d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${bodyHtml}</body></html>`);
  d.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 300);
}
