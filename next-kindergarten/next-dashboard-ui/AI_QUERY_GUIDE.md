# AI Query System - Implementation Guide

## Overview

This AI-powered query system allows teachers and parents to retrieve real-time data about students and schedules using natural language queries. The system uses OpenAI's GPT-4 to understand user intent and safely execute predefined database queries.

## Architecture

### Components

1. **Data Fetcher (`src/lib/ai/dataFetcher.ts`)**
   - Safe database query functions
   - No use of `eval()` or dynamic code execution
   - Type-safe responses
   - Functions: `getStudentDetails()`, `getClassStudents()`, `getTeacherSchedule()`, `searchStudents()`, etc.

2. **Query Processor (`src/lib/ai/queryProcessor.ts`)**
   - Parses natural language queries
   - Determines user intent
   - Executes appropriate database queries
   - Generates summaries of results

3. **API Endpoints**
   - `POST /api/ai/query` - General query endpoint
   - `GET/POST /api/ai/teacher` - Teacher-specific endpoints
   - `GET/POST /api/ai/parent` - Parent-specific endpoints

## API Endpoints

### 1. General Query Endpoint

**Endpoint:** `POST /api/ai/query`

**Purpose:** Process natural language queries from both teachers and parents.

**Request:**
```json
{
  "query": "What are the details of student John in class 5A?",
  "userId": "teacher_or_parent_user_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student_id",
    "name": "John Doe",
    "email": "john@example.com",
    "classId": "class_id",
    "grade": "5",
    "roll": "5",
    "address": "123 Main St",
    "bloodGroup": "O+",
    "birthday": "2015-05-10T00:00:00.000Z",
    "sex": "male",
    "profilePic": "url_to_pic"
  },
  "message": "Student details retrieved successfully",
  "summary": "John Doe is a 5th grade student in class 5A, born on May 10, 2015.",
  "query": "What are the details of student John in class 5A?"
}
```

**Supported Query Types:**
- "What are the details of student [name]?"
- "Show me all students in class [class_id]"
- "What is [teacher_name]'s schedule?"
- "Search for student [name]"
- "Show my children" (for parents)
- "What classes do I teach?" (for teachers)

---

### 2. Teacher Endpoints

#### Get Teacher Schedule

**Endpoint:** `GET /api/ai/teacher?teacherId=xxx`

**Purpose:** Retrieve a teacher's schedule and assigned classes.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "teacher_profile_id",
    "name": "Mrs. Smith",
    "email": "smith@school.com",
    "subjects": ["English", "Literature"],
    "qualification": "M.A. in English",
    "joiningDate": "2020-08-15T00:00:00.000Z",
    "classSchedule": [
      {
        "className": "5A",
        "grade": "5",
        "schedule": "Monday-Friday 9:00 AM - 4:00 PM",
        "dayTime": "Monday-Friday 9:00 AM - 4:00 PM"
      },
      {
        "className": "6B",
        "grade": "6",
        "schedule": "Monday-Friday 9:00 AM - 4:00 PM",
        "dayTime": "Monday-Friday 9:00 AM - 4:00 PM"
      }
    ]
  },
  "message": "Teacher schedule retrieved successfully"
}
```

#### Get Class Students

**Endpoint:** `POST /api/ai/teacher`

**Purpose:** Get all students in a specific class taught by the teacher.

**Request:**
```json
{
  "classId": "class_id",
  "teacherId": "teacher_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student_1_id",
      "name": "John Doe",
      "grade": "5",
      "roll": "1",
      "classId": "class_id"
    },
    {
      "id": "student_2_id",
      "name": "Jane Smith",
      "grade": "5",
      "roll": "2",
      "classId": "class_id"
    }
  ],
  "message": "Found 25 students in the class",
  "count": 25
}
```

---

### 3. Parent Endpoints

#### Get Parent's Students

**Endpoint:** `GET /api/ai/parent?parentId=xxx`

**Purpose:** Get all students belonging to a parent.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student_1_id",
      "name": "John Doe",
      "email": "john@example.com",
      "classId": "class_id",
      "grade": "5",
      "roll": "5"
    },
    {
      "id": "student_2_id",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "classId": "class_id_2",
      "grade": "3",
      "roll": "10"
    }
  ],
  "message": "Found 2 student(s)",
  "count": 2
}
```

#### Get Student Details

**Endpoint:** `POST /api/ai/parent`

**Purpose:** Get detailed information about a specific student.

**Request:**
```json
{
  "studentId": "student_id",
  "parentId": "parent_id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "student_id",
    "name": "John Doe",
    "email": "john@example.com",
    "classId": "class_id",
    "grade": "5",
    "roll": "5",
    "address": "123 Main St",
    "bloodGroup": "O+",
    "birthday": "2015-05-10T00:00:00.000Z",
    "sex": "male",
    "profilePic": "url_to_pic"
  },
  "message": "Student details retrieved successfully"
}
```

---

## Query Examples

### For Teachers

