import React, { useState } from "react";
import { MessageSquare, Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface StudyAssistantProps {
  defaultTopic?: string;
}

export default function StudyAssistant({ defaultTopic }: StudyAssistantProps) {
  const [studyTopic, setStudyTopic] = useState(defaultTopic || "");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [source, setSource] = useState<"gemini" | "fallback" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTopic = studyTopic.trim() || (defaultTopic?.trim() || "");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!effectiveTopic || !question.trim()) {
      setError("Please enter a topic and question before getting an answer.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setSource(null);

    try {
      const response = await fetch("/api/study_assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: effectiveTopic, question: question.trim() }),
      });

      const text = await response.text();
      let data: any = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { error: text };
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || text || "Failed to fetch study answer.");
      }

      setAnswer(data?.answer || "No answer returned.");
      setSource(data?.source === "gemini" ? "gemini" : "fallback");
    } catch (err: any) {
      setError(err.message || "Unable to fetch study answer.");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (defaultTopic?.trim() && !studyTopic.trim()) {
      setStudyTopic(defaultTopic);
    }
  }, [defaultTopic]);

  return (
    <motion.div
      id="study-assistant-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mt-8"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white grid place-items-center shadow-sm">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Study Assistant</h3>
          <p className="text-sm text-slate-500">
            Ask a study-focused question related to your current topic and get a concise explanation.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="study-topic-input" className="block text-sm font-semibold text-slate-700 mb-2">
            Study topic
          </label>
          <input
            id="study-topic-input"
            type="text"
            value={studyTopic}
            onChange={(event) => setStudyTopic(event.target.value)}
            placeholder={defaultTopic?.trim() ? `Enter a topic or use current: ${defaultTopic}` : "Enter the topic for your study question"}
            className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="study-question-input" className="block text-sm font-semibold text-slate-700 mb-2">
            Ask a study question about "{effectiveTopic || "your topic"}"
          </label>
          <textarea
            id="study-question-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={3}
            placeholder="e.g. Why does this topic matter? Or how does this concept work?"
            className="w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {!studyTopic.trim() && (
            <p className="mt-2 text-xs text-slate-500">
              Enter a topic first to get a focused answer. You can still type your question here.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            id="study-assistant-submit"
            type="submit"
            disabled={!effectiveTopic || !question.trim() || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isLoading ? "Thinking..." : "Get Answer"}
          </button>

          {source && (
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
              source === "gemini"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}>
              {source === "gemini" ? "AI Study Answer" : "Fallback Study Answer"}
            </span>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {answer && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-3">Study Answer</div>

            {/* Render points if model returns bullet/numbered lists */}
            {(() => {
              const text = (answer ?? "").trim();
              const looksLikeList =
                /^\s*(?:[-*•]|\d+\.|\([a-zA-Z]\))/m.test(text) ||
                text.includes("\n- ") ||
                text.includes("\n• ");

              if (looksLikeList) {
                const lines = text
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter(Boolean);

                // Prefer consecutive list lines as bullets
                const bulletItems = lines
                  .filter((l) => {
                    return /^\s*(?:[-*•]|\d+\.|\([a-zA-Z]\))/m.test(l);
                  })
                  .map((l) => l.replace(/^\s*(?:[-*•]|\d+\.|\([a-zA-Z]\))\s*/, "").trim())
                  .filter(Boolean);

                if (bulletItems.length >= 2) {
                  return (
                    <ul className="list-disc pl-5 space-y-1 leading-7">
                      {bulletItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  );
                }
              }

              // Fallback to paragraph
              return <p className="leading-7">{answer}</p>;
            })()}
          </div>
        )}
      </form>
    </motion.div>
  );
}
