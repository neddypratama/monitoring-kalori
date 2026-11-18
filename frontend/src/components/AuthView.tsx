import React, { useState } from 'react';
import { Flame, Loader2, Lock, LogIn, UserPlus, User } from 'lucide-react';
import type { AuthUser } from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from './FormStatusBanner';
import { PasswordInput } from './PasswordInput';

interface AuthViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        const res = await api.login({ username: username.trim(), password });
        onAuthenticated(res.user);
      } else {
        const res = await api.register({
          username: username.trim(),
          full_name: fullName.trim(),
          password,
        });
        if (res.pending_activation || !res.user.is_active) {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setSuccessNotice(
            res.message ||
              `Pendaftaran @${res.user.username} berhasil! Akun Anda belum aktif — silakan tunggu atau hubungi Admin untuk mengaktifkan akun sebelum masuk.`
          );
          return;
        }
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses autentikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
        <div className="p-7 pb-5 text-center border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-200 mx-auto mb-3">
            <Flame className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">KaloriKu</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sistem Monitoring Kalori &amp; Program Diet
          </p>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mt-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessNotice(null);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-7 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="auth-fullname">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Siti Rahma"
                  className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="auth-username">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Contoh: budi atau admin"
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="auth-password">
              Password
            </label>
            <PasswordInput
              id="auth-password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              leftIcon={<Lock className="w-4 h-4" />}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="auth-confirm">
                Ulangi Password
              </label>
              <PasswordInput
                id="auth-confirm"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>
          )}

          {mode === 'register' && !submitting && !error && (
            <FormStatusBanner
              variant="info"
              message="Setelah mendaftar, akun baru berstatus Belum Aktif dan perlu diaktifkan oleh Admin sebelum bisa masuk."
            />
          )}
          {submitting && (
            <FormStatusBanner
              variant="loading"
              message={mode === 'login' ? 'Memverifikasi akun & memuat data Anda...' : 'Mendaftarkan akun baru...'}
            />
          )}
          {!submitting && successNotice && <FormStatusBanner variant="success" message={successNotice} />}
          {error && <FormStatusBanner variant="error" message={error} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {submitting ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Akun'}
          </button>
        </form>
      </div>
    </div>
  );
};
