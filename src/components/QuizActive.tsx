import { useState, useEffect } from "react";
import { Question } from "../types";
import { Clock, ChevronLeft, ChevronRight, CheckSquare, Award, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuizActiveProps {
  topic: string;
  questions: Question[];
  timeLimit: number; // in seconds
  source: "gemini" | "fallback";
  onSubmit: (userAnswers: (number | null)[], timeSpent: number) => void;
}

export default function QuizActive({ topic, questions, timeLimit, source, onSubmit }: QuizActiveProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [timeSpent, setTimeSpent] = useState(0);

  // Sound effects or visual beats for countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      // Time's up! Auto submit.
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAutoSubmit = () => {
    onSubmit(userAnswers, timeSpent);
  };

  const handleSelectOption = (optionIdx: number) => {
    const updated = [...userAnswers];
    updated[currentIdx] = optionIdx;
    setUserAnswers(updated);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Helper to format remaining time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLastQuestion = currentIdx === questions.length - 1;
  const answeredCount = userAnswers.filter((a) => a !== null).length;
  const progressPercent = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div id="quiz-active-container" className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
      {/* Sidebar: Question Grid and Status */}
      <div className="lg:col-span-1 space-y-6">
        {/* Timer Box */}
        <div
          id="quiz-timer-box"
          className={`rounded-2xl p-5 border text-center transition-all ${
            timeLeft < 15
              ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
              : "bg-white border-slate-100 text-slate-700"
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <Clock className={`w-5 h-5 ${timeLeft < 15 ? "text-rose-600" : "text-slate-400"}`} />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">Time Remaining</span>
          </div>
          <div className="text-3xl font-black font-mono tracking-tight">
            {formatTime(timeLeft)}
          </div>
          {timeLeft < 15 && (
            <div className="text-[10px] font-bold uppercase mt-1 text-rose-500 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Time is running out!
            </div>
          )}
        </div>

        {/* Progress Navigation Grid */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Your Progress</h4>
            <div className="text-slate-700 text-sm font-semibold">
              Answered <span className="text-indigo-600 font-bold">{answeredCount}</span> of {questions.length}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, idx) => {
              const isSelected = currentIdx === idx;
              const isAnswered = userAnswers[idx] !== null;
              return (
                <button
                  id={`grid-nav-btn-${idx}`}
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`aspect-square rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 ring-2 ring-indigo-500/20"
                      : isAnswered
                      ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                      : "bg-slate-50 border border-slate-100 text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            id="finish-quiz-early-btn"
            onClick={handleAutoSubmit}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <CheckSquare className="w-4 h-4" />
            Submit Quiz
          </button>
        </div>
      </div>

      {/* Main Panel: Question Card */}
      <div className="lg:col-span-3 space-y-6">
        {/* Progress bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
            {topic} • Q{currentIdx + 1} of {questions.length}
          </div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-semibold">
            <span className={`px-3 py-1 rounded-full ${source === "gemini" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
              {source === "gemini" ? "AI-generated" : "Fallback quiz"}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Question View with Animations */}
        <AnimatePresence mode="wait">
          <motion.div
            id={`question-card-${currentIdx}`}
            key={currentIdx}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg min-h-[400px] flex flex-col justify-between"
          >
            <div>
              {/* Question Text */}
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug mb-8">
                {questions[currentIdx].questionText}
              </h2>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4">
                {questions[currentIdx].options.map((opt, oIdx) => {
                  const isSelected = userAnswers[currentIdx] === oIdx;
                  const letter = ["A", "B", "C", "D"][oIdx];
                  return (
                    <button
                      id={`option-btn-${oIdx}`}
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`w-full p-4 text-left rounded-2xl border-2 transition-all flex items-center gap-4 ${
                        isSelected
                          ? "bg-indigo-50/50 border-indigo-600 ring-4 ring-indigo-500/5 text-indigo-900"
                          : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="font-semibold text-sm leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
              <button
                id="prev-question-btn"
                onClick={handlePrev}
                disabled={currentIdx === 0}
                className="px-5 py-3 border border-slate-200 hover:border-slate-400 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  id="submit-quiz-final-btn"
                  onClick={handleAutoSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm rounded-xl shadow-md hover:from-indigo-500 hover:to-violet-500 flex items-center gap-2 transition-all"
                >
                  <Award className="w-4 h-4" />
                  Submit Quiz
                </button>
              ) : (
                <button
                  id="next-question-btn"
                  onClick={handleNext}
                  className="px-5 py-3 border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 font-bold text-sm rounded-xl flex items-center gap-2 transition-all"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
