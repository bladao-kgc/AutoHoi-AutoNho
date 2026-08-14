import React, { useState } from 'react';
import { QuizSubmission, QuizStatistics, Question, QuizConfig, OptionKey, Quiz } from '../types';
import { 
  Users, Award, CheckCircle2, TrendingUp, Search, Download, Trash2, 
  Eye, Edit, Plus, RotateCcw, Save, Settings, FileText, BarChart2,
  BookOpen, Clock, AlertTriangle, Check, X, Filter, ChevronDown, RefreshCw,
  UserCheck, LogOut, Shield, Layers, Copy, Play, CheckCircle, ExternalLink,
  Sparkles, CheckSquare, HelpCircle
} from 'lucide-react';
import { soundFX } from '../utils/audio';

interface LecturerDashboardProps {
  submissions: QuizSubmission[];
  allSubmissions?: QuizSubmission[];
  stats: QuizStatistics | null;
  quizzes: Quiz[];
  activeQuiz: Quiz;
  isLoading: boolean;
  onRefreshData: () => void;
  onSelectQuizFilter: (quizId: string) => void;
  selectedQuizFilterId: string;
  onActivateQuiz: (quizId: string) => Promise<boolean>;
  onCreateQuiz: (quizData: Partial<Quiz>) => Promise<boolean>;
  onUpdateQuiz: (quizId: string, quizData: Partial<Quiz>) => Promise<boolean>;
  onDuplicateQuiz: (quizId: string) => Promise<boolean>;
  onDeleteQuiz: (quizId: string) => Promise<boolean>;
  onDeleteSubmission: (id: string) => void;
  onClearAllSubmissions: (quizId?: string) => void;
  onResetDefaultQuizzes: () => Promise<boolean>;
  onLogout?: () => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  submissions,
  allSubmissions = [],
  stats,
  quizzes,
  activeQuiz,
  isLoading,
  onRefreshData,
  onSelectQuizFilter,
  selectedQuizFilterId,
  onActivateQuiz,
  onCreateQuiz,
  onUpdateQuiz,
  onDuplicateQuiz,
  onDeleteQuiz,
  onDeleteSubmission,
  onClearAllSubmissions,
  onResetDefaultQuizzes,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'submissions' | 'analysis' | 'questions' | 'create_quiz'>('quizzes');
  
