import type { AuditOutput, AuditRow } from "./types";
import { formatBRL, formatNumber, formatPercent } from "./format";

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function rowToCsv(row: AuditRow): string {
  return [
    row.cte,
    row.status,
    formatBRL(row.empresaATUA),
    formatBRL(row.empresaGW),
    formatBRL(row.diferencaEmpresa),
    formatBRL(row.motoristaATUA),
    formatBRL(row.motoristaGW),
    formatBRL(row.diferencaMotorista),
    formatPercent(row.margemGW),
    row.campoMotoristaGW ?? "",
    row.pageATUA ?? "",
    row.pageGW ?? "",
    formatNumber(row.confidence, 2),
    row.observacao
  ].map(csvEscape).join(";");
}

export function buildAuditCsv(output: AuditOutput): string {
  const header = [
    "CTE",
    "Status",
    "Empresa ATUA",
    "Empresa GW",
    "Diferença Empresa",
    "Motorista ATUA",
    "Motorista GW",
    "Diferença Motorista",
    "Margem GW",
    "Campo Motorista GW",
    "Página ATUA",
    "Página GW",
    "Confiança",
    "Observação"
  ].map(csvEscape).join(";");

  return [header, ...output.rows.map(rowToCsv)].join("\n");
}

export function downloadTextFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
