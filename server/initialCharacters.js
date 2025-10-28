// Generador simple de 10 personajes iniciales con rasgos, profesiones, etc.

const NAMES = ['Lía', 'Simón', 'Paco', 'Marta', 'Irene', 'Galo', 'Nora', 'Eloy', 'Sam', 'Rita', 'Bruno', 'Caro'];
const PROFESSIONS = ['panadero', 'bibliotecaria', 'programador', 'estudiante', 'artista', 'jardinero', 'científico', 'repartidor'];
const TRAITS_POOL = ['curioso', 'tímido', 'amigable', 'reservado', 'enérgico', 'soñador', 'práctico', 'sociable'];

function uid() { return (Math.random().toString(36).slice(2,9)); }

function pickRandom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function generate(count = 10, width = 900, height = 400) {
  const out = [];
  for (let i=0;i<count;i++) {
    const name = pickRandom(NAMES) + (Math.random()<0.5 ? '' : ' ' + String.fromCharCode(65 + Math.floor(Math.random()*26)));
    const profession = pickRandom(PROFESSIONS);
    const age = 18 + Math.floor(Math.random()*50);
    const traits = [];
    const nt = 1 + Math.floor(Math.random()*3);
    while (traits.length < nt) {
      const t = pickRandom(TRAITS_POOL);
      if (!traits.includes(t)) traits.push(t);
    }
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
      color: `hsl(${Math.floor(Math.random()*360)} 60% 40%)`
    });
  }
  return out;
}

module.exports = { generate };