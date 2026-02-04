# Profile Management - Quick Start

## What Was Implemented

A complete profile management system for all user roles (Admin, Teacher, Parent) with:
- View and edit own profiles
- Admin can manage any user's profile
- Parents can manage their child's profile (with restrictions)
- Permission-based access control
- Form validation and error handling

---

## How to Use

### For Parents
1. **View/Edit My Profile**:
   - Click profile icon in top-right → "My Profile"
   - Or go to Menu → Profile
   - Edit name, email, phone, address, blood group, DOB, gender

2. **View/Edit Child's Profile**:
   - Click profile icon in top-right → "Child's Profile"
   - Select child from list (if multiple children)
   - Edit name, email, phone, address, blood group, DOB, gender
   - **Grade and Roll Number are read-only** (managed by school)

### For Teachers
1. **View/Edit My Profile**:
   - Click profile icon in top-right → "My Profile"
   - Or go to Menu → Profile
   - Edit personal information

### For Admins
1. **View/Edit My Profile**:
   - Click Menu → Profile (or `/admin/profile`)
   - Go to "My Profile" tab
   - Edit your information

2. **Manage All Users**:
   - Go to Menu → Profile (or `/admin/profile`)
   - Click "Manage Users" tab
   - Search for any user by name, email, or ID
   - Click user to view their profile
   - Edit any information about them

---

## Features

✅ View own profile  
✅ Edit own profile with validation  
✅ Admin can view/edit any user  
✅ Parent can view/edit child's profile  
✅ Restricted fields for parent editing (grade, roll, class are read-only)  
✅ Form validation (email format, phone digits)  
✅ Error messages for invalid input  
✅ Success feedback after saving  
✅ Search functionality (admin)  
✅ Multi-child support (parents with multiple children)  

---

## Page URLs

| Role | Page | URL |
|------|------|-----|
| Parent | My Profile | `/parent/profile` |
| Parent | Child's Profile | `/parent/child-profile` |
| Teacher | My Profile | `/teacher/profile` |
| Admin | Admin Panel | `/admin/profile` |

---

## What Parents CAN Edit About Their Child

- Name
- Email
- Phone Number
- Address
- Blood Group
- Date of Birth
- Gender

## What Parents CANNOT Edit

- ❌ Grade (set by school)
- ❌ Roll Number (set by school)
- ❌ Class (set by school)
- ❌ Results
- ❌ Attendance

---

## Validation Rules

- **Name**: Required, cannot be empty
- **Email**: Must be valid email format (user@example.com)
- **Phone**: Optional, but if entered must be 10+ digits
- **Address**: Optional, any text

---

## Next Steps

1. **Test the features**:
   - Login as parent, go to `/parent/profile`
   - Login as teacher, go to `/teacher/profile`
   - Login as admin, go to `/admin/profile`

2. **Try editing**:
   - Click "Edit" button
   - Change some information
   - Click "Save Changes"
   - Should see success message

3. **Test restrictions**:
   - Login as parent
   - Go to child's profile
   - Try to change name (works)
   - Try to change grade (shows read-only, cannot edit)

4. **Admin search**:
   - Login as admin
   - Go to Manage Users tab
   - Search for any user name
   - Click to view their full profile
   - Edit their information

---

## Files Created/Modified

### New Components
- `src/app/components/ProfileView.tsx` - Reusable profile component

### New Pages
- `src/app/parent/profile/page.tsx` - Parent my profile
- `src/app/parent/child-profile/page.tsx` - Parent child profile
- `src/app/teacher/profile/page.tsx` - Teacher my profile
- `src/app/(dashboard)/admin/profile/page.tsx` - Admin panel with user management

### New API Endpoints
- `GET /api/profile/get` - Fetch profile with permission checks
- `PUT /api/profile/update` - Update profile with restrictions
- `GET /api/parent/children` - Get parent's children
- `GET /api/admin/users` - Get all users (admin only)

### Modified Components
- `src/app/components/ParentTopBar.tsx` - Added navigation links
- `src/app/components/TeacherTopBar.tsx` - Added navigation links
- `src/app/components/Menu.tsx` - Updated profile links by role

---

## Troubleshooting

**Issue**: Cannot edit certain fields
- Check if field is restricted for your role
- Parents cannot edit child's grade/roll/class
- Read the warning message for details

**Issue**: Form shows validation error
- Check email format (must have @)
- Check phone has at least 10 digits
- All required fields must be filled

**Issue**: Changes not saving
- Check browser console for errors
- Verify network request succeeds
- Reload page and try again

---

## Permission Summary

| User Type | Own Profile | Other Profiles | Child Profile |
|-----------|-----------|----------------|---------------|
| Admin | Edit all | Edit all | N/A |
| Teacher | Edit all | Cannot view | N/A |
| Parent | Edit all | Cannot view | Edit (restricted) |

---

## Form Validation

All profile forms include:
- Real-time error messages
- Field-level validation
- Success/error notifications
- Auto-focus on first error
- Disabled save button while saving

---

## Data Security

- Password cannot be changed via profile page (use Settings/Change Password)
- Role cannot be changed (admin only system setting)
- Admins are logged and identifiable when editing other profiles
- Restricted fields automatically filtered from parent edits
- API validates permissions on backend (not just frontend)
