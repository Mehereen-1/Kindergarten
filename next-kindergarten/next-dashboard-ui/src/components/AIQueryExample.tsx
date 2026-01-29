'use client';

import { useState } from 'react';
import { useAIQuery } from '@/hooks/useAIQuery';

/**
 * Example component demonstrating how to use the AI Query system
 * Teachers and parents can use natural language to query student/class data
 */
export default function AIQueryExample() {
  const [queryInput, setQueryInput] = useState('');
  const [userId] = useState('user_id_here'); // Set from auth context
  const {
    data,
    message,
    summary,
    loading,
    error,
    executeQuery,
    getTeacherSchedule,
    getClassStudents,
    getParentStudents,
    reset,
  } = useAIQuery();

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryInput.trim()) return;

    try {
      await executeQuery(queryInput, userId);
    } catch (err) {
      console.error('Query failed:', err);
    }
  };

  const handleQuickAction = async (action: string) => {
    try {
      switch (action) {
        case 'schedule':
          await getTeacherSchedule(userId);
          break;
        case 'class-students':
          // Replace with actual classId
          await getClassStudents('class_id_here', userId);
          break;
        case 'my-children':
          // Replace with actual parentId
          await getParentStudents(userId);
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold mb-6">AI School Assistant</h1>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => handleQuickAction('schedule')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={loading}
        >
          My Schedule
        </button>
        <button
          onClick={() => handleQuickAction('class-students')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          disabled={loading}
        >
          Class Students
        </button>
        <button
          onClick={() => handleQuickAction('my-children')}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
          disabled={loading}
        >
          My Children
        </button>
      </div>

      {/* Query Input */}
      <form onSubmit={handleQuery} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Ask me anything about students, classes, or schedules..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Ask'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Example Queries */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Example Queries:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• "Show me all students in class 5A"</li>
          <li>• "What are John's details?"</li>
          <li>• "Get my teaching schedule"</li>
          <li>• "Show me my children"</li>
          <li>• "Search for student Jane"</li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Message Display */}
      {message && !error && (
        <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded">
          <p className="font-semibold">{message}</p>
          {summary && <p className="text-sm mt-2">{summary}</p>}
        </div>
      )}

      {/* Data Display */}
      {data && !error && (
        <div className="border border-gray-300 rounded p-4">
          <h3 className="font-semibold mb-3">Results:</h3>

          {/* Array Data */}
          {Array.isArray(data) && (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <p className="font-semibold">{item.name || item.className}</p>
                  {item.email && <p className="text-sm text-gray-600">{item.email}</p>}
                  {item.grade && <p className="text-sm text-gray-600">Grade: {item.grade}</p>}
                  {item.roll && <p className="text-sm text-gray-600">Roll: {item.roll}</p>}
                  {item.subjects && (
                    <p className="text-sm text-gray-600">Subjects: {item.subjects.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Single Object Data */}
          {!Array.isArray(data) && (
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <dl className="space-y-2">
                {Object.entries(data).map(([key, value]) => {
                  if (Array.isArray(value)) {
                    return (
                      <div key={key}>
                        <dt className="font-semibold text-gray-700">{key}:</dt>
                        <dd className="text-sm text-gray-600 ml-4">
                          {value.map((item) => (
                            <div key={JSON.stringify(item)} className="py-1">
                              {typeof item === 'object'
                                ? JSON.stringify(item, null, 2)
                                : String(item)}
                            </div>
                          ))}
                        </dd>
                      </div>
                    );
                  }
                  if (typeof value === 'object') {
                    return (
                      <div key={key}>
                        <dt className="font-semibold text-gray-700">{key}:</dt>
                        <dd className="text-sm text-gray-600 ml-4">
                          <pre>{JSON.stringify(value, null, 2)}</pre>
                        </dd>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="flex gap-4">
                      <dt className="font-semibold text-gray-700">{key}:</dt>
                      <dd className="text-gray-600">{String(value)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-6">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Processing your query...</p>
        </div>
      )}
    </div>
  );
}
