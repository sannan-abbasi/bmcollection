import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'bm-collection-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'implicit',
  },
});

export const ADMIN_EMAIL = 'sannanabbasi025@gmail.com';

export const BRAND = {
  name: 'BM Collection',
  tagline: 'Curated Luxury, Crafted for You',
  instagram: 'https://www.instagram.com/bm_collection000/',
  facebook: 'https://www.facebook.com/biyaros',
  whatsapp: '03315076479',
  whatsappLink: 'https://wa.me/923315076479',
  email: 'binteakram224@gmail.com',
};
