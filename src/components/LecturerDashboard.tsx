import React, { useState } from 'react';
import { QuizSubmission, QuizStatistics, Question, QuizConfig, OptionKey } from '../types';
import { 
  Users, Award, CheckCircle2, TrendingUp, Search, Download, Trash2, 
  Eye, Edit, Plus, RotateCcw, Save, Settings, FileText, BarChart2,
  BookOpen, Clock, AlertTriangle, Check, X, Filter, ChevronDown, RefreshCw,
  UserCheck, LogOut, Shield
} from 'lucide-react';
import { soundFX } from '../utils/audio';

interface LecturerDashboardProps {
  submissions: QuizSubmission[];
  stats: QuizStatistics | null;
  questions: Question[];
  config: QuizConfig;
  isLoading: boolean;
  onRefreshData: () => void;
  onDeleteSubmission: (id: string) => void;
  onClearAllSubmissions: () => void;
  onUpdateQuestions: (newQuestions: Question[]) => Promise<boolean>;
  onResetDefaultQuestions: () => Promise<boolean>;
  onUpdateConfig: (newConfig: Partial<QuizConfig>) => Promise<boolean>;
  onLogout?: () => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  submissions,
  stats,
  questions,
  config,
  isLoading,
  onRefreshData,
  onDeleteSubmission,
  onClearAllSubmissions,
  onUpdateQuestions,
  onResetDefaultQuestions,
  onUpdateConfig,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'analysis' | 'questions' | 'config'>('submissions');
  
