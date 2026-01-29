# AI Query System - Troubleshooting Guide

## Common Issues & Solutions

### 1. API Endpoint Errors

#### Error: `405 Method Not Allowed`
**Problem**: Using wrong HTTP method
**Solution**:
- General query: Use `POST /api/ai/query`
- Teacher schedule: Use `GET /api/ai/teacher?teacherId=xxx`
- Teacher class students: Use `POST /api/ai/teacher`
- Parent students: Use `GET /api/ai/parent?parentId=xxx`
- Student details: Use `POST /api/ai/parent`

#### Error: `400 Bad Request - Query is required`
**Problem**: Not passing query parameter
**Solution**:
```javascript
// ❌ Wrong
fetch('/api/ai/query', {
  body: JSON.stringify({ userId: 'xxx' })
});

// ✅ Correct
fetch('/api/ai/query', {
  body: JSON.stringify({ 
    query: 'Show me students',
    userId: 'xxx' 
  })
});
```

#### Error: `400 Bad Request - User ID is required`
**Problem**: Missing userId in request
**Solution**:
```javascript
// Always include userId
const result = await fetch('/api/ai/query', {
  method: 'POST',
  body: JSON.stringify({
    query: 'Your query',
    userId: currentUserId  // Get from auth context
  })
});
```

#### Error: `500 Internal Server Error`
**Problem**: Server-side issue
**Solutions**:
1. Check `.env.local` has valid API keys
2. Check MongoDB connection is working
3. Check OpenAI API key is valid
4. Check server logs for details
5. Verify all models exist in database

---

### 2. Environment Setup Issues

#### Error: `Please define the MONGODB_URI environment variable`
**Problem**: Missing MongoDB connection string
**Solution**:
1. Create `.env.local` in project root
2. Add: `MONGODB_URI=mongodb+srv://user:password@host/dbname`
3. Restart development server
4. Verify: `npm run dev`

#### Error: `OpenAI API Key not found`
**Problem**: Missing OpenAI API key
**Solution**:
1. Get key from https://platform.openai.com/api-keys
2. Add to `.env.local`: `OPENAI_API_KEY=sk-...`
3. Restart server
4. Test with API endpoint

#### Error: `401 Unauthorized - Invalid API Key`
**Problem**: OpenAI API key is invalid or expired
**Solution**:
1. Verify key is not truncated
2. Check key hasn't been revoked
3. Get a fresh key from OpenAI dashboard
4. Update `.env.local`
5. Restart development server

---

### 3. Database Issues

#### Error: `Teacher not found`
**Problem**: Using invalid teacher ID
**Solution**:
1. Verify teacher ID exists in database
2. Check it's a valid MongoDB ObjectId format
3. Ensure teacher has TeacherProfile record
4. Test with a known good ID first

#### Error: `Student not found`
**Problem**: Using invalid student ID
**Solution**:
1. Get actual student ID from database
2. Verify format: `65a123abc456` (MongoDB ObjectId)
3. Ensure student exists in Student collection
4. Check parent relationship if checking parent's student

#### Error: `Class not found`
**Problem**: Class ID doesn't exist
**Solution**:
1. Verify class ID in database
2. Check Class collection has the record
3. Verify teacher is assigned to class
4. Use correct ObjectId format

#### Connection Timeout
**Problem**: MongoDB connection failing
**Solution**:
1. Check MongoDB Atlas status
2. Verify connection string is correct
3. Check IP whitelist includes your IP
4. Check network connectivity
5. Restart the dev server

---

### 4. OpenAI/AI Issues

#### Error: `Could not understand your query`
**Problem**: AI can't parse natural language query
**Solutions**:
1. Use clearer, simpler language
2. Be more specific about what you want
3. Try rephrasing the question
4. Examples of good queries:
   - "Show me all students in class 5A"
   - "What's my teaching schedule?"
   - "Get details of student John"

#### Error: `Invalid API response`
**Problem**: OpenAI API returning unexpected format
**Solutions**:
1. Check OpenAI API status
2. Verify `gpt-4o-mini` model is available
3. Check API key has proper permissions
4. Check API rate limits aren't exceeded
5. Look at server logs for full error

