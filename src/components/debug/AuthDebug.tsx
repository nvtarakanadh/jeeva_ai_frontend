import React, { useState } from 'react';
// Supabase removed - using Django API only
import { useAuth } from '@/contexts/AuthContext';

const AuthDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { user, session, isLoading, isAuthenticated } = useAuth();

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      setDebugInfo(`
Supabase Connection Test:
- Session exists: ${!!data.session}
- User ID: ${data.session?.user?.id || 'None'}
- Error: ${error?.message || 'None'}
- Current Auth State:
  - isAuthenticated: ${isAuthenticated}
  - isLoading: ${isLoading}
  - user: ${user ? `${user.name} (${user.role})` : 'None'}
  - session: ${session ? 'Exists' : 'None'}
      `);
    } catch (err) {
      setDebugInfo(`Connection test failed: ${err}`);
    }
  };

  const testLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword'
      });
      setDebugInfo(`
Login Test:
- Success: ${!error}
- User: ${data.user?.id || 'None'}
- Session: ${data.session ? 'Exists' : 'None'}
- Error: ${error?.message || 'None'}
      `);
    } catch (err) {
      setDebugInfo(`Login test failed: ${err}`);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Auth Debug Panel</h3>
      <button onClick={testSupabaseConnection} style={{ margin: '5px' }}>
        Test Supabase Connection
      </button>
      <button onClick={testLogin} style={{ margin: '5px' }}>
        Test Login
      </button>
      <pre style={{ background: '#f5f5f5', padding: '10px', marginTop: '10px' }}>
        {debugInfo || 'Click a button to test'}
      </pre>
    </div>
  );
};

export default AuthDebug;
