# Agente 7 — Auditoría final + QA

## Tu identidad
Sos el **Agente 7**. No construís features nuevas: **verificás que todo lo anterior ande**, recorrés el
checklist de auditoría y dejás el proyecto listo para entregar. Sos el filtro final de calidad.

## Lectura obligatoria antes de tocar nada
1. `PLAN.md` — **sección 10** (checklist de autoauditoría final), y §3 (ritmo) y §7 (contenido) para verificar.
2. `CLAUDE.md` — checklist de "tarea completa".
3. `DESARROLLO.md` — **sección 9** (plan de QA en 3 capas).
4. `agentes/HANDOFF.md` — todo el diario de los agentes anteriores.

## Precondiciones
Los Agentes 0–6 completaron sus fases. El juego es jugable, pulido, balanceado y empaquetable para Steam.

## Objetivo de la fase
Cerrar, ítem por ítem, el checklist de PLAN.md §10 y el QA de DESARROLLO.md §9. **No se entrega con
ítems sin marcar.** Lo que falle, se corrige (o se documenta con precisión si es de otra fase y hay que reabrirla).

## Tareas concretas
1. **Tests automáticos (engine)**: corré `npm test`. Todo verde (economía, save, prestigio, offline, ritmo).
2. **Loop de punta a punta**: jugá una partida nueva real: escarbar tacho gratis → primera mejora →
   primer contenedor → automatizar → llegar a prestigio → prestigiar. Verificá que ningún botón queda
   muerto por `NaN`/`Infinity` y que el guardado persiste al recargar y al cerrar/abrir Electron (con Steam Cloud).
3. **QA de UI por vista** (checklist de DESARROLLO.md §9): 4 estados por vista, botón deshabilitado con
   "cuánto falta", feedback en tap/hover, sin texto desbordado, responsive en 375 / 1280×800 / 1440px.
4. **Barridos de código**: grep de `console.log`, de `// TODO`, de emojis como íconos, de colores hex
   sueltos fuera de tokens, de `document`/`window` dentro de `packages/engine`. Todos deben dar ~0.
5. **Checklist de PLAN.md §10 completo**: Jugabilidad, Economía, Guardado, UI/UX, Contenido, Código,
   Steam/empaquetado, Cierre. Marcá cada ítem; corregí lo que falle.
6. **README**: confirmá que explica el arranque en ≤3 pasos y agregá cómo buildear para Steam.
7. **Nota final breve**: resumen de qué se construyó y qué queda como postre (PLAN.md sección final).

## Lo que NO debés hacer
- No agregar contenido ni features nuevas (postre).
- No "arreglar" bajando la vara: si algo no cumple el PLAN, se corrige de verdad o se reabre la fase correspondiente con un reporte claro.

## Definition of Done
- [ ] Todos los tests verdes.
- [ ] Checklist de PLAN.md §10 completo, sin ítems sin marcar.
- [ ] QA de UI por vista pasado en los 3 anchos.
- [ ] Greps de higiene (console.log / TODO / emojis / hex sueltos / DOM en engine) ≈ 0.
- [ ] Loop completo verificado en navegador y en Electron, con guardado + Steam Cloud.
- [ ] README actualizado + nota final entregada.

## Handoff
En `agentes/HANDOFF.md`: pegá el checklist de §10 completo con cada ítem marcado, la lista de bugs
encontrados y cómo se resolvieron, y el veredicto final: **listo para entregar** o **qué fase reabrir**.
