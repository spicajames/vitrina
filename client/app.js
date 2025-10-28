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

function draw() {
  // background
  ctx.fillStyle = '#1b2330';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // ground
  ctx.fillStyle = '#2e3a45';
  ctx.fillRect(0, canvas.height-40, canvas.width, 40);

  // draw each character as an 8-bit style block
  for (const c of characters) {
    drawCharacter(c);
    // draw speech
    if (c.speech && c.speech.text) {
      drawSpeech(c);
    }
  }
}

function drawCharacter(c) {
  const w = c.w;
  const h = c.h;
  const x = Math.round(c.x - w/2);
  const y = Math.round(c.y - h/2);

  // body color from c.color
  ctx.fillStyle = c.color || '#f4a';
  // head
  ctx.fillRect(x + Math.floor(w*0.25), y, Math.floor(w*0.5), Math.floor(h*0.28));
  // body
  ctx.fillRect(x + Math.floor(w*0.15), y + Math.floor(h*0.28), Math.floor(w*0.7), Math.floor(h*0.5));
  // legs (darker)
  ctx.fillStyle = shadeColor(c.color || '#f4a', -20);
  ctx.fillRect(x + Math.floor(w*0.15), y + Math.floor(h*0.78), Math.floor(w*0.28), Math.floor(h*0.22));
  ctx.fillRect(x + Math.floor(w*0.58), y + Math.floor(h*0.78), Math.floor(w*0.28), Math.floor(h*0.22));
  // eye
  ctx.fillStyle = '#111';
  ctx.fillRect(x + Math.floor(w*0.38), y + Math.floor(h*0.06), Math.max(1, Math.floor(w*0.08)), Math.max(1, Math.floor(h*0.06)));
}

function drawSpeech(c) {
  const text = c.speech.text;
  const x = Math.round(c.x);
  const y = Math.round(c.y - c.h/2 - 12);
  ctx.font = '12px monospace';
  ctx.textBaseline = 'bottom';
  // background bubble
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const metrics = ctx.measureText(text);
  const w = Math.max(40, metrics.width + 10);
  const bx = x - w/2;
  ctx.fillRect(bx, y - 18, w, 18);
  ctx.fillStyle = '#000';
  ctx.fillText(text, bx + 6, y - 3);
}

function shadeColor(col, percent) {
  if (!col) return col;
  if (col.startsWith('hsl')) return col;
  // fallback: return same color
  return col;
}

socket.on('connect', () => {
  console.log('conectado al servidor');
});
socket.on('init', (data) => {
  VITRINA.width = data.vitrWidth;
  VITRINA.height = data.vitrHeight;
  canvas.width = VITRINA.width;
  canvas.height = VITRINA.height;
  characters = data.characters;
  renderCharList();
});
socket.on('state', (data) => {
  characters = data.characters;
  lastStateTime = data.time;
  renderCharList(false);
});
socket.on('ai:tick', () => {
  // placeholder
});

// Admin UI wiring
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
  if (!charListDiv) return;
  charListDiv.innerHTML = '';
  for (const c of characters) {
    const d = document.createElement('div');
    d.className = 'charItem';
    d.innerHTML = `<strong>${c.name}</strong> <small>${c.profession}</small><br/>
      <span>Estado: ${c.state || 'idle'}</span>
      <div class="charButtons">
        <button data-id="${c.id}" class="editBtn">Editar</button>
        <button data-id="${c.id}" class="forceTalk">Forzar hablar</button>
      </div>`;
    charListDiv.appendChild(d);
  }
  // wire buttons
  for (const b of document.getElementsByClassName('editBtn')) {
    b.onclick = (ev) => {
      const id = ev.target.dataset.id;
      selectCharacter(id);
    };
  }
  for (const b of document.getElementsByClassName('forceTalk')) {
    b.onclick = (ev) => {
      const id = ev.target.dataset.id;
      socket.emit('admin:setAction', { id, action: { type: 'speak', text: '¡Forzado por admin!', duration: 4000 } });
    };
  }
}

function selectCharacter(id) {
  selectedId = id;
  const c = characters.find(x => x.id === id);
  if (!c) return;
  selectedEditor.innerHTML = `
    <h3>Editar: ${c.name}</h3>
    <label>Nombre:<br><input id="editName" value="${c.name}"></label><br>
    <label>Edad:<br><input id="editAge" value="${c.age}" type="number"></label><br>
    <label>Profesion:<br><input id="editProf" value="${c.profession}"></label><br>
    <label>Traits (coma):<br><input id="editTraits" value="${c.traits.join(', ')}"></label><br>
    <label>Color (hsl o hex):<br><input id="editColor" value="${c.color}"></label><br>
    <button id="saveChar">Guardar</button>
    <button id="closeEdit">Cerrar</button>
  `;
  document.getElementById('saveChar').onclick = () => {
    const upd = {
      name: document.getElementById('editName').value,
      age: Number(document.getElementById('editAge').value),
      profession: document.getElementById('editProf').value,
      traits: document.getElementById('editTraits').value.split(',').map(s=>s.trim()).filter(Boolean),
      color: document.getElementById('editColor').value
    };
    socket.emit('admin:updateCharacter', { id, updates: upd });
  };
  document.getElementById('closeEdit').onclick = () => { selectedEditor.innerHTML = ''; };
}

// animation loop
function loop() {
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);