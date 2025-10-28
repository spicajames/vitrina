# Vitrina de Personas Diminutas — MVP (listo para Replit)

Este repositorio contiene un MVP local que simula 10 personajes en una vitrina. La "IA" es un mock gratuito que se ejecuta en el servidor: decide acciones cada 10 segundos por personaje y retorna un JSON estructurado con la acción a ejecutar.

Características
- 10 personajes iniciales generados automáticamente.
- Motor 2D tipo plataforma (física simple: gravedad, salto, límites).
- IA mock local (sin coste) invocada cada 10s por personaje.
- Acciones soportadas: move, idle, speak, interact, changeState.
- Panel admin en la UI: pausar/continuar simulación, editar personaje, forzar hablar, exportar JSON.
- Sin sonido, idioma: español.
- Persistencia mínima: estado en memoria; endpoint /api/export para descargar estado actual en JSON.

Requisitos
- Node.js >= 16 (Replit usa entornos con Node compatible)

Cómo ejecutar en Replit (pasos rápidos)
1. Crea un nuevo Repl en https://replit.com/ (autenticado).
2. Selecciona "Import from GitHub" si subes primero a un repositorio, o crea un Repl Node.js vacío y pega los archivos de este proyecto.
3. Verifica que existe el archivo `.replit` con `run = "npm start"` (incluido).
4. Pulsa "Run". Replit instalará dependencias y ejecutará `npm start`.
5. Abre la vista web pública desde el botón "Open in a new tab" que proporciona Replit.

Cómo ejecutar localmente
1. Clona o descarga este proyecto.
2. Instala dependencias:
   ```
npm install
```
3. Ejecuta:
   ```
npm start
```
4. Abre `http://localhost:3000` en tu navegador.

Dónde cambiar la IA por un servicio real
- Archivo: `server/mockAI.js`
- Reemplaza la lógica de decide(character, context) por una llamada a un servicio (OpenAI, HuggingFace, etc.) que retorne JSON con la misma estructura:
  {
    type: "move" | "idle" | "speak" | "interact" | "changeState",
    dir?: -1|0|1,
    speed?: number,
    jump?: boolean,
    text?: string,
    targetId?: string,
    duration?: number
  }

Notas
- La aplicación usa WebSockets (Socket.IO). Replit y Glitch permiten esto; Vercel no es ideal para sockets persistentes.
- El estado se guarda en memoria. Si el entorno reinicia (p. ej. Replit duerme), se pierde el estado salvo que descargues /api/export.
- Si deseas que prepare el repositorio en GitHub y te dé la URL de importación para Replit, puedo generarlo (necesitarás darme permiso para crear/usar un repo o yo puedo darte el ZIP listo).

End of files.
