# Backend Implementation - Setup Guide

## 🟢 STEP 1: Install Dependencies

Run this command in your terminal:

```bash
cd "C:\system project\Kindergarten\next-kindergarten\next-dashboard-ui"
npm install mongoose
```

## 🔵 STEP 2: Configure MongoDB Connection

Edit `.env.local` file and add your MongoDB connection string:

```
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.mongodb.net/kindergarten?retryWrites=true&w=majority
```

To get your MongoDB connection string:
1. Go to MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
2. Click "Connect" on your Cluster0
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<username>`, `<password>`, and `kindergarten` with your database name

## 🟠 STEP 3: Available API Endpoints

### ADMIN APIs
- `POST /api/admin/teachers` - Create teacher
- `GET /api/admin/parents` - Get all parents
- `POST /api/admin/parents` - Create parent
- `GET /api/admin/students` - Get all students
- `POST /api/admin/students` - Create student
- `PUT /api/admin/students/[id]` - Update student
- `DELETE /api/admin/students/[id]` - Delete student
- `GET /api/admin/classes` - Get all classes
- `POST /api/admin/classes` - Create class
- `GET /api/admin/events` - Get all events
- `POST /api/admin/events` - Create event
- `GET /api/admin/notices` - Get all notices
- `POST /api/admin/notices` - Create notice

### TEACHER APIs
- `GET /api/teacher/classes?teacherId=xxx` - Get my classes
- `GET /api/teacher/attendance?studentId=xxx` - Get attendance
- `POST /api/teacher/attendance` - Mark attendance
- `GET /api/teacher/results?studentId=xxx` - Get results
- `POST /api/teacher/results` - Add result
- `GET /api/teacher/messages?to=xxx` - Get messages
- `POST /api/teacher/messages` - Send message

### PARENT APIs
- `GET /api/parent/child?parentId=xxx` - Get my child
- `GET /api/parent/attendance?studentId=xxx` - Get attendance
- `GET /api/parent/results?studentId=xxx` - Get results
- `GET /api/parent/events` - Get all events
- `GET /api/parent/notices` - Get notices
- `GET /api/parent/messages?parentId=xxx` - Get messages

## 🟡 STEP 4: Test APIs with Postman/Thunder Client

After installing mongoose and setting up MongoDB:

1. Restart the dev server:
```bash
npm run dev
```

2. Test creating a teacher:
```
POST http://localhost:3000/api/admin/teachers
{
  "name": "Mrs. Sharma",
  "email": "sharma@school.com",
  "phone": "9876543210"
}
```

3. Test creating a parent:
```
POST http://localhost:3000/api/admin/parents
{
  "name": "Mr. Singh",
  "email": "singh@email.com",
  "phone": "8765432109"
}
```

4. Test creating a student:
```
POST http://localhost:3000/api/admin/students
{
  "name": "Arjun Singh",
  "class": "KG-A",
  "section": "A",
  "rollNumber": 15,
  "parentId": "PARENT_ID_FROM_PREVIOUS_RESPONSE",
  "teacherId": "TEACHER_ID_FROM_FIRST_RESPONSE"
}
```

## ✅ What You Need to Do Right Now

1. **Install Mongoose**: Run `npm install mongoose`
2. **Set MongoDB URI**: Update `.env.local` with your connection string
3. **Restart server**: Run `npm run dev`
4. **Test with Postman**: Create sample data using the endpoints above

Once you confirm these work, we'll connect the UI to these APIs!
