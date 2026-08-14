import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StudentRegister } from './components/StudentRegister';
import { ActiveQuiz } from './components/ActiveQuiz';
import { QuizResult } from './components/QuizResult';
import { LecturerDashboard } from './components/LecturerDashboard';
import { LecturerLoginModal } from './components/LecturerLoginModal';
import { Question, QuizConfig, QuizSubmission, QuizStatistics, StudentInfo, OptionKey, Quiz } from './types';
import { DEFAULT_QUIZZES, DEFAULT_QUESTIONS, DEFAULT_QUIZ_CONFIG } from './data/defaultQuestions';
import { soundFX } from './utils/audio';

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

  // Multi-Quiz Data
  const [quizzes, setQuizzes] = useState<Quiz[]>(DEFAULT_QUIZZES);
  const [selectedStudentQuizId, setSelectedStudentQuizId] = useState<string>(DEFAULT_QUIZZES[0].id);
  const [selectedLecturerQuizFilterId, setSelectedLecturerQuizFilterId] = useState<string>('ALL');

  // Current active student taking quiz info
  const [currentStudent, setCurrentStudent] = useState<StudentInfo | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<QuizSubmission | null>(null);

  // Lecturer Submissions & Stats
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<QuizSubmission[]>([]);
  const [stats, setStats] = useState<QuizStatistics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Derive current student quiz
  const currentStudentQuiz: Quiz = quizzes.find((q) => q.id === selectedStudentQuizId) 
    || quizzes.find((q) => q.isActive) 
    || quizzes[0] 
    || DEFAULT_QUIZZES[0];

  const currentQuizConfig: QuizConfig = {
    title: currentStudentQuiz.title,
    subjectCode: currentStudentQuiz.subjectCode,
    subjectName: currentStudentQuiz.subjectName,
    description: currentStudentQuiz.description,
    defaultTimeLimit: currentStudentQuiz.defaultTimeLimit,
    passingScorePercentage: currentStudentQuiz.passingScorePercentage,
    departmentName: currentStudentQuiz.departmentName,
    shuffleQuestions: false,
    allowReviewAfterQuiz: true,
  };

  // Derive active quiz (the one currently marked as isActive)
  const activeQuiz: Quiz = quizzes.find((q) => q.isActive) || quizzes[0] || DEFAULT_QUIZZES[0];

  // Handle Lecturer Logout
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

  // Fetch all quizzes, submissions and stats from backend
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Quizzes List
      const resQuizzes = await fetch('/api/admin/quizzes');
      if (resQuizzes.ok) {
        const qData = await resQuizzes.json();
        if (qData.quizzes && qData.quizzes.length > 0) {
          setQuizzes(qData.quizzes);
          // Set student selected quiz if not set or inactive
          const activeQ = qData.quizzes.find((q: Quiz) => q.isActive);
          if (activeQ && !selectedStudentQuizId) {
            setSelectedStudentQuizId(activeQ.id);
          }
        }
      }

      // 2. Fetch Submissions & Stats
      const queryParam = selectedLecturerQuizFilterId !== 'ALL' ? `?quizId=${selectedLecturerQuizFilterId}` : '';
      const resSubmissions = await fetch(`/api/admin/submissions${queryParam}`);
      if (resSubmissions.ok) {
        const subData = await resSubmissions.json();
        setSubmissions(subData.submissions || []);
        setAllSubmissions(subData.allSubmissions || subData.submissions || []);
        setStats(subData.stats || null);
      }
    } catch (err) {
      console.warn('Backend loading locally:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLecturerQuizFilterId, selectedStudentQuizId]);

  useEffect(() => {
    fetchData();

    // Auto-polling for instantaneous submission sync across student & lecturer tabs
    const pollInterval = setInterval(() => {
      fetchData();
    }, 2500);

    // Cross-tab synchronization via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('quiz_sync_channel');
      channel.onmessage = (event) => {
        if (event.data && (event.data.type === 'NEW_SUBMISSION' || event.data.type === 'QUIZ_UPDATED')) {
          fetchData();
        }
      };
    } catch {
      // BroadcastChannel not supported in some environments
    }

    // Cross-tab synchronization via storage event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'last_quiz_submission_time' || e.key === 'last_quiz_config_time') {
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
          quizId: currentStudentQuiz.id,
          studentInfo: currentStudent,
          answers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newSub = data.submission;

        // 1. Immediately update local state for instantaneous feedback
        setLatestSubmission(newSub);
        setSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
        setAllSubmissions((prev) => [newSub, ...prev.filter((s) => s.id !== newSub.id)]);
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

    const evaluatedAnswers = currentStudentQuiz.questions.map((q, idx) => {
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

    const total = currentStudentQuiz.questions.length || 10;
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
      quizId: currentStudentQuiz.id,
      quizTitle: currentStudentQuiz.title,
      subjectCode: currentStudentQuiz.subjectCode,
      subjectName: currentStudentQuiz.subjectName,
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
    setAllSubmissions((prev) => [localSub, ...prev.filter((s) => s.id !== localSub.id)]);
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

  // Quiz Management API Handlers:
  const handleActivateQuiz = async (quizId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/activate`, { method: 'POST' });
      if (res.ok) {
        setSelectedStudentQuizId(quizId);
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error activating quiz:', err);
    }
    return false;
  };

  const handleCreateQuiz = async (quizData: Partial<Quiz>): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      if (res.ok) {
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error creating quiz:', err);
    }
    return false;
  };

  const handleUpdateQuiz = async (quizId: string, quizData: Partial<Quiz>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizData),
      });
      if (res.ok) {
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error updating quiz:', err);
    }
    return false;
  };

  const handleDuplicateQuiz = async (quizId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error duplicating quiz:', err);
    }
    return false;
  };

  const handleDeleteQuiz = async (quizId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error deleting quiz:', err);
    }
    return false;
  };

  const handleDeleteSubmission = async (id: string) => {
    try {
      await fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      setAllSubmissions((prev) => prev.filter((s) => s.id !== id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllSubmissions = async (quizId?: string) => {
    try {
      const queryParam = quizId && quizId !== 'ALL' ? `?quizId=${quizId}` : '';
      await fetch(`/api/admin/submissions${queryParam}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetDefaultQuizzes = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/reset-default', { method: 'POST' });
      if (res.ok) {
        await fetchData();
        broadcastQuizUpdate();
        return true;
      }
    } catch (err) {
      console.error('Error resetting default quizzes:', err);
    }
    return false;
  };

  const broadcastQuizUpdate = () => {
    try {
      localStorage.setItem('last_quiz_config_time', Date.now().toString());
      const channel = new BroadcastChannel('quiz_sync_channel');
      channel.postMessage({ type: 'QUIZ_UPDATED' });
      channel.close();
    } catch {}
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
        submissionCount={allSubmissions.length}
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
                config={currentQuizConfig}
                totalQuestions={currentStudentQuiz.questions.length}
                availableQuizzes={quizzes.map((q) => ({
                  id: q.id,
                  title: q.title,
                  subjectCode: q.subjectCode,
                  subjectName: q.subjectName,
                  questionCount: q.questions.length,
                  isActive: q.isActive,
                }))}
                selectedQuizId={selectedStudentQuizId}
                onSelectQuiz={(id) => setSelectedStudentQuizId(id)}
                onStartQuiz={handleStartQuiz}
              />
            )}

            {studentStage === 'active' && currentStudent && (
              <ActiveQuiz
                questions={currentStudentQuiz.questions}
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
            allSubmissions={allSubmissions}
            stats={stats}
            quizzes={quizzes}
            activeQuiz={activeQuiz}
            isLoading={isLoading}
            onRefreshData={fetchData}
            onSelectQuizFilter={(id) => setSelectedLecturerQuizFilterId(id)}
            selectedQuizFilterId={selectedLecturerQuizFilterId}
            onActivateQuiz={handleActivateQuiz}
            onCreateQuiz={handleCreateQuiz}
            onUpdateQuiz={handleUpdateQuiz}
            onDuplicateQuiz={handleDuplicateQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onDeleteSubmission={handleDeleteSubmission}
            onClearAllSubmissions={handleClearAllSubmissions}
            onResetDefaultQuizzes={handleResetDefaultQuizzes}
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
