import { AlarmClock, CalendarCheck, CalendarClock, CheckCircle2, CheckSquare, Clock, Handshake, MapPin, Moon, Phone, Plus, Sparkles, Sun, ThumbsUp, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface HeroStats {
  leads_total?: number
  leads_open?: number
  followups_today?: number
  followups_overdue?: number
  pipeline?: { stage: string; count: number }[]
  visits_upcoming?: number
  visits_done_30d?: number
  bookings_pending?: number
  tasks_open: number
  tasks_overdue: number
  checked_in: boolean
}

const STARS: [number, number, number][] = [
  [8, 18, 1.6], [24, 12, 2], [47, 40, 1.4], [62, 14, 1.6], [78, 52, 1.2], [90, 28, 1.8], [35, 62, 1.2], [14, 70, 1.4], [70, 78, 1.2],
]

interface Tile {
  label: string
  value: number | string
  to: string
  icon: LucideIcon
  accent: string // hex colour
}

export function HeroDashboard({ s, name, canCheckIn }: { s: HeroStats; name: string; canCheckIn: boolean }) {
  const hour = new Date().getHours()
  const night = hour >= 19 || hour < 5
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const n = (stage: string) => Number(s.pipeline?.find((p) => p.stage === stage)?.count ?? 0)
  const hasLeads = s.leads_total !== undefined

  const summary = [
    { label: 'active', value: s.leads_open ?? 0 },
    { label: 'booked', value: n('booked') },
    { label: 'negotiation', value: n('negotiation') },
    { label: 'lost', value: n('lost') },
  ]

  const tiles: Tile[] = [
    ...(hasLeads
      ? [
          { label: 'New', value: n('new'), to: '/leads?stage=new', icon: Plus, accent: '#25C281' },
          { label: 'Pending', value: s.followups_today ?? 0, to: '/leads?due=1', icon: Clock, accent: '#C08A25' },
          { label: 'Overdue', value: s.followups_overdue ?? 0, to: '/leads?due=1', icon: AlarmClock, accent: '#D64545' },
          { label: 'Callbacks', value: n('contacted'), to: '/leads?stage=contacted', icon: Phone, accent: '#C08A25' },
          { label: 'Qualified', value: n('qualified'), to: '/leads?stage=qualified', icon: ThumbsUp, accent: '#9C6E17' },
          { label: 'Site visit scheduled', value: n('visit_scheduled'), to: '/visits', icon: MapPin, accent: '#8B5CF6' },
          { label: 'Meeting scheduled', value: n('meeting_scheduled'), to: '/leads?stage=meeting_scheduled', icon: CalendarClock, accent: '#0EA5E9' },
          { label: 'Expression of interest', value: n('interested'), to: '/leads?stage=interested', icon: Sparkles, accent: '#E07A1F' },
          { label: 'Site visit done', value: n('visit_done'), to: '/leads?stage=visit_done', icon: CheckCircle2, accent: '#6D4AD8' },
          { label: 'Meeting done', value: n('meeting_done'), to: '/leads?stage=meeting_done', icon: Users, accent: '#0284C7' },
        ]
      : []),
    ...(s.bookings_pending !== undefined ? [{ label: 'Bookings pending', value: s.bookings_pending, to: '/bookings', icon: Handshake, accent: '#0F7A44' }] : []),
    { label: 'My open tasks', value: s.tasks_open, to: '/tasks', icon: CheckSquare, accent: '#0B1F3A' },
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="relative bg-gradient-to-br from-navy-dark via-navy to-navy-soft px-5 pt-8 pb-10 text-white lg:px-8">
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          {night &&
            STARS.map(([x, y, r], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} className="animate-pulse fill-gold-light/80" />)}
        </svg>
        {night ? <Moon className="absolute top-8 right-6 size-14 fill-gold-light text-gold-light" /> : <Sun className="absolute top-8 right-6 size-14 fill-gold-light text-gold" />}
        <p className="relative text-2xl leading-tight font-bold">Hi {name}!</p>
        <p className="relative text-2xl leading-tight font-bold">{greeting}</p>
        {canCheckIn && !s.checked_in && (
          <Link to="/attendance" className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy-dark hover:bg-gold-light">
            <CalendarCheck className="size-4" /> Check in
          </Link>
        )}
      </div>

      <div className="space-y-3 bg-canvas p-4 lg:p-6">
        {hasLeads && (
          <Link to="/leads" className="block rounded-xl border border-line bg-panel p-4 hover:border-gold">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <p className="text-[11px] text-ink-faint">statistics</p>
                <p className="text-lg font-bold text-navy">total leads</p>
              </div>
              <p className="text-xl font-bold text-gold-dark">{s.leads_total}</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 text-center">
              {summary.map((x) => (
                <div key={x.label}>
                  <p className="text-[11px] text-ink-dim">{x.label}</p>
                  <p className="text-lg font-bold text-navy">{x.value}</p>
                </div>
              ))}
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map(({ label, value, to, icon: Icon, accent }) => (
            <Link key={label} to={to} className="relative flex items-center justify-between overflow-hidden rounded-xl border border-line bg-panel py-4 pr-3 pl-5 hover:border-gold">
              <span className="absolute inset-y-3 left-0 w-1.5 rounded-r-full" style={{ background: accent }} />
              <span className="min-w-0">
                <span className="block truncate text-xs text-ink-dim">{label}</span>
                <span className="block text-xl font-bold text-navy">{value}</span>
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-gold-tint text-gold-dark">
                <Icon className="size-5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
