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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json());

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
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not defined. Please add your Gemini API key in Settings > Secrets."
        });
      }

      // Initialize Gemini Client Lazily
      const ai = new GoogleGenAI({
        apiKey: apiKey,
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
4. Provide a clear, educational, and complete explanation for the correct answer.`;

      let response;
      const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
      const maxRetries = modelsToTry.length;
      let delayMs = 1200;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const currentModel = modelsToTry[attempt - 1];
        try {
          console.log(`Attempting quiz generation with model: ${currentModel} (Attempt ${attempt}/${maxRetries})...`);
          response = await ai.models.generateContent({
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
          // Break the loop if successful
          console.log(`Quiz generation succeeded using model: ${currentModel}`);
          break;
        } catch (err: any) {
          console.warn(`Gemini API call failed on attempt ${attempt} with model ${currentModel}:`, err.message || err);
          if (attempt === maxRetries) {
            throw err; // Re-throw if all models/attempts fail
          }
          // Wait before the next attempt
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        }
      }

      if (!response) {
        throw new Error("No response was returned from the Gemini API after retries.");
      }

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      const questions = JSON.parse(responseText.trim());
      res.json({
        topic,
        questions,
        totalQuestions: questions.length,
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