  // Search & Filters for Submissions
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  
  // Modal states
  const [viewingSubmission, setViewingSubmission] = useState<QuizSubmission | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetQuestionsConfirm, setShowResetQuestionsConfirm] = useState(false);

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
    category: 'Điện Ô Tô 1',
  });

  // Config state
  const [configForm, setConfigForm] = useState<QuizConfig>(config);
  const [configSaveSuccess, setConfigSaveSuccess] = useState(false);

  // Extract unique groups for filter
  const allGroups = Array.from(new Set(submissions.map((s) => s.studentInfo.studentGroup))).filter(Boolean);

  // Filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchName = sub.studentInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.studentInfo.studentId && sub.studentInfo.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchGroup = selectedGroupFilter === 'ALL' || sub.studentInfo.studentGroup === selectedGroupFilter;
    const matchGrade = selectedGradeFilter === 'ALL' || sub.grade === selectedGradeFilter;
    return matchName && matchGroup && matchGrade;
  });

  // Handle Question Edit Start
  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionFormData({
      ...q,
      options: JSON.parse(JSON.stringify(q.options)),
    });
  };

  // Handle Question Add Start
  const handleStartAddQuestion = () => {
    setIsAddingQuestion(true);
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
      timeLimit: config.defaultTimeLimit || 10,
      category: 'Điện Ô Tô 1',
    });
  };

  // Save Question (Add or Edit)
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

    let updatedList: Question[] = [];
    if (editingQuestion) {
      updatedList = questions.map((q) => (q.id === editingQuestion.id ? ({ ...q, ...questionFormData } as Question) : q));
    } else if (isAddingQuestion) {
      const newQ: Question = {
        id: `cau-${Date.now()}`,
        orderNumber: questions.length + 1,
        questionText: questionFormData.questionText!,
        options: questionFormData.options!,
        correctOption: questionFormData.correctOption || 'A',
        explanation: questionFormData.explanation || 'Chưa có giải thích chi tiết.',
        timeLimit: questionFormData.timeLimit || 10,
        category: questionFormData.category || 'Điện Ô Tô 1',
      };
      updatedList = [...questions, newQ];
    }

    const success = await onUpdateQuestions(updatedList);
    if (success) {
      setEditingQuestion(null);
      setIsAddingQuestion(false);
      soundFX.playSelect();
    }
  };

  // Delete Question
  const handleDeleteQuestion = async (id: string) => {
    if (questions.length <= 1) {
      alert('Đề thi phải có ít nhất 1 câu hỏi.');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?')) {
      const updatedList = questions.filter((q) => q.id !== id);
      await onUpdateQuestions(updatedList);
    }
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await onUpdateConfig(configForm);
    if (success) {
      setConfigSaveSuccess(true);
      setTimeout(() => setConfigSaveSuccess(false), 3000);
      soundFX.playSelect();
    }
  };

  // Export CSV download
  const handleExportCSV = () => {
    window.location.href = '/api/admin/export-csv';
  };

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header - High Density Pro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Bảng Điều Khiển Giảng Viên
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Quản lý kết quả thi & Ngân hàng đề thi trắc nghiệm
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">
            Hệ Thống Quản Lý Thi & Chấm Điểm Điện Ô Tô 1
          </h2>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Instructor Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-mono text-blue-700">Bladao</span>
          </div>

          <button
            id="btn-admin-refresh"
            type="button"
            onClick={onRefreshData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            id="btn-admin-export-csv"
            type="button"
            onClick={handleExportCSV}
            disabled={submissions.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              submissions.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Bảng Điểm CSV ({submissions.length})</span>
          </button>

          {onLogout && (
            <button
              id="btn-admin-logout"
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
              title="Đăng xuất khỏi cổng Giảng viên"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>

      {/* High Density Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-5 gap-1 sm:gap-2 overflow-x-auto text-xs">
        <button
          id="tab-submissions"
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'submissions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Bảng điểm SV ({submissions.length})</span>
        </button>

        <button
          id="tab-analysis"
          type="button"
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'analysis'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Phân tích độ khó câu hỏi</span>
        </button>

        <button
          id="tab-questions"
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'questions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Quản lý Đề ({questions.length} câu)</span>
        </button>

        <button
          id="tab-config"
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'config'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Cấu hình Đề thi</span>
        </button>
      </div>

      {/* ================= TAB 1: SUBMISSIONS & GRADING ================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* High Density KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tổng SV nộp bài</span>
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-slate-900">
                {submissions.length} <span className="text-xs font-normal text-slate-500">bài</span>
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm Trung Bình (Hệ 10)</span>
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-blue-600">
                {stats?.averageScoreOutOfTen ?? 0} <span className="text-xs font-normal text-slate-500">/ 10</span>
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tỷ lệ Đạt (≥ 5.0đ)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-600">
                {stats?.passRatePercentage ?? 0}%
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm Cao / Thấp</span>
                <Award className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-slate-900">
                {stats?.highestScore ?? 0} <span className="text-slate-400 font-normal text-sm">/</span> {stats?.lowestScore ?? 0}
              </p>
            </div>
          </div>

          {/* Table Toolbar (Search & Filter) */}
          <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  id="input-search-student"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên SV hoặc MSSV..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs outline-none bg-white"
                />
              </div>

              {/* Filter Group */}
              <div className="flex items-center gap-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <select
                  id="select-filter-group"
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  aria-label="Lọc theo nhóm học"
                  className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">Tất cả Nhóm / Lớp</option>
                  {allGroups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Filter Grade */}
              <select
                id="select-filter-grade"
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                aria-label="Lọc theo xếp loại"
                className="py-1.5 px-2.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">Tất cả Xếp loại</option>
                <option value="Xuất sắc">Xuất sắc (≥9.0)</option>
                <option value="Giỏi">Giỏi (8.0 - 8.9)</option>
                <option value="Khá">Khá (6.5 - 7.9)</option>
                <option value="Trung bình">Trung bình (5.0 - 6.4)</option>
                <option value="Chưa đạt">Chưa đạt (&lt;5.0)</option>
              </select>
            </div>

            {/* Clear all button */}
            {submissions.length > 0 && (
              <button
                id="btn-clear-all-submissions"
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 self-end md:self-auto cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Xóa dữ liệu thi</span>
              </button>
            )}
          </div>

          {/* Submissions Table - High Density Rows */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">STT</th>
                    <th className="py-2.5 px-3">Họ và Tên</th>
                    <th className="py-2.5 px-3">Nhóm / Lớp</th>
                    <th className="py-2.5 px-3 text-center">Số câu đúng</th>
                    <th className="py-2.5 px-3 text-center">Điểm Hệ 10</th>
                    <th className="py-2.5 px-3 text-center">Xếp loại</th>
                    <th className="py-2.5 px-3 text-center">Thời gian</th>
                    <th className="py-2.5 px-3 text-center">Thời điểm nộp</th>
                    <th className="py-2.5 px-3 text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400">
                        <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs font-semibold">Chưa có bài thi nào được nộp</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Chuyển sang chế độ "Sinh viên" để làm bài kiểm tra.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => {
                      const gradeBadgeClass =
                        sub.grade === 'Xuất sắc'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : sub.grade === 'Giỏi'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : sub.grade === 'Khá'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : sub.grade === 'Trung bình'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{sub.studentInfo.fullName}</div>
                            {sub.studentInfo.studentId && (
                              <div className="text-[10px] text-slate-400 font-mono">MSSV: {sub.studentInfo.studentId}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold border border-slate-200">
                              {sub.studentInfo.studentGroup}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                            <span className="text-emerald-600">{sub.score}</span> / {sub.totalQuestions}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-sm font-mono font-bold text-slate-900">
                              {sub.scoreOutOfTen.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${gradeBadgeClass}`}>
                              {sub.grade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-xs">
                            {sub.totalTimeSeconds}s
                          </td>
                          <td className="py-2.5 px-3 text-center text-[11px] text-slate-500 font-mono">
                            {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingSubmission(sub)}
                                title="Xem chi tiết bài làm"
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Xóa bài làm của sinh viên ${sub.studentInfo.fullName}?`)) {
                                    onDeleteSubmission(sub.id);
                                  }
                                }}
                                title="Xóa kết quả"
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* ================= TAB 2: QUESTION ANALYSIS ================= */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Phân tích Tỷ lệ Trả lời Đúng của Từng Câu Hỏi
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Thống kê tỷ lệ chọn đúng / sai và phân bổ 4 phương án A, B, C, D của sinh viên.
            </p>

            <div className="space-y-3">
              {stats?.questionAccuracy.map((qa) => {
                const isHard = qa.totalAttempts > 0 && qa.accuracyPercentage < 50;
                const isEasy = qa.totalAttempts > 0 && qa.accuracyPercentage >= 80;

                return (
                  <div key={qa.questionId} className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                        <span className="text-blue-600 font-bold mr-1.5">Câu {qa.orderNumber}:</span>
                        {qa.questionText}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          isHard ? 'bg-rose-100 text-rose-800' : isEasy ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {qa.accuracyPercentage}% Đúng ({qa.correctCount}/{qa.totalAttempts})
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2.5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isHard ? 'bg-rose-500' : isEasy ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${qa.accuracyPercentage}%` }}
                      />
                    </div>

                    {/* Option Distribution Chips */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                      <span className="text-slate-400 self-center mr-1">Phân bổ lựa chọn:</span>
                      {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => (
                        <span key={key} className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">
                          [{key}]: <strong>{qa.optionDistribution[key] || 0}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: QUESTION BANK MANAGEMENT ================= */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Ngân hàng Câu hỏi ({questions.length} câu)
              </h3>
              <p className="text-xs text-slate-500">
                Chỉnh sửa trực tiếp nội dung, đáp án đúng, thời gian làm bài và lời giải kỹ thuật.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-admin-reset-default-questions"
                type="button"
                onClick={() => setShowResetQuestionsConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Khôi phục 10 câu gốc</span>
              </button>

              <button
                id="btn-admin-add-question"
                type="button"
                onClick={handleStartAddQuestion}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm câu hỏi mới</span>
              </button>
            </div>
          </div>

          {/* List of Questions */}
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-blue-100 text-blue-900 font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold">
                      {q.category || 'Điện Ô Tô 1'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {q.timeLimit || 10}s
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditQuestion(q)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer font-medium text-xs flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer font-medium text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>

                {/* Question Text */}
                <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2.5">
                  {q.questionText}
                </h4>

                {/* Options list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                  {q.options.map((opt) => {
                    const isCorrect = opt.key === q.correctOption;
                    return (
                      <div
                        key={opt.key}
                        className={`p-2 rounded-lg border text-xs font-medium flex items-start gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {opt.key}
                        </span>
                        <span className="flex-1 text-[11px] leading-relaxed">{opt.text}</span>
                        {isCorrect && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">
                            Đúng
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                    <span className="font-bold text-slate-800 mr-1">Giải thích kỹ thuật:</span>
                    {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 4: CONFIGURATION ================= */}
      {activeTab === 'config' && (
        <div className="max-w-2xl bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Cài đặt Thông số Đề thi & Quy chế
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Thiết lập thời gian làm bài mỗi câu, tiêu đề hiển thị và thang điểm đạt.
          </p>

          {configSaveSuccess && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Đã cập nhật cấu hình đề thi thành công!
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs sm:text-sm">
            <div>
              <label htmlFor="config-title" className="block text-xs font-bold text-slate-700 mb-1">
                Tiêu đề bài kiểm tra
              </label>
              <input
                id="config-title"
                type="text"
                value={configForm.title}
                onChange={(e) => setConfigForm({ ...configForm, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="config-subject-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Tên học phần
                </label>
                <input
                  id="config-subject-name"
                  type="text"
                  value={configForm.subjectName}
                  onChange={(e) => setConfigForm({ ...configForm, subjectName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-xs sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="config-subject-code" className="block text-xs font-bold text-slate-700 mb-1">
                  Mã học phần
                </label>
                <input
                  id="config-subject-code"
                  type="text"
                  value={configForm.subjectCode}
                  onChange={(e) => setConfigForm({ ...configForm, subjectCode: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="config-time-limit" className="block text-xs font-bold text-slate-700 mb-1">
                  Thời gian đếm ngược mỗi câu (Giây)
                </label>
                <input
                  id="config-time-limit"
                  type="number"
                  min={5}
                  max={120}
                  value={configForm.defaultTimeLimit}
                  onChange={(e) => setConfigForm({ ...configForm, defaultTimeLimit: Number(e.target.value) || 10 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="config-passing-score" className="block text-xs font-bold text-slate-700 mb-1">
                  Tỷ lệ điểm đạt tối thiểu (%)
                </label>
                <input
                  id="config-passing-score"
                  type="number"
                  min={10}
                  max={100}
                  value={configForm.passingScorePercentage}
                  onChange={(e) => setConfigForm({ ...configForm, passingScorePercentage: Number(e.target.value) || 50 })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="config-description" className="block text-xs font-bold text-slate-700 mb-1">
                Mô tả hướng dẫn làm bài
              </label>
              <textarea
                id="config-description"
                rows={3}
                value={configForm.description}
                onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-xs sm:text-sm"
              />
            </div>

            <div className="pt-2">
              <button
                id="btn-save-config"
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cấu hình đề thi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: VIEW STUDENT ANSWER SHEET ================= */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-lg">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Phiếu chấm bài chi tiết</span>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {viewingSubmission.studentInfo.fullName}
                  <span className="text-xs font-normal text-slate-300 ml-2">
                    ({viewingSubmission.studentInfo.studentGroup})
                  </span>
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                aria-label="Đóng phiếu chấm bài"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-lg text-center text-xs border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Số câu đúng</span>
                  <p className="text-sm font-mono font-bold text-emerald-600 mt-0.5">
                    {viewingSubmission.score} / {viewingSubmission.totalQuestions}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Điểm hệ 10</span>
                  <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                    {viewingSubmission.scoreOutOfTen.toFixed(1)} đ
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500">Xếp loại</span>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">
                    {viewingSubmission.grade}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {viewingSubmission.answers.map((ans, idx) => (
                  <div
                    key={ans.questionId}
                    className={`p-3 rounded-lg border text-xs ${
                      ans.isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-rose-200 bg-rose-50/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">Câu {idx + 1}: {ans.questionText}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        ans.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {ans.isCorrect ? 'ĐÚNG (+1đ)' : 'SAI (0đ)'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs mt-1.5 text-slate-700">
                      <span>SV chọn: <strong>[{ans.selectedOption || 'Hết giờ'}]</strong></span>
                      <span>Đáp án chuẩn: <strong className="text-emerald-700">[{ans.correctOption}]</strong></span>
                      <span>Thời gian: {ans.timeSpentSeconds}s</span>
                    </div>

                    {ans.explanation && (
                      <p className="text-[11px] text-slate-600 mt-1.5 bg-white p-2 rounded border border-slate-200">
                        <strong>Giải thích:</strong> {ans.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end">
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT QUESTION ================= */}
      {(editingQuestion || isAddingQuestion) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-lg">
              <h3 className="text-sm sm:text-base font-bold text-white">
                {editingQuestion ? `Chỉnh sửa Câu hỏi` : `Thêm Câu hỏi Mới`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsAddingQuestion(false);
                }}
                aria-label="Đóng biểu mẫu câu hỏi"
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-xs sm:text-sm">
              {/* Question Text */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionFormData.questionText}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
                  placeholder="Nhập nội dung câu hỏi trắc nghiệm..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-xs sm:text-sm"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 text-xs">
                  Các lựa chọn đáp án (A, B, C, D) <span className="text-red-500">*</span>
                </label>
                {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key, idx) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-100 font-mono font-bold flex items-center justify-center text-slate-700 text-xs flex-shrink-0 border border-slate-200">
                      {key}
                    </span>
                    <input
                      type="text"
                      value={questionFormData.options?.[idx]?.text || ''}
                      onChange={(e) => {
                        const newOpts = [...(questionFormData.options || [])];
                        newOpts[idx] = { key, text: e.target.value };
                        setQuestionFormData({ ...questionFormData, options: newOpts });
                      }}
                      placeholder={`Nội dung đáp án ${key}...`}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* Correct Option picker & Time limit */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Đáp án đúng <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={questionFormData.correctOption}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correctOption: e.target.value as OptionKey })}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white text-xs"
                  >
                    <option value="A">Đáp án A</option>
                    <option value="B">Đáp án B</option>
                    <option value="C">Đáp án C</option>
                    <option value="D">Đáp án D</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 text-xs mb-1">
                    Thời gian làm bài (giây)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={questionFormData.timeLimit}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, timeLimit: Number(e.target.value) || 10 })}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1">
                  Giải thích kỹ thuật sau khi nộp bài
                </label>
                <textarea
                  rows={2}
                  value={questionFormData.explanation}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
                  placeholder="Giải thích nguyên lý kỹ thuật cho đáp án đúng..."
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-lg flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(null);
                  setIsAddingQuestion(false);
                }}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
              >
                Lưu câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation: Clear all */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 text-center space-y-3 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Xác nhận xóa tất cả bài nộp?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Toàn bộ kết quả thi và thống kê của các sinh viên sẽ bị xóa vĩnh viễn khỏi hệ thống.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllSubmissions();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Xóa tất cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation: Reset default questions */}
      {showResetQuestionsConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 text-center space-y-3 shadow-xl border border-slate-200">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Khôi phục 10 câu hỏi mặc định?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Bộ đề sẽ được thiết lập lại thành 10 câu hỏi chuẩn môn Hệ Thống Điện Ô Tô 1.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowResetQuestionsConfirm(false)}
                className="flex-1 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onResetDefaultQuestions();
                  setShowResetQuestionsConfirm(false);
                }}
                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
