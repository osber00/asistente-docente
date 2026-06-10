const test = require("node:test");
const assert = require("node:assert/strict");

const sampleCourseData = require("../course-data.json");
const { findBestCourseMatch } = require("../netlify/functions/context-matcher");
const { buildPrompt } = require("../netlify/functions/prompt-builder");
const { createChatHandler } = require("../netlify/functions/chat");
const { callProvider, getProviderSettings, ConfigurationError } = require("../netlify/functions/providers");

test("detecta preguntas del curso dentro del bloque unico de informacion", () => {
  const match = findBestCourseMatch("¿Cuando es la entrega del proyecto final?", sampleCourseData);

  assert.equal(match.isInScope, true);
  assert.equal(match.directFaqMatch, null);
});

test("rechaza una pregunta fuera del curso", () => {
  const match = findBestCourseMatch("¿Cual es la capital de Francia?", sampleCourseData);

  assert.equal(match.isInScope, false);
  assert.equal(match.directFaqMatch, null);
});

test("construye un prompt con reglas y contexto del curso", () => {
  const match = findBestCourseMatch("Explica la metodologia del curso", sampleCourseData);
  const prompt = buildPrompt(sampleCourseData, "Explica la metodologia del curso", match);

  assert.match(prompt.systemPrompt, /Didactica Universitaria con IA/);
  assert.match(prompt.systemPrompt, /Bloque oficial de informacion del curso/);
  assert.match(prompt.userPrompt, /metodologia/);
});

test("preguntas sobre horario entran al contexto desde el bloque unico", async () => {
  const forumsMatch = findBestCourseMatch("Hay foros?", sampleCourseData);
  const readingsMatch = findBestCourseMatch("lecturas recomendadas?", sampleCourseData);
  const unitsMatch = findBestCourseMatch("Cuantas unidades?", sampleCourseData);
  const scheduleMatch = findBestCourseMatch("En que horario son las clases?", sampleCourseData);

  assert.equal(forumsMatch.isInScope, true);
  assert.equal(readingsMatch.isInScope, true);
  assert.equal(unitsMatch.isInScope, true);
  assert.equal(scheduleMatch.isInScope, true);
});

test("preguntas cortas estudiantiles sobre el curso entran al contexto", () => {
  const forumsMatch = findBestCourseMatch("Hay foros?", sampleCourseData);
  const readingsMatch = findBestCourseMatch("lecturas recomendadas?", sampleCourseData);
  const unitsMatch = findBestCourseMatch("Cuantas unidades?", sampleCourseData);

  assert.equal(forumsMatch.isInScope, true);
  assert.equal(readingsMatch.isInScope, true);
  assert.equal(unitsMatch.isInScope, true);
});

test("la funcion usa el proveedor para preguntas cortas del curso", async () => {
  let providerCalls = 0;
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async () => {
      providerCalls += 1;
      return "El curso se organiza en 4 unidades tematicas.";
    }
  });

  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ message: "Cuantas unidades?" })
  });

  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.source, "llm");
  assert.match(payload.message, /4 unidades/);
  assert.equal(providerCalls, 1);
});

test("la funcion usa el proveedor para preguntas ambiguas o fuera de contexto si existe LLM", async () => {
  let providerCalls = 0;
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async () => {
      providerCalls += 1;
      return "No identifique con claridad a que parte del curso te refieres. Puedes indicarme si preguntas por contenidos, foros, evaluaciones o lecturas?";
    }
  });

  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ message: "Necesito una receta para pizza" })
  });

  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.source, "llm");
  assert.match(payload.message, /No identifique con claridad/);
  assert.equal(providerCalls, 1);
});

test("si no hay proveedor configurado, se mantiene el rechazo estatico fuera de contexto", async () => {
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async () => {
      throw new ConfigurationError("Falta la variable de entorno OPENAI_API_KEY.");
    }
  });

  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ message: "Necesito una receta para pizza" })
  });

  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.source, "guardrail");
  assert.equal(payload.message, sampleCourseData.assistant.outOfScopeMessage);
});

test("la funcion usa el proveedor para preguntas del curso sin FAQ exacta", async () => {
  let capturedPrompt = null;
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async (options) => {
      capturedPrompt = options.prompt;
      return "La metodologia combina sesiones guiadas, debate y proyecto aplicado.";
    }
  });

  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ message: "Explica la metodologia del curso" })
  });

  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.source, "llm");
  assert.match(capturedPrompt.systemPrompt, /Bloque oficial de informacion del curso/);
});

test("el proveedor reporta falta de configuracion cuando no existe API key", async () => {
  await assert.rejects(
    callProvider({
      provider: "kimi",
      model: "kimi-k2.5",
      prompt: { systemPrompt: "Sistema", userPrompt: "Usuario" },
      env: {},
      fetchImpl: async () => {
        throw new Error("No deberia llamarse");
      }
    }),
    ConfigurationError
  );
});

test("genera la configuracion correcta para proveedores soportados", () => {
  assert.equal(getProviderSettings("kimi", "kimi-k2.5").envKey, "MOONSHOT_API_KEY");
  assert.equal(getProviderSettings("gemini", "gemini-2.5-flash").type, "gemini");
  assert.equal(getProviderSettings("openai", "gpt-5.4").type, "openai-responses");
  assert.equal(getProviderSettings("kimi", "kimi-k2.5").type, "openai-compatible");
});

test("OpenAI Responses parsea output_text correctamente", async () => {
  const responseBody = { output_text: "Respuesta desde OpenAI" };
  const reply = await callProvider({
    provider: "openai",
    model: "gpt-5.4",
    prompt: { systemPrompt: "Sistema", userPrompt: "Usuario" },
    env: { OPENAI_API_KEY: "demo-key" },
    fetchImpl: async () => ({
      ok: true,
      text: async () => JSON.stringify(responseBody)
    })
  });

  assert.equal(reply, "Respuesta desde OpenAI");
});

test("Kimi usa Chat Completions compatible con OpenAI", async () => {
  let requestBody = null;
  const responseBody = {
    choices: [
      {
        message: {
          content: "Respuesta desde Kimi"
        }
      }
    ]
  };

  const reply = await callProvider({
    provider: "kimi",
    model: "kimi-k2.5",
    prompt: { systemPrompt: "Sistema", userPrompt: "Usuario" },
    env: { MOONSHOT_API_KEY: "demo-key" },
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);

      return {
        ok: true,
        text: async () => JSON.stringify(responseBody)
      };
    }
  });

  assert.equal(reply, "Respuesta desde Kimi");
  assert.equal(requestBody.model, "kimi-k2.5");
  assert.equal(Object.hasOwn(requestBody, "temperature"), false);
  assert.equal(requestBody.messages[0].role, "system");
  assert.equal(requestBody.messages[1].role, "user");
});
