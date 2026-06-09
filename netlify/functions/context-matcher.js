const STOP_WORDS = new Set([
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

const GREETINGS = new Set(["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"]);

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
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
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
          score
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

function findBestCourseMatch(question, courseData) {
  const normalizedQuestion = normalizeText(question);
  const questionTokens = tokenize(question);
  const directFaqMatch = findDirectFaqMatch(question, courseData.courseContext.faq);
  const relevantTopics = findRelevantTopics(question, courseData.courseContext.allowedTopics);
  const courseKeywords = buildCourseKeywordSet(courseData);
  const scopeScore = scoreOverlap(courseKeywords, questionTokens);
  const isGreeting = GREETINGS.has(normalizedQuestion);
  const isInScope = Boolean(
    isGreeting ||
    directFaqMatch ||
    relevantTopics.length ||
    scopeScore >= 0.2
  );

  return {
    isGreeting,
    isInScope,
    directFaqMatch,
    relevantTopics,
    scopeScore,
    questionTokens
  };
}

module.exports = {
  normalizeText,
  tokenize,
  findBestCourseMatch
};
