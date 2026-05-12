import { buildLines, detectReportType, extractPdfTextWithPositions } from "./pdf";
import { parseATUA, parseGW } from "./parsers";
import { runAudit } from "./audit";
import type { AuditOutput } from "./types";

export async function processAuditFiles(atuaFile: File, gwFile: File): Promise<AuditOutput> {
  const startedAt = performance.now();

  const [atuaPdf, gwPdf] = await Promise.all([
    extractPdfTextWithPositions(atuaFile),
    extractPdfTextWithPositions(gwFile)
  ]);

  const atuaLines = buildLines(atuaPdf.items);
  const gwLines = buildLines(gwPdf.items);

  const atuaType = detectReportType(atuaLines);
  const gwType = detectReportType(gwLines);

  const warnings: string[] = [];
  if (atuaType !== "ATUA") warnings.push(`Arquivo ATUA identificado como ${atuaType}. Verificar upload.`);
  if (gwType !== "GW") warnings.push(`Arquivo GW identificado como ${gwType}. Verificar upload.`);

  const atuaRecords = parseATUA(atuaLines);
  const gwRecords = parseGW(gwLines);

  const output = runAudit({
    atuaRecords,
    gwRecords,
    paginasATUA: atuaPdf.pages,
    paginasGW: gwPdf.pages,
    startedAt
  });

  if (warnings.length) {
    output.validations.unshift(...warnings);
  }

  return output;
}
