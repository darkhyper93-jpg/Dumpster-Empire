# Agentes de desarrollo — Dumpster Empire

Esta carpeta contiene un **prompt por agente ejecutor** (Sonnet 5.0 medium). Cada agente cubre una
**fase** del roadmap de `DESARROLLO.md`. Se ejecutan **en orden**: un agente no empieza hasta que el
anterior cerró su Definition of Done (DoD).

## Cómo invocar un agente

Abrí un chat/sesión nueva y decile:

```
Sos el Agente N. Leé agentes/agenteN-prompt.md y ejecutá esa fase completa.
Antes de tocar código, leé PLAN.md, CLAUDE.md y DESARROLLO.md.
```

Ejemplo: *"Sos el Agente 2. Leé agentes/agente2-prompt.md y ejecutá esa fase."*

## Mapa de agentes → fases

| Agente | Fase | Título | Depende de |
|---|---|---|---|
| **0** | 0 | Andamiaje del monorepo | — |
| **1** | 1 | Engine puro + tests (el cerebro) | 0 |
| **2** | 2 | Juego jugable modular (portar prototipo) | 1 |
| **3** | 3 | Cerrar huecos de UI del PLAN | 2 |
| **4** | 4 | Pulido visual (fusión ámbar + Stitch) | 3 |
| **5** | 5 | Pase de balance | 4 |
| **6** | 6 | Empaquetado Steam (la caja) | 5 |
| **7** | 7 | Auditoría final + QA | 6 |

## Reglas comunes a todos los agentes

1. **Leé primero** `PLAN.md` (qué), `CLAUDE.md` (cómo) y `DESARROLLO.md` (dónde/orden). En conflicto
   de arquitectura, manda `DESARROLLO.md`.
2. **No avances de fase.** Hacé solo lo de tu prompt. Si detectás trabajo de otra fase, anotalo en el
   handoff, no lo hagas.
3. **Frontera dura engine↔UI:** `packages/engine` no toca el DOM; la UI no reimplementa fórmulas.
4. **Cero emojis como íconos.** SVG / Material Symbols.
5. **Sin `console.log`, sin `// TODO`, sin números mágicos sin documentar** en código que declarás terminado.
6. Al terminar, **actualizá `agentes/HANDOFF.md`** (creá el archivo si no existe) con: qué hiciste, qué
   archivos tocaste, decisiones `// DECISIÓN:` o `// AJUSTE:` importantes, y qué necesita saber el
   siguiente agente. Registrá decisiones de arquitectura/balance también en `DESARROLLO.md` §10.
7. **No declares tu fase terminada con tests rojos o DoD incompleto.**

## Handoff

`agentes/HANDOFF.md` es el diario compartido entre agentes. Cada agente lee lo que dejó el anterior
antes de empezar y escribe su propio bloque al terminar.
