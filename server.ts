import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_QUESTIONS, DEFAULT_QUIZ_CONFIG, DEFAULT_QUIZZES } from './src/data/defaultQuestions.ts';
import { Question, QuizConfig, QuizSubmission, StudentAnswer, OptionKey, QuizStatistics, Quiz } from './src/types.ts';

const app = express();
const PORT = 3000;

// Data directory and paths
const DATA_DIR = path.join(process.cwd(), 'data');
const QUIZZES_FILE = path.join(DATA_DIR, 'quizzes.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for reading/writing JSON files
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
  }
}

// In-memory caches synchronized with persistent disk files
let currentQuizzes: Quiz[] = readJSONFile<Quiz[]>(QUIZZES_FILE, DEFAULT_QUIZZES);
if (!fs.existsSync(QUIZZES_FILE) || currentQuizzes.length === 0) {
  currentQuizzes = JSON.parse(JSON.stringify(DEFAULT_QUIZZES));
  writeJSONFile(QUIZZES_FILE, currentQuizzes);
}

// Ensure at least one quiz is marked active
if (!currentQuizzes.some((q) => q.isActive)) {
  if (currentQuizzes.length > 0) {
    currentQuizzes[0].isActive = true;
    writeJSONFile(QUIZZES_FILE, currentQuizzes);
  }
}

let currentSubmissions: QuizSubmission[] = readJSONFile<QuizSubmission[]>(SUBMISSIONS_FILE, []);

// Express middleware
app.use(express.json({ limit: '10mb' }));

// Helper to get active quiz
function getActiveQuiz(): Quiz {
  const active = currentQuizzes.find((q) => q.isActive);
  if (active) return active;
  if (currentQuizzes.length > 0) {
    currentQuizzes[0].isActive = true;
    writeJSONFile(QUIZZES_FILE, currentQuizzes);
    return currentQuizzes[0];
  }
  // Fallback
  const defaultQ: Quiz = {
    id: 'quiz_default',
    title: DEFAULT_QUIZ_CONFIG.title,
    subjectCode: DEFAULT_QUIZ_CONFIG.subjectCode,
    subjectName: DEFAULT_QUIZ_CONFIG.subjectName,
    description: DEFAULT_QUIZ_CONFIG.description,
    defaultTimeLimit: DEFAULT_QUIZ_CONFIG.defaultTimeLimit,
    passingScorePercentage: DEFAULT_QUIZ_CONFIG.passingScorePercentage,
    shuffleQuestions: false,
    allowReviewAfterQuiz: true,
    departmentName: 'Khoa Cơ khí - Xây dựng',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: DEFAULT_QUESTIONS,
  };
  currentQuizzes = [defaultQ];
  writeJSONFile(QUIZZES_FILE, currentQuizzes);
  return defaultQ;
}

// ----------------- AUTHENTICATION ROUTES ----------------- //

// Lecturer Login Route
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  const cleanUser = (username || '').trim();
  const cleanPass = (password || '').trim();

  if (
    cleanUser.toLowerCase() === 'bladao' &&
    (cleanPass === 'Bladao' || cleanPass.toLowerCase() === 'bladao')
  ) {
    return res.json({
      success: true,
      user: {
        username: 'Bladao',
        role: 'lecturer',
        fullName: 'Giảng Viên Bladao',
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Tên đăng nhập hoặc mật khẩu không chính xác',
  });
});

// ----------------- STUDENT QUIZ API ROUTES ----------------- //

