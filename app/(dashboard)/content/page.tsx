"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type RevisionHistoryItem = {
  caption: string
  timestamp: string
  reason: string
}

type Entry = {
  id: string
  title: string
  client_id: string
  content_type: string
  platforms: string[]
  status: string
  scheduled_date: string
  caption?: string
  hashtags?: string
  media_url?: string
  notes?: string
  client_feedback?: string
  submitted_by?: string
  submitted_at?: string
  feedback_role?: string
  revision_count?: number
  revision_history?: RevisionHistoryItem[]
  clients?: { legal_name: string }
  // AI-generated content fields
  topic?: string
  hook?: string
  cta?: string
  image_prompt?: string
  visual_direction?: string
  category?: string
  best_time_ist?: string
  // Post-publish tracking
  posted_url?: string
  posted_at?: string
}

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "Pinterest"]
const CONTENT_TYPES = ["static", "carousel", "reel", "blog", "story"]
const STATUS_OPTIONS = ["idea", "writing", "designed", "approved", "posted", "changes_requested", "rejected"]

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Facebook: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  LinkedIn: "bg-indigo-600/20 text-indigo-400 border-indigo-600/30",
  Twitter: "bg-sky-400/20 text-sky-400 border-sky-400/30",
  YouTube: "bg-red-600/20 text-red-400 border-red-600/30",
  Pinterest: "bg-red-500/20 text-red-400 border-red-500/30",
}

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-zinc-100 text-zinc-600 border-zinc-200",
  writing: "bg-amber-50 text-amber-600 border-amber-100",
  designed: "bg-blue-50 text-blue-600 border-blue-100",
  approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
  posted: "bg-teal-50 text-teal-600 border-teal-100",
  changes_requested: "bg-orange-50 text-orange-600 border-orange-100",
  rejected: "bg-red-50 text-red-600 border-red-100",
}

const NEEDS_REVIEW = (status: string) => status === "changes_requested" || status === "rejected"

const GEN_STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-600 border-emerald-100",
  error: "bg-red-50 text-red-600 border-red-100",
  partial: "bg-amber-50 text-amber-600 border-amber-100",
}