#### Slow Responses
**Problem**: API taking too long
**Solutions**:
1. OpenAI API might be slow - wait 5-10 seconds
2. MongoDB query might be slow - check indexes
3. Network latency - try from different location
4. Check server resources (CPU, memory)
5. Consider caching frequent queries

#### Model Rate Limit Exceeded
**Problem**: Making too many API calls
**Solutions**:
1. Implement caching for common queries
2. Add rate limiting to endpoints
3. Use batched requests
4. Upgrade OpenAI plan if needed
5. Implement exponential backoff retry

---

### 5. Data Validation Issues

#### Error: `Invalid student ID format`
**Problem**: ID not in MongoDB ObjectId format
**Solution**:
```javascript
// Good format examples
const validIds = [
  '65a123abc456def789012345',  // 24 hex characters
  new ObjectId('65a123abc456def789012345'),
];

// Bad format examples
const invalidIds = [
  'john',           // String name
  '123',            // Too short
  'student_1',      // Wrong format
];
```

#### Error: `Missing required fields`
**Problem**: Request missing required parameters
**Solution**:
```javascript
// ❌ Incomplete
{ classId: '65a456def789' }

// ✅ Complete
{ 
  classId: '65a456def789',
  teacherId: '65a123abc456'
}
```

---

### 6. React Hook Issues

#### Hook Returns Empty Data
**Problem**: Data not fetching
**Solutions**:
```javascript
const { data, loading, error } = useAIQuery();

// Check these in order:
1. if (loading) console.log('Still fetching...');
2. if (error) console.log('Error:', error);
3. if (data) console.log('Data:', data);
```

#### Hook State Not Updating
**Problem**: Component not re-rendering
**Solutions**:
1. Ensure you're using the hook correctly
2. Check that function call completes before reading state
3. Use async/await properly
4. Check component is not in strict mode issues

#### Multiple Hook Instances
**Problem**: Multiple useAIQuery() calls interfere
**Solution**:
```javascript
// ❌ Wrong - each creates separate state
const hook1 = useAIQuery();
const hook2 = useAIQuery();

// ✅ Correct - one instance, destructure what you need
const { data, executeQuery, getTeacherSchedule } = useAIQuery();
```

---

### 7. Frontend Integration Issues

#### Endpoint Not Found (404)
**Problem**: API route not created properly
**Solutions**:
1. Check file is at correct path:
   - `src/app/api/ai/query/route.ts`
   - `src/app/api/ai/teacher/route.ts`
   - `src/app/api/ai/parent/route.ts`
2. Verify folder structure is correct
3. Restart dev server after creating files
4. Check file exports properly

#### CORS Error
**Problem**: Frontend can't access API
**Solution**: In Next.js, this usually doesn't happen, but if it does:
```typescript
// Add to route.ts if needed
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

#### TypeScript Compilation Errors
**Problem**: ts files not compiling
**Solutions**:
1. Ensure TypeScript syntax is correct
2. Check all imports exist
3. Verify type definitions imported
4. Run `npx tsc --noEmit` to check
5. Check VS Code problems panel

---

### 8. Permission/Authorization Issues

#### Error: `Unauthorized - User not authenticated`
**Problem**: User ID invalid or session expired
**Solution**:
1. Verify user is logged in
2. Check user ID is valid
3. Implement auth context check
4. Refresh session/token if needed

#### Parent Accessing Student Not Theirs
**Problem**: Parent trying to access other parent's child
**Solution**: Implement authorization check:
```typescript
// In parent endpoint
if (parentId && student.parentId !== parentId) {
  return NextResponse.json(
    { success: false, message: 'Not authorized' },
    { status: 403 }
  );
}
```

#### Teacher Accessing Class Not Theirs
**Problem**: Teacher querying another teacher's class
**Solution**: Add verification:
```typescript
// In teacher endpoint
const classRecord = await Class.findById(classId);
if (classRecord.teacherId !== teacherId) {
  return NextResponse.json(
    { success: false, message: 'Not authorized' },
    { status: 403 }
  );
}
```

---

### 9. Performance Issues

#### Queries Are Slow
**Problem**: Database queries taking too long
**Solutions**:
1. Add MongoDB indexes for frequently queried fields
2. Limit result sets with pagination
3. Use database projections to fetch only needed fields
4. Cache common queries
5. Consider query optimization

#### Memory Usage High
**Problem**: Large result sets causing memory issues
**Solutions**:
1. Implement pagination for large datasets
2. Stream responses instead of loading all at once
3. Limit class size to reasonable number (100 students max)
4. Implement query result size limits

---

### 10. Testing Issues

#### REST Client Extension Not Working
**Problem**: VS Code REST Client not executing
**Solutions**:
1. Install "REST Client" extension by Huachao Mao
2. Save file as `.rest` extension
3. Click "Send Request" link above request
4. Check port (default 3000)
5. Ensure dev server is running

#### cURL Commands Not Working
**Problem**: Terminal commands failing
**Solutions**:
```bash
# Make sure dev server is running
npm run dev

