# FreteVision Auditoria de Frete

Sistema Vercel-ready para auditar dois PDFs de frete sem usar Gemini como método principal.

## O que o sistema faz

- Lê PDF ATUA/MaisFrete pelo navegador usando `pdfjs-dist`.
- Lê PDF GW Sistemas pelo navegador usando `pdfjs-dist`.
- Reconstrói linhas por posição X/Y do PDF.
- Normaliza CTE removendo zeros à esquerda.
- Compara Empresa ATUA x Valor frete GW.
- Compara Motorista ATUA x Vl Carreteiro Líquido GW.
- Nunca usa Resultado ou Margem como Motorista GW.
- Nunca usa Peso ou CTE como valor financeiro do ATUA.
- Não calcula lacunas sequenciais de CTE.
- Gera prévia de extração, resumo, tabela detalhada, CSV e JSON técnico.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois abra o endereço local mostrado no terminal.

## Como subir na Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Na Vercel, clique em **Add New Project**.
3. Selecione o repositório.
4. A Vercel deve detectar Vite automaticamente.
5. Build command: `npm run build`
6. Output directory: `dist`
7. Deploy.

## Como testar com os PDFs sintéticos

Use os arquivos que foram criados para teste:

- `01_ATUA_TESTE_AUDITORIA.pdf`
- `02_GW_TESTE_AUDITORIA.pdf`

Resultado esperado:

| Indicador | Esperado |
| --- | ---: |
| Total ATUA | 8 |
| Total GW | 8 |
| Encontrados em ambos | 7 |
| Falta GW | 1 |
| Falta ATUA | 1 |
| Divergências reais | 5 |
| Diferença Empresa | R$ 0,00 |
| Diferença Motorista | R$ 41.769,65 |

CTEs esperados:

| CTE | Status esperado | Observação |
| --- | --- | --- |
| 1752 | OK | Empresa e motorista iguais |
| 1753 | Divergente | Motorista diferente |
| 1754 | OK | Empresa e motorista iguais |
| 1818 | Divergente | Motorista diferente |
| 2503 | Divergente | Motorista GW correto = R$ 0,00 |
| 2517 | Divergente | Motorista GW correto = R$ 0,00 |
| 2530 | Divergente | Motorista GW correto = R$ 0,00 |
| 3001 | Falta GW | Existe só no ATUA |
| 3002 | Falta ATUA | Existe só no GW |

## Regra crítica

No GW, o campo Motorista GW deve aparecer como:

```text
Vl Carreteiro Líquido
```

Se aparecer `Resultado`, `Margem`, `Frete Motorista` ou outro campo, a extração está errada.

## Estrutura principal

```text
src/lib/pdf.ts       Extrai texto e posições do PDF
src/lib/parsers.ts   Parser ATUA e GW
src/lib/audit.ts     Motor de comparação
src/lib/format.ts    Normalização de CTE, dinheiro e percentual
src/lib/export.ts    Exportação CSV/JSON
src/lib/engine.ts    Fluxo completo da auditoria
src/App.tsx          Interface
```

## Observação importante

Este é um parser determinístico inicial. Para PDFs muito desalinhados, escaneados ou com layout diferente, o ideal é marcar como Revisão Manual ou acionar um fallback de IA. O Gemini não foi incluído como método principal.