export default function ContentPage() {
  const [view, setView] = useState<"table" | "calendar">("table")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Partial<Entry> | null>(null)
  const [reviewEntry, setReviewEntry] = useState<Entry | null>(null)

  // Filters
  const [clientFilter, setClientFilter] = useState("all")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const { data: clientsData } = useSWR("/api/clients", fetcher)
  const clients = clientsData?.clients ?? []

  const { data: entriesData, mutate } = useSWR(`/api/content-calendar?clientId=${clientFilter}`, fetcher)
  const entries: Entry[] = entriesData?.entries ?? []

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchPlatform = platformFilter === "all" || e.platforms?.includes(platformFilter)
      const matchStatus = statusFilter === "all" || e.status === statusFilter
      const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || e.clients?.legal_name?.toLowerCase().includes(search.toLowerCase())
      return matchPlatform && matchStatus && matchSearch
    })
  }, [entries, platformFilter, statusFilter, search])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return
    try {
      const res = await fetch(`/api/content-calendar?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Post deleted")
        mutate()
      }
    } catch (err) {
      toast.error("Failed to delete post")
    }
  }

  const handleMarkPosted = async (entry: Entry) => {
    try {
      const res = await fetch("/api/content-calendar", {
        method: "POST",
        body: JSON.stringify({ ...entry, status: "posted" })
      })
      if (res.ok) {
        toast.success("Marked as posted")
        mutate()
      }
    } catch (err) {
      toast.error("Failed to update status")
    }
  }

  const handleRowClick = (entry: Entry) => {
    if (NEEDS_REVIEW(entry.status)) {
      setReviewEntry(entry)
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-zinc-900 text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage cross-platform content strategy</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 border border-zinc-200 rounded-xl p-1">
            <button
              onClick={() => setView("table")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "table" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Table
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "calendar" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#003434] hover:bg-[#004d4d] text-white font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Post
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search posts or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-[#70BF4B] transition-all"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-white border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]"
        >
          <option value="all">All Clients</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-white border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]"
        >
          <option value="all">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-zinc-200 text-zinc-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
      </div>

      {/* Main content + review panel side-by-side when review is open */}
      <div className={`flex gap-6 items-start ${reviewEntry ? 'flex-col xl:flex-row' : ''}`}>
        <div className={reviewEntry ? 'flex-1 min-w-0' : 'w-full'}>
          {view === "table" ? (
            <TableView
              entries={filteredEntries}
              onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }}
              onDelete={handleDelete}
              onMarkPosted={handleMarkPosted}
              onRowClick={handleRowClick}
            />
          ) : (
            <CalendarView
              entries={filteredEntries}
              currentMonth={currentMonth}
              onPrev={() => setCurrentMonth(subMonths(currentMonth, 1))}
              onNext={() => setCurrentMonth(addMonths(currentMonth, 1))}
              onDateClick={(date) => { setEditingEntry({ scheduled_date: format(date, "yyyy-MM-dd") }); setIsModalOpen(true); }}
              onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }}
            />
          )}
        </div>

        {reviewEntry && (
          <ReviewPanel
            entry={reviewEntry}
            onClose={() => setReviewEntry(null)}
            onSaved={() => { mutate(); setReviewEntry(null); }}
            onUpdate={(updated) => setReviewEntry(updated)}
          />
        )}
      </div>

      {isModalOpen && (
        <PostModal
          entry={editingEntry}
          clients={clients}
          onClose={() => setIsModalOpen(false)}
          onSave={() => { setIsModalOpen(false); mutate(); }}
        />
      )}

      <BlogActivityPanel />
      <GenerationLogsPanel />
    </div>
  )
}

function TableView({ entries, onEdit, onDelete, onMarkPosted, onRowClick }: { entries: Entry[], onEdit: (e: Entry) => void, onDelete: (id: string) => void, onMarkPosted: (e: Entry) => void, onRowClick: (e: Entry) => void }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              {["Title", "Client", "Type / Category", "Platforms", "Status", "Scheduled", "Actions"].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 text-sm italic">No posts found matching filters.</td>
              </tr>
            ) : entries.map(e => {
              const needsReview = NEEDS_REVIEW(e.status)
              return (
                  <tr
                    key={e.id}
                    onClick={() => needsReview && onRowClick(e)}
                    className={`transition-colors group ${needsReview ? 'cursor-pointer hover:bg-orange-50 border-l-2 border-l-orange-500' : 'hover:bg-zinc-50'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {needsReview && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 animate-pulse" />
                        )}
                        <p className="text-zinc-900 text-sm font-semibold truncate max-w-[200px]">{e.title}</p>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                    <p className="text-zinc-400 text-xs">{e.clients?.legal_name || "—"}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 uppercase font-bold w-fit">{e.content_type}</span>
                      {e.category && <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#003434]/10 text-[#003434] font-medium w-fit">{e.category}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                      {e.platforms?.map(p => (
                        <div key={p} className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[p]?.split(' ')[0]}`} title={p} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[e.status] ?? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
                      {e.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <p className="text-zinc-400 text-xs font-mono">{e.scheduled_date || "—"}</p>
                      {e.posted_url && (
                        <a href={e.posted_url} target="_blank" rel="noopener noreferrer" onClick={ev => ev.stopPropagation()} title="View live post" className="text-teal-500 hover:text-teal-600 transition-colors">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => ev.stopPropagation()}>
                      <button onClick={() => onEdit(e)} className="p-1.5 text-zinc-400 hover:text-[#70BF4B] transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => onDelete(e.id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      {e.status !== 'posted' && (
                        <button onClick={() => onMarkPosted(e)} className="text-[10px] font-bold text-[#70BF4B] hover:underline">Mark Posted</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CalendarView({ entries, currentMonth, onPrev, onNext, onDateClick, onEdit }: { entries: Entry[], currentMonth: Date, onPrev: () => void, onNext: () => void, onDateClick: (d: Date) => void, onEdit: (e: Entry) => void }) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm flex flex-col h-[700px]">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
        <h2 className="text-zinc-900 font-bold text-lg">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <button onClick={onPrev} className="p-2 text-zinc-400 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <button onClick={onNext} className="p-2 text-zinc-400 hover:text-zinc-900 bg-white border border-zinc-200 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center border-r border-zinc-100 last:border-0">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-5 sm:grid-rows-6">
        {days.map((day, i) => {
          const dayEntries = entries.filter(e => isSameDay(new Date(e.scheduled_date), day))
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isToday = isSameDay(day, new Date())
          
          return (
            <div
              key={i}
              onClick={() => onDateClick(day)}
              className={`min-h-[100px] border-r border-b border-zinc-100 p-2 transition-colors cursor-pointer hover:bg-zinc-50 ${!isCurrentMonth ? 'bg-zinc-50/50 opacity-25' : ''} ${isToday ? 'bg-emerald-50/30' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-mono ${isToday ? 'text-emerald-600 font-bold' : 'text-zinc-400'}`}>{format(day, "d")}</span>
                {dayEntries.length > 0 && <span className="text-[9px] text-emerald-600 font-bold">{dayEntries.length} posts</span>}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                {dayEntries.map(e => (
                  <button
                    key={e.id}
                    onClick={(event) => { event.stopPropagation(); onEdit(e); }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[9px] truncate font-medium border ${PLATFORM_COLORS[e.platforms[0]] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                  >
                    {e.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PostModal({ entry, clients, onClose, onSave }: { entry: Partial<Entry> | null, clients: any[], onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    id: entry?.id || "",
    title: entry?.title || "",
    client_id: entry?.client_id || "",
    content_type: entry?.content_type || "static",
    platforms: entry?.platforms || [],
    status: entry?.status || "idea",
    scheduled_date: entry?.scheduled_date || format(new Date(), "yyyy-MM-dd"),
    caption: entry?.caption || "",
    hashtags: entry?.hashtags || "",
    media_url: entry?.media_url || "",
    notes: entry?.notes || "",
    topic: entry?.topic || "",
    hook: entry?.hook || "",
    cta: entry?.cta || "",
    image_prompt: entry?.image_prompt || "",
    visual_direction: entry?.visual_direction || "",
    category: entry?.category || "",
    best_time_ist: entry?.best_time_ist || "",
    posted_url: entry?.posted_url || "",
    posted_at: entry?.posted_at || "",
  })
  const [aiSectionOpen, setAiSectionOpen] = useState(!!(entry?.topic || entry?.hook || entry?.cta))

  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.client_id) {
      toast.error("Title and Client are required")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/content-calendar", {
        method: "POST",
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success(formData.id ? "Post updated" : "Post created")
        onSave()
      } else {
        throw new Error()
      }
    } catch (err) {
      toast.error("Failed to save post")
    } finally {
      setLoading(false)
    }
  }

  const togglePlatform = (p: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p]
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-zinc-900 font-bold text-lg">{formData.id ? 'Edit Post' : 'New Content Entry'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Post Title *</label>
              <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="Main hook or topic..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Client *</label>
              <select value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]">
                <option value="">Select a client...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Content Type</label>
              <select value={formData.content_type} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]">
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scheduled Date</label>
              <input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${formData.platforms.includes(p) ? 'bg-[#003434] text-white border-[#003434]' : 'bg-transparent text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Status</label>
            <div className="grid grid-cols-5 gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFormData({ ...formData, status: s })}
                  className={`px-2 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${formData.status === s ? STATUS_COLORS[s] : 'bg-transparent text-zinc-400 border-zinc-200 hover:border-zinc-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Caption</label>
            <textarea rows={4} value={formData.caption} onChange={e => setFormData({ ...formData, caption: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B] resize-none" placeholder="Write post caption here..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hashtags</label>
              <input value={formData.hashtags} onChange={e => setFormData({ ...formData, hashtags: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="#ai #marketing..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Media URL</label>
              <input value={formData.media_url} onChange={e => setFormData({ ...formData, media_url: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="https://drive.google.com/..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Internal Notes</label>
            <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B] resize-none" placeholder="Feedback, ideas, or links..." />
          </div>

          {/* AI Content Details */}
          <div className="border border-zinc-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAiSectionOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-[#003434]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">AI Content Details</span>
              </div>
              <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${aiSectionOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {aiSectionOpen && (
              <div className="p-4 space-y-4 border-t border-zinc-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Topic</label>
                    <input value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="Core topic or theme..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Category</label>
                    <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="e.g. Educational, Promotional..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Hook</label>
                  <textarea rows={2} value={formData.hook} onChange={e => setFormData({ ...formData, hook: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B] resize-none" placeholder="Opening hook line..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Call to Action</label>
                  <input value={formData.cta} onChange={e => setFormData({ ...formData, cta: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="e.g. Book a free call today..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Best Time (IST)</label>
                    <input value={formData.best_time_ist} onChange={e => setFormData({ ...formData, best_time_ist: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="e.g. 6:00 PM IST" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Visual Direction</label>
                    <input value={formData.visual_direction} onChange={e => setFormData({ ...formData, visual_direction: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]" placeholder="e.g. Bold text on teal bg..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Image Prompt</label>
                  <textarea rows={2} value={formData.image_prompt} onChange={e => setFormData({ ...formData, image_prompt: e.target.value })} className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B] resize-none" placeholder="AI image generation prompt..." />
                </div>
              </div>
            )}
          </div>

          {/* Posted URL — shown when status is posted */}
          {formData.status === "posted" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border border-teal-100 bg-teal-50/40 rounded-xl p-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Posted URL</label>
                <input value={formData.posted_url} onChange={e => setFormData({ ...formData, posted_url: e.target.value })} className="w-full bg-white border border-teal-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-teal-400" placeholder="https://instagram.com/p/..." />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Posted At</label>
                <input type="datetime-local" value={formData.posted_at ? formData.posted_at.slice(0, 16) : ""} onChange={e => setFormData({ ...formData, posted_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} className="w-full bg-white border border-teal-200 rounded-xl px-4 py-2 text-sm text-zinc-900 outline-none focus:border-teal-400" />
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-end gap-3 bg-zinc-50">
          <button onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-[#003434] hover:bg-[#004d4d] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm"
          >
            {loading ? "Saving..." : (formData.id ? "Update Post" : "Create Post")}
          </button>
        </div>
      </div>
    </div>
  )
}

// Always route through the server-side proxy so the n8n URL stays secret
const N8N_REEVALUATE_URL = "/api/content-calendar/reevaluate"

function ReviewPanel({ entry, onClose, onSaved, onUpdate }: {
  entry: Entry
  onClose: () => void
  onSaved: () => void
  onUpdate: (e: Entry) => void
}) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editCaption, setEditCaption] = useState(entry.caption ?? "")
  const [editMediaUrl, setEditMediaUrl] = useState(entry.media_url ?? "")
  const [overrideModal, setOverrideModal] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const revisionCount = entry.revision_count ?? 0
  const history: RevisionHistoryItem[] = (entry.revision_history ?? []).slice(-3).reverse()
  const maxRevisionsReached = revisionCount >= 3

  async function save(updates: Partial<Entry>) {
    setSaving(true)
    try {
      const res = await fetch("/api/content-calendar", {
        method: "POST",
        body: JSON.stringify({ ...entry, ...updates }),
      })
      if (!res.ok) throw new Error()
      return true
    } catch {
      toast.error("Failed to save changes")
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleReEvaluate() {
    if (maxRevisionsReached) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res = await fetch(N8N_REEVALUATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: entry.id }),
      })
      if (res.ok) {
        const json = await res.json().catch(() => ({}))
        const newCaption = json.caption ?? aiResult ?? entry.caption ?? ""
        setAiResult(newCaption)
        const newHistory: RevisionHistoryItem[] = [
          ...(entry.revision_history ?? []),
          { caption: entry.caption ?? "", timestamp: new Date().toISOString(), reason: "AI re-evaluation" },
        ]
        const updated: Partial<Entry> = {
          revision_count: revisionCount + 1,
          revision_history: newHistory,
          caption: newCaption,
          status: "designed",
        }
        const ok = await save(updated)
        if (ok) {
          onUpdate({ ...entry, ...updated })
          toast.success("AI re-evaluation complete")
          onSaved()
        }
      } else {
        toast.error("n8n webhook failed — check your automation")
      }
    } catch {
      toast.error("Could not reach n8n webhook")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleManualSave() {
    const newHistory: RevisionHistoryItem[] = [
      ...(entry.revision_history ?? []),
      { caption: entry.caption ?? "", timestamp: new Date().toISOString(), reason: "Manual edit" },
    ]
    const ok = await save({
      caption: editCaption,
      media_url: editMediaUrl,
      revision_count: revisionCount + 1,
      revision_history: newHistory,
      status: "designed",
    })
    if (ok) {
      toast.success("Post updated")
      onSaved()
    }
  }

  async function handleOverrideApprove() {
    const newHistory: RevisionHistoryItem[] = [
      ...(entry.revision_history ?? []),
      { caption: entry.caption ?? "", timestamp: new Date().toISOString(), reason: "Override approved by admin" },
    ]
    const ok = await save({ status: "approved", revision_history: newHistory })
    if (ok) {
      toast.success("Post approved — status set to approved")
      setOverrideModal(false)
      onSaved()
    }
  }

  return (
    <div className="xl:w-[400px] shrink-0 bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-zinc-100 flex items-center justify-between ${entry.status === 'rejected' ? 'bg-red-50' : 'bg-orange-50'}`}>
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${entry.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />
          <span className="text-zinc-900 font-bold text-sm">Re-evaluation Panel</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Max revisions warning */}
        {maxRevisionsReached && (
          <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <p className="text-red-400 text-xs font-medium">Max revisions reached. Manual takeover required.</p>
          </div>
        )}

        {/* 1. Original content */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Original Content</p>
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4 space-y-3">
            {entry.media_url && (
              <div className="rounded-lg overflow-hidden bg-zinc-900 aspect-video flex items-center justify-center">
                {entry.media_url.match(/\.(mp4|webm|mov)$/i) ? (
                  <video src={entry.media_url} className="w-full h-full object-cover" controls />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.media_url} alt="Media" className="w-full h-full object-cover" onError={e => { (e.target as HTMLElement).style.display = 'none' }} />
                )}
              </div>
            )}
            {entry.caption && (
              <p className="text-zinc-600 text-xs leading-relaxed line-clamp-4">{entry.caption}</p>
            )}
            {!entry.caption && !entry.media_url && (
              <p className="text-zinc-600 text-xs italic">No caption or media attached.</p>
            )}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {entry.platforms?.map(p => (
                <span key={p} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${PLATFORM_COLORS[p] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Client feedback */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Client Feedback</p>
          <div className={`border rounded-xl p-4 space-y-3 ${entry.status === 'rejected' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
            {/* Comment */}
            <p className={`text-sm leading-relaxed ${entry.status === 'rejected' ? 'text-red-700' : 'text-orange-700'}`}>
              {entry.client_feedback || "No feedback provided."}
            </p>

            {/* Submitted by row */}
            <div className="flex items-center gap-2 pt-1 border-t border-black/5">
              <div className="w-6 h-6 rounded-full bg-zinc-200 border border-zinc-300 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-zinc-500">
                  {(entry.submitted_by ?? entry.clients?.legal_name ?? '?')[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-900 text-xs font-medium truncate">
                  {entry.submitted_by ?? entry.clients?.legal_name ?? 'Client'}
                </p>
                {entry.submitted_at && (
                  <p className="text-zinc-600 text-[10px] font-mono">
                    {new Date(entry.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {entry.feedback_role && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-zinc-100 text-zinc-500 border-zinc-200">
                    {entry.feedback_role}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  entry.status === 'rejected'
                    ? 'bg-red-100 text-red-600 border-red-200'
                    : 'bg-orange-100 text-orange-600 border-orange-200'
                }`}>
                  {entry.status === 'rejected' ? 'Rejected' : 'Changes Req.'}
                </span>
              </div>
            </div>

            {/* Revision round */}
            <div className="flex justify-end">
              <span className="text-zinc-600 text-[10px] font-mono">
                Revision round {Math.min(revisionCount + 1, 3)} of 3
              </span>
            </div>
          </div>
        </div>

        {/* 3. Action buttons */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Actions</p>

          {/* Re-evaluate with AI */}
          <button
            onClick={handleReEvaluate}
            disabled={aiLoading || maxRevisionsReached}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-[#003434] hover:bg-[#004d4d] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-sm"
          >
            {aiLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                AI processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Re-evaluate with AI
              </>
            )}
          </button>

          {/* Edit manually */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-700 font-medium text-sm rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit Manually
            </button>
          ) : (
            <div className="space-y-3 bg-zinc-50 border border-zinc-100 rounded-xl p-4">
              <textarea
                rows={4}
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                placeholder="Rewrite caption..."
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B] resize-none"
              />
              <input
                value={editMediaUrl}
                onChange={e => setEditMediaUrl(e.target.value)}
                placeholder="New media URL (optional)..."
                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#70BF4B]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleManualSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-[#003434] hover:bg-[#004d4d] disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-transparent border border-zinc-200 text-zinc-500 hover:text-zinc-900 text-xs rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Override + Approve */}
          <button
            onClick={() => setOverrideModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-transparent hover:bg-red-50 border border-red-100 hover:border-red-200 text-red-600 font-medium text-sm rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Override + Approve
          </button>
        </div>

        {/* AI result preview */}
        {aiResult && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#003434]">AI New Version</p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <p className="text-zinc-700 text-xs leading-relaxed">{aiResult}</p>
            </div>
          </div>
        )}

        {/* 4. Revision history */}
        {history.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setHistoryOpen(o => !o)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <span>Revision History ({history.length})</span>
              <svg className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {historyOpen && (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 font-medium">{h.reason}</span>
                      <span className="text-[10px] text-zinc-300 font-mono">
                        {h.timestamp ? format(new Date(h.timestamp), 'MMM d, HH:mm') : '—'}
                      </span>
                    </div>
                    <p className="text-zinc-600 text-[11px] leading-relaxed line-clamp-3">{h.caption || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Override confirmation modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-red-100 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              </div>
              <div>
                <h4 className="text-zinc-900 font-bold text-sm">Override Client Feedback?</h4>
                <p className="text-zinc-500 text-xs mt-0.5">This bypasses client feedback. Are you sure?</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleOverrideApprove}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all"
              >
                {saving ? "Approving..." : "Yes, Approve"}
              </button>
              <button
                onClick={() => setOverrideModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium text-sm rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type GenerationLog = {
  id: string
  client_id: string | null
  generated_at: string
  status: string | null
  posts_generated: number | null
  errors: string | null
  platforms: string[] | null
  business_name: string | null
}

function GenerationLogsPanel() {
  const [open, setOpen] = useState(false)
  const { data } = useSWR<{ logs: GenerationLog[] }>('/api/content-generation-logs?limit=15', fetcher)
  const logs = data?.logs ?? []

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-zinc-50 transition-colors hover:bg-zinc-100/50"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#003434]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-[#003434] text-xs font-bold uppercase tracking-widest">AI Generation Runs</span>
          <span className="text-zinc-400 text-xs">({logs.length} recent)</span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {["Client", "Generated At", "Status", "Posts Created", "Platforms", "Errors"].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-600 text-sm italic">No generation runs recorded yet.</td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-3 text-zinc-700 text-sm font-medium">{log.business_name || <span className="text-zinc-400 italic text-xs">Unknown</span>}</td>
                  <td className="px-6 py-3 text-zinc-500 text-xs font-mono whitespace-nowrap">
                    {log.generated_at ? format(new Date(log.generated_at), 'MMM d, yyyy HH:mm') : '—'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${GEN_STATUS_COLORS[log.status ?? ''] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                      {log.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs font-mono">
                    {log.posts_generated != null ? log.posts_generated : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(log.platforms ?? []).map(p => (
                        <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${PLATFORM_COLORS[p] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>{p}</span>
                      ))}
                      {!log.platforms?.length && <span className="text-zinc-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-red-400 text-xs max-w-[200px] truncate" title={log.errors ?? ''}>
                    {log.errors || <span className="text-zinc-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type BlogActivityPost = {
  id: string
  title: string
  slug: string
  category: string
  published_at: string | null
  views: number
  client_id: string | null
}

function BlogActivityPanel() {
  const [open, setOpen] = useState(true)
  const { data } = useSWR<{ posts: BlogActivityPost[] }>('/api/blog?status=published&limit=8', fetcher)
  const posts = data?.posts ?? []

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-zinc-100 bg-zinc-50 transition-colors hover:bg-zinc-100/50"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#003434]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9h3M7 13h10M7 17h10" />
          </svg>
          <span className="text-[#003434] text-xs font-bold uppercase tracking-widest">Blog Activity</span>
          <span className="text-zinc-400 text-xs">({posts.length} recent posts)</span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                {["Title", "Category", "Published", "Views"].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-600 text-sm italic">No published blog posts yet.</td>
                </tr>
              ) : posts.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                  <td className="px-6 py-3">
                    <a
                      href={`/blog/${p.id}`}
                      className="text-zinc-900 text-sm font-medium truncate max-w-[280px] block group-hover:text-[#003434] transition-colors"
                    >
                      {p.title}
                    </a>
                    <span className="text-zinc-400 text-[10px] font-mono">/{p.slug}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 uppercase font-bold">
                      {p.category || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-zinc-500 text-xs font-mono">
                    {p.published_at ? format(new Date(p.published_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-6 py-3 text-zinc-400 text-xs font-mono">
                    {p.views?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
