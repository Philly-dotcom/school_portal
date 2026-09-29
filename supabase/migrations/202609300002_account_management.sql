-- Apply AFTER 202609290001_foundation.sql. No Auth users or emails are created here.
begin;

alter table public.school_memberships add column access_version integer not null default 1;
alter table public.audit_events add column details jsonb not null default '{}'::jsonb;

create table public.school_invitations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  roles public.school_role[] not null check (cardinality(roles) between 1 and 4 and array_position(roles, null) is null),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sending','sent','failed')),
  delivery_claim uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id)
);
create unique index one_pending_school_invitation on public.school_invitations(school_id,email) where status='pending';
create index invitation_school_created on public.school_invitations(school_id,created_at desc);
alter table public.school_invitations enable row level security;
revoke all on public.school_invitations from anon, authenticated;
grant select on public.school_invitations to authenticated;
create policy invitations_admin_read on public.school_invitations for select to authenticated
  using (private.is_school_admin(school_id));

-- All access mutations serialize on the school row, then recheck the actor.
-- That protects against concurrent removal of the final admin and stale forms.
create function public.manage_school_member(target_school uuid, target_membership uuid,
  new_status public.membership_status, new_roles public.school_role[], expected_version integer)
returns void language plpgsql security definer set search_path='' as $$
declare
  target public.school_memberships;
  previous_roles public.school_role[];
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if new_status is null or new_roles is null or cardinality(new_roles) not between 1 and 4 or array_position(new_roles,null) is not null then
    raise exception 'Select at least one valid role' using errcode='22023';
  end if;
  select * into target from public.school_memberships where id=target_membership and school_id=target_school for update;
  if not found then raise exception 'Member unavailable' using errcode='42501'; end if;
  if target.access_version is distinct from expected_version then raise exception 'Access changed; reload before saving' using errcode='40001'; end if;
  select coalesce(array_agg(role order by role),'{}'::public.school_role[]) into previous_roles
    from public.membership_roles where membership_id=target.id and school_id=target_school;
  if target.status='active' and 'school_admin'=any(previous_roles)
    and (new_status='suspended' or not ('school_admin'=any(new_roles)))
    and not exists (
      select 1 from public.school_memberships m join public.membership_roles r on r.membership_id=m.id and r.school_id=m.school_id
      where m.school_id=target_school and m.id<>target.id and m.status='active' and r.role='school_admin'
    ) then raise exception 'Keep at least one active school administrator' using errcode='23514';
  end if;
  update public.school_memberships set status=new_status, access_version=access_version+1 where id=target.id;
  delete from public.membership_roles where membership_id=target.id and school_id=target_school;
  insert into public.membership_roles(membership_id,school_id,role)
    select target.id,target_school,r from (select distinct unnest(new_roles) r) roles;
  insert into public.audit_events(school_id,actor_user_id,action,record_id,details)
    values(target_school,auth.uid(),'member.access_changed',target.id,jsonb_build_object(
      'previous_status',target.status,'status',new_status,'previous_roles',previous_roles,'roles',new_roles));
end;
$$;

create function public.list_school_members(target_school uuid)
returns table(id uuid,user_id uuid,display_name text,status public.membership_status,access_version integer,roles public.school_role[])
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  return query select m.id,m.user_id,p.display_name,m.status,m.access_version,
    coalesce(array_agg(r.role order by r.role) filter(where r.role is not null),'{}'::public.school_role[])
    from public.school_memberships m join public.profiles p on p.user_id=m.user_id
    left join public.membership_roles r on r.membership_id=m.id and r.school_id=m.school_id
    where m.school_id=target_school group by m.id,p.display_name order by p.display_name,m.id;
end;
$$;

create function public.create_school_invitation(target_school uuid,invite_email text,invite_name text,invite_roles public.school_role[])
returns uuid language plpgsql security definer set search_path='' as $$
declare invitation_id uuid;
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  if invite_roles is null or cardinality(invite_roles) not between 1 and 4 or array_position(invite_roles,null) is not null then
    raise exception 'Select at least one valid role' using errcode='22023'; end if;
  -- Do not look up unrelated Auth accounts or expose whether another school's user exists.
  if exists(select 1 from public.school_invitations where school_id=target_school and created_at>now()-interval '1 minute') then
    raise exception 'Wait a minute before creating another invitation' using errcode='P0001'; end if;
  if (select count(*) from public.school_invitations where school_id=target_school and created_at>now()-interval '1 day')>=50 then
    raise exception 'Daily invitation limit reached' using errcode='P0001'; end if;
  -- Expired invitations stay in history but no longer block replacement.
  update public.school_invitations set status='revoked' where school_id=target_school
    and email=lower(trim(invite_email)) and status='pending' and expires_at<=now();
  insert into public.school_invitations(school_id,email,display_name,roles,invited_by)
    values(target_school,lower(trim(invite_email)),trim(invite_name),array(select distinct unnest(invite_roles)),auth.uid()) returning id into invitation_id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(target_school,auth.uid(),'invitation.created',invitation_id);
  return invitation_id;
