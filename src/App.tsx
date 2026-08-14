import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StudentRegister } from './components/StudentRegister';
import { ActiveQuiz } from './components/ActiveQuiz';
import { QuizResult } from './components/QuizResult';
import { LecturerDashboard } from './components/LecturerDashboard';
import { LecturerLoginModal } from './components/LecturerLoginModal';
import { Question, QuizConfig, QuizSubmission, QuizStatistics, StudentInfo, OptionKey } from './types';
import { DEFAULT_QUESTIONS, DEFAULT_QUIZ_CONFIG } from './data/defaultQuestions';
import { soundFX } from './utils/audio';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  // Authentication & Navigation
  const [isLecturerAuthenticated, setIsLecturerAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('lecturer_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'student' | 'lecturer'>('student');
  const [studentStage, setStudentStage] = useState<'register' | 'active' | 'result'>('register');

  // Sound preference
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Core Data
  const [config, setConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);

  // Lecturer Data
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [stats, setStats] = useState<QuizStatistics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Handle Logout
  const handleLecturerLogout = () => {
    try {
      sessionStorage.removeItem('lecturer_auth');
      sessionStorage.removeItem('lecturer_user');
    } catch {
      // ignore
    }
    setIsLecturerAuthenticated(false);
    setCurrentView('student');
    soundFX.playSelect();
  };

  // Handle successful login
  const handleLoginSuccess = () => {
    setIsLecturerAuthenticated(true);
    setCurrentView('lecturer');
    fetchData();
  };

  // Toggle Sound
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
  };

  // Fetch Quiz Info & Admin data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch Quiz Info (Questions & Config)
      const resInfo = await fetch('/api/quiz/info');
      if (resInfo.ok) {
        const infoData = await resInfo.json();
        if (infoData.config) setConfig(infoData.config);
        if (infoData.questions && infoData.questions.length > 0) {
          // If we also have full admin questions loaded, keep them
          setQuestions((prev) => (prev.length === infoData.questions.length ? prev : infoData.questions));
        }
      }

      // 2. Fetch Admin Submissions & Stats
      const resAdmin = await fetch('/api/admin/submissions');
      if (resAdmin.ok) {
        const adminData = await resAdmin.json();
        setSubmissions(adminData.submissions || []);
        setStats(adminData.stats || null);
        if (adminData.config) setConfig(adminData.config);
      }

      // 3. Fetch Full Admin Question Bank
      const resQ = await fetch('/api/admin/questions');
      if (resQ.ok) {
        const qData = await resQ.json();
        if (qData.questions && qData.questions.length > 0) {
          setQuestions(qData.questions);
        }
      }
    } catch (err) {
      console.warn('Backend API offline or loading locally:', err);
      // Fallback to local default state seamlessly
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up auto-sync polling every 3 seconds for real-time submission updates
    const pollInterval = setInterval(() => {
      fetchData();
    }, 3000);

    // Cross-tab synchronization via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('quiz_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_SUBMISSION') {
          fetchData();
        }
      };
    } catch {
      // BroadcastChannel not supported in some environments
    }

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'last_quiz_submission_time') {
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(pollInterval);
      if (channel) channel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchData]);

  // Handle Start Quiz from Student Registration
  const handleStartQuiz = (info: StudentInfo) => {
    setCurrentStudent(info);
    setStudentStage('active');
  };

  // Handle Finish Quiz and Submit
  const handleFinishQuiz = async (
    answers: { questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[]
  ) => {
    if (!currentStudent) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentInfo: currentStudent,
          answers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newSub = data.submission;
        
        // 1. Immediately update local state for instantaneous UI response
        setLatestSubmission(newSub);
        setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
        setStudentStage('result');

        // 2. Broadcast to other tabs/windows
        try {
          localStorage.setItem('last_quiz_submission_time', Date.now().toString());
          const channel = new BroadcastChannel('quiz_sync_channel');
          channel.postMessage({ type: 'NEW_SUBMISSION', submission: newSub });
          channel.close();
        } catch {
          // ignore
        }

        // 3. Refresh admin data and stats immediately from backend
        await fetchData();
      } else {
        // Fallback local evaluation if backend has issues
        evaluateLocally(answers);
      }
    } catch (err) {
      console.error('Error submitting quiz to backend:', err);
      evaluateLocally(answers);
    } finally {
      setIsLoading(false);
    }
  };

  // Local fallback evaluation logic
  const evaluateLocally = (
    answers: { questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[]
  ) => {
    if (!currentStudent) return;

    let correctCount = 0;
    let totalTimeSeconds = 0;

    const evaluatedAnswers = questions.map((q, idx) => {
      const ans = answers.find((a) => a.questionId === q.id);
      const selectedOption = ans ? ans.selectedOption : null;
      const timeSpent = ans ? ans.timeSpentSeconds : q.timeLimit || 10;
      totalTimeSeconds += timeSpent;
      const isCorrect = selectedOption === q.correctOption;
      if (isCorrect) correctCount += 1;

      return {
        questionId: q.id,
        orderNumber: idx + 1,
        questionText: q.questionText,
        selectedOption,
        correctOption: q.correctOption,
        isCorrect,
        timeSpentSeconds: timeSpent,
        explanation: q.explanation,
      };
    });

    const total = questions.length || 10;
    const scoreOutOfTen = Number(((correctCount / total) * 10).toFixed(1));
    const percentage = Math.round((correctCount / total) * 100);

    let grade: QuizSubmission['grade'] = 'Chưa đạt';
    if (scoreOutOfTen >= 9.0) grade = 'Xuất sắc';
    else if (scoreOutOfTen >= 8.0) grade = 'Giỏi';
    else if (scoreOutOfTen >= 6.5) grade = 'Khá';
    else if (scoreOutOfTen >= 5.0) grade = 'Trung bình';
    else grade = 'Chưa đạt';

    const localSub: QuizSubmission = {
      id: `sub_${Date.now()}`,
      studentInfo: currentStudent,
      answers: evaluatedAnswers,
      score: correctCount,
      totalQuestions: total,
      scoreOutOfTen,
      percentage,
      grade,
      passed: scoreOutOfTen >= 5.0,
      totalTimeSeconds,
      submittedAt: new Date().toISOString(),
    };

    setLatestSubmission(localSub);
    setSubmissions((prev) => [localSub, ...prev.filter((s) => s.id !== localSub.id)]);
    setStudentStage('result');

    try {
      localStorage.setItem('last_quiz_submission_time', Date.now().toString());
    } catch {}
  };

  // Retake Quiz
  const handleRetakeQuiz = () => {
    setLatestSubmission(null);
    setStudentStage('register');
  };

  // Lecturer Handlers:
  const handleDeleteSubmission = async (id: string) => {
    try {
      await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllSubmissions = async () => {
    try {
      await fetch('/api/admin/submissions', { method: 'DELETE' });
      setSubmissions([]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuestions = async (newQuestions: Question[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: newQuestions }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('Error updating questions:', err);
    }
    setQuestions(newQuestions);
    return true;
  };

  const handleResetDefaultQuestions = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/reset-default', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
        fetchData();
        return true;
      }
    } catch (err) {
      console.error('Error resetting questions:', err);
    }
    setQuestions([...DEFAULT_QUESTIONS]);
    return true;
  };

  const handleUpdateConfig = async (newConfig: Partial<QuizConfig>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        return true;
      }
    } catch (err) {
      console.error('Error updating config:', err);
    }
    setConfig((prev) => ({ ...prev, ...newConfig }));
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Global Navigation Header */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => {
          if (v === 'lecturer' && !isLecturerAuthenticated) {
            setShowLoginModal(true);
          } else {
            setCurrentView(v);
          }
        }}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        submissionCount={submissions.length}
        isLecturerAuthenticated={isLecturerAuthenticated}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onLogout={handleLecturerLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-10">
        {currentView === 'student' || !isLecturerAuthenticated ? (
          <>
            {studentStage === 'register' && (
              <StudentRegister
                config={config}
                totalQuestions={questions.length}
                onStartQuiz={handleStartQuiz}
              />
            )}

            {studentStage === 'active' && currentStudent && (
              <ActiveQuiz
                questions={questions}
                studentInfo={currentStudent}
                onFinishQuiz={handleFinishQuiz}
              />
            )}

            {studentStage === 'result' && latestSubmission && (
              <QuizResult
                submission={latestSubmission}
                onRetakeQuiz={handleRetakeQuiz}
                onGoToLecturerPortal={() => {
                  if (isLecturerAuthenticated) {
                    setCurrentView('lecturer');
                  } else {
                    setShowLoginModal(true);
                  }
                }}
              />
            )}
          </>
        ) : (
          <LecturerDashboard
            submissions={submissions}
            stats={stats}
            questions={questions}
            config={config}
            isLoading={isLoading}
            onRefreshData={fetchData}
            onDeleteSubmission={handleDeleteSubmission}
            onClearAllSubmissions={handleClearAllSubmissions}
            onUpdateQuestions={handleUpdateQuestions}
            onResetDefaultQuestions={handleResetDefaultQuestions}
            onUpdateConfig={handleUpdateConfig}
            onLogout={handleLecturerLogout}
          />
        )}
      </main>

      {/* Lecturer Authentication Modal */}
      <LecturerLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* High Density Compact Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold text-[11px] tracking-tight">AUTO-ED PRO</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">• Khoa Cơ khí - Xây dựng</span>
          </div>
          <div className="flex items-center gap-3">
            {!isLecturerAuthenticated ? (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
              >
                Cổng Giảng Viên (Đăng nhập)
              </button>
            ) : (
              <span className="text-[11px] text-emerald-400 font-mono">
                GV: Bladao (Đang đăng nhập)
              </span>
            )}
            <p className="text-[11px] text-slate-500 font-mono">Phiên bản Kiểm tra Trực tuyến 10s • KGC-2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
