import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_QUESTIONS, DEFAULT_QUIZ_CONFIG } from './src/data/defaultQuestions.ts';
import { Question, QuizConfig, QuizSubmission, StudentAnswer, OptionKey, QuizStatistics } from './src/types.ts';

const app = express();
const PORT = 3000;

// Data directory and paths
const DATA_DIR = path.join(process.cwd(), 'data');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

// In-memory caches synchronized with disk
let currentQuestions: Question[] = readJSONFile<Question[]>(QUESTIONS_FILE, DEFAULT_QUESTIONS);
if (!fs.existsSync(QUESTIONS_FILE) || currentQuestions.length === 0) {
  currentQuestions = [...DEFAULT_QUESTIONS];
  writeJSONFile(QUESTIONS_FILE, currentQuestions);
}

let currentConfig: QuizConfig = readJSONFile<QuizConfig>(CONFIG_FILE, DEFAULT_QUIZ_CONFIG);
if (!fs.existsSync(CONFIG_FILE)) {
  writeJSONFile(CONFIG_FILE, currentConfig);
}

let currentSubmissions: QuizSubmission[] = readJSONFile<QuizSubmission[]>(SUBMISSIONS_FILE, []);

// Express middleware
app.use(express.json({ limit: '10mb' }));

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

// ----------------- API ROUTES ----------------- //

// 1. Get Quiz Config & Questions for Students
app.get('/api/quiz/info', (_req, res) => {
  const sanitizedQuestions = currentQuestions.map((q, idx) => ({
    id: q.id,
    orderNumber: idx + 1,
    questionText: q.questionText,
    options: q.options,
    timeLimit: q.timeLimit || currentConfig.defaultTimeLimit || 10,
    category: q.category,
  }));

  res.json({
    config: currentConfig,
    totalQuestions: currentQuestions.length,
    questions: sanitizedQuestions,
  });
});

// 2. Submit Quiz Answers
app.post('/api/quiz/submit', (req, res) => {
  const { studentInfo, answers } = req.body as {
    studentInfo: { fullName: string; studentGroup: string; studentId?: string };
    answers: { questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[];
  };

  if (!studentInfo || !studentInfo.fullName || !studentInfo.studentGroup) {
    return res.status(400).json({ error: 'Thông tin sinh viên không đầy đủ' });
  }

  const evaluatedAnswers: StudentAnswer[] = [];
  let correctCount = 0;
  let totalTimeSeconds = 0;

  currentQuestions.forEach((q, idx) => {
    const studentAns = (answers || []).find((a) => a.questionId === q.id);
    const selectedOption = studentAns ? studentAns.selectedOption : null;
    const timeSpent = studentAns ? studentAns.timeSpentSeconds : q.timeLimit;
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

  const totalQuestions = currentQuestions.length || 10;
  const scoreOutOfTen = Number(((correctCount / totalQuestions) * 10).toFixed(1));
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  let grade: QuizSubmission['grade'] = 'Chưa đạt';
  if (scoreOutOfTen >= 9.0) grade = 'Xuất sắc';
  else if (scoreOutOfTen >= 8.0) grade = 'Giỏi';
  else if (scoreOutOfTen >= 6.5) grade = 'Khá';
  else if (scoreOutOfTen >= 5.0) grade = 'Trung bình';
  else grade = 'Chưa đạt';

  const passed = scoreOutOfTen >= (currentConfig.passingScorePercentage / 10);

  const submission: QuizSubmission = {
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

// Helper for calculating stats
function calculateStatistics(): QuizStatistics {
  const total = currentSubmissions.length;
  if (total === 0) {
    return {
      totalSubmissions: 0,
      averageScoreOutOfTen: 0,
      passRatePercentage: 0,
      highestScore: 0,
      lowestScore: 0,
      groupStats: [],
      questionAccuracy: currentQuestions.map((q, idx) => ({
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

  const scores = currentSubmissions.map((s) => s.scoreOutOfTen);
  const avgScore = Number((scores.reduce((a, b) => a + b, 0) / total).toFixed(2));
  const passCount = currentSubmissions.filter((s) => s.passed).length;
  const passRate = Math.round((passCount / total) * 100);
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);

  // Group stats
  const groupMap = new Map<string, { totalScore: number; count: number }>();
  currentSubmissions.forEach((s) => {
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
  const questionAccuracy = currentQuestions.map((q, idx) => {
    let correctCount = 0;
    let totalAttempts = 0;
    const distribution: Record<OptionKey, number> = { A: 0, B: 0, C: 0, D: 0 };

    currentSubmissions.forEach((sub) => {
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
    totalSubmissions: total,
    averageScoreOutOfTen: avgScore,
    passRatePercentage: passRate,
    highestScore: highest,
    lowestScore: lowest,
    groupStats,
    questionAccuracy,
  };
}

// 3. Admin: Get all Submissions & Stats
app.get('/api/admin/submissions', (_req, res) => {
  const stats = calculateStatistics();
  res.json({
    submissions: currentSubmissions,
    stats,
    config: currentConfig,
  });
});

// 4. Admin: Delete Single Submission
app.delete('/api/admin/submissions/:id', (req, res) => {
  const { id } = req.params;
  currentSubmissions = currentSubmissions.filter((s) => s.id !== id);
  writeJSONFile(SUBMISSIONS_FILE, currentSubmissions);
  res.json({ success: true, message: 'Đã xóa kết quả bài thi' });
});

// 5. Admin: Clear All Submissions
app.delete('/api/admin/submissions', (_req, res) => {
  currentSubmissions = [];
  writeJSONFile(SUBMISSIONS_FILE, currentSubmissions);
  res.json({ success: true, message: 'Đã xóa toàn bộ kết quả bài thi' });
});

// 6. Admin: Get Full Question Bank (with correct answers & explanations)
app.get('/api/admin/questions', (_req, res) => {
  res.json({
    questions: currentQuestions,
    config: currentConfig,
  });
});

// 7. Admin: Update Whole Question Bank
app.post('/api/admin/questions', (req, res) => {
  const { questions } = req.body as { questions: Question[] };
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Danh sách câu hỏi không hợp lệ' });
  }

  currentQuestions = questions.map((q, idx) => ({
    ...q,
    id: q.id || `cau-${idx + 1}-${Date.now()}`,
    orderNumber: idx + 1,
    timeLimit: q.timeLimit || currentConfig.defaultTimeLimit || 10,
  }));

  writeJSONFile(QUESTIONS_FILE, currentQuestions);
  res.json({ success: true, questions: currentQuestions });
});

// 8. Admin: Add New Question
app.post('/api/admin/questions/add', (req, res) => {
  const q = req.body as Partial<Question>;
  if (!q.questionText || !q.options || q.options.length < 2 || !q.correctOption) {
    return res.status(400).json({ error: 'Dữ liệu câu hỏi chưa hợp lệ' });
  }

  const newQuestion: Question = {
    id: `cau-${Date.now()}`,
    orderNumber: currentQuestions.length + 1,
    questionText: q.questionText,
    options: q.options,
    correctOption: q.correctOption,
    explanation: q.explanation || 'Chưa có giải thích chi tiết.',
    timeLimit: q.timeLimit || currentConfig.defaultTimeLimit || 10,
    category: q.category || 'Hệ thống điện ô tô',
  };

  currentQuestions.push(newQuestion);
  writeJSONFile(QUESTIONS_FILE, currentQuestions);
  res.json({ success: true, question: newQuestion, questions: currentQuestions });
});

// 9. Admin: Edit Question
app.put('/api/admin/questions/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body as Partial<Question>;
  const idx = currentQuestions.findIndex((q) => q.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
  }

  currentQuestions[idx] = {
    ...currentQuestions[idx],
    ...updatedData,
    id,
    orderNumber: currentQuestions[idx].orderNumber,
  };

  writeJSONFile(QUESTIONS_FILE, currentQuestions);
  res.json({ success: true, question: currentQuestions[idx], questions: currentQuestions });
});

// 10. Admin: Delete Question
app.delete('/api/admin/questions/:id', (req, res) => {
  const { id } = req.params;
  if (currentQuestions.length <= 1) {
    return res.status(400).json({ error: 'Không thể xóa câu hỏi cuối cùng của đề thi' });
  }

  currentQuestions = currentQuestions.filter((q) => q.id !== id);
  // Re-index order numbers
  currentQuestions.forEach((q, idx) => {
    q.orderNumber = idx + 1;
  });

  writeJSONFile(QUESTIONS_FILE, currentQuestions);
  res.json({ success: true, questions: currentQuestions });
});

// 11. Admin: Reset Questions to Default 10
app.post('/api/admin/reset-default', (_req, res) => {
  currentQuestions = [...DEFAULT_QUESTIONS];
  writeJSONFile(QUESTIONS_FILE, currentQuestions);
  res.json({ success: true, message: 'Đã khôi phục 10 câu hỏi chuẩn', questions: currentQuestions });
});

// 12. Admin: Update Quiz Config
app.put('/api/admin/config', (req, res) => {
  const newConfig = req.body as Partial<QuizConfig>;
  currentConfig = {
    ...currentConfig,
    ...newConfig,
  };

  writeJSONFile(CONFIG_FILE, currentConfig);
  res.json({ success: true, config: currentConfig });
});

// 13. Admin: Export Submissions to CSV (UTF-8 with BOM for Excel)
app.get('/api/admin/export-csv', (_req, res) => {
  const BOM = '\uFEFF';
  let csv = BOM + 'STT,Mã SV,Họ và Tên,Nhóm / Lớp,Số câu đúng,Tổng số câu,Điểm hệ 10,Tỷ lệ (%),Xếp loại,Thời gian làm (s),Ngày nộp\n';

  currentSubmissions.forEach((sub, idx) => {
    const row = [
      idx + 1,
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

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Ket_Qua_Trac_Nghiem_Dien_O_To_1.csv"');
  res.send(csv);
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
