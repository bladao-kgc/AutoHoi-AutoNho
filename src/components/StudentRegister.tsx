import React, { useState } from 'react';
import { StudentInfo, QuizConfig } from '../types';
import { User, Users, Play, Clock, CheckCircle2, Award, Zap, AlertCircle, BookOpen, Hash, Radio } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface StudentRegisterProps {
  config: QuizConfig;
  totalQuestions: number;
  onStartQuiz: (info: StudentInfo) => void;
}

export const StudentRegister: React.FC<StudentRegisterProps> = ({
  config,
  totalQuestions,
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

  const sampleGroups = ['L01 - Sáng Thứ 2', 'L02 - Chiều Thứ 3', 'L03 - Sáng Thứ 5', 'Nhóm 1', 'Nhóm 2', 'CĐ Ô Tô K21'];

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4">
      {/* Subject banner - High Density Dark Hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 sm:p-6 text-white shadow-xs mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Đang diễn ra
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
                {config.subjectCode || 'OT1-2024'}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                Bộ Môn Điện Ô Tô
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Bài Kiểm Tra: {config.title || 'Hệ Thống Điện Ô Tô 1'}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 text-left sm:text-right">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Mã phòng thi</div>
              <div className="text-sm font-mono font-bold text-blue-400 tracking-widest">OT1-2024</div>
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
              Nhập chính xác Họ tên và Nhóm học để lưu vào cơ sở dữ liệu bảng điểm.
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
              Họ và tên Sinh viên <span className="text-red-500">*</span>
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
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 font-medium transition-all text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* Student Group */}
          <div>
            <label htmlFor="input-student-group" className="block text-xs font-bold text-slate-700 mb-1">
              Nhóm học / Lớp sinh hoạt <span className="text-red-500">*</span>
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
                placeholder="Ví dụ: L01 - Sáng Thứ 2"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 font-medium transition-all text-xs sm:text-sm bg-white"
              />
            </div>

            {/* Quick group tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[11px] text-slate-400 self-center mr-1 font-medium">Gợi ý nhanh:</span>
              {sampleGroups.map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setStudentGroup(grp)}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 transition-colors"
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          {/* Student ID (Optional) */}
          <div>
            <label htmlFor="input-student-id" className="block text-xs font-bold text-slate-700 mb-1">
              Mã số sinh viên (MSSV) <span className="text-[11px] font-normal text-slate-400">(Tùy chọn)</span>
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
                placeholder="Ví dụ: 210458"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 text-xs sm:text-sm font-medium transition-all bg-white"
              />
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
              <li>Hỗ trợ nhấp chuột hoặc phím tắt <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-bold text-slate-800">A</kbd>, <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-bold text-slate-800">B</kbd>, <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-bold text-slate-800">C</kbd>, <kbd className="px-1 py-0.2 bg-white border border-slate-300 rounded font-bold text-slate-800">D</kbd>.</li>
              <li>Xem điểm số, xếp loại và giải thích kỹ thuật chi tiết ngay sau khi hoàn thành.</li>
            </ul>
          </div>

          {/* Start button */}
          <button
            id="btn-start-quiz"
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>BẮT ĐẦU LÀM BÀI KIỂM TRA</span>
          </button>
        </form>
      </div>
    </div>
  );
};

