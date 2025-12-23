# 🎓 EduExamPortal

**EduExamPortal** is a comprehensive online examination platform built for educational institutions to create, manage, and grade exams with support for multiple question types, multi-tenant architecture, and role-based access control.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-blue?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Question Types](#-question-types)
- [Email Template System](#-email-template-system)
- [Multi-Tenant Architecture](#-multi-tenant-architecture)
- [Contributing](#-contributing)
- [Copyright](#-copyright)

---

## ✨ Features

### **Core Features**

#### 🔐 **Authentication & Authorization**
- Three user roles: **Admin**, **Teacher**, **Student**
- Token-based invitation system for teachers and students
- Row Level Security (RLS) policies for data isolation
- Protected routes with role-based access control

#### 🏢 **Multi-Tenant Architecture**
- Institution and department management
- Institution-based data filtering
- Department hierarchy with exams and users
- Active institution switching (Admin)

#### 📝 **Exam Management**
- Create exams with title, description, department, and time range
- Support for **3 question types**: MCQ, SAQ, Coding
- Institution/Department-based exam filtering
- Question cloning system (template → student copy)
- Start/End time with automatic timezone handling

#### 👨‍🎓 **Student Management**
- Email-based student invitations
- Multi-exam assignment per student
- Assign/unassign exams dynamically
- Student exam assignment tracking
- Invitation expiration and status management

#### 👨‍🏫 **Teacher Management**
- Email-based teacher invitations (via SMTP)
- Department-specific teacher access
- Teacher grading interface
- Email template customization

#### ✍️ **Question Types**

1. **MCQ (Multiple Choice Questions)**
   - 4 options per question
   - Auto-graded on submission
   - Radio button selection

2. **SAQ (Short Answer Questions)**
   - Textarea input
   - Manual grading by teacher
   - Grading guidelines and feedback

3. **Coding Questions**
   - **8 supported languages**: JavaScript, Python, Java, C++, C, Ruby, Go, Rust
   - Monaco Editor integration (VS Code editor)
   - Syntax highlighting and themes
   - Test case definition and validation
   - Code execution via Judge0 API
   - Custom input testing
   - Fullscreen mode, font size controls
   - Keyboard shortcuts

#### 📊 **Grading System**
- **Auto-grading**: MCQ and Coding (test cases)
- **Manual grading**: SAQ and Coding (final score adjustment)
- Teacher feedback for SAQ/Coding
- Grading status tracking (pending → partial → completed)
- Score breakdown: auto-graded, manual-graded, total score

#### 📧 **Email Template System**
- **5 template types**:
  - Student Invitation (with exam)
  - Student Invitation (general - no exam)
  - Teacher Invitation
  - Exam Reminder
  - Results Notification
- Custom rich text editor with formatting toolbar (Bold, Italic, Underline, Headings, Lists)
- Variable substitution: `{firstName}`, `{lastName}`, `{examTitle}`, `{institutionName}`, `{expirationDate}`, `{inviteUrl}`, etc.
- Visibility control: public, private, custom (select specific users)
- Set active template per type
- Default templates provided

#### 📈 **Analytics & Reporting**
- Platform statistics (user counts, exam distribution)
- User growth charts (daily/monthly granularity)
- Exam distribution by department (pie charts)
- Department overview tables
- Time range filtering (7/30 days, 3/6/12 months, all time)
- Institution/Department filtering

#### 🎨 **UI/UX Features**
- Dark/Light mode support
- Responsive design (mobile-friendly)
- Animated sidebar with collapse/expand
- Loading skeletons for all data tables
- Toast notifications for user feedback
- Breadcrumb navigation
- Marketing website (Landing, About, Features, Contact, Demo)

### **🚧 Coming Soon**

- **Proctoring System**: Webcam monitoring, violation detection, auto-termination
- **Advanced Exam Settings**: Max attempts, shuffle questions, show results immediately
- **Export Features**: CSV/Excel export for analytics and results
- **Bulk Operations**: Bulk student/teacher invitations (CSV upload)
- **Real-time Monitoring**: WebSocket for live exam tracking
- **Messaging & Announcements**: In-platform communication
- **Backup & Restore**: Database backup functionality

---

## 🛠️ Tech Stack

### **Framework & Language**
- [Next.js 15](https://nextjs.org/) - React framework with App Router
- [React 19](https://reactjs.org/) - UI library
- [TypeScript 5](https://www.typescriptlang.org/) - Type safety

### **Database & Authentication**
- [Supabase](https://supabase.com/) - PostgreSQL database with Row Level Security
- Supabase Auth - Email/password authentication

### **Styling & UI**
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Radix UI + Tailwind components
- [Motion](https://motion.dev/) - Framer Motion fork for animations
- [next-themes](https://github.com/pacocoursey/next-themes) - Dark mode support

### **Code Execution**
- [Judge0 API](https://judge0.com/) - Code compilation and execution (via RapidAPI)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code editor for web

### **Email Service**
- [Nodemailer](https://nodemailer.com/) - SMTP email delivery

### **Charts & Visualization**
- [Recharts](https://recharts.org/) - React charting library

### **Icons & Assets**
- [Lucide React](https://lucide.dev/) - Icon library
- [Tabler Icons](https://tabler-icons.io/) - Additional icons
- [React Icons](https://react-icons.github.io/react-icons/) - Icon collection

### **Utilities**
- [class-variance-authority](https://cva.style/) - Component variants
- [clsx](https://github.com/lukeed/clsx) - Conditional classNames
- [tailwind-merge](https://github.com/dcastil/tailwind-merge) - Merge Tailwind classes
- [react-hot-toast](https://react-hot-toast.com/) - Notifications

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js 20+ and npm/yarn/pnpm
- Supabase account ([supabase.com](https://supabase.com))
- RapidAPI account for Judge0 ([rapidapi.com](https://rapidapi.com))
- SMTP email service (Gmail, SendGrid, etc.)

---

## 📦 Installation

### **1. Clone the repository**

```bash
git clone https://github.com/Surjendu-kar/EduExamPortal.git
cd EduExamPortal
```

### **2. Install dependencies**

```bash
npm install
# or
yarn install
# or
pnpm install
```

### **3. Set up environment variables**

Create a `.env.local` file in the root directory (see [Environment Variables](#-environment-variables) section below).

### **4. Set up the database**

Follow the instructions in [Database Setup](#-database-setup) section below.

### **5. Run the development server**

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Judge0 API (Code Execution)
RAPIDAPI_KEY=your_rapidapi_key
```

### **How to get these values:**

#### **Supabase**
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API**
3. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy the **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### **SMTP Email**
- **Gmail**: Use App Passwords ([guide](https://support.google.com/accounts/answer/185833))
- **SendGrid**: Get API key from [sendgrid.com](https://sendgrid.com)
- **Mailgun**: Get SMTP credentials from [mailgun.com](https://mailgun.com)

#### **Judge0 API**
1. Sign up at [RapidAPI](https://rapidapi.com)
2. Subscribe to [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce)
3. Copy your **RapidAPI Key** → `RAPIDAPI_KEY`

---

## 🗄️ Database Setup

### **Step 1: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (this takes ~2 minutes)

### **Step 2: Run SQL Schema**

1. Open the **SQL Editor** in your Supabase dashboard
2. Copy the entire SQL schema from [`db-schema-setup-config.md`](./db-schema-setup-config.md)
3. Run the SQL queries **in order**:
   - Extensions
   - Helper Functions
   - Core Tables (start with `user_profiles`)
   - Enable Row Level Security
   - RLS Policies
   - Triggers and Indexes

### **Step 3: Create First Admin User**

After setting up the schema, create your first admin user:

#### **Option A: Via Supabase Dashboard**

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **"Add User"**
3. Enter email and password
4. After user is created, go to **SQL Editor** and run:

```sql
INSERT INTO public.user_profiles (id, role, first_name, last_name, verified)
VALUES (
  '[USER_ID_FROM_AUTH_USERS]',
  'admin',
  'Admin',
  'User',
  true
);
```

#### **Option B: Via SQL (Recommended)**

Run this in the SQL Editor (replace email/password):

```sql
-- Create auth user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@yourplatform.com',
  crypt('your_admin_password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  ''
);

-- Create user profile
INSERT INTO public.user_profiles (id, role, first_name, last_name, verified)
SELECT id, 'admin', 'Platform', 'Admin', true
FROM auth.users
WHERE email = 'admin@yourplatform.com';
```

### **Step 4: Verify Setup**

1. Go to **Authentication** → **Users** and verify the admin user exists
2. Go to **Table Editor** → **user_profiles** and verify the profile exists
3. Log in to the application with your admin credentials

---

## 📖 Usage

### **Admin Workflow**

1. **Log in** with admin credentials
2. **Create Institutions** (`/admin/management/institutions`)
3. **Create Departments** within institutions
4. **Invite Teachers** via email (`/admin/management/teachers`)
5. **View Analytics** (`/admin/analytics/platform-stats`)
6. **Manage Email Templates** (`/admin/settings/email-templates`)

### **Teacher Workflow**

1. **Accept Invitation** from admin via email link
2. **Complete Profile** setup
3. **Create Exams** (`/teacher/management/exams`)
   - Add MCQ, SAQ, and Coding questions
   - Set exam duration and department
4. **Invite Students** (`/teacher/management/students`)
   - Assign specific exams or invite without exams
5. **Grade Submissions** (`/teacher/management/grading`)
   - Auto-graded: MCQ and Coding test cases
   - Manual grading: SAQ and Coding review

### **Student Workflow**

1. **Accept Invitation** from teacher via email link
2. **Complete Profile** setup
3. **View Assigned Exams** (`/student/exams`)
4. **Take Exam** (`/student/exam/[id]/start`)
   - Answer MCQ questions (radio buttons)
   - Write SAQ answers (textarea)
   - Write and execute code (Monaco editor)
   - Auto-save enabled (every N seconds)
5. **View Results** (`/student/results`)

---

## 📂 Project Structure

```
eduexamportal/
├── app/                          # Next.js App Router
│   ├── (public)/                # Public pages (landing, login, about, etc.)
│   ├── admin/                   # Admin dashboard
│   │   ├── management/          # Teachers, Students, Exams, Grading
│   │   ├── analytics/           # Platform stats, Usage reports
│   │   ├── communications/      # Invitations, Messages, Announcements
│   │   └── settings/            # Email templates, System config
│   ├── teacher/                 # Teacher dashboard
│   │   ├── management/          # Students, Exams, Grading
│   │   └── settings/            # Email templates
│   ├── student/                 # Student dashboard
│   │   ├── dashboard/           # Overview
│   │   ├── exams/               # Available exams
│   │   ├── exam/[id]/start/     # Active exam interface
│   │   └── results/             # Exam results
│   ├── api/                     # API routes
│   │   ├── exams/               # Exam CRUD
│   │   ├── students/            # Student management
│   │   ├── teachers/            # Teacher management
│   │   ├── execute/             # Code execution (Judge0)
│   │   ├── email-templates/     # Email template CRUD
│   │   └── admin/               # Admin-only APIs
│   ├── student-invitation/[token]/ # Student signup
│   └── teacher-invitation/[token]/ # Teacher signup
├── components/                  # React components
│   ├── ui/                      # shadcn/ui primitives
│   ├── animate-ui/              # Animated components
│   ├── AnimatedSidebar.tsx      # Role-based sidebar
│   ├── SimpleRichTextEditor.tsx # Custom rich text editor
│   └── ...                      # Feature components (dialogs, skeletons)
├── lib/                         # Utilities and helpers
│   ├── supabase/                # Supabase clients
│   │   ├── client.ts            # Client-side Supabase
│   │   └── server.ts            # Server-side Supabase (service role)
│   ├── supabaseRouteClient.ts   # API route Supabase client
│   ├── auth.ts                  # Auth utilities
│   └── email/                   # Email rendering
├── data/                        # Static data
│   └── codeTemplates.ts         # Language configs for Monaco
├── types/                       # TypeScript types
│   └── monaco.d.ts              # Monaco editor types
├── public/                      # Static assets
├── db-schema-setup-config.md    # Database schema documentation
├── CLAUDE.md                    # AI assistant instructions
├── task.md                      # Development tasks
└── README.md                    # This file
```

---

## 🔌 API Reference

### **Authentication**

All API routes require authentication via Supabase Auth. Include the session token in requests.

### **Core Endpoints**

#### **Exams**
- `GET /api/exams` - Fetch exams (role-based filtering)
- `POST /api/exams` - Create exam with questions
- `GET /api/exams/[id]` - Fetch exam details
- `PUT /api/exams/[id]` - Update exam
- `DELETE /api/exams/[id]` - Delete exam

#### **Students**
- `GET /api/students` - Fetch student invitations
- `POST /api/students` - Invite student (with optional exam assignment)
- `POST /api/students/assign-exam` - Assign exam to student
- `POST /api/students/unassign-exam` - Unassign exam from student
- `POST /api/students/validate-token` - Validate invitation token
- `POST /api/students/accept-invitation` - Accept invitation and create account

#### **Teachers**
- `GET /api/teachers` - Fetch teacher invitations
- `POST /api/teachers` - Invite teacher (sends email)
- `POST /api/teacher-invitation/validate` - Validate teacher token

#### **Student Exam Flow**
- `GET /api/student/assigned-exams` - Fetch assigned exams
- `GET /api/student/exam/[id]` - Fetch exam questions
- `POST /api/student/exam/[id]/start` - Start exam (clone questions)
- `POST /api/student/exam/[id]/save` - Auto-save answers
- `POST /api/student/exam/[id]/submit` - Submit exam
- `GET /api/student/results` - Fetch all results
- `GET /api/student/results/[id]` - Fetch specific result

#### **Grading**
- `GET /api/admin/grading` - Fetch all submissions (admin)
- `GET /api/teacher/grading` - Fetch submissions (teacher, department-filtered)
- `PUT /api/teacher/grading/[sessionId]` - Update grades

#### **Code Execution**
- `POST /api/execute` - Execute code via Judge0 API
  - **Request**: `{ language_id, source_code, stdin, expected_output }`
  - **Response**: `{ stdout, stderr, status, time, memory }`

#### **Email Templates**
- `GET /api/email-templates` - Fetch templates (role-based visibility)
- `POST /api/email-templates` - Create template
- `GET /api/email-templates/[id]` - Fetch template
- `PUT /api/email-templates/[id]` - Update template
- `DELETE /api/email-templates/[id]` - Delete template
- `POST /api/email-templates/[id]/set-active` - Set active template

#### **Analytics**
- `GET /api/admin/analytics/platform-stats` - Platform statistics
  - Query params: `timeRange`, `institutionId`, `departmentId`, `granularity`

### **Response Format**

```typescript
// Success
{
  "data": {...},
  "message": "Success message"
}

// Error
{
  "error": "Error message",
  "details": {...}
}
```

---

## 📝 Question Types

### **1. MCQ (Multiple Choice Questions)**

**Structure:**
```typescript
{
  question_text: string;
  options: string[];           // 4 options
  correct_option: number;      // 0-3
  marks: number;
  selected_option?: number;    // Student's answer
  is_correct?: boolean;        // Auto-calculated
  marks_obtained?: number;     // Auto-calculated
}
```

**Grading**: Automatic on submission

---

### **2. SAQ (Short Answer Questions)**

**Structure:**
```typescript
{
  question_text: string;
  grading_guidelines?: string;
  marks: number;
  answer_text?: string;        // Student's answer
  marks_obtained?: number;     // Teacher-assigned
  teacher_feedback?: string;
  graded_by?: UUID;
  graded_at?: timestamp;
}
```

**Grading**: Manual by teacher

---

### **3. Coding Questions**

**Structure:**
```typescript
{
  question_text: string;
  language: string;            // 'javascript', 'python', 'java', etc.
  starter_code?: string;
  test_cases: {
    input: string;
    expected_output: string;
  }[];
  submitted_code?: string;     // Student's code
  execution_results?: {
    test_case_results: {
      passed: boolean;
      actual_output: string;
      expected_output: string;
    }[];
    passed_count: number;
    total_count: number;
  };
  marks: number;
  marks_obtained?: number;     // Auto-calculated from test cases
  code_quality_score?: number; // Teacher-assigned
  teacher_feedback?: string;
}
```

**Supported Languages:**
- JavaScript (Node.js)
- Python 3
- Java
- C++
- C
- Ruby
- Go
- Rust

**Grading**:
- **Auto-grading**: Based on test case pass/fail
- **Manual review**: Teacher can adjust score and provide feedback

**Judge0 Language IDs:**
```typescript
const LANGUAGE_IDS = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
  ruby: 72,
  go: 60,
  rust: 73
};
```

---

## 📧 Email Template System

### **Template Types**

| Type | Purpose | Variables |
|------|---------|-----------|
| `student_invitation_with_exam` | Student invitation WITH exam | `{firstName}`, `{lastName}`, `{examTitle}`, `{institutionName}`, `{expirationDate}`, `{inviteUrl}` |
| `student_invitation_general` | Student invitation WITHOUT exam | `{firstName}`, `{lastName}`, `{institutionName}`, `{expirationDate}`, `{inviteUrl}` |
| `teacher_invitation` | Teacher invitation | `{firstName}`, `{lastName}`, `{institutionName}`, `{departmentName}`, `{invitedBy}`, `{expirationDate}`, `{inviteUrl}` |
| `exam_reminder` | Exam reminder notification | `{firstName}`, `{lastName}`, `{examTitle}`, `{startTime}` |
| `results_notification` | Exam results notification | `{firstName}`, `{lastName}`, `{examTitle}`, `{score}`, `{totalScore}` |

### **Variable Format**

The system supports **both single and double brace formats**:
- Single braces: `{firstName}`, `{lastName}`
- Double braces: `{{firstName}}`, `{{lastName}}`
- Snake case: `{{teacher_name}}`, `{{invited_by}}`

### **Template Visibility**

- **Public**: Visible to all users (non-default templates)
- **Private**: Visible only to creator
- **Custom**: Visible to selected users

### **Active Templates**

Each user has **5 active template slots** (one per template type). The system uses:
1. User's active template (from `user_profiles.active_*_template_id`)
2. Default template for that type (`is_default = true`)
3. Fallback to hardcoded HTML

### **Custom Rich Text Editor**

Located at `components/SimpleRichTextEditor.tsx`, built with:
- Native browser `contentEditable` API
- `document.execCommand()` for formatting
- Toolbar: Bold, Italic, Underline, H1/H2/H3, Bullet/Numbered Lists
- Tailwind CSS styling
- No external library dependency

---

## 🏢 Multi-Tenant Architecture

### **Hierarchy**

```
Institution
  └── Department 1
      ├── Exam 1
      ├── Exam 2
      └── Teachers/Students
  └── Department 2
      ├── Exam 3
      └── Teachers/Students
```

### **Data Isolation**

- All exams, students, and teachers are linked to departments
- Departments are linked to institutions
- Active institution tracked in localStorage (Admin sidebar)
- All API queries filtered by `institution_id`
- Custom event `institutionChanged` for real-time updates

### **Database Relationships**

```
user_profiles.institution_id → institutions.id
user_profiles.department_id → departments.id
departments.institution_id → institutions.id
exams.institution_id → institutions.id
exams.department_id → departments.id
```

---

## 🎨 UI Components

### **shadcn/ui Primitives** (`components/ui/`)
- button, card, dialog, dropdown-menu, input, textarea, label
- select, checkbox, radio-group, table, badge, alert
- alert-dialog, avatar, breadcrumb, progress, separator
- scroll-area, skeleton, password-toggle

### **Custom Components**
- **AnimatedSidebar** - Role-based navigation with institution switcher
- **SimpleRichTextEditor** - Rich text editor for email templates
- **QuestionAccordion** - Display exam questions in accordion
- **Dialogs**: AddExamDialog, AddStudentDialog, AddTeacherDialog, EmailTemplateDialog, GradingDialog
- **Skeletons**: ExamTableSkeleton, StudentTableSkeleton, DashboardSkeleton

### **Marketing Components** (`components/`)
- HeroSection, FeaturesSection, TestimonialsSection, FAQSection
- AboutHeroSection, MissionVisionSection, CoreValuesSection

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### **1. Fork the repository**

```bash
git clone https://github.com/Surjendu-kar/EduExamPortal.git
cd EduExamPortal
```

### **2. Create a feature branch**

```bash
git checkout -b feature/amazing-feature
```

### **3. Make your changes**

- Follow the existing code style
- Add comments for complex logic
- Update documentation if needed

### **4. Test your changes**

```bash
npm run dev
# Test all affected features
```

### **5. Commit your changes**

```bash
git commit -m "feat: Add amazing feature"
```

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### **6. Push to your fork**

```bash
git push origin feature/amazing-feature
```

### **7. Open a Pull Request**

- Provide a clear description of changes
- Reference any related issues
- Include screenshots if UI changes

---

## 📄 Copyright

© 2025 Surjendu Kar. All Rights Reserved.

This project is part of my **professional portfolio**. While the code is publicly visible for educational and assessment purposes, all rights are reserved.

**Interested in this project?** Feel free to reach out at [rahulkar9988@gmail.com](mailto:rahulkar9988@gmail.com)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Judge0](https://judge0.com/) - Code execution API
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

For support, email [rahulkar9988@gmail.com](mailto:rahulkar9988@gmail.com) or open an issue on GitHub.

---

## 🌟 Star This Project

If you find this project useful, please consider giving it a ⭐️ on GitHub!

---

**Built with ❤️ by [Surjendu Kar](https://github.com/Surjendu-kar)**
