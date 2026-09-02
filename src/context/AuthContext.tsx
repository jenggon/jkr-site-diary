'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  createNgamsoiPreviewSession,
  isNgamsoiPreviewMode,
  ngamsoiPreviewFetch,
} from '@/lib/ngamsoiPreview';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development-only physical-device preview. This bypass exists solely for
    // NGAMSOI UI acceptance on LAN and is hard-disabled in production.
    if (isNgamsoiPreviewMode()) {
      const previewSession = createNgamsoiPreviewSession();
      setSession(previewSession);
      setUser(previewSession.user);
      setLoading(false);
      return;
    }

    // Dapatkan sesi semasa secara tak senkronus
    async function getSession() {
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        setSession(activeSession);
        setUser(activeSession?.user ?? null);
      } catch (error) {
        console.error('Ralat ketika mendapatkan sesi:', error);
      } finally {
        setLoading(false);
      }
    }

    getSession();

    // Dengar perubahan status pengesahan (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // F1 Golden Path: canonical API mutation/read routes verify the caller from
  // an Authorization bearer token. Existing product UI uses same-origin
  // `fetch('/api/...')` calls, so inject the current verified Supabase session
  // token centrally instead of allowing individual screens to invent actor
  // authority or duplicate authentication plumbing.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const accessToken = session?.access_token;
    if (!accessToken) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const previewResponse = await ngamsoiPreviewFetch(input, init);
      if (previewResponse) return previewResponse;

      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const isAppApi =
        requestUrl.startsWith('/api/') ||
        requestUrl.startsWith(`${window.location.origin}/api/`);

      if (!isAppApi) {
        return originalFetch(input, init);
      }

      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );

      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [session?.access_token]);

  const signOut = async () => {
    if (isNgamsoiPreviewMode()) return;

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Ralat ketika log keluar:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth mestilah digunakan di dalam AuthProvider');
  }
  return context;
}
