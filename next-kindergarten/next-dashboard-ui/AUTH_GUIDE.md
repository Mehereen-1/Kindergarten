# Authentication & Authorization Guide

## Overview

This application includes a comprehensive authentication system with role-based access control (RBAC) using middleware and cookies.

## Features

### 1. Sign-In System
- **Location**: `/sign-in`
- **API**: `POST /api/auth/signin`
- Validates email and password against the database
- Detects first-time login (auto-generated passwords for new teachers)
- Sets authentication cookies upon successful sign-in

### 2. Password Management
- **Change Password Page**: `/change-password`
- **API**: `POST /api/auth/change-password`
- **First Login Flow**: New teachers with auto-generated passwords are redirected to change password before accessing their dashboard
- **Subsequent Changes**: Users can change their password from their dashboard

### 3. Role-Based Access Control (RBAC)
Middleware automatically enforces role-based access control with three roles:

| Role | Dashboard | Routes | Capabilities |
|------|-----------|--------|--------------|
| **Admin** | `/dashboard/admin` | `/api/admin/*` | Full system access, bulk imports, user management |
| **Teacher** | `/teacher` | `/api/teacher/*` | Class management, attendance, announcements |
| **Parent** | `/parent` | `/api/parent/*` | View child attendance, messages, notices |

### 4. Middleware Protection
- **File**: `src/middleware.ts`
- Automatically checks user authentication on protected routes
- Enforces role-based route access
- Redirects unauthorized users to sign-in page
- Automatically redirects users trying to access routes for different roles

## User Flow

### New Teacher (Auto-Generated Password)
1. Admin imports teachers via CSV
2. Teacher receives email with auto-generated password
3. Teacher navigates to `/sign-in`
4. System detects `firstLogin` flag
5. Redirects to `/change-password?userId=XXX&firstLogin=true`
6. Teacher sets new password
7. Redirected to `/teacher` dashboard

### Existing User
1. User goes to `/sign-in`
2. Enters credentials
3. Successfully authenticated
4. Redirected to role-specific dashboard:
   - Admin → `/dashboard/admin`
   - Teacher → `/teacher`
   - Parent → `/parent`

### Sign Out
1. User clicks "Sign Out"
2. Calls `POST /api/auth/signout`
3. Cookies are cleared
4. Redirected to `/`

## Cookie Structure

### User Cookie
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "teacher"
}
```

### Role Cookie
```
userRole=teacher
```

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in with email and password
- `POST /api/auth/signout` - Sign out (clears cookies)
- `POST /api/auth/change-password` - Change password

### Response Format
```json
{
  "success": true,
  "message": "Sign in successful",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "teacher",
    "isFirstLogin": false
  },
  "redirectToChangePassword": false
}
```

## Using Authentication Hooks

### useAuth Hook
```typescript
import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      Welcome, {user.name}!
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### useRequireAuth Hook
```typescript
import { useRequireAuth } from '@/hooks/useAuth';

export function TeacherOnlyComponent() {
  const { user, loading } = useRequireAuth('teacher');

  if (loading) return <div>Loading...</div>;

  return <div>Teacher Dashboard</div>;
}
```

## Controller Functions

### Sign In
```typescript
import { signIn } from '@/lib/controllers/userController';

const result = await signIn('teacher@school.com', 'password123');
```

### Change Password (First Login)
```typescript
import { changePasswordFirstLogin } from '@/lib/controllers/userController';

const result = await changePasswordFirstLogin(userId, newPassword);
```

### Change Password (Existing)
```typescript
import { changePassword } from '@/lib/controllers/userController';

const result = await changePassword(userId, currentPassword, newPassword);
```

## Protected Routes

### Public Routes
- `/` - Homepage
- `/sign-in` - Sign in page

### Protected Routes (Require Authentication)
- `/dashboard/admin` - Admin dashboard
- `/teacher` - Teacher dashboard
- `/parent` - Parent dashboard
- `/change-password` - Change password page
- `/api/admin/*` - Admin API routes
- `/api/teacher/*` - Teacher API routes
- `/api/parent/*` - Parent API routes

## Middleware Flow

```
Request → Middleware Check
    ↓
Is public route? → Allow
    ↓
Is user authenticated? → Redirect to /sign-in
    ↓
Does role match route? → Redirect to role dashboard
    ↓
Allow Access
```

## Security Considerations

1. **Password Hashing**: All passwords are hashed using bcrypt (salt rounds: 10)
2. **Cookie Security**: Consider using HttpOnly cookies in production
3. **First Login**: Users must change auto-generated passwords before full access
4. **Middleware**: Server-side route protection with middleware
5. **CSRF**: Implement CSRF protection on state-changing operations

## Future Enhancements

1. Implement JWT tokens for better security
2. Add refresh token mechanism
3. Implement session management
4. Add multi-factor authentication (MFA)
5. Add rate limiting for sign-in attempts
6. Add activity logging and audit trails
7. Implement HttpOnly cookies for enhanced security