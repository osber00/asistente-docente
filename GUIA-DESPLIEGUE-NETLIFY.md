# Guia de despliegue en Netlify para docentes

Esta guia esta pensada para docentes que no usan GitHub y quieren publicar el asistente arrastrando un archivo `.zip` al panel de Netlify. No requiere instalar Node.js ni usar la terminal.

## 1. Que necesita el docente

Antes de comenzar, el docente debe tener:

1. Una cuenta en Netlify (gratis en https://app.netlify.com).
2. Una API key de Kimi (Moonshot).
3. Un codigo de acceso para proteger `config.html`.
4. El archivo `.zip` del proyecto.

## 2. Configuracion inicial recomendada

La plantilla queda preparada inicialmente con:

1. Proveedor: `Kimi`
2. Modelo: `kimi-k2.5`

## 3. Personalizar el asistente antes de publicar

1. Descomprime el `.zip` en una carpeta de tu equipo.
2. Abre el archivo `config.html` con el navegador.
3. Ingresa el codigo de acceso definido para tu entorno de prueba.
4. Completa los campos:
   - nombre del curso,
   - nombre del docente,
   - color institucional,
   - prompt principal,
   - bloque unico de informacion del curso.
5. Verifica que el proveedor sea `Kimi 2.5`.
6. Descarga la configuracion con el boton correspondiente.
7. Reemplaza el archivo `course-data.json` de la carpeta descomprimida por el archivo descargado.

## 4. Crear el archivo .zip para Netlify

Una vez terminada la configuracion:

1. Abre la carpeta del proyecto.
2. Selecciona **todos los archivos y carpetas que estan dentro** (no la carpeta padre).
3. Comprimelos en un archivo `.zip` (clic derecho > "Comprimir" o "Enviar a > Carpeta comprimida").

Importante:

1. El `.zip` debe contener los archivos del proyecto directamente en la raiz.
2. No debe haber una carpeta adicional envolviendo todo.

Dentro del `.zip` deben verse directamente archivos como:

```text
index.html
config.html
course-data.json
netlify.toml
build.js
netlify/
```

## 5. Publicar el sitio arrastrando el .zip a Netlify

1. Inicia sesion en https://app.netlify.com.
2. En el panel principal, click en **Add new site**.
3. Elige **Deploy manually**.
4. Arrastra el archivo `.zip` a la zona de carga.

Netlify subira el sitio y ejecutara un build automatico. Veras en el log pasos como `Initializing`, `Building`, `Deploying`, `Post-processing` (todos en verde). El paso `Building` debe terminar mostrando un mensaje similar a `[build] netlify/functions/course-data.js generado`.

5. Cuando el deploy termine, Netlify te mostrara la URL del sitio, con un formato como `https://nombre-aleatorio.netlify.app`. Abrela para confirmar que ves el chat.

## 6. Configurar las variables de entorno

El sitio ya esta publicado, pero el chat aun no responde porque faltan las claves. Configuralas asi:

1. En el panel de Netlify, abre tu sitio.
2. Ve a **Site configuration** > **Environment variables**.
3. Click en **Add a variable** y agrega la primera:

   | Key | Scope | Valor en Production |
   |-----|-------|---------------------|
   | `MOONSHOT_API_KEY` | Builds, Functions, Runtime | tu API key de Kimi |
   | `CONFIG_ACCESS_CODE` | Builds, Functions, Runtime | tu codigo de acceso |

   Para cada variable:
   - Escribe el nombre (Key).
   - En la seccion **Scopes**, marca **Builds**, **Functions** y **Runtime**.
   - En la seccion **Values**, click **Add value**, elige **Production** y pega el valor.
   - Guarda.

## 7. Redesplegar para activar las variables

Las variables de entorno solo se aplican a las funciones despues de un nuevo deploy:

1. En tu sitio, ve a **Deploys**.
2. Arrastra otra vez el mismo `.zip` a la zona de carga.

Esto fuerza un nuevo deploy que ya tendra acceso a las variables. Espera a que termine (un par de minutos).

## 8. Probar el sitio publicado

Prueba al menos estas rutas:

1. Sitio principal: `https://tu-sitio.netlify.app`
2. Configuracion: `https://tu-sitio.netlify.app/config.html`

Pruebas recomendadas en el chat:

1. `¿Hay foros?`
2. `¿Cuantas unidades tiene el curso?`
3. `¿Que lecturas recomendadas hay?`
4. `¿Como se evalua el curso?`

Si todas responden coherentemente, el despliegue esta completo.

## 9. Probar seguridad de configuracion

En `config.html`:

1. Abre `https://tu-sitio.netlify.app/config.html`.
2. Prueba con el codigo correcto (el mismo que pusiste en `CONFIG_ACCESS_CODE`).
3. Prueba con un codigo incorrecto.

Resultado esperado:

1. Con codigo correcto, se abre el formulario de configuracion.
2. Con codigo incorrecto, se rechaza el acceso.

## 10. Si el docente quiere actualizar el asistente luego

1. Descomprime de nuevo el `.zip` en una carpeta de trabajo.
2. Abre `config.html`, edita lo que necesites, descarga la nueva configuracion.
3. Reemplaza `course-data.json` en la carpeta con el archivo descargado.
4. Crea un nuevo `.zip` siguiendo el paso 4.
5. En Netlify, ve a **Deploys** y arrastra el nuevo `.zip** (sobre el mismo sitio).
6. Netlify redespliega. Las variables de entorno se conservan, no hay que volver a configurarlas.

## 11. Variables necesarias

En `Site configuration > Environment variables` deben existir:

```text
MOONSHOT_API_KEY=tu_api_key_de_kimi
CONFIG_ACCESS_CODE=tu_codigo_seguro
```

Ambas con scope **Builds, Functions, Runtime** y valor en **Production**.

## 12. Resolucion de problemas frecuentes

- **El chat dice "El servicio de chat no esta disponible"**: la funcion `/.netlify/functions/chat` no responde. Verifica que `MOONSHOT_API_KEY` esta configurada y que redesplegaste despues de agregarla.
- **`config.html` dice codigo incorrecto aun con el codigo bien**: `CONFIG_ACCESS_CODE` no esta definida o no se redesplego. Arrastra el `.zip** otra vez a Deploys.
- **El log muestra "Building: Failed"**: hay un error en el build. Expande el paso **Building** en el log para ver el detalle y compartelo con quien te dio la plantilla.
- **El deploy dice "Page not found" al abrir el sitio**: el `.zip` no se extrajo con `index.html` y `netlify.toml` en la raiz. Revisa el paso 4.
- **La pestaña Functions aparece vacia**: el deploy fallo. Revisa el log del deploy y asegurate de que el paso Building termino en Complete.

## 13. Recomendacion final

Antes de compartir el enlace con estudiantes:

1. Verifica que el contenido del curso este bien redactado en `config.html`.
2. Haz al menos 5 preguntas reales del curso en el chat publicado.
3. Confirma que Kimi responde correctamente y que las FAQ se resuelven sin invocar al LLM.
4. Confirma que `config.html` rechaza codigos incorrectos.
5. Guarda una copia de la carpeta final y del `.zip` como respaldo.
