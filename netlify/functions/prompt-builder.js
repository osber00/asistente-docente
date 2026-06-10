function buildPrompt(courseData, question, courseMatch) {
  const context = courseData.courseContext;
  const relevantTopics = courseMatch.relevantTopics.length
    ? courseMatch.relevantTopics.join(", ")
    : "No se detectaron temas exactos; usa solo la informacion disponible del curso.";
  const knowledgeBase = context.knowledgeBase || serializeValue(context);
  const scopeGuidance = courseMatch.isInScope
    ? "La pregunta parece relacionada con el curso. Si aun falta contexto, pide una aclaracion breve antes de responder."
    : "La pregunta no parece claramente relacionada con el curso o es demasiado ambigua. Si puede interpretarse dentro del curso, pide una aclaracion breve. Si es claramente ajena al curso, indicalo con amabilidad y explica que solo atiendes temas de la asignatura.";

  const systemPrompt = [
    "Eres un asistente virtual academico de atencion a estudiantes universitarios.",
    `Curso: ${courseData.courseName}.`,
    `Docente responsable: ${courseData.teacherName}.`,
    courseData.assistant.systemPrompt,
    "Responde solo con base en el contexto provisto. Si no encuentras sustento suficiente, indica que el estudiante debe consultar al docente.",
    "No respondas preguntas ajenas al curso ni des consejos fuera del alcance academico definido.",
    "Habla con tono cordial, claro y orientado a resolver dudas estudiantiles.",
    "Si la pregunta es demasiado breve, ambigua o incompleta, primero pide una aclaracion concreta en lugar de rechazarla de inmediato.",
    "Cuando pidas aclaracion, haz una sola pregunta breve y ofrece 2 o 3 opciones concretas si eso ayuda al estudiante.",
    "Evita sonar tecnico o defensivo. Prioriza guiar al estudiante hacia la informacion que necesita.",
    "Bloque oficial de informacion del curso:",
    knowledgeBase
  ].join("\n");

  const userPrompt = [
    `Pregunta del estudiante: ${question}`,
    `Temas detectados: ${relevantTopics}`,
    `Orientacion de alcance: ${scopeGuidance}`,
    "Responde en espanol claro, breve, amable y accionable.",
    "Si la informacion no aparece en el contexto, di que no cuentas con datos suficientes y remite al docente."
  ].join("\n");

  return {
    systemPrompt,
    userPrompt
  };
}

function serializeValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item)).join(" | ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${serializeValue(item)}`)
      .join(" | ");
  }

  return "No definido";
}

module.exports = {
  buildPrompt
};
