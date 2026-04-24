# Kindergarten Project Feature Report

This report documents the currently working feature set for project reporting.

Scope covered in this document:

1. Admin Panel
2. Teacher Panel
3. Parent Panel
4. Technology and tools used per feature

Intentionally excluded from this report:

1. AI Calling flows
2. Push notification flows
3. Other experimental/test-only endpoints that are not part of stable day-to-day panel usage

## 1. System Context

The platform is implemented as a role-based school management system with:

1. A Next.js web app for Admin, Teacher, and Parent portals
2. Integrated API layer in Next.js route handlers
3. MongoDB persistence through Mongoose models
4. Optional Python attendance backend for computer-vision attendance workflows
5. Real-time chat using Socket.IO

Core technology baseline:

1. Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
2. Backend (web): Next.js API routes, Node.js
3. Database: MongoDB, Mongoose
4. Charts and analytics UI: Recharts and calendar components
5. HTTP client: fetch and axios

## 2. Admin Panel Walkthrough

### 2.1 Admin Dashboard and Monitoring

What it does:

1. Shows system summary cards for student, teacher, parent, and staff counts
2. Displays attendance and count charts
3. Displays financial chart block
4. Shows event calendar and announcements panel

How admins use it:

1. Open admin dashboard
2. Review user and academic metrics
3. Use chart blocks for quick status checks
4. Check upcoming events and notices in the same screen

Tech and tools used:

1. React state and effects for data loading
2. Next.js client components
3. API fetch from admin student route and related dashboard data providers
4. Chart components and custom dashboard widgets
5. Tailwind CSS for responsive layout

### 2.2 Bulk Import and Data Onboarding

What it does:

1. Imports teachers in bulk
2. Imports parents in bulk
3. Imports students in bulk
4. Supports XML-based import flow through dedicated tabs

How admins use it:

1. Choose import tab by entity type
2. Upload source file
3. Validate and commit imported records

Tech and tools used:

1. Bulk import UI components
2. Next.js API routes for admin imports
3. XML parsing/data mapping path in the backend route layer
4. MongoDB writes through Mongoose models

### 2.3 Class, Subject, and Teacher Assignment

What it does:

1. Assigns class-subject-teacher mapping
2. Maintains academic structure before marks and results workflow

How admins use it:

1. Open assignment tab
2. Select class and subject
3. Assign teacher and save mapping

Tech and tools used:

1. Dedicated assignment UI component
2. Admin assignment API routes
3. Mongoose models for classes, subjects, and assignment records

### 2.4 Student Management and Class Reassignment

What it does:

1. Lists students with profile details
2. Filters by academic year and class
3. Updates class assignment and roll number
4. Supports staged bulk class changes with save-all action

How admins use it:

1. Open student list
2. Filter by year/class
3. Edit individual class assignment or stage multiple changes
4. Save and refresh list

Tech and tools used:

1. Next.js list page with table/search/pagination components
2. Admin student API routes including update-by-id route
3. Mongoose student and class relationships
4. Controlled React forms and state maps for staged updates

### 2.5 Teacher and Parent Directory Management

What it does:

1. Lists teachers and parents
2. Supports create/delete actions via modal workflows
3. Opens detail pages for individual records

How admins use it:

1. Open list module (teachers/parents)
2. Use create action to add records
3. Use delete action where required
4. Open detail views for verification

Tech and tools used:

1. Shared table/search/modal components
2. Admin API routes for teacher/parent CRUD and related maintenance actions
3. Mongoose profile/user models

### 2.6 Exam Configuration and Marks Rules

What it does:

1. Creates exam cycles
2. Configures exam metadata (year, term, type, dates)
3. Controls cycle status (draft/open/closed)
4. Defines subject setup by class with full marks and pass marks
5. Defines component-wise marks (theory, MCQ, practical, viva, class test, attendance)

How admins use it:

1. Create exam cycle
2. Select classes and subjects
3. Configure marks structure per subject setup
4. Publish/open cycle for teacher entry

Tech and tools used:

1. React forms with validation logic
2. axios-based API integration
3. Admin exam-config API routes
4. Mongoose models for exam cycles and subject setups

### 2.7 Result Oversight and Report Card Access

What it does:

1. Lists grouped result batches by exam cycle and class
2. Filters by workflow status
3. Opens batch details and student-level marks
4. Opens report card views for each student

How admins use it:

1. Open admin results module
2. Filter by status
3. Select group and subject batch
4. Review pass rate and average
5. Open report card for final verification

Tech and tools used:

1. Admin results API routes
2. React modal-based detail panels
3. Mongoose marksheet/result summary models
4. Next.js navigation and query-string based report-card routing

### 2.8 Attendance Audit and Reports

What it does:

1. Shows attendance audit trail
2. Captures source of attendance update (manual/CCTV)
3. Shows teacher, student, class, status changes, and timestamp
4. Provides attendance report generation and download interface

How admins use it:

1. Open attendance audit page
2. Filter by source/date
3. Review audit entries
4. Generate/download attendance report exports

Tech and tools used:

1. Admin attendance-audit API route
2. Attendance audit model and records in MongoDB
3. Report panel component for export workflows
4. Table/filter UI in React

## 3. Teacher Panel Walkthrough

### 3.1 Teacher Dashboard and Daily Planning

What it does:

1. Shows total classes, attendance rate, and today class count
2. Displays upcoming schedule derived from teacher events
3. Displays full calendar and mini calendar views
4. Shows recent activity section for daily operations

How teachers use it:

1. Open teacher home page
2. Review daily metrics and next class timing
3. Use calendar blocks to prepare classes

Tech and tools used:

1. Teacher APIs for classes, events, attendance aggregation
2. React memoized calculations for schedule/attendance rate
3. Calendar components integrated in Next.js page
4. Tailwind-based responsive dashboard layout

### 3.2 Class and Student Roster Management

What it does:

1. Lists teacher-assigned classes by academic year
2. Shows enrolled students with roll info
3. Provides quick actions to open class details and attendance for class

How teachers use it:

1. Select academic year
2. Open class card
3. Inspect student list
4. Jump to attendance for selected class

Tech and tools used:

1. Teacher classes API route with year filters
2. React state for year and class list
3. Next.js Link/router navigation
4. Mongoose-based class assignment and student relation queries

### 3.3 Attendance Operations (Manual + Vision-Assisted)

What it does:

1. Supports manual attendance marking by class/date
2. Supports camera/video attendance flow with recognition overlays
3. Supports student face image upload for enrollment/training
4. Supports attendance export workflows
5. Supports viewing and overriding attendance states before save

How teachers use it:

1. Open attendance module
2. Choose manual or camera-based flow
3. Mark or validate recognized attendance
4. Save attendance
5. Export daily/monthly reports when needed

Tech and tools used:

1. Next.js teacher attendance page and APIs
2. Media APIs in browser for live capture
3. Canvas overlays for detection rendering
4. Python FastAPI attendance backend integration
5. OpenCV and InsightFace in Python backend
6. MongoDB attendance and facial embedding records

### 3.4 Assignment Management

What it does:

1. Lists assignments
2. Supports assignment deletion (teacher/admin permissions)
3. Includes handwriting-checker utility section in assignment workflow

How teachers use it:

1. Open assignments page
2. Review assignment list
3. Delete outdated assignment when needed
4. Refresh list

Tech and tools used:

1. Assignments API routes
2. React table/search/pagination components
3. Permission logic from cookie-based role context
4. Mongoose assignment models

### 3.5 Teacher Results and Marks Entry

What it does:

1. Shows admin-assigned marks-entry setups
2. Opens subject-specific marks entry sheet
3. Shows published/submitted result batches for review
4. Opens student report cards from teacher side

How teachers use it:

1. Open results page
2. Select assigned subject setup
3. Enter marks in configured component structure
4. Review published results and open report cards

Tech and tools used:

1. Teacher marks-entry and results API routes
2. React cards/modals for marks and result details
3. Exam setup models connected from admin configuration
4. Result and marksheet Mongoose models

### 3.6 Teacher-Parent Messaging

What it does:

1. Provides teacher chat interface for parent communication
2. Supports message history and send/read workflows
3. Uses real-time updates where socket connection is active

How teachers use it:

1. Open teacher chat page
2. Select contact and send messages
3. Review incoming replies in same thread

Tech and tools used:

1. Shared Chat component
2. Chat API routes (contacts/history/send/read/upload)
3. Socket.IO for real-time message events
4. Chat message model in MongoDB

### 3.7 Teacher Events, Profile, and Settings

What it does:

1. Shows teacher events interface
2. Provides profile page
3. Provides account/settings page

How teachers use it:

1. Open events for schedule reference
2. Update profile details
3. Manage personal settings and account state

Tech and tools used:

1. Event section component with role-aware behavior
2. Profile API routes
3. Next.js page routing and session-based user context

## 4. Parent Panel Walkthrough

### 4.1 Parent Dashboard Overview

What it does:

1. Shows child card and high-level child context
2. Shows dashboard summary cards
3. Shows attendance card, notices card, and messages card

How parents use it:

1. Open parent dashboard
2. Review child attendance and school notices
3. Move to detailed modules from summary cards

Tech and tools used:

1. Parent dashboard components in React
2. Parent API endpoints for child, attendance, notices, messages
3. Tailwind UI layout and card components

### 4.2 Child Profile and Academic Context

What it does:

1. Retrieves linked children for parent account
2. Displays child profile and class context
3. Uses selected child context across pages

How parents use it:

1. Select child
2. View class and profile details
3. Continue to results/learning/events based on selected child

Tech and tools used:

1. Parent children and child API routes
2. React state management for selected student
3. Mongoose parent/student relationship models

### 4.3 Parent Results and Report Cards

What it does:

1. Lists published result summaries per child
2. Shows percentage, grade, marks, and rank summary
3. Opens detailed report-card page for selected exam cycle

How parents use it:

1. Open parent results page
2. Select child from dropdown
3. Review available published results
4. Open full report card for each exam

Tech and tools used:

1. Parent results API routes
2. React page with filtering and result cards
3. Result summary and exam-cycle models in MongoDB

### 4.4 Parent Child Learning Dashboard

What it does:

1. Provides child learning overview tabs with metrics and history
2. Shows quiz performance history
3. Shows concept-level and progress visual analytics
4. Shows learning-material and topic views where available
5. Shows revision/alert style learning reminders

How parents use it:

1. Open child-learning dashboard
2. Check overview metrics
3. Review progress charts and concepts
4. Review topic material and quiz activity

Tech and tools used:

1. ILDCE APIs for student metrics, attempts, topics, and predictions
2. Recharts for visualization (line, bar, radar, responsive containers)
3. Lucide icons and tab-driven React UI state
4. MongoDB ILDCE models (topic, quiz attempt, metrics)

### 4.5 Parent Events and Communication

What it does:

1. Parent event calendar/list view (read-focused)
2. Parent-teacher chat interface

How parents use it:

1. Open events page to track school calendar
2. Open chat page for direct communication with teachers

Tech and tools used:

1. Shared EventSection component in parent mode
2. Shared Chat component
3. Parent event/message API routes
4. Socket.IO-backed real-time communication path

### 4.6 Parent Profile and Settings

What it does:

1. Provides parent profile management page
2. Provides parent settings page

How parents use it:

1. Open profile/settings from parent navigation
2. Update account details and preferences

Tech and tools used:

1. Profile get/update API routes
2. Next.js page routing with cookie/session auth context

## 5. Cross-Cutting Platform Features Used by All Panels

### 5.1 Authentication and Session Guarding

1. Sign-in/sign-out and password flows
2. Role-based route gating for admin/teacher/parent
3. Cookie-based session extraction in middleware and pages

Tech and tools used:

1. Next.js middleware
2. Cookie parsing in client and server layers
3. Auth API routes and user models

### 5.2 Shared Data and API Architecture

1. Panel pages consume route handlers under role-based API namespaces
2. UI components use fetch/axios to call APIs
3. Database operations are centralized through Mongoose models

Tech and tools used:

1. Next.js API route handlers
2. TypeScript interfaces for payload shaping
3. MongoDB + Mongoose schema models

### 5.3 Shared UI Component System

1. Common table/search/pagination/modals across multiple modules
2. Role-aware top bars and layouts
3. Reusable event and chat components

Tech and tools used:

1. React component composition
2. Tailwind CSS utility design system
3. Next.js layouts and nested routes

## 6. Reporting Summary (Project Report Ready)

Current stable panel implementation highlights:

1. Admin panel is strong in operations: onboarding/import, class-teacher-subject structure, exam config, result governance, and attendance audit/reporting.
2. Teacher panel is strong in day-to-day academics: class handling, attendance workflows, assignment management, marks entry, result review, and communication.
3. Parent panel is strong in visibility: child profile, published results, learning progress views, events, and direct chat.

If you use this for a formal project report, this file can be directly used as the feature chapter under the heading Functional Modules and Role-Based Capabilities.

## 7. Academic Chapter Mapping Guide

Use this quick map when writing the full report chapters:

1. Chapter 1 (Introduction)
	- Use the problem framing from sections 2 to 4 of this file.
2. Chapter 2 (Related Works)
	- Compare this system against common school ERP/LMS patterns and attendance tools.
3. Chapter 3 (Methodology)
	- Use sections 2 to 5 to explain requirement-driven and role-driven implementation strategy.
4. Chapter 4 (Implementation, Results and Discussion)
	- Admin implementation: section 2
	- Teacher implementation: section 3
	- Parent implementation: section 4
	- Shared architecture and technology: sections 1 and 5
5. Chapter 5 (Ethical, Legal and Social)
	- Focus on student data privacy, role-based access, audit trails, and communication safeguards.
6. Chapter 6 (Complex Engineering Problems)
	- Focus on multi-role integration, data consistency across modules, and hybrid service integration.
7. Chapter 7 (Conclusion)
	- Summarize outcomes from section 6 and planned improvements.
