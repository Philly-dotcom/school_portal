begin;

alter table public.school_invitations add column bulk boolean not null default false;

create or replace function public.create_school_invitation(target_school uuid,invite_email text,invite_name text,invite_roles public.school_role[])
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation_id uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if invite_roles is null or cardinality(invite_roles) not between 1 and 4 or array_position(invite_roles,null) is not null then
    raise exception 'Select at least one valid role' using errcode='22023'; end if;
  if exists(select 1 from public.school_invitations where school_id=target_school and not bulk and created_at>now()-interval '1 minute') then
    raise exception 'Wait a minute before creating another invitation' using errcode='P0001'; end if;
  if (select count(*) from public.school_invitations where school_id=target_school and not bulk and created_at>now()-interval '1 day')>=50 then
    raise exception 'Daily invitation limit reached' using errcode='P0001'; end if;
  update public.school_invitations set status='revoked' where school_id=target_school
    and email=lower(trim(invite_email)) and status='pending' and expires_at<=now();
  insert into public.school_invitations(school_id,email,display_name,roles,invited_by)
    values(target_school,lower(trim(invite_email)),trim(invite_name),array(select distinct unnest(invite_roles)),auth.uid()) returning id into invitation_id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'invitation.created',invitation_id);
  return invitation_id;
end;
$$;

create function public.create_school_invitations_bulk(target_school uuid, invites jsonb)
returns table(created_count integer, skipped_count integer)
language plpgsql security definer set search_path='' as $$
declare
  item jsonb; row_no integer := 0; made integer := 0; skipped integer := 0;
  clean_email text; clean_name text; parsed_roles public.school_role[]; invitation_id uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if invites is null or jsonb_typeof(invites) <> 'array' or jsonb_array_length(invites) not between 1 and 200 then
    raise exception 'Provide between 1 and 200 invitations' using errcode='22023'; end if;
  if (select count(*) from public.school_invitations where school_id=target_school and bulk and created_at>now()-interval '1 day')
      + jsonb_array_length(invites) > 500 then
    raise exception 'Daily bulk invitation limit reached' using errcode='P0001'; end if;
  update public.school_invitations set status='revoked' where school_id=target_school and status='pending' and expires_at<=now();
  for item in select value from jsonb_array_elements(invites) loop
    row_no := row_no + 1;
    if jsonb_typeof(item) <> 'object' then raise exception 'Row %: invalid entry', row_no using errcode='22023'; end if;
    if jsonb_typeof(item->'email') is distinct from 'string' or jsonb_typeof(item->'name') is distinct from 'string' then
      raise exception 'Row %: email and name must be text', row_no using errcode='22023'; end if;
    clean_email := lower(btrim(item->>'email'));
    clean_name := btrim(item->>'name');
    if clean_email is null or char_length(clean_email) > 254 or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'Row %: invalid email', row_no using errcode='22023'; end if;
    if clean_name is null or char_length(clean_name) not between 1 and 120 then
      raise exception 'Row %: name must be 1-120 characters', row_no using errcode='22023'; end if;
    if jsonb_typeof(item->'roles') <> 'array' then raise exception 'Row %: roles must be a list', row_no using errcode='22023'; end if;
    begin
      select coalesce(array_agg(distinct r::public.school_role), '{}'::public.school_role[]) into parsed_roles
        from jsonb_array_elements_text(item->'roles') r;
    exception when invalid_text_representation then
      raise exception 'Row %: unknown role', row_no using errcode='22023';
    end;
    if cardinality(parsed_roles) not between 1 and 4 or array_position(parsed_roles,null) is not null then raise exception 'Row %: choose at least one role', row_no using errcode='22023'; end if;
    if exists(select 1 from public.school_invitations where school_id=target_school and email=clean_email and status='pending') then
      skipped := skipped + 1; continue; end if;
    insert into public.school_invitations(school_id,email,display_name,roles,invited_by,bulk)
      values(target_school,clean_email,clean_name,parsed_roles,auth.uid(),true) returning id into invitation_id;
    insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
      values(target_school,auth.uid(),'invitation.created',invitation_id,jsonb_build_object('bulk',true));
    made := made + 1;
  end loop;
  return query select made, skipped;
end;
$$;


alter table public.school_invitations
  add column delivery_attempts integer not null default 0 check(delivery_attempts between 0 and 3),
  add column last_delivery_attempt_at timestamptz;
alter table public.school_invitations drop constraint school_invitations_delivery_status_check;
alter table public.school_invitations add constraint school_invitations_delivery_status_check
  check(delivery_status in ('pending','sending','sent','failed','unknown'));
update public.school_invitations i set delivery_attempts=1,
  last_delivery_attempt_at=coalesce((select max(a.occurred_at) from public.audit_events a
    where a.record_id=i.id and a.action='invitation.send_requested'),now())
  where delivery_status <> 'pending';

create or replace function public.claim_school_invitation(target_school uuid,target_invitation uuid)
returns table(email text,claim_id uuid) language plpgsql security definer set search_path='' as $$
declare invite public.school_invitations; claim uuid:=gen_random_uuid();
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  select * into invite from public.school_invitations where id=target_invitation and school_id=target_school for update;
  if not found or invite.status<>'pending' or invite.expires_at<=now() or invite.delivery_status<>'pending'
    or invite.delivery_attempts>=3 or invite.last_delivery_attempt_at>now()-interval '10 minutes' then
    raise exception 'Invitation is not ready to send' using errcode='22023'; end if;
  update public.school_invitations set delivery_status='sending',delivery_claim=claim,
    delivery_attempts=delivery_attempts+1,last_delivery_attempt_at=now() where id=invite.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'invitation.send_requested',invite.id);
  return query select invite.email,claim;
end;
$$;
create or replace function public.complete_school_invitation_delivery(target_invitation uuid,claim uuid,succeeded boolean)
returns void language plpgsql security definer set search_path='' as $$
declare school uuid;
begin
  update public.school_invitations set delivery_status=case when succeeded then 'sent' when succeeded=false then 'failed' else 'unknown' end,delivery_claim=null
    where id=target_invitation and delivery_claim=claim and delivery_status='sending' and status='pending' returning school_id into school;
  if not found then raise exception 'Delivery claim unavailable' using errcode='42501'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(school,null,case when succeeded then 'invitation.provider_accepted' when succeeded=false then 'invitation.delivery_failed' else 'invitation.delivery_unknown' end,target_invitation);
end;
$$;
create function public.reset_invitation_delivery(target_school uuid, target_invitation uuid, reviewed_not_sent boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if reviewed_not_sent is distinct from true then raise exception 'Review provider delivery first' using errcode='22023'; end if;
  update public.school_invitations i set delivery_status='pending', delivery_claim=null
    where i.id=target_invitation and i.school_id=target_school and i.status='pending' and i.expires_at>now()
      and i.delivery_status in ('failed','sending','unknown') and i.delivery_attempts<3
      and coalesce(i.last_delivery_attempt_at,i.created_at)<=now()-interval '10 minutes';
  if not found then raise exception 'Delivery cannot be reset yet' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'invitation.delivery_reset',target_invitation);
end;
$$;
revoke all on function public.create_school_invitations_bulk(uuid,jsonb), public.reset_invitation_delivery(uuid,uuid,boolean) from public, anon;
grant execute on function public.create_school_invitations_bulk(uuid,jsonb), public.reset_invitation_delivery(uuid,uuid,boolean) to authenticated;

commit;
