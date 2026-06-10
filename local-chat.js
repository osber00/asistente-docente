(function () {
  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(value) {
    const stopWords = new Set([
      "a",
      "al",
      "algo",
      "como",
      "con",
      "cual",
      "cuando",
      "de",
      "del",
      "el",
      "en",
      "es",
      "esta",
      "este",
      "hay",
      "la",
      "las",
      "los",
      "me",
      "mi",
      "para",
      "por",
      "que",
      "se",
      "si",
      "su",
      "un",
      "una",
      "y"
    ]);

    return normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 2 && !stopWords.has(token));
  }

  function scoreOverlap(sourceTokens, targetTokens) {
    if (!sourceTokens.length || !targetTokens.length) {
      return 0;
    }

    const sourceSet = new Set(sourceTokens);
    let matches = 0;

    for (const token of targetTokens) {
      if (sourceSet.has(token)) {
        matches += 1;
      }
    }

    return matches / targetTokens.length;
  }

  function collectStringValues(value) {
    if (typeof value === "string") {
      return [value];
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => collectStringValues(item));
    }

    if (value && typeof value === "object") {
      return Object.values(value).flatMap((item) => collectStringValues(item));
    }

    return [];
  }

  function findDirectFaqMatch(question, faqItems) {
    const normalizedQuestion = normalizeText(question);
    const questionTokens = tokenize(question);
    let bestMatch = null;

    for (const item of faqItems || []) {
      const normalizedFaq = normalizeText(item.question);
      const faqTokens = tokenize(item.question);
      const overlap = scoreOverlap(questionTokens, faqTokens);
      const isSubstringMatch = normalizedQuestion.includes(normalizedFaq) || normalizedFaq.includes(normalizedQuestion);

      if (isSubstringMatch || overlap >= 0.55) {
        const score = isSubstringMatch ? 1 : overlap;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            question: item.question,
            answer: item.answer,
            score: score
          };
        }
      }
    }

    return bestMatch;
  }

  function findRelevantTopics(question, allowedTopics) {
    const normalizedQuestion = normalizeText(question);
    const questionTokens = tokenize(question);

    return (allowedTopics || []).filter((topic) => {
      const normalizedTopic = normalizeText(topic);
      const topicTokens = tokenize(topic);

      return normalizedTopic && (
        normalizedQuestion.includes(normalizedTopic) ||
        scoreOverlap(topicTokens, questionTokens) >= 0.5
      );
    });
  }

  function buildCourseKeywordSet(courseData) {
    const values = [courseData.courseName, courseData.teacherName, ...collectStringValues(courseData.courseContext)];

    return tokenize(values.join(" "));
  }

  function hasAcademicHint(questionTokens) {
    const academicHints = new Set([
      "actividad",
      "actividades",
      "bibliografia",
      "clase",
      "clases",
      "contenido",
      "contenidos",
      "correo",
      "cronograma",
      "docente",
      "evaluacion",
      "evaluaciones",
      "examen",
      "examenes",
      "foro",
      "foros",
      "horario",
      "horarios",
      "lectura",
      "lecturas",
      "metodologia",
      "modulo",
      "modulos",
      "participacion",
      "proyecto",
      "proyectos",
      "recurso",
      "recursos",
      "rubrica",
      "rubricas",
      "tarea",
      "tareas",
      "tema",
      "temas",
      "unidad",
      "unidades"
    ]);

    return questionTokens.some((token) => {
      if (academicHints.has(token)) {
        return true;
      }

      for (const hint of academicHints) {
        if (token.startsWith(hint) || hint.startsWith(token)) {
          return true;
        }
      }

      return false;
    });
  }

  function evaluateQuestion(question, courseData) {
    const greetings = new Set(["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"]);
    const normalizedQuestion = normalizeText(question);
    const questionTokens = tokenize(question);
    const directFaqMatch = findDirectFaqMatch(question, courseData.courseContext.faq);
    const relevantTopics = findRelevantTopics(question, courseData.courseContext.allowedTopics);
    const courseKeywords = buildCourseKeywordSet(courseData);
    const scopeScore = scoreOverlap(courseKeywords, questionTokens);
    const isGreeting = greetings.has(normalizedQuestion);
    const isShortAcademicQuestion = questionTokens.length > 0 && questionTokens.length <= 4 && hasAcademicHint(questionTokens);
    const isInScope = Boolean(isGreeting || directFaqMatch || relevantTopics.length || isShortAcademicQuestion || scopeScore >= 0.2);

    if (isGreeting) {
      return {
        message: courseData.assistant.welcomeMessage,
        source: "greeting"
      };
    }

    if (directFaqMatch) {
      return {
        message: directFaqMatch.answer,
        source: "faq"
      };
    }

    if (!isInScope) {
      return {
        message: courseData.assistant.outOfScopeMessage,
        source: "guardrail"
      };
    }

    return {
      message: "La pregunta pertenece al curso, pero esta prueba esta corriendo en modo local sin backend. Para obtener una respuesta con IA, inicia la plantilla con Netlify Functions usando `npx netlify dev` y abre `http://localhost:8888`.",
      source: "local-fallback"
    };
  }

  window.LocalCourseChat = {
    evaluateQuestion: evaluateQuestion
  };
})();
