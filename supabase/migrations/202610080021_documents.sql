begin;

-- Supabase owns the storage schema. Do not create a substitute in production.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('school-documents','school-documents',false,2097152,array['application/pdf']);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  class_id uuid,
  title text not null check(length(btrim(title)) between 1 and 160),
  file_size integer not null check(file_size between 1 and 2097152),
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'uploading' check(status in ('uploading','draft','published','withdrawn')),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  record_version integer not null default 1 check(record_version>0),
  unique(id,school_id),
  foreign key(class_id,school_id) references public.classes(id,school_id)
);
create index documents_school_order on public.documents(school_id,created_at desc,id);
create index documents_class on public.documents(school_id,class_id);
alter table public.documents enable row level security;
revoke all on public.documents from public,anon,authenticated;
grant select on public.documents to authenticated;

-- Documents deliberately use the confirmed current-class announcement rules.
create function private.document_read(target_document uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.documents d where d.id=target_document and (
    private.announcement_staff_access(d.school_id,d.class_id,'school_admin') or
    private.announcement_staff_access(d.school_id,d.class_id,'teacher') or
    (d.status='published' and (
      (d.class_id is null and private.my_member_with_role(d.school_id,'teacher') is not null) or
      exists(select 1 from private.my_student_ids(d.school_id) learner
        where private.announcement_learner_access(d.school_id,d.class_id,learner))))));
$$;
create function private.document_storage_read(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.documents d where object_name=d.school_id::text||'/'||d.id::text||'.pdf'
    and private.document_read(d.id));
$$;
create function private.document_storage_insert(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.documents d where object_name=d.school_id::text||'/'||d.id::text||'.pdf'
    and d.status='uploading' and d.created_by=auth.uid() and (
      private.announcement_staff_access(d.school_id,d.class_id,'school_admin') or
      private.announcement_staff_access(d.school_id,d.class_id,'teacher')));
$$;
revoke all on function private.document_read(uuid),private.document_storage_read(text),
  private.document_storage_insert(text) from public,anon;
grant execute on function private.document_read(uuid),private.document_storage_read(text),
  private.document_storage_insert(text) to authenticated;
create policy document_read on public.documents for select to authenticated using(private.document_read(id));

create policy school_document_read on storage.objects for select to authenticated
  using(bucket_id='school-documents' and private.document_storage_read(name));
create policy school_document_insert on storage.objects for insert to authenticated
  with check(bucket_id='school-documents' and private.document_storage_insert(name));
-- Restrictive guards prevent an unrelated permissive bucket policy from widening these grants.
create policy school_document_read_guard on storage.objects as restrictive for select to public
  using(bucket_id<>'school-documents' or private.document_storage_read(name));
create policy school_document_insert_guard on storage.objects as restrictive for insert to public
  with check(bucket_id<>'school-documents' or private.document_storage_insert(name));
create policy school_document_no_overwrite on storage.objects as restrictive for update to public
  using(bucket_id<>'school-documents') with check(bucket_id<>'school-documents');
create policy school_document_no_delete on storage.objects as restrictive for delete to public
  using(bucket_id<>'school-documents');

create function public.prepare_document(target_school uuid,staff_mode text,target_class uuid,
  new_title text,expected_size integer,content_sha256 text)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved_id uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  if not coalesce(private.announcement_staff_access(target_school,target_class,staff_mode),false) then
    raise exception 'Document staff access required' using errcode='42501'; end if;
  if new_title is null or length(btrim(new_title)) not between 1 and 160 or new_title !~ '[^[:space:]]' or
    expected_size is null or expected_size not between 1 and 2097152 or content_sha256 is null or content_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid document' using errcode='22023'; end if;
  insert into public.documents(school_id,class_id,title,file_size,sha256,created_by)
    values(target_school,target_class,btrim(new_title),expected_size,content_sha256,auth.uid()) returning id into saved_id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'document.prepare',saved_id);
  return saved_id;
end;
$$;

create function public.change_document(target_school uuid,staff_mode text,target_document uuid,
  expected_version integer,new_status text)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.documents%rowtype;
