const NAMES = ['Lía', 'Simón', 'Paco', 'Marta', 'Irene', 'Galo', 'Nora', 'Eloy', 'Sam', 'Rita', 'Bruno', 'Caro'];
const PROFESSIONS = ['panadero', 'bibliotecaria', 'programador', 'estudiante', 'artista', 'jardinero', 'científico', 'repartidor'];
const TRAITS_POOL = ['curioso', 'tímido', 'amigable', 'reservado', 'enérgico', 'soñador', 'práctico', 'sociable'];

function uid() { return (Math.random().toString(36).slice(2,9)); }
function pickRandom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
function pickN(arr, n){ const out=[]; while(out.length<n){ const r=pickRandom(arr); if(!out.includes(r)) out.push(r);} return out; }

function randomPalette(){
  // palettes in hex
  const skinTones = ['#f2d6c9','#e0b7a1','#d6a77a','#b5815d'];
  const bodies = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4'];
  const pants = ['#0f172a','#1f2937','#374151','#6b7280'];
  return {
    head: pickRandom(skinTones),
    body: pickRandom(bodies),
    pants: pickRandom(pants),
    accent: pickRandom(bodies)
  };
}

function randomAccessory(){
  return {
    hat: Math.random() < 0.25,
    glasses: Math.random() < 0.2,
    moustache: Math.random() < 0.12,
    hairStyle: pickRandom(['A','B','C','D'])
  };
}

function generate(count = 10, width = 900, height = 400) {
  const out = [];
  for (let i=0;i<count;i++) {
    const name = pickRandom(NAMES) + (Math.random()<0.5 ? '' : ' ' + String.fromCharCode(65 + Math.floor(Math.random()*26)));
    const profession = pickRandom(PROFESSIONS);
    const age = 18 + Math.floor(Math.random()*50);
    const traits = pickN(TRAITS_POOL, 1 + Math.floor(Math.random()*3));
    const palette = randomPalette();
    const accessory = randomAccessory();
    out.push({
      id: uid(),
      name,
      age,
      profession,
      traits,
      presentation: `Hola, soy ${name}, tengo ${age} años y trabajo como ${profession}.`,
      x: 60 + Math.random()*(width-120),
      y: height - 20,
      vx: 0,
      vy: 0,
      w: 20,
      h: 32,
      onGround: true,
      state: 'idle',
      currentAction: { type: 'idle' },
      speech: null,
      lastAI: 0,
      color: `hsl(${Math.floor(Math.random()*360)} 60% 40%)`,
      palette,
      accessory,
      scale: 1 + (Math.random()*0.4 - 0.15),
      animation: { type: 'idle', frame: 0, lastAt: Date.now() }
    });
  }
  return out;
}

module.exports = { generate };
