'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function ChatAPIDebugger() {
  const { user } = useAuth();
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    if (!user?.id) {
      setError('No user ID found. Make sure you are logged in.');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      console.log('[ChatDebug] Testing API with userId:', user.id);
      
      const url = `/api/chat/contacts?userId=${user.id}`;
      console.log('[ChatDebug] Request URL:', url);
      
      const res = await fetch(url);
      console.log('[ChatDebug] Response status:', res.status);
      
      const data = await res.json();
      console.log('[ChatDebug] Response data:', data);
      
      setResponse(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[ChatDebug] API Error:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
      <h3 className="font-bold text-lg mb-3">Chat API Debugger</h3>
      
      <div className="space-y-3">
        <div className="text-sm">
          <p className="font-semibold">Current User ID:</p>
          <p className="font-mono text-gray-600">{user?.id || 'Not loaded'}</p>
        </div>

        <button
          onClick={testAPI}
          disabled={loading || !user?.id}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 transition"
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-sm text-red-700">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {response && (
          <div className="p-3 bg-green-100 border border-green-300 rounded text-sm">
            <p className="font-bold text-green-700">Response:</p>
            <pre className="text-xs mt-2 overflow-auto max-h-48 bg-white p-2 rounded border">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatAPIDebugger;
