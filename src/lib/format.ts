export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeCTE(value: string): string {
  const onlyDigits = value.replace(/\D/g, "");
  const normalized = onlyDigits.replace(/^0+/, "");
  return normalized || "0";
}

export function parseBRLMoney(value: string): number | null {
  if (!value) return null;
  const cleaned = value
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePercent(value: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/%/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

// Dinheiro brasileiro com duas casas decimais. Não pega peso no formato 46,900.
const MONEY_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}/g;
const NUMBER_RE = /-?\d{1,3}(?:\.\d{3})*,\d{2,3}|-?\d+,\d{2,3}/g;

export function extractMoneyTokens(text: string): string[] {
  return Array.from(text.matchAll(MONEY_RE)).map((m) => m[0]);
}

export type NumberToken = { raw: string; index: number; decimals: number };

export function extractNumberTokens(text: string): NumberToken[] {
  return Array.from(text.matchAll(NUMBER_RE)).map((m) => {
    const raw = m[0];
    const decimals = raw.split(",")[1]?.length ?? 0;
    return { raw, index: m.index ?? 0, decimals };
  });
}

export function absDiff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Math.abs(a - b);
}

export function withinTolerance(value: number | null, tolerance = 0.05): boolean {
  if (value === null) return false;
  return value <= tolerance;
}