// 1. Get Quiz Info for Students (active or specified quizId)
app.get('/api/quiz/info', (req, res) => {
  const { quizId } = req.query as { quizId?: string };
  let quiz: Quiz | undefined;

  if (quizId) {
    quiz = currentQuizzes.find((q) => q.id === quizId);
  }
  if (!quiz) {
    quiz = getActiveQuiz();
  }

  const sanitizedQuestions = quiz.questions.map((q, idx) => ({
    id: q.id,
    orderNumber: idx + 1,
    questionText: q.questionText,
    options: q.options,
    timeLimit: q.timeLimit || quiz!.defaultTimeLimit || 10,
    category: q.category,
  }));

  const config: QuizConfig = {
    id: quiz.id,
    title: quiz.title,
    subjectCode: quiz.subjectCode,
    subjectName: quiz.subjectName,
    description: quiz.description,
    defaultTimeLimit: quiz.defaultTimeLimit,
    passingScorePercentage: quiz.passingScorePercentage,
    shuffleQuestions: quiz.shuffleQuestions,
    allowReviewAfterQuiz: quiz.allowReviewAfterQuiz,
    departmentName: quiz.departmentName,
  };

  res.json({
    quizId: quiz.id,
    config,
    totalQuestions: quiz.questions.length,
    questions: sanitizedQuestions,
    availableQuizzes: currentQuizzes.map((q) => ({
      id: q.id,
      title: q.title,
      subjectCode: q.subjectCode,
      subjectName: q.subjectName,
      questionCount: q.questions.length,
      isActive: q.isActive,
    })),
  });
});

// 2. Submit Quiz Answers (Permanently saves result with quiz metadata)
app.post('/api/quiz/submit', (req, res) => {
  const { studentInfo, answers, quizId } = req.body as {
    studentInfo: { fullName: string; studentGroup: string; studentId?: string };
    answers: { questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[];
    quizId?: string;
  };

  if (!studentInfo || !studentInfo.fullName || !studentInfo.studentGroup) {
    return res.status(400).json({ error: 'Thông tin sinh viên không đầy đủ' });
  }

  let quiz: Quiz | undefined;
  if (quizId) {
    quiz = currentQuizzes.find((q) => q.id === quizId);
  }
  if (!quiz) {
    quiz = getActiveQuiz();
  }

  const evaluatedAnswers: StudentAnswer[] = [];
  let correctCount = 0;
  let totalTimeSeconds = 0;

  quiz.questions.forEach((q, idx) => {
    const studentAns = (answers || []).find((a) => a.questionId === q.id);
    const selectedOption = studentAns ? studentAns.selectedOption : null;
    const timeSpent = studentAns ? studentAns.timeSpentSeconds : (q.timeLimit || 10);
    totalTimeSeconds += timeSpent;

    const isCorrect = selectedOption === q.correctOption;
    if (isCorrect) {
      correctCount += 1;
    }

    evaluatedAnswers.push({
      questionId: q.id,
      orderNumber: idx + 1,
      questionText: q.questionText,
      selectedOption,
      correctOption: q.correctOption,
      isCorrect,
      timeSpentSeconds: timeSpent,
      explanation: q.explanation,
    });
  });

  const totalQuestions = quiz.questions.length || 1;
  const scoreOutOfTen = Number(((correctCount / totalQuestions) * 10).toFixed(1));
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  let grade: QuizSubmission['grade'] = 'Chưa đạt';
  if (scoreOutOfTen >= 9.0) grade = 'Xuất sắc';
  else if (scoreOutOfTen >= 8.0) grade = 'Giỏi';
  else if (scoreOutOfTen >= 6.5) grade = 'Khá';
  else if (scoreOutOfTen >= 5.0) grade = 'Trung bình';
  else grade = 'Chưa đạt';

  const passed = scoreOutOfTen >= ((quiz.passingScorePercentage || 50) / 10);

  const submission: QuizSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    quizId: quiz.id,
    quizTitle: quiz.title,
    subjectCode: quiz.subjectCode,
    subjectName: quiz.subjectName,
    studentInfo: {
      fullName: studentInfo.fullName.trim(),
      studentGroup: studentInfo.studentGroup.trim(),
      studentId: studentInfo.studentId ? studentInfo.studentId.trim() : undefined,
    },
    answers: evaluatedAnswers,
    score: correctCount,
    totalQuestions,
    scoreOutOfTen,
    percentage,
    grade,
    passed,
    totalTimeSeconds,
    submittedAt: new Date().toISOString(),
  };

  currentSubmissions.unshift(submission);
  writeJSONFile(SUBMISSIONS_FILE, currentSubmissions);

  res.json({
    success: true,
    submission,
  });
});

// ----------------- ADMIN STATS CALCULATOR ----------------- //

