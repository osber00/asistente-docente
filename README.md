# Asistente Virtual Docente

Plantilla base para crear y desplegar un asistente virtual de curso en Netlify. Usa un proveedor LLM y una funcion serverless para mantener la API key fuera del navegador.

## Despliegue con un click

Si tienes cuenta en Netlify y en GitHub, este botón crea el sitio, lo configura y lo deja listo para que solo tengas que agregar tus claves:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/TU-USUARIO/asistente-docente)

Despues del deploy:
1. Abre el sitio creado y ve a **Site configuration > Environment variables**.
2. Agrega `MOONSHOT_API_KEY` y `CONFIG_ACCESS_CODE` (scope: Builds, Functions, Runtime; contexto: Production).
3. En **Deploys** click en **Trigger deploy > Clear cache and deploy site** para que las funciones lean las variables.

> Antes de compartir el boton, reemplaza `TU-USUARIO/asistente-docente` en la URL por tu repositorio real de GitHub. Si el docente no tiene GitHub, sigue la guia en `GUIA-DESPLIEGUE-NETLIFY.md` para el flujo de arrastrar un `.zip`.

## Despliegue manual con .zip (sin GitHub)

Tambien puedes desplegar arrastrando un `.zip` al panel de Netlify. La guia paso a paso esta en `GUIA-DESPLIEGUE-NETLIFY.md`.

## Incluye

1. `index.html`: interfaz de chat para estudiantes.
2. `config.html`: formulario visual para personalizar y descargar `course-data.json`.
3. `course-data.json`: configuracion del curso.
4. `netlify/functions/chat.js`: proxy seguro hacia el proveedor LLM.
5. `netlify/functions/verify-config-access.js`: valida el codigo de acceso a `config.html`.
6. `build.js`: script que se ejecuta durante el deploy para inyectar `course-data.json` como modulo dentro del bundle de la funcion.
7. Compatibilidad inicial con `Gemini`, `Kimi 2.5` y `OpenAI GPT-5.4`.

## Despliegue rapido (docentes, sin GitHub ni terminal)

El proyecto se publica arrastrando un `.zip` al panel de Netlify. No hace falta instalar Node.js ni usar la terminal.

1. Personaliza la plantilla abriendo `config.html` en el navegador, completando los campos y descargando el nuevo `course-data.json`. Reemplaza el original en la raiz del proyecto.
2. Comprime todos los archivos y carpetas del proyecto en un `.zip` (asegurandote de que `index.html` y `netlify.toml` queden en la raiz del zip, sin una carpeta padre).
3. En https://app.netlify.com: **Add new site** > **Deploy manually** > arrastra el `.zip`.
4. Configura las variables de entorno en **Site configuration > Environment variables**:
   - `MOONSHOT_API_KEY` (u `OPENAI_API_KEY` / `GEMINI_API_KEY` segun el proveedor)
   - `CONFIG_ACCESS_CODE`
   - Scope: **Builds, Functions, Runtime**. Valor en **Production**.
5. Vuelve a **Deploys** y arrastra el mismo `.zip` una vez mas para que las funciones lean las variables.

URL del sitio: `https://<nombre-aleatorio>.netlify.app`.

La guia detallada paso a paso, incluyendo troubleshooting, esta en `GUIA-DESPLIEGUE-NETLIFY.md`.

## Flujo de uso local (antes de publicar)

1. Abre `config.html`.
2. Ingresa el codigo configurado en `CONFIG_ACCESS_CODE`.
3. Edita curso, docente, colores, prompt, unidades, foros, lecturas y FAQ.
4. Descarga el nuevo `course-data.json`.
5. Reemplaza el archivo original en la raiz del proyecto.
6. Comprime en `.zip` y despliega siguiendo la seccion anterior.

## Variables de entorno

Configura solo la del proveedor elegido:

```text
OPENAI_API_KEY=
GEMINI_API_KEY=
MOONSHOT_API_KEY=
CONFIG_ACCESS_CODE=
```

## Proveedores recomendados

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
3. Las preguntas del curso que requieran LLM avisaran que debes desplegar en Netlify o configurar un proveedor.

Para enviar mensajes con teclado:

1. `Enter` envia el mensaje.
2. `Shift + Enter` inserta una nueva linea.

## Arquitectura

- **Frontend estatico**: `index.html` + `app.js` cargan `course-data.json` y mandan las preguntas del estudiante a `/.netlify/functions/chat`.
- **Funcion `chat`**: recibe la pregunta, la cruza con FAQ y el contenido del curso (`course-data.json` incrustado en el bundle por `build.js`), y si necesita LLM llama a Moonshot/OpenAI/Gemini con la API key del entorno. Nunca expone la API key al navegador.
- **Funcion `verify-config-access`**: valida que el docente conozca `CONFIG_ACCESS_CODE` antes de permitir editar la configuracion desde el navegador.
- **Build**: durante el deploy, `build.js` toma `course-data.json` de la raiz y lo convierte en `netlify/functions/course-data.js` para que Netlify lo incluya en el bundle de la funcion.

## Nota sobre `config.html`

`config.html` valida el acceso contra `/.netlify/functions/verify-config-access` usando la variable de entorno `CONFIG_ACCESS_CODE`, para que el codigo no quede expuesto en el frontend.
