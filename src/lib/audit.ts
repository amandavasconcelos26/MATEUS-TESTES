import type { AuditOutput, AuditRecord, AuditRow, AuditSummary } from "./types";
import { absDiff, withinTolerance } from "./format";
import { countDuplicatedCTEs } from "./parsers";

const TOLERANCE = 0.05;

function firstByCTE(records: AuditRecord[]): Map<string, AuditRecord> {
  const map = new Map<string, AuditRecord>();
  for (const record of records) {
    if (!map.has(record.cte)) map.set(record.cte, record);
  }
  return map;
}

function duplicatedSet(records: AuditRecord[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.cte, (counts.get(r.cte) ?? 0) + 1);
  return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([cte]) => cte));
}

export function runAudit(params: {
  atuaRecords: AuditRecord[];
  gwRecords: AuditRecord[];
  paginasATUA: number;
  paginasGW: number;
  startedAt: number;
}): AuditOutput {
  const { atuaRecords, gwRecords, paginasATUA, paginasGW, startedAt } = params;
  const atuaMap = firstByCTE(atuaRecords);
  const gwMap = firstByCTE(gwRecords);
  const duplicates = new Set([...duplicatedSet(atuaRecords), ...duplicatedSet(gwRecords)]);
  const allCtes = Array.from(new Set([...atuaMap.keys(), ...gwMap.keys()])).sort((a, b) => Number(a) - Number(b));
  const rows: AuditRow[] = [];

  for (const cte of allCtes) {
    const atua = atuaMap.get(cte) ?? null;
    const gw = gwMap.get(cte) ?? null;

    if (duplicates.has(cte)) {
      rows.push({
        cte,
        status: "Duplicidade",
        empresaATUA: atua?.empresaValor ?? null,
        empresaGW: gw?.empresaValor ?? null,
        diferencaEmpresa: null,
        motoristaATUA: atua?.motoristaValor ?? null,
        motoristaGW: gw?.motoristaValor ?? null,
        diferencaMotorista: null,
        margemGW: gw?.margemGW ?? null,
        campoMotoristaGW: gw?.campoMotorista ?? null,
        pageATUA: atua?.page ?? null,
        pageGW: gw?.page ?? null,
        confidence: Math.min(atua?.confidence ?? 1, gw?.confidence ?? 1),
        observacao: "CTE duplicado em pelo menos um relatório. Não foi somado automaticamente. Revisar manualmente."
      });
      continue;
    }

    if (!atua && gw) {
      rows.push({
        cte,
        status: "Falta ATUA",
        empresaATUA: null,
        empresaGW: gw.empresaValor,
        diferencaEmpresa: null,
        motoristaATUA: null,
        motoristaGW: gw.motoristaValor,
        diferencaMotorista: null,
        margemGW: gw.margemGW ?? null,
        campoMotoristaGW: gw.campoMotorista,
        pageATUA: null,
        pageGW: gw.page,
        confidence: gw.confidence,
        observacao: "CTE existe no GW e não existe no ATUA."
      });
      continue;
    }

    if (atua && !gw) {
      rows.push({
        cte,
        status: "Falta GW",
        empresaATUA: atua.empresaValor,
        empresaGW: null,
        diferencaEmpresa: null,
        motoristaATUA: atua.motoristaValor,
        motoristaGW: null,
        diferencaMotorista: null,
        margemGW: null,
        campoMotoristaGW: null,
        pageATUA: atua.page,
        pageGW: null,
        confidence: atua.confidence,
        observacao: "CTE existe no ATUA e não existe no GW."
      });
      continue;
    }

    if (!atua || !gw) continue;

    const diffEmpresa = absDiff(atua.empresaValor, gw.empresaValor);
    const diffMotorista = absDiff(atua.motoristaValor, gw.motoristaValor);
    const fieldError = gw.campoMotorista !== "Vl Carreteiro Líquido";
    const missingRequired =
      atua.empresaValor === null ||
      atua.motoristaValor === null ||
      gw.empresaValor === null ||
      gw.motoristaValor === null;
    const lowConfidence = Math.min(atua.confidence, gw.confidence) < 0.75;

    let status: AuditRow["status"] = "OK";
    const notes: string[] = [];

    if (fieldError || missingRequired) {
      status = "Erro de Extração";
      if (fieldError) notes.push("Motorista GW não veio de Vl Carreteiro Líquido.");
      if (missingRequired) notes.push("Campo obrigatório não identificado.");
    } else if (lowConfidence) {
      status = "Revisão Manual";
      notes.push("Confiança de extração abaixo de 0,75.");
    } else if (!withinTolerance(diffEmpresa, TOLERANCE) || !withinTolerance(diffMotorista, TOLERANCE)) {
      status = "Divergente";
    }

    const warnings = [...atua.warnings, ...gw.warnings];
    if (warnings.length) notes.push(...warnings);

    rows.push({
      cte,
      status,
      empresaATUA: atua.empresaValor,
      empresaGW: gw.empresaValor,
      diferencaEmpresa: diffEmpresa,
      motoristaATUA: atua.motoristaValor,
      motoristaGW: gw.motoristaValor,
      diferencaMotorista: diffMotorista,
      margemGW: gw.margemGW ?? null,
      campoMotoristaGW: gw.campoMotorista,
      pageATUA: atua.page,
      pageGW: gw.page,
      confidence: Math.min(atua.confidence, gw.confidence),
      observacao: notes.join(" | ")
    });
  }

  const divergentes = rows.filter((r) => r.status === "Divergente");
  const confidenceValues = [...atuaRecords, ...gwRecords].map((r) => r.confidence);
  const confiancaMedia = confidenceValues.length
    ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length
    : 0;

  const summary: AuditSummary = {
    totalATUA: atuaMap.size,
    totalGW: gwMap.size,
    encontradosAmbos: Array.from(atuaMap.keys()).filter((cte) => gwMap.has(cte)).length,
    faltantesGW: rows.filter((r) => r.status === "Falta GW").length,
    faltantesATUA: rows.filter((r) => r.status === "Falta ATUA").length,
    divergenciasReais: divergentes.length,
    diferencaEmpresa: divergentes.reduce((sum, r) => sum + (r.diferencaEmpresa ?? 0), 0),
    diferencaMotorista: divergentes.reduce((sum, r) => sum + (r.diferencaMotorista ?? 0), 0),
    errosExtracao: rows.filter((r) => r.status === "Erro de Extração").length,
    revisaoManual: rows.filter((r) => r.status === "Revisão Manual").length,
    duplicidades: countDuplicatedCTEs(atuaRecords) + countDuplicatedCTEs(gwRecords),
    paginasATUA,
    paginasGW,
    tempoProcessamentoMs: Math.round(performance.now() - startedAt),
    metodo: "Código determinístico",
    confiancaMedia
  };

  const validations = [
    "CTEs normalizados com remoção de zeros à esquerda.",
    "Falta GW = CTE existe no ATUA e não existe no GW.",
    "Falta ATUA = CTE existe no GW e não existe no ATUA.",
    "Empresa ATUA comparada com Valor frete GW.",
    "Motorista ATUA comparado exclusivamente com Vl Carreteiro Líquido GW.",
    "Resultado e Margem não são usados como Motorista GW.",
    "Peso e número do CTE não são usados como valores financeiros do ATUA.",
    "Lacunas sequenciais não são calculadas, pois CTE não precisa ser contínuo.",
    "Tolerância de arredondamento aplicada: R$ 0,05."
  ];

  return { summary, rows, atuaRecords, gwRecords, validations };
}
