import OpenAI from 'openai';
import {
  getStudentDetails,
  getClassStudents,
  getTeacherSchedule,
  searchStudents,
  getStudentsByParentId,
  getTeacherByUserId,
  StudentDetails,
  TeacherSchedule,
} from './dataFetcher';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QueryResult {
  success: boolean;
  data?: StudentDetails[] | StudentDetails | TeacherSchedule | TeacherSchedule[] | string;
  message: string;
  query?: string;
}

interface ToolUseIntent {
  action: string;
  parameters: Record<string, string>;
}

/**
 * Parse natural language query using OpenAI to determine intent and extract parameters
 */
async function parseQuery(userQuery: string): Promise<ToolUseIntent | null> {
  try {
    const systemPrompt = `You are an assistant that understands user queries about students and teachers.
Analyze the user's query and determine what action they want to perform.

Available actions:
1. "get_student_details" - Get details of a specific student (requires: studentId)
2. "get_class_students" - Get all students in a class (requires: classId)
3. "get_teacher_schedule" - Get teacher's schedule and classes (requires: teacherId)
4. "search_students" - Search for students by name or class (requires: query, optional: searchBy)
5. "get_parent_students" - Get all students of a parent (requires: parentId)
6. "get_student_by_name" - Find student by name (requires: studentName)

Respond ONLY with a JSON object like this:
{
  "action": "action_name",
  "parameters": {
    "key": "value"
  }
}

If you cannot determine a clear action, respond with:
{
  "action": "unknown",
  "parameters": {}
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userQuery,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return null;

    try {
      const parsed = JSON.parse(content);
      return parsed as ToolUseIntent;
    } catch {
      console.error('Failed to parse AI response:', content);
      return null;
    }
  } catch (error) {
    console.error('Error parsing query with OpenAI:', error);
    return null;
  }
}

/**
 * Execute the determined action
 */
async function executeAction(intent: ToolUseIntent): Promise<QueryResult> {
  const { action, parameters } = intent;

  try {
    switch (action) {
      case 'get_student_details': {
        if (!parameters.studentId) {
          return { success: false, message: 'Student ID is required' };
        }
        const student = await getStudentDetails(parameters.studentId);
        return {
          success: !!student,
          data: student ?? undefined,
          message: student ? 'Student details retrieved successfully' : 'Student not found',
        };
      }

      case 'get_class_students': {
        if (!parameters.classId) {
          return { success: false, message: 'Class ID is required' };
        }
        const students = await getClassStudents(parameters.classId);
        return {
          success: students.length > 0,
          data: students,
          message: `Found ${students.length} students in the class`,
        };
      }

      case 'get_teacher_schedule': {
        if (!parameters.teacherId) {
          return { success: false, message: 'Teacher ID is required' };
        }
        const schedule = await getTeacherSchedule(parameters.teacherId);
        return {
          success: !!schedule,
          data: schedule ?? undefined,
          message: schedule ? 'Teacher schedule retrieved successfully' : 'Teacher not found',
        };
      }

      case 'search_students': {
        if (!parameters.query) {
          return { success: false, message: 'Search query is required' };
        }
        const searchBy = (parameters.searchBy as 'name' | 'class') || 'name';
        const students = await searchStudents(parameters.query, searchBy);
        return {
          success: students.length > 0,
          data: students,
          message: `Found ${students.length} matching students`,
        };
      }

      case 'get_parent_students': {
        if (!parameters.parentId) {
          return { success: false, message: 'Parent ID is required' };
        }
        const students = await getStudentsByParentId(parameters.parentId);
        return {
          success: students.length > 0,
          data: students,
          message: `Found ${students.length} student(s) for this parent`,
        };
      }

      case 'get_student_by_name': {
        if (!parameters.studentName) {
          return { success: false, message: 'Student name is required' };
        }
        const students = await searchStudents(parameters.studentName, 'name');
        return {
          success: students.length > 0,
          data: students,
          message: `Found ${students.length} student(s) matching "${parameters.studentName}"`,
        };
      }

      default:
        return {
          success: false,
          message: `Unknown action: ${action}. Please clarify your request.`,
        };
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return {
      success: false,
      message: `Error executing action: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Process a natural language query and return relevant data
 */
export async function processAIQuery(userQuery: string): Promise<QueryResult> {
  if (!userQuery || userQuery.trim().length === 0) {
    return {
      success: false,
      message: 'Please provide a query',
    };
  }

  // Parse the query to determine intent
  const intent = await parseQuery(userQuery);
  if (!intent) {
    return {
      success: false,
      message: 'Could not understand your query. Please try again.',
    };
  }

  // Execute the determined action
  const result = await executeAction(intent);
  return {
    ...result,
    query: userQuery,
  };
}

/**
 * Generate a natural language summary of the data
 */
export async function summarizeData(data: any): Promise<string> {
  try {
    const prompt = `Summarize this data in a friendly, concise way:
${JSON.stringify(data, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || 'Data retrieved successfully';
  } catch (error) {
    console.error('Error summarizing data:', error);
    return 'Data retrieved successfully';
  }
}
