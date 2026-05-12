import type { AuditRecord, PdfLine } from "./types";
import {
  extractMoneyTokens,
  extractNumberTokens,
  normalizeCTE,
  normalizeSpaces,
  parseBRLMoney,
  parsePercent
} from "./format";

const PLATE_RE = /\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b|\b[A-Z]{3}[0-9]{4}\b/;
const CTE_ATUA_RE = /^\s*0*(\d{3,8})\s+(?:CT\b|CTRC\b|\d{2}\/\d{2}\/\d{2})/i;
const CTE_GW_RE = /^\s*0*(\d{3,8})\s+\d{2}\/\d{2}\/\d{4}\b/;
const PERCENT_RE = /-?\d{1,3},\d{2}%/g;

export function parseATUA(lines: PdfLine[]): AuditRecord[] {
  const records: AuditRecord[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const text = normalizeSpaces(line.text);
    const cteMatch = text.match(CTE_ATUA_RE);
    if (!cteMatch) continue;

    const cte = normalizeCTE(cteMatch[1]);
    const warnings: string[] = [];
    let empresa: number | null = null;
    let motorista: number | null = null;
    let confidence = 0.96;

    const plateMatch = text.match(PLATE_RE);

    if (plateMatch && plateMatch.index !== undefined) {
      const afterPlate = text.slice(plateMatch.index + plateMatch[0].length);
      const numbers = extractNumberTokens(afterPlate);

      // Depois da placa, o primeiro número é peso. Os próximos valores monetários são Frete Empresa e Frete Motorista.
      const afterWeight = numbers.slice(1).filter((n) => n.decimals === 2);
      if (afterWeight.length >= 2) {
        empresa = parseBRLMoney(afterWeight[0].raw);
        motorista = parseBRLMoney(afterWeight[1].raw);
      } else {
        warnings.push("Não encontrou Empresa/Motorista após Peso no ATUA; aplicado fallback por valores monetários da linha.");
        confidence = 0.72;
      }
    } else {
      warnings.push("Placa não encontrada no ATUA; aplicado fallback por valores monetários da linha.");
      confidence = 0.70;
    }

    if (empresa === null || motorista === null) {
      const money = extractMoneyTokens(text);
      // Fallback: se o peso vier como 46,900, os dois primeiros valores monetários da linha são Empresa/Motorista.
      // Se houver peso em formato 46.900,00 e placa ausente, este fallback pode ser inseguro.
      if (money.length >= 2) {
        empresa = empresa ?? parseBRLMoney(money[0]);
        motorista = motorista ?? parseBRLMoney(money[1]);
      }
    }

    if (empresa === null || motorista === null) {
      warnings.push("Campo obrigatório ATUA não identificado com segurança.");
      confidence = Math.min(confidence, 0.55);
    }

    if (motorista === Number(cte)) {
      warnings.push("Motorista ATUA parecia ser o número do CTE; registro bloqueado para revisão.");
      motorista = null;
      confidence = 0.40;
    }

    if (seen.has(cte)) warnings.push("CTE duplicado no ATUA.");
    seen.add(cte);

    records.push({
      cte,
      source: "ATUA",
      page: line.page,
      empresaValor: empresa,
      motoristaValor: motorista,
      campoEmpresa: "Frete Empresa",
      campoMotorista: "Frete Motorista",
      confidence,
      rawLine: text,
      warnings
    });
  }

  return records;
}

export function parseGW(lines: PdfLine[]): AuditRecord[] {
  const records: AuditRecord[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const text = normalizeSpaces(line.text);
    const cteMatch = text.match(CTE_GW_RE);
    if (!cteMatch) continue;

    const cte = normalizeCTE(cteMatch[1]);
    const warnings: string[] = [];
    const money = extractMoneyTokens(text);
    let empresa: number | null = null;
    let motorista: number | null = null;
    let confidence = 0.96;

    if (money.length >= 2) {
      empresa = parseBRLMoney(money[0]);
      motorista = parseBRLMoney(money[money.length - 1]);
      // No GW, a última coluna monetária da linha principal do CTE é Vl Carreteiro Líquido.
      // Não olhamos linhas seguintes para motorista para não capturar Resultado.
    } else {
      warnings.push("Linha GW com poucos valores monetários; Motorista GW não confiável.");
      confidence = 0.55;
    }

    if (money.length < 5) {
      warnings.push("Quantidade baixa de campos monetários no GW; validar coluna Vl Carreteiro Líquido.");
      confidence = Math.min(confidence, 0.74);
    }

    let margem: number | null = null;
    const blockText = [text, lines[i + 1]?.text ?? "", lines[i + 2]?.text ?? ""].join(" ");
    const percentTokens = Array.from(blockText.matchAll(PERCENT_RE)).map((m) => m[0]);
    if (percentTokens.length) margem = parsePercent(percentTokens[percentTokens.length - 1]);

    if (seen.has(cte)) warnings.push("CTE duplicado no GW.");
    seen.add(cte);

    records.push({
      cte,
      source: "GW",
      page: line.page,
      empresaValor: empresa,
      motoristaValor: motorista,
      margemGW: margem,
      campoEmpresa: "Valor frete",
      campoMotorista: "Vl Carreteiro Líquido",
      confidence,
      rawLine: text,
      warnings
    });
  }

  return records;
}

export function countDuplicatedCTEs(records: AuditRecord[]): number {
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.cte, (counts.get(r.cte) ?? 0) + 1);
  return Array.from(counts.values()).filter((count) => count > 1).length;
}