# Test basic endpoint
curl -X GET http://localhost:3000/api/ai/teacher?teacherId=65a123abc456

# With error details
curl -v -X POST http://localhost:3000/api/ai/query ...

# On Windows, escape JSON properly
curl -X POST http://localhost:3000/api/ai/query ^
  -H "Content-Type: application/json" ^
  -d "{\"query\": \"test\", \"userId\": \"xxx\"}"
```

---

### 11. Quick Diagnostic Checklist

When something isn't working, check in this order:

- [ ] Dev server running? (`npm run dev`)
- [ ] .env.local file exists?
- [ ] MONGODB_URI set correctly?
- [ ] OPENAI_API_KEY set correctly?
- [ ] Using correct HTTP methods?
- [ ] Required parameters included?
- [ ] Using valid IDs from database?
- [ ] Database has required collections?
- [ ] API endpoint file created at right path?
- [ ] TypeScript compiling without errors?
- [ ] No typos in field names?
- [ ] Network connectivity OK?
- [ ] API keys haven't expired?

---

### 12. Getting Help

If you're still stuck:

1. **Check Documentation**
   - `AI_QUICK_REFERENCE.md` - Quick solutions
   - `AI_QUERY_GUIDE.md` - Detailed docs
   - `AI_IMPLEMENTATION.md` - How it works

2. **Test with REST Client**
   - Use `test-ai-api.rest` to test endpoints
   - Verify API is working first

3. **Check Logs**
   - Look at terminal where `npm run dev` is running
   - Check browser console (F12)
   - Check VS Code problems panel

4. **Verify Setup**
   - Ensure all files created in correct locations
   - Verify environment variables
   - Check Node modules installed

5. **Test Incrementally**
   - Start with simple GET request
   - Move to POST requests
   - Test with real data
   - Debug with console.log()

---

## 📝 Debugging Tips

### Add Logging
```typescript
// In queryProcessor.ts
console.log('Query received:', userQuery);
console.log('Intent parsed:', intent);
console.log('Executing action:', intent.action);
console.log('Query result:', result);
```

### Use Browser DevTools
```javascript
// In React component
const { data, error, loading } = useAIQuery();

useEffect(() => {
  console.log('State updated:', { data, error, loading });
}, [data, error, loading]);
```

### API Response Inspection
```javascript
const response = await fetch('/api/ai/query', {...});
const json = await response.json();
console.log('Full response:', json);
console.log('Status:', response.status);
console.log('Headers:', response.headers);
```

---

## 🎯 Most Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| API not found | Restart dev server after creating files |
| Missing API key | Check `.env.local` has `OPENAI_API_KEY` |
| No database connection | Verify `MONGODB_URI` in `.env.local` |
| "Query is required" error | Always pass `query` param |
| "User not found" error | Use valid MongoDB ObjectId |
| Slow responses | Could be OpenAI - wait 10 seconds |
| Type errors | Reinstall node_modules: `npm install` |

---

Good luck! You've got this! 🚀
