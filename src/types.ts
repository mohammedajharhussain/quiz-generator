export interface Question {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizSession {
  topic: string;
  questions: Question[];
  timeLimit: number; // in seconds
  totalQuestions: number;
}

export interface ScoreRecord {
  id: string;
  username: string;
  topic: string;
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  date: string;
}
