-- Supabase Auth stores email as varchar(255); this RPC promises text.
-- Preserve the existing signature and admin-only access; no records are changed.
create or replace function public.list_linkable_members(target_school uuid)
returns table(id uuid,display_name text,status public.membership_status,roles public.school_role[],verified_email text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_school_admin(target_school) then raise exception 'Admin required' using errcode='42501'; end if;
  return query select m.id,p.display_name,m.status,
    coalesce(array_agg(r.role order by r.role) filter(where r.role is not null),'{}'::public.school_role[]),
    case when u.email_confirmed_at is not null then u.email::text else null end
    from public.school_memberships m join public.profiles p on p.user_id=m.user_id
    join auth.users u on u.id=m.user_id
    left join public.membership_roles r on r.membership_id=m.id and r.school_id=m.school_id
    where m.school_id=target_school group by m.id,p.display_name,u.email,u.email_confirmed_at
    order by p.display_name,m.id;
end;
$$;
revoke all on function public.list_linkable_members(uuid) from public,anon;
grant execute on function public.list_linkable_members(uuid) to authenticated;