```
"Show me all students in class 5A"
"What's my teaching schedule?"
"Which subjects am I assigned to teach?"
"Get details of student John in my class"
"List all students in my classes"
```

### For Parents

```
"Show me my children"
"What are John's details?"
"What class is Jane in?"
"Get information about my child"
```

---

## How It Works

### Query Processing Flow

1. **User submits query** (natural language)
   ```
   Example: "What are John's grades and attendance?"
   ```

2. **AI Intent Recognition** (OpenAI GPT-4)
   - Analyzes the query
   - Determines intent (get_student_details, search_students, etc.)
   - Extracts parameters (student name, teacher ID, etc.)
   - Returns structured JSON

3. **Action Execution** (Safe database queries)
   - Validates parameters
   - Executes predefined database queries
   - Returns typed data

4. **Result Summarization** (OpenAI GPT-4)
   - Generates human-friendly summary
   - Returns both raw data and summary

### Security Features

✅ **No Dynamic Code Execution** - Uses explicit functions instead of `eval()`
✅ **Type Safety** - TypeScript interfaces for all data
✅ **Input Validation** - Validates all parameters
✅ **Error Handling** - Graceful error responses
✅ **User Isolation** - Teachers/Parents can only access authorized data

---

## Environment Setup

### Required Environment Variables

```bash
# .env.local
OPENAI_API_KEY=sk-xxx...
MONGODB_URI=mongodb+srv://xxx...
```

### Dependencies

All required packages are already installed:
- `openai` - GPT-4 API
- `mongoose` - MongoDB ODM
- `next` - Framework

---

## Usage Examples

### Frontend Implementation (React)

```typescript
// Example: Teacher querying student list
async function getClassStudents(classId: string, teacherId: string) {
  const response = await fetch('/api/ai/teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId, teacherId }),
  });

  const result = await response.json();
  return result.data; // Array of StudentDetails
}

// Example: Parent using natural language
async function askAI(query: string, userId: string) {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, userId }),
  });

  const result = await response.json();
  return result; // { success, data, message, summary }
}
```

### cURL Examples

```bash
# Get all students in a class
curl -X POST http://localhost:3000/api/ai/teacher \
  -H "Content-Type: application/json" \
  -d '{"classId": "class_id", "teacherId": "teacher_id"}'

# Natural language query
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me student John details", "userId": "user_id"}'

# Get parent's students
curl -X GET "http://localhost:3000/api/ai/parent?parentId=parent_id"

# Get teacher's schedule
curl -X GET "http://localhost:3000/api/ai/teacher?teacherId=teacher_id"
```

---

## Available Query Functions

### Core Data Fetchers

| Function | Purpose | Parameters |
|----------|---------|-----------|
| `getStudentDetails()` | Get a student's full details | `studentId: string` |
| `getClassStudents()` | Get all students in a class | `classId: string` |
| `getTeacherSchedule()` | Get teacher's schedule | `teacherId: string` |
| `searchStudents()` | Search students by name/class | `query: string`, `searchBy: 'name' \| 'class'` |
| `getStudentsByParentId()` | Get parent's children | `parentId: string` |
| `getTeacherByUserId()` | Get teacher info | `userId: string` |

### Query Processor Functions

| Function | Purpose | Parameters |
|----------|---------|-----------|
| `processAIQuery()` | Process natural language query | `userQuery: string` |
| `summarizeData()` | Generate friendly summary | `data: any` |

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common errors:
- `"Query is required"` - Empty query parameter
- `"Teacher ID is required"` - Missing required parameter
- `"Teacher not found"` - Database record doesn't exist
- `"Could not understand your query"` - AI couldn't parse intent

---

## Future Enhancements

- [ ] Real-time notifications when students are absent
- [ ] Performance analytics and trend analysis
- [ ] Voice query support
- [ ] Multi-language support
- [ ] Advanced filtering and sorting
- [ ] Attendance tracking integration
- [ ] Grade prediction using AI
- [ ] Behavioral analysis and recommendations

---

## Testing

### Test with REST Client

Create a `test-ai-query.rest` file:

```rest
### Get Teacher Schedule
GET http://localhost:3000/api/ai/teacher?teacherId=65a123abc456

### Get Class Students
POST http://localhost:3000/api/ai/teacher
Content-Type: application/json

{
  "classId": "65a456def789",
  "teacherId": "65a123abc456"
}

### Natural Language Query
POST http://localhost:3000/api/ai/query
Content-Type: application/json

{
  "query": "Show me all students in class 5A",
  "userId": "65a123abc456"
}

### Get Parent's Students
GET http://localhost:3000/api/ai/parent?parentId=65a789ghi012

### Get Student Details
POST http://localhost:3000/api/ai/parent
Content-Type: application/json

{
  "studentId": "65a333xyz789",
  "parentId": "65a789ghi012"
}
```

---

## Support

For questions or issues:
1. Check the endpoint responses and error messages
2. Verify OpenAI API key is set correctly
3. Ensure MongoDB connection is working
4. Check server logs for detailed error information
