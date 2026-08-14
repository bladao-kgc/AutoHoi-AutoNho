import React, { useState } from 'react';
import { Lock, User, KeyRound, Eye, EyeOff, AlertCircle, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface LecturerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const LecturerLoginModal: React.FC<LecturerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      setIsSubmitting(false);
      return;
    }

    try {
      // Check via backend API first
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('lecturer_auth', 'true');
          sessionStorage.setItem('lecturer_user', 'Bladao');
          soundFX.playCorrect();
          onLoginSuccess();
          onClose();
          return;
        }
      }

      // Local fallback check if offline / fallback
      if (
        cleanUsername.toLowerCase() === 'bladao' &&
        (cleanPassword === 'Bladao' || cleanPassword.toLowerCase() === 'bladao')
      ) {
        sessionStorage.setItem('lecturer_auth', 'true');
        sessionStorage.setItem('lecturer_user', 'Bladao');
        soundFX.playCorrect();
        onLoginSuccess();
        onClose();
        return;
      }

      soundFX.playIncorrect();
      setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác!');
    } catch {
      // Local fallback
      if (
        cleanUsername.toLowerCase() === 'bladao' &&
        (cleanPassword === 'Bladao' || cleanPassword.toLowerCase() === 'bladao')
      ) {
        sessionStorage.setItem('lecturer_auth', 'true');
        sessionStorage.setItem('lecturer_user', 'Bladao');
        soundFX.playCorrect();
        onLoginSuccess();
        onClose();
        return;
      }
      soundFX.playIncorrect();
      setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-lg max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-login-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                Xác thực quyền quản trị
              </span>
              <h3 id="modal-login-title" className="text-sm font-bold text-white">
                Đăng Nhập Cổng Giảng Viên
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4">
            Khu vực dành riêng cho Giảng viên quản lý ngân hàng câu hỏi, cấu hình đề thi và xem bảng điểm sinh viên.
          </p>

          {errorMsg && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="lecturer-username" className="block text-xs font-bold text-slate-700 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  id="lecturer-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-medium text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="lecturer-password" className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <input
                  id="lecturer-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-8 pr-9 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs font-medium text-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-submit-lecturer-login"
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