function calculateStatistics(targetQuizId?: string): QuizStatistics {
  const filteredSubmissions = targetQuizId && targetQuizId !== 'ALL'
    ? currentSubmissions.filter((s) => s.quizId === targetQuizId)
    : currentSubmissions;

  const targetQuiz = targetQuizId && targetQuizId !== 'ALL'
    ? currentQuizzes.find((q) => q.id === targetQuizId)
    : getActiveQuiz();

  const total = filteredSubmissions.length;
  if (total === 0) {
    return {
      quizId: targetQuizId,
      totalSubmissions: 0,
      averageScoreOutOfTen: 0,
      passRatePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      groupStats: [],
      questionAccuracy: (targetQuiz?.questions || []).map((q, idx) => ({
        questionId: q.id,
        orderNumber: idx + 1,
        questionText: q.questionText,
        correctCount: 0,
        totalAttempts: 0,
        accuracyPercentage: 0,
        optionDistribution: { A: 0, B: 0, C: 0, D: 0 },
      })),
    };
  }

  const scores = filteredSubmissions.map((s) => s.scoreOutOfTen);
  const avgScore = Number((scores.reduce((a, b) => a + b, 0) / total).toFixed(2));
  const passCount = filteredSubmissions.filter((s) => s.passed).length;
  const passRate = Math.round((passCount / total) * 100);
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);

  // Group stats
  const groupMap = new Map<string, { totalScore: number; count: number }>();
  filteredSubmissions.forEach((s) => {
    const group = s.studentInfo.studentGroup || 'Chung';
    const entry = groupMap.get(group) || { totalScore: 0, count: 0 };
    entry.totalScore += s.scoreOutOfTen;
    entry.count += 1;
    groupMap.set(group, entry);
  });

  const groupStats = Array.from(groupMap.entries()).map(([groupName, val]) => ({
    groupName,
    studentCount: val.count,
    averageScore: Number((val.totalScore / val.count).toFixed(2)),
  }));

  // Question accuracy
  const questionAccuracy = (targetQuiz?.questions || []).map((q, idx) => {
    let correctCount = 0;
    let totalAttempts = 0;
    const distribution: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };

    filteredSubmissions.forEach((sub) => {
      const ans = sub.answers.find((a) => a.questionId === q.id);
      if (ans) {
        totalAttempts += 1;
        if (ans.isCorrect) correctCount += 1;
        if (ans.selectedOption && distribution[ans.selectedOption] !== undefined) {
          distribution[ans.selectedOption] += 1;
        }
      }
    });

    return {
      questionId: q.id,
      orderNumber: idx + 1,
      questionText: q.questionText,
      correctCount,
      totalAttempts,
      accuracyPercentage: totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0,
      optionDistribution: distribution,
    };
  });

  return {
    quizId: targetQuizId,
    totalSubmissions: total,
    averageScoreOutOfTen: avgScore,
    passRatePercentage: passRate,
    highestScore: highest,
    lowestScore: lowest,
    groupStats,
    questionAccuracy,
  };
}

// ----------------- ADMIN MULTI-QUIZ MANAGEMENT ROUTES ----------------- //

// 3. Admin: Get all quizzes list
app.get('/api/admin/quizzes', (_req, res) => {
  res.json({
    quizzes: currentQuizzes,
    activeQuizId: getActiveQuiz().id,
  });
});

// 4. Admin: Get single quiz
app.get('/api/admin/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const quiz = currentQuizzes.find((q) => q.id === id);
  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
  }
  res.json({ quiz });
});

