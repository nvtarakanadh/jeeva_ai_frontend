// SUPABASE DISABLED - Using Django/PostgreSQL now
// This file returns a mock client that prevents all Supabase calls

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from './types';

// Create a mock client that prevents all Supabase calls
const createMockSupabaseClient = () => {
  console.warn('⚠️ Supabase is disabled. All Supabase calls will fail. Use Django API instead.');
  
  // Create a chainable mock that handles all Supabase query patterns
  const createChainableMock = () => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      is: () => chain,
      in: () => chain,
      contains: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({ 
        data: null, 
        error: { 
          code: 'PGRST116',
          message: 'Supabase is disabled. Use Django API instead.',
          details: 'The result contains 0 rows',
          hint: null
        } 
      }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (onResolve?: any, onReject?: any) => {
        const result = Promise.resolve({ data: [], error: null });
        return result.then(onResolve, onReject);
      },
    };
    
    // Make it thenable (Promise-like)
    chain.then = (onResolve?: any, onReject?: any) => {
      return Promise.resolve({ data: [], error: null }).then(onResolve, onReject);
    };
    
    return chain;
  };

  const mockFrom = () => createChainableMock();

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
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase is disabled' } }),
    },
  } as any;
};

// Export mock client instead of real Supabase client
export const supabase = createMockSupabaseClient();

// OLD CODE - DISABLED
// const SUPABASE_URL = "https://wgcmusjsuziqjkzuaqkd.supabase.co";
// const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
// export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {...});
