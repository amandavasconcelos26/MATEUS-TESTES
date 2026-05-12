export type ReportSource = "ATUA" | "GW";

export type AuditStatus =
  | "OK"
  | "Divergente"
  | "Falta ATUA"
  | "Falta GW"
  | "Erro de Extração"
  | "Revisão Manual"
  | "Duplicidade";

export type PdfTextItem = {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfLine = {
  page: number;
  y: number;
  text: string;
  items: PdfTextItem[];
};

export type AuditRecord = {
  cte: string;
  source: ReportSource;
  page: number;
  empresaValor: number | null;
  motoristaValor: number | null;
  margemGW?: number | null;
  campoEmpresa: string;
  campoMotorista: string;
  confidence: number;
  rawLine: string;
  warnings: string[];
};

export type AuditRow = {
  cte: string;
  status: AuditStatus;
  empresaATUA: number | null;
  empresaGW: number | null;
  diferencaEmpresa: number | null;
  motoristaATUA: number | null;
  motoristaGW: number | null;
  diferencaMotorista: number | null;
  margemGW: number | null;
  campoMotoristaGW: string | null;
  pageATUA: number | null;
  pageGW: number | null;
  confidence: number;
  observacao: string;
};

export type AuditSummary = {
  totalATUA: number;
  totalGW: number;
  encontradosAmbos: number;
  faltantesGW: number;
  faltantesATUA: number;
  divergenciasReais: number;
  diferencaEmpresa: number;
  diferencaMotorista: number;
  errosExtracao: number;
  revisaoManual: number;
  duplicidades: number;
  paginasATUA: number;
  paginasGW: number;
  tempoProcessamentoMs: number;
  metodo: "Código determinístico" | "Gemini fallback";
  confiancaMedia: number;
};

export type AuditOutput = {
  summary: AuditSummary;
  rows: AuditRow[];
  atuaRecords: AuditRecord[];
  gwRecords: AuditRecord[];
  validations: string[];
};
