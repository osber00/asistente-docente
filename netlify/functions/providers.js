class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

async function parseProviderResponse(response) {
  const rawBody = await response.text();

  if (!rawBody) {
    return { data: null, rawBody: "" };
  }

  try {
    return {
      data: JSON.parse(rawBody),
      rawBody
    };
  } catch {
    return {
      data: null,
      rawBody
    };
  }
}

function buildProviderError(response, data, rawBody, provider) {
  const message = data?.error?.message || rawBody || `Error del proveedor ${provider}.`;
  return new Error(message);
}

function extractOpenAICompatibleText(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text || "")
      .join(" ")
      .trim();
  }

  return "";
}

function getProviderSettings(provider, model) {
  const normalizedProvider = String(provider || "").toLowerCase();

  switch (normalizedProvider) {
    case "openai":
      return {
        provider: normalizedProvider,
        model,
        envKey: "OPENAI_API_KEY",
        url: "https://api.openai.com/v1/responses",
        type: "openai-responses"
      };
    case "grok":
      return {
        provider: normalizedProvider,
        model,
        envKey: "XAI_API_KEY",
        url: "https://api.x.ai/v1/responses",
        type: "openai-responses"
      };
    case "gemini":
      return {
        provider: normalizedProvider,
        model,
        envKey: "GEMINI_API_KEY",
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        type: "gemini"
      };
    default:
      throw new ConfigurationError(`Proveedor LLM no soportado: ${provider}`);
  }
}

function extractOpenAIResponsesText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = (data?.output || [])
    .flatMap((item) => item.content || [])
    .map((item) => item.text || "")
    .join(" ")
    .trim();

  return text;
}

async function callOpenAICompatible(settings, apiKey, prompt, fetchImpl) {
  const response = await fetchImpl(settings.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ]
    })
  });

  const { data, rawBody } = await parseProviderResponse(response);

  if (!response.ok) {
    throw buildProviderError(response, data, rawBody, settings.provider);
  }

  const message = extractOpenAICompatibleText(data);

  if (!message) {
    throw new Error(`El proveedor ${settings.provider} no devolvio contenido.`);
  }

  return message;
}

async function callOpenAIResponses(settings, apiKey, prompt, fetchImpl) {
  const body = settings.provider === "grok"
    ? {
        model: settings.model,
        input: [
          {
            role: "system",
            content: prompt.systemPrompt
          },
          {
            role: "user",
            content: prompt.userPrompt
          }
        ]
      }
    : {
        model: settings.model,
        temperature: 0.2,
        instructions: prompt.systemPrompt,
        input: prompt.userPrompt
      };

  const response = await fetchImpl(settings.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const { data, rawBody } = await parseProviderResponse(response);

  if (!response.ok) {
    throw buildProviderError(response, data, rawBody, settings.provider);
  }

  const message = extractOpenAIResponsesText(data);

  if (!message) {
    throw new Error(`El proveedor ${settings.provider} no devolvio contenido.`);
  }

  return message;
}

async function callGemini(settings, apiKey, prompt, fetchImpl) {
  const url = `${settings.url}?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${prompt.systemPrompt}\n\n${prompt.userPrompt}`
            }
          ]
        }
      ]
    })
  });

  const { data, rawBody } = await parseProviderResponse(response);

  if (!response.ok) {
    const errorMessage = data?.error?.message || rawBody || "Error del proveedor Gemini.";
    throw new Error(errorMessage);
  }

  const message = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ").trim();

  if (!message) {
    throw new Error("Gemini no devolvio contenido.");
  }

  return message;
}

async function callProvider(options) {
  const { provider, model, prompt, env = process.env, fetchImpl = fetch } = options;
  const settings = getProviderSettings(provider, model);
  const apiKey = env[settings.envKey];

  if (!apiKey) {
    throw new ConfigurationError(`Falta la variable de entorno ${settings.envKey}.`);
  }

  if (settings.type === "openai-compatible") {
    return callOpenAICompatible(settings, apiKey, prompt, fetchImpl);
  }

  if (settings.type === "openai-responses") {
    return callOpenAIResponses(settings, apiKey, prompt, fetchImpl);
  }

  return callGemini(settings, apiKey, prompt, fetchImpl);
}

module.exports = {
  ConfigurationError,
  callProvider,
  getProviderSettings
};
