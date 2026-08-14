import React from 'react';
import { ShieldCheck, User, GraduationCap, Volume2, VolumeX, Car, Lock, LogOut } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface NavbarProps {
  currentView: 'student' | 'lecturer';
  onViewChange: (view: 'student' | 'lecturer') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  submissionCount?: number;
  isLecturerAuthenticated: boolean;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  soundEnabled,
  onToggleSound,
  submissionCount = 0,
  isLecturerAuthenticated,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs text-white">
              <Car className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-tight text-blue-400">AUTO-ED PRO</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest hidden sm:inline border-l border-slate-800 pl-2">
                  AUTO HỎI - AUTO NHỚ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                  CNOT-2026
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-semibold text-slate-200 tracking-tight flex items-center gap-1.5">
                Hệ Thống Kiểm Tra: Điện Ô Tô 1
              </h1>
            </div>
          </div>

          {/* Right Toolbar & Mode Switcher */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Sound Toggle */}
            <button
              id="btn-toggle-sound"
              type="button"
              onClick={onToggleSound}
              className={`p-1.5 sm:p-2 rounded-lg text-xs font-medium transition-colors border ${
                soundEnabled
                  ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Âm thanh: Đang bật' : 'Âm thanh: Đang tắt'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* View Switcher Tabs */}
            <div className="bg-slate-800/90 p-1 rounded-lg border border-slate-700/80 flex items-center gap-1">
              <button
                id="btn-mode-student"
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  onViewChange('student');
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  currentView === 'student'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sinh viên</span>
              </button>

              <button
                id="btn-mode-lecturer"
                type="button"
                onClick={() => {
                  soundFX.playSelect();
                  if (isLecturerAuthenticated) {
                    onViewChange('lecturer');
                  } else {
                    onOpenLoginModal();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all relative ${
                  currentView === 'lecturer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
                title={isLecturerAuthenticated ? 'Chuyển sang giao diện Giảng viên' : 'Đăng nhập để vào cổng Giảng viên'}
              >
                {isLecturerAuthenticated ? (
                  <GraduationCap className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Giảng viên</span>
                {isLecturerAuthenticated && submissionCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                    {submissionCount}
                  </span>
                )}
              </button>

              {isLecturerAuthenticated && (
                <button
                  id="btn-navbar-logout"
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors ml-1"
                  title="Đăng xuất khỏi tài khoản Giảng viên"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden md:inline">Đăng xuất</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

