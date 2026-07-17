-- Cria o bucket "exames" no Supabase Storage e libera o acesso do app (anon role).
-- Rode UMA VEZ no SQL Editor do Supabase (Dashboard → SQL Editor → New query → cole tudo → Run).

-- 1) Cria o bucket como PÚBLICO (a URL do arquivo é aberta pra quem tem o link).
insert into storage.buckets (id, name, public)
values ('exames', 'exames', true)
on conflict (id) do update set public = true;

-- 2) Políticas de acesso — o app usa o anon key.
-- Se as políticas já existirem, o CREATE POLICY vai falhar; nesse caso, ignore o erro OU
-- rode antes: drop policy if exists "..." on storage.objects;

create policy "epona: anon upload exames"
  on storage.objects for insert to anon
  with check (bucket_id = 'exames');

create policy "epona: anon read exames"
  on storage.objects for select to anon
  using (bucket_id = 'exames');

create policy "epona: anon update exames"
  on storage.objects for update to anon
  using (bucket_id = 'exames');

create policy "epona: anon delete exames"
  on storage.objects for delete to anon
  using (bucket_id = 'exames');