// 5. Admin: Create new quiz
app.post('/api/admin/quizzes', (req, res) => {
  const body = req.body as Partial<Quiz>;
  if (!body.title?.trim() || !body.subjectCode?.trim()) {
    return res.status(400).json({ error: 'Vui lòng nhập tên bài kiểm tra và mã môn học' });
  }

  const newQuiz: Quiz = {
    id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: body.title.trim(),
    subjectCode: body.subjectCode.trim().toUpperCase(),
    subjectName: body.subjectName?.trim() || body.title.trim(),
    description: body.description?.trim() || 'Bài kiểm tra trắc nghiệm 10s',
    defaultTimeLimit: body.defaultTimeLimit || 10,
    passingScorePercentage: body.passingScorePercentage || 50,
    shuffleQuestions: Boolean(body.shuffleQuestions),
    allowReviewAfterQuiz: body.allowReviewAfterQuiz !== false,
    departmentName: body.departmentName || 'Khoa Cơ khí - Xây dựng',
    isActive: Boolean(body.isActive),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: Array.isArray(body.questions) && body.questions.length > 0 ? body.questions : [
      {
        id: `q_${Date.now()}_1`,
        orderNumber: 1,
        questionText: 'Nội dung câu hỏi số 1 (Vui lòng chỉnh sửa)?',
        options: [
          { key: 'A', text: 'Đáp án A mẫu' },
          { key: 'B', text: 'Đáp án B mẫu' },
          { key: 'C', text: 'Đáp án C mẫu' },
          { key: 'D', text: 'Đáp án D mẫu' },
        ],
        correctOption: 'A',
        explanation: 'Giải thích chi tiết cho câu hỏi 1.',
        timeLimit: body.defaultTimeLimit || 10,
        category: 'Tổng quan',
      },
    ],
  };

  if (newQuiz.isActive) {
    currentQuizzes.forEach((q) => (q.isActive = false));
  }

  currentQuizzes.unshift(newQuiz);
  writeJSONFile(QUIZZES_FILE, currentQuizzes);

  res.json({ success: true, quiz: newQuiz, quizzes: currentQuizzes });
});

// 6. Admin: Update existing quiz
app.put('/api/admin/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body as Partial<Quiz>;
  const idx = currentQuizzes.findIndex((q) => q.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra cần sửa' });
  }

  if (body.isActive) {
    currentQuizzes.forEach((q) => (q.isActive = false));
  }

  currentQuizzes[idx] = {
    ...currentQuizzes[idx],
    ...body,
    id,
    updatedAt: new Date().toISOString(),
    questions: body.questions ? body.questions.map((q, qIdx) => ({
      ...q,
      orderNumber: qIdx + 1,
    })) : currentQuizzes[idx].questions,
  };

  writeJSONFile(QUIZZES_FILE, currentQuizzes);
  res.json({ success: true, quiz: currentQuizzes[idx], quizzes: currentQuizzes });
});

// 7. Admin: Activate a Quiz
app.post('/api/admin/quizzes/:id/activate', (req, res) => {
  const { id } = req.params;
  const quiz = currentQuizzes.find((q) => q.id === id);
  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
  }

  currentQuizzes.forEach((q) => (q.isActive = q.id === id));
  writeJSONFile(QUIZZES_FILE, currentQuizzes);

  res.json({ success: true, message: `Đã kích hoạt bài kiểm tra: ${quiz.title}`, quizzes: currentQuizzes, activeQuiz: quiz });
});

