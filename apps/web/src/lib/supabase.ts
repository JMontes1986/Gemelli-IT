// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type SupabaseConfig = {
  url: string;
  anonKey: string;
};

let client: SupabaseClient | null = null;
let clientConfig: SupabaseConfig | null = null;

const MISSING_ENV_MESSAGE =
  'Supabase no está configurado. Define PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY (o sus equivalentes SUPABASE_URL y SUPABASE_ANON_KEY para builds).';

function resolveSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.PUBLIC_SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export const tryGetSupabaseClient = (): SupabaseClient | null => {
  const config = resolveSupabaseConfig();

  if (!config) {
    return null;
  }

  const configChanged =
    !client ||
    !clientConfig ||
    clientConfig.url !== config.url ||
    clientConfig.anonKey !== config.anonKey;

  if (configChanged) {
    client = createClient(config.url, config.anonKey);
    clientConfig = { ...config };
  }

  return client;
};

export function getSupabaseClient(): SupabaseClient {
  const supabase = tryGetSupabaseClient();

  if (!supabase) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return supabase;
}

// Helper para verificar si el usuario está autenticado
export async function isAuthenticated() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// Helper para obtener el usuario actual
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper para logout
export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
