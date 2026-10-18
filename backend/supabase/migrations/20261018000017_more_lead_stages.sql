-- More lead stages: meetings (office / online) and expression of interest.
-- Pipeline order: new, contacted, qualified, visit_scheduled, visit_done,
-- meeting_scheduled, meeting_done, interested, negotiation, booked, lost.
alter table public.leads drop constraint if exists leads_stage_check;
alter table public.leads add constraint leads_stage_check
  check (stage in ('new','contacted','qualified','visit_scheduled','visit_done','meeting_scheduled','meeting_done','interested','negotiation','booked','lost'));

create or replace function private.lead_score(l public.leads) returns int
language sql stable set search_path = '' as $$
  select case when l.stage = 'lost' then 0 else least(100, greatest(0,
      (case l.stage when 'new' then 5 when 'contacted' then 15 when 'qualified' then 30 when 'visit_scheduled' then 40
                    when 'visit_done' then 55 when 'meeting_scheduled' then 45 when 'meeting_done' then 55 when 'interested' then 65 when 'negotiation' then 70 when 'booked' then 100 else 0 end)
    + (case when l.budget_max is not null or l.budget_min is not null then 8 else 0 end)
    + (case when l.project_id is not null then 7 else 0 end)
    + (case when l.source in ('Referral', 'Walk-in') then 10 else 0 end)
    + (case when l.last_activity_at > now() - interval '3 days' then 10
            when l.last_activity_at > now() - interval '7 days' then 5
            when l.last_activity_at < now() - interval '21 days' then -15
            when l.last_activity_at < now() - interval '7 days' then -5 else 0 end)
  )) end $$;

create or replace function public.dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_leads boolean := public.has_perm('leads'); v_visits boolean := public.has_perm('visits');
  v_book boolean := public.has_perm('bookings'); v_inc boolean := public.has_perm('incentives');
  v_today date := private.today_ist(); out jsonb := '{}';
begin
  if not public.has_perm('dashboard') then perform private.forbid(); end if;

  if v_leads then
    out := out || (
      select jsonb_build_object(
        'leads_total', count(*),
        'leads_new_7d', count(*) filter (where l.created_at > now() - interval '7 days'),
        'leads_open', count(*) filter (where l.stage not in ('booked', 'lost')),
        'followups_today', count(*) filter (where l.stage not in ('booked', 'lost') and (l.next_follow_up_at at time zone 'Asia/Kolkata')::date = v_today),
        'followups_overdue', count(*) filter (where l.stage not in ('booked', 'lost') and (l.next_follow_up_at at time zone 'Asia/Kolkata')::date < v_today))
      from public.leads l where l.anonymized_at is null and private.lead_in_scope(l));
    out := out || jsonb_build_object('pipeline', (
      select coalesce(jsonb_agg(jsonb_build_object('stage', s.stage, 'count', coalesce(c.n, 0)) order by s.ord), '[]')
      from unnest(array['new','contacted','qualified','visit_scheduled','visit_done','meeting_scheduled','meeting_done','interested','negotiation','booked','lost']) with ordinality s(stage, ord)
      left join (select l.stage, count(*) n from public.leads l where l.anonymized_at is null and private.lead_in_scope(l) group by l.stage) c using (stage)));
    out := out || jsonb_build_object('due_leads', (
      select coalesce(jsonb_agg(x order by x.next_follow_up_at), '[]') from (
        select l.id, l.name, l.phone_hint, l.stage, l.next_follow_up_at from public.leads l
        where l.owner_id = auth.uid() and l.stage not in ('booked', 'lost')
          and (l.next_follow_up_at at time zone 'Asia/Kolkata')::date <= v_today
        order by l.next_follow_up_at limit 8) x));
  end if;

  if v_visits then
    out := out || (
      select jsonb_build_object(
        'visits_upcoming', count(*) filter (where v.status in ('scheduled', 'confirmed') and v.scheduled_at >= now()),
        'visits_done_30d', count(*) filter (where v.status = 'done' and v.done_at > now() - interval '30 days'))
      from public.site_visits v where public.in_scope(v.executive_id) or v.created_by = auth.uid());
    out := out || jsonb_build_object('upcoming_visits', (
      select coalesce(jsonb_agg(x order by x.scheduled_at), '[]') from (
        select v.id, l.name as lead_name, pr.name as project, v.scheduled_at, v.status, p.full_name as executive
        from public.site_visits v join public.leads l on l.id = v.lead_id
        left join public.projects pr on pr.id = v.project_id join public.profiles p on p.id = v.executive_id
        where v.status in ('scheduled', 'confirmed') and v.scheduled_at > now() - interval '3 hours'
          and (public.in_scope(v.executive_id) or v.created_by = auth.uid())
        order by v.scheduled_at limit 6) x));
  end if;

  if v_book then
    out := out || (
      select jsonb_build_object(
        'bookings_30d', count(*) filter (where b.status = 'approved' and b.approved_at > now() - interval '30 days'),
        'bookings_pending', count(*) filter (where b.status = 'pending'),
        'revenue_30d', coalesce(sum(private.dec_num(b.agreement_value_enc)) filter (where b.status = 'approved' and b.approved_at > now() - interval '30 days'), 0))
      from public.bookings b where public.in_scope(b.closed_by) or b.created_by = auth.uid());
  end if;

  if v_inc then
    out := out || (
      select jsonb_build_object(
        'my_incentive_pending', coalesce(sum(private.dec_num(i.amount_enc)) filter (where i.status in ('pending', 'approved')), 0),
        'my_incentive_paid', coalesce(sum(private.dec_num(i.amount_enc)) filter (where i.status = 'paid'), 0))
      from public.incentives i where i.user_id = auth.uid());
  end if;

  out := out || jsonb_build_object(
    'tasks_open', (select count(*) from public.tasks t where t.assigned_to = auth.uid() and t.status = 'open'),
    'tasks_overdue', (select count(*) from public.tasks t where t.assigned_to = auth.uid() and t.status = 'open' and t.due_at < now()),
    'checked_in', exists (select 1 from public.attendance a where a.user_id = auth.uid() and a.work_date = v_today and a.check_out_at is null));
  return out;
end $$;
