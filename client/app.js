// Cliente: canvas rendering + panel admin + recepción de estado desde servidor via socket.io

const socket = io();

let VITRINA = { width: 900, height: 400 };
let characters = [];
let running = true;
let lastStateTime = 0;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
canvas.width = VITRINA.width;
canvas.height = VITRINA.height;

// animation definitions
const ANIM = {
  walk: { frames: 4, frameDuration: 150 },
  idle: { frames: 2, frameDuration: 400 },
  jump: { frames: 1, frameDuration: 1000 },
  talk: { frames: 2, frameDuration: 300 }
};

const WALK_OFFSETS = [
  {la:4, ra:-4, ll:-4, rl:4},
  {la:2, ra:-2, ll:-2, rl:2},
  {la:-4, ra:4, ll:4, rl:-4},
  {la:-2, ra:2, ll:2, rl:-2}
];

const IDLE_OFFSETS = [
  {la:0, ra:0, ll:0, rl:0, dy:-1},
  {la:2, ra:-2, ll:1, rl:-1, dy:1}
];

function draw() {
  // background
  ctx.fillStyle = '#1b2330';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // ground
  ctx.fillStyle = '#2e3a45';
  ctx.fillRect(0, canvas.height-40, canvas.width, 40);

  for (const c of characters) {
    drawCharacter(c);
    if (c.speech && c.speech.text) drawSpeech(c);
  }
}

function drawCharacter(c) {
  const now = Date.now();
  const anim = c.animation || { type: 'idle', frame: 0, lastAt: now };
  const animDef = ANIM[anim.type] || ANIM.idle;
  const elapsed = now - (anim.lastAt || now);
  const frame = Math.floor(elapsed / animDef.frameDuration) % animDef.frames;

  // compute offsets
  let offsets = {la:0, ra:0, ll:0, rl:0, dy:0};
  if (anim.type === 'walk') offsets = WALK_OFFSETS[frame];
  else if (anim.type === 'idle') offsets = IDLE_OFFSETS[frame % IDLE_OFFSETS.length];
  else if (anim.type === 'talk') offsets = IDLE_OFFSETS[frame % IDLE_OFFSETS.length];
  else if (anim.type === 'jump') offsets = {la:0,ra:0,ll:-6,rl:-6,dy:-6};

  // flip if moving left
  const facingLeft = (c.vx < -1) || (c.currentAction && c.currentAction.dir === -1);
  const scale = c.scale || 1;
  const w = c.w * scale;
  const h = c.h * scale;
  const cx = Math.round(c.x);
  const cy = Math.round(c.y - h/2 + (offsets.dy||0));

  // draw shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - w/2, c.y + h/2 - 6, w, 6);

  // helper to get offset with flip
  const ox = (v) => facingLeft ? -v : v;

  // draw legs
  const legW = Math.max(2, Math.floor(w*0.28));
  const legH = Math.max(4, Math.floor(h*0.22));
  ctx.fillStyle = c.palette.pants;
  // left leg
  ctx.fillRect(cx - Math.floor(w*0.35) + ox(offsets.ll), cy + Math.floor(h*0.78), legW, legH);
  // right leg
  ctx.fillRect(cx + Math.floor(w*0.07) + ox(offsets.rl), cy + Math.floor(h*0.78), legW, legH);

  // body
  ctx.fillStyle = c.palette.body;
  ctx.fillRect(cx - Math.floor(w*0.35), cy + Math.floor(h*0.28), Math.floor(w*0.7), Math.floor(h*0.5));

  // arms
  ctx.fillStyle = c.palette.body;
  const armW = Math.max(2, Math.floor(w*0.2));
  const armH = Math.max(6, Math.floor(h*0.18));
  // left arm
  ctx.fillRect(cx - Math.floor(w*0.55) + ox(offsets.la), cy + Math.floor(h*0.34), armW, armH);
  // right arm
  ctx.fillRect(cx + Math.floor(w*0.35) + ox(offsets.ra) - armW, cy + Math.floor(h*0.34), armW, armH);

  // head
  ctx.fillStyle = c.palette.head;
  ctx.fillRect(cx - Math.floor(w*0.2), cy, Math.floor(w*0.4), Math.floor(h*0.28));

  // eye
  ctx.fillStyle = '#111';
  ctx.fillRect(cx - Math.floor(w*0.05), cy + Math.floor(h*0.06), Math.max(1, Math.floor(w*0.08)), Math.max(1, Math.floor(h*0.06)));

  // accessories
  if (c.accessory.hat) {
    ctx.fillStyle = c.palette.accent;
    ctx.fillRect(cx - Math.floor(w*0.3), cy - Math.floor(h*0.12), Math.floor(w*0.6), Math.max(3, Math.floor(h*0.08)));
  }
  if (c.accessory.glasses) {
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - Math.floor(w*0.18), cy + Math.floor(h*0.06), Math.max(1, Math.floor(w*0.12)), Math.max(1, Math.floor(h*0.06)));
    ctx.fillRect(cx + Math.floor(w*0.03), cy + Math.floor(h*0.06), Math.max(1, Math.floor(w*0.12)), Math.max(1, Math.floor(h*0.06)));
    ctx.fillRect(cx - Math.floor(w*0.02), cy + Math.floor(h*0.08), Math.max(1, Math.floor(w*0.02)), Math.max(1, Math.floor(h*0.02)));
  }
  if (c.accessory.moustache) {
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - Math.floor(w*0.08), cy + Math.floor(h*0.14), Math.max(1, Math.floor(w*0.16)), Math.max(1, Math.floor(h*0.04)));
  }
}

