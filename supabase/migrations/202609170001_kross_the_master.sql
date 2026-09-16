create extension if not exists pgcrypto;

create type public.kross_role as enum ('student', 'teacher', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  role public.kross_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','paused','completed')),
  enrolled_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_path text,
  duration_seconds integer not null check (duration_seconds between 1 and 14400),
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.learning_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  kind text not null check (kind in ('vocabulary','shadowing','fill','translation','quiz')),
  korean text not null,
  vietnamese text,
  media_path text,
  stop_second integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.student_progress (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  furthest_second integer not null default 0,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_id, lesson_id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  answer_text text,
  recording_path text,
  pronunciation_score integer check (pronunciation_score between 0 and 100),
  teacher_feedback text,
  submitted_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('teacher','admin')) $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.invitations enable row level security;
alter table public.lessons enable row level security;
alter table public.learning_items enable row level security;
alter table public.student_progress enable row level security;
alter table public.submissions enable row level security;

create policy "profile self or staff" on public.profiles for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "course enrolled or staff" on public.courses for select to authenticated using (public.is_staff() or exists(select 1 from public.enrollments e where e.course_id=id and e.student_id=auth.uid() and e.status='active'));
create policy "enrollment self or staff" on public.enrollments for select to authenticated using (student_id=auth.uid() or public.is_staff());
create policy "staff manages invitations" on public.invitations for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "lesson enrolled or staff" on public.lessons for select to authenticated using (public.is_staff() or exists(select 1 from public.enrollments e where e.course_id=course_id and e.student_id=auth.uid() and e.status='active'));
create policy "item enrolled or staff" on public.learning_items for select to authenticated using (public.is_staff() or exists(select 1 from public.enrollments e where e.course_id=course_id and e.student_id=auth.uid() and e.status='active'));
create policy "student progress own" on public.student_progress for all to authenticated using (student_id=auth.uid() or public.is_staff()) with check (student_id=auth.uid() or public.is_staff());
create policy "submission own or staff" on public.submissions for select to authenticated using (student_id=auth.uid() or public.is_staff());
create policy "student creates submission" on public.submissions for insert to authenticated with check (student_id=auth.uid());
create policy "staff updates submission" on public.submissions for update to authenticated using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-media', 'lesson-media', false, 5368709120)
on conflict (id) do nothing;

create policy "students read enrolled media" on storage.objects for select to authenticated
using (
  bucket_id='lesson-media' and (
    public.is_staff() or exists(
      select 1 from public.enrollments e
      where e.student_id=auth.uid() and e.status='active'
        and e.course_id::text=(storage.foldername(name))[1]
    )
  )
);
create policy "staff uploads media" on storage.objects for insert to authenticated
with check (bucket_id='lesson-media' and public.is_staff());
create policy "staff manages media" on storage.objects for update to authenticated
using (bucket_id='lesson-media' and public.is_staff()) with check (bucket_id='lesson-media' and public.is_staff());
create policy "staff deletes media" on storage.objects for delete to authenticated
using (bucket_id='lesson-media' and public.is_staff());
