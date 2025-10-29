const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const mockAI = require('./mockAI');
const initialGen = require('./initialCharacters');

const VITRINA = { width: 900, height: 400 };
const PHYSICS_TICK_MS = 100; // física cada 100ms
const AI_INTERVAL_MS = 10000; // invocar IA cada 10s por personaje

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

const server = http.createServer(app);
const io = new Server(server);

let running = true;

// Generar 10 personajes iniciales
let characters = initialGen.generate(10, VITRINA.width, VITRINA.height);

// API admin endpoints
app.get('/api/characters', (req, res) => {
  res.json(characters);
});
app.post('/api/characters/:id', (req, res) => {
  const id = req.params.id;
  const idx = characters.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  const allowed = ['name', 'age', 'profession', 'traits', 'presentation', 'color', 'palette', 'accessory', 'scale'];
  for (const k of allowed) if (req.body[k] !== undefined) characters[idx][k] = req.body[k];
  res.json(characters[idx]);
});
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename=characters.json');
  res.json(characters);
});

// WebSocket
io.on('connection', (socket) => {
  console.log('cliente conectado', socket.id);
  socket.emit('init', { vitrWidth: VITRINA.width, vitrHeight: VITRINA.height, characters });
  socket.on('admin:pause', () => { running = false; });
  socket.on('admin:resume', () => { running = true; });
  socket.on('admin:setAction', ({ id, action }) => {
    const c = characters.find(x => x.id === id);
    if (c) {
      c.currentAction = action;
      c.lastAI = Date.now();
      if (action.type === 'speak' || action.text) {
        c.speech = { text: action.text || '', until: Date.now() + (action.duration || 4000) };
      }
      // set animation from admin-forced action
      setAnimationFromAction(c, action);
    }
  });
  socket.on('admin:updateCharacter', ({ id, updates }) => {
    const idx = characters.findIndex(c => c.id === id);
    if (idx !== -1) {
      Object.assign(characters[idx], updates);
    }
  });
});

// Utility: clamp
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function setAnimationFromAction(c, action) {
  if (!c.animation) c.animation = { type: 'idle', frame: 0, lastAt: Date.now() };
  switch (action.type) {
    case 'move':
      c.animation.type = 'walk';
      break;
    case 'idle':
      c.animation.type = 'idle';
      break;
    case 'speak':
      c.animation.type = 'talk';
      break;
    case 'interact':
      c.animation.type = 'talk';
      break;
    case 'changeState':
      // keep current animation
      break;
    default:
      if (action.jump) c.animation.type = 'jump';
      break;
  }
  c.animation.lastAt = Date.now();
}

// Physics loop
setInterval(() => {
  if (!running) return;
  const dt = PHYSICS_TICK_MS / 1000;
  const gravity = 800; // px/s^2 (scaled)
  for (const c of characters) {
    // apply action effects on velocities (some continuous movement)
    if (c.currentAction && c.currentAction.type === 'move') {
      const dir = c.currentAction.dir || 0;
      const speed = c.currentAction.speed || 60;
      c.vx = dir * speed;
      if (c.currentAction.jump && c.onGround) {
        c.vy = -300; // jump impulse
        c.onGround = false;
      }
    } else {
      // friction
      c.vx *= 0.9;
      if (Math.abs(c.vx) < 1) c.vx = 0;
    }
    // physics
    c.vy += gravity * dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    // collisions with ground
    if (c.y + c.h/2 >= VITRINA.height - 0) {
      c.y = VITRINA.height - c.h/2;
      c.vy = 0;
      c.onGround = true;
      // if landed, and was jumping, return to idle/walk
      if (c.animation && c.animation.type === 'jump') {
        c.animation.type = (c.vx !== 0) ? 'walk' : 'idle';
        c.animation.lastAt = Date.now();
      }
    }
    // walls
    if (c.x - c.w/2 < 0) { c.x = c.w/2; c.vx = 0; }
    if (c.x + c.w/2 > VITRINA.width) { c.x = VITRINA.width - c.w/2; c.vx = 0; }
    // action duration expiration
    if (c.currentAction && c.currentAction._expiresAt && Date.now() > c.currentAction._expiresAt) {
      c.currentAction = { type: 'idle' };
      // update animation to idle
      if (!c.animation) c.animation = { type: 'idle', frame: 0, lastAt: Date.now() };
      c.animation.type = 'idle';
      c.animation.lastAt = Date.now();
    }
    // speech expiration
    if (c.speech && c.speech.until && Date.now() > c.speech.until) c.speech = null;
  }
  // broadcast state frequently
  io.emit('state', { characters, time: Date.now() });
}, PHYSICS_TICK_MS);

// AI scheduler: every AI_INTERVAL_MS generate proposals for all characters and resolve
setInterval(async () => {
  if (!running) return;
  // Build context: simple positions and states
  const contextSnapshot = characters.map(c => ({
    id: c.id, x: c.x, y: c.y, state: c.state, currentAction: c.currentAction
  }));
  // collect proposals
  const proposals = {};
  for (const c of characters) {
    try {
      const action = await mockAI.decide(c, contextSnapshot);
      proposals[c.id] = action;
    } catch (e) {
      console.error('mockAI error', e);
      proposals[c.id] = { type: 'idle' };
    }
  }
  // set expiry times
  for (const id in proposals) {
    const p = proposals[id];
    if (!p) continue;
    p._expiresAt = Date.now() + (p.duration || 8000);
  }
  // simple mutual-interaction resolution
  for (const id in proposals) {
    const p = proposals[id];
    if (!p) continue;
    if (p.type === 'interact' && p.targetId) {
      const targetProposal = proposals[p.targetId];
      const targetChar = characters.find(x => x.id === p.targetId);
      if (targetProposal && targetProposal.type === 'interact' && targetProposal.targetId === id) {
        // mutual -> both accepted, ensure speech exists
        if (!p.text) p.text = '¡Hola!';
        if (!targetProposal.text) targetProposal.text = '¡Hola!';
      } else {
        // if target busy, degrade to approach (move)
        if (targetChar && targetChar.state === 'busy') {
          p.type = 'move';
          const owner = characters.find(c => c.id === id);
          if (owner && targetChar) {
            p.dir = targetChar.x < owner.x ? -1 : 1;
          } else {
            p.dir = 0;
          }
          p.speed = 40;
          delete p.targetId;
        }
      }
    }
  }
  // apply proposals to real characters
  for (const c of characters) {
    const p = proposals[c.id];
    if (!p) continue;
    c.currentAction = p;
    c.lastAI = Date.now();
    // set animation based on action
    setAnimationFromAction(c, p);
    if (p.type === 'speak' || p.text) {
      c.speech = { text: p.text || '', until: Date.now() + (p.duration || 4000) };
    }
    if (p.type === 'changeState' && p.state) {
      c.state = p.state;
    }
    if (p.type === 'interact' && p.targetId) {
      c.state = 'busy';
      // set busy until action expires
      setTimeout(() => { c.state = 'idle'; }, p.duration || 5000);
    }
  }

  // notify clients that new actions are applied
  io.emit('ai:tick', { time: Date.now() });
}, AI_INTERVAL_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
