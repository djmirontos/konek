import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: SupabaseClient | null = null;

const capacitorStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      const { value } = await Preferences.get({ key });
      if (value) return value;
      // Fallback to localStorage
      return localStorage.getItem(key);
    } catch {
      try { return localStorage.getItem(key); } catch { return null; }
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
    } catch {}
    // Always also save to localStorage as backup
    try { localStorage.setItem(key, value); } catch {}
  },
  async removeItem(key: string): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.remove({ key });
    } catch {}
    try { localStorage.removeItem(key); } catch {}
  },
};

export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: capacitorStorage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: "klasmeyt-auth-token",
    },
  });

  return supabaseInstance;
}
