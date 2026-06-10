# Asistente Virtual Docente

Plantilla base para crear y desplegar un asistente virtual de curso en Netlify usando un proveedor LLM y una funcion serverless para ocultar la API key.

## Incluye

1. `index.html`: interfaz de chat para estudiantes.
2. `config.html`: formulario visual para personalizar y descargar `course-data.json`.
3. `course-data.json`: configuracion del curso.
4. `netlify/functions/chat.js`: proxy seguro hacia el proveedor LLM.
5. Compatibilidad inicial con `Gemini`, `Kimi 2.5` y `OpenAI GPT-5.4`.

## Flujo de uso

1. Abre `config.html`.
2. Ingresa el codigo demo `docente2026`.
3. Edita curso, docente, colores, prompt, unidades, foros, lecturas y FAQ.
4. Descarga el nuevo `course-data.json`.
5. Reemplaza el archivo original en la raiz del proyecto.
6. En Netlify, registra la variable de entorno del proveedor elegido.
7. Publica el proyecto.

## Variables de entorno

Configura solo la que corresponda al proveedor elegido:

```text
OPENAI_API_KEY=
GEMINI_API_KEY=
MOONSHOT_API_KEY=
```

## Proveedores recomendados en esta plantilla

1. `Gemini`: opcion freemium recomendada para iniciar.
2. `Kimi 2.5`: alternativa compatible con OpenAI a traves de Moonshot.
3. `OpenAI GPT-5.4`: opcion paga para docentes con cuenta activa en OpenAI.

Nota para `Kimi 2.5`:

1. La plantilla usa `kimi-k2.5` como modelo por defecto.
2. Kimi usa la API compatible con OpenAI Chat Completions en `https://api.moonshot.ai/v1/chat/completions`.
3. La variable esperada es `MOONSHOT_API_KEY`.
4. La plantilla no envia `temperature` para Kimi 2.5, porque ese modelo restringe ese parametro.

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
