# Asistente Virtual Docente

Plantilla base para crear y desplegar un asistente virtual de curso en Netlify usando un proveedor LLM y una funcion serverless para ocultar la API key.

## Incluye

1. `index.html`: interfaz de chat para estudiantes.
2. `config.html`: formulario visual para personalizar y descargar `course-data.json`.
3. `course-data.json`: configuracion del curso.
4. `netlify/functions/chat.js`: proxy seguro hacia el proveedor LLM.
5. Compatibilidad inicial con `Gemini`, `Grok` y `OpenAI GPT-5.4`.

## Flujo de uso

1. Abre `config.html`.
2. Ingresa el codigo demo `docente2026`.
3. Edita curso, docente, colores, prompt y FAQ.
4. Descarga el nuevo `course-data.json`.
5. Reemplaza el archivo original en la raiz del proyecto.
6. En Netlify, registra la variable de entorno del proveedor elegido.
7. Publica el proyecto.

## Variables de entorno

Configura solo la que corresponda al proveedor elegido:

```text
OPENAI_API_KEY=
XAI_API_KEY=
GEMINI_API_KEY=
```

## Proveedores recomendados en esta plantilla

1. `Gemini`: opcion freemium recomendada para iniciar.
2. `Grok`: alternativa freemium para pruebas conversacionales.
3. `OpenAI GPT-5.4`: opcion paga para docentes con cuenta activa en OpenAI.

Nota para `Grok`:

1. La plantilla usa `grok-4.3` como modelo por defecto y llama a `https://api.x.ai/v1/responses`.
2. Si deseas fijar otro modelo, puedes editar `course-data.json` manualmente.
3. La variable esperada es `XAI_API_KEY`.

## Pruebas

Ejecuta:

```bash
npm test
```

## Prueba local rapida sin Netlify

Si abres la plantilla en un servidor estatico simple, el chat entra en modo local de prueba cuando `/.netlify/functions/chat` no esta disponible.

En ese modo:

1. Las FAQ siguen respondiendo.
2. Las preguntas fuera del curso siguen bloqueadas.
3. Las preguntas del curso que requieran LLM avisaran que debes usar `netlify dev` o configurar un proveedor.

Para enviar mensajes con teclado:

1. `Enter` envia el mensaje.
2. `Shift + Enter` inserta una nueva linea.

## Nota sobre `config.html`

La proteccion de `config.html` es deliberadamente basica y solo evita ediciones accidentales. No es autenticacion real. Si no quieres publicar esa ruta, elimina el archivo antes del despliegue o mantenlo solo en tu copia de trabajo.
