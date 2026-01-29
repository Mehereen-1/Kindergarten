# Controllers - Complete Documentation

All controllers follow consistent patterns for CRUD operations and include proper error handling.

## 📁 Controller Files

### 1. **userController.ts**
User authentication and management

**Functions:**
- `createUser(input)` - Create new user
- `getUserById(userId)` - Get user by ID
- `getUserByEmail(email)` - Get user by email
- `getAllUsers(role?)` - Get all users, optionally filtered by role
- `updateUser(userId, input)` - Update user details
- `deleteUser(userId)` - Delete user
- `verifyPassword(email, password)` - Verify user password

**Example:**
```typescript
import { createUser } from '@/lib/controllers/userController';

const result = await createUser({
  email: 'teacher@school.com',
  password: 'securePassword',
  role: 'TEACHER'
});
```

---

### 2. **teacherController.ts**
Teacher management and class assignments

**Functions:**
- `createTeacher(input)` - Create teacher profile
- `getTeacherById(teacherId)` - Get teacher details
- `getTeacherByUserId(userId)` - Get teacher by user ID
- `getAllTeachers()` - Get all teachers
- `updateTeacher(teacherId, input)` - Update teacher info
- `deleteTeacher(teacherId)` - Delete teacher
- `addClassToTeacher(teacherId, classId)` - Assign class to teacher
- `removeClassFromTeacher(teacherId, classId)` - Remove class assignment
- `getTeacherClasses(teacherId)` - Get all classes taught by teacher

**Example:**
```typescript
import { createTeacher } from '@/lib/controllers/teacherController';

const result = await createTeacher({
  userId: 'user_id',
  name: 'Mrs. Smith',
  phone: '123-456-7890',
  photo: 'url_to_photo'
});
```

---

### 3. **parentController.ts**
Parent management and child assignments

**Functions:**
- `createParent(input)` - Create parent profile
- `getParentById(parentId)` - Get parent details
- `getParentByUserId(userId)` - Get parent by user ID
- `getAllParents()` - Get all parents
- `updateParent(parentId, input)` - Update parent info
- `deleteParent(parentId)` - Delete parent
- `addChildToParent(parentId, studentId)` - Link student to parent
- `removeChildFromParent(parentId, studentId)` - Remove student link
- `getParentChildren(parentId)` - Get all children of parent

**Example:**
```typescript
import { createParent } from '@/lib/controllers/parentController';

const result = await createParent({
  userId: 'user_id',
  name: 'John Doe',
  phone: '123-456-7890',
  address: '123 Main St'
});
```

---

### 4. **classController.ts**
Class management

**Functions:**
- `createClass(input)` - Create new class
- `getClassById(classId)` - Get class details
- `getAllClasses()` - Get all classes
- `getClassesByTeacherId(teacherId)` - Get classes taught by teacher
- `updateClass(classId, input)` - Update class info
- `deleteClass(classId)` - Delete class (must have no students)
- `getClassStudentsCount(classId)` - Get number of students in class

**Example:**
```typescript
import { createClass } from '@/lib/controllers/classController';

const result = await createClass({
  name: 'Nursery A',
  ageGroup: '3-4 years',
  teacherId: 'teacher_id'
});
```

---

### 5. **studentController.ts**
Student management

**Functions:**
- `createStudent(input)` - Create student
- `getStudentById(studentId)` - Get student details
- `getAllStudents()` - Get all students
- `getStudentsByClassId(classId)` - Get students in class
- `getStudentsByParentId(parentId)` - Get students by parent
- `updateStudent(studentId, input)` - Update student info
- `deleteStudent(studentId)` - Delete student
- `searchStudentsByName(name)` - Search students by name
- `getStudentAge(dateOfBirth)` - Calculate student age

**Example:**
```typescript
import { createStudent } from '@/lib/controllers/studentController';

const result = await createStudent({
  name: 'Emma Johnson',
  dateOfBirth: new Date('2020-05-15'),
  parentId: 'parent_id',
  classId: 'class_id',
  photo: 'url_to_photo'
});
```

---

