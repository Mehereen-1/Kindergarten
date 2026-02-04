# Profile Management System

## Overview
Complete profile management system for all roles with permission-based access and editing capabilities.

---

## Features by Role

### Admin
- **My Profile**: View and edit own profile information
- **Manage Users**: Search and manage all users in the system
  - View any user's profile
  - Edit any user's profile completely
  - Search by name, email, or ID

### Teachers
- **My Profile**: View and edit own profile
  - Can edit: name, email, phone, address, blood group, DOB, gender
  - Cannot edit: role, password (change via settings)

### Parents
- **My Profile**: View and edit own profile
  - Same fields as teachers
- **Child's Profile**: View and edit child's information
  - **Can edit**: name, email, phone, address, blood group, DOB, gender
  - **Cannot edit**: grade, roll number, class (these are read-only)
  - Can manage multiple children with selector

---

## API Endpoints

### GET `/api/profile/get`
Fetch profile information with permission checking.

**Query Parameters:**
- `userId` (required): Current user's ID
- `targetId` (optional): User to view profile of
- `childId` (optional): Student/child to view

**Response:**
```json
{
  "profile": { ...user data },
  "profileType": "user" | "student",
  "isOwnProfile": boolean,
  "canEdit": boolean
}
```

**Permissions:**
- Own profile: Always allowed
- Admin viewing others: Always allowed
- Parent viewing child: Only if childId matches their child

---

### PUT `/api/profile/update`
Update profile information with restrictions.

**Request Body:**
```json
{
  "targetId": "user_id",
  "childId": "child_id (optional)",
  "profileType": "user" | "student",
  "updates": {
    "name": "New Name",
    "email": "newemail@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "bloodGroup": "O+",
    "birthday": "2015-01-01",
    "sex": "male"
  }
}
```

**Restrictions:**
- **Parents editing student profiles**: Cannot change grade, roll, classId, or assignment fields
- **Users editing own profile**: Cannot change password, role, or password expiry
- **Admins**: No restrictions (except password requires separate endpoint)

---

### GET `/api/parent/children`
Get all children for a parent.

**Query Parameters:**
- `parentId` (required): Parent's user ID

**Response:**
```json
{
  "children": [
    {
      "_id": "student_id",
      "name": "Child Name",
      "email": "child@school.com",
      "grade": "KG-A",
      "roll": "1",
      "address": "...",
      "bloodGroup": "...",
      "birthday": "...",
      "sex": "..."
    }
  ]
}
```

---

### GET `/api/admin/users`
Get all users in the system (admin only).

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "Name",
      "email": "email@example.com",
      "role": "admin" | "teacher" | "parent",
      "phone": "...",
      "address": "...",
      "bloodGroup": "...",
      "birthday": "...",
      "sex": "..."
    }
  ]
}
```

---

## Pages

### Admin
- `/admin/profile` - My profile + manage all users

### Teacher
- `/teacher/profile` - My profile

### Parent
- `/parent/profile` - My profile
- `/parent/child-profile` - View and edit child's profile with multi-child support

---

## UI Components

### ProfileView (`src/app/components/ProfileView.tsx`)
Reusable profile viewing/editing component.

**Props:**
```tsx
interface ProfileViewProps {
  userId?: string;           // Current user ID
  targetId?: string;         // Profile to view (optional)
  childId?: string;          // Child's ID for student profiles
  profileType?: 'user' | 'student';
  onUpdate?: (profile: ProfileData) => void;
}
```

**Features:**
- Form validation
- Field-level error display
- Restricted field warnings
- Auto-save with success feedback
- Read-only fields for restricted content

---

## Field Management

### User Profile Fields
- Name (required)
- Email (required, validated)
- Phone (optional, 10+ digits)
- Address (optional)
- Blood Group (optional)
- Date of Birth (optional)
- Gender (optional)

### Student Profile Fields
(Same as above, plus read-only fields):
- Grade (read-only for parents)
- Roll Number (read-only for parents)
- Class ID (read-only for parents)

---

## Permission Rules

| Action | Admin | Teacher | Parent (Own) | Parent (Child) |
|--------|-------|---------|-------------|----------------|
| View own profile | ✅ | ✅ | ✅ | N/A |
| Edit own profile | ✅ | ✅ | ✅ | N/A |
| View other user | ✅ | ❌ | ❌ | N/A |
| Edit other user | ✅ | ❌ | ❌ | N/A |
| View child profile | N/A | N/A | N/A | ✅ |
| Edit child profile | N/A | N/A | N/A | ✅ (restricted) |
| Change child grade | N/A | N/A | N/A | ❌ |
| Change child roll | N/A | N/A | N/A | ❌ |
| Change child class | N/A | N/A | N/A | ❌ |

---

## Navigation

### Parent Navigation
- Menu: Profile → `/parent/profile`
- Menu: Settings → `/parent/settings`
- TopBar Dropdown: My Profile → `/parent/profile`
- TopBar Dropdown: Child's Profile → `/parent/child-profile`
- TopBar Dropdown: Settings → `/parent/settings`

### Teacher Navigation
- Menu: Profile → `/teacher/profile`
- Menu: Settings → `/teacher/settings`
- TopBar Dropdown: My Profile → `/teacher/profile`
- TopBar Dropdown: Settings → `/teacher/settings`

### Admin Navigation
- Menu: Profile → `/admin/profile` (with manage users tab)

---

## Testing Checklist

- [ ] Admin can view own profile
- [ ] Admin can search and view any user
- [ ] Admin can edit any user's information
- [ ] Teacher can view and edit own profile
- [ ] Parent can view and edit own profile
- [ ] Parent can view child's profile
- [ ] Parent can edit child's name, email, phone, address, blood group, DOB, gender
- [ ] Parent cannot edit child's grade or roll number
- [ ] Form validation works (email format, phone digits)
- [ ] Restricted fields show warning message
- [ ] Navigation links work from menu and topbar
- [ ] Error messages display correctly
- [ ] Success messages display after save

---

## Implementation Details

### Cookie-based Authorization
- User role stored in `user` cookie
- Permission checks happen on API endpoints
- Admin role allows full access
- Parent role limited to own profile + child profiles

### Validation
- Email: Standard email format validation
- Phone: Minimum 10 digits
- Name: Required, non-empty
- Custom field-level error messages

### Data Models
- Uses existing `User` model for admin/teacher/parent profiles
- Uses existing `Student` model for child profiles
- Extends both models with profile management capabilities

---

## Future Enhancements

- Profile picture upload
- Activity history/audit logs
- Bulk user management for admin
- Export user data
- Profile completion percentage
- Email verification system
- Phone number formatting
- Address autocomplete
