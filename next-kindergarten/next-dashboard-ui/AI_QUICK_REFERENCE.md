# AI Query System - Quick Reference

## 🚀 Quick Start

### For Teachers

```typescript
import { useAIQuery } from '@/hooks/useAIQuery';

function TeacherDashboard() {
  const { data, loading, error, getTeacherSchedule, getClassStudents } = useAIQuery();

  // Get your schedule
  const handleGetSchedule = async () => {
    await getTeacherSchedule(teacherId);
  };

  // Get students in your class
  const handleGetStudents = async () => {
    await getClassStudents(classId, teacherId);
  };

  return (
    // ... your UI
  );
}
```

### For Parents

```typescript
import { useAIQuery } from '@/hooks/useAIQuery';

function ParentDashboard() {
  const { data, loading, error, getParentStudents, getStudentDetails } = useAIQuery();

  // Get all your children
  const handleGetChildren = async () => {
    await getParentStudents(parentId);
  };

  // Get specific child's details
  const handleGetChildDetails = async () => {
    await getStudentDetails(studentId, parentId);
  };

  return (
    // ... your UI
  );
}
```

### Natural Language Queries (Both)

```typescript
const { executeQuery } = useAIQuery();

// Just ask naturally!
await executeQuery("What are John's details?", userId);
await executeQuery("Show me all students in class 5A", userId);
await executeQuery("What's my schedule?", userId);
```

---

## 📋 API Endpoints

### General AI Query
```
POST /api/ai/query
Body: { "query": "string", "userId": "string" }
```

### Teacher Endpoints
```
GET  /api/ai/teacher?teacherId=xxx
POST /api/ai/teacher
Body: { "classId": "string", "teacherId": "string" }
```

### Parent Endpoints
```
GET  /api/ai/parent?parentId=xxx
POST /api/ai/parent
Body: { "studentId": "string", "parentId": "string" }
```

---

## 🎯 Available Functions

| Function | Use Case |
|----------|----------|
| `executeQuery(query, userId)` | Natural language query |
| `getTeacherSchedule(teacherId)` | Get teacher's classes & schedule |
| `getClassStudents(classId, teacherId)` | Get students in a class |
| `getParentStudents(parentId)` | Get parent's children |
| `getStudentDetails(studentId, parentId)` | Get detailed student info |

---

## 💾 Data Structures

### StudentDetails
```typescript
{
  id: string;
  name: string;
  email?: string;
  phone?: string;
  classId: string;
  grade?: string;
  roll?: string;
  address?: string;
  bloodGroup?: string;
  birthday?: string;
  sex?: string;
  profilePic?: string;
}
```

### TeacherSchedule
```typescript
{
  id: string;
  name: string;
  email?: string;
  subjects?: string[];
  classSchedule?: Array<{
    className: string;
    grade: string;
    schedule?: string;
  }>;
  qualification?: string;
  joiningDate?: string;
  photo?: string;
}
```

---

## 🔍 Query Examples

### Teachers Can Ask
- "Show me all students in my classes"
- "What's my teaching schedule?"
- "Which students are in class 5A?"
- "Get details of student John"
- "List all students I teach"
- "What subjects am I assigned?"

### Parents Can Ask
- "Show me my children"
- "What's John's class and grade?"
- "Get details of my child Jane"
- "Show me information about my student"
- "What class is my son in?"

---

## ⚙️ Configuration

Ensure these are set in `.env.local`:
```
OPENAI_API_KEY=sk-xxx...
MONGODB_URI=mongodb+srv://xxx...
```

---

## 🧪 Testing

Add example query to your page:
```typescript
import AIQueryExample from '@/components/AIQueryExample';

export default function TestPage() {
  return <AIQueryExample />;
}
```

Or test with REST client:
```rest
POST http://localhost:3000/api/ai/query
Content-Type: application/json

{
  "query": "Show me all students",
  "userId": "your_user_id"
}
```

---

## 🛡️ Security Notes

- ✅ Teachers can only see their own students
- ✅ Parents can only see their own children
- ✅ No code execution (no eval)
- ✅ Type-safe database queries
- ✅ Input validation on all endpoints

---

## 📁 File Structure

```
src/
  lib/ai/
    ├── dataFetcher.ts      # Database queries
    └── queryProcessor.ts   # AI intent & execution
  app/api/ai/
    ├── query/route.ts      # General endpoint
    ├── teacher/route.ts    # Teacher endpoint
    └── parent/route.ts     # Parent endpoint
  hooks/
    └── useAIQuery.ts       # React hook
  components/
    └── AIQueryExample.tsx  # Example component
```

---

## 🚨 Common Issues

**Error: "Query is required"**
→ Make sure you're passing a non-empty query string

**Error: "User ID is required"**
→ Pass userId from your authentication context

**Error: "Teacher not found"**
→ Verify the teacherId exists in database

**Error: "Could not understand your query"**
→ Try rephrasing more naturally or use specific functions

---

## 📚 Full Documentation

See `AI_QUERY_GUIDE.md` for complete documentation with examples.