### 6. **attendanceController.ts**
Attendance tracking

**Functions:**
- `createAttendance(input)` - Record attendance
- `getAttendanceById(attendanceId)` - Get attendance record
- `getAttendanceByStudentId(studentId, limit?)` - Get student's attendance records
- `getAttendanceByDateRange(startDate, endDate)` - Get records for date range
- `updateAttendance(attendanceId, input)` - Update attendance record
- `deleteAttendance(attendanceId)` - Delete attendance record
- `getAttendancePercentage(studentId, startDate?, endDate?)` - Calculate attendance percentage
- `bulkCreateAttendance(records)` - Create multiple records at once

**Example:**
```typescript
import { createAttendance } from '@/lib/controllers/attendanceController';

const result = await createAttendance({
  studentId: 'student_id',
  date: new Date(),
  present: true
});
```

---

### 7. **observationController.ts**
Student observations and assessments

**Functions:**
- `createObservation(input)` - Create observation record
- `getObservationById(observationId)` - Get observation
- `getObservationsByStudentId(studentId)` - Get student's observations
- `getObservationsByCategory(studentId, category)` - Get observations by type
- `getAllObservations()` - Get all observations
- `updateObservation(observationId, input)` - Update observation
- `deleteObservation(observationId)` - Delete observation
- `getObservationSummary(studentId)` - Get summary by category

**Categories:** BEHAVIOR, SOCIAL, LANGUAGE, MOTOR_SKILLS, EMOTIONAL

**Example:**
```typescript
import { createObservation } from '@/lib/controllers/observationController';

const result = await createObservation({
  studentId: 'student_id',
  note: 'Shows good social skills with peers',
  category: 'SOCIAL',
  date: new Date()
});
```

---

### 8. **activityController.ts**
Class activities and lessons

**Functions:**
- `createActivity(input)` - Create activity
- `getActivityById(activityId)` - Get activity details
- `getAllActivities()` - Get all activities
- `getActivitiesByClassId(classId)` - Get class activities
- `getActivitiesByDateRange(startDate, endDate)` - Get activities in date range
- `updateActivity(activityId, input)` - Update activity
- `deleteActivity(activityId)` - Delete activity
- `getRecentActivities(limit?)` - Get recent activities

**Example:**
```typescript
import { createActivity } from '@/lib/controllers/activityController';

const result = await createActivity({
  title: 'Art and Craft',
  description: 'Children created paintings',
  classId: 'class_id',
  date: new Date()
});
```

---

### 9. **announcementController.ts**
School announcements and notifications

**Functions:**
- `createAnnouncement(input)` - Create announcement
- `getAnnouncementById(announcementId)` - Get announcement
- `getAllAnnouncements()` - Get all announcements
- `getClassAnnouncements(classId)` - Get class-specific + school-wide announcements
- `getSchoolAnnouncements()` - Get school-wide announcements (classId: null)
- `updateAnnouncement(announcementId, input)` - Update announcement
- `deleteAnnouncement(announcementId)` - Delete announcement
- `getRecentAnnouncements(limit?)` - Get recent announcements

**Example:**
```typescript
import { createAnnouncement } from '@/lib/controllers/announcementController';

const result = await createAnnouncement({
  title: 'Sports Day',
  message: 'Annual sports day on Friday',
  classId: 'class_id' // null for school-wide
});
```

---

### 10. **eventController.ts**
School events and calendar

**Functions:**
- `createEvent(input)` - Create event
- `getEventById(eventId)` - Get event details
- `getAllEvents()` - Get all events
- `getUpcomingEvents(days?)` - Get events in next N days
- `getPastEvents(days?)` - Get events from past N days
- `updateEvent(eventId, input)` - Update event
- `deleteEvent(eventId)` - Delete event
- `searchEventsByTitle(title)` - Search events by name

**Example:**
```typescript
import { createEvent } from '@/lib/controllers/eventController';

const result = await createEvent({
  title: 'Annual Day',
  description: 'School annual celebration',
  eventDate: new Date('2026-03-15')
});
```

---

