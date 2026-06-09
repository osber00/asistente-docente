## Plan para plantilla de asistente virtual docente

### 1. Objetivo general

Crear una plantilla lista para desplegar en Netlify que permita a docentes universitarios configurar su propio asistente virtual para cursos, usando IA mediante proveedores LLM compatibles con API token freemium o gratuito. El asistente debe responder solo preguntas relacionadas con el curso, permitir personalización básica y ocultar los tokens mediante Netlify Functions.

### 2. Resultado esperado

La entrega final debe incluir:

1. Una plantilla tecnica lista para Netlify.
2. Una interfaz moderna y amigable para estudiantes.
3. Una pagina separada de configuracion para docentes.
4. Un archivo JSON editable con la informacion del curso.
5. Funciones serverless para proteger API keys.
6. Compatibilidad inicial con varios proveedores LLM.
7. Materiales de capacitacion para un taller de 1 hora.

### 3. Alcance funcional

El asistente debe permitir:

1. Mostrar nombre del curso y nombre del docente.
2. Personalizar colores y textos principales.
3. Configurar el prompt principal del asistente.
4. Definir preguntas frecuentes, reglas, horarios y datos relevantes del curso en un archivo JSON.
5. Responder primero con base en la informacion del curso.
6. Consultar al LLM solo cuando la pregunta siga dentro del contexto del curso.
7. Rechazar preguntas fuera del alcance del curso.
8. Elegir proveedor LLM desde una configuracion simple.

No se incluye en esta primera version:

1. Historial persistente de conversaciones.
2. Avatares o logos.
3. Multiusuario.
4. Panel administrativo complejo.
5. Bases de datos externas.

### 4. Principios del sistema

1. Simplicidad para docentes con baja experiencia tecnica.
2. Seguridad basica real: API keys fuera del frontend.
3. Personalizacion rapida desde formulario y JSON.
4. Respuestas restringidas al contexto del curso.
5. Despliegue sencillo con Netlify.
6. Base extensible para futuras mejoras.

### 5. Arquitectura recomendada

Se implementara una arquitectura con cuatro piezas:

1. Frontend estatico.
2. Configuracion del curso en JSON.
3. Pagina separada de configuracion para docentes.
4. Netlify Functions para intermediar con el LLM.

#### Flujo general

1. El estudiante abre la pagina del asistente.
2. Escribe una pregunta.
3. El frontend envia la consulta a `/.netlify/functions/chat`.
4. La funcion lee el archivo de configuracion del curso.
5. La funcion valida si la pregunta esta dentro del contexto permitido.
6. Primero intenta responder usando FAQ y datos del curso.
7. Si la pregunta sigue siendo valida pero requiere redaccion o sintesis, consulta al LLM configurado.
8. Si la pregunta esta fuera del curso, devuelve un mensaje de rechazo controlado.

### 6. Estructura propuesta del proyecto

```text
/
  index.html
  config.html
  styles.css
  app.js
  config.js
  course-data.json
  netlify.toml
  README.md
  /netlify
    /functions
      chat.js
      providers.js
      prompt-builder.js
      context-matcher.js
```

### 7. Responsabilidad de cada archivo

#### `index.html`

1. Interfaz del chat para estudiantes.
2. Muestra nombre del curso, nombre del docente y mensaje de bienvenida.
3. Permite enviar preguntas.

#### `config.html`

1. Interfaz separada para docentes.
2. Permite editar colores, textos, prompt principal y datos del curso.
3. Debe ser simple y guiada.

#### `styles.css`

1. Apariencia moderna y amigable.
2. Colores configurables.
3. Layout responsive para desktop y movil.

#### `app.js`

1. Logica del chat.
2. Carga de configuracion visual.
3. Envio de preguntas a la funcion serverless.
4. Render de respuestas.

#### `config.js`

1. Manejo del formulario visual para docentes.
2. Carga y actualizacion del `course-data.json` a nivel de flujo de trabajo local.
3. Validaciones basicas del formulario.

#### `course-data.json`

1. Fuente principal del contexto del curso.
2. Guarda personalizacion y reglas.
3. Debe ser facil de editar o regenerar.

#### `netlify/functions/chat.js`

1. Funcion principal del backend.
2. Recibe la consulta del frontend.
3. Evalua contexto.
4. Llama al proveedor LLM elegido.
5. Nunca expone API keys al navegador.

#### `providers.js`

1. Adaptadores para OpenAI, OpenRouter, Groq, Gemini y otros.
2. Uniforma las llamadas para que el frontend no cambie.

#### `prompt-builder.js`

1. Construye el prompt final.
2. Inserta reglas, FAQ, contexto del curso y restricciones.

#### `context-matcher.js`

1. Verifica si la consulta esta dentro del curso.
2. Busca coincidencias en FAQ, temas permitidos y secciones clave.