function drawSpeech(c) {
  const text = c.speech.text;
  const x = Math.round(c.x);
  const y = Math.round(c.y - c.h/2 - 12);
  ctx.font = '12px monospace';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const metrics = ctx.measureText(text);
  const w = Math.max(40, metrics.width + 10);
  const bx = x - w/2;
  ctx.fillRect(bx, y - 18, w, 18);
  ctx.fillStyle = '#000';
  ctx.fillText(text, bx + 6, y - 3);
}

socket.on('connect', () => { console.log('conectado al servidor'); });
socket.on('init', (data) => { VITRINA.width = data.vitrWidth; VITRINA.height = data.vitrHeight; canvas.width = VITRINA.width; canvas.height = VITRINA.height; characters = data.characters; renderCharList(); });
socket.on('state', (data) => { characters = data.characters; lastStateTime = data.time; renderCharList(false); });
socket.on('ai:tick', () => {});

// Admin UI wiring (unchanged)
const btnPause = document.getElementById('btnPause');
const btnResume = document.getElementById('btnResume');
const btnExport = document.getElementById('btnExport');
const charListDiv = document.getElementById('charList');
const selectedEditor = document.getElementById('selectedEditor');
btnPause.onclick = () => { socket.emit('admin:pause'); running = false; };
btnResume.onclick = () => { socket.emit('admin:resume'); running = true; };
btnExport.onclick = () => { window.open('/api/export', '_blank'); };
let selectedId = null;
function renderCharList(full = true) {
  if (!charListDiv) return; charListDiv.innerHTML = '';
  for (const c of characters) {
    const d = document.createElement('div'); d.className = 'charItem'; d.innerHTML = `<strong>${c.name}</strong> <small>${c.profession}</small><br/>
      <span>Estado: ${c.state || 'idle'}</span>
      <div class="charButtons">
        <button data-id="${c.id}" class="editBtn">Editar</button>
        <button data-id="${c.id}" class="forceTalk">Forzar hablar</button>
      </div>`; charListDiv.appendChild(d);
  }
  for (const b of document.getElementsByClassName('editBtn')) { b.onclick = (ev) => { const id = ev.target.dataset.id; selectCharacter(id); }; }
  for (const b of document.getElementsByClassName('forceTalk')) { b.onclick = (ev) => { const id = ev.target.dataset.id; socket.emit('admin:setAction', { id, action: { type: 'speak', text: '¡Forzado por admin!', duration: 4000 } }); }; }
}
function selectCharacter(id) { selectedId = id; const c = characters.find(x => x.id === id); if (!c) return; selectedEditor.innerHTML = `
    <h3>Editar: ${c.name}</h3>
    <label>Nombre:<br><input id="editName" value="${c.name}"></label><br>
    <label>Edad:<br><input id="editAge" value="${c.age}" type="number"></label><br>
    <label>Profesion:<br><input id="editProf" value="${c.profession}"></label><br>
    <label>Traits (coma):<br><input id="editTraits" value="${c.traits.join(', ')}"></label><br>
    <label>Color (hsl o hex):<br><input id="editColor" value="${c.color}"></label><br>
    <label>Head color:<br><input id="editHead" value="${c.palette.head}"></label><br>
    <label>Body color:<br><input id="editBody" value="${c.palette.body}"></label><br>
    <label>Pants color:<br><input id="editPants" value="${c.palette.pants}"></label><br>
    <label>Hat: <input type="checkbox" id="editHat" ${c.accessory.hat ? 'checked' : ''}></label><br>
    <label>Glasses: <input type="checkbox" id="editGlasses" ${c.accessory.glasses ? 'checked' : ''}></label><br>
    <label>Moustache: <input type="checkbox" id="editMoust" ${c.accessory.moustache ? 'checked' : ''}></label><br>
    <button id="saveChar">Guardar</button>
    <button id="closeEdit">Cerrar</button>
  `; document.getElementById('saveChar').onclick = () => { const upd = { name: document.getElementById('editName').value, age: Number(document.getElementById('editAge').value), profession: document.getElementById('editProf').value, traits: document.getElementById('editTraits').value.split(',').map(s=>s.trim()).filter(Boolean), color: document.getElementById('editColor').value, palette: { head: document.getElementById('editHead').value, body: document.getElementById('editBody').value, pants: document.getElementById('editPants').value }, accessory: { hat: document.getElementById('editHat').checked, glasses: document.getElementById('editGlasses').checked, moustache: document.getElementById('editMoust').checked }}; socket.emit('admin:updateCharacter', { id, updates: upd }); }; document.getElementById('closeEdit').onclick = () => { selectedEditor.innerHTML = ''; } }

function loop() { draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
