import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production-safe cache clearing for authentication issues
if (typeof window !== "undefined") {
  console.log('🧹 Starting production cache management...');
  
  // Check for corrupted auth state (more conservative)
  const hasCorruptedAuth = () => {
    try {
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('token')
      );
      
      for (const key of authKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsed = JSON.parse(value);
            // Only consider truly corrupted data
            if (!parsed.access_token || !parsed.user || !parsed.refresh_token) {
              console.log('🔍 Found malformed auth data:', key);
              return true;
            }
            // Don't clear expired tokens - let Supabase handle refresh
          } catch {
            console.log('🔍 Found corrupted auth data:', key);
            return true;
          }
        }
      }
      return false;
    } catch {
      return true;
    }
  };

  // Clear corrupted auth data in production (conservative approach)
  if (hasCorruptedAuth()) {
    console.log('🧹 Clearing only corrupted auth data...');
    
    // Only clear specific corrupted keys, not everything
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('token')) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Only clear if truly corrupted
            if (!parsed.access_token || !parsed.user || !parsed.refresh_token) {
              console.log('🗑️ Clearing corrupted localStorage key:', key);
              localStorage.removeItem(key);
            }
          }
        } catch {
          console.log('🗑️ Clearing unparseable localStorage key:', key);
          localStorage.removeItem(key);
        }
      }
    });
    
    console.log('✅ Conservative cache clearing completed');
  }
}

// Add AI backend health check function for production debugging
if (typeof window !== "undefined") {
  (window as any).testAIBackend = async () => {
    console.log('🧪 Testing AI backend connection...');
    try {
      const { healthCheck } = await import('@/services/aiAnalysisService');
      const result = await healthCheck();
      console.log('✅ AI Backend health check:', result);
      return result;
    } catch (error) {
      console.error('❌ AI Backend health check failed:', error);
      return { error: error.message };
    }
  };
}

createRoot(document.getElementById("root")!).render(<App />);
