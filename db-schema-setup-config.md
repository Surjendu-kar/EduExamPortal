# Database Schema Setup for Exam Platform

This file contains the **SQL schema + RLS policies** required to set up the Exam Platform.  
To initialize your database, simply run the following queries inside Supabase SQL Editor (or psql).

**Note:** This setup includes the basic schema. For institutions and departments functionality, please also run the `db-schema-department-institution.sql` file.

This file contains the **SQL schema + RLS policies** required to set up the Exam Platform.  
To initialize your database, simply run the following queries inside Supabase SQL Editor (or psql).

---

## 1. Enable Extensions

```sql
-- Required for UUID and auth
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

## 2. Helper Functions

```sql
-- Create is_admin function (referenced in policies)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. Core Tables

### User Profiles Table (Must be created first as other policies reference it)

```sql
create table public.user_profiles (
  id uuid not null,
  role text not null,
  created_by uuid null,
  institution text null,
  department text null,
  first_name text null,
  last_name text null,
  email text null,
  profile_completed boolean default false,
  institution_id uuid references institutions(id),
  department_id uuid references departments(id),
  verified boolean null default true,
  deleted boolean default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  -- Email template preferences (added 2025-12-22)
  active_student_invitation_with_exam_template_id uuid references email_templates(id),
  active_student_invitation_general_template_id uuid references email_templates(id),
  active_teacher_invitation_template_id uuid references email_templates(id),
  active_exam_reminder_template_id uuid references email_templates(id),
  active_results_notification_template_id uuid references email_templates(id),
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_created_by_fkey foreign key (created_by) references auth.users (id),
  constraint user_profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
);

-- Create indexes for email template columns
create index IF not exists idx_user_profiles_active_student_exam_template on public.user_profiles(active_student_invitation_with_exam_template_id);
create index IF not exists idx_user_profiles_active_student_general_template on public.user_profiles(active_student_invitation_general_template_id);
create index IF not exists idx_user_profiles_active_teacher_template on public.user_profiles(active_teacher_invitation_template_id);
create index IF not exists idx_user_profiles_active_exam_reminder_template on public.user_profiles(active_exam_reminder_template_id);
create index IF not exists idx_user_profiles_active_results_template on public.user_profiles(active_results_notification_template_id);
create index IF not exists idx_user_profiles_institution on public.user_profiles(institution_id);
create index IF not exists idx_user_profiles_department on public.user_profiles(department_id);
create index IF not exists idx_user_profiles_deleted on public.user_profiles(deleted);
```

### Exams Table

```sql
create table public.exams (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  title text null,
  description text null,
  department text null,
  start_time timestamp with time zone null,
  end_time timestamp with time zone null,
  unique_code text not null,
  created_by uuid null default auth.uid(),
  access_type text null default 'invitation'::text,
  max_attempts integer null default 1,
  shuffle_questions boolean null default false,
  show_results_immediately boolean null default false,
  require_webcam boolean null default true,
  max_violations integer null default 3,
  constraint exams_pkey primary key (id),
  constraint unique_code_unique unique (unique_code)
);
```

### Teacher Invitations Table

```sql
create table public.teacher_invitations (
  id uuid not null default gen_random_uuid(),
  email text not null,
  token text not null,
  admin_id uuid not null,
  first_name text not null,
  last_name text not null,
  institution text null,
  department text null,
  status text not null default 'pending',
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  constraint teacher_invitations_pkey primary key (id),
  constraint teacher_invitations_token_key unique (token),
  constraint teacher_invitations_admin_id_fkey foreign key (admin_id) references auth.users (id),
  constraint teacher_invitations_status_check check (status in ('pending', 'accepted', 'expired', 'cancelled'))
);
```

### Exam Sessions Table

```sql
create table public.exam_sessions (
  id uuid not null default gen_random_uuid(),
  exam_id uuid not null,
  user_id uuid not null,
  start_time timestamp with time zone null,
  end_time timestamp with time zone null,
  status text null default 'not_started'::text,
  total_score integer null default 0,
  violations_count integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint exam_sessions_pkey primary key (id),
  constraint exam_sessions_exam_id_user_id_key unique (exam_id, user_id),
  constraint exam_sessions_exam_id_fkey foreign key (exam_id) references exams (id),
  constraint exam_sessions_user_id_fkey foreign key (user_id) references auth.users (id)
);
```

### Student Invitations Table

