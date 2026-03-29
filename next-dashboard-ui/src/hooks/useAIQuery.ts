import { useState, useCallback } from 'react';

interface UseAIQueryResult {
  data: any;
  message: string;
  summary: string;
  loading: boolean;
  error: string | null;
}

interface UseAIQueryState extends UseAIQueryResult {
  query: string;
}

/**
 * React hook for querying the AI system
 * 
 * Usage:
 * const { query, loading, error, data, message, summary, executeQuery } = useAIQuery();
 * 
 * // Simple query
 * await executeQuery("Show me all students in class 5A", userId);
 * 
 * // Get teacher schedule
 * await getTeacherSchedule(teacherId);
 * 
 * // Get parent's students
 * await getParentStudents(parentId);
 */
export function useAIQuery() {
  const [state, setState] = useState<UseAIQueryState>({
    query: '',
    data: null,
    message: '',
    summary: '',
    loading: false,
    error: null,
  });

  const executeQuery = useCallback(
    async (query: string, userId: string): Promise<any> => {
      setState((prev) => ({
        ...prev,
        query,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, userId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        setState((prev) => ({
          ...prev,
          data: result.data,
          message: result.message,
          summary: result.summary,
          error: result.success ? null : result.message,
          loading: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw error;
      }
    },
    []
  );

  const getTeacherSchedule = useCallback(async (teacherId: string) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/ai/teacher?teacherId=${teacherId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setState((prev) => ({
        ...prev,
        data: result.data,
        message: result.message,
        error: result.success ? null : result.message,
        loading: false,
      }));

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      throw error;
    }
  }, []);

  const getClassStudents = useCallback(
    async (classId: string, teacherId: string) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/ai/teacher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ classId, teacherId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        setState((prev) => ({
          ...prev,
          data: result.data,
          message: result.message,
          error: result.success ? null : result.message,
          loading: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw error;
      }
    },
    []
  );

  const getParentStudents = useCallback(async (parentId: string) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/ai/parent?parentId=${parentId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setState((prev) => ({
        ...prev,
        data: result.data,
        message: result.message,
        error: result.success ? null : result.message,
        loading: false,
      }));

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      throw error;
    }
  }, []);

  const getStudentDetails = useCallback(
    async (studentId: string, parentId: string) => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/ai/parent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentId, parentId }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        setState((prev) => ({
          ...prev,
          data: result.data,
          message: result.message,
          error: result.success ? null : result.message,
          loading: false,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      query: '',
      data: null,
      message: '',
      summary: '',
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    executeQuery,
    getTeacherSchedule,
    getClassStudents,
    getParentStudents,
    getStudentDetails,
    reset,
  };
}
