
begin;
create function private.block_audit_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Audit history is append-only' using errcode = '42501';
end;
$$;
revoke all on function private.block_audit_changes() from public, anon, authenticated;
create trigger audit_append_only before update or delete on public.audit_events
  for each row execute function private.block_audit_changes();
create trigger audit_no_truncate before truncate on public.audit_events
  for each statement execute function private.block_audit_changes();

create table public.record_history (
  id bigint generated always as identity primary key,
  school_id uuid not null references public.schools(id),
  record_kind text not null check (record_kind in
    ('academic_years','academic_terms','grades','subjects','classes','students','teachers','guardians')),
  record_id uuid not null,
  replaced_version integer not null,
  previous jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index record_history_lookup on public.record_history(school_id, record_kind, record_id, changed_at desc);
alter table public.record_history enable row level security;
revoke all on public.record_history from public, anon, authenticated;
grant select on public.record_history to authenticated;
create policy admin_read on public.record_history for select to authenticated
  using (private.is_school_admin(school_id));

create or replace function public.correct_school_record(
  target_school uuid, record_kind text, target_record uuid,
  expected_version integer, corrected_name text, corrected_reference text default null
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  next_version integer;
  previous_row jsonb;
  person_record boolean;
  clean_name text := btrim(corrected_name);
  clean_reference text := btrim(corrected_reference);
begin
  if not private.is_school_admin(target_school) then
    raise exception 'School administrator access required' using errcode='42501';
  end if;
  if record_kind is null or record_kind not in
    ('academic_years','academic_terms','grades','subjects','classes','students','teachers','guardians') then
    raise exception 'Unsupported record type' using errcode='22023';
  end if;
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'School administrator access required' using errcode='42501'; end if;
  person_record := record_kind in ('students','teachers','guardians');
  if expected_version is null or expected_version < 1 or target_record is null
    or clean_name is null or length(clean_name) not between 1 and (case when person_record then 120 else 80 end)
    or (person_record and (clean_reference is null or length(clean_reference) not between 1 and 40))
    or (not person_record and corrected_reference is not null) then
    raise exception 'Invalid correction fields' using errcode='22023';
  end if;
  if record_kind='grades' and clean_name ~* '^grade[[:space:]]*([0-9]+|r)$' then
    clean_name := regexp_replace(clean_name,'^grade[[:space:]]*([0-9]+|r)$','Grade \1','i');
    if lower(clean_name)='grade r' then clean_name := 'Grade R'; end if;
  end if;
  -- Identifiers come only from the allowlist above. All data is parameterized.
  execute format('select to_jsonb(t) from public.%I t where id=$1 and school_id=$2 and record_version=$3', record_kind)
    into previous_row using target_record, target_school, expected_version;
  if person_record then
    execute format('update public.%I set full_name=$1, reference=$2, record_version=record_version+1
      where id=$3 and school_id=$4 and record_version=$5 returning record_version',record_kind)
      into next_version using clean_name,clean_reference,target_record,target_school,expected_version;
  else
    execute format('update public.%I set name=$1, record_version=record_version+1
      where id=$2 and school_id=$3 and record_version=$4 returning record_version',record_kind)
      into next_version using clean_name,target_record,target_school,expected_version;
  end if;
  if next_version is null or previous_row is null then
    raise exception 'Record unavailable or changed. Reload before editing.' using errcode='40001';
  end if;
  insert into public.record_history(school_id,record_kind,record_id,replaced_version,previous,changed_by)
    values(target_school,record_kind,target_record,expected_version,previous_row,auth.uid());
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),record_kind||'.correct',target_record,
      jsonb_build_object('previous_version',expected_version,'record_version',next_version,
        'fields',case when person_record then jsonb_build_array('full_name','reference') else jsonb_build_array('name') end));
  return next_version;
end;
$$;

create function public.purge_record_history(target_school uuid, retain interval default interval '2 years')
returns integer language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  perform 1 from public.schools where id = target_school for update;
  if not private.is_school_admin(target_school) then
    raise exception 'School administrator access required' using errcode='42501'; end if;
  if retain is null or retain < interval '30 days' then
    raise exception 'Retention must be at least 30 days' using errcode='22023'; end if;
  delete from public.record_history where school_id = target_school and changed_at < now() - retain;
  get diagnostics removed = row_count;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'record_history.purge',target_school,
      jsonb_build_object('removed',removed,'retained_for',retain::text));
  return removed;
end;
$$;
revoke all on function public.purge_record_history(uuid,interval) from public, anon;
grant execute on function public.purge_record_history(uuid,interval) to authenticated;

alter table public.school_invitations alter column invited_by drop not null;
alter table public.school_invitations
  drop constraint school_invitations_invited_by_fkey,
  add constraint school_invitations_invited_by_fkey foreign key (invited_by) references auth.users(id) on delete set null,
  drop constraint school_invitations_accepted_by_fkey,
  add constraint school_invitations_accepted_by_fkey foreign key (accepted_by) references auth.users(id) on delete set null;

drop trigger enrollment_dates on public.enrollments;
drop function private.validate_enrollment_dates();

create function private.erase_school_member(target_school uuid,target_membership uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare member_user uuid; member_email text; kind text; person uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  select m.user_id,u.email into member_user,member_email from public.school_memberships m
    join auth.users u on u.id=m.user_id where m.id=target_membership and m.school_id=target_school for update of m;
  if not found then raise exception 'Membership unavailable' using errcode='22023'; end if;
  if exists(select 1 from public.membership_roles where membership_id=target_membership and role='school_admin')
    and not exists(select 1 from public.school_memberships m join public.membership_roles r on r.membership_id=m.id
      where m.school_id=target_school and m.id<>target_membership and m.status='active' and r.role='school_admin') then
    raise exception 'Keep another active School Admin' using errcode='23514'; end if;
  foreach kind in array array['students','teachers','guardians'] loop
    for person in execute format('select id from public.%I where school_id=$1 and membership_id=$2 for update',kind)
      using target_school,target_membership loop
      if kind='students' then
        update public.student_guardians set access_enabled=false,relationship='[erased]',record_version=record_version+1
          where school_id=target_school and student_id=person;
      elsif kind='guardians' then
        update public.student_guardians set access_enabled=false,relationship='[erased]',record_version=record_version+1
          where school_id=target_school and guardian_id=person;
      end if;
      delete from public.record_history where school_id=target_school and record_kind=kind and record_id=person;
      execute format('update public.%I set full_name=''[erased]'',reference=''ERASED-''||replace(id::text,''-'',''''),membership_id=null,record_version=record_version+1 where id=$1 and school_id=$2',kind)
        using person,target_school;
      insert into public.audit_events(school_id,actor_user_id,action,record_id)
        values(target_school,null,kind||'.erased',person);
    end loop;
  end loop;
  update public.school_invitations set email='erased-'||id::text||'@example.invalid',display_name='[erased]',
    status=case when status='pending' then 'revoked' else status end,delivery_claim=null,accepted_by=null
    where school_id=target_school and (accepted_by=member_user or email=lower(member_email));
  update public.school_invitations set invited_by=null,
    status=case when status='pending' then 'revoked' else status end,delivery_claim=null
    where school_id=target_school and invited_by=member_user;
  delete from public.school_memberships where school_id=target_school and id=target_membership;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,null,'membership.erased',target_membership);
end;
$$;
revoke all on function private.erase_school_member(uuid,uuid) from public,anon,authenticated,service_role;
commit;
