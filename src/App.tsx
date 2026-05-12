import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { processAuditFiles } from "./lib/engine";
import { buildAuditCsv, downloadTextFile } from "./lib/export";
import type { AuditOutput, AuditRow } from "./lib/types";
import { formatBRL, formatNumber, formatPercent } from "./lib/format";

function FileInputCard({
  title,
  subtitle,
  file,
  onChange
}: {
  title: string;
  subtitle: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="file-card">
      <div className="file-icon">
        <UploadCloud size={26} />
      </div>
      <div className="file-content">
        <strong>{title}</strong>
        <span>{subtitle}</span>
        <small>{file ? file.name : "Selecionar PDF"}</small>
      </div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

function SummaryCard({ label, value, tone = "normal" }: { label: string; value: string | number; tone?: "normal" | "ok" | "warn" | "bad" }) {
  return (
    <div className={`summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function statusClass(status: string) {
  if (status === "OK") return "status ok";
  if (status === "Divergente") return "status bad";
  if (status.includes("Falta")) return "status warn";
  return "status neutral";
}

function AuditTable({ rows }: { rows: AuditRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CTE</th>
            <th>Status</th>
            <th>Emp. ATUA</th>
            <th>Emp. GW</th>
            <th>Dif. Emp.</th>
            <th>Mot. ATUA</th>
            <th>Mot. GW</th>
            <th>Dif. Mot.</th>
            <th>Margem GW</th>
            <th>Campo Mot. GW</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cte}>
              <td className="mono">{row.cte}</td>
              <td><span className={statusClass(row.status)}>{row.status}</span></td>
              <td>{formatBRL(row.empresaATUA)}</td>
              <td>{formatBRL(row.empresaGW)}</td>
              <td>{formatBRL(row.diferencaEmpresa)}</td>
              <td>{formatBRL(row.motoristaATUA)}</td>
              <td>{formatBRL(row.motoristaGW)}</td>
              <td>{formatBRL(row.diferencaMotorista)}</td>
              <td>{formatPercent(row.margemGW)}</td>
              <td>{row.campoMotoristaGW ?? "-"}</td>
              <td className="obs">{row.observacao || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExtractionPreview({ output }: { output: AuditOutput }) {
  const records = useMemo(() => [...output.atuaRecords, ...output.gwRecords].slice(0, 60), [output]);
  return (
    <div className="panel">
      <div className="panel-title">
        <FileText size={18} />
        <h2>Prévia da extração</h2>
      </div>
      <div className="table-wrap small">
        <table>
          <thead>
            <tr>
              <th>Fonte</th>
              <th>CTE</th>
              <th>Página</th>
              <th>Empresa</th>
              <th>Campo Empresa</th>
              <th>Motorista</th>
              <th>Campo Motorista</th>
              <th>Margem</th>
              <th>Confiança</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr key={`${r.source}-${r.cte}-${idx}`}>
                <td>{r.source}</td>
                <td className="mono">{r.cte}</td>
                <td>{r.page}</td>
                <td>{formatBRL(r.empresaValor)}</td>
                <td>{r.campoEmpresa}</td>
                <td>{formatBRL(r.motoristaValor)}</td>
                <td>{r.campoMotorista}</td>
                <td>{r.source === "GW" ? formatPercent(r.margemGW) : "-"}</td>
                <td>{formatNumber(r.confidence, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [atuaFile, setAtuaFile] = useState<File | null>(null);
  const [gwFile, setGwFile] = useState<File | null>(null);
  const [output, setOutput] = useState<AuditOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!atuaFile || !gwFile) {
      setError("Selecione os dois PDFs para auditar.");
      return;
    }
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const result = await processAuditFiles(atuaFile, gwFile);
      setOutput(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro inesperado ao processar os PDFs.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!output) return;
    downloadTextFile("auditoria-fretevision.csv", buildAuditCsv(output), "text/csv;charset=utf-8");
  }

  function downloadJson() {
    if (!output) return;
    downloadTextFile("auditoria-fretevision.json", JSON.stringify(output, null, 2), "application/json;charset=utf-8");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <div className="eyebrow"><ShieldCheck size={16} /> FreteVision</div>
          <h1>Auditoria de Frete por PDF</h1>
          <p>
            Leitura determinística sem Gemini como método principal. Cruza CTE normalizado,
            compara Empresa e Motorista e protege contra erro de coluna.
          </p>
        </div>
        <div className="hero-badge">
          <CheckCircle2 size={20} />
          <span>Motorista GW = Vl Carreteiro Líquido</span>
        </div>
      </section>

      <section className="upload-grid">
        <FileInputCard
          title="PDF ATUA / MaisFrete"
          subtitle="Relatório Detalhado do CTRC"
          file={atuaFile}
          onChange={setAtuaFile}
        />
        <FileInputCard
          title="PDF GW Sistemas"
          subtitle="Análise de CTe/NFS com impostos"
          file={gwFile}
          onChange={setGwFile}
        />
      </section>

      <section className="actions">
        <button onClick={run} disabled={loading || !atuaFile || !gwFile}>
          {loading ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
          {loading ? "Processando..." : "Executar auditoria"}
        </button>
        {output && (
          <>
            <button className="secondary" onClick={downloadCsv}><Download size={18} /> Baixar CSV</button>
            <button className="secondary" onClick={downloadJson}><Download size={18} /> Baixar JSON técnico</button>
          </>
        )}
      </section>

      {error && (
        <div className="error-box">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {output && (
        <>
          <section className="summary-grid">
            <SummaryCard label="Total ATUA" value={output.summary.totalATUA} />
            <SummaryCard label="Total GW" value={output.summary.totalGW} />
            <SummaryCard label="Encontrados" value={output.summary.encontradosAmbos} tone="ok" />
            <SummaryCard label="Falta GW" value={output.summary.faltantesGW} tone="warn" />
            <SummaryCard label="Falta ATUA" value={output.summary.faltantesATUA} tone="warn" />
            <SummaryCard label="Divergências" value={output.summary.divergenciasReais} tone="bad" />
            <SummaryCard label="Dif. Empresa" value={formatBRL(output.summary.diferencaEmpresa)} />
            <SummaryCard label="Dif. Motorista" value={formatBRL(output.summary.diferencaMotorista)} tone="bad" />
            <SummaryCard label="Confiança média" value={formatNumber(output.summary.confiancaMedia, 2)} />
            <SummaryCard label="Tempo" value={`${output.summary.tempoProcessamentoMs} ms`} />
          </section>

          <div className="panel">
            <div className="panel-title">
              <ShieldCheck size={18} />
              <h2>Validações críticas executadas</h2>
            </div>
            <ul className="validations">
              {output.validations.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>

          <ExtractionPreview output={output} />

          <div className="panel">
            <div className="panel-title">
              <FileText size={18} />
              <h2>Resultado detalhado</h2>
            </div>
            <AuditTable rows={output.rows} />
          </div>
        </>
      )}
    </main>
  );
}