### 8. Modelo de configuracion del curso

El sistema debe partir de un archivo `course-data.json` con una estructura como esta:

```json
{
  "courseName": "Introduccion a la Investigacion",
  "teacherName": "Dra. Ana Perez",
  "theme": {
    "primaryColor": "#2563eb",
    "accentColor": "#0f172a"
  },
  "assistant": {
    "welcomeMessage": "Hola, soy el asistente virtual del curso.",
    "systemPrompt": "Responde solo con base en la informacion oficial del curso. Si la pregunta no pertenece al curso, indicalo con claridad.",
    "outOfScopeMessage": "Solo puedo responder preguntas relacionadas con este curso."
  },
  "llm": {
    "provider": "gemini",
    "model": "gemini-1.5-flash"
  },
  "courseContext": {
    "description": "Curso orientado a desarrollar competencias basicas de investigacion.",
    "faq": [
      {
        "question": "Cuando es el parcial?",
        "answer": "El parcial esta programado para la semana 8."
      }
    ],
    "allowedTopics": [
      "contenidos",
      "evaluaciones",
      "horarios",
      "metodologia",
      "bibliografia"
    ],
    "rules": [
      "No inventar informacion.",
      "No responder fuera del contexto del curso.",
      "Si no hay informacion suficiente, sugerir consultar al docente."
    ]
  }
}
```

### 9. Logica de respuesta del asistente

La logica recomendada debe seguir este orden:

1. Normalizar la pregunta del estudiante.
2. Revisar si coincide con preguntas frecuentes o secciones del curso.
3. Determinar si el tema pertenece al curso.
4. Si no pertenece, devolver `outOfScopeMessage`.
5. Si pertenece y hay respuesta directa en FAQ, usarla.
6. Si pertenece pero requiere elaboracion, construir prompt y consultar al LLM.
7. Responder en espanol, sin salir del contexto.

### 10. Seguridad recomendada

La clave del modelo no debe estar en el frontend bajo ninguna circunstancia.

Medidas:

1. El frontend solo consume `/.netlify/functions/chat`.
2. Los tokens se guardan en variables de entorno de Netlify.
3. La funcion serverless decide que proveedor y modelo usar.
4. El navegador nunca recibe la API key.
5. La pagina `config.html` debe usarse como herramienta previa de personalizacion y no como panel administrativo expuesto publicamente.

#### Variables de entorno sugeridas

```text
OPENAI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
HUGGINGFACE_API_KEY=
TOGETHER_API_KEY=
```

### 11. Proveedores LLM recomendados

#### 1. OpenRouter

Sitio: `https://openrouter.ai`

Ventajas:

1. Permite usar multiples modelos desde una sola API.
2. Facilita cambiar de proveedor sin rediseñar la plantilla.
3. Adecuado para una arquitectura multi-modelo.

#### 2. Groq

Sitio: `https://console.groq.com`

Ventajas:

1. Respuestas muy rapidas.
2. API simple para chat.
3. Buena opcion freemium para talleres.

#### 3. Gemini API

Sitio: `https://aistudio.google.com`

Ventajas:

1. Acceso relativamente sencillo.
2. Buena documentacion.
3. Util para empezar con bajo costo.

#### 4. OpenAI

Sitio: `https://platform.openai.com`

Ventajas:

1. Estabilidad.
2. Calidad conocida.
3. Opcion premium compatible para docentes que quieran migrar luego.

#### 5. Hugging Face / Together AI

Sitios:

1. `https://huggingface.co`
2. `https://www.together.ai`

Uso sugerido:

1. Alternativas para docentes con mayor interes en experimentar.
2. Menos prioritarios para la capacitacion inicial.

### 12. Recomendacion de compatibilidad inicial

Para la primera version se recomienda soporte oficial para:

1. Gemini
2. Groq
3. OpenRouter
4. OpenAI

Esto balancea facilidad, costo y estabilidad.

### 13. Personalizacion para docentes

El formulario visual debe permitir editar al menos:

1. Nombre del curso.
2. Nombre del docente.
3. Color principal.
4. Color secundario o de acento.
5. Mensaje de bienvenida.
6. Prompt principal.
7. Mensaje de rechazo fuera de contexto.
8. Proveedor LLM.
9. Modelo LLM.
10. Preguntas frecuentes.
11. Descripcion del curso.
12. Temas permitidos.
13. Reglas del asistente.

### 14. Diseno base recomendado

El diseno debe ser moderno, limpio y amigable, evitando un aspecto demasiado tecnico.

#### Componentes visuales sugeridos

1. Encabezado con nombre del curso y nombre del docente.
2. Tarjeta principal del chat.
3. Mensaje de bienvenida claro.
4. Botones de preguntas sugeridas.
5. Indicador de alcance del asistente.
6. Input de mensaje con boton enviar.
7. Nota discreta indicando que el asistente responde solo temas del curso.