begin
  perform 1 from public.schools where id=target_school for update;
  select * into previous from public.documents d where d.id=target_document and d.school_id=target_school;
  if not found or not coalesce(private.announcement_staff_access(target_school,previous.class_id,staff_mode),false) then
    raise exception 'Document staff access required' using errcode='42501'; end if;
  if expected_version is null or previous.record_version<>expected_version then
    raise exception 'Document changed; reload' using errcode='40001'; end if;
  if new_status is null or new_status not in ('draft','published','withdrawn') or
    (new_status='draft' and previous.status not in ('uploading','draft')) then
    raise exception 'Invalid document state' using errcode='22023'; end if;
  if new_status<>'withdrawn' and not exists(select 1 from storage.objects o
    where o.bucket_id='school-documents' and o.name=target_school::text||'/'||target_document::text||'.pdf'
      and o.metadata->>'mimetype'='application/pdf'
      and o.metadata->>'size'=previous.file_size::text) then
    raise exception 'Upload is missing or does not match' using errcode='22023'; end if;
  update public.documents set status=new_status,record_version=record_version+1,updated_at=now() where id=target_document;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'document.change',target_document,jsonb_build_object('previous_status',previous.status,'status',new_status));
end;
$$;

create function public.list_documents(target_school uuid,portal_mode text,
  selected_student uuid default null,page_number integer default 1,target_document uuid default null)
returns table(id uuid,class_id uuid,audience_label text,title text,file_size integer,sha256 text,
  status text,record_version integer,can_edit boolean)
language plpgsql stable security definer set search_path='' as $$
declare member uuid; learner uuid;
begin
  if portal_mode is null or portal_mode not in ('school_admin','teacher','student','guardian') then
    raise exception 'Document access required' using errcode='42501'; end if;
  member := private.my_member_with_role(target_school,portal_mode::public.school_role);
  if member is null then raise exception 'Document access required' using errcode='42501'; end if;
  if page_number is null or page_number not between 1 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  if portal_mode<>'guardian' and selected_student is not null then raise exception 'Invalid child selection' using errcode='22023'; end if;
  if portal_mode='student' then
    select st.id into learner from public.students st where st.school_id=target_school and st.membership_id=member;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  elsif portal_mode='guardian' then
    select sg.student_id into learner from public.student_guardians sg where sg.school_id=target_school
      and sg.guardian_id=private.my_guardian_id(target_school) and sg.access_enabled and sg.student_id=selected_student;
    if learner is null then raise exception 'Learner unavailable' using errcode='42501'; end if;
  end if;
  return query select d.id,d.class_id,
    case when d.class_id is null then 'Whole school' else g.name||' · '||c.name||' · '||y.name end,
    d.title,d.file_size,d.sha256,d.status,d.record_version,
    coalesce(private.announcement_staff_access(target_school,d.class_id,portal_mode),false)
    from public.documents d
    left join public.classes c on c.id=d.class_id and c.school_id=d.school_id
    left join public.grades g on g.id=c.grade_id and g.school_id=c.school_id
    left join public.academic_years y on y.id=c.academic_year_id and y.school_id=c.school_id
    where d.school_id=target_school and (target_document is null or d.id=target_document) and (
      private.announcement_staff_access(target_school,d.class_id,portal_mode) or
      (d.status='published' and (
        (portal_mode='teacher' and d.class_id is null) or
        (portal_mode in ('student','guardian') and private.announcement_learner_access(target_school,d.class_id,learner)))))
    order by d.created_at desc,d.id limit 51 offset ((page_number-1)*50);
end;
$$;
revoke all on function public.prepare_document(uuid,text,uuid,text,integer,text),
  public.change_document(uuid,text,uuid,integer,text),public.list_documents(uuid,text,uuid,integer,uuid) from public,anon;
grant execute on function public.prepare_document(uuid,text,uuid,text,integer,text),
  public.change_document(uuid,text,uuid,integer,text),public.list_documents(uuid,text,uuid,integer,uuid) to authenticated;
commit;
---file ran