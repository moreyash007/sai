import { AlarmClock, CalendarCheck, CheckCircle2, CheckSquare, Clock, Handshake, MapPin, Moon, Phone, Plus, Sun, ThumbsUp, type LucideIcon } from 'lucide-react'
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
  accent: string
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
          { label: 'New', value: n('new'), to: '/leads?stage=new', icon: Plus, accent: 'bg-violet-400' },
          { label: 'Pending', value: s.followups_today ?? 0, to: '/leads?due=1', icon: Clock, accent: 'bg-white' },
          { label: 'Overdue', value: s.followups_overdue ?? 0, to: '/leads?due=1', icon: AlarmClock, accent: 'bg-indigo-400' },
          { label: 'Callbacks', value: n('contacted'), to: '/leads?stage=contacted', icon: Phone, accent: 'bg-emerald-400' },
          { label: 'Qualified', value: n('qualified'), to: '/leads?stage=qualified', icon: ThumbsUp, accent: 'bg-amber-200' },
          { label: 'Site visit scheduled', value: n('visit_scheduled'), to: '/visits', icon: MapPin, accent: 'bg-fuchsia-400' },
          { label: 'Site visit done', value: n('visit_done'), to: '/leads?stage=visit_done', icon: CheckCircle2, accent: 'bg-pink-400' },
        ]
      : []),
    ...(s.bookings_pending !== undefined ? [{ label: 'Bookings pending', value: s.bookings_pending, to: '/bookings', icon: Handshake, accent: 'bg-sky-300' }] : []),
    { label: 'My open tasks', value: s.tasks_open, to: '/tasks', icon: CheckSquare, accent: 'bg-blue-500' },
  ]

  return (
    <div className="-mx-4 -mt-5 min-h-[calc(100dvh-3.75rem)] overflow-hidden bg-gradient-to-b from-indigo-700 via-[#14143a] to-[#0a0a14] text-white sm:-mx-6 lg:mx-0 lg:mt-0 lg:min-h-0 lg:rounded-2xl">
      <div className="relative px-5 pt-10 pb-14 lg:px-8 lg:pt-8 lg:pb-10">
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          {night &&
            STARS.map(([x, y, r], i) => <circle key={i} cx={`${x}%`} cy={`${y}%`} r={r} className="animate-pulse fill-white/80" />)}
        </svg>
        {night ? <Moon className="absolute top-8 right-6 size-14 fill-sky-300 text-sky-300" /> : <Sun className="absolute top-8 right-6 size-14 fill-amber-300 text-amber-300" />}
        <p className="relative text-2xl leading-tight font-bold">Hi {name}!</p>
        <p className="relative text-2xl leading-tight font-bold">{greeting}</p>
        {canCheckIn && !s.checked_in && (
          <Link to="/attendance" className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
            <CalendarCheck className="size-4" /> Check in
          </Link>
        )}
      </div>

      <div className="space-y-3 px-4 pb-6 lg:px-8">
        {hasLeads && (
          <Link to="/leads" className="block rounded-2xl border border-indigo-400/40 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-start justify-between border-b border-white/15 pb-3">
              <div>
                <p className="text-[11px] text-white/50">statistics</p>
                <p className="text-lg font-bold">total leads</p>
              </div>
              <p className="text-xl font-bold">{s.leads_total}</p>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 text-center">
              {summary.map((x) => (
                <div key={x.label}>
                  <p className="text-[11px] text-white/60">{x.label}</p>
                  <p className="text-lg font-bold">{x.value}</p>
                </div>
              ))}
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map(({ label, value, to, icon: Icon, accent }) => (
            <Link key={label} to={to} className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-indigo-400/30 bg-white/5 py-4 pr-3 pl-5 backdrop-blur">
              <span className={`absolute inset-y-3 left-0 w-1.5 rounded-r-full ${accent}`} />
              <span className="min-w-0">
                <span className="block truncate text-xs text-white/60">{label}</span>
                <span className="block text-xl font-bold">{value}</span>
              </span>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Icon className="size-5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
