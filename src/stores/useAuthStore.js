import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  // Initialize — check existing session
  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ isLoading: false, isAuthenticated: true, user: { id: 'local', email: 'local@snapverse.app' } });
      return;
    }
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session) {
        set({ user: session.user, session, isAuthenticated: true, isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Auth init error:', err);
      set({ isLoading: false, error: err.message });
    }
  },

  // Email sign in
  signIn: async (email, password) => {
    if (!isSupabaseConfigured()) return;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ user: data.user, session: data.session, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // Email sign up
  signUp: async (email, password) => {
    if (!isSupabaseConfigured()) return;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      set({
        user: data.user,
        session: data.session,
        isAuthenticated: !!data.session,
        isLoading: false,
      });
      return data;
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // Google OAuth sign in
  signInWithGoogle: async () => {
    if (!isSupabaseConfigured()) return;
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // OAuth flow will redirect, so we don't set state here
      // The auth state change listener in App.jsx will handle the result
    } catch (err) {
      set({ isLoading: false, error: err.message });
      throw err;
    }
  },

  // Sign out
  signOut: async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