  // Search & Filters for Submissions
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  
  // Modal states
  const [viewingSubmission, setViewingSubmission] = useState<QuizSubmission | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ quizId: string; question: Question } | null>(null);
  const [isAddingQuestionToQuizId, setIsAddingQuestionToQuizId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Selected quiz for question management tab
  const [managedQuizId, setManagedQuizId] = useState<string>(activeQuiz?.id || quizzes[0]?.id || '');

  // Form state for creating / editing Quiz
  const [quizFormData, setQuizFormData] = useState<Partial<Quiz>>({
    title: '',
    subjectCode: '',
    subjectName: '',
    description: '',
    defaultTimeLimit: 10,
    passingScorePercentage: 50,
    departmentName: 'Khoa Cơ khí - Xây dựng',
    isActive: false,
  });

  // Form state for question edit / add
  const [questionFormData, setQuestionFormData] = useState<Partial<Question>>({
    questionText: '',
    options: [
      { key: 'A', text: '' },
      { key: 'B', text: '' },
      { key: 'C', text: '' },
      { key: 'D', text: '' },
    ],
    correctOption: 'A',
    explanation: '',
    timeLimit: 10,
    category: 'Tổng quan',
  });

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Determine current managed quiz object
  const currentManagedQuiz = quizzes.find((q) => q.id === (managedQuizId || activeQuiz?.id)) || activeQuiz || quizzes[0];

  // Extract unique groups for submissions filter
  const targetSubmissionsPool = selectedQuizFilterId === 'ALL' ? (allSubmissions.length > 0 ? allSubmissions : submissions) : submissions;
  const allGroups = Array.from(new Set(targetSubmissionsPool.map((s) => s.studentInfo?.studentGroup))).filter(Boolean);

  // Filtered submissions
  const filteredSubmissions = targetSubmissionsPool.filter((sub) => {
    const matchQuiz = selectedQuizFilterId === 'ALL' || sub.quizId === selectedQuizFilterId;
    const matchName = 
      (sub.studentInfo?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.studentInfo?.studentId && sub.studentInfo.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sub.subjectCode && sub.subjectCode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = selectedGroupFilter === 'ALL' || sub.studentInfo?.studentGroup === selectedGroupFilter;
    const matchGrade = selectedGradeFilter === 'ALL' || sub.grade === selectedGradeFilter;
    return matchQuiz && matchName && matchGroup && matchGrade;
  });

  // Handle start create new quiz
  const handleOpenCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizFormData({
      title: '',
      subjectCode: 'CNOT-' + Math.floor(1000 + Math.random() * 9000),
      subjectName: '',
      description: 'Bài kiểm tra trắc nghiệm 10s đánh giá kiến thức môn học.',
      defaultTimeLimit: 10,
      passingScorePercentage: 50,
      departmentName: 'Khoa Cơ khí - Xây dựng',
      isActive: false,
    });
    setActiveTab('create_quiz');
    soundFX.playSelect();
  };

  // Handle start edit existing quiz
  const handleOpenEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizFormData({
      title: quiz.title,
      subjectCode: quiz.subjectCode,
      subjectName: quiz.subjectName,
      description: quiz.description,
      defaultTimeLimit: quiz.defaultTimeLimit || 10,
      passingScorePercentage: quiz.passingScorePercentage || 50,
      departmentName: quiz.departmentName || 'Khoa Cơ khí - Xây dựng',
      isActive: quiz.isActive,
    });
    setActiveTab('create_quiz');
    soundFX.playSelect();
  };

  // Save Quiz (Create or Update)
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizFormData.title?.trim() || !quizFormData.subjectCode?.trim()) {
      alert('Vui lòng nhập đầy đủ Tên bài kiểm tra và Mã môn học.');
      return;
    }

    let success = false;
    if (editingQuiz) {
      success = await onUpdateQuiz(editingQuiz.id, quizFormData);
      if (success) {
        showNotification(`Đã cập nhật bài kiểm tra "${quizFormData.title}" thành công!`);
      }
    } else {
      success = await onCreateQuiz(quizFormData);
      if (success) {
        showNotification(`Đã tạo bài kiểm tra mới "${quizFormData.title}" thành công!`);
      }
    }

    if (success) {
      soundFX.playSelect();
      setActiveTab('quizzes');
      setEditingQuiz(null);
    }
  };

  // Handle Start Question Edit
  const handleStartEditQuestion = (quizId: string, q: Question) => {
    setEditingQuestion({ quizId, question: q });
    setQuestionFormData({
      ...q,
      options: JSON.parse(JSON.stringify(q.options)),
    });
  };

  // Handle Start Question Add
  const handleStartAddQuestion = (quizId: string) => {
    setIsAddingQuestionToQuizId(quizId);
    setQuestionFormData({
      questionText: '',
      options: [
        { key: 'A', text: '' },
        { key: 'B', text: '' },
        { key: 'C', text: '' },
        { key: 'D', text: '' },
      ],
      correctOption: 'A',
      explanation: '',
      timeLimit: currentManagedQuiz?.defaultTimeLimit || 10,
      category: currentManagedQuiz?.subjectName || 'Tổng quan',
    });
  };

  // Save Question inside a Quiz
  const handleSaveQuestion = async () => {
    if (!questionFormData.questionText?.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    const hasEmptyOption = questionFormData.options?.some((opt) => !opt.text.trim());
    if (hasEmptyOption) {
      alert('Vui lòng nhập đầy đủ nội dung cho 4 đáp án A, B, C, D.');
      return;
    }

    const targetQuiz = quizzes.find((q) => q.id === (editingQuestion?.quizId || isAddingQuestionToQuizId || managedQuizId));
    if (!targetQuiz) return;

    let updatedQuestions: Question[] = [];
    if (editingQuestion) {
      updatedQuestions = targetQuiz.questions.map((q) => 
        q.id === editingQuestion.question.id ? ({ ...q, ...questionFormData } as Question) : q
      );
    } else if (isAddingQuestionToQuizId) {
      const newQ: Question = {
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        orderNumber: targetQuiz.questions.length + 1,
        questionText: questionFormData.questionText!,
        options: questionFormData.options!,
        correctOption: questionFormData.correctOption || 'A',
        explanation: questionFormData.explanation || 'Chưa có giải thích chi tiết.',
        timeLimit: questionFormData.timeLimit || targetQuiz.defaultTimeLimit || 10,
        category: questionFormData.category || targetQuiz.subjectName,
      };
      updatedQuestions = [...targetQuiz.questions, newQ];
    }

    const success = await onUpdateQuiz(targetQuiz.id, { questions: updatedQuestions });
    if (success) {
      setEditingQuestion(null);
      setIsAddingQuestionToQuizId(null);
      soundFX.playSelect();
      showNotification('Đã cập nhật câu hỏi thành công!');
    }
  };

  // Delete Question from Quiz
  const handleDeleteQuestion = async (quizId: string, qId: string) => {
    const targetQuiz = quizzes.find((q) => q.id === quizId);
    if (!targetQuiz) return;

    if (targetQuiz.questions.length <= 1) {
      alert('Bài kiểm tra phải có ít nhất 1 câu hỏi.');
      return;
    }

    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?')) {
      const updatedQuestions = targetQuiz.questions.filter((q) => q.id !== qId);
      const success = await onUpdateQuiz(quizId, { questions: updatedQuestions });
      if (success) {
        showNotification('Đã xóa câu hỏi khỏi bài kiểm tra');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4">
      {/* Top Banner with Lecturer Info & Quick Controls */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs mb-5 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Cổng Quản Trị Giảng Viên • AUTO HỎI - AUTO NHỚ
                </h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-mono font-semibold">
                  Khoa Cơ khí - Xây dựng
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Giảng viên: <strong className="text-blue-300">Bladao</strong></span>
                <span>•</span>
                <span>Bài thi đang mở cho SV: <strong className="text-emerald-400">{activeQuiz?.title || 'Chưa chọn'}</strong> ({activeQuiz?.subjectCode})</span>
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Realtime Live Sync Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-[11px] font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Đồng bộ Trực tiếp (Live)</span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                onRefreshData();
                soundFX.playSelect();
                showNotification('Đã làm mới dữ liệu!');
              }}
              disabled={isLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {/* Logout */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Success Toast Banner */}
        {actionSuccessMsg && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {actionSuccessMsg}
            </span>
            <button onClick={() => setActionSuccessMsg(null)} className="text-white hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 text-xs">
          <button
            onClick={() => {
              setActiveTab('quizzes');
              soundFX.playSelect();
            }}
            className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'quizzes'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Quản Lý Đề Thi & Môn Học ({quizzes.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('submissions');
              soundFX.playSelect();
            }}
            className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'submissions'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kết Quả Sinh Viên ({targetSubmissionsPool.length})</span>
            {targetSubmissionsPool.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {targetSubmissionsPool.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('analysis');
              soundFX.playSelect();
            }}
            className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'analysis'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Phân Tích & Thống Kê Điểm</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('questions');
              soundFX.playSelect();
            }}
            className={`px-4 py-2.5 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'questions'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ngân Hàng Câu Hỏi ({currentManagedQuiz?.questions?.length || 0})</span>
          </button>

          <button
            onClick={handleOpenCreateQuiz}
            className={`ml-auto my-auto mr-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              activeTab === 'create_quiz' ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Bài Kiểm Tra Mới</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: QUIZZES MANAGEMENT ================= */}
      {activeTab === 'quizzes' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Danh Sách Bài Kiểm Tra Theo Môn Học ({quizzes.length} đề thi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý các bài kiểm tra, kích hoạt bài cho sinh viên thi, sửa đổi nội dung hoặc tạo thêm bài kiểm tra môn học khác.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreateQuiz}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Bài Kiểm Tra Mới</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                title="Khôi phục các bài kiểm tra mẫu ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Khôi phục mẫu chuẩn</span>
              </button>
            </div>
          </div>

          {/* Quizzes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => {
              const quizSubs = (allSubmissions.length > 0 ? allSubmissions : submissions).filter((s) => s.quizId === quiz.id);
              const isCurrentActive = quiz.isActive;

              return (
                <div
                  key={quiz.id}
                  className={`bg-white rounded-lg border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                    isCurrentActive
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {quiz.subjectCode}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {quiz.subjectName}
                        </span>
                      </div>

                      {isCurrentActive ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          ĐANG MỞ THI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Đã lưu trữ
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug tracking-tight">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                      {quiz.description}
                    </p>

                    {/* Meta specs */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Câu hỏi</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{quiz.questions.length} câu</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Thời gian</span>
                        <span className="text-xs font-bold text-slate-800 font-mono">{quiz.defaultTimeLimit}s / câu</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Đã nộp</span>
                        <span className="text-xs font-bold text-blue-600 font-mono">{quizSubs.length} bài</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs">
                    {!isCurrentActive ? (
                      <button
                        onClick={async () => {
                          const ok = await onActivateQuiz(quiz.id);
                          if (ok) {
                            soundFX.playFinish();
                            showNotification(`Đã kích hoạt bài thi "${quiz.title}" cho sinh viên!`);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer text-[11px]"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Mở thi cho SV</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 px-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Đang cho SV làm
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      {/* View results */}
                      <button
                        onClick={() => {
                          onSelectQuizFilter(quiz.id);
                          setActiveTab('submissions');
                          soundFX.playSelect();
                        }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                        title="Xem kết quả bài thi này"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit questions */}
                      <button
                        onClick={() => {
                          setManagedQuizId(quiz.id);
                          setActiveTab('questions');
                          soundFX.playSelect();
                        }}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                        title="Quản lý câu hỏi của đề này"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit metadata */}
                      <button
                        onClick={() => handleOpenEditQuiz(quiz)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                        title="Chỉnh sửa thông tin đề thi"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={async () => {
                          const ok = await onDuplicateQuiz(quiz.id);
                          if (ok) {
                            soundFX.playSelect();
                            showNotification(`Đã nhân bản đề thi "${quiz.title}"!`);
                          }
                        }}
                        className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                        title="Nhân bản đề thi này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      {quizzes.length > 1 && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa bài kiểm tra "${quiz.title}"?`)) {
                              const ok = await onDeleteQuiz(quiz.id);
                              if (ok) {
                                soundFX.playWarning();
                                showNotification(`Đã xóa bài kiểm tra thành công`);
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: SUBMISSIONS PER QUIZ ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-5">
          {/* Controls & Multi-Quiz Filter Header */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Bảng Kết Quả Sinh Viên (Lưu trữ vĩnh viễn)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tất cả kết quả nộp bài được ghi nhận tức thì theo từng môn học và đề thi cụ thể.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Export CSV for selected Quiz */}
                <a
                  href={`/api/admin/export-csv?quizId=${selectedQuizFilterId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel Bảng Điểm (.CSV)</span>
                </a>

                {/* Clear Submissions */}
                {filteredSubmissions.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa bảng điểm</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
              {/* Quiz Selector Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Chọn Đề Thi / Môn Học:
                </label>
                <select
                  value={selectedQuizFilterId}
                  onChange={(e) => {
                    onSelectQuizFilter(e.target.value);
                    soundFX.playSelect();
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">★ Tất Cả Bài Kiểm Tra ({targetSubmissionsPool.length} bài nộp)</option>
                  {quizzes.map((q) => {
                    const count = targetSubmissionsPool.filter((s) => s.quizId === q.id).length;
                    return (
                      <option key={q.id} value={q.id}>
                        [{q.subjectCode}] {q.title} ({count} bài)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search by Name / MSSV */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Tìm Sinh Viên / MSSV:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập tên SV hoặc MSSV..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Group / Class Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Lọc Theo Lớp / Nhóm:
                </label>
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả các lớp / nhóm</option>
                  {allGroups.map((grp) => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              </div>

              {/* Grade Filter */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Lọc Theo Xếp Loại:
                </label>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả xếp loại</option>
                  <option value="Xuất sắc">Xuất sắc (9.0 - 10.0)</option>
                  <option value="Giỏi">Giỏi (8.0 - 8.9)</option>
                  <option value="Khá">Khá (6.5 - 7.9)</option>
                  <option value="Trung bình">Trung bình (5.0 - 6.4)</option>
                  <option value="Chưa đạt">Chưa đạt (&lt; 5.0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3 w-12 text-center">STT</th>
                    <th className="py-3 px-3">Môn Học / Đề Thi</th>
                    <th className="py-3 px-3">Họ và Tên Thí Sinh</th>
                    <th className="py-3 px-3">Lớp / Nhóm</th>
                    <th className="py-3 px-3 text-center">Kết Quả</th>
                    <th className="py-3 px-3 text-center">Điểm Hệ 10</th>
                    <th className="py-3 px-3 text-center">Xếp Loại</th>
                    <th className="py-3 px-3 text-center">Thời Gian</th>
                    <th className="py-3 px-3 text-right">Ngày Giờ Nộp</th>
                    <th className="py-3 px-3 text-center w-24">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Users className="w-8 h-8 mx-auto text-slate-300" />
                          <p className="font-semibold text-slate-600">Chưa có kết quả bài thi nào phù hợp</p>
                          <p className="text-[11px] text-slate-400">
                            Sinh viên làm bài ở giao diện kiểm tra sẽ tự động xuất hiện tại đây ngay lập tức.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => {
                      const gradeColor = 
                        sub.grade === 'Xuất sắc' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        sub.grade === 'Giỏi' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        sub.grade === 'Khá' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        sub.grade === 'Trung bình' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        'bg-red-100 text-red-800 border-red-200';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-[10px] text-blue-600 font-bold">{sub.subjectCode || 'CNOT-2026'}</div>
                            <div className="text-[11px] font-semibold text-slate-800 line-clamp-1">{sub.quizTitle || 'Điện Ô Tô 1'}</div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900">{sub.studentInfo.fullName}</div>
                            {sub.studentInfo.studentId && (
                              <div className="text-[10px] text-slate-400 font-mono">MSSV: {sub.studentInfo.studentId}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600">
                            {sub.studentInfo.studentGroup}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                            {sub.score}/{sub.totalQuestions} <span className="text-[10px] text-slate-400">({sub.percentage}%)</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-sm font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {sub.scoreOutOfTen.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${gradeColor}`}>
                              {sub.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-500 text-[11px]">
                            {sub.totalTimeSeconds}s
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500 font-mono text-[11px]">
                            {new Date(sub.submittedAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setViewingSubmission(sub);
                                  soundFX.playSelect();
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200"
                                title="Xem chi tiết bài làm"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa kết quả của sinh viên ${sub.studentInfo.fullName}?`)) {
                                    onDeleteSubmission(sub.id);
                                    showNotification('Đã xóa kết quả bài thi.');
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200"
                                title="Xóa kết quả này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ANALYSIS & STATS ================= */}
      {activeTab === 'analysis' && (
        <div className="space-y-5">
          {/* Target Quiz Selector for Stats */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                Thống Kê Điểm Số & Phân Tích Độ Khó Đề Thi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem tỷ lệ đạt, điểm trung bình và phân bố đáp án câu hỏi để cải thiện chất lượng giảng dạy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Đề thi:</span>
              <select
                value={selectedQuizFilterId}
                onChange={(e) => {
                  onSelectQuizFilter(e.target.value);
                  soundFX.playSelect();
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                <option value="ALL">Tổng hợp tất cả đề thi</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>[{q.subjectCode}] {q.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Tổng số bài nộp</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {stats?.totalSubmissions || filteredSubmissions.length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Điểm trung bình (Hệ 10)</span>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-1 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                {stats?.averageScoreOutOfTen || '0.0'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Tỷ lệ Đạt Chuẩn</span>
              <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {stats?.passRatePercentage || 0}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block">Điểm cao nhất / Thấp nhất</span>
              <div className="text-xl font-bold font-mono text-slate-800 mt-1 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                <span>{stats?.highestScore || 0}</span>
                <span className="text-slate-300 font-normal">/</span>
                <span className="text-rose-600">{stats?.lowestScore || 0}</span>
              </div>
            </div>
          </div>

          {/* Group / Class Breakdown */}
          {stats?.groupStats && stats.groupStats.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                Thống Kê Điểm Trung Bình Theo Lớp / Nhóm
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {stats.groupStats.map((g) => (
                  <div key={g.groupName} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{g.groupName}</div>
                      <div className="text-[10px] text-slate-400">{g.studentCount} sinh viên đã nộp</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-blue-600">{g.averageScore}</div>
                      <div className="text-[10px] text-slate-400">Điểm TB</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question Accuracy Distribution */}
          {stats?.questionAccuracy && stats.questionAccuracy.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-3">
                Tỷ Lệ Trả Lời Đúng Từng Câu Hỏi Trong Đề
              </h3>
              <div className="space-y-3">
                {stats.questionAccuracy.map((q) => (
                  <div key={q.questionId} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <span className="font-bold text-slate-900">
                        Câu {q.orderNumber}: {q.questionText}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        q.accuracyPercentage >= 70 ? 'bg-emerald-100 text-emerald-800' :
                        q.accuracyPercentage >= 40 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Đúng: {q.accuracyPercentage}% ({q.correctCount}/{q.totalAttempts})
                      </span>
                    </div>

                    {/* Options mini distribution */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-2">
                      <span className="font-semibold text-slate-400 uppercase">Lượt chọn:</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">A: {q.optionDistribution?.A || 0}</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">B: {q.optionDistribution?.B || 0}</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">C: {q.optionDistribution?.C || 0}</span>
                      <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">D: {q.optionDistribution?.D || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: QUESTION BANK ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-5">
          {/* Question Bank Header & Quiz Switcher */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                Ngân Hàng Câu Hỏi: {currentManagedQuiz?.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉnh sửa nội dung, thời gian 10s, 4 phương án A/B/C/D, đáp án đúng và lời giải thích kỹ thuật.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={managedQuizId}
                onChange={(e) => {
                  setManagedQuizId(e.target.value);
                  soundFX.playSelect();
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.subjectCode}] {q.title} ({q.questions.length} câu)
                  </option>
                ))}
              </select>

              <button
                onClick={() => handleStartAddQuestion(currentManagedQuiz.id)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Câu Hỏi</span>
              </button>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-3">
            {currentManagedQuiz?.questions?.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {q.category || currentManagedQuiz.subjectName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {q.timeLimit || currentManagedQuiz.defaultTimeLimit}s
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditQuestion(currentManagedQuiz.id, q)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {currentManagedQuiz.questions.length > 1 && (
                      <button
                        onClick={() => handleDeleteQuestion(currentManagedQuiz.id, q.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <h4 className="text-sm font-bold text-slate-900 my-3 leading-snug">
                  {q.questionText}
                </h4>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                  {q.options.map((opt) => {
                    const isCorrect = opt.key === q.correctOption;
                    return (
                      <div
                        key={opt.key}
                        className={`p-2.5 rounded-lg border flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded font-mono font-bold text-[11px] flex items-center justify-center flex-shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {opt.key}
                        </span>
                        <span className="leading-snug">{opt.text}</span>
                        {isCorrect && (
                          <Check className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Technical Explanation */}
                {q.explanation && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <BookOpen className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-950">Giải thích kỹ thuật:</strong> {q.explanation}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: CREATE / EDIT QUIZ FORM ================= */}
      {activeTab === 'create_quiz' && (
        <div className="max-w-3xl mx-auto bg-white rounded-lg border border-slate-200 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                {editingQuiz ? 'Chỉnh Sửa Bài Kiểm Tra Môn Học' : 'Tạo Bài Kiểm Tra Môn Học Mới'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập thông tin bài kiểm tra, mã môn, thời gian làm bài đếm ngược và quy chế thi.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('quizzes')}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs sm:text-sm">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên Bài Kiểm Tra <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={quizFormData.title || ''}
                onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                placeholder="Ví dụ: HỆ THỐNG ĐIỆN Ô TÔ 1 - Khởi Động & Nạp"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs sm:text-sm"
              />
            </div>

            {/* Subject Code & Subject Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã Môn Học / Mã Phòng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quizFormData.subjectCode || ''}
                  onChange={(e) => setQuizFormData({ ...quizFormData, subjectCode: e.target.value.toUpperCase() })}
                  placeholder="Ví dụ: CNOT-2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Môn Học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quizFormData.subjectName || ''}
                  onChange={(e) => setQuizFormData({ ...quizFormData, subjectName: e.target.value })}
                  placeholder="Ví dụ: Điện Ô Tô 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mô Tả Bài Kiểm Tra
              </label>
              <textarea
                rows={2}
                value={quizFormData.description || ''}
                onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                placeholder="Mô tả nội dung trọng tâm bài kiểm tra..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs"
              />
            </div>

            {/* Time & Passing Score */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời Gian / Câu (Giây)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={quizFormData.defaultTimeLimit || 10}
                  onChange={(e) => setQuizFormData({ ...quizFormData, defaultTimeLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Chuẩn: 10 giây/câu</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Điểm Đạt Chuẩn (%)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={quizFormData.passingScorePercentage || 50}
                  onChange={(e) => setQuizFormData({ ...quizFormData, passingScorePercentage: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">50% = 5.0 điểm</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khoa / Đơn Vị Phụ Trách
                </label>
                <input
                  type="text"
                  value={quizFormData.departmentName || 'Khoa Cơ khí - Xây dựng'}
                  onChange={(e) => setQuizFormData({ ...quizFormData, departmentName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('quizzes')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{editingQuiz ? 'Lưu Thay Đổi Đề Thi' : 'Tạo Bài Kiểm Tra'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: VIEW SUBMISSION DETAILS ================= */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-[10px] text-blue-400 font-mono font-bold">
                  {viewingSubmission.subjectCode} • {viewingSubmission.quizTitle}
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  Bài Làm: {viewingSubmission.studentInfo.fullName} ({viewingSubmission.studentInfo.studentGroup})
                </h3>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Strip */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Điểm số</span>
                <div className="text-lg font-bold font-mono text-blue-600">{viewingSubmission.scoreOutOfTen.toFixed(1)}/10</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Số câu đúng</span>
                <div className="text-lg font-bold font-mono text-emerald-600">{viewingSubmission.score}/{viewingSubmission.totalQuestions}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Xếp loại</span>
                <div className="text-sm font-bold text-slate-800 mt-0.5">{viewingSubmission.grade}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Thời gian</span>
                <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">{viewingSubmission.totalTimeSeconds}s</div>
              </div>
            </div>

            {/* Answers Breakdown */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                Chi Tiết Từng Câu Hỏi Đã Trả Lời:
              </h4>
              {viewingSubmission.answers.map((ans) => (
                <div
                  key={ans.questionId}
                  className={`p-3.5 rounded-lg border ${
                    ans.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900">
                      Câu {ans.orderNumber}: {ans.questionText}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] flex items-center gap-1 ${
                      ans.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {ans.isCorrect ? 'ĐÚNG' : 'SAI'} ({ans.timeSpentSeconds}s)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs font-mono">
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans">Đáp án SV chọn:</span>
                      <span className={`font-bold ${ans.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {ans.selectedOption ? `Đáp án ${ans.selectedOption}` : 'Hết giờ (Không chọn)'}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-white border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-sans">Đáp án đúng chuẩn:</span>
                      <span className="font-bold text-emerald-600">Đáp án {ans.correctOption}</span>
                    </div>
                  </div>

                  {ans.explanation && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-slate-200">
                      <strong>Giải thích:</strong> {ans.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 text-right">
              <button
                onClick={() => setViewingSubmission(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT / ADD QUESTION ================= */}
      {(editingQuestion || isAddingQuestionToQuizId) && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden animate-fadeIn">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                {editingQuestion ? 'Chỉnh Sửa Câu Hỏi' : 'Thêm Câu Hỏi Mới'}
              </h3>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setIsAddingQuestionToQuizId(null);
                }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội Dung Câu Hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={questionFormData.questionText || ''}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm kỹ thuật..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs sm:text-sm"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  4 Phương Án Trả Lời (A, B, C, D) & Chọn Đáp Án Đúng <span className="text-red-500">*</span>
                </label>
                {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key, idx) => {
                  const isCorrect = questionFormData.correctOption === key;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuestionFormData({ ...questionFormData, correctOption: key })}
                        className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center flex-shrink-0 cursor-pointer ${
                          isCorrect ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                        title="Nhấp để chọn làm đáp án đúng"
                      >
                        {key}
                      </button>
                      <input
                        type="text"
                        required
                        value={questionFormData.options?.[idx]?.text || ''}
                        onChange={(e) => {
                          const nextOpts = [...(questionFormData.options || [])];
                          nextOpts[idx] = { key, text: e.target.value };
                          setQuestionFormData({ ...questionFormData, options: nextOpts });
                        }}
                        placeholder={`Nhập nội dung đáp án ${key}...`}
                        className={`w-full px-3 py-2 border rounded-lg text-xs font-medium ${
                          isCorrect ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold' : 'border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Technical Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giải Thích Kỹ Thuật (Hiển thị sau khi thi xong)
                </label>
                <textarea
                  rows={2}
                  value={questionFormData.explanation || ''}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                  placeholder="Giải thích vì sao đáp án trên là chính xác theo tài liệu kỹ thuật..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs"
                />
              </div>

              {/* Time & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời Gian Đếm Ngược (Giây)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={questionFormData.timeLimit || 10}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, timeLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chủ Đề / Phân Loại
                  </label>
                  <input
                    type="text"
                    value={questionFormData.category || ''}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, category: e.target.value })}
                    placeholder="Ví dụ: Máy phát, Cảm biến..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsAddingQuestionToQuizId(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Lưu Câu Hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Submissions Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl text-xs sm:text-sm">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Bảng Điểm</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn xóa kết quả bài làm của {selectedQuizFilterId === 'ALL' ? 'toàn bộ các bài kiểm tra' : 'bài kiểm tra đang chọn'} không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  onClearAllSubmissions(selectedQuizFilterId);
                  setShowClearConfirm(false);
                  showNotification('Đã xóa bảng điểm thành công!');
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Default Quizzes Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl text-xs sm:text-sm">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Khôi Phục Bài Kiểm Tra Chuẩn</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Thao tác này sẽ khôi phục lại ngân hàng đề thi chuẩn của bộ môn (Điện Ô Tô 1, Điện Ô Tô 2, Khung Gầm & Phanh). Các bài thi tự tạo sẽ được thiết lập lại.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await onResetDefaultQuizzes();
                  setShowResetConfirm(false);
                  showNotification('Đã khôi phục ngân hàng đề thi chuẩn!');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Khôi Phục Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
