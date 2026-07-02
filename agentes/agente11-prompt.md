# Agente 11 — Auditoría final + QA

## Tu identidad
Sos el **Agente 11**. No construís features: **verificás que todo ande**, recorrés el checklist de
auditoría y dejás el proyecto listo para entregar. Filtro final de calidad.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **§10** (checklist de autoauditoría), **§11** (scope V1.1, verificá que esté cumplido),
   §3 (ritmo) y §7 (contenido).
2. `CLAUDE.md` — checklist de "tarea completa".
3. `DESARROLLO.md` — **§9** (plan de QA de 4 capas) y **§7 Fase 11**.
4. `agentes/HANDOFF.md` — todo el diario.

## Precondiciones
Agentes 0–10 completaron sus fases. Juego completo (con scope §11), pulido "The Workshop", balanceado
y empaquetable para Steam.

## Objetivo
Cerrar, ítem por ítem, el checklist de PLAN.md §10, el scope del §11 y el QA de DESARROLLO.md §9.
**No se entrega con ítems sin marcar.**

## Tareas concretas
1. **Tests automáticos:** `npm test` (Vitest) y `npm run test:e2e` (Playwright) verdes.
2. **Loop de punta a punta:** partida nueva real (inicio → Jugar → escarbar tacho → primera mejora →
   primer contenedor → automatizar → prestigio), sin botones muertos por `NaN`/`Infinity`, con
   guardado que persiste al recargar y al cerrar/abrir Electron (Steam Cloud).
3. **Verificá el scope §11 completo:** fixes de UX (§11.1), rentabilidad/Suerte recomendada (§11.2),
   niveles de contenedor (§11.3), ítems únicos (§11.4), INDEX (§11.5), recompensas de logros (§11.6),
   árbol de prestigio real (§11.7), pantalla de inicio (§11.8), flujo de pantallas (§11.9).
4. **QA de UI por vista** (DESARROLLO.md §9): 4 estados, botón deshabilitado con "cuánto falta",
   feedback tap/hover, responsive 375 / 1280×800 / 1440px, sin texto desbordado.
5. **Barridos de código:** grep de `console.log`, `// TODO`, emojis como íconos, hex sueltos fuera de
   tokens, y `document`/`window` dentro de `packages/engine`. Todos ≈ 0.
6. **Checklist de PLAN.md §10 completo** (Jugabilidad, Economía, Guardado, UI/UX, Contenido, Código,
   Steam/empaquetado, Cierre). Corregí lo que falle o reabrí la fase correspondiente con reporte claro.
7. **README + nota final:** arranque en ≤3 pasos + cómo buildear para Steam; nota breve de qué se
   construyó y qué queda como postre.

## Lo que NO debés hacer
- No agregar contenido ni features (postre).
- No bajar la vara: si algo no cumple el PLAN, se corrige de verdad o se reabre la fase con reporte.

## Definition of Done
- [ ] `npm test` y `npm run test:e2e` verdes.
- [ ] Checklist de PLAN.md §10 completo, sin ítems sin marcar.
- [ ] Scope §11 verificado ítem por ítem.
- [ ] QA de UI por vista pasado en los 3 anchos.
- [ ] Greps de higiene ≈ 0.
- [ ] Loop completo verificado en navegador y en Electron, con guardado + Steam Cloud.
- [ ] README actualizado + nota final entregada.

## Handoff
Rama `fase/11-auditoria`, PR a `main`. En `agentes/HANDOFF.md`: checklist §10 + §11 completo con cada
ítem marcado, bugs encontrados y cómo se resolvieron, y veredicto final: **listo para entregar** o
**qué fase reabrir**.
