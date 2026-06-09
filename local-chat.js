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

    return (allowedTopics || []).filter((topic) => {
      const normalizedTopic = normalizeText(topic);
      return normalizedTopic && normalizedQuestion.includes(normalizedTopic);
    });
  }

  function buildCourseKeywordSet(courseData) {
    const values = [
      courseData.courseName,
      courseData.teacherName,
      courseData.courseContext.description,
      courseData.courseContext.schedule,
      courseData.courseContext.assessments,
      courseData.courseContext.communicationPolicy,
      ...(courseData.courseContext.allowedTopics || []),
      ...(courseData.courseContext.rules || []),
      ...(courseData.courseContext.faq || []).flatMap((item) => [item.question, item.answer])
    ];

    return tokenize(values.join(" "));
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
    const isInScope = Boolean(isGreeting || directFaqMatch || relevantTopics.length || scopeScore >= 0.2);

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
