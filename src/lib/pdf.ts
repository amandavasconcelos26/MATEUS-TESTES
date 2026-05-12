import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PdfLine, PdfTextItem } from "./types";
import { normalizeSpaces } from "./format";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfTextContentItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

export async function extractPdfTextWithPositions(file: File): Promise<{ items: PdfTextItem[]; pages: number }> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const items: PdfTextItem[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    for (const raw of content.items as PdfTextContentItem[]) {
      const text = normalizeSpaces(raw.str ?? "");
      if (!text) continue;
      const t = raw.transform ?? [1, 0, 0, 1, 0, 0];
      const x = Number(t[4] ?? 0);
      const y = Number(t[5] ?? 0);
      const height = Number(raw.height ?? Math.abs(t[3] ?? 0) ?? 0);
      const width = Number(raw.width ?? 0);
      items.push({ text, page: pageNumber, x, y, width, height });
    }
  }

  items.sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  return { items, pages: pdf.numPages };
}

export function buildLines(items: PdfTextItem[], yTolerance = 3): PdfLine[] {
  const lines: PdfLine[] = [];
  const byPage = new Map<number, PdfTextItem[]>();

  for (const item of items) {
    if (!byPage.has(item.page)) byPage.set(item.page, []);
    byPage.get(item.page)!.push(item);
  }

  for (const [page, pageItems] of byPage.entries()) {
    const sorted = [...pageItems].sort((a, b) => b.y - a.y || a.x - b.x);
    const buckets: PdfTextItem[][] = [];

    for (const item of sorted) {
      const bucket = buckets.find((line) => Math.abs(line[0].y - item.y) <= yTolerance);
      if (bucket) {
        bucket.push(item);
      } else {
        buckets.push([item]);
      }
    }

    for (const bucket of buckets) {
      bucket.sort((a, b) => a.x - b.x);
      const text = normalizeSpaces(bucket.map((i) => i.text).join(" "));
      if (!text) continue;
      const avgY = bucket.reduce((sum, i) => sum + i.y, 0) / bucket.length;
      lines.push({ page, y: avgY, text, items: bucket });
    }
  }

  lines.sort((a, b) => a.page - b.page || b.y - a.y);
  return lines;
}

export function detectReportType(lines: PdfLine[]): "ATUA" | "GW" | "UNKNOWN" {
  const sample = lines.slice(0, 100).map((l) => l.text.toLowerCase()).join(" ");
  if (
    sample.includes("relatório detalhado do ctrc") ||
    sample.includes("relatorio detalhado do ctrc") ||
    (sample.includes("frete tarifa") && sample.includes("result"))
  ) {
    return "ATUA";
  }
  if (
    sample.includes("análise de cte/nfs") ||
    sample.includes("analise de cte/nfs") ||
    sample.includes("vl carreteiro líquido") ||
    sample.includes("vl carreteiro liquido")
  ) {
    return "GW";
  }
  return "UNKNOWN";
}
