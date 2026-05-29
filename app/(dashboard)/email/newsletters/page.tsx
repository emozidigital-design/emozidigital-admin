"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"
import EmailEditorModal from "@/components/email/EmailEditorModal"

// ─── Constants ──────────────────────────────────────────────────────────────────
const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const AGENTBAZAR_BLOG_URL = "https://blog.agentbazar.in"
const TEST_EMAIL = "emozidigital@gmail.com"
const CACHE_TTL = 30_000

// ─── Types ──────────────────────────────────────────────────────────────────────

type EmailType = "newsletter" | "campaign"
type StatusFilter = "all" | "sent" | "sending" | "failed" | "scheduled" | "draft" | "test"
type TypeFilter = "all" | "newsletter" | "campaign"
type CreateMode = null | "newsletter" | "campaign"

interface UnifiedEmail {
  id: string
  type: EmailType
  subject: string
  tagIds: string[]
  tagNames: string[]
  sent: number | null
  openCount: number | null
  openPct: number | null
  unopenCount: number | null
  clickCount: number | null
  clickPct: number | null
  status: string
  sentAt: string | null
  scheduledAt: string | null
  createdAt: string
  // newsletter-specific raw data for wizard pre-fill
  raw?: RawNewsletter
  // campaign-specific raw data for form pre-fill
  rawCampaign?: RawCampaign
}

interface RawCampaign {
  id: string
  client_id: string
  subject: string
  status: string
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
  tag_ids: string[]
  sent_count: number
  opens_count: number
  clicks_count: number
  sender_id: string | null
  template_id: string | null
  email_senders: { from_email: string; from_name: string } | null
  email_templates: { name: string; html_body?: string } | null
}

interface RawNewsletter {
  id: string
  subject: string
  status: string
  sent_at: string | null
  scheduled_at: string | null
  created_at: string
  tag_ids: string[]
  sent_count: number
  recipient_count: number
  failed_count: number
  opens_count: number
  clicks_count: number
  blog_post_id: string
  sender_id: string | null
  list_id: string | null
  trending_post_ids: string[]
  newsletter_template_id: string | null
  recipient_type: string
}

interface Tag { id: string; name: string; contact_count?: number }
interface Sender { id: string; from_name: string; from_email: string; domain: string; dkim_status: string }
interface TemplateOption { id: string; name: string; subject: string; html_body?: string }
interface BlogPost {
  id: string; title: string; slug: string; category: string; status: string
  excerpt?: string; cover_image_url?: string; published_at: string | null; client_id: string | null
}
interface NewsletterTemplate {
  id: string; client_id: string; name: string; subject: string; html_body: string
  template_type: string; created_at: string; updated_at: string
}
interface ContactRow { email: string; name: string; opened: boolean }

// ─── Status config ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { badge: string; dot: string; label: string }> = {
  sending:   { badge: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-400",   label: "Sending"   },
  sent:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500", label: "Sent"      },
  failed:    { badge: "bg-red-50 text-red-700 border-red-200",              dot: "bg-red-500",     label: "Failed"    },
  scheduled: { badge: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-400",    label: "Scheduled" },
  draft:     { badge: "bg-zinc-100 text-zinc-500 border-zinc-200",          dot: "bg-zinc-300",    label: "Draft"     },
  test:      { badge: "bg-purple-50 text-purple-700 border-purple-200",     dot: "bg-purple-400",  label: "Test"      },
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" }, { key: "sent", label: "Sent" }, { key: "sending", label: "Sending" },
  { key: "scheduled", label: "Scheduled" }, { key: "draft", label: "Draft" }, { key: "failed", label: "Failed" },
]

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" }, { key: "newsletter", label: "Newsletter" }, { key: "campaign", label: "Campaign" },
]

const VARIABLE_REFERENCE = [
  { key: "{{first_name}}", desc: "Recipient's first name" },
  { key: "{{hero_title}}", desc: "Hero post title" },
  { key: "{{hero_excerpt}}", desc: "Hero post excerpt" },
  { key: "{{hero_url}}", desc: "Hero post URL" },
  { key: "{{hero_image_url}}", desc: "Hero post cover image URL" },
  { key: "{{trending_1_title}}", desc: "Trending post 1 title" },
  { key: "{{trending_1_url}}", desc: "Trending post 1 URL" },
  { key: "{{trending_2_title}}", desc: "Trending post 2 title" },
  { key: "{{trending_2_url}}", desc: "Trending post 2 URL" },
  { key: "{{unsubscribe_url}}", desc: "Unsubscribe link URL" },
]

const INPUT_CLS = "border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white w-full"

// ─── Small helpers ───────────────────────────────────────────────────────────────

