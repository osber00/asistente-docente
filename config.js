const ACCESS_CODE = "docente2026";
const accessPanel = document.querySelector("#access-panel");
const accessCodeInput = document.querySelector("#access-code");
const unlockButton = document.querySelector("#unlock-button");
const configForm = document.querySelector("#config-form");
const previewPanel = document.querySelector("#preview-panel");
const previewNode = document.querySelector("#json-preview");
const providerGrid = document.querySelector("#provider-grid");
const providerHelp = document.querySelector("#provider-help");
const providerEnvKeyNode = document.querySelector("#provider-env-key");

const PROVIDER_PRESETS = {
  gemini: {
    label: "Gemini",
    model: "gemini-2.5-flash",
    envKey: "GEMINI_API_KEY",
    note: "Freemium. Es la opcion recomendada para primeros talleres y pruebas con estudiantes."
  },
  kimi: {
    label: "Kimi 2.5",
    model: "kimi-k2.5",
    envKey: "MOONSHOT_API_KEY",
    note: "Compatible con OpenAI Chat Completions usando Moonshot. La plantilla omite temperature porque Kimi 2.5 restringe ese parametro."
  },
  openai: {
    label: "OpenAI GPT-5.4",
    model: "gpt-5.4",
    envKey: "OPENAI_API_KEY",
    note: "Servicio pago. Recomendado cuando el docente ya tiene credito o cuenta activa en OpenAI."
  }
};

async function loadCourseData() {
  const response = await fetch("./course-data.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("No se pudo cargar course-data.json");
  }

  return response.json();
}

function joinLines(items) {
  return (items || []).join("\n");
}

function faqToLines(items) {
  return (items || []).map((item) => `${item.question} | ${item.answer}`).join("\n");
}

function buildKnowledgeBase(data) {
  if (data.courseContext.knowledgeBase) {
    return data.courseContext.knowledgeBase;
  }

  const sections = [
    data.courseContext.description,
    data.courseContext.schedule,
    data.courseContext.assessments,
    data.courseContext.units,
    data.courseContext.forums,
    data.courseContext.recommendedReadings,
    data.courseContext.communicationPolicy,
    (data.courseContext.allowedTopics || []).length ? `Temas permitidos: ${(data.courseContext.allowedTopics || []).join(", ")}.` : "",
    (data.courseContext.rules || []).length ? `Reglas del asistente: ${(data.courseContext.rules || []).join(" ")}` : "",
    (data.assistant.suggestionChips || []).length ? `Preguntas sugeridas: ${(data.assistant.suggestionChips || []).join(" | ")}` : "",
    (data.courseContext.faq || []).length ? `Preguntas frecuentes:\n${faqToLines(data.courseContext.faq)}` : ""
  ];

  return sections.filter(Boolean).join("\n\n");
}

function fillForm(data) {
  configForm.elements.courseName.value = data.courseName;
  configForm.elements.teacherName.value = data.teacherName;
  configForm.elements.primaryColor.value = data.theme.primaryColor;
  configForm.elements.accentColor.value = data.theme.accentColor;
  configForm.elements.welcomeMessage.value = data.assistant.welcomeMessage;
  configForm.elements.systemPrompt.value = data.assistant.systemPrompt;
  configForm.elements.outOfScopeMessage.value = data.assistant.outOfScopeMessage;
  configForm.elements.provider.value = data.llm.provider;
  configForm.elements.model.value = data.llm.model;
  configForm.elements.knowledgeBase.value = buildKnowledgeBase(data);
  updateProviderUI(data.llm.provider, false);
}

function splitLines(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaq(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [question, ...answerParts] = line.split("|");

      return {
        question: question ? question.trim() : "",
        answer: answerParts.join("|").trim()
      };
    })
    .filter((item) => item.question && item.answer);
}

