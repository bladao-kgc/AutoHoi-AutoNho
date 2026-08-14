import React, { useEffect } from 'react';
import { QuizSubmission } from '../types';
import { CheckCircle2, XCircle, Clock, Award, RotateCcw, Printer, Share2, AlertCircle, Sparkles, BookOpen, ArrowRight, Check, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundFX } from '../utils/audio';

interface QuizResultProps {
  submission: QuizSubmission;
  onRetakeQuiz: () => void;
  onGoToLecturerPortal?: () => void;
}

export const QuizResult: React.FC<QuizResultProps> = ({
  submission,
  onRetakeQuiz,
  onGoToLecturerPortal,
}) => {
  const { studentInfo, score, totalQuestions, scoreOutOfTen, percentage, grade, passed, totalTimeSeconds, answers } = submission;

  useEffect(() => {
    if (percentage >= 70) {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#38bdf8', '#6366f1'],
        });
      } catch {
        // Safe fallback
      }
    }
  }, [percentage]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4">
      {/* Result Hero Banner - High Density Style */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden mb-5">
        {/* Dark High Density Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                  Kết quả hoàn thành
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  OT1-2024 • {new Date(submission.submittedAt).toLocaleTimeString('vi-VN')}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {studentInfo.fullName}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Nhóm học: <span className="font-semibold text-blue-400">{studentInfo.studentGroup}</span>
                {studentInfo.studentId && <span className="text-slate-400"> • MSSV: {studentInfo.studentId}</span>}
              </p>
            </div>

            {/* High Density Score Box */}
            <div className="flex items-center gap-4 bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-lg">
              <div className="text-left sm:text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Điểm số Hệ 10</div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                  {scoreOutOfTen.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                </div>
              </div>

              <div className="h-9 w-px bg-slate-700" />

              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Xếp loại</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm font-bold text-white font-mono">{grade}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* High Density Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Số câu đúng</span>
            <p className="text-sm font-bold font-mono text-emerald-600 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {score} / {totalQuestions} câu
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Số câu sai / Hết giờ</span>
            <p className="text-sm font-bold font-mono text-rose-600 mt-0.5 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {totalQuestions - score} câu
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tổng thời gian</span>
            <p className="text-sm font-bold font-mono text-slate-800 mt-0.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" /> {totalTimeSeconds}s
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tỷ lệ chính xác</span>
            <p className="text-sm font-bold font-mono text-blue-600 mt-0.5">
              {percentage}%
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-2.5">
          <button
            id="btn-retake-quiz"
            type="button"
            onClick={() => {
              soundFX.playSelect();
              onRetakeQuiz();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại bài kiểm tra</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-print-result"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In bảng điểm</span>
            </button>

            {onGoToLecturerPortal && (
              <button
                id="btn-view-class-board"
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  onGoToLecturerPortal();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs transition-colors cursor-pointer border border-slate-700"
                title="Yêu cầu xác thực tài khoản giảng viên"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Cổng Giảng Viên</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* High Density Detailed Answer Sheet */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            Đối Chiếu Đáp Án & Giải Thích Kỹ Thuật ({answers.length} câu)
          </h3>
          <span className="text-[11px] text-slate-500">
            Hệ thống chấm điểm tự động 10s
          </span>
        </div>

        {answers.map((ans, idx) => {
          const isCorrect = ans.isCorrect;
          const isTimedOut = ans.selectedOption === null;

          return (
            <div
              key={ans.questionId}
              id={`review-question-${idx + 1}`}
              className={`bg-white rounded-lg border p-4 transition-all ${
                isCorrect
                  ? 'border-slate-200 hover:border-slate-300'
                  : 'border-rose-200 bg-rose-50/10'
              }`}
            >
              {/* Header of review item */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-xs ${
                    isCorrect
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Thời gian: {ans.timeSpentSeconds}s
                  </span>
                </div>

                <div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Check className="w-3 h-3" /> ĐÚNG (+1đ)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3 h-3" /> {isTimedOut ? 'HẾT GIỜ (0đ)' : 'SAI (0đ)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <p className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 leading-relaxed">
                {ans.questionText}
              </p>

              {/* Answer comparison tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 text-xs">
                <div className={`p-2 rounded border flex items-center justify-between ${
                  isCorrect
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : isTimedOut
                    ? 'bg-slate-100 border-slate-200 text-slate-600'
                    : 'bg-rose-50/50 border-rose-200 text-rose-950'
                }`}>
                  <span className="text-[11px] text-slate-500 font-medium">Bạn đã chọn:</span>
                  <span className="font-bold font-mono">
                    {isTimedOut ? '⏰ Hết giờ' : `Đáp án [${ans.selectedOption}]`}
                  </span>
                </div>

                <div className="p-2 rounded border bg-emerald-50/50 border-emerald-200 text-emerald-950 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-700 font-medium">Đáp án chuẩn:</span>
                  <span className="font-bold font-mono text-emerald-700">
                    Đáp án [{ans.correctOption}]
                  </span>
                </div>
              </div>

              {/* Technical explanation */}
              {ans.explanation && (
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800 mr-1">Giải thích kỹ thuật:</span>
                  {ans.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

