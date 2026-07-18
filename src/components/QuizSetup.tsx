import React, { useState } from "react";
import { Sparkles, Brain, Clock, ChevronRight, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface QuizSetupProps {
  onGenerate: (topic: string, count: number, timerMinutes: number) => void;
  isLoading: boolean;
  error: string | null;
}

const SUGGESTED_TOPICS = [
  { name: "JavaScript & TypeScript", icon: "💻", desc: "Closures, async, types, and ESNext" },
  { name: "World History", icon: "🏛️", desc: "Ancient empires to modern history" },
  { name: "Space & Astrophysics", icon: "🚀", desc: "Planets, black holes, and the cosmos" },
  { name: "Artificial Intelligence", icon: "🤖", desc: "Neural networks, LLMs, and history of AI" },
  { name: "General Science", icon: "🧪", desc: "Physics, chemistry, biology essentials" },
  { name: "Movie & Pop Culture", icon: "🎬", desc: "Cinema classics, directors, and trivia" }
];

const LOADING_STEPS = [
  "Connecting to Gemini AI...",
  "Analyzing topic nuances...",
  "Crafting high-quality questions...",
  "Formatting distractors & explanations...",
  "Finalizing your customized quiz challenge..."
];

export default function QuizSetup({ onGenerate, isLoading, error }: QuizSetupProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<number>(10);
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);

  // Rotate loading steps every 1.5s while loading
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStepIdx(0);
      interval = setInterval(() => {
        setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 1800);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onGenerate(topic.trim(), count, timerMinutes);
  };

  const selectSuggestion = (name: string) => {
    setTopic(name);
  };

  const updateTopic = (value: string) => {
    setTopic(value);
  };

  return (
    <div id="quiz-setup-container" className="max-w-2xl mx-auto">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-sm border border-indigo-100">
          <Brain className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          What do you want to learn today?
        </h1>
        <p className="text-slate-500 max-w-md mx-auto">
          Type any topic in the universe. Gemini AI will instantly craft a custom, high-fidelity, interactive quiz with explanations.
        </p>
      </div>

      {isLoading ? (
        <motion.div
          id="setup-loading-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 text-center flex flex-col items-center justify-center min-h-[350px]"
        >
          {/* AI Pulsing Ring */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-40 animate-pulse"></div>
            <div className="relative flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-full shadow-lg">
              <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-1">Generating Your Quiz</h3>
          <p className="text-indigo-600 font-medium h-6 animate-pulse mb-6">
            {LOADING_STEPS[loadingStepIdx]}
          </p>

          <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-indigo-500 to-violet-600 h-1.5 rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: "95%" }}
              transition={{ duration: 10, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">This typically takes 2-4 seconds</p>
        </motion.div>
      ) : (
        <motion.div
          id="setup-form-card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
        >
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-sm rounded-2xl flex items-start gap-3">
              <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Quiz Generation Failed:</span> {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic Input */}
            <div>
              <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-700 mb-2">
                1. Enter Quiz Topic
              </label>
              <div className="relative">
                <input
                  id="topic-input"
                  type="text"
                  value={topic}
                  onChange={(e) => updateTopic(e.target.value)}
                  placeholder="e.g. quantum physics, French cuisine, world capitals..."
                  className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800 placeholder-slate-400 font-medium transition-all"
                  required
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Quick Suggestions */}
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Or choose a popular topic
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUGGESTED_TOPICS.map((suggest) => (
                  <button
                    id={`suggest-btn-${suggest.name.replace(/\s+/g, "-").toLowerCase()}`}
                    key={suggest.name}
                    type="button"
                    onClick={() => selectSuggestion(suggest.name)}
                    className={`flex items-start gap-3 p-3.5 text-left rounded-2xl border transition-all ${
                      topic === suggest.name
                        ? "bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-500/10"
                        : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <span className="text-2xl">{suggest.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{suggest.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{suggest.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Question Count */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  2. Number of Questions
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 20, 30].map((num) => (
                    <button
                      id={`count-btn-${num}`}
                      key={num}
                      type="button"
                      onClick={() => setCount(num)}
                      className={`py-3 text-center font-bold text-sm rounded-xl border transition-all ${
                        count === num
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15"
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit Setup */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  3. Timer Setup
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 5, 10].map((mins) => (
                    <button
                      id={`timer-btn-${mins}`}
                      key={mins}
                      type="button"
                      onClick={() => setTimerMinutes(mins)}
                      className={`py-3 text-center font-bold text-xs rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        timerMinutes === mins
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15"
                          : "bg-slate-50 border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{mins} Min</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="generate-quiz-submit"
              type="submit"
              disabled={!topic.trim()}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base rounded-2xl shadow-lg hover:from-indigo-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 mt-2"
            >
              <span>Launch Custom Quiz</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
