# PUNTOS A MEJORAR — Ronda 5 (brief para el agente planificador)

> **VITAL.** Reportado jugando el build de escritorio (rama de ronda 4 ya mergeada). Un agente
> **Opus 4.8 high** determina causas y arma el plan; **Sonnet 5.0 medium** ejecuta.
>
> **Contexto de decisión — leer primero.** Esta es la **quinta ronda** de bugs del canvas de escarbado.
> El enfoque actual (dos canvas + textura de suciedad + completar por **% de área rascada**, con
> compuertas de distancia/anomalía) se viene rompiendo repetidamente (damero transparente, nombres
> faltantes, escarbado de un click, preview de objetos). Además el Problema 3 de abajo **cambia la
> condición de completado de raíz**. Por eso: **el plan debería evaluar seriamente REHACER la mecánica
> de escarbado de forma limpia** en vez de otro parche. Modelo objetivo (ver Problema 3): suciedad
> **opaca** que tapa todo desde el inicio → rascar **destapa cada objeto** → se completa cuando están
> **todos destapados** (no por % de área). Ese modelo elimina el umbral por área y sus compuertas
> frágiles. Si el Opus decide parchar en vez de rehacer, igual debe cumplir los 3 criterios de abajo.

---

## Problema 1 — Se ven los objetos ANTES de rascar (la suciedad no tapa en el estado inicial)

**Síntoma (capturas):** al entrar a la pantalla de escarbar, **antes de cualquier click**, se ven los
objetos (círculos + nombre, ej. "Servilleta usada") con el prompt "ARRASTRÁ PARA ESCARBAR". Recién
**después del primer click** aparece la "arena" (la capa de suciedad). O sea, en el estado idle/preview
la suciedad no está tapando.

**Verificado (contexto, no conclusión):** `DigCanvas.start()` llama `drawBottomLayer()` y luego
`drawTopLayer()`, así que en teoría la suciedad se pinta al iniciar — pero en pantalla los objetos se
ven igual hasta el primer click. Reproducir por qué la capa de arriba no tapa en idle (¿la suciedad se
pinta pero es transparente hasta interactuar?, ¿el dig recién arranca `start()` en el primer click?,
¿stacking de los dos canvas?).

**Deseado:** desde que se ve la pantalla de escarbado (idle incluido), la suciedad **tapa por completo**
los objetos. **Nunca** se ve un objeto hasta que se lo rasca encima.

---

## Problema 2 — Objetos sin nombre tras rascar (persiste, ya "arreglado" 2 veces)

**Síntoma (captura):** tras rascar un poco, algunos objetos aparecen como círculo **sin su nombre**
(ej. dos círculos, uno dice "Servilleta usada", el otro nada).

**Verificado:** `drawBottomLayer()` dibuja círculo → ícono (carga async) → nombre, y ya tiene un
`digGeneration` para descartar cargas tardías (fix de ronda 2). Aun así reaparece. Reproducir y
encontrar la causa real (¿el redibujo async del ícono tapa el nombre?, ¿el nombre no se dibuja para
ciertos ítems/posiciones?, ¿el "momento de revelado" de 650ms de ronda 4 lo pisa?).

**Deseado:** cada objeto revelado muestra **siempre** su nombre, sin excepción.

---

## Problema 3 — Completar SOLO al destapar todos los objetos (no por % de área) — CAMBIO DE MECÁNICA

**Qué se pide:** hoy el escarbado se completa y **reclama las recompensas al rascar cierto % de la
arena**, aunque hayas destapado pocos objetos o ninguno. Se quiere que el escarbado **termine solo
cuando se destaparon TODAS las recompensas/objetos** que tiene ese contenedor — es decir, hay que
rascar encima de cada objeto para revelarlo, y recién cuando están todos a la vista, se completa.

**Verificado:** la condición actual es por área (`DigCanvas`: `fraction >= revealThreshold`), no por
objetos. Hay que reemplazarla por **tracking por objeto**: marcar cada objeto como "revelado" cuando la
suciedad sobre su posición quedó limpia, y completar cuando **todos** los objetos están revelados.

**Deseado:**
- Progreso = objetos revelados / total de objetos del contenedor (la barra de progreso refleja eso).
- Se completa **solo** al revelar el último objeto. No hay auto-reclamo por porcentaje.
- Caso trampa: la trampa es el único "objeto"; revelarla completa (mantener el feedback de trampa).
- Sigue valiendo: escarbar cuesta esfuerzo real y escala con resistencia/Fuerza (rondas anteriores); el
  único atajo válido es la automatización (robot), nunca el escarbado manual.
- Esto **reemplaza** el umbral por área y sus compuertas (distancia mínima / reparación de anomalía):
  con completado por-objeto, el bug del "un click" no puede existir (un click no destapa todos los objetos).

---

## Criterios de aceptación (no dejar ningún punto atrás)
- [ ] Antes de rascar (idle incluido) NO se ve ningún objeto: la suciedad tapa todo.
- [ ] Todo objeto revelado muestra su nombre, siempre.
- [ ] El escarbado se completa **solo** cuando se destaparon todos los objetos del contenedor; nunca por % de área.
- [ ] La barra de progreso mide objetos revelados / total.
- [ ] No queda el bug del "un click" ni parches sin rascar / a medias tras completar.
- [ ] Test de regresión que capture cada uno (suciedad opaca en idle, nombre siempre, completar solo con todos los objetos).

## Reglas
- Respetar "The Workshop" (PLAN.md §5.3): sin emojis, tokens en `tokens.css`, mobile-first + Steam Deck.
- No tocar la economía del engine (valor/rareza/roll de ítems siguen viniendo del engine). Esto es la
  **presentación/mecánica de revelado**, no las fórmulas.
- Verificar en `npm run desktop` real (Electron) además del smoke web, en 375 / 1280×800 / 1440.
- `npm test` + `npm run test:e2e` verdes. HANDOFF con causa raíz / decisión de rehacer vs parchar por problema.
