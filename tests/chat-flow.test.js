const test = require("node:test");
const assert = require("node:assert/strict");

const sampleCourseData = require("../course-data.json");
const { findBestCourseMatch } = require("../netlify/functions/context-matcher");
const { buildPrompt } = require("../netlify/functions/prompt-builder");
const { createChatHandler } = require("../netlify/functions/chat");
const { callProvider, getProviderSettings, ConfigurationError } = require("../netlify/functions/providers");

test("encuentra una respuesta FAQ directa", () => {
  const match = findBestCourseMatch("¿Cuando es la entrega del proyecto final?", sampleCourseData);

  assert.equal(match.isInScope, true);
  assert.equal(match.directFaqMatch.answer, "La entrega del proyecto final esta programada para la semana 16 del semestre.");
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
  assert.match(prompt.systemPrompt, /No responder fuera del contexto del curso/);
  assert.match(prompt.userPrompt, /metodologia/);
});

test("la funcion responde FAQ sin invocar el proveedor", async () => {
  let providerCalls = 0;
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async () => {
      providerCalls += 1;
      return "No deberia ejecutarse";
    }
  });

  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ message: "¿En que horario son las clases?" })
  });

  const payload = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(payload.source, "faq");
  assert.equal(providerCalls, 0);
});

test("la funcion bloquea preguntas fuera de contexto", async () => {
  const handler = createChatHandler({
    readCourseData: async () => sampleCourseData,
    callProvider: async () => "No deberia ejecutarse"
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
  assert.match(capturedPrompt.systemPrompt, /Contexto del curso/);
});

test("el proveedor reporta falta de configuracion cuando no existe API key", async () => {
  await assert.rejects(
    callProvider({
      provider: "grok",
      model: "grok-4.3",
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
  assert.equal(getProviderSettings("grok", "grok-4.3").envKey, "XAI_API_KEY");
  assert.equal(getProviderSettings("gemini", "gemini-2.5-flash").type, "gemini");
  assert.equal(getProviderSettings("openai", "gpt-5.4").type, "openai-responses");
  assert.equal(getProviderSettings("grok", "grok-4.3").type, "openai-responses");
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

test("Grok usa Responses API de xAI", async () => {
  let requestBody = null;
  const responseBody = {
    output: [
      {
        content: [
          {
            type: "output_text",
            text: "Respuesta desde Grok"
          }
        ]
      }
    ]
  };

  const reply = await callProvider({
    provider: "grok",
    model: "grok-4.3",
    prompt: { systemPrompt: "Sistema", userPrompt: "Usuario" },
    env: { XAI_API_KEY: "demo-key" },
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);

      return {
        ok: true,
        text: async () => JSON.stringify(responseBody)
      };
    }
  });

  assert.equal(reply, "Respuesta desde Grok");
  assert.equal(requestBody.model, "grok-4.3");
  assert.equal(requestBody.input[0].role, "system");
  assert.equal(requestBody.input[1].role, "user");
});
