import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question, OptionKey, StudentInfo } from '../types';
import { Clock, AlertTriangle, ChevronRight, CheckCircle, User, Users, Sparkles, Radio, Zap } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface ActiveQuizProps {
  questions: Question[];
  studentInfo: StudentInfo;
  onFinishQuiz: (answers: { questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[]) => void;
}

export const ActiveQuiz: React.FC<ActiveQuizProps> = ({
  questions,
  studentInfo,
  onFinishQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const questionTimeLimit = currentQuestion?.timeLimit || 10;
  const [timeLeft, setTimeLeft] = useState<number>(questionTimeLimit);
  const [selectedOption, setSelectedOption] = useState<OptionKey | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Store answers collected so far
  const recordedAnswers = useRef<{ questionId: string; selectedOption: OptionKey | null; timeSpentSeconds: number }[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Function to move to next question or complete quiz
  const advanceToNext = useCallback((chosenOption: OptionKey | null) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const timeSpent = Math.min(
      questionTimeLimit,
      Number(((Date.now() - questionStartTimeRef.current) / 1000).toFixed(1))
    );

    recordedAnswers.current.push({
      questionId: currentQuestion.id,
      selectedOption: chosenOption,
      timeSpentSeconds: timeSpent,
    });

    // Clear current timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Delay briefly so student sees their selection highlight
    const delay = chosenOption ? 300 : 150;
    setTimeout(() => {
      if (currentIndex + 1 < totalQuestions) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsTransitioning(false);
      } else {
        // Quiz complete!
        soundFX.playFinish();
        onFinishQuiz(recordedAnswers.current);
      }
    }, delay);
  }, [currentIndex, currentQuestion, isTransitioning, onFinishQuiz, questionTimeLimit, totalQuestions]);

  // Handle option selection
  const handleSelectOption = (optionKey: OptionKey) => {
    if (isTransitioning || selectedOption !== null) return;
    soundFX.playSelect();
    setSelectedOption(optionKey);
    advanceToNext(optionKey);
  };

  // Setup 10-second timer whenever currentIndex changes
  useEffect(() => {
    setTimeLeft(questionTimeLimit);
    questionStartTimeRef.current = Date.now();
    setSelectedOption(null);
    setIsTransitioning(false);

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const interval = 100; // smooth countdown
    const endTime = Date.now() + questionTimeLimit * 1000;
    let lastTickSecond = questionTimeLimit;

    timerRef.current = setInterval(() => {
      const remainingMs = Math.max(0, endTime - Date.now());
      const remainingSec = Math.ceil(remainingMs / 1000);
      setTimeLeft(remainingSec);

      // Play tick or warning sound
      if (remainingSec !== lastTickSecond && remainingSec > 0) {
        lastTickSecond = remainingSec;
        if (remainingSec <= 3) {
          soundFX.playWarning();
        } else {
          soundFX.playTick();
        }
      }

      if (remainingMs <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        advanceToNext(null); // Time out
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, questionTimeLimit, advanceToNext]);

  // Keyboard shortcut listener (A, B, C, D or 1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning || selectedOption !== null) return;

      const key = e.key.toUpperCase();
      if (key === 'A' || key === '1') handleSelectOption('A');
      else if (key === 'B' || key === '2') handleSelectOption('B');
      else if (key === 'C' || key === '3') handleSelectOption('C');
      else if (key === 'D' || key === '4') handleSelectOption('D');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTransitioning, selectedOption]);

  // Progress calculations
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;
  const timeProgressPercent = (timeLeft / questionTimeLimit) * 100;

  const isUrgent = timeLeft <= 3;
  const isModerate = timeLeft <= 5 && !isUrgent;

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-6 px-4">
      {/* High Density Sub-Header Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 mb-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
            {currentIndex + 1}/{totalQuestions}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                {studentInfo.fullName}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-semibold">
                {studentInfo.studentGroup}
              </span>
              {studentInfo.studentId && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  MSSV: {studentInfo.studentId}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Bài thi: Hệ Thống Điện Ô Tô 1 • Tiến độ {currentIndex + 1} / {totalQuestions} câu
            </p>
          </div>
        </div>

        {/* Global Progress + Countdown Mini */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Tiến độ bài</div>
            <div className="text-xs font-mono font-bold text-slate-700">{Math.round(progressPercent)}%</div>
          </div>
          <div className="w-20 sm:w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Question Card - High Density Dark & Light Structure */}
      <div className="bg-slate-900 rounded-lg p-5 sm:p-6 text-white shadow-sm border border-slate-800">
        {/* Countdown Bar Top */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
              {currentQuestion.category || 'Điện Ô Tô 1'}
            </span>
            <span className="bg-red-500 text-[10px] px-2 py-0.5 rounded-full animate-pulse font-bold text-white">
              Live
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Thời gian còn lại</span>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-mono font-bold text-sm transition-all ${
                isUrgent
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                  : isModerate
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="tracking-wider">00:0{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Thin countdown progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-5">
          <div
            className={`h-full transition-all duration-100 ease-linear ${
              isUrgent ? 'bg-red-500' : isModerate ? 'bg-amber-400' : 'bg-blue-500'
            }`}
            style={{ width: `${timeProgressPercent}%` }}
          />
        </div>

        {/* Question Text */}
        <div className="mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-slate-100 leading-relaxed">
            <span className="text-blue-400 font-bold mr-1.5">Câu {currentIndex + 1}:</span>
            {currentQuestion.questionText}
          </h2>
        </div>

        {/* Options Grid - High Density Slate Buttons */}
        <div className="space-y-2.5 mb-6">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedOption === option.key;

            return (
              <button
                key={option.key}
                id={`btn-option-${option.key}`}
                type="button"
                disabled={isTransitioning}
                onClick={() => handleSelectOption(option.key)}
                className={`w-full text-left p-3 sm:p-3.5 rounded-lg border transition-all flex items-start gap-3 cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs font-semibold'
                    : 'bg-slate-800/90 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-300'
                }`}
              >
                {/* Option Badge */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'bg-white text-blue-900'
                      : 'bg-slate-700 text-slate-300 group-hover:bg-slate-600 group-hover:text-white'
                  }`}
                >
                  {option.key}
                </div>

                {/* Text */}
                <div className="flex-1">
                  <p className="text-xs sm:text-sm leading-relaxed">
                    {option.text}
                  </p>
                </div>

                {isSelected && (
                  <div className="self-center text-white flex-shrink-0 animate-in zoom-in-50 duration-150">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Keyboard Shortcuts & Urgency Alerts */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Phím tắt:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">B</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">C</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono font-bold">D</kbd>
          </div>

          {isUrgent && (
            <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" /> Sắp hết giờ câu này!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

