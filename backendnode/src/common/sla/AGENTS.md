# common/sla

**Propósito:** SlaCalculatorService — calculo de dias UTEIS (FIN-10, 5 dias uteis para resposta do financeiro).

**Dependências:**
- nenhuma (utilidade pura)

**Mapa de Arquivos:**
- [sla-calculator.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/sla/sla-calculator.service.ts) — addBusinessDays + businessDaysBetween + isWeekend + isHoliday
- [holidays-br.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/sla/holidays-br.ts) — lista BR 2026-2028 (inclui Pascoa via algoritmo de Gauss)
- [sla-calculator.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/sla/sla-calculator.service.spec.ts) — 12 testes
