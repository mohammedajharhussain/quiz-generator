import { useState, useEffect } from "react";
import QuizSetup from "./components/QuizSetup";
import QuizActive from "./components/QuizActive";
import QuizResults from "./components/QuizResults";
import HighScores from "./components/HighScores";
import StudyAssistant from "./components/StudyAssistant";
import { QuizSession, ScoreRecord } from "./types";
import { Trophy, Brain, Sparkles } from "lucide-react";
import { motion } from "motion/react";



export default function App() {
  const [view, setView] = useState<"setup" | "quiz" | "results">("setup");
  const [activeQuiz, setActiveQuiz] = useState<QuizSession | null>(null);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Fetch leaderboard on mount
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch("/api/scores");
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error("Failed to load scores:", err);
    }
  };

  const handleGenerateQuiz = async (topic: string, count: number, timerMinutes: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate quiz. Try a different topic.");
      }

      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions returned from AI. Try adjusting the topic name.");
      }

      setActiveQuiz({
        topic: data.topic,
        questions: data.questions,
        totalQuestions: data.totalQuestions,
        timeLimit: timerMinutes * 60,
        source: data.source === "gemini" ? "gemini" : "fallback",
      });
      setUserAnswers(new Array(data.questions.length).fill(null));
      setView("quiz");
      setShowLeaderboard(false); // Close leaderboard during active quiz
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizSubmit = (answers: (number | null)[], totalSecondsSpent: number) => {
    setUserAnswers(answers);
    setTimeSpent(totalSecondsSpent);
    setView("results");
  };

  const handleSaveScore = async (username: string, correctScore: number): Promise<boolean> => {
    if (!activeQuiz) return false;

    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          topic: activeQuiz.topic,
          score: correctScore,
          totalQuestions: activeQuiz.totalQuestions,
          timeSpent,
        }),
      });

      if (res.ok) {
        await fetchLeaderboard(); // refresh local list
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to save score:", err);
      return false;
    }
  };

  const handleRestart = () => {
    setActiveQuiz(null);
    setUserAnswers([]);
    setTimeSpent(0);
    setError(null);
    setView("setup");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans flex flex-col justify-between">
      {/* Universal Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <button
            id="header-brand-logo"
            onClick={view !== "quiz" ? handleRestart : undefined}
            disabled={view === "quiz"}
            className="flex items-center gap-2 px-1.5 py-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-default"
          >
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/15">
              <Brain className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight block">Quiz Generator</span>
              <span className="text-[10px] font-bold text-indigo-600 block leading-none uppercase tracking-wider">AI Powered</span>
            </div>
          </button>

          {/* Controls */}
          {view !== "quiz" && (
            <button
              id="header-leaderboard-toggle"
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                showLeaderboard
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-white border-slate-200 hover:border-slate-300 text-slate-600"
              }`}
            >
              <Trophy className={`w-4 h-4 ${showLeaderboard ? "text-amber-500 fill-amber-500/20" : "text-slate-400"}`} />
              <span>{showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        {showLeaderboard && view !== "quiz" ? (
          <motion.div
            id="leaderboard-view-wrapper"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <button
                id="back-to-quiz-setup-btn"
                onClick={() => setShowLeaderboard(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-500 hover:underline flex items-center gap-1"
              >
                ← Back to Quiz Setup
              </button>
            </div>
            <HighScores scores={leaderboard} />
          </motion.div>
        ) : (
          <div className="space-y-8">
            {view === "setup" && (
              <>
                <QuizSetup
                  onGenerate={handleGenerateQuiz}
                  isLoading={isLoading}
                  error={error}
                />
                <StudyAssistant />
              </>
            )}

            {view === "quiz" && activeQuiz && (
              <>
                <QuizActive
                  topic={activeQuiz.topic}
                  questions={activeQuiz.questions}
                  timeLimit={activeQuiz.timeLimit}
                  source={activeQuiz.source}
                  onSubmit={handleQuizSubmit}
                />
                <StudyAssistant defaultTopic={activeQuiz.topic} />
              </>
            )}

            {view === "results" && activeQuiz && (
              <QuizResults
                topic={activeQuiz.topic}
                questions={activeQuiz.questions}
                userAnswers={userAnswers}
                timeSpent={timeSpent}
                onRestart={handleRestart}
                onSaveScore={handleSaveScore}
              />
            )}
          </div>
        )}
      </main>

      {/* Universal Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Dynamically driven by <strong>Gemini 3.5 Flash</strong></span>
        </div>
        <p>© 2026 Quiz Generator. All rights reserved.</p>
      </footer>
    </div>
  );
}
