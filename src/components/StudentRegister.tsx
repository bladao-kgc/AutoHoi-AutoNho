import React, { useState } from 'react';
import { StudentInfo, QuizConfig } from '../types';
import { User, Users, Play, Clock, CheckCircle2, Award, Zap, AlertCircle, BookOpen, Hash, Layers } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StudentRegisterProps {
  config: QuizConfig;
  totalQuestions: number;
  availableQuizzes?: { id: string; title: string; subjectCode: string; subjectName: string; questionCount: number; isActive: boolean }[];
  selectedQuizId?: string;
  onSelectQuiz?: (quizId: string) => void;
  onStartQuiz: (info: StudentInfo) => void;
}

export const StudentRegister: React.FC<StudentRegisterProps> = ({
  config,
  totalQuestions,
  availableQuizzes = [],
  selectedQuizId,
  onSelectQuiz,
  onStartQuiz,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentGroup, setStudentGroup] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Vui lòng nhập đầy đủ Họ và tên.');
      return;
    }
    if (!studentGroup.trim()) {
      setError('Vui lòng nhập Nhóm học hoặc Lớp.');
      return;
    }

    setError(null);
    soundFX.playSelect();
    onStartQuiz({
      fullName: fullName.trim(),
      studentGroup: studentGroup.trim(),
      studentId: studentId.trim() || undefined,
    });
  };

  const sampleGroups = ['L01 - Sáng Thứ 2', 'L02 - Chiều Thứ 3', 'L03 - Sáng Thứ 5', 'Nhóm 1', 'Nhóm 2', 'CĐ Ô Tô K21', 'CĐ Ô Tô K22'];

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4">
      {/* Quiz Switcher if multiple quizzes exist */}
      {availableQuizzes.length > 1 && onSelectQuiz && (
        <div className="mb-4 bg-slate-900/90 border border-slate-800 rounded-lg p-3 sm:p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Danh Sách Môn / Đề Thi:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableQuizzes.map((q) => {
              const isCurrent = (selectedQuizId && q.id === selectedQuizId) || (!selectedQuizId && q.isActive);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    soundFX.playSelect();
                    onSelectQuiz(q.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                  }`}
                >
                  <span className="font-mono text-[10px] text-blue-300">[{q.subjectCode}]</span>
                  <span>{q.title}</span>
                  {q.isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Đang kích hoạt"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject banner - High Density Dark Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 sm:p-6 text-white shadow-xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Đang diễn ra
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                {config.subjectCode || 'CNOT-2026'}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {config.departmentName || 'Khoa Cơ khí - Xây dựng'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Bài Kiểm Tra: {config.title || 'Hệ Thống Điện Ô Tô 1'}
            </h2>
            <div className="text-xs text-blue-300 font-medium mt-1">
              Môn học: <span className="font-semibold text-white">{config.subjectName || 'Điện Ô Tô 1'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 text-left sm:text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Mã phòng / Môn</div>
              <div className="text-sm font-mono font-bold text-blue-400 tracking-widest">{config.subjectCode || 'CNOT-2026'}</div>
            </div>
          </div>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed my-4">
          {config.description}
        </p>

        {/* Quick Rules Grid - High Density Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Thời gian đếm ngược</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{config.defaultTimeLimit} giây <span className="text-[11px] font-normal text-slate-400">/ câu</span></span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Số lượng câu hỏi</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{totalQuestions} câu <span className="text-[11px] font-normal text-slate-400">trắc nghiệm</span></span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Thang điểm chuẩn</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>10.0 <span className="text-[11px] font-normal text-slate-400">Hệ số 10</span></span>
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Quy chế chuyển câu</div>
            <div className="text-sm font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Tự động <span className="text-[11px] font-normal text-slate-400">khi hết giờ</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Card - High Density Form */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden p-5 sm:p-6">
        <div className="mb-4 pb-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 -mt-5 p-4 sm:-mx-6 sm:-mt-6 sm:p-5">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              Đăng Ký Thông Tin Thí Sinh
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập chính xác Họ tên và Nhóm học để lưu vĩnh viễn vào kết quả thi môn học của Giảng viên.
            </p>
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
            Bắt buộc
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* Full Name */}
          <div>
            <label htmlFor="input-full-name" className="block text-xs font-bold text-slate-700 mb-1">
              Họ và tên thí sinh <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>

          {/* Student Group & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-student-group" className="block text-xs font-bold text-slate-700 mb-1">
                Lớp / Nhóm học tập <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="input-student-group"
                  type="text"
                  required
                  value={studentGroup}
                  onChange={(e) => setStudentGroup(e.target.value)}
                  placeholder="Ví dụ: CĐ Ô Tô K21 hoặc Nhóm 1"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Sample Class chips for rapid selection */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sampleGroups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setStudentGroup(grp)}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition-colors cursor-pointer"
                  >
                    + {grp}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="input-student-id" className="block text-xs font-bold text-slate-700 mb-1">
                Mã số sinh viên (MSSV) <span className="text-slate-400 font-normal">(Tùy chọn)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="input-student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ví dụ: 21OT0123"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs sm:text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Exam Rules Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Quy chế làm bài trắc nghiệm 10s:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[11px]">
              <li>Mỗi câu hỏi có <strong>{config.defaultTimeLimit} giây</strong> đếm ngược. Hệ thống tự động chuyển câu tiếp theo khi hết thời gian.</li>
              <li>Hỗ trợ nhấp chuột hoặc phím tắt <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800">A</kbd>, <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800">B</kbd>, <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800">C</kbd>, <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-slate-800">D</kbd>.</li>
              <li>Xem điểm số, xếp loại và giải thích kỹ thuật chi tiết ngay sau khi hoàn thành.</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="btn-start-quiz"
              type="submit"
              className="w-full py-3.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>BẮT ĐẦU LÀM BÀI KIỂM TRA</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
