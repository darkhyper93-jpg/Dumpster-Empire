// Andamiaje temporal (Agente 0): confirma que el import map resuelve @dumpster/engine.
// El Agente 2 reemplaza esto por la inicialización real (engine + UI + loop).
import '@dumpster/engine';

document.getElementById('app').dataset.ready = 'true';
