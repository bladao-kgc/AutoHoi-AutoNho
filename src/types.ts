export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  key: OptionKey;
  text: string;
}

export interface Question {
  id: string;
  orderNumber: number;
  questionText: string;
  options: QuestionOption[];
  correctOption: OptionKey;
  explanation: string;
  timeLimit: number; // in seconds (default: 10)
  category?: string;
}

export interface QuizConfig {
  id?: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  defaultTimeLimit: number; // 10 seconds default
  passingScorePercentage: number; // 50%
  shuffleQuestions: boolean;
  allowReviewAfterQuiz: boolean;
  departmentName?: string;
}

export interface Quiz {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  description: string;
  defaultTimeLimit: number;
  passingScorePercentage: number;
  shuffleQuestions: boolean;
  allowReviewAfterQuiz: boolean;
  departmentName: string;
  isActive: boolean; // Currently active for student examination
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface StudentInfo {
  fullName: string;
  studentGroup: string; // Nhóm học / Lớp
  studentId?: string; // Mã SV (tùy chọn)
}

export interface StudentAnswer {
  questionId: string;
  orderNumber: number;
  questionText: string;
  selectedOption: OptionKey | null; // null if timed out / skipped
  correctOption: OptionKey;
  isCorrect: boolean;
  timeSpentSeconds: number;
  explanation: string;
}

export interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  subjectCode: string;
  subjectName: string;
  studentInfo: StudentInfo;
  answers: StudentAnswer[];
  score: number; // e.g., 8 (number of correct answers)
  totalQuestions: number; // e.g., 10
  scoreOutOfTen: number; // e.g., 8.0
  percentage: number; // e.g., 80%
  grade: 'Xuất sắc' | 'Giỏi' | 'Khá' | 'Trung bình' | 'Chưa đạt';
  passed: boolean;
  totalTimeSeconds: number;
  submittedAt: string; // ISO string
}

export interface QuizStatistics {
  quizId?: string;
  totalSubmissions: number;
  averageScoreOutOfTen: number;
  passRatePercentage: number;
  highestScore: number;
  lowestScore: number;
  groupStats: {
    groupName: string;
    studentCount: number;
    averageScore: number;
  }[];
  questionAccuracy: {
    questionId: string;
    orderNumber: number;
    questionText: string;
    correctCount: number;
    totalAttempts: number;
    accuracyPercentage: number;
    optionDistribution: Record<OptionKey, number>;
  }[];
}

