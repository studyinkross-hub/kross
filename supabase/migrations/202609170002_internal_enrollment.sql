alter table public.invitations alter column created_by drop not null;

create unique index if not exists courses_level_unique on public.courses(level);

insert into public.courses(title, level) values
  ('기초 · 초급 1', '기초+초급1'),
  ('초급 2', '초급2'),
  ('초급 회화', '초급회화'),
  ('중급 1', '중급1'),
  ('중급 2', '중급2'),
  ('중급 회화', '중급회화'),
  ('TOPIK 1', 'TOPIK1'),
  ('TOPIK 2 · 3–4급', 'TOPIK2 3·4급'),
  ('TOPIK 2 · 5–6급', 'TOPIK2 5·6급')
on conflict (level) do nothing;
