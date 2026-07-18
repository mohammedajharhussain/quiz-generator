import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ override: true });

const SCORES_FILE = path.join(process.cwd(), "scores.json");

async function readScores() {
  try {
    const data = await fs.readFile(SCORES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeScores(scores: any[]) {
  await fs.writeFile(SCORES_FILE, JSON.stringify(scores, null, 2), "utf-8");
}

function buildFallbackQuestions(topic: string, questionCount: number) {
  const safeTopic = topic.trim() || "the selected topic";
  const promptTemplates = [
    "Which description best captures a key principle of {topic}?",
    "What is the most accurate way to explain how {topic} works?",
    "Which example best illustrates the core idea behind {topic}?",
    "What challenge is most closely associated with {topic}?",
    "Why is {topic} important in its field?",
    "Which statement correctly describes a common misconception about {topic}?",
    "How does {topic} differ from related concepts?",
    "Which factor most influences the behavior of {topic}?",
    "What role does {topic} play in modern applications?",
    "Which outcome is most likely when {topic} is applied correctly?",
    "What is the most useful real-world application of {topic}?",
    "Which foundational idea supports the concept of {topic}?",
    "How would you summarize the main benefit of {topic}?",
    "Which key term is most closely related to {topic}?",
    "What is a common mistake people make when learning about {topic}?",
  ];

  const phrasingExtras = [
    "",
    " In this context, choose the best answer.",
    " Focus on the main concept.",
    " Keep the explanation practical.",
    " Think about the topic's core principle.",
  ];

  const questions = [] as Array<{
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }>;

  for (let i = 0; i < questionCount; i += 1) {
    const template = promptTemplates[i % promptTemplates.length];
    const prompt = template.replace(/{topic}/g, safeTopic);
    const suffix = i >= promptTemplates.length ? ` (Variant ${Math.floor(i / promptTemplates.length) + 1})` : "";
    const extra = phrasingExtras[i % phrasingExtras.length];

    questions.push({
      questionText: `${prompt}${suffix}${extra}`,
      options: [
        `A correct and precise explanation of ${safeTopic}.`,
        `A plausible but misleading description of ${safeTopic}.`,
        `A broader concept that is related to ${safeTopic} but not specific enough.`,
        `A false statement that sounds like it is about ${safeTopic}.`,
      ],
      correctAnswerIndex: 0,
      explanation: `The correct answer is the precise description that best matches the principles of ${safeTopic}.`,
    });
  }

  return questions;
}

function buildFallbackAnswer(topic: string, question: string) {
  const safeTopic = topic.trim() || "your selected topic";
  const safeQuestion = question.trim() || "your study question";

  return `Study Explanation for ${safeTopic}: ${safeQuestion}. Focus on the core principles of ${safeTopic}, keeping the answer concise, study-focused, and limited to the requested subject.`;
}

function parseQuestionPayload(payload: string) {
  const trimmed = payload.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to fenced-code extraction
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // fall through to partial extraction
  }

  const firstBrace = candidate.indexOf("{");
  const firstBracket = candidate.indexOf("[");
  const start = [firstBrace, firstBracket].filter((value) => value >= 0).sort((a, b) => a - b)[0];

  if (start < 0) return null;

  const closingBracket = candidate.lastIndexOf("]");
  const closingBrace = candidate.lastIndexOf("}");
  const end = Math.max(closingBracket, closingBrace);

  if (end < start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeQuestion(question: any) {
  if (!question || typeof question !== "object") return null;

  const questionText = typeof question.questionText === "string" ? question.questionText.trim() : "";
  const options = Array.isArray(question.options)
    ? question.options.filter((option: any) => typeof option === "string" && option.trim())
    : [];

  if (!questionText || options.length < 4) return null;

  const normalizedOptions = options.slice(0, 4);
  while (normalizedOptions.length < 4) {
    normalizedOptions.push(`Option ${normalizedOptions.length + 1}`);
  }

  const correctAnswerIndex = Number.isInteger(question.correctAnswerIndex)
    ? question.correctAnswerIndex
    : 0;

  return {
    questionText,
    options: normalizedOptions,
    correctAnswerIndex: correctAnswerIndex >= 0 && correctAnswerIndex < normalizedOptions.length ? correctAnswerIndex : 0,
    explanation: typeof question.explanation === "string" && question.explanation.trim()
      ? question.explanation.trim()
      : "This answer is correct because it is the most accurate choice for the topic.",
  };
}

function normalizeQuestions(rawQuestions: any, topic: string, questionCount: number) {
  const fallbackQuestions = buildFallbackQuestions(topic, questionCount);

  const candidateList = Array.isArray(rawQuestions)
    ? rawQuestions
    : rawQuestions && typeof rawQuestions === "object"
      ? Array.isArray(rawQuestions.questions)
        ? rawQuestions.questions
        : rawQuestions.questions && typeof rawQuestions.questions === "object"
          ? Object.values(rawQuestions.questions)
          : [rawQuestions]
      : [];

  const normalized: Array<{
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
  }> = [];
  const seen = new Set<string>();

  for (const candidate of candidateList) {
    const question = normalizeQuestion(candidate);
    if (!question) continue;

    const key = question.questionText.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(question);

    if (normalized.length >= questionCount) break;
  }

  if (normalized.length < questionCount) {
    for (const fallbackQuestion of fallbackQuestions) {
      const key = fallbackQuestion.questionText.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      normalized.push(fallbackQuestion);

      if (normalized.length >= questionCount) break;
    }
  }

  return normalized.slice(0, questionCount);
}

function listenWithFallback(app: any, basePort: number) {
  return new Promise<number>((resolve, reject) => {
    const tryPort = (port: number) => {
      const server = app.listen(port, "0.0.0.0", () => {
        console.log(`Server running at: http://localhost:${port}`);
        resolve(port);
      });

      server.on("error", (err: any) => {
        if (err && err.code === "EADDRINUSE" && port < basePort + 10) {
          console.warn(`Port ${port} is busy, trying ${port + 1}...`);
          server.close(() => tryPort(port + 1));
        } else {
          reject(err);
        }
      });
    };

    tryPort(basePort);
  });
}

async function startServer() {
  const app = express();
  const requestedPort = Number(process.env.PORT) || 5001;

  app.use(express.json());

  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON payload." });
    }
    next(err);
  });

  // API: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Save user score
  app.post("/api/scores", async (req, res) => {
    try {
      const { username, topic, score, totalQuestions, timeSpent } = req.body;
      if (!username || !topic || score === undefined || !totalQuestions) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const scores = await readScores();
      const newRecord = {
        id: Math.random().toString(36).substring(2, 11),
        username,
        topic,
        score,
        totalQuestions,
        timeSpent: timeSpent || 0,
        date: new Date().toISOString(),
      };

      scores.push(newRecord);
      // Keep only the top 100 scores to prevent file bloat
      scores.sort((a: any, b: any) => b.score / b.totalQuestions - a.score / a.totalQuestions);
      const topScores = scores.slice(0, 100);

      await writeScores(topScores);
      res.json({ success: true, record: newRecord });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to save score", details: err.message });
    }
  });

  // API: Get leaderboard
  app.get("/api/scores", async (req, res) => {
    try {
      const scores = await readScores();
      res.json(scores);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to read scores", details: err.message });
    }
  });

  // API: Generate Quiz using Gemini
  app.post("/api/generate_quiz", async (req, res) => {
    try {
      const { topic, count } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const questionCount = parseInt(count) || 10;
      if (questionCount !== 10 && questionCount !== 20 && questionCount !== 30) {
        return res.status(400).json({ error: "Question count must be 10, 20, or 30" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let questions;
      let source: "gemini" | "fallback" = "fallback";

      if (apiKey && apiKey !== "") {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const prompt = `Generate a high-quality, engaging multiple-choice quiz about the topic: "${topic}". 
The quiz must contain exactly ${questionCount} questions.
Ensure that:
1. Questions range from basic concepts to advanced nuances, creating a balanced difficulty curve.
2. Each question has exactly 4 options. Only one option must be correct.
3. The options must be creative, distinct, and highly plausible (no obviously incorrect filler options).
4. Provide a clear, educational, and complete explanation for the correct answer.
5. Focus every question strictly on the requested topic and do not introduce unrelated subject matter.`;

          const configuredModel = process.env.GEMINI_MODEL?.trim();
          const currentModel = configuredModel && !["gemini-1.5-flash", "gemini-1.5-pro"].includes(configuredModel)
            ? configuredModel
            : "gemini-2.5-flash";
          console.log(`Attempting quiz generation with model: ${currentModel}...`);

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              systemInstruction: "You are an expert educator and quiz designer. Create highly accurate, educational, and challenging multiple-choice questions.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                description: "A list of generated multiple-choice questions.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionText: {
                      type: Type.STRING,
                      description: "The text of the quiz question.",
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 plausible options for answers.",
                    },
                    correctAnswerIndex: {
                      type: Type.INTEGER,
                      description: "The 0-based index of the correct option (0, 1, 2, or 3).",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "A clear explanation of why the correct answer is right.",
                    },
                  },
                  required: ["questionText", "options", "correctAnswerIndex", "explanation"],
                },
              },
            },
          });

          const responseText = response.text;
          if (!responseText) {
            throw new Error("Empty response received from Gemini.");
          }

          const parsedPayload = parseQuestionPayload(responseText);
          questions = normalizeQuestions(parsedPayload, topic, questionCount);
          if (!questions || questions.length === 0) {
            throw new Error("Gemini returned no valid quiz questions.");
          }
          source = "gemini";
          console.log(`Quiz generation succeeded using model: ${currentModel}`);
        } catch (err: any) {
          console.warn("Gemini unavailable, falling back to local questions:", err.message || err);
          questions = buildFallbackQuestions(topic, questionCount);
        }
      } else {
        questions = buildFallbackQuestions(topic, questionCount);
      }

      res.json({
        topic,
        questions,
        totalQuestions: questions.length,
        source,
      });
    } catch (err: any) {
      console.error("Quiz generation error:", err);
      let errorMessage = "Failed to generate quiz. Please try again.";
      const errorStr = (err.message || "").toLowerCase();
      
      if (err.status === 503 || errorStr.includes("503") || errorStr.includes("demand") || errorStr.includes("unavailable")) {
        errorMessage = "The Gemini AI service is currently experiencing very high demand. Please wait a few seconds and try clicking 'Launch Custom Quiz' again.";
      }

      res.status(500).json({
        error: errorMessage,
        details: err.message,
      });
    }
  });

  // API: Study assistant for topic-based student questions
  app.post("/api/study_assistant", async (req, res) => {
    try {
      const { topic, question } = req.body;
      if (!topic || !question) {
        return res.status(400).json({ error: "Topic and question are both required." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      let answer = buildFallbackAnswer(topic, question);
      let source: "gemini" | "fallback" = "fallback";

      if (apiKey && apiKey !== "") {
        try {
          const ai = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const prompt = `You are a focused study assistant.

Answer this student question using only the requested topic: "${topic}".

Requirements:
- Write the answer as concise bullet points (use "-" for each bullet).
- Keep it directly relevant to the topic.
- If you need to include any explanation, do it inside the bullets.
- Do not write a long paragraph.

Question: "${question}"

Answer:`;

          const configuredModel = process.env.GEMINI_MODEL?.trim();
          const currentModel = configuredModel && !["gemini-1.5-flash", "gemini-1.5-pro"].includes(configuredModel)
            ? configuredModel
            : "gemini-2.5-flash";

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              systemInstruction: "You are an expert study assistant. Provide accurate, study-focused explanations that stay on topic.",
              responseMimeType: "text/plain",
            },
          });

          const responseText = response.text?.trim();
          if (responseText) {
            answer = responseText;
            source = "gemini";
          }
        } catch (err: any) {
          console.warn("Study assistant Gemini unavailable, using fallback answer:", err.message || err);
          answer = buildFallbackAnswer(topic, question);
          source = "fallback";
        }
      }

      res.json({ topic, question, answer, source });
    } catch (err: any) {
      const message = err?.message || "Failed to answer study question.";
      console.error("Study assistant error:", message);
      res.status(500).json({ error: message, details: err?.stack || null });
    }
  });

  // API fallback for invalid endpoints
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found", path: req.originalUrl });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const port = await listenWithFallback(app, requestedPort);
  console.log(`Server ready on port ${port}`);
}

startServer();