### 11. **messageController.ts**
Parent-Teacher messaging

**Functions:**
- `createMessage(input)` - Send message
- `getMessageById(messageId)` - Get message details
- `getConversation(userId1, userId2, limit?)` - Get conversation between two users
- `getUserMessages(userId, limit?)` - Get inbox for user
- `getUserSentMessages(userId, limit?)` - Get sent messages
- `deleteMessage(messageId)` - Delete message
- `getUserMessageCount(userId)` - Count unread messages
- `getRecentConversations(userId, limit?)` - Get recent conversations
- `clearConversation(userId1, userId2)` - Delete entire conversation

**Example:**
```typescript
import { createMessage } from '@/lib/controllers/messageController';

const result = await createMessage({
  content: 'Hi, how is Emma doing?',
  senderId: 'parent_user_id',
  receiverId: 'teacher_user_id'
});
```

---

## 📋 Response Format

All controllers return consistent responses:

```typescript
{
  success: boolean;
  message: string;
  data?: any;
  count?: number;
  statusCode: number; // 200, 201, 400, 404, 500
}
```

---

## 🔒 Error Handling

All controllers include try-catch blocks and return appropriate status codes:
- **201** - Created successfully
- **200** - Success
- **400** - Bad request (validation error)
- **404** - Not found
- **500** - Server error

---

## 💡 Usage Patterns

### In API Routes
```typescript
import { createStudent } from '@/lib/controllers/studentController';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await createStudent(body);
  return NextResponse.json(result, { status: result.statusCode });
}
```

### In Server Components
```typescript
import { getStudentsByClassId } from '@/lib/controllers/studentController';

export default async function ClassPage({ classId }) {
  const result = await getStudentsByClassId(classId);
  
  if (!result.success) {
    return <div>Error: {result.message}</div>;
  }

  return (
    <div>
      {result.data.map(student => (
        <div key={student._id}>{student.name}</div>
      ))}
    </div>
  );
}
```

---

## 🎯 Common Workflows

### Create a Student and Link to Parent
```typescript
import { createStudent } from '@/lib/controllers/studentController';
import { addChildToParent } from '@/lib/controllers/parentController';

// Step 1: Create student
const studentResult = await createStudent({
  name: 'Emma',
  dateOfBirth: new Date('2020-01-15'),
  parentId: parentId,
  classId: classId
});

// Step 2: Link to parent (already done in createStudent)
// The parent is already linked automatically
```

### Record Attendance for Class
```typescript
import { bulkCreateAttendance } from '@/lib/controllers/attendanceController';

const records = students.map(student => ({
  studentId: student._id,
  date: new Date(),
  present: student.isPresent
}));

await bulkCreateAttendance(records);
```

### Get Class Overview
```typescript
import { getStudentsByClassId } from '@/lib/controllers/studentController';
import { getClassById } from '@/lib/controllers/classController';
import { getClassStudentsCount } from '@/lib/controllers/classController';

const classData = await getClassById(classId);
const students = await getStudentsByClassId(classId);
const count = await getClassStudentsCount(classId);
```

---

## 📊 Database Relationships

Controllers handle relationships:
- **User** ↔ **Teacher** (1-to-1)
- **User** ↔ **Parent** (1-to-1)
- **Parent** ↔ **Student** (1-to-many)
- **Teacher** ↔ **Class** (1-to-many)
- **Class** ↔ **Student** (1-to-many)
- **Student** ↔ **Attendance** (1-to-many)
- **Student** ↔ **Observation** (1-to-many)
- **User** ↔ **Message** (many-to-many)

All controllers automatically populate related data when appropriate.

---

## ✨ Features

✅ CRUD operations for all entities
✅ Data validation
✅ Relationship management
✅ Pagination support (where applicable)
✅ Search capabilities
✅ Bulk operations (attendance)
✅ Date range queries
✅ Aggregations (attendance %, observation summary)
✅ Consistent error handling
✅ Type-safe responses

---

## 🚀 Ready to Use

All controllers are ready for immediate use in API routes, server components, or other server-side code. Import and use them directly!
