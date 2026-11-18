import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function probePdf(buffer: ArrayBuffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const pages: unknown[] = [];
  for (const pageNumber of [2, 3, 4]) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const lines: {
      y: number;
      size: number;
      text: string;
      items: { str: string; x: number; w: number; dir?: string }[];
    }[] = [];
    let buffer: { str: string; transform: number[]; height: number; dir?: string; width: number }[] = [];
    const flush = () => {
      if (!buffer.length) return;
      lines.push({
        y: Math.round(buffer[0].transform[5]),
        size: Math.round(Math.max(...buffer.map((item) => item.height)) * 10) / 10,
        text: buffer.map((item) => item.str).join("").slice(0, 70),
        items: buffer.map((item) => ({
          str: item.str,
          x: Math.round(item.transform[4]),
          w: Math.round(item.width),
          dir: item.dir,
        })),
      });
      buffer = [];
    };
    (content.items as unknown as { str?: string; transform: number[]; height: number; hasEOL?: boolean }[]).forEach(
      (item) => {
        if (typeof item.str !== "string") return;
        buffer.push(item as never);
        if (item.hasEOL) flush();
      },
    );
    flush();
    pages.push({ page: pageNumber, height: Math.round(viewport.height), lines });
    page.cleanup();
  }
  return pages;
}
