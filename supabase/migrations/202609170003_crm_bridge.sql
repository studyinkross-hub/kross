create table public.crm_student_links (
  crm_student_id uuid primary key,
  student_id uuid unique references public.profiles(id),
  email text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.crm_student_links enable row level security;
alter table public.invitations add column crm_student_id uuid references public.crm_student_links(crm_student_id);

create table public.learning_records (
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_key text not null,
  id text not null,
  kind text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(student_id,lesson_key,id)
);
alter table public.learning_records enable row level security;

-- The service authenticates the invite before creating the Auth user. Consume it
-- and attach the enrollment atomically; concurrent attempts cannot claim a link twice.
create function public.complete_invitation(invitation_id uuid, user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where id=invitation_id for update;
  if not found or inv.used_at is not null or inv.expires_at<=now() then
    raise exception 'INVITE_INVALID';
  end if;
  if inv.crm_student_id is not null then
    perform 1 from public.crm_student_links where crm_student_id=inv.crm_student_id for update;
    if exists(select 1 from public.crm_student_links where crm_student_id=inv.crm_student_id and student_id is not null) then
      raise exception 'ALREADY_LINKED';
    end if;
    update public.crm_student_links set student_id=user_id where crm_student_id=inv.crm_student_id;
  end if;
  insert into public.enrollments(course_id,student_id,status) values(inv.course_id,user_id,'active');
  update public.invitations set used_at=now() where id=inv.id;
end $$;
revoke all on function public.complete_invitation(uuid,uuid) from public, anon, authenticated;
grant execute on function public.complete_invitation(uuid,uuid) to service_role;
