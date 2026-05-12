# Instruções para Google Studio / IA codar ou ajustar este sistema

Implemente ou mantenha este projeto como um sistema de auditoria logística de fretes para Vercel, usando React + Vite + TypeScript.

## Regras absolutas

- Não usar Gemini como método principal de leitura.
- Usar leitura determinística com PDF.js / pdfjs-dist.
- Ler todas as páginas dos PDFs.
- Extrair texto com posição X/Y.
- Reconstruir linhas por coordenada Y.
- Normalizar CTE removendo zeros à esquerda.
- ATUA/MaisFrete: Empresa = Frete Empresa; Motorista = Frete Motorista.
- GW: Empresa = Valor frete; Motorista = Vl Carreteiro Líquido.
- Nunca usar Resultado, Margem, Valor frete, Frete tab., PIS, COFINS, IR ou CSSL como Motorista GW.
- Se Vl Carreteiro Líquido do GW for R$ 0,00, Motorista GW deve ser R$ 0,00.
- Nunca usar Peso como Empresa ATUA.
- Nunca usar CTE como Motorista ATUA.
- Não criar lacunas sequenciais entre CTEs.
- Faltante GW = existe no ATUA e não existe no GW.
- Faltante ATUA = existe no GW e não existe no ATUA.

## Critério de aceite para os PDFs de teste

Total ATUA = 8
Total GW = 8
Encontrados em ambos = 7
Falta GW = 1
Falta ATUA = 1
Divergências reais = 5
Diferença Empresa = R$ 0,00
Diferença Motorista = R$ 41.769,65

Se não bater com esses valores, a extração ainda está errada.
