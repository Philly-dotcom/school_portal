-- Invitation throughput: atomic bulk preparation and an admin-controlled delivery reset.
-- Apply AFTER 202610020010. Nothing here sends email or creates Auth users.
begin;

alter table public.school_invitations add column bulk boolean not null default false;

-- Single invitations: unchanged behaviour, except bulk rows no longer consume the
-- one-per-minute and 50-per-day single-invite allowances.
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

-- Bulk preparation: 1-200 rows per call, 500 per school per day. All-or-nothing: one bad
-- row rejects the whole batch with its row number. Pending duplicates are skipped.
-- Input: [{"email": "...", "name": "...", "roles": ["teacher"]}, ...]
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
    if cardinality(parsed_roles) not between 1 and 4 then raise exception 'Row %: choose at least one role', row_no using errcode='22023'; end if;
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

-- Explicit, audited retry. Allowed for 'failed' deliveries, or 'sending' deliveries whose
-- send request is older than 10 minutes (the sender crashed). Never for 'sent'.
create function public.reset_invitation_delivery(target_school uuid, target_invitation uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  update public.school_invitations i set delivery_status='pending', delivery_claim=null
    where i.id=target_invitation and i.school_id=target_school and i.status='pending' and i.expires_at>now()
      and (i.delivery_status='failed' or (i.delivery_status='sending' and not exists(
        select 1 from public.audit_events a where a.record_id=i.id and a.action='invitation.send_requested'
          and a.occurred_at>now()-interval '10 minutes')));
  if not found then raise exception 'Delivery cannot be reset yet' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'invitation.delivery_reset',target_invitation);
end;
$$;

revoke all on function public.create_school_invitations_bulk(uuid,jsonb), public.reset_invitation_delivery(uuid,uuid) from public, anon;
grant execute on function public.create_school_invitations_bulk(uuid,jsonb), public.reset_invitation_delivery(uuid,uuid) to authenticated;
commit;