end;
$$;

create function public.revoke_school_invitation(target_school uuid,target_invitation uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  update public.school_invitations set status='revoked' where id=target_invitation and school_id=target_school and status='pending';
  if not found then raise exception 'Invitation unavailable' using errcode='22023'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'invitation.revoked',target_invitation);
end;
$$;

-- Recipient acceptance derives the confirmed email from Auth, never from a form or JWT metadata.
create function public.accept_school_invitation(target_school uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  account_email text;
  invite public.school_invitations;
  membership uuid;
begin
  perform 1 from public.schools where id=target_school and active for update;
  if not found or auth.uid() is null then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select * into invite from public.school_invitations where school_id=target_school and email=account_email
    and status='pending' and expires_at>now() for update;
  if not found then raise exception 'No valid invitation for this account' using errcode='42501'; end if;
  if not exists(select 1 from public.school_memberships m join public.membership_roles r
    on r.membership_id=m.id and r.school_id=m.school_id where m.school_id=target_school
    and m.user_id=invite.invited_by and m.status='active' and r.role='school_admin') then
    raise exception 'Invitation issuer no longer authorized' using errcode='42501'; end if;
  -- Never reactivate an existing suspended member or replace existing roles through an invitation.
  if exists(select 1 from public.school_memberships where school_id=target_school and user_id=auth.uid()) then
    raise exception 'School membership already exists; contact your administrator' using errcode='23505'; end if;
  insert into public.profiles(user_id,display_name) values(auth.uid(),invite.display_name) on conflict(user_id) do nothing;
  insert into public.school_memberships(school_id,user_id) values(target_school,auth.uid()) returning id into membership;
  insert into public.membership_roles(membership_id,school_id,role)
    select membership,target_school,r from unnest(invite.roles) r;
  update public.school_invitations set status='accepted',accepted_at=now(),accepted_by=auth.uid() where id=invite.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'invitation.accepted',invite.id);
  return membership;
end;
$$;

-- Only the isolated email sender calls these. The claim is made in the caller's
-- JWT context, and the service-only completion requires an unguessable claim ID.
create function public.claim_school_invitation(target_school uuid,target_invitation uuid)
returns table(email text,claim_id uuid) language plpgsql security definer set search_path='' as $$
declare invite public.school_invitations; claim uuid:=gen_random_uuid();
begin
  perform 1 from public.schools where id=target_school for update;
  if not private.is_school_admin(target_school) then raise exception 'Access denied' using errcode='42501'; end if;
  select * into invite from public.school_invitations where id=target_invitation and school_id=target_school for update;
  if not found or invite.status<>'pending' or invite.expires_at<=now() or invite.delivery_status<>'pending' then
    raise exception 'Invitation is not ready to send' using errcode='22023'; end if;
  update public.school_invitations set delivery_status='sending',delivery_claim=claim where id=invite.id;
  insert into public.audit_events(school_id,actor_user_id,action,record_id) values(target_school,auth.uid(),'invitation.send_requested',invite.id);
  return query select invite.email,claim;
end;
$$;
create function public.complete_school_invitation_delivery(target_invitation uuid,claim uuid,succeeded boolean)
returns void language plpgsql security definer set search_path='' as $$
declare school uuid;
begin
  update public.school_invitations set delivery_status=case when succeeded then 'sent' else 'failed' end,delivery_claim=null
    where id=target_invitation and delivery_claim=claim and delivery_status='sending' returning school_id into school;
  if not found then raise exception 'Delivery claim unavailable' using errcode='42501'; end if;
  insert into public.audit_events(school_id,actor_user_id,action,record_id)
    values(school,null,case when succeeded then 'invitation.provider_accepted' else 'invitation.delivery_failed' end,target_invitation);
end;
$$;

revoke all on function public.manage_school_member(uuid,uuid,public.membership_status,public.school_role[],integer),
  public.list_school_members(uuid),public.create_school_invitation(uuid,text,text,public.school_role[]),
  public.revoke_school_invitation(uuid,uuid),public.accept_school_invitation(uuid),
  public.claim_school_invitation(uuid,uuid),public.complete_school_invitation_delivery(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.manage_school_member(uuid,uuid,public.membership_status,public.school_role[],integer),
  public.list_school_members(uuid),public.create_school_invitation(uuid,text,text,public.school_role[]),
  public.revoke_school_invitation(uuid,uuid),public.accept_school_invitation(uuid),public.claim_school_invitation(uuid,uuid) to authenticated;
grant execute on function public.complete_school_invitation_delivery(uuid,uuid,boolean) to service_role;
commit;
