import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface AuthPageProps {
  mode: 'login' | 'register' | 'admin';
  onNavigate: (path: string) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { user, login, register, adminLogin, claimAdmin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [readingInterest, setReadingInterest] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [adminStatus, setAdminStatus] = useState<{
    hasClaimedAdmin: boolean;
    hasEnvPasscode: boolean;
  } | null>(null);

  useEffect(() => {
    if (mode === 'admin') {
      api
        .getAdminStatus()
        .then(setAdminStatus)
        .catch(() => setAdminStatus({ hasClaimedAdmin: true, hasEnvPasscode: false }));
    }
  }, [mode]);

  useEffect(() => {
    if (user) {
      if (mode === 'admin' && user.role === 'admin') {
        onNavigate('/admin');
      } else if (mode !== 'admin') {
        onNavigate('/profil');
      }
    }
  }, [user, mode, onNavigate]);

  const isFirstRunAdminClaim =
    mode === 'admin' && adminStatus !== null && !adminStatus.hasClaimedAdmin && !adminStatus.hasEnvPasscode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const logged = await login(email, password);
        onNavigate(logged.role === 'admin' ? '/admin' : '/profil');
      } else if (mode === 'register') {
        await register(name, email, password, readingInterest);
        onNavigate('/profil');
      } else if (isFirstRunAdminClaim) {
        await claimAdmin(name, email, password);
        onNavigate('/admin');
      } else {
        await adminLogin(email, password);
        onNavigate('/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan autentikasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-14">
      <div className="bg-[#F3F7EF] border border-[#405344]/15 rounded-2xl p-7 sm:p-10">
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#405344] mb-2">
            {mode === 'admin' ? (
              <>
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Portal Khusus Pustakawan</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>Keanggotaan Perpustakaan Rona Rasa</span>
              </>
            )}
          </div>

          <h1 className="font-serif-display text-3xl font-medium text-[#222B24]">
            {mode === 'login'
              ? 'Masuk ke Ruang Baca'
              : mode === 'register'
              ? 'Daftar Anggota Baru'
              : isFirstRunAdminClaim
              ? 'Klaim Akun Pustakawan Utama'
              : 'Masuk Dashboard Admin'}
          </h1>

          <p className="text-sm text-[#556358] mt-2 leading-relaxed">
            {mode === 'login'
              ? 'Masuk untuk menyimpan bookmark, mencatat riwayat membaca, dan melanjutkan buku terakhir Anda.'
              : mode === 'register'
              ? 'Buat akun anggota gratis untuk menyimpan koleksi favorit dan melacak progres bacaan Anda.'
              : isFirstRunAdminClaim
              ? 'Belum ada pustakawan utama terdaftar. Tetapkan akun admin pertama untuk mengelola koleksi, berkas digital, dan isi halaman website.'
              : 'Portal akses terpisah khusus pengelola dan pustakawan Perpustakaan Rona Rasa.'}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg bg-[#9A3412]/10 border border-[#9A3412]/25 text-sm text-[#7C2D12]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'register' || isFirstRunAdminClaim) && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium text-[#222B24] mb-1.5">
                Nama Lengkap
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Arini Kusuma"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/25 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#222B24] mb-1.5">
              Alamat Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'admin' ? 'pustakawan@ronarasa.id' : 'nama@email.com'}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/25 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-medium text-[#222B24] mb-1.5">
              {mode === 'admin' && adminStatus?.hasEnvPasscode
                ? 'Kata Sandi / Kode Akses Admin'
                : 'Kata Sandi'}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={isFirstRunAdminClaim ? 8 : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isFirstRunAdminClaim ? 'Minimal 8 karakter' : 'Masukkan kata sandi'}
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/25 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-interest"
                className="block text-xs font-medium text-[#222B24] mb-1.5"
              >
                Minat Bacaan (Opsional)
              </label>
              <input
                id="auth-interest"
                type="text"
                value={readingInterest}
                onChange={(e) => setReadingInterest(e.target.value)}
                placeholder="Contoh: Novel klasik, puisi kontemporer, esai budaya"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F3] border border-[#405344]/25 rounded-lg text-[#222B24] focus:outline-none focus:border-[#405344]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-5 mt-2 text-sm font-medium bg-[#405344] text-[#FAF9F3] rounded-lg hover:bg-[#2A382D] disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Memproses...'
              : mode === 'login'
              ? 'Masuk'
              : mode === 'register'
              ? 'Buat Akun Anggota'
              : isFirstRunAdminClaim
              ? 'Tetapkan Akun Admin & Masuk'
              : 'Masuk ke Dashboard Admin'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#405344]/15 text-sm text-[#556358] flex flex-col gap-2">
          {mode === 'login' && (
            <>
              <p>
                Belum memiliki akun anggota?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/daftar')}
                  className="font-medium text-[#405344] hover:underline"
                >
                  Daftar sekarang
                </button>
              </p>
              <p>
                Anda pustakawan?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('/admin/login')}
                  className="font-medium text-[#405344] hover:underline"
                >
                  Masuk melalui Portal Admin
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p>
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/masuk')}
                className="font-medium text-[#405344] hover:underline"
              >
                Masuk di sini
              </button>
            </p>
          )}
          {mode === 'admin' && (
            <p>
              Pengunjung atau anggota biasa?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/masuk')}
                className="font-medium text-[#405344] hover:underline"
              >
                Masuk sebagai Anggota
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
