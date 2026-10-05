-- Read-only, paged account eligibility. Save-time link checks remain authoritative.
create function public.search_register_members(
  target_school uuid, record_kind text, target_record uuid,
  search_text text default '', page_number integer default 1
)
returns table(id uuid, display_name text, status public.membership_status,
  roles public.school_role[], verified_email text)
language plpgsql stable security definer set search_path='' as $$
declare
  required_role public.school_role;
  record_exists boolean;
begin
  if not private.is_school_admin(target_school) then
    raise exception 'Admin required' using errcode='42501';
  end if;
  if record_kind is null or record_kind not in ('students','teachers','guardians')
    or target_record is null or search_text is null or length(search_text)>80
    or page_number is null or page_number<1 or page_number>100000 then
    raise exception 'Invalid search' using errcode='22023';
  end if;
  required_role := case record_kind when 'students' then 'student'::public.school_role
    when 'teachers' then 'teacher'::public.school_role else 'guardian'::public.school_role end;
  execute format('select exists(select 1 from public.%I where school_id=$1 and id=$2)',record_kind)
    into record_exists using target_school,target_record;
  if not record_exists then raise exception 'Record unavailable' using errcode='42501'; 
  end if;

  return query execute format($query$
    select m.id,p.display_name,m.status,
      array(select r.role from public.membership_roles r
        where r.school_id=m.school_id and r.membership_id=m.id order by r.role),
      case when u.email_confirmed_at is not null then u.email::text else null end
    from public.school_memberships m
    join public.profiles p on p.user_id=m.user_id
    join auth.users u on u.id=m.user_id
    where m.school_id=$1 and m.status='active'
      and exists(select 1 from public.membership_roles r
        where r.school_id=m.school_id and r.membership_id=m.id and r.role=$3)
      and not exists(select 1 from public.%I owned
        where owned.school_id=$1 and owned.membership_id=m.id and owned.id<>$2)
      and (strpos(lower(coalesce(p.display_name,'')),lower($4))>0
        or (u.email_confirmed_at is not null and strpos(lower(coalesce(u.email,'')),lower($4))>0))
    order by p.display_name,m.id limit 26 offset (($5-1)*25)
  $query$,record_kind) using target_school,target_record,required_role,btrim(search_text),page_number;
end;
$$;
revoke all on function public.search_register_members(uuid,text,uuid,text,integer) from public,anon;
grant execute on function public.search_register_members(uuid,text,uuid,text,integer) to authenticated;
