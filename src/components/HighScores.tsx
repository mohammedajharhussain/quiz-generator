import { useState } from "react";
import { ScoreRecord } from "../types";
import { Trophy, Search, Calendar, Clock, Award, ShieldAlert } from "lucide-react";

interface HighScoresProps {
  scores: ScoreRecord[];
  onClear?: () => void;
}

export default function HighScores({ scores }: HighScoresProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredScores = scores.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.topic.toLowerCase().includes(term) ||
      rec.username.toLowerCase().includes(term)
    );
  });

  const formatSpentTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    if (mins === 0) return `${remainder}s`;
    return `${mins}m ${remainder}s`;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <div id="leaderboard-root" className="max-w-4xl mx-auto bg-white rounded-3xl p-6 border border-slate-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">Persistent Leaderboard</h2>
            <p className="text-xs text-slate-500">Compare top quiz scores dynamically across all learning topics</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            id="leaderboard-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search topic or explorer..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold placeholder-slate-400"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
        </div>
      </div>

      {filteredScores.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 text-slate-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No score records found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {searchTerm
              ? "No scores match your current search criteria. Try typing a different topic!"
              : "Launch a quiz, complete the questions, and submit your score to claim your place here!"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-4">Rank</th>
                <th className="pb-3">Explorer</th>
                <th className="pb-3">Topic</th>
                <th className="pb-3 text-center">Accuracy</th>
                <th className="pb-3 text-center">Time</th>
                <th className="pb-3 pr-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map((rec, index) => {
                const rank = index + 1;
                const scorePercent = Math.round((rec.score / rec.totalQuestions) * 100);

                // Row highlighting or podium decorations
                let rankDecoration = <span className="font-mono text-slate-500">{rank}</span>;
                let rowBg = "hover:bg-slate-50/50";

                if (rank === 1) {
                  rankDecoration = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-[11px] font-black shadow-sm">
                      1st
                    </span>
                  );
                  rowBg = "bg-amber-50/20 hover:bg-amber-50/35";
                } else if (rank === 2) {
                  rankDecoration = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 text-[11px] font-black shadow-sm">
                      2nd
                    </span>
                  );
                } else if (rank === 3) {
                  rankDecoration = (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-400 text-white text-[11px] font-black shadow-sm">
                      3rd
                    </span>
                  );
                }

                return (
                  <tr key={rec.id} className={`border-b border-slate-50 text-sm transition-colors ${rowBg}`}>
                    <td className="py-3.5 pl-4">{rankDecoration}</td>
                    <td className="py-3.5">
                      <div className="font-bold text-slate-800">{rec.username}</div>
                    </td>
                    <td className="py-3.5">
                      <div className="font-semibold text-indigo-700 max-w-xs truncate">{rec.topic}</div>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-bold text-slate-800">
                          {rec.score}/{rec.totalQuestions}
                        </span>
                        <span className="text-xs text-slate-400">({scorePercent}%)</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 text-slate-600 font-mono text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatSpentTime(rec.timeSpent)}</span>
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="inline-flex items-center gap-1 text-slate-400 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(rec.date)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