function TagMultiSelect({ allTags, value, onChange, placeholder = "Filter by tag (optional)" }: {
  allTags: Tag[]; value: string[]; onChange: (ids: string[]) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  if (allTags.length === 0) return null
  const label = value.length === 0 ? placeholder : value.length === 1
    ? (allTags.find(t => t.id === value[0])?.name ?? placeholder)
    : `${value.length} tags selected`
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
        <span className={value.length === 0 ? "text-zinc-400" : "text-zinc-700"}>{label}</span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 max-h-44 overflow-y-auto">
          {allTags.map(tag => (
            <label key={tag.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
              <input type="checkbox" checked={value.includes(tag.id)} onChange={() => toggle(tag.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
              <span className="text-xs text-zinc-700 flex-1">{tag.name}</span>
              {tag.contact_count !== undefined && <span className="text-[10px] text-zinc-400 font-medium tabular-nums">{tag.contact_count.toLocaleString()}</span>}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Newsletter wizard props ─────────────────────────────────────────────────────

interface NewsletterWizardProps {
  editItem: UnifiedEmail | null
  clientId: string | null
  isAgentBazar: boolean
  posts: BlogPost[]
  loadingPosts: boolean
  senders: Sender[]
  allTags: Tag[]
  newsletterTemplates: NewsletterTemplate[]
  loadingTemplates: boolean
  closeOverlay: () => void
  loadNewsletterTemplates: () => void
}

function NewsletterWizard({ editItem, clientId, isAgentBazar, posts, loadingPosts, senders, allTags, newsletterTemplates, loadingTemplates, closeOverlay, loadNewsletterTemplates }: NewsletterWizardProps) {
  const initNs = editItem?.raw
  const [step, setStep] = useState<1 | 2 | 3>(initNs?.blog_post_id ? 2 : 1)
  const [isDuplicating] = useState(initNs?.subject?.startsWith("[D] ") ?? false)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(
    initNs ? (posts.find(p => p.id === initNs.blog_post_id) ?? null) : null
  )
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>(
    initNs?.trending_post_ids?.map(id => posts.find(p => p.id === id)).filter(Boolean) as BlogPost[] ?? []
  )
  const [postSearch, setPostSearch] = useState("")
  const [senderId, setSenderId] = useState(initNs?.sender_id ?? "")
  const [filterTagIds, setFilterTagIds] = useState<string[]>(initNs?.tag_ids ?? [])
  const [nlSubject, setNlSubject] = useState(initNs?.subject ?? "")
  const [selectedTemplateId, setSelectedTemplateId] = useState(initNs?.newsletter_template_id ?? (newsletterTemplates.length === 1 ? newsletterTemplates[0].id : ""))
  const [editingRecordId] = useState(editItem?.id ?? null)
  const [editingRecordStatus] = useState(initNs?.status ?? "draft")
  const [saving, setSaving] = useState(false)
  const [sendDropdownOpen, setSendDropdownOpen] = useState(false)
  const sendDropdownRef = useRef<HTMLDivElement>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorTemplate, setEditorTemplate] = useState<NewsletterTemplate | null>(null)
  const [showVarRef, setShowVarRef] = useState(false)
  const [tmplMenuId, setTmplMenuId] = useState<string | null>(null)
  const tmplMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target as Node)) setSendDropdownOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (tmplMenuRef.current && !tmplMenuRef.current.contains(e.target as Node)) setTmplMenuId(null) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(postSearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(postSearch.toLowerCase())
  )
  const activeTemplate = newsletterTemplates.find(t => t.id === selectedTemplateId)

  const buildPayload = () => ({
    blog_post_id: selectedPost!.id,
    sender_id: senderId,
    subject: nlSubject,
    client_id: clientId || null,
    recipient_type: isAgentBazar ? "list" : (filterTagIds.length > 0 ? "tags" : "leads"),
    tag_ids: filterTagIds,
    newsletter_template_id: selectedTemplateId || null,
    trending_post_ids: isAgentBazar ? trendingPosts.map(p => p.id) : [],
  })

  const validateStep3 = () => {
    if (!selectedPost || !senderId || !nlSubject) { toast.error("Fill all required fields"); return false }
    if (!isAgentBazar && filterTagIds.length === 0) { toast.error("Select at least one tag"); return false }
    return true
  }

  const handleSaveWithMode = async (mode: "draft" | "test" | "schedule" | "send") => {
    if (!validateStep3()) return
    if (mode === "schedule") { setShowScheduleModal(true); setSendDropdownOpen(false); return }
    setSaving(true)
    setSendDropdownOpen(false)
    try {
      if (mode === "send" || mode === "test") {
        const res = await fetch("/api/email/newsletter/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildPayload(), ...(mode === "test" ? { test_email: TEST_EMAIL } : {}) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (mode === "test") {
          toast.success(`Test email sent to ${TEST_EMAIL}`)
        } else {
          toast.success(`Sent to ${data.sent?.toLocaleString() ?? data.total?.toLocaleString() ?? 0} recipients${data.failed ? ` (${data.failed} failed)` : ""}`)
          closeOverlay()
        }
      } else {
        const isExisting = editingRecordId && editingRecordStatus === "draft"
        const url = isExisting ? `/api/email/newsletter/${editingRecordId}` : "/api/email/newsletter"
        const method = isExisting ? "PATCH" : "POST"
        const res = await fetch(url, {
          method, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildPayload(), status: "draft" }),
        })
        if (!res.ok) throw new Error("Save failed")
        toast.success("Saved as draft")
        closeOverlay()
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Operation failed")
    } finally {
      setSaving(false)
    }
  }

  const handleScheduleConfirm = async () => {
    if (!scheduleDateTime) { toast.error("Pick a date and time"); return }
    if (!validateStep3()) return
    setSaving(true)
    try {
      const isExisting = editingRecordId && editingRecordStatus === "draft"
      const url = isExisting ? `/api/email/newsletter/${editingRecordId}` : "/api/email/newsletter"
      const method = isExisting ? "PATCH" : "POST"
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), status: "scheduled", scheduled_at: new Date(scheduleDateTime).toISOString() }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Newsletter scheduled!")
      setShowScheduleModal(false)
      closeOverlay()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Schedule failed")
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this newsletter template?")) return
    try {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Template deleted")
      if (selectedTemplateId === id) setSelectedTemplateId("")
      loadNewsletterTemplates()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <div className="w-full">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={closeOverlay} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Newsletter / Campaign
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-medium text-zinc-700 flex items-center gap-2">
          {editingRecordId && editingRecordStatus === "draft" ? "Edit draft" : "New newsletter"}
          {isDuplicating && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 tracking-wide uppercase">Duplicate</span>}
        </span>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-1 mb-7 bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2.5 flex-1">
            <button
              onClick={() => { if (s < step || (s === 2 && selectedPost)) setStep(s) }}
              className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all shrink-0 ${step === s ? "bg-[#003434] text-white border-[#003434] shadow-sm" : step > s ? "bg-emerald-500 text-white border-emerald-500 cursor-pointer" : "bg-white text-zinc-400 border-zinc-300 cursor-default"}`}
            >
              {step > s ? "✓" : s}
            </button>
            <span className={`text-xs font-semibold tracking-tight ${step === s ? "text-zinc-800" : step > s ? "text-emerald-600" : "text-zinc-400"}`}>
              {s === 1 ? (isAgentBazar ? "Pick posts" : "Pick post") : s === 2 ? "Configure" : "Preview & send"}
            </span>
            {i < 2 && <div className="flex-1 h-px bg-zinc-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <p className="text-sm font-semibold text-zinc-700 mb-1">{isAgentBazar ? "Select hero post (Today's Highlight)" : "Select a blog post"}</p>
          <input type="text" placeholder="Search by title or category…" value={postSearch} onChange={e => setPostSearch(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 mb-3" />
          {loadingPosts ? (
            <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto mb-2" /><p className="text-sm text-zinc-400">Loading posts…</p></div>
          ) : filteredPosts.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">No published posts found.</p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredPosts.map(post => {
                const isSelected = selectedPost?.id === post.id
                return (
                  <button key={post.id} onClick={() => { setSelectedPost(post); setNlSubject(post.title); setTrendingPosts(prev => prev.filter(t => t.id !== post.id)); if (!isAgentBazar) setStep(2) }} className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all group ${isSelected ? "border-[#003434] bg-[#003434]/5" : "border-zinc-100 hover:border-[#003434] hover:bg-[#003434]/5"}`}>
                    {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="w-16 h-16 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} /> : <div className="w-16 h-16 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center"><span className="text-zinc-300 text-xs">No img</span></div>}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 group-hover:text-[#003434] truncate">{post.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{post.category} · {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN") : "No date"}</p>
                      {post.excerpt && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{post.excerpt}</p>}
                    </div>
                    {isSelected && <span className="text-xs font-semibold text-[#003434] shrink-0 self-center">Hero ✓</span>}
                  </button>
                )
              })}
            </div>
          )}
          {isAgentBazar && selectedPost && (
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-sm font-semibold text-zinc-700 mb-1">Select up to 2 trending posts <span className="ml-2 text-xs font-normal text-zinc-400">({trendingPosts.length}/2 selected)</span></p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredPosts.filter(p => p.id !== selectedPost.id).map(post => {
                  const isSel = trendingPosts.some(t => t.id === post.id)
                  const isDisabled = !isSel && trendingPosts.length >= 2
                  const toggleTrending = () => {
                    if (isDisabled) return
                    setTrendingPosts(prev => prev.some(t => t.id === post.id) ? prev.filter(t => t.id !== post.id) : [...prev, post])
                  }
                  return (
                    <button key={post.id} onClick={toggleTrending} disabled={isDisabled} className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all ${isSel ? "border-[#F47920] bg-orange-50" : isDisabled ? "border-zinc-100 opacity-40 cursor-not-allowed" : "border-zinc-100 hover:border-[#F47920] hover:bg-orange-50/40"}`}>
                      {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} /> : <div className="w-14 h-14 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center"><span className="text-zinc-300 text-xs">No img</span></div>}
                      <div className="min-w-0 flex-1"><p className="text-sm font-medium text-zinc-800 truncate">{post.title}</p><p className="text-xs text-zinc-400 mt-0.5">{post.category}</p></div>
                      {isSel && <span className="text-xs font-semibold text-[#F47920] shrink-0 self-center">Trending ✓</span>}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setStep(2)} className="mt-4 w-full bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004848] active:scale-[0.98] transition-all font-semibold shadow-sm">Continue to configure →</button>
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && selectedPost && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            {selectedPost.cover_image_url && <img src={selectedPost.cover_image_url} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
            <div className="min-w-0"><p className="text-sm font-semibold text-zinc-800 truncate">{selectedPost.title}</p><p className="text-xs text-zinc-400">{selectedPost.category}</p></div>
            <button onClick={() => setStep(1)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 shrink-0">Change</button>
          </div>
          {isAgentBazar && trendingPosts.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {trendingPosts.map(p => <span key={p.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full truncate max-w-[200px]">Trending: {p.title}</span>)}
            </div>
          )}
          {!loadingTemplates && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-500">Newsletter template</label>
                {newsletterTemplates.length > 0 && <button type="button" onClick={() => { setEditorTemplate(null); setEditorOpen(true) }} className="text-xs font-medium text-[#003434] hover:underline">+ New template</button>}
              </div>
              {newsletterTemplates.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                  <span className="text-xs text-zinc-400 flex-1">No newsletter templates yet — using default system layout.</span>
                  <button type="button" onClick={() => { setEditorTemplate(null); setEditorOpen(true) }} className="text-xs font-medium text-[#003434] hover:underline shrink-0">+ Create one</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
                      <option value="">Default system layout</option>
                      {newsletterTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {selectedTemplateId && (() => {
                      const selTmpl = newsletterTemplates.find(t => t.id === selectedTemplateId)
                      if (!selTmpl) return null
                      return (
                        <div className="relative shrink-0" ref={tmplMenuId === selTmpl.id ? tmplMenuRef : undefined}>
                          <button type="button" onClick={() => setTmplMenuId(tmplMenuId === selTmpl.id ? null : selTmpl.id)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                          </button>
                          {tmplMenuId === selTmpl.id && (
                            <div className="absolute right-0 top-9 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 w-28 ring-1 ring-black/5">
                              <button type="button" onClick={() => { setEditorTemplate(selTmpl); setEditorOpen(true); setTmplMenuId(null) }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium">Edit</button>
                              <div className="border-t border-zinc-100 my-1" />
                              <button type="button" onClick={() => { deleteTemplate(selTmpl.id); setTmplMenuId(null) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Delete</button>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  {selectedTemplateId ? <p className="text-xs text-emerald-600 mt-1">✓ Custom template selected</p> : <p className="text-xs text-zinc-400 mt-1">Using the default branded layout</p>}
                </>
              )}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Subject line</label>
            <input type="text" value={nlSubject} onChange={e => setNlSubject(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Email subject…" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Sender</label>
            <select value={senderId} onChange={e => setSenderId(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
              <option value="">Select a verified sender…</option>
              {senders.map(s => <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>)}
            </select>
            {senders.length === 0 && <p className="text-xs text-amber-600 mt-1">No verified senders found.</p>}
          </div>
          {!isAgentBazar && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Target tags <span className="font-normal text-zinc-400">(required)</span></label>
              {allTags.length === 0 ? <p className="text-xs text-amber-600">No tags found. Create tags first.</p> : <TagMultiSelect allTags={allTags} value={filterTagIds} onChange={setFilterTagIds} placeholder="Select tags…" />}
            </div>
          )}
          {isAgentBazar && allTags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Filter by tag <span className="font-normal text-zinc-400">(optional)</span></label>
              <TagMultiSelect allTags={allTags} value={filterTagIds} onChange={setFilterTagIds} placeholder="All contacts" />
            </div>
          )}
          <button onClick={() => { if (senderId && nlSubject && (isAgentBazar || filterTagIds.length > 0)) setStep(3) }} disabled={!senderId || !nlSubject || (!isAgentBazar && filterTagIds.length === 0)} className="w-full bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004848] disabled:opacity-40 active:scale-[0.98] transition-all font-semibold shadow-sm">Preview newsletter →</button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && selectedPost && (
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-700">Newsletter preview</p>
              <button onClick={() => setStep(2)} className="text-xs text-zinc-400 hover:text-zinc-600">← Edit config</button>
            </div>
            {activeTemplate ? (
              <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto bg-zinc-50 p-4 text-center">
                <p className="text-xs font-semibold text-zinc-500 mb-1">Custom template: {activeTemplate.name}</p>
                <p className="text-xs text-zinc-400">Variables will be substituted at send time.</p>
                <div className="mt-3 text-left text-xs font-mono text-zinc-400 bg-white border border-zinc-100 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                  {activeTemplate.html_body.slice(0, 400)}{activeTemplate.html_body.length > 400 ? "…" : ""}
                </div>
              </div>
            ) : isAgentBazar ? (
              <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto text-sm">
                <div style={{ background: "#001D4A" }} className="px-6 py-3 text-center"><p className="text-white text-xs font-bold tracking-wider">agentBazar.in</p></div>
                <div className="px-6 pt-4 pb-3" style={{ borderBottom: "2px solid #F47920" }}>
                  <p className="italic text-zinc-700">Hello [subscriber],</p>
                  <p className="font-bold text-zinc-800 text-xs mt-0.5">Today&apos;s Highlight</p>
                </div>
                {selectedPost.cover_image_url && <img src={selectedPost.cover_image_url} alt="" className="w-full h-40 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
                <div className="px-6 py-4">
                  <p style={{ color: "#F47920" }} className="font-bold text-base leading-snug mb-2">{selectedPost.title}</p>
                  {selectedPost.excerpt && <p className="text-zinc-700 text-xs leading-relaxed font-semibold mb-4">{selectedPost.excerpt}</p>}
                  <span style={{ background: "#F47920" }} className="inline-block text-white text-xs font-bold italic px-5 py-2 rounded">Read Full Blog...</span>
                </div>
                <div style={{ background: "#1a6b3a" }} className="px-6 py-4 text-center">
                  <p className="text-white text-xs mb-0.5">For the latest Travel Blog & Updates</p>
                  <p className="text-white font-bold text-sm mb-2">Join Our WhatsApp Community Now</p>
                  <span className="inline-block bg-white text-xs font-bold px-5 py-1.5 rounded-full" style={{ color: "#1a6b3a" }}>▶ JOIN NOW</span>
                </div>
                <div className="px-6 py-5 border-t border-zinc-100 bg-white text-center">
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase mb-3">agentbazar.in</p>
                  <p className="text-[10px] font-bold text-zinc-800 underline mb-1">Unsubscribe from AgentBazar</p>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto">
                <div className="bg-[#003434] px-6 py-4"><p className="text-white text-sm font-semibold">{senders.find(s => s.id === senderId)?.from_name ?? "Sender"}</p></div>
                {selectedPost.cover_image_url && <img src={selectedPost.cover_image_url} alt="" className="w-full h-48 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
                <div className="p-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{selectedPost.category}</p>
                  <h2 className="text-xl font-bold text-zinc-900 mb-3 leading-snug">{selectedPost.title}</h2>
                  {selectedPost.excerpt && <p className="text-sm text-zinc-600 mb-5 leading-relaxed">{selectedPost.excerpt}</p>}
                  <span className="inline-block bg-[#003434] text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Read the full article →</span>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100"><p className="text-xs text-zinc-400 text-center">You received this because you subscribed. <span className="underline">Unsubscribe</span></p></div>
              </div>
            )}
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Subject</p><p className="text-xs font-semibold text-zinc-700 truncate">{nlSubject}</p></div>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Recipients</p><p className="text-xs font-semibold text-zinc-700 capitalize">{isAgentBazar ? "All contacts" : filterTagIds.length > 0 ? `${filterTagIds.length} tag${filterTagIds.length === 1 ? "" : "s"}` : "Leads"}</p></div>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3"><p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Template</p><p className="text-xs font-semibold text-zinc-700 truncate">{activeTemplate?.name ?? "Default"}</p></div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1" ref={sendDropdownRef}>
              <div className="flex rounded-xl overflow-hidden border-2 border-[#003434] shadow-sm">
                <button onClick={() => handleSaveWithMode("draft")} disabled={saving} className="flex-1 bg-white text-[#003434] text-sm py-3 font-semibold hover:bg-[#003434]/[0.04] disabled:opacity-50 transition-colors border-r-2 border-[#003434]">
                  {saving ? "Saving…" : "Save draft"}
                </button>
                <button onClick={() => setSendDropdownOpen(v => !v)} disabled={saving} className="bg-white text-[#003434] px-4 hover:bg-[#003434]/[0.04] disabled:opacity-50 transition-colors">
                  <svg className={`w-4 h-4 transition-transform ${sendDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              {sendDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-zinc-200 rounded-2xl shadow-xl py-1.5 z-50 ring-1 ring-black/5">
                  <button onClick={() => handleSaveWithMode("test")} disabled={saving} className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors disabled:opacity-50 rounded-lg">
                    <span className="text-sm font-semibold text-zinc-800">Save and test</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Send a test to {TEST_EMAIL}</span>
                  </button>
                  <button onClick={() => handleSaveWithMode("schedule")} disabled={saving} className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors disabled:opacity-50">
                    <span className="text-sm font-semibold text-zinc-800">Save and schedule</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Pick a date and time to send</span>
                  </button>
                  <div className="border-t border-zinc-100 my-1.5 mx-4" />
                  <button onClick={() => handleSaveWithMode("send")} disabled={saving} className="w-full text-left px-4 py-2.5 hover:bg-[#003434]/[0.05] transition-colors disabled:opacity-50">
                    <span className="text-sm font-bold text-[#003434]">Save and send now</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Send to all recipients immediately</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <EmailEditorModal
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditorTemplate(null); loadNewsletterTemplates() }}
        clientId={clientId ?? ""}
        initialTemplate={editorTemplate ? { id: editorTemplate.id, name: editorTemplate.name, subject: editorTemplate.subject, html_body: editorTemplate.html_body, template_type: "newsletter" } : undefined}
        onSaved={(id) => { loadNewsletterTemplates(); setSelectedTemplateId(id) }}
        defaultTemplateType="newsletter"
      />

      {/* Variable reference panel (accessible but collapsed) */}
      <div className="mt-6 border border-zinc-100 rounded-xl overflow-hidden">
        <button onClick={() => setShowVarRef(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-xs text-zinc-500 font-medium">
          Template variable reference <span>{showVarRef ? "▲" : "▼"}</span>
        </button>
        {showVarRef && (
          <div className="divide-y divide-zinc-50 bg-white">
            {VARIABLE_REFERENCE.map(v => (
              <div key={v.key} className="flex items-center gap-3 px-4 py-1.5">
                <code className="font-mono text-xs text-[#003434] shrink-0">{v.key}</code>
                <span className="text-xs text-zinc-400">{v.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-zinc-800 mb-1">Schedule newsletter</h3>
            <p className="text-xs text-zinc-400 mb-4">Pick a date and time to send this newsletter.</p>
            <input type="datetime-local" value={scheduleDateTime} onChange={e => setScheduleDateTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowScheduleModal(false)} className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium">Cancel</button>
              <button onClick={handleScheduleConfirm} disabled={saving || !scheduleDateTime} className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] disabled:opacity-40 font-medium">{saving ? "Scheduling…" : "Schedule"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Campaign form props ─────────────────────────────────────────────────────────

interface CampaignFormProps {
  editItem: UnifiedEmail | null
  clientId: string | null
  senders: Sender[]
  allTags: Tag[]
  campaignTemplates: TemplateOption[]
  loadingCampaignData: boolean
  closeOverlay: () => void
}

function CampaignForm({ editItem, clientId, senders, allTags, campaignTemplates, loadingCampaignData, closeOverlay }: CampaignFormProps) {
  const initC = editItem?.rawCampaign
  const [form, setForm] = useState({
    client_id: clientId ?? "",
    sender_id: initC?.sender_id ?? "",
    template_id: initC?.template_id ?? "",
    subject: initC?.subject ?? "",
    scheduled_at: initC?.scheduled_at ? initC.scheduled_at.slice(0, 16) : "",
  })
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initC?.tag_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [previewCampaign, setPreviewCampaign] = useState<RawCampaign | null>(null)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const tagMap = new Map(allTags.map(t => [t.id, t]))

  const toggleTag = (id: string) => setSelectedTagIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTagIds.length === 0) { toast.error("Select at least one tag to target"); return }
    setSaving(true)
    try {
      let res: Response
      if (initC) {
        res = await fetch(`/api/email/campaigns/${initC.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, tag_ids: selectedTagIds, scheduled_at: form.scheduled_at || null }),
        })
      } else {
        res = await fetch("/api/email/campaigns", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, tag_ids: selectedTagIds, scheduled_at: form.scheduled_at || null }),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(initC ? "Campaign updated" : "Campaign created")
      setPreviewCampaign(data)
      setShowSchedulePicker(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm("Send this campaign now to all eligible contacts?")) return
    setSending(true)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} contacts${data.failed ? ` (${data.failed} failed)` : ""}`)
      setPreviewCampaign(null)
      closeOverlay()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send error")
    } finally {
      setSending(false)
    }
  }

  const handleSaveTest = async (campaign: RawCampaign) => {
    setSendingTest(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}/send-test`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Test email sent to ${TEST_EMAIL}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Test send error")
    } finally {
      setSendingTest(false)
    }
  }

  const handleSaveSchedule = async (campaign: RawCampaign) => {
    if (!scheduleDateTime) { toast.error("Pick a date and time"); return }
    setScheduling(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: new Date(scheduleDateTime).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreviewCampaign(data)
      setShowSchedulePicker(false)
      setScheduleDateTime("")
      toast.success("Campaign scheduled!")
      closeOverlay()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Schedule error")
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="w-full">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={closeOverlay} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Newsletter / Campaign
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-medium text-zinc-700">{initC ? "Edit campaign" : "New campaign"}</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3 mb-6">
        <p className="text-sm font-semibold text-zinc-700">{initC ? "Edit campaign" : "New campaign"}</p>
        {loadingCampaignData ? (
          <p className="text-xs text-zinc-400 py-2">Loading options…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Sender</label>
              <select value={form.sender_id} onChange={e => setForm(f => ({ ...f, sender_id: e.target.value }))} className={INPUT_CLS} required>
                <option value="">Select sender…</option>
                {senders.filter(s => s.dkim_status === "verified").map(s => <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Template</label>
              <select value={form.template_id} onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))} className={INPUT_CLS} required>
                <option value="">Select template…</option>
                {campaignTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Subject</label>
              <input className={INPUT_CLS} placeholder="Email subject line" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Schedule (optional)</label>
              <input type="datetime-local" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
          </div>
        )}
        {allTags.length > 0 && (
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Target tags <span className="text-zinc-400 font-normal">(required)</span></label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => {
                const active = selectedTagIds.includes(tag.id)
                return (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-[#003434] border-[#003434] text-white" : "bg-white border-zinc-200 text-zinc-600 hover:border-[#003434]/40 hover:text-[#003434]"}`}>
                    {active && <span className="text-[10px] leading-none">✓</span>}
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={saving || loadingCampaignData} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : initC ? "Update & Preview" : "Create & Preview"}
          </button>
          <button type="button" onClick={closeOverlay} className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2">Cancel</button>
        </div>
      </form>

      {/* Preview modal */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <p className="font-semibold text-zinc-800">Campaign Preview</p>
              <button onClick={() => { setPreviewCampaign(null); setShowSchedulePicker(false); setScheduleDateTime("") }} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 grid grid-cols-3 gap-3 shrink-0">
              <div><p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Subject</p><p className="text-xs text-zinc-700 font-semibold truncate mt-0.5">{previewCampaign.subject}</p></div>
              <div><p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">From</p><p className="text-xs text-zinc-700 font-semibold truncate mt-0.5">{previewCampaign.email_senders?.from_name ?? "—"}</p></div>
              <div>
                <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Audience</p>
                {Array.isArray(previewCampaign.tag_ids) && previewCampaign.tag_ids.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {previewCampaign.tag_ids.map(tid => {
                      const tag = tagMap.get(tid)
                      return <span key={tid} className="text-xs font-semibold text-[#003434]">{tag?.name ?? tid}{tag?.contact_count != null && <span className="text-zinc-400 font-normal"> ({tag.contact_count})</span>}</span>
                    })}
                  </div>
                ) : <p className="text-xs text-zinc-400 mt-0.5">—</p>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {previewCampaign.email_templates?.html_body ? (
                <div className="border border-zinc-100 rounded-xl overflow-hidden bg-white" dangerouslySetInnerHTML={{ __html: previewCampaign.email_templates.html_body }} />
              ) : (
                <div className="border border-dashed border-zinc-200 rounded-xl p-8 text-center text-zinc-400 text-sm">No template preview available</div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-zinc-100 shrink-0">
              {showSchedulePicker && (
                <div className="mb-3 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                  <input type="datetime-local" value={scheduleDateTime} onChange={e => setScheduleDateTime(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" />
                  <button onClick={() => handleSaveSchedule(previewCampaign)} disabled={scheduling || !scheduleDateTime} className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 font-medium whitespace-nowrap">{scheduling ? "Scheduling…" : "Confirm Schedule"}</button>
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => handleSaveTest(previewCampaign)} disabled={sendingTest} className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium disabled:opacity-50">{sendingTest ? "Sending test…" : "Save & Test"}</button>
                <button onClick={() => setShowSchedulePicker(v => !v)} className={`flex-1 border text-sm py-2.5 rounded-xl font-medium transition-colors ${showSchedulePicker ? "bg-[#003434] border-[#003434] text-white" : "border-[#003434] text-[#003434] hover:bg-[#003434]/5"}`}>Save & Schedule</button>
                <button onClick={() => { setPreviewCampaign(null); setShowSchedulePicker(false); handleSend(previewCampaign.id) }} disabled={sending} className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] font-semibold disabled:opacity-50">{sending ? "Sending…" : "Save & Send"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page component ─────────────────────────────────────────────────────────

export default function NewslettersPage() {
  const { clientId, clients } = useClient()
  const isAgentBazar = clientId === AGENTBAZAR_CLIENT_ID
  const clientLabel = clients.find(c => c.client_id === clientId)?.label

  // ── List state ─────────────────────────────────────────────────────────────
  const [items, setItems]       = useState<UnifiedEmail[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>("all")

  // ── Cache ───────────────────────────────────────────────────────────────────
  const cacheRef = useRef<Map<string, { data: UnifiedEmail[]; ts: number }>>(new Map())

  // ── Create/Edit inline overlay ──────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false)
  const [createMode, setCreateMode]   = useState<CreateMode>(null)
  const [editItem, setEditItem]       = useState<UnifiedEmail | null>(null)
  const createDropRef = useRef<HTMLDivElement>(null)

  // ── 3-dot menu ──────────────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // ── Contacts popup (opens/unopen) ───────────────────────────────────────────
  const [contactsPopup, setContactsPopup] = useState<{
    id: string; type: EmailType; filter: "opened" | "unopened"; subject: string
  } | null>(null)
  const [contactsData, setContactsData]   = useState<ContactRow[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  // ── Share popup ─────────────────────────────────────────────────────────────
  const [shareItem, setShareItem] = useState<UnifiedEmail | null>(null)

  // ── Resend modal ────────────────────────────────────────────────────────────
  const [resendTarget, setResendTarget] = useState<UnifiedEmail | null>(null)
  const [resendSubject, setResendSubject] = useState("")
  const [resendScheduleAt, setResendScheduleAt] = useState("")
  const [resendShowSchedule, setResendShowSchedule] = useState(false)
  const [resending, setResending] = useState(false)

  // ── Confirm delete ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<UnifiedEmail | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Confirm duplicate ───────────────────────────────────────────────────────
  const [dupTarget, setDupTarget] = useState<UnifiedEmail | null>(null)
  const [duping, setDuping] = useState(false)

  // ─── Shared data (for newsletter wizard + campaign form) ────────────────────
  const [allTags, setAllTags]   = useState<Tag[]>([])
  const [senders, setSenders]   = useState<Sender[]>([])
  const [posts, setPosts]       = useState<BlogPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [newsletterTemplates, setNewsletterTemplates] = useState<NewsletterTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Campaign form additional data
  const [campaignTemplates, setCampaignTemplates] = useState<TemplateOption[]>([])
  const [loadingCampaignData, setLoadingCampaignData] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (createDropRef.current && !createDropRef.current.contains(e.target as Node)) setCreateOpen(false)
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [])

  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [openMenuId])

  // ─── Fetch list ─────────────────────────────────────────────────────────────

  const buildList = useCallback((campaigns: RawCampaign[], newsletters: RawNewsletter[], tagMap: Map<string, string>): UnifiedEmail[] => {
    const unified: UnifiedEmail[] = []
    for (const c of campaigns) {
      const tagNames = (c.tag_ids ?? []).map((id: string) => tagMap.get(id) ?? id)
      const sent = c.sent_count ?? 0
      const openCount = c.opens_count ?? 0
      const clickCount = c.clicks_count ?? 0
      const openPct = sent > 0 ? (openCount / sent) * 100 : 0
      const clickPct = sent > 0 ? (clickCount / sent) * 100 : 0
      unified.push({
        id: c.id, type: "campaign", subject: c.subject,
        tagIds: c.tag_ids ?? [], tagNames,
        sent, openCount, openPct,
        unopenCount: Math.max(0, sent - openCount),
        clickCount, clickPct,
        status: c.status, sentAt: c.sent_at, scheduledAt: c.scheduled_at, createdAt: c.created_at,
        rawCampaign: c,
      })
    }
    for (const n of newsletters) {
      const tagNames = (n.tag_ids ?? []).map((id: string) => tagMap.get(id) ?? id)
      const sent = n.sent_count ?? 0
      const openCount = n.opens_count ?? 0
      const clickCount = n.clicks_count ?? 0
      const openPct = sent > 0 ? (openCount / sent) * 100 : 0
      const clickPct = sent > 0 ? (clickCount / sent) * 100 : 0
      unified.push({
        id: n.id, type: "newsletter", subject: n.subject,
        tagIds: n.tag_ids ?? [], tagNames,
        sent, openCount, openPct,
        unopenCount: Math.max(0, sent - openCount),
        clickCount, clickPct,
        status: n.status, sentAt: n.sent_at, scheduledAt: n.scheduled_at, createdAt: n.created_at,
        raw: n,
      })
    }
    unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return unified
  }, [])

  const fetchList = useCallback((force = false) => {
    const cacheKey = clientId ?? ""
    if (!force) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setItems(cached.data)
        setLoading(false)
        return
      }
    }
    setLoading(true)
    const p = new URLSearchParams()
    if (clientId) p.set("client_id", clientId)
    Promise.all([
      fetch(`/api/email/campaigns?${p}`).then(r => r.json()),
      fetch(`/api/email/newsletter?${p}`).then(r => r.json()),
      clientId ? fetch(`/api/email/tags?${p}`).then(r => r.json()) : Promise.resolve([]),
    ]).then(([campaigns, newsletters, tags]) => {
      const tagMap = new Map<string, string>(
        (Array.isArray(tags) ? tags : []).map((t: Tag) => [t.id, t.name])
      )
      setAllTags(Array.isArray(tags) ? tags : [])
      const unified = buildList(
        Array.isArray(campaigns) ? campaigns : [],
        Array.isArray(newsletters) ? newsletters : [],
        tagMap
      )
      cacheRef.current.set(cacheKey, { data: unified, ts: Date.now() })
      setItems(unified)
    }).finally(() => setLoading(false))
  }, [clientId, buildList])

  const refreshList = useCallback(() => {
    cacheRef.current.delete(clientId ?? "")
    fetchList(true)
  }, [clientId, fetchList])

  useEffect(() => { fetchList() }, [fetchList])

  // ─── Load senders + tags for overlay ────────────────────────────────────────
  useEffect(() => {
    if (!clientId) return
    const p = new URLSearchParams({ client_id: clientId })
    Promise.all([
      fetch(`/api/email/senders?${p}`).then(r => r.json()),
      fetch(`/api/email/tags?${p}`).then(r => r.json()),
    ]).then(([s, tg]) => {
      setSenders(Array.isArray(s) ? s.filter((v: Sender) => v.dkim_status === "verified") : [])
      setAllTags(Array.isArray(tg) ? tg : [])
    })
  }, [clientId])

  // ─── Load posts for newsletter wizard ───────────────────────────────────────
  const loadPosts = useCallback(() => {
    if (!clientId) return
    setLoadingPosts(true)
    if (isAgentBazar) {
      fetch("/api/blog/agentbazar").then(r => r.json()).then(d => {
        const normalized: BlogPost[] = (d.posts ?? []).map((p: Record<string, unknown>) => ({
          id: p.id, title: p.title, slug: p.slug, category: p.category ?? "",
          status: p.status, excerpt: p.excerpt, cover_image_url: p.cover_image,
          published_at: (p.published_date as string) ?? null, client_id: null,
        }))
        setPosts(normalized)
      }).finally(() => setLoadingPosts(false))
    } else {
      const params = new URLSearchParams({ status: "published", limit: "100" })
      params.set("clientId", clientId)
      fetch(`/api/blog?${params}`).then(r => r.json())
        .then(d => setPosts(Array.isArray(d.posts) ? d.posts : []))
        .finally(() => setLoadingPosts(false))
    }
  }, [clientId, isAgentBazar])

  const loadNewsletterTemplates = useCallback(() => {
    if (!clientId) return
    setLoadingTemplates(true)
    const params = new URLSearchParams({ client_id: clientId, template_type: "newsletter" })
    fetch(`/api/email/templates?${params}`).then(r => r.json())
      .then(d => {
        const tmpl: NewsletterTemplate[] = Array.isArray(d) ? d : []
        setNewsletterTemplates(tmpl)
      }).finally(() => setLoadingTemplates(false))
  }, [clientId])

  const loadCampaignData = useCallback(() => {
    if (!clientId) return
    setLoadingCampaignData(true)
    const p = new URLSearchParams({ client_id: clientId })
    Promise.all([
      fetch(`/api/email/senders?${p}`).then(r => r.json()),
      fetch(`/api/email/templates?${p}`).then(r => r.json()),
      fetch(`/api/email/tags?${p}`).then(r => r.json()),
    ]).then(([s, t, tg]) => {
      setSenders(Array.isArray(s) ? s : [])
      setCampaignTemplates(Array.isArray(t) ? t : [])
      setAllTags(Array.isArray(tg) ? tg : [])
    }).finally(() => setLoadingCampaignData(false))
  }, [clientId])

  // ─── Open overlay ────────────────────────────────────────────────────────────

  const openNewNewsletter = () => {
    setEditItem(null)
    setCreateMode("newsletter")
    setCreateOpen(false)
    loadPosts()
    loadNewsletterTemplates()
  }

  const openNewCampaign = () => {
    setEditItem(null)
    setCreateMode("campaign")
    setCreateOpen(false)
    loadCampaignData()
  }

  const openEditItem = (item: UnifiedEmail) => {
    setEditItem(item)
    setOpenMenuId(null)
    if (item.type === "newsletter") {
      setCreateMode("newsletter")
      loadPosts()
      loadNewsletterTemplates()
    } else {
      setCreateMode("campaign")
      loadCampaignData()
    }
  }

  const closeOverlay = () => {
    setCreateMode(null)
    setEditItem(null)
    refreshList()
  }

  // ─── Contacts popup ──────────────────────────────────────────────────────────

  const openContactsPopup = async (item: UnifiedEmail, filter: "opened" | "unopened") => {
    setContactsPopup({ id: item.id, type: item.type, filter, subject: item.subject })
    setContactsLoading(true)
    setContactsData([])
    try {
      let rows: ContactRow[] = []
      const endpoint = item.type === "campaign"
        ? `/api/email/campaigns/${item.id}/contacts?filter=${filter}`
        : `/api/email/newsletter/${item.id}/contacts?filter=${filter}`
      const res = await fetch(endpoint)
      if (res.ok) rows = await res.json()
      setContactsData(rows)
    } catch {
      toast.error("Failed to load contacts")
    } finally {
      setContactsLoading(false)
    }
  }

  // ─── Share ───────────────────────────────────────────────────────────────────

  const handleShare = (item: UnifiedEmail) => {
    setShareItem(item)
    setOpenMenuId(null)
  }

  // ─── Resend ──────────────────────────────────────────────────────────────────

  const openResend = (item: UnifiedEmail) => {
    setResendTarget(item)
    setResendSubject(item.subject)
    setResendScheduleAt("")
    setResendShowSchedule(false)
    setOpenMenuId(null)
  }

  const handleResend = async () => {
    if (!resendTarget) return
    if (resendShowSchedule && !resendScheduleAt) { toast.error("Pick a date and time"); return }
    setResending(true)
    try {
      const endpoint = resendTarget.type === "campaign"
        ? `/api/email/campaigns/${resendTarget.id}/resend-unopened`
        : `/api/email/newsletter/${resendTarget.id}/resend-unopened`
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: resendSubject,
          scheduled_at: resendShowSchedule && resendScheduleAt ? new Date(resendScheduleAt).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.scheduled) {
        toast.success(`Scheduled resend to ${data.total.toLocaleString()} unopened recipients`)
      } else if (data.queued) {
        toast.success(`Queued resend to ${data.total.toLocaleString()} unopened recipients`)
      } else {
        toast.success(`Resent to ${data.sent} contacts${data.failed ? ` (${data.failed} failed)` : ""}`)
      }
      setResendTarget(null)
      refreshList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Resend failed")
    } finally {
      setResending(false)
    }
  }

  // ─── Duplicate ───────────────────────────────────────────────────────────────

  const handleDuplicate = async () => {
    if (!dupTarget) return
    setDuping(true)
    try {
      const endpoint = dupTarget.type === "campaign"
        ? `/api/email/campaigns/${dupTarget.id}/duplicate`
        : `/api/email/newsletter/${dupTarget.id}/duplicate`
      const res = await fetch(endpoint, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Duplicated — opening editor")
      setDupTarget(null)
      refreshList()
      // Open the duplicated item in edit mode
      setTimeout(() => {
        const dup: UnifiedEmail = {
          id: data.id,
          type: dupTarget.type,
          subject: data.subject ?? dupTarget.subject,
          tagIds: dupTarget.tagIds,
          tagNames: dupTarget.tagNames,
          sent: 0, openCount: 0, openPct: 0, unopenCount: 0, clickCount: 0, clickPct: 0,
          status: "draft", sentAt: null, scheduledAt: null, createdAt: new Date().toISOString(),
          raw: dupTarget.type === "newsletter" ? { ...dupTarget.raw!, id: data.id, subject: data.subject, status: "draft", sent_at: null, scheduled_at: null, created_at: data.created_at ?? new Date().toISOString(), sent_count: 0, opens_count: 0, clicks_count: 0, recipient_count: 0, failed_count: 0 } : undefined,
          rawCampaign: dupTarget.type === "campaign" ? { ...dupTarget.rawCampaign!, id: data.id, subject: data.subject, status: "draft", sent_at: null, scheduled_at: null, created_at: data.created_at ?? new Date().toISOString(), sent_count: 0, opens_count: 0, clicks_count: 0 } : undefined,
        }
        openEditItem(dup)
      }, 100)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Duplicate failed")
    } finally {
      setDuping(false)
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const endpoint = deleteTarget.type === "campaign"
        ? `/api/email/campaigns/${deleteTarget.id}`
        : `/api/email/newsletter/${deleteTarget.id}`
      const res = await fetch(endpoint, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Deleted")
      setDeleteTarget(null)
      refreshList()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filtered = items.filter(item => {
    const matchSearch = search.trim() === "" || item.subject.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || item.status === statusFilter
    const matchType = typeFilter === "all" || item.type === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const sentCount = items.filter(i => i.status === "sent").length

  function getDisplaySubject(subject: string): { text: string; isDup: boolean } {
    if (subject.startsWith("[D] ")) return { text: subject.slice(4), isDup: true }
    return { text: subject, isDup: false }
  }

  function formatDate(item: UnifiedEmail) {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft
    let dateStr = ""
    if (item.status === "sent" && item.sentAt) {
      dateStr = new Date(item.sentAt).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    } else if (item.status === "scheduled" && item.scheduledAt) {
      dateStr = new Date(item.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    }
    return { cfg, dateStr }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  // If overlay is active, show the wizard/form full-width
  if (createMode === "newsletter") return (
    <NewsletterWizard
      editItem={editItem}
      clientId={clientId}
      isAgentBazar={isAgentBazar}
      posts={posts}
      loadingPosts={loadingPosts}
      senders={senders}
      allTags={allTags}
      newsletterTemplates={newsletterTemplates}
      loadingTemplates={loadingTemplates}
      closeOverlay={closeOverlay}
      loadNewsletterTemplates={loadNewsletterTemplates}
    />
  )
  if (createMode === "campaign") return (
    <CampaignForm
      editItem={editItem}
      clientId={clientId}
      senders={senders}
      allTags={allTags}
      campaignTemplates={campaignTemplates}
      loadingCampaignData={loadingCampaignData}
      closeOverlay={closeOverlay}
    />
  )

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900">Newsletter / Campaign</h1>
              <button
                onClick={refreshList}
                title="Refresh list"
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{items.length} total · {sentCount} sent</p>
          </div>
        </div>

        {/* Create dropdown */}
        <div className="relative" ref={createDropRef}>
          <button
            onClick={() => setCreateOpen(o => !o)}
            className="flex items-center gap-2 bg-[#003434] text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#003434]/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {createOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-20">
              <button onClick={openNewNewsletter} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                <span className="w-5 h-5 rounded bg-violet-50 flex items-center justify-center text-[10px] font-bold text-violet-600">NL</span>
                New Newsletter
              </button>
              <div className="border-t border-zinc-100" />
              <button onClick={openNewCampaign} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors">
                <span className="w-5 h-5 rounded bg-sky-50 flex items-center justify-center text-[10px] font-bold text-sky-600">C</span>
                New Campaign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search by subject…" value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" />
        </div>
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
          {TYPE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === f.key ? "bg-[#003434] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>{f.label}</button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
          {STATUS_FILTERS.map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f.key ? "bg-[#003434] text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-zinc-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl py-16 text-center">
          <svg className="w-10 h-10 text-zinc-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <p className="text-sm text-zinc-400 font-medium">{items.length === 0 ? "No newsletters or campaigns yet." : "No results match your filters."}</p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_160px_80px_100px_100px_90px_150px_40px] gap-2 px-5 py-3 border-b border-[#002828] bg-[#003434]">
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Newsletter subject</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Selected tags</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide text-right">Emails sent</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide text-right">Opens</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide text-right">Unopen</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide text-right">Clicks</p>
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Status</p>
            <p />
          </div>

          {filtered.map((item, idx) => {
            const { cfg, dateStr } = formatDate(item)
            const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.025]"
            const { text: displaySubject, isDup } = getDisplaySubject(item.subject)

            return (
              <div
                key={item.id}
                className={`grid grid-cols-1 sm:grid-cols-[1fr_160px_80px_100px_100px_90px_150px_40px] gap-1 sm:gap-2 px-5 py-3.5 border-b border-zinc-100 last:border-b-0 hover:bg-[#003434]/[0.04] transition-colors ${rowBg}`}
              >
                {/* Subject */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.type === "newsletter" ? "bg-violet-50 text-violet-600 border-violet-200" : "bg-sky-50 text-sky-600 border-sky-200"}`}>
                    {item.type === "newsletter" ? "NL" : "C"}
                  </span>
                  {isDup && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">D</span>}
                  <button onClick={() => openEditItem(item)} className="text-sm font-medium text-zinc-800 hover:text-[#003434] hover:underline truncate transition-colors text-left">
                    {displaySubject}
                  </button>
                </div>

                {/* Tags */}
                <div className="self-center sm:block hidden">
                  {item.tagNames.length > 0 ? (
                    <p className="text-xs text-zinc-500 truncate" title={item.tagNames.join(", ")}>{item.tagNames.join(", ")}</p>
                  ) : <p className="text-xs text-zinc-300">—</p>}
                </div>

                {/* Sent */}
                <p className="text-sm font-semibold text-emerald-600 text-right self-center sm:block hidden">
                  {item.sent !== null ? item.sent.toLocaleString() : "—"}
                </p>

                {/* Opens — clickable */}
                <div className="text-right self-center sm:block hidden">
                  {item.openCount !== null && item.sent !== null && item.sent > 0 ? (
                    <button onClick={() => openContactsPopup(item, "opened")} className="text-right hover:opacity-70 transition-opacity group">
                      <p className="text-sm font-semibold text-zinc-700 group-hover:text-[#003434]">{((item.openPct ?? 0)).toFixed(1)}%</p>
                      <p className="text-[10px] text-zinc-400 group-hover:underline">({item.openCount})</p>
                    </button>
                  ) : <p className="text-sm text-zinc-300">—</p>}
                </div>

                {/* Unopen — clickable */}
                <div className="text-right self-center sm:block hidden">
                  {item.sent !== null && item.sent > 0 ? (
                    <button onClick={() => openContactsPopup(item, "unopened")} className="text-right hover:opacity-70 transition-opacity group">
                      <p className="text-sm font-semibold text-red-500 group-hover:text-red-600">{(((item.unopenCount ?? 0) / item.sent) * 100).toFixed(1)}%</p>
                      <p className="text-[10px] text-zinc-400 group-hover:underline">({item.unopenCount ?? 0})</p>
                    </button>
                  ) : <p className="text-sm text-zinc-300">—</p>}
                </div>

                {/* Clicks */}
                <div className="text-right self-center sm:block hidden">
                  {item.clickCount !== null && item.sent !== null ? (
                    <>
                      <p className="text-sm font-semibold text-zinc-700">{((item.clickPct ?? 0)).toFixed(1)}%</p>
                      <p className="text-[10px] text-zinc-400">({item.clickCount})</p>
                    </>
                  ) : <p className="text-sm text-zinc-300">—</p>}
                </div>

                {/* Status */}
                <div className="self-center sm:flex hidden items-center gap-2">
                  {item.status === "sent" && <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  <div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                    {dateStr && <p className="text-[10px] text-zinc-400 mt-0.5">{dateStr}</p>}
                  </div>
                </div>

                {/* 3-dot menu */}
                <div className="self-center flex justify-center relative" ref={openMenuId === item.id ? menuRef : undefined}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                  </button>
                  {openMenuId === item.id && (
                    <div className="absolute right-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 w-36 ring-1 ring-black/5">
                      <button onClick={() => openEditItem(item)} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium">Edit</button>
                      <button onClick={() => handleShare(item)} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium">Share</button>
                      <button onClick={() => openResend(item)} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium">Resend</button>
                      <button onClick={() => { setDupTarget(item); setOpenMenuId(null) }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium">Duplicate</button>
                      <div className="border-t border-zinc-100 my-1" />
                      <button onClick={() => { setDeleteTarget(item); setOpenMenuId(null) }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Delete</button>
                    </div>
                  )}
                </div>

                {/* Mobile secondary */}
                <div className="sm:hidden flex items-center gap-2 text-xs text-zinc-400">
                  {item.tagNames.length > 0 && <span className="truncate max-w-[120px]">{item.tagNames[0]}{item.tagNames.length > 1 ? ` +${item.tagNames.length - 1}` : ""}</span>}
                  {item.sent !== null && <><span>·</span><span className="text-emerald-600 font-medium">{item.sent} sent</span></>}
                  <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-zinc-400 mt-3 text-right">Showing {filtered.length} of {items.length} record{items.length !== 1 ? "s" : ""}</p>
      )}

      {/* ── Contacts Popup ─────────────────────────────────────────────────────── */}
      {contactsPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <div className="min-w-0">
                <p className="text-xs text-zinc-400 font-medium mb-0.5">{contactsPopup.filter === "opened" ? "Opened" : "Unopened"} contacts</p>
                <p className="text-sm font-semibold text-zinc-800 truncate">{contactsPopup.subject}</p>
              </div>
              <button onClick={() => setContactsPopup(null)} className="ml-3 text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contactsLoading ? (
                <div className="py-12 text-center"><div className="w-6 h-6 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto mb-3" /><p className="text-sm text-zinc-400">Loading contacts…</p></div>
              ) : contactsData.length === 0 ? (
                <div className="py-12 text-center"><p className="text-sm text-zinc-400">No {contactsPopup.filter} contacts found.</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_100px] gap-2 px-5 py-2 bg-zinc-50 border-b border-zinc-100 sticky top-0">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Email / Name</p>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide text-right">Status</p>
                  </div>
                  {contactsData.map((c, i) => (
                    <div key={i} className={`grid grid-cols-[1fr_100px] gap-2 px-5 py-2.5 border-b border-zinc-50 last:border-b-0 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/40"}`}>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700 truncate">{c.email}</p>
                        {c.name && <p className="text-[10px] text-zinc-400 truncate">{c.name}</p>}
                      </div>
                      <div className="text-right">
                        {c.opened ? (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">Opened</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-full">Not opened</span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="px-5 py-3 border-t border-zinc-100 shrink-0">
              <p className="text-xs text-zinc-400">{contactsData.length} contact{contactsData.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Share Popup ────────────────────────────────────────────────────────── */}
      {shareItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-800">Share</h3>
              <button onClick={() => setShareItem(null)} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-2">Shareable link for: <span className="font-medium text-zinc-700">{shareItem.subject}</span></p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/email/${shareItem.type === "newsletter" ? "newsletter" : "campaigns"}/${shareItem.id}`}
                className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-zinc-50 text-zinc-600 focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/email/${shareItem.type === "newsletter" ? "newsletter" : "campaigns"}/${shareItem.id}`)
                  toast.success("Link copied!")
                }}
                className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors font-medium whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resend Modal ───────────────────────────────────────────────────────── */}
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-zinc-800">Resend to unopened</h3>
              <button onClick={() => setResendTarget(null)} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">Sends only to contacts who did not open the original email.</p>
            <div className="mb-4">
              <label className="text-xs font-medium text-zinc-500 block mb-1">Subject</label>
              <input type="text" value={resendSubject} onChange={e => setResendSubject(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" />
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 cursor-pointer">
                <input type="checkbox" checked={resendShowSchedule} onChange={e => setResendShowSchedule(e.target.checked)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434]" />
                Schedule for later
              </label>
              {resendShowSchedule && (
                <input type="datetime-local" value={resendScheduleAt} onChange={e => setResendScheduleAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full mt-2 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResendTarget(null)} className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium">Cancel</button>
              <button onClick={handleResend} disabled={resending} className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] disabled:opacity-40 font-medium">
                {resending ? "Sending…" : resendShowSchedule ? "Schedule resend" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Duplicate Confirm ──────────────────────────────────────────────────── */}
      {dupTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-zinc-800 mb-2">Duplicate email?</h3>
            <p className="text-sm text-zinc-500 mb-1">A copy of <span className="font-medium text-zinc-700">{dupTarget.subject}</span> will be created as a draft.</p>
            <p className="text-xs text-zinc-400 mb-5">The duplicate will be marked with a <span className="font-bold text-amber-700">D</span> badge and opened for editing.</p>
            <div className="flex gap-2">
              <button onClick={() => setDupTarget(null)} className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium">Cancel</button>
              <button onClick={handleDuplicate} disabled={duping} className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] disabled:opacity-40 font-medium">{duping ? "Duplicating…" : "Duplicate"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-zinc-800 mb-2">Delete permanently?</h3>
            <p className="text-sm text-zinc-500 mb-5">This will permanently delete <span className="font-medium text-zinc-700">{deleteTarget.subject}</span> and all its send logs.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white text-sm py-2.5 rounded-xl hover:bg-red-700 disabled:opacity-40 font-medium">{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