```sql
create table public.student_invitations (
  id uuid not null default gen_random_uuid(),
  teacher_id uuid not null,
  student_email text not null,
  first_name text not null,
  last_name text not null,
  invitation_token text not null,
  exam_id uuid null,
  duration integer null default 60,
  status text null default 'pending'::text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default now(),
  student_id uuid null,
  constraint student_invitations_pkey primary key (id),
  constraint student_invitations_invitation_token_key unique (invitation_token),
  constraint student_invitations_exam_id_fkey foreign key (exam_id) references exams (id),
  constraint student_invitations_teacher_id_fkey foreign key (teacher_id) references auth.users (id),
  constraint student_invitations_student_id_fkey foreign key (student_id) references auth.users (id),
  constraint unique_student_exam unique (student_email, exam_id)
);
```

### Student Exam Assignments Table

**Purpose:** Track which exams are assigned to which students (supports multiple exams per student)

```sql
create table public.student_exam_assignments (
  id uuid not null default gen_random_uuid(),
  student_email text not null,
  student_id uuid null references auth.users(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  department_id uuid null references departments(id),
  assigned_at timestamp with time zone not null default now(),
  status text not null default 'active',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint student_exam_assignments_pkey primary key (id),
  constraint unique_student_exam_assignment unique (student_email, exam_id),
  constraint student_exam_assignments_status_check check (status in ('active', 'completed', 'revoked'))
);

-- Create indexes for better performance
create index idx_student_exam_assignments_email on public.student_exam_assignments(student_email);
create index idx_student_exam_assignments_exam on public.student_exam_assignments(exam_id);
create index idx_student_exam_assignments_student_id on public.student_exam_assignments(student_id);
create index idx_student_exam_assignments_assigned_by on public.student_exam_assignments(assigned_by);
create index idx_student_exam_assignments_department on public.student_exam_assignments(department_id);
create index idx_student_exam_assignments_status on public.student_exam_assignments(status);
```

### MCQ Table

```sql
create table public.mcq (
  id uuid not null default gen_random_uuid(),
  exam_id uuid not null,
  user_id uuid null,
  question_text text not null,
  options jsonb not null,
  correct_option integer not null,
  selected_option integer null,
  is_correct boolean null,
  marks integer not null,
  marks_obtained integer null,
  question_order integer null,
  created_at timestamp with time zone not null default now(),
  constraint mcq_pkey primary key (id),
  constraint mcq_exam_id_fkey foreign key (exam_id) references exams (id) on delete cascade,
  constraint mcq_user_id_fkey foreign key (user_id) references auth.users (id)
);
```

### SAQ Table

```sql
create table public.saq (
  id uuid not null default gen_random_uuid(),
  exam_id uuid not null,
  user_id uuid null,
  question_text text not null,
  grading_guidelines text null,
  rubric jsonb null,
  answer_text text null,
  marks integer not null,
  marks_obtained integer null,
  question_order integer null,
  graded_by uuid null,
  graded_at timestamp with time zone null,
  teacher_feedback text null,
  created_at timestamp with time zone not null default now(),
  constraint saq_pkey primary key (id),
  constraint saq_exam_id_fkey foreign key (exam_id) references exams (id) on delete cascade,
  constraint saq_user_id_fkey foreign key (user_id) references auth.users (id),
  constraint saq_graded_by_fkey foreign key (graded_by) references auth.users (id)
);
```

### Coding Table

```sql
create table public.coding (
  id uuid not null default gen_random_uuid(),
  exam_id uuid not null,
  user_id uuid null,
  question_text text not null,
  starter_code text null,
  expected_output text not null,
  test_cases jsonb null,
  submitted_code text null,
  output text null,
  execution_results jsonb null,
  marks integer not null,
  marks_obtained integer null,
  code_quality_score integer null,
  language text not null,
  question_order integer null,
  graded_by uuid null,
  graded_at timestamp with time zone null,
  teacher_feedback text null,
  created_at timestamp with time zone not null default now(),
  constraint coding_pkey primary key (id),
  constraint coding_exam_id_fkey foreign key (exam_id) references exams (id) on delete cascade,
  constraint coding_user_id_fkey foreign key (user_id) references auth.users (id),
  constraint coding_graded_by_fkey foreign key (graded_by) references auth.users (id)
);
```

### Student Responses Table (Optimized single-row storage)

```sql
create table public.student_responses (
  id uuid not null default gen_random_uuid(),
  student_id uuid not null,
  exam_session_id uuid not null,
  exam_id uuid not null,
  student_first_name text not null,
  student_last_name text not null,
  student_email text not null,
  answers jsonb not null default '{}',
  total_score integer not null default 0,
  max_possible_score integer not null default 0,
  auto_graded_score integer not null default 0,
  manual_graded_score integer not null default 0,
  grading_status text not null default 'pending',
  graded_by uuid null,
  graded_at timestamp with time zone null,
  submitted_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint student_responses_pkey primary key (id),
  constraint student_responses_student_id_fkey foreign key (student_id) references auth.users (id) on delete cascade,
  constraint student_responses_exam_session_id_fkey foreign key (exam_session_id) references exam_sessions (id) on delete cascade,
  constraint student_responses_exam_id_fkey foreign key (exam_id) references exams (id) on delete cascade,
  constraint student_responses_graded_by_fkey foreign key (graded_by) references auth.users (id),
  constraint student_responses_grading_status_check check (grading_status in ('pending', 'partial', 'completed')),
  constraint student_responses_unique_session unique (student_id, exam_session_id)
);
```

### Proctoring Logs Table

```sql
create table public.proctoring_logs (
  id uuid not null default gen_random_uuid(),
  session_id uuid not null,
  violation_type text not null,
  details jsonb null,
  timestamp timestamp with time zone null default now(),
  constraint proctoring_logs_pkey primary key (id),
  constraint proctoring_logs_session_id_fkey foreign key (session_id) references exam_sessions (id)
);
```

## email_templates Table
```sql
create table public.email_templates (
  id uuid not null default gen_random_uuid (),
  template_name text not null,
  template_type text not null,
  description text null,
  subject text not null,
  main_message text not null,
  created_by uuid not null,
  role text not null,
  is_default boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  visibility text not null default 'private'::text,
  allowed_user_ids jsonb null default '[]'::jsonb,
  constraint email_templates_pkey primary key (id),
  constraint unique_default_template_per_type unique (template_type, is_default, role),
  constraint email_templates_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete CASCADE,
  constraint email_templates_role_check check (
    (
      role = any (
        array['admin'::text, 'teacher'::text, 'student'::text]
      )
    )
  ),
  constraint email_templates_type_check check (
    (
      template_type = any (
        array[
          'student_invitation_with_exam'::text,
          'student_invitation_general'::text,
          'exam_reminder'::text,
          'results_notification'::text,
          'teacher_invitation'::text
        ]
      )
    )
  ),
  constraint email_templates_visibility_check check (
    (
      visibility = any (
        array['public'::text, 'private'::text, 'custom'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_email_templates_type on public.email_templates using btree (template_type) TABLESPACE pg_default;

create index IF not exists idx_email_templates_created_by on public.email_templates using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_email_templates_is_default on public.email_templates using btree (is_default) TABLESPACE pg_default;

create index IF not exists idx_email_templates_role on public.email_templates using btree (role) TABLESPACE pg_default;

create index IF not exists idx_email_templates_visibility on public.email_templates using btree (visibility) TABLESPACE pg_default;

create index IF not exists idx_email_templates_allowed_users on public.email_templates using gin (allowed_user_ids) TABLESPACE pg_default;

create unique INDEX IF not exists idx_email_templates_public_name on public.email_templates using btree (template_name) TABLESPACE pg_default
where
  (visibility = 'public'::text);

create trigger update_email_templates_updated_at BEFORE
update on email_templates for EACH row
execute FUNCTION update_updated_at_column ();
```


## 4. Enable Row Level Security

```sql
alter table public.user_profiles enable row level security;
alter table public.exams enable row level security;
alter table public.teacher_invitations enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.student_invitations enable row level security;
alter table public.student_exam_assignments enable row level security;
alter table public.mcq enable row level security;
alter table public.saq enable row level security;
alter table public.coding enable row level security;
alter table public.student_responses enable row level security;
alter table public.proctoring_logs enable row level security;
alter table public.email_templates enable row level security;
```

## 5. Row Level Security Policies

### User Profiles Policies

```sql
-- Users can view own profile
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);

-- Users can view profiles they created
create policy "Users can view profiles they created" on public.user_profiles
  for select using (auth.uid() = created_by);

-- Users can insert own profile
create policy "Users can insert own profile" on public.user_profiles
  for insert with check (auth.uid() = id);

-- Allow profile creation by creators
create policy "Allow profile creation by creators" on public.user_profiles
  for insert with check ((auth.uid() = created_by) or (auth.uid() = id));

-- Users can update own profile
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- Creators can update profiles they created
create policy "Creators can update profiles they created" on public.user_profiles
  for update using (auth.uid() = created_by);

-- Admins can view all profiles
create policy "Admins can view all profiles" on public.user_profiles
  for select using (is_admin());

-- Admins can insert profiles
create policy "Admins can insert profiles" on public.user_profiles
  for insert with check (is_admin());

-- Admins can update all profiles
create policy "Admins can update all profiles" on public.user_profiles
  for update using (is_admin());
```

### Exams Policies

```sql
create policy "Exams are viewable by everyone" on public.exams
  for select using (true);

create policy "Exams insertable by teachers" on public.exams
  for insert with check (auth.uid() = created_by);

create policy "Teachers can only create exams for their department" on public.exams
  for insert with check (
    exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role = 'teacher'
      and department = exams.department
    )
  );

create policy "Exams updatable by creator" on public.exams
  for update using (auth.uid() = created_by);

create policy "Exams deletable by creator" on public.exams
  for delete using (auth.uid() = created_by);
```

### Teacher Invitations Policies

```sql
create policy "Teacher invitations viewable by admin" on public.teacher_invitations
  for select using (auth.uid() = admin_id);

create policy "Teachers can view their own invitation by token" on public.teacher_invitations
  for select using (true);

create policy "Teacher invitations insertable by admins" on public.teacher_invitations
  for insert with check (auth.uid() = admin_id);

create policy "Teacher invitations updatable by admin" on public.teacher_invitations
  for update using (auth.uid() = admin_id);

create policy "Teacher invitations deletable by admin" on public.teacher_invitations
  for delete using (auth.uid() = admin_id);
```

### Exam Sessions Policies

```sql
create policy "Exam sessions viewable by exam creator and session owner" on public.exam_sessions
  for select using (
    (auth.uid() = user_id) or
    exists (
      select 1 from exams
      where exams.id = exam_sessions.exam_id
      and exams.created_by = auth.uid()
    )
  );

create policy "Exam sessions insertable by students" on public.exam_sessions
  for insert with check (auth.uid() = user_id);

create policy "Exam sessions updatable by session owner or exam creator" on public.exam_sessions
  for update using (
    (auth.uid() = user_id) or
    exists (
      select 1 from exams
      where exams.id = exam_sessions.exam_id
      and exams.created_by = auth.uid()
    )
  );
```

### Student Invitations Policies

```sql
-- Teachers can manage their student invitations
create policy "Teachers can manage their student invitations" on public.student_invitations
  for all using (auth.uid() = teacher_id);

-- Teachers can only invite students from their department
create policy "Teachers can only invite from their department" on public.student_invitations
  for insert with check (
    exists (
      select 1 from user_profiles up
      join exams e on e.id = student_invitations.exam_id
      where up.id = auth.uid()
      and up.role = 'teacher'
      and up.department = e.department
    )
  );

-- Service role can access student invitations (for server-side operations)
create policy "Service role can access student invitations" on public.student_invitations
  for all using (auth.role() = 'service_role'::text);

-- Students can view invitations where they are the student
create policy "Students can view their invitations" on public.student_invitations
  for select using (auth.uid() = student_id);

-- Students can view invitations sent to their email (for logged-in users)
create policy "Students can view invitations by email" on public.student_invitations
  for select using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = student_invitations.student_email
    )
  );

-- Students can update invitations sent to their email (for accepting)
create policy "Students can update invitations by email" on public.student_invitations
  for update using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.email = student_invitations.student_email
    )
  );

-- Allow public read access for token-based validation (invitation acceptance flow)
create policy "Public access for token validation" on public.student_invitations
  for select using (true);

-- Admins can view all student invitations
create policy "Admins can view all student invitations" on public.student_invitations
  for select using (is_admin());
```

### Student Exam Assignments Policies

```sql
-- Teachers can view assignments they created
create policy "Teachers can view their assignments" on public.student_exam_assignments
  for select using (auth.uid() = assigned_by);

-- Teachers can create assignments
create policy "Teachers can create assignments" on public.student_exam_assignments
  for insert with check (
    auth.uid() = assigned_by
    and exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'teacher'
    )
  );

-- Teachers can update their assignments
create policy "Teachers can update their assignments" on public.student_exam_assignments
  for update using (auth.uid() = assigned_by);

-- Teachers can delete their assignments
create policy "Teachers can delete their assignments" on public.student_exam_assignments
  for delete using (auth.uid() = assigned_by);

-- Students can view their own assignments
create policy "Students can view their assignments" on public.student_exam_assignments
  for select using (
    auth.uid() = student_id
    or exists (
      select 1 from auth.users
      where id = auth.uid()
      and email = student_exam_assignments.student_email
    )
  );

-- Admins can view all assignments
create policy "Admins can view all assignments" on public.student_exam_assignments
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Service role can access all
create policy "Service role can access assignments" on public.student_exam_assignments
  for all using (auth.role() = 'service_role'::text);
```

### MCQ Policies

```sql
create policy "MCQ questions viewable by creators and invited students" on public.mcq
  for select using (
    -- Exam creator can view all questions for their exam
    exists (
      select 1 from exams
      where exams.id = mcq.exam_id
      and exams.created_by = auth.uid()
    )
    or
    -- Students can view their own answers
    (auth.uid() = mcq.user_id)
    or
    -- Students with valid invitations can view template questions (user_id IS NULL)
    (
      mcq.user_id IS NULL
      and exists (
        select 1 from student_invitations si
        where si.exam_id = mcq.exam_id
        and si.status = 'accepted'
        and si.student_id = auth.uid()
      )
    )
  );

create policy "MCQ questions insertable by exam creator" on public.mcq
  for insert with check (
    exists (
      select 1 from exams
      where exams.id = mcq.exam_id
      and exams.created_by = auth.uid()
    )
  );

create policy "MCQ questions updatable by exam creator or student (own answers)" on public.mcq
  for update using (
    exists (
      select 1 from exams
      where exams.id = mcq.exam_id
      and ((exams.created_by = auth.uid()) or (auth.uid() = mcq.user_id))
    )
  );

create policy "MCQ questions deletable by exam creator" on public.mcq
  for delete using (
    exists (
      select 1 from exams
      where exams.id = mcq.exam_id
      and exams.created_by = auth.uid()
    )
  );
```

### SAQ Policies

```sql
create policy "SAQ questions viewable by creators and invited students" on public.saq
  for select using (
    -- Exam creator can view all questions for their exam
    exists (
      select 1 from exams
      where exams.id = saq.exam_id
      and exams.created_by = auth.uid()
    )
    or
    -- Students can view their own answers
    (auth.uid() = saq.user_id)
    or
    -- Students with valid invitations can view template questions (user_id IS NULL)
    (
      saq.user_id IS NULL
      and exists (
        select 1 from student_invitations si
        where si.exam_id = saq.exam_id
        and si.status = 'accepted'
        and si.student_id = auth.uid()
      )
    )
  );

create policy "SAQ questions insertable by exam creator" on public.saq
  for insert with check (
    exists (
      select 1 from exams
      where exams.id = saq.exam_id
      and exams.created_by = auth.uid()
    )
  );

create policy "SAQ questions updatable by exam creator or student (own answers)" on public.saq
  for update using (
    exists (
      select 1 from exams
      where exams.id = saq.exam_id
      and ((exams.created_by = auth.uid()) or (auth.uid() = saq.user_id))
    )
  );

create policy "SAQ questions deletable by exam creator" on public.saq
  for delete using (
    exists (
      select 1 from exams
      where exams.id = saq.exam_id
      and exams.created_by = auth.uid()
    )
  );
```

### Coding Policies

```sql
create policy "Coding questions viewable by creators and invited students" on public.coding
  for select using (
    -- Exam creator can view all questions for their exam
    exists (
      select 1 from exams
      where exams.id = coding.exam_id
      and exams.created_by = auth.uid()
    )
    or
    -- Students can view their own answers
    (auth.uid() = coding.user_id)
    or
    -- Students with valid invitations can view template questions (user_id IS NULL)
    (
      coding.user_id IS NULL
      and exists (
        select 1 from student_invitations si
        where si.exam_id = coding.exam_id
        and si.status = 'accepted'
        and si.student_id = auth.uid()
      )
    )
  );

create policy "Coding questions insertable by exam creator" on public.coding
  for insert with check (
    exists (
      select 1 from exams
      where exams.id = coding.exam_id
      and exams.created_by = auth.uid()
    )
  );

create policy "Coding questions updatable by exam creator or student (own answers)" on public.coding
  for update using (
    exists (
      select 1 from exams
      where exams.id = coding.exam_id
      and ((exams.created_by = auth.uid()) or (auth.uid() = coding.user_id))
    )
  );

create policy "Coding questions deletable by exam creator" on public.coding
  for delete using (
    exists (
      select 1 from exams
      where exams.id = coding.exam_id
      and exams.created_by = auth.uid()
    )
  );
```

### Student Responses Policies

```sql
-- Students can only view their own responses
create policy "Students can view own responses" on public.student_responses
  for select using (
    auth.uid() = student_id OR
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'student'
    )
  );

-- Teachers can view responses for their exams
create policy "Teachers can view exam responses" on public.student_responses
  for select using (
    exists (
      select 1 from exams e
      join user_profiles up on up.id = auth.uid()
      where e.id = student_responses.exam_id
      and e.created_by = auth.uid()
      and up.role = 'teacher'
    )
  );

-- Teachers can update (grade) responses for their exams
create policy "Teachers can update exam responses" on public.student_responses
  for update using (
    exists (
      select 1 from exams e
      join user_profiles up on up.id = auth.uid()
      where e.id = student_responses.exam_id
      and e.created_by = auth.uid()
      and up.role = 'teacher'
    )
  );

-- Students can insert their own responses
create policy "Students can insert own responses" on public.student_responses
  for insert with check (
    auth.uid() = student_id and
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'student'
    )
  );

-- Students can update their own responses (before final submission)
create policy "Students can update own responses" on public.student_responses
  for update using (
    auth.uid() = student_id and
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'student'
    )
  );

-- Admins have full access
create policy "Admins have full access to student responses" on public.student_responses
  for all using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

### Proctoring Logs Policies

```sql
create policy "Proctoring logs viewable by exam creator" on public.proctoring_logs
  for select using (
    exists (
      select 1 from exam_sessions
      join exams on exams.id = exam_sessions.exam_id
      where exam_sessions.id = proctoring_logs.session_id
      and exams.created_by = auth.uid()
    )
  );

create policy "Proctoring logs insertable by session owner" on public.proctoring_logs
  for insert with check (
    exists (
      select 1 from exam_sessions
      where exam_sessions.id = proctoring_logs.session_id
      and exam_sessions.user_id = auth.uid()
    )
  );
```

### Email Templates Policies

```sql
-- Teachers can view accessible templates
-- Teachers can see:
--   - Their own templates
--   - Default templates matching their role
--   - Public templates (non-default)
--   - Custom templates they're allowed to see
create policy "Teachers can view accessible templates" on public.email_templates
  for select using (
    -- Own templates (created by the user)
    auth.uid() = created_by
    or
    -- System default templates (only if role matches)
    (
      is_default = true
      and role = (select role from user_profiles where id = auth.uid() limit 1)
    )
    or
    -- Public templates (non-default, shared by other users)
    (
      visibility = 'public'
      and is_default = false
    )
    or
    -- Custom visibility templates (user is in allowed_user_ids list)
    (
      visibility = 'custom'
      and allowed_user_ids @> to_jsonb(auth.uid()::text)
    )
  );

-- Admins can view ALL templates
create policy "Admins can view all email templates" on public.email_templates
  for select using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Teachers and Admins can create templates
create policy "Teachers and admins can create templates" on public.email_templates
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1 from user_profiles
      where id = auth.uid()
      and role in ('admin', 'teacher')
    )
    and is_default = false  -- Users cannot create default templates (only system can)
  );

-- Users can update their OWN non-default templates
create policy "Users can update own non-default templates" on public.email_templates
  for update using (
    auth.uid() = created_by
    and is_default = false  -- CRITICAL: Cannot edit default templates
  )
  with check (
    auth.uid() = created_by
    and is_default = false  -- Ensure is_default remains false
  );

-- Admins can update ANY template (including defaults)
create policy "Admins can update all templates" on public.email_templates
  for update using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can delete their OWN non-default templates
create policy "Users can delete own non-default templates" on public.email_templates
  for delete using (
    auth.uid() = created_by
    and is_default = false  -- CRITICAL: Cannot delete default templates
  );

-- Admins can delete ANY non-default template
-- Note: Even admins cannot delete default templates
create policy "Admins can delete all non-default templates" on public.email_templates
  for delete using (
    is_default = false  -- Even admins cannot delete default templates
    and exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

**Important Notes:**
- Default templates (`is_default = true`):
  - Admins **CAN EDIT** them (for system maintenance)
  - Nobody can **DELETE** them (including admins)
- Teachers can only edit/delete templates they created
- Admins can edit ANY template (including defaults)
- Admins can delete ANY non-default template
- Public templates can be VIEWED by everyone but EDITED only by creator/admin
- Custom visibility uses JSONB containment operator (`@>`)

---

## 6. Additional Triggers and Functions

### Auto-update timestamp trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_exam_assignments_updated_at
    BEFORE UPDATE ON student_exam_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_mcq_exam_order ON public.mcq(exam_id, question_order);
CREATE INDEX IF NOT EXISTS idx_saq_exam_order ON public.saq(exam_id, question_order);
CREATE INDEX IF NOT EXISTS idx_coding_exam_order ON public.coding(exam_id, question_order);
CREATE INDEX IF NOT EXISTS idx_saq_graded_by ON public.saq(graded_by);
CREATE INDEX IF NOT EXISTS idx_saq_graded_at ON public.saq(graded_at);
CREATE INDEX IF NOT EXISTS idx_coding_graded_by ON public.coding(graded_by);
CREATE INDEX IF NOT EXISTS idx_coding_graded_at ON public.coding(graded_at);
CREATE INDEX IF NOT EXISTS idx_student_responses_exam_id ON public.student_responses(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_responses_student_email ON public.student_responses(student_email);
CREATE INDEX IF NOT EXISTS idx_student_responses_grading_status ON public.student_responses(grading_status);
CREATE INDEX IF NOT EXISTS idx_student_responses_submitted_at ON public.student_responses(submitted_at);
```

## 7. Setup Instructions

1. **Copy and paste each section** into your Supabase SQL Editor
2. **Run them in order** (Extensions → Functions → Tables → RLS → Policies → Triggers)
3. **Verify all tables are created** in your Supabase dashboard
4. **Test the policies** by trying to insert/select data with different user roles

## 8. Creating Your First Admin User

After setting up the database, you'll need to create your first admin user. Here are two approaches:

### Option A: Create Admin via Supabase Dashboard

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Add User"
3. Enter email and password
4. After user is created, go to SQL Editor and run:

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

### Option B: Create Admin via SQL (Recommended)

Run this in SQL Editor (replace email/password):

```sql
-- This requires service_role key, so run it in Supabase SQL Editor
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

-- Then create the profile (replace the email with the one you used above)
INSERT INTO public.user_profiles (id, role, first_name, last_name, verified)
SELECT id, 'admin', 'Platform', 'Admin', true
FROM auth.users
WHERE email = 'admin@yourplatform.com';
```

## 10. Environment Variables Required

Make sure you have these environment variables in your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (for teacher invitations)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_email
SMTP_PASS=your_smtp_password
```

## 11. Exam Assignment Architecture

### New Multi-Exam Assignment System

The platform now supports assigning **multiple exams per student** using the `student_exam_assignments` table.

#### Table Relationships

| Table | Purpose | Rows per Student |
|-------|---------|------------------|
| `student_invitations` | Invite student to create account | 1 row (the invitation itself) |
| `student_exam_assignments` | Track which exams student CAN take | N rows (one per assigned exam) |
| `exam_sessions` | Track which exam student IS/HAS taking | N rows (one per exam attempt) |

#### Data Flow

1. **Teacher invites student** → Creates 1 row in `student_invitations`
2. **Teacher assigns exams** → Creates N rows in `student_exam_assignments` (can be done during invitation or later)
3. **Student accepts invitation** → Creates user account
4. **Student starts exam** → Creates 1 row in `exam_sessions` per exam attempt
5. **System loads questions** → Uses `exam_id` from `exam_sessions` to fetch correct questions
6. **Student submits** → Updates `exam_sessions` with score and marks as completed

#### Important Notes

- **`student_invitations.exam_id`** is now **deprecated** - use `student_exam_assignments` instead
- **`exam_sessions.exam_id`** is **NOT deprecated** - still needed to track which exam is being taken
- Both tables need `exam_id`, but for different purposes:
  - `student_exam_assignments.exam_id` = "You are ALLOWED to take this exam"
  - `exam_sessions.exam_id` = "You are CURRENTLY TAKING (or HAVE TAKEN) this exam"

#### API Endpoints

- `GET /api/students` - Returns invitations with `assigned_exams` array
- `POST /api/students` - Accepts optional `examIds` array for multiple exam assignments
- `POST /api/students/assign-exam` - Assign additional exams to existing students
- `DELETE /api/students/unassign-exam` - Revoke exam assignments (soft delete)

#### Migration Notes

If you have existing data in `student_invitations.exam_id`, you can migrate it to the new table:

```sql
-- Migrate existing exam assignments to new table
INSERT INTO public.student_exam_assignments (
  student_email,
  student_id,
  exam_id,
  assigned_by,
  department_id,
  assigned_at,
  status
)
SELECT
  si.student_email,
  si.student_id,
  si.exam_id,
  si.teacher_id,
  si.department_id,
  si.created_at,
  CASE
    WHEN si.status = 'accepted' THEN 'active'
    ELSE 'active'
  END as status
FROM public.student_invitations si
WHERE si.exam_id IS NOT NULL
ON CONFLICT (student_email, exam_id) DO NOTHING;
```

---

## 12. Important Notes on Database Triggers

### ⚠️ Email Template Default Assignment

**Note:** As of 2025-12-23, the automatic email template assignment triggers have been **removed** because they were causing errors with outdated column names.

**Previously (REMOVED):**
```sql
-- These triggers are NO LONGER USED
DROP TRIGGER IF EXISTS set_default_template_on_user_creation ON user_profiles;
DROP TRIGGER IF EXISTS trigger_assign_default_email_templates ON user_profiles;
DROP FUNCTION IF EXISTS auto_set_default_template();
DROP FUNCTION IF EXISTS assign_default_email_templates();
```

**Current Implementation:**
Default email templates are now assigned **in the API layer** during user creation:
- `app/api/students/accept-invitation/route.ts` - Handles student profile creation with default templates
- `app/api/teachers/route.ts` - Could be enhanced similarly for teacher creation

**Benefits of API-Level Assignment:**
1. ✅ More maintainable - easier to debug and test
2. ✅ Better error handling - can show specific errors to users
3. ✅ No silent failures from outdated trigger code
4. ✅ Explicit and visible in code reviews

**If you want to re-enable triggers**, ensure they reference the correct columns:
- `active_student_invitation_with_exam_template_id`
- `active_student_invitation_general_template_id`
- `active_teacher_invitation_template_id`
- `active_exam_reminder_template_id`
- `active_results_notification_template_id`

---

## 13. Email Template System

### Template Types

The platform supports 5 types of email templates:

| Template Type | Purpose | Required Variables |
|--------------|---------|-------------------|
| `student_invitation_with_exam` | Student invitation WITH exam assignment | `{firstName}`, `{lastName}`, `{examTitle}`, `{institutionName}`, `{expirationDate}`, `{inviteUrl}` |
| `student_invitation_general` | Student invitation WITHOUT exam assignment | `{firstName}`, `{lastName}`, `{institutionName}`, `{expirationDate}`, `{inviteUrl}` |
| `teacher_invitation` | Teacher invitation | `{firstName}`, `{lastName}`, `{institutionName}`, `{departmentName}`, `{invitedBy}`, `{expirationDate}`, `{inviteUrl}` |
| `exam_reminder` | Exam reminder notification | `{firstName}`, `{lastName}`, `{examTitle}`, `{startTime}` |
| `results_notification` | Exam results notification | `{firstName}`, `{lastName}`, `{examTitle}`, `{score}`, `{totalScore}` |

### Variable Format Support

The email rendering system supports **both single and double brace formats**:
- Single braces: `{firstName}`, `{lastName}`
- Double braces: `{{firstName}}`, `{{lastName}}`
- Snake case: `{{teacher_name}}`, `{{invited_by}}`, `{{department_name}}`

This provides backward compatibility with existing templates.

### Active Template Resolution

When sending emails, the system follows this priority:
1. User's active template (from `user_profiles.active_*_template_id`)
2. Default template for that type (`is_default = true`)
3. Fallback to hardcoded HTML (if no templates exist)

---

## 14. Schema Version History

**2025-12-23:**
- Removed broken email template assignment triggers
- Moved default template assignment to API layer
- Updated `email_templates` check constraint to include new template types

**2025-12-22:**
- Added 5 email template columns to `user_profiles` table
- Split `student_invitation` into `student_invitation_with_exam` and `student_invitation_general`
- Added indexes for email template foreign keys

**Earlier:**
- Initial schema setup with basic tables and RLS policies
- Added `student_exam_assignments` table for multi-exam support
