'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Jika pengguna sudah log masuk, arahkan ke papan pemuka utama
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Sila isi emel dan kata laluan anda.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // Sekiranya pengesahan emel diaktifkan, beritahu pengguna
        if (data.session === null) {
          setSuccessMsg('Pendaftaran berjaya! Sila semak emel anda untuk pengesahan akaun.');
        } else {
          setSuccessMsg('Pendaftaran berjaya! Anda sedang log masuk...');
          router.push('/');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setSuccessMsg('Log masuk berjaya! Membuka papan pemuka...');
        router.push('/');
      }
    } catch (err) {
      // Terjemah mesej ralat biasa ke bahasa Melayu demi keselesaan pengguna
      let message = err instanceof Error ? err.message : 'Berlaku ralat sistem.';
      if (message.includes('Invalid login credentials')) {
        message = 'Emel atau kata laluan tidak sah.';
      } else if (message.includes('User already registered')) {
        message = 'Pengguna dengan emel ini sudah berdaftar.';
      } else if (message.includes('Password should be at least 6 characters')) {
        message = 'Kata laluan mestilah sekurang-kurangnya 6 aksara.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 text-white flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-t-indigo-500 border-zinc-800 animate-spin"></div>
          <span className="text-sm text-zinc-400 font-medium">Memuatkan sesi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white flex justify-center items-center p-0 md:p-6">
      {/* Mobile Container mockup */}
      <div className="w-full max-w-md min-h-screen md:min-h-[850px] md:h-[850px] md:rounded-[40px] md:border-8 md:border-zinc-800 bg-zinc-900 shadow-2xl relative flex flex-col justify-center px-8 py-12 overflow-y-auto scrollbar-none">
        
        {/* Hiasan Kamera Telefon (Notch) */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-full z-50"></div>

        {/* Latar Belakang Grafik Hiasan */}
        <div className="absolute top-10 right-4 w-40 h-40 rounded-full bg-indigo-600/10 blur-3xl -z-10"></div>
        <div className="absolute bottom-10 left-4 w-44 h-44 rounded-full bg-purple-600/10 blur-3xl -z-10"></div>

        {/* Kepala Skrin */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-indigo-600 items-center justify-center font-bold text-2xl tracking-wider shadow-xl shadow-indigo-600/20 mb-4 animate-bounce">
            🏗️
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Selamat Datang ke JKR Site Diary</h2>
          <p className="text-sm text-zinc-400 mt-2">
            {isSignUp ? 'Daftar akaun baharu untuk mulakan pengurusan log tapak bina' : 'Log masuk untuk mengurus log tapak bina anda'}
          </p>
        </div>

        {/* Tab Toggle Antara Log Masuk & Daftar */}
        <div className="flex p-1 bg-zinc-950 rounded-xl mb-6 border border-zinc-850">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              !isSignUp ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Log Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              isSignUp ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Mesej Ralat / Sukses */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* Borang Log Masuk / Daftar */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400" htmlFor="email">
              Alamat Emel
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650"
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400" htmlFor="password">
              Kata Laluan
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder-zinc-650"
              disabled={loading}
              required
            />
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                className="text-xs text-indigo-400 hover:underline hover:text-indigo-300 font-medium"
                onClick={() => alert('Sistem reset kata laluan belum disediakan.')}
              >
                Lupa Kata Laluan?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full h-12 mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition-all font-semibold flex items-center justify-center shadow-lg shadow-indigo-600/30 text-sm disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-t-white border-indigo-400 animate-spin"></div>
            ) : isSignUp ? (
              'Cipta Akaun'
            ) : (
              'Log Masuk Sekarang'
            )}
          </button>
        </form>

        {/* Kaki Borang Penafian Kunci Supabase */}
        {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
          <div className="mt-8 text-[10px] text-amber-300/80 bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 text-center">
            ⚠️ Kunci Supabase tidak dikonfigurasikan dengan lengkap dalam fail `.env.local`. Proses log masuk/daftar mungkin akan gagal di peringkat pelayan.
          </div>
        )}

      </div>
    </div>
  );
}