#### Criterios visuales

1. Responsive.
2. Tipografia legible.
3. Contraste adecuado.
4. Personalizacion simple con variables CSS.

### 15. Ruta de implementacion

#### Fase 1. Base funcional

1. Crear estructura del proyecto.
2. Construir `index.html` con chat funcional.
3. Crear `course-data.json` de ejemplo.
4. Implementar Netlify Function `chat.js`.
5. Conectar primer proveedor LLM.

#### Fase 2. Personalizacion docente

1. Crear `config.html`.
2. Implementar formulario visual.
3. Permitir editar configuracion del curso.
4. Aplicar colores y textos al frontend.

#### Fase 3. Multi-proveedor

1. Agregar selector de proveedor.
2. Integrar adaptadores para Gemini, Groq, OpenRouter y OpenAI.
3. Validar errores por ausencia de variables de entorno.

#### Fase 4. Restriccion por contexto

1. Implementar `context-matcher.js`.
2. Priorizar FAQ y reglas del curso.
3. Rechazar preguntas fuera de alcance.

#### Fase 5. Materiales de capacitacion

1. Redactar README docente.
2. Crear guia de despliegue en Netlify.
3. Crear guion de taller.
4. Crear checklist final.

### 16. Estructura del taller de 1 hora

Distribucion acordada:

1. 20 minutos de concepto.
2. 40 minutos de practica.

#### Bloque 1. Concepto, 20 minutos

Objetivo: que el docente entienda que esta construyendo y por que la seguridad importa.

Temas:

1. Que es un asistente virtual para cursos.
2. Casos de uso: preguntas frecuentes, normas, horarios, evaluaciones.
3. Limites del asistente: no inventar, no responder fuera del curso.
4. Diferencia entre frontend, JSON del curso y backend serverless.
5. Que es un API token y por que no debe quedar expuesto.
6. Que es Netlify y por que usarlo.

#### Bloque 2. Practica, 40 minutos

Objetivo: que el docente salga con una version publicada o casi publicada.

Pasos:

1. Descargar o clonar la plantilla.
2. Abrir la pagina de configuracion.
3. Editar nombre del curso, nombre del docente y colores.
4. Ajustar el prompt principal.
5. Completar FAQ y datos del curso.
6. Elegir proveedor LLM.
7. Crear cuenta en el proveedor elegido.
8. Obtener API key.
9. Crear cuenta en Netlify.
10. Subir el proyecto.
11. Configurar variables de entorno.
12. Publicar el sitio.
13. Hacer pruebas con preguntas del curso.
14. Probar una pregunta fuera de contexto.

### 17. Materiales finales para capacitacion

La entrega al docente debe incluir:

1. Plantilla tecnica.
2. README con pasos rapidos.
3. Guia de creacion de API keys.
4. Guia de despliegue en Netlify.
5. Lista de prompts sugeridos.
6. Ejemplo de curso ya configurado.
7. Checklist de verificacion.

### 18. Checklist sugerido para docentes

1. Defini el nombre del curso.
2. Defini el nombre del docente.
3. Elegi los colores.
4. Edite el prompt principal.
5. Complete las FAQ.
6. Seleccione proveedor y modelo.
7. Cree la API key.
8. La registre en Netlify.
9. Desplegue el proyecto.
10. Probe preguntas reales del curso.

### 19. Riesgos y consideraciones

1. Los planes gratuitos cambian con frecuencia.
2. Algunos proveedores limitan uso por minuto o por dia.
3. El control por contexto debe ser estricto para evitar respuestas fuera del curso.
4. El formulario visual no debe prometer seguridad total si se deja expuesto publicamente.
5. Debe explicarse claramente a docentes que el asistente no reemplaza decisiones oficiales del curso.

### 20. Recomendacion final

La solucion mas adecuada para este proyecto es una plantilla estatica para Netlify con una interfaz simple, un archivo `course-data.json`, una pagina `config.html` para personalizacion y una `Netlify Function` que proteja los tokens y conecte con multiples proveedores LLM.

Esto permite:

1. Facil despliegue para docentes.
2. Seguridad razonable.
3. Personalizacion sin tocar mucho codigo.
4. Escalabilidad futura.
5. Un formato ideal para capacitacion universitaria.

### 21. Siguiente paso de construccion

Despues de este plan, el siguiente bloque de trabajo debe ser construir la plantilla base con:

1. `index.html`
2. `config.html`
3. `styles.css`
4. `app.js`
5. `config.js`
6. `course-data.json`
7. `netlify/functions/chat.js`
8. `README.md`

Con eso se tendria una primera version funcional lista para pruebas y luego para la capacitacion.
