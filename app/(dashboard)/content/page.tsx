"use client"

import { useState, useMemo, useEffect } from "react"
import useSWR from "swr"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"

const fetcher = (url: string) => fetch(url).then(r => r.json())

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
  clients?: { legal_name: string }
}

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "Twitter", "YouTube", "Pinterest"]
const CONTENT_TYPES = ["static", "carousel", "reel", "blog", "story"]
const STATUS_OPTIONS = ["idea", "writing", "designed", "approved", "posted"]

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Facebook: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  LinkedIn: "bg-indigo-600/20 text-indigo-400 border-indigo-600/30",
  Twitter: "bg-sky-400/20 text-sky-400 border-sky-400/30",
  YouTube: "bg-red-600/20 text-red-400 border-red-600/30",
  Pinterest: "bg-red-500/20 text-red-400 border-red-500/30",
}

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  writing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  designed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  posted: "bg-teal-500/20 text-teal-400 border-teal-500/30",
}

export default function ContentPage() {
  const [view, setView] = useState<"table" | "calendar">("table")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Partial<Entry> | null>(null)
  
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

  return (
    <div className="space-y-6 pb-20 lg:pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage cross-platform content strategy</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#001f1f] border border-[#003434] rounded-xl p-1">
            <button
              onClick={() => setView("table")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "table" ? "bg-[#003434] text-[#D0F255] shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Table
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "calendar" ? "bg-[#003434] text-[#D0F255] shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Calendar
            </button>
          </div>
          <button
            onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-semibold text-sm rounded-xl transition-all shadow-lg shadow-[#70BF4B]/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Post
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#001f1f] border border-[#003434] rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search posts or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#001414] border border-[#003434] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-[#70BF4B]/30 transition-all"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="bg-[#001414] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]/30"
        >
          <option value="all">All Clients</option>
          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="bg-[#001414] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]/30"
        >
          <option value="all">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#001414] border border-[#003434] text-zinc-300 text-sm rounded-xl px-3 py-2 outline-none focus:border-[#70BF4B]/30"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {view === "table" ? (
        <TableView entries={filteredEntries} onEdit={(e) => { setEditingEntry(e); setIsModalOpen(true); }} onDelete={handleDelete} onMarkPosted={handleMarkPosted} />
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

      {isModalOpen && (
        <PostModal
          entry={editingEntry}
          clients={clients}
          onClose={() => setIsModalOpen(false)}
          onSave={() => { setIsModalOpen(false); mutate(); }}
        />
      )}

      <BlogActivityPanel />
    </div>
  )
}

function TableView({ entries, onEdit, onDelete, onMarkPosted }: { entries: Entry[], onEdit: (e: Entry) => void, onDelete: (id: string) => void, onMarkPosted: (e: Entry) => void }) {
  return (
    <div className="bg-[#001f1f] border border-[#003434] rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#003434] bg-[#001a1a]/50">
              {["Title", "Client", "Type", "Platforms", "Status", "Scheduled", "Actions"].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#003434]/50">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-zinc-600 text-sm italic">No posts found matching filters.</td>
              </tr>
            ) : entries.map(e => (
              <tr key={e.id} className="hover:bg-[#003434]/30 transition-colors group">
                <td className="px-6 py-4">
                  <p className="text-white text-sm font-semibold truncate max-w-[200px]">{e.title}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-400 text-xs">{e.clients?.legal_name || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#003434] text-zinc-500 uppercase font-bold">{e.content_type}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[120px]">
                    {e.platforms?.map(p => (
                      <div key={p} className={`w-2 h-2 rounded-full ${PLATFORM_COLORS[p]?.split(' ')[0]}`} title={p} />
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-zinc-500 text-xs font-mono">{e.scheduled_date || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(e)} className="p-1.5 text-zinc-400 hover:text-[#70BF4B] transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={() => onDelete(e.id)} className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    {e.status !== 'posted' && (
                      <button onClick={() => onMarkPosted(e)} className="text-[10px] font-bold text-[#70BF4B] hover:underline">Mark Posted</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
    <div className="bg-[#001f1f] border border-[#003434] rounded-2xl overflow-hidden shadow-sm flex flex-col h-[700px]">
      <div className="px-6 py-4 border-b border-[#003434] flex items-center justify-between bg-[#001a1a]/50">
        <h2 className="text-white font-bold text-lg">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <button onClick={onPrev} className="p-2 text-zinc-500 hover:text-white bg-[#003434] rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <button onClick={onNext} className="p-2 text-zinc-500 hover:text-white bg-[#003434] rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-[#003434] bg-[#001a1a]/30">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center border-r border-[#003434] last:border-0">{d}</div>
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
              className={`min-h-[100px] border-r border-b border-[#003434] p-2 transition-colors cursor-pointer hover:bg-[#70BF4B]/5 ${!isCurrentMonth ? 'opacity-25' : ''} ${isToday ? 'bg-[#70BF4B]/5' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-mono ${isToday ? 'text-[#D0F255] font-bold' : 'text-zinc-500'}`}>{format(day, "d")}</span>
                {dayEntries.length > 0 && <span className="text-[9px] text-[#70BF4B] font-bold">{dayEntries.length} posts</span>}
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
  })

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#001a1a] border border-[#003434] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-[#003434] flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{formData.id ? 'Edit Post' : 'New Content Entry'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Post Title *</label>
              <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30" placeholder="Main hook or topic..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Client *</label>
              <select value={formData.client_id} onChange={e => setFormData({ ...formData, client_id: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30">
                <option value="">Select a client...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Content Type</label>
              <select value={formData.content_type} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30">
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Scheduled Date</label>
              <input type="date" value={formData.scheduled_date} onChange={e => setFormData({ ...formData, scheduled_date: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30" />
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
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${formData.platforms.includes(p) ? 'bg-[#70BF4B] text-[#001a1a] border-[#70BF4B]' : 'bg-transparent text-zinc-500 border-[#003434] hover:border-zinc-700'}`}
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
                  className={`px-2 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${formData.status === s ? STATUS_COLORS[s] : 'bg-transparent text-zinc-500 border-[#003434] hover:border-zinc-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Caption</label>
            <textarea rows={4} value={formData.caption} onChange={e => setFormData({ ...formData, caption: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30 resize-none" placeholder="Write post caption here..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hashtags</label>
              <input value={formData.hashtags} onChange={e => setFormData({ ...formData, hashtags: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30" placeholder="#ai #marketing..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Media URL</label>
              <input value={formData.media_url} onChange={e => setFormData({ ...formData, media_url: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30" placeholder="https://drive.google.com/..." />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Internal Notes</label>
            <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full bg-[#002626] border border-[#003434] rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-[#70BF4B]/30 resize-none" placeholder="Feedback, ideas, or links..." />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-[#003434] flex items-center justify-end gap-3 bg-[#001a1a]">
          <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-50 text-[#001a1a] font-bold text-sm rounded-xl transition-all shadow-lg shadow-[#70BF4B]/10"
          >
            {loading ? "Saving..." : (formData.id ? "Update Post" : "Create Post")}
          </button>
        </div>
      </div>
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
    <div className="bg-[#001f1f] border border-[#003434] rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 flex items-center justify-between border-b border-[#003434] bg-[#001a1a]/50 transition-colors hover:bg-[#003434]/30"
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-[#70BF4B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 9h3M7 13h10M7 17h10" />
          </svg>
          <span className="text-[#70BF4B] text-xs font-bold uppercase tracking-widest">Blog Activity</span>
          <span className="text-zinc-600 text-xs">({posts.length} recent posts)</span>
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
              <tr className="border-b border-[#003434]/60 bg-[#001a1a]/30">
                {["Title", "Category", "Published", "Views"].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#003434]/40">
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-600 text-sm italic">No published blog posts yet.</td>
                </tr>
              ) : posts.map(p => (
                <tr key={p.id} className="hover:bg-[#003434]/20 transition-colors group">
                  <td className="px-6 py-3">
                    <a
                      href={`/blog/${p.id}`}
                      className="text-white text-sm font-medium truncate max-w-[280px] block group-hover:text-[#70BF4B] transition-colors"
                    >
                      {p.title}
                    </a>
                    <span className="text-zinc-600 text-[10px] font-mono">/{p.slug}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#003434] text-zinc-400 uppercase font-bold">
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