function buildSuggestionChipsFromKnowledgeBase(knowledgeBase) {
  const hints = [];
  const normalized = knowledgeBase.toLowerCase();

  if (normalized.includes("metodolog")) {
    hints.push("¿Cual es la metodologia del curso?");
  }

  if (normalized.includes("foro")) {
    hints.push("¿Hay foros?");
  }

  if (normalized.includes("lectura")) {
    hints.push("¿Que lecturas recomendadas hay?");
  }

  if (normalized.includes("unidad")) {
    hints.push("¿Cuantas unidades tiene el curso?");
  }

  if (normalized.includes("evalua") || normalized.includes("nota")) {
    hints.push("¿Como se evalua el curso?");
  }

  return hints.slice(0, 4);
}

function buildPayload(form) {
  const knowledgeBase = form.elements.knowledgeBase.value.trim();

  return {
    courseName: form.elements.courseName.value.trim(),
    teacherName: form.elements.teacherName.value.trim(),
    theme: {
      primaryColor: form.elements.primaryColor.value,
      accentColor: form.elements.accentColor.value,
      surfaceColor: "#f8fafc"
    },
    assistant: {
      welcomeMessage: form.elements.welcomeMessage.value.trim(),
      systemPrompt: form.elements.systemPrompt.value.trim(),
      outOfScopeMessage: form.elements.outOfScopeMessage.value.trim(),
      suggestionChips: buildSuggestionChipsFromKnowledgeBase(knowledgeBase)
    },
    llm: {
      provider: form.elements.provider.value,
      model: form.elements.model.value.trim()
    },
    courseContext: {
      knowledgeBase
    }
  };
}

function validatePayload(payload) {
  if (!payload.courseName || !payload.teacherName) {
    throw new Error("Debes completar el nombre del curso y del docente.");
  }

  if (!payload.courseContext.knowledgeBase) {
    throw new Error("Debes incluir el bloque unico de informacion del curso.");
  }
}

function downloadJson(payload) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "course-data.json";
  anchor.click();

  URL.revokeObjectURL(url);
}

function unlockForm() {
  sessionStorage.setItem("configAccessGranted", "true");
  accessPanel.classList.add("hidden");
  configForm.classList.remove("hidden");
}

function updateProviderUI(provider, shouldForceModel = true) {
  const normalizedProvider = PROVIDER_PRESETS[provider] ? provider : "gemini";
  const preset = PROVIDER_PRESETS[normalizedProvider];
  const providerInput = configForm.elements.provider;
  const modelInput = configForm.elements.model;

  providerInput.value = normalizedProvider;

  if (shouldForceModel || !modelInput.value.trim() || Object.values(PROVIDER_PRESETS).some((item) => item.model === modelInput.value.trim())) {
    modelInput.value = preset.model;
  }

  providerHelp.querySelector(".provider-help-title").textContent = `${preset.label}: ${preset.model}`;
  providerHelp.querySelector(".provider-help-copy").textContent = preset.note;
  providerEnvKeyNode.textContent = preset.envKey;

  for (const card of providerGrid.querySelectorAll("[data-provider-option]")) {
    card.classList.toggle("selected", card.dataset.providerOption === normalizedProvider);
  }
}

providerGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-provider-option]");

  if (!button) {
    return;
  }

  updateProviderUI(button.dataset.providerOption);
});

configForm.elements.provider.addEventListener("change", (event) => {
  updateProviderUI(event.target.value);
});

unlockButton.addEventListener("click", () => {
  if (accessCodeInput.value !== ACCESS_CODE) {
    accessCodeInput.setCustomValidity("Codigo incorrecto");
    accessCodeInput.reportValidity();
    return;
  }

  accessCodeInput.setCustomValidity("");
  unlockForm();
});

configForm.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    const payload = buildPayload(configForm);
    validatePayload(payload);
    previewPanel.classList.remove("hidden");
    previewNode.textContent = JSON.stringify(payload, null, 2);
    downloadJson(payload);
  } catch (error) {
    previewPanel.classList.remove("hidden");
    previewNode.textContent = error.message;
  }
});

async function bootstrap() {
  const data = await loadCourseData();
  fillForm(data);

  if (sessionStorage.getItem("configAccessGranted") === "true") {
    unlockForm();
  }
}

bootstrap().catch((error) => {
  previewPanel.classList.remove("hidden");
  previewNode.textContent = error.message;
});
