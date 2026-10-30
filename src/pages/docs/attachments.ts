import { useEffect, useState } from 'react';
import { fileRepo } from '../../storage';

/** Lager en midlertidig object-URL for et vedlegg og rydder opp når komponenten forsvinner. */
export function useAttachmentUrl(id: string | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!id) return;
    let alive = true;
    let created: string | undefined;
    void fileRepo.get(id).then((f) => {
      if (!f || !alive) return;
      created = URL.createObjectURL(f.blob);
      setUrl(created);
    });
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
      setUrl(undefined);
    };
  }, [id]);
  return url;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function isImage(type: string) {
  return type.startsWith('image/');
}

/** Leser et bildevedlegg og konverterer det til JPEG (fungerer i jsPDF uansett kildeformat). */
export async function attachmentAsJpeg(id: string, maxSide = 1800): Promise<{ dataUrl: string; width: number; height: number; name: string } | null> {
  const f = await fileRepo.get(id);
  if (!f || !isImage(f.type)) return null;
  const url = URL.createObjectURL(f.blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Kunne ikke lese bildet'));
      img.src = url;
    });
    const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * s));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * s));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height, name: f.name };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadAttachment(id: string) {
  const f = await fileRepo.get(id);
  if (!f) return;
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
