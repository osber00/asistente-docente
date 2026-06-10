const courseNameNode = document.querySelector("#course-name");
const teacherNameNode = document.querySelector("#teacher-name");
const chipRowNode = document.querySelector("#suggestion-chips");
const chatLogNode = document.querySelector("#chat-log");
const formNode = document.querySelector("#chat-form");
const messageNode = document.querySelector("#message");
const sendButtonNode = document.querySelector("#send-button");
const templateNode = document.querySelector("#message-template");

let courseData = null;
let typingIndicatorNode = null;

async function loadCourseData() {
  const response = await fetch("./course-data.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("No se pudo cargar la configuracion del curso.");
  }

  return response.json();
}

function applyTheme(theme) {
  const primaryColor = theme.primaryColor;
  const contrastColor = getContrastColor(primaryColor);
  const rgb = hexToRgb(primaryColor);

  document.documentElement.style.setProperty("--primary-color", theme.primaryColor);
  document.documentElement.style.setProperty("--accent-color", primaryColor);
  document.documentElement.style.setProperty("--student-text", contrastColor);
  document.documentElement.style.setProperty("--student-bubble", primaryColor);
  document.documentElement.style.setProperty("--assistant-bubble", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`);
  document.documentElement.style.setProperty("--badge-background", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
  document.documentElement.style.setProperty("--badge-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18)`);
  document.documentElement.style.setProperty("--border-color", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`);
  document.documentElement.style.setProperty("--shadow-color", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);

  if (theme.surfaceColor) {
    document.documentElement.style.setProperty("--surface-color", theme.surfaceColor);
  }
}

function hexToRgb(hex) {
  const normalized = String(hex || "#0c6c3e").replace("#", "");
  const safeHex = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16),
    g: Number.parseInt(safeHex.slice(2, 4), 16),
    b: Number.parseInt(safeHex.slice(4, 6), 16)
  };
}

function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
  return luminance > 150 ? "#163225" : "#ffffff";
}

function createChip(text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "chip";
  button.textContent = text;
  button.addEventListener("click", () => {
    messageNode.value = text;
    messageNode.focus();
  });

  return button;
}

function renderCourseData(data) {
  courseData = data;
  courseNameNode.textContent = data.courseName;
  teacherNameNode.textContent = `Docente: ${data.teacherName}`;
  applyTheme(data.theme);

  chipRowNode.innerHTML = "";
  for (const chipText of data.assistant.suggestionChips || []) {
    chipRowNode.append(createChip(chipText));
  }

  appendMessage("assistant", data.assistant.welcomeMessage);
}

function appendMessage(role, text) {
  const fragment = templateNode.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const roleNode = fragment.querySelector(".message-role");
  const textNode = fragment.querySelector(".message-text");

  article.classList.add(role);
  roleNode.textContent = role === "assistant" ? "Asistente" : "Estudiante";
  textNode.innerHTML = formatMessageText(text);

  chatLogNode.append(article);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    chatLogNode.scrollTop = chatLogNode.scrollHeight;
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessageText(text) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

function showTypingIndicator() {
  if (typingIndicatorNode) {
    return;
  }

  const fragment = templateNode.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const roleNode = fragment.querySelector(".message-role");
  const textNode = fragment.querySelector(".message-text");

  article.classList.add("assistant", "typing-indicator");
  roleNode.textContent = "Asistente";
  textNode.innerHTML = "<span class=\"typing-dots\"><span></span><span></span><span></span></span><span class=\"typing-copy\">Escribiendo respuesta...</span>";

  typingIndicatorNode = article;
  chatLogNode.append(article);
  scrollChatToBottom();
}

function hideTypingIndicator() {
  if (!typingIndicatorNode) {
    return;
  }

  typingIndicatorNode.remove();
  typingIndicatorNode = null;
}

function setSendingState(isSending) {
  sendButtonNode.disabled = isSending;
  sendButtonNode.textContent = isSending ? "Enviando..." : "Enviar";
}

async function sendMessage(message) {
  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("BACKEND_UNAVAILABLE");
  }

  const payload = await response.json();

  if (!response.ok) {
    const message = payload.detail
      ? `${payload.error || "No fue posible obtener una respuesta."} Detalle: ${payload.detail}`
      : (payload.error || "No fue posible obtener una respuesta.");

    throw new Error(message);
  }

  return payload;
}

function fallbackToLocalMode(message) {
  if (!courseData) {
    throw new Error("No se pudo activar el modo local de prueba.");
  }

  if (window.LocalCourseChat && typeof window.LocalCourseChat.evaluateQuestion === "function") {
    return window.LocalCourseChat.evaluateQuestion(message, courseData);
  }

  return {
    message: "El servicio de chat no esta disponible en este momento. Intenta de nuevo en unos minutos.",
    source: "offline"
  };
}

async function bootstrap() {
  try {
    const data = await loadCourseData();
    renderCourseData(data);
  } catch (error) {
    appendMessage("assistant", error.message);
    formNode.querySelector("textarea").disabled = true;
    sendButtonNode.disabled = true;
  }
}

formNode.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageNode.value.trim();

  if (!message || !courseData) {
    return;
  }

  appendMessage("student", message);
  messageNode.value = "";
  setSendingState(true);
  showTypingIndicator();

  try {
    const payload = await sendMessage(message);
    hideTypingIndicator();
    appendMessage("assistant", payload.message);
  } catch (error) {
    hideTypingIndicator();
    if (error.message === "BACKEND_UNAVAILABLE") {
      const payload = fallbackToLocalMode(message);
      appendMessage("assistant", payload.message);
    } else {
      appendMessage("assistant", error.message);
    }
  } finally {
    setSendingState(false);
  }
});

messageNode.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    formNode.requestSubmit();
  }
});

bootstrap();
