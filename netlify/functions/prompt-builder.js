function buildPrompt(courseData, question, courseMatch) {
  const context = courseData.courseContext;
  const relevantTopics = courseMatch.relevantTopics.length
    ? courseMatch.relevantTopics.join(", ")
    : "No se detectaron temas exactos; usa solo la informacion disponible del curso.";

  const faqSummary = (context.faq || [])
    .map((item) => `- ${item.question}: ${item.answer}`)
    .join("\n");

  const rulesSummary = (context.rules || [])
    .map((item) => `- ${item}`)
    .join("\n");

  const systemPrompt = [
    "Eres un asistente virtual academico para estudiantes universitarios.",
    `Curso: ${courseData.courseName}.`,
    `Docente responsable: ${courseData.teacherName}.`,
    courseData.assistant.systemPrompt,
    "Responde solo con base en el contexto provisto. Si no encuentras sustento suficiente, indica que el estudiante debe consultar al docente.",
    "No respondas preguntas ajenas al curso ni des consejos fuera del alcance academico definido.",
    "Reglas del asistente:",
    rulesSummary,
    "Contexto del curso:",
    `Descripcion: ${context.description || "No definida."}`,
    `Cronograma: ${context.schedule || "No definido."}`,
    `Evaluaciones: ${context.assessments || "No definidas."}`,
    `Politica de comunicacion: ${context.communicationPolicy || "No definida."}`,
    "FAQ disponibles:",
    faqSummary || "- No hay FAQ registradas."
  ].join("\n");

  const userPrompt = [
    `Pregunta del estudiante: ${question}`,
    `Temas detectados: ${relevantTopics}`,
    "Responde en espanol claro, breve y accionable.",
    "Si la informacion no aparece en el contexto, di que no cuentas con datos suficientes y remite al docente."
  ].join("\n");

  return {
    systemPrompt,
    userPrompt
  };
}

module.exports = {
  buildPrompt
};
