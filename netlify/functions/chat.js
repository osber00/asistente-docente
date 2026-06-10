const { findBestCourseMatch } = require("./context-matcher");
const { buildPrompt } = require("./prompt-builder");
const { callProvider, ConfigurationError } = require("./providers");
const courseData = require("../course-data");

function readCourseData() {
  return courseData;
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(payload)
  };
}

function createChatHandler(dependencies = {}) {
  const loadCourseData = dependencies.readCourseData || readCourseData;
  const executeProvider = dependencies.callProvider || callProvider;

  return async function handler(event) {
    if (event.httpMethod === "OPTIONS") {
      return jsonResponse(204, {});
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { error: "Metodo no permitido." });
    }

    try {
      const body = JSON.parse(event.body || "{}");
      const message = String(body.message || "").trim();

      if (!message) {
        return jsonResponse(400, { error: "La pregunta es obligatoria." });
      }

      const courseData = await loadCourseData();
      const courseMatch = findBestCourseMatch(message, courseData);

      if (courseMatch.isGreeting) {
        return jsonResponse(200, {
          message: courseData.assistant.welcomeMessage,
          source: "greeting"
        });
      }

      if (courseMatch.directFaqMatch) {
        return jsonResponse(200, {
          message: courseMatch.directFaqMatch.answer,
          source: "faq"
        });
      }

      const prompt = buildPrompt(courseData, message, courseMatch);

      try {
        const llmMessage = await executeProvider({
          provider: courseData.llm.provider,
          model: courseData.llm.model,
          prompt
        });

        return jsonResponse(200, {
          message: llmMessage,
          source: "llm"
        });
      } catch (error) {
        if (error instanceof ConfigurationError) {
          if (!courseMatch.isInScope) {
            return jsonResponse(200, {
              message: courseData.assistant.outOfScopeMessage,
              source: "guardrail"
            });
          }

          return jsonResponse(200, {
            message: "No encontre una respuesta exacta en las FAQ y el proveedor de IA aun no esta configurado en Netlify.",
            source: "configuration"
          });
        }

        console.error("Provider request failed", {
          provider: courseData.llm.provider,
          model: courseData.llm.model,
          message: error.message
        });

        return jsonResponse(502, {
          error: "El proveedor de IA no pudo responder en este momento.",
          detail: error.message
        });
      }
    } catch (error) {
      return jsonResponse(500, {
        error: "No fue posible procesar la solicitud.",
        detail: error.message
      });
    }
  };
}

module.exports = {
  createChatHandler,
  handler: createChatHandler()
};