// 8. Admin: Duplicate a Quiz
app.post('/api/admin/quizzes/:id/duplicate', (req, res) => {
  const { id } = req.params;
  const source = currentQuizzes.find((q) => q.id === id);
  if (!source) {
    return res.status(404).json({ error: 'Không tìm thấy bài kiểm tra' });
  }

  const duplicatedQuiz: Quiz = {
    ...JSON.parse(JSON.stringify(source)),
    id: `quiz_${Date.now()}_copy`,
    title: `${source.title} (Bản sao)`,
    subjectCode: `${source.subjectCode}-B`,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  currentQuizzes.unshift(duplicatedQuiz);
  writeJSONFile(QUIZZES_FILE, currentQuizzes);

  res.json({ success: true, quiz: duplicatedQuiz, quizzes: currentQuizzes });
});

// 9. Admin: Delete a Quiz
app.delete('/api/admin/quizzes/:id', (req, res) => {
  const { id } = req.params;
  if (currentQuizzes.length <= 1) {
    return res.status(400).json({ error: 'Hệ thống phải có ít nhất 1 bài kiểm tra' });
  }

  const toDelete = currentQuizzes.find((q) => q.id === id);
  currentQuizzes = currentQuizzes.filter((q) => q.id !== id);

  // If deleted quiz was active, activate the first available
  if (toDelete?.isActive && currentQuizzes.length > 0) {
    currentQuizzes[0].isActive = true;
  }

  writeJSONFile(QUIZZES_FILE, currentQuizzes);
  res.json({ success: true, quizzes: currentQuizzes });
});

// ----------------- SUBMISSION & STATS ROUTES ----------------- //

// 10. Admin: Get Submissions & Stats (with optional quiz filter)
app.get('/api/admin/submissions', (req, res) => {
  const { quizId } = req.query as { quizId?: string };
  const stats = calculateStatistics(quizId);
  const active = getActiveQuiz();

  const filteredSubs = quizId && quizId !== 'ALL'
    ? currentSubmissions.filter((s) => s.quizId === quizId)
    : currentSubmissions;

  res.json({
    submissions: filteredSubs,
    allSubmissions: currentSubmissions,
    stats,
    activeQuiz: active,
    quizzes: currentQuizzes,
  });
});

// 11. Admin: Delete Single Submission
app.delete('/api/admin/submissions/:id', (req, res) => {
  const { id } = req.params;
  currentSubmissions = currentSubmissions.filter((s) => s.id !== id);
  writeJSONFile(SUBMISSIONS_FILE, currentSubmissions);
  res.json({ success: true, message: 'Đã xóa kết quả bài thi' });
});

// 12. Admin: Clear Submissions (filtered or all)
app.delete('/api/admin/submissions', (req, res) => {
  const { quizId } = req.query as { quizId?: string };
  if (quizId && quizId !== 'ALL') {
    currentSubmissions = currentSubmissions.filter((s) => s.quizId !== quizId);
  } else {
    currentSubmissions = [];
  }
  writeJSONFile(SUBMISSIONS_FILE, currentSubmissions);
  res.json({ success: true, message: 'Đã xóa kết quả bài thi thành công' });
});

// 13. Admin: Export Submissions to CSV with UTF-8 BOM
app.get('/api/admin/export-csv', (req, res) => {
  const { quizId } = req.query as { quizId?: string };
  const targetSubs = quizId && quizId !== 'ALL'
    ? currentSubmissions.filter((s) => s.quizId === quizId)
    : currentSubmissions;

  const BOM = '\uFEFF';
  let csv = BOM + 'STT,Mã Môn Học,Tên Bài Kiểm Tra,Mã SV,Họ và Tên,Lớp / Nhóm,Số câu đúng,Tổng số câu,Điểm hệ 10,Tỷ lệ (%),Xếp loại,Thời gian (s),Ngày nộp\n';

  targetSubs.forEach((sub, idx) => {
    const row = [
      idx + 1,
      `"${sub.subjectCode || ''}"`,
      `"${(sub.quizTitle || '').replace(/"/g, '""')}"`,
      `"${sub.studentInfo.studentId || ''}"`,
      `"${sub.studentInfo.fullName.replace(/"/g, '""')}"`,
      `"${sub.studentInfo.studentGroup.replace(/"/g, '""')}"`,
      sub.score,
      sub.totalQuestions,
      sub.scoreOutOfTen,
      `${sub.percentage}%`,
      `"${sub.grade}"`,
      sub.totalTimeSeconds,
      `"${new Date(sub.submittedAt).toLocaleString('vi-VN')}"`,
    ];
    csv += row.join(',') + '\n';
  });

  const filename = quizId && quizId !== 'ALL'
    ? `Ket_Qua_${quizId}_${Date.now()}.csv`
    : `Ket_Qua_Tat_Ca_Bai_Kiem_Tra_${Date.now()}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// 14. Admin: Reset to Default Quizzes
app.post('/api/admin/reset-default', (_req, res) => {
  currentQuizzes = JSON.parse(JSON.stringify(DEFAULT_QUIZZES));
  writeJSONFile(QUIZZES_FILE, currentQuizzes);
  res.json({ success: true, message: 'Đã khôi phục ngân hàng bài kiểm tra chuẩn', quizzes: currentQuizzes, activeQuiz: getActiveQuiz() });
});

// ----------------- START SERVER / VITE INTEGRATION ----------------- //

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
