import React, { useState } from "react";
import { Question } from "../types";
import { Award, RotateCcw, Save, ThumbsUp, XCircle, CheckCircle2, ChevronDown, ChevronUp, Clock, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

interface QuizResultsProps {
  topic: string;
  questions: Question[];
  userAnswers: (number | null)[];
  timeSpent: number; // in seconds
  onRestart: () => void;
  onSaveScore: (username: string, score: number) => Promise<boolean>;
}

export default function QuizResults({
  topic,
  questions,
  userAnswers,
  timeSpent,
  onRestart,
  onSaveScore,
}: QuizResultsProps) {
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Calculate correct answers count
  const correctCount = userAnswers.reduce((acc, ans, idx) => {
    return ans === questions[idx].correctAnswerIndex ? acc + 1 : acc;
  }, 0);

  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

  // Determine Badge & Rank
  let badge = "Novice Explorer 🌱";
  let badgeColor = "text-amber-600 bg-amber-50 border-amber-100";
  let message = "Keep studying and exploring! Every mistake is a learning opportunity.";

  if (scorePercentage >= 90) {
    badge = "Galaxy Brain 🧠";
    badgeColor = "text-indigo-600 bg-indigo-50 border-indigo-100";
    message = "Outstanding! You demonstrated mastery over this topic with near-flawless precision!";
  } else if (scorePercentage >= 70) {
    badge = "Cognitive Scholar 🎓";
    badgeColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
    message = "Great work! You have a solid, deep understanding of these concepts.";
  } else if (scorePercentage >= 50) {
    badge = "Knowledge Seeker 🧭";
    badgeColor = "text-sky-600 bg-sky-50 border-sky-100";
    message = "Good effort! You grasp the fundamentals, but there's room to grow.";
  }

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isSubmitting || isSaved) return;

    setIsSubmitting(true);
    setSaveError(null);
    try {
      const success = await onSaveScore(username.trim(), correctCount);
      if (success) {
        setIsSaved(true);
      } else {
        setSaveError("Could not connect to leaderboard database. Please try again.");
      }
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const formatSpentTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    if (mins === 0) return `${remainder}s`;
    return `${mins}m ${remainder}s`;
  };

  return (
    <div id="quiz-results-container" className="max-w-4xl mx-auto space-y-8">
      {/* Visual Badge Card */}
      <motion.div
        id="results-badge-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center flex flex-col items-center justify-center space-y-4"
      >
        <div className="text-sm font-bold uppercase tracking-widest text-slate-400">Quiz Completed</div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{topic}</h1>

        <div className="relative">
          <div className="text-7xl md:text-8xl font-black text-indigo-600 tracking-tight">
            {scorePercentage}%
          </div>
          <div className="text-slate-500 font-semibold mt-1">
            {correctCount} of {totalQuestions} Correct
          </div>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm border ${badgeColor}`}>
          {badge}
        </div>

        <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
          {message}
        </p>

        <div className="flex items-center gap-6 text-sm text-slate-500 pt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Time Spent: <strong className="text-slate-800">{formatSpentTime(timeSpent)}</strong></span>
          </div>
        </div>
      </motion.div>

      {/* Leaderboard High Score Form */}
      {!isSaved ? (
        <motion.div
          id="leaderboard-save-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-slate-900">Submit Your Score</h3>
            <p className="text-sm text-slate-500">Save your score to the persistent global leaderboard for {topic}.</p>
          </div>
          <form onSubmit={handleSaveSubmit} className="flex w-full md:w-auto items-center gap-2">
            <input
              id="leaderboard-name-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your Explorer Name..."
              maxLength={20}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium w-full md:w-60"
              required
            />
            <button
              id="save-score-submit-btn"
              type="submit"
              disabled={isSubmitting || !username.trim()}
              className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shrink-0 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Saving..." : "Save"}</span>
            </button>
          </form>
          {saveError && <p className="text-rose-600 text-xs mt-1 w-full text-center md:text-right">{saveError}</p>}
        </motion.div>
      ) : (
        <motion.div
          id="score-saved-notification"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-emerald-50 border border-emerald-100 text-emerald-800 font-bold text-sm py-4 px-6 rounded-2xl text-center flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Score successfully saved to the global leaderboard!</span>
        </motion.div>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          id="restart-quiz-btn"
          onClick={onRestart}
          className="px-6 py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm rounded-2xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Create New Quiz
        </button>
      </div>

      {/* Question Review Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-500" />
          <span>Complete Review & AI Explanations</span>
        </h2>

        <div className="space-y-3">
          {questions.map((q, idx) => {
            const userAns = userAnswers[idx];
            const isCorrect = userAns === q.correctAnswerIndex;
            const isExpanded = expandedIndex === idx;

            return (
              <div
                id={`review-item-${idx}`}
                key={idx}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isExpanded ? "ring-2 ring-indigo-500/15" : "hover:border-slate-300"
                } ${isCorrect ? "border-emerald-100" : userAns === null ? "border-slate-200" : "border-rose-100"}`}
              >
                {/* Header / Summary */}
                <button
                  id={`review-toggle-${idx}`}
                  onClick={() => toggleExpand(idx)}
                  className="w-full text-left p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase">Question {idx + 1}</span>
                      <h3 className="text-base font-bold text-slate-800 mt-0.5 line-clamp-2 md:line-clamp-none">
                        {q.questionText}
                      </h3>
                    </div>
                  </div>
                  <span className="shrink-0 text-slate-400 mt-1">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </span>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-6 border-t border-slate-50 pt-4 space-y-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, oIdx) => {
                        const isCorrectOpt = oIdx === q.correctAnswerIndex;
                        const isUserOpt = oIdx === userAns;

                        let cardStyle = "border-slate-200 bg-white text-slate-700";
                        if (isCorrectOpt) {
                          cardStyle = "border-emerald-200 bg-emerald-50 text-emerald-900 font-bold";
                        } else if (isUserOpt) {
                          cardStyle = "border-rose-200 bg-rose-50 text-rose-900";
                        }

                        return (
                          <div key={oIdx} className={`p-3.5 rounded-xl border text-sm flex items-start gap-2.5 ${cardStyle}`}>
                            <span className="text-xs font-bold shrink-0 mt-0.5 uppercase tracking-wide">
                              {["A", "B", "C", "D"][oIdx]}
                            </span>
                            <div>
                              <span>{opt}</span>
                              {isCorrectOpt && <span className="text-[10px] font-bold text-emerald-600 block uppercase mt-0.5">Correct Answer</span>}
                              {!isCorrectOpt && isUserOpt && <span className="text-[10px] font-bold text-rose-500 block uppercase mt-0.5">Your Choice (Incorrect)</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        <Award className="w-4 h-4" />
                        AI Educator Explanation
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
