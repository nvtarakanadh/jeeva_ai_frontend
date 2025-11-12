// SUPABASE DISABLED - Using Django/PostgreSQL now
// This file returns a mock client that prevents all Supabase calls

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from './types';

// Create a mock client that prevents all Supabase calls
const createMockSupabaseClient = () => {
  console.warn('⚠️ Supabase is disabled. All Supabase calls will fail. Use Django API instead.');
  
  const mockFrom = () => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { message: 'Supabase is disabled. Use Django API instead.' } }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ data: null, error: { message: 'Supabase is disabled. Use Django API instead.' } }),
    update: () => Promise.resolve({ data: null, error: { message: 'Supabase is disabled. Use Django API instead.' } }),
    delete: () => Promise.resolve({ data: null, error: { message: 'Supabase is disabled. Use Django API instead.' } }),
  });

  return {
    from: mockFrom,
    channel: () => ({
      on: () => ({
        subscribe: () => ({ unsubscribe: () => {} }),
      }),
    }),
    auth: {
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as any;
};

// Export mock client instead of real Supabase client
export const supabase = createMockSupabaseClient();

// OLD CODE - DISABLED
// const SUPABASE_URL = "https://wgcmusjsuziqjkzuaqkd.supabase.co";
// const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
// export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {...});
