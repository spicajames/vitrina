// Mock "IA gratuita" local que genera acciones JSON según rasgos y contexto.
// Esta función simula un generador de texto estructurado y devuelve acciones en el esquema acordado.
// Puedes reemplazar decide(...) por una llamada a un servicio real (OpenAI/HuggingFace) y retornar la misma estructura.

const DIRECTIONS = [-1, 0, 1];

function rnd(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

async function decide(character, context) {
  // pequeño retardo simulado
  await new Promise(r => setTimeout(r, 20 + Math.random()*80));

  const traits = character.traits || [];
  const curious = traits.includes('curioso') || traits.includes('curiosa');
  const energetic = traits.includes('enérgico') || traits.includes('enérgico') || traits.includes('activo');
  const friendly = traits.includes('amigable') || traits.includes('sociable');
  const shy = traits.includes('tímido') || traits.includes('tímida') || traits.includes('reservado');

  // find nearby others within 140 px
  const others = context.filter(c => c.id !== character.id);
  const nearby = others.filter(o => Math.abs(o.x - character.x) < 140);

  const pick = Math.random();
  if (friendly && nearby.length && pick < 0.5) {
    const target = rnd(nearby);
    return {
      type: 'interact',
      targetId: target.id,
      duration: 6000,
      text: friendly ? '¿Quieres charlar?' : '...'
    };
  }

  if (curious && pick < 0.6) {
    const dir = rnd(DIRECTIONS);
    return {
      type: 'move',
      dir,
      speed: energetic ? 90 : 50,
      jump: Math.random() < (energetic ? 0.4 : 0.1),
      duration: 8000
    };
  }

  if (pick < 0.75 && !shy) {
    const phrases = [
      `¡Qué día tan ${rnd(['lindo','raro','interesante'])}!`,
      `Estoy pensando en mi trabajo como ${character.profession}.`,
      `Hola, me llamo ${character.name}.`,
      `¿Has visto algo curioso?`
    ];
    return {
      type: 'speak',
      text: rnd(phrases),
      duration: 4000
    };
  }

  if (pick < 0.95) {
    return {
      type: 'move',
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: 30,
      duration: 5000
    };
  }

  return { type: 'idle', duration: 6000 };
}

module.exports = { decide };