"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"
const TEST_EMAIL = "emozidigital@gmail.com"

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface EmailTag { id: string; name: string }

interface BlogPost {
  id: string
  title: string
  slug: string
  category: string
  status: string
  excerpt?: string
  cover_image_url?: string
  published_at: string | null
  client_id: string | null
}

interface Sender {
  id: string
  from_name: string
  from_email: string
  domain: string
  dkim_status: string
}

interface EmailList {
  id: string
  name: string
  contact_count: number
}

interface NewsletterSend {
  id: string
  subject: string
  recipient_type: string
  status: string
  sent_count: number
  failed_count: number
  opens_count: number
  clicks_count: number
  sent_at: string | null
  created_at: string
  blog_post_id: string
  sender_id: string | null
  list_id: string | null
  tag_ids: string[]
  trending_post_ids: string[]
  newsletter_template_id: string | null
  scheduled_at: string | null
}

interface NewsletterTemplate {
  id: string
  client_id: string
  name: string
  subject: string
  html_body: string
  template_type: string
  created_at: string
  updated_at: string
}

const VARIABLE_REFERENCE = [
  { key: "{{first_name}}", desc: "Recipient's first name" },
  { key: "{{hero_title}}", desc: "Hero post title" },
  { key: "{{hero_excerpt}}", desc: "Hero post excerpt" },
  { key: "{{hero_url}}", desc: "Hero post URL" },
  { key: "{{hero_image_url}}", desc: "Hero post cover image URL" },
  { key: "{{trending_1_title}}", desc: "Trending post 1 title" },
  { key: "{{trending_1_excerpt}}", desc: "Trending post 1 excerpt" },
  { key: "{{trending_1_url}}", desc: "Trending post 1 URL" },
  { key: "{{trending_1_image_url}}", desc: "Trending post 1 image URL" },
  { key: "{{trending_2_title}}", desc: "Trending post 2 title" },
  { key: "{{trending_2_excerpt}}", desc: "Trending post 2 excerpt" },
  { key: "{{trending_2_url}}", desc: "Trending post 2 URL" },
  { key: "{{trending_2_image_url}}", desc: "Trending post 2 image URL" },
  { key: "{{unsubscribe_url}}", desc: "Unsubscribe link URL" },
  { key: "{{client_name}}", desc: "Sender / client name" },
]

// ─── Small helpers ──────────────────────────────────────────────────────────────

function TagMultiSelect({ allTags, value, onChange, placeholder = "Filter by tag (optional)" }: {
  allTags: EmailTag[]; value: string[]; onChange: (ids: string[]) => void; placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  if (allTags.length === 0) return null
  const label = value.length === 0 ? placeholder : value.length === 1 ? (allTags.find(t => t.id === value[0])?.name ?? placeholder) : `${value.length} tags selected`
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
        <span className={value.length === 0 ? "text-zinc-400" : "text-zinc-700"}>{label}</span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 max-h-44 overflow-y-auto">
          {allTags.map(tag => (
            <label key={tag.id} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-zinc-50 cursor-pointer">
              <input type="checkbox" checked={value.includes(tag.id)} onChange={() => toggle(tag.id)} className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#003434] cursor-pointer" />
              <span className="text-xs text-zinc-700">{tag.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status, sentAt, scheduledAt }: { status: string; sentAt?: string | null; scheduledAt?: string | null }) {
  if (status === "sent") {
    const date = sentAt ? new Date(sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""
    return (
      <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        {date}
      </span>
    )
  }
  if (status === "draft") return <span className="text-xs text-zinc-400 font-medium">Draft</span>
  if (status === "scheduled") {
    const date = scheduledAt ? new Date(scheduledAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : ""
    return <span className="text-xs text-blue-600 font-medium bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Scheduled · {date}</span>
  }
  if (status === "sending") return <span className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Sending…</span>
  if (status === "test") return <span className="text-xs text-purple-700 font-medium bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">Test sent</span>
  if (status === "failed") return <span className="text-xs text-red-700 font-medium bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Failed</span>
  return <span className="text-xs text-zinc-400">{status}</span>
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const { clientId, clients } = useClient()
  const isAgentBazar = clientId === AGENTBAZAR_CLIENT_ID
  const clientLabel = clients.find(c => c.client_id === clientId)?.label

  // ── View state ──────────────────────────────────────────────────────────────
  const [view, setView] = useState<"dashboard" | "wizard">("dashboard")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Step 3 send dropdown
  const [sendDropdownOpen, setSendDropdownOpen] = useState(false)
  const sendDropdownRef = useRef<HTMLDivElement>(null)

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState("")

  // Saving / sending state
  const [saving, setSaving] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editingRecordStatus, setEditingRecordStatus] = useState<string>("draft")

  // Template panel
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [showVarRef, setShowVarRef] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NewsletterTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [tmplName, setTmplName] = useState("")
  const [tmplSubject, setTmplSubject] = useState("")
  const [tmplHtml, setTmplHtml] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState("")

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([])
  const [postSearch, setPostSearch] = useState("")
  const [recipientType, setRecipientType] = useState<"leads" | "list">("leads")
  const [senderId, setSenderId] = useState("")
  const [listId, setListId] = useState("")
  const [filterTagIds, setFilterTagIds] = useState<string[]>([])
  const [subject, setSubject] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")

  // ── Data ────────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [senders, setSenders] = useState<Sender[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [allTags, setAllTags] = useState<EmailTag[]>([])
  const [history, setHistory] = useState<NewsletterSend[]>([])
  const [newsletterTemplates, setNewsletterTemplates] = useState<NewsletterTemplate[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // ── Effects ─────────────────────────────────────────────────────────────────

  // Close action menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  // Close send dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target as Node)) setSendDropdownOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  useEffect(() => {
    if (isAgentBazar) setRecipientType("list")
  }, [isAgentBazar])

  useEffect(() => {
    setLoadingPosts(true)
    if (isAgentBazar) {
      fetch("/api/blog/agentbazar")
        .then(r => r.json())
        .then(d => {
          const normalized: BlogPost[] = (d.posts ?? []).map((p: Record<string, unknown>) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            category: p.category ?? "",
            status: p.status,
            excerpt: p.excerpt,
            cover_image_url: p.cover_image,
            published_at: (p.published_date as string) ?? null,
            client_id: null,
          }))
          setPosts(normalized)
        })
        .finally(() => setLoadingPosts(false))
    } else {
      const params = new URLSearchParams({ status: "published", limit: "100" })
      if (clientId) params.set("clientId", clientId)
      fetch(`/api/blog?${params}`)
        .then(r => r.json())
        .then(d => setPosts(Array.isArray(d.posts) ? d.posts : []))
        .finally(() => setLoadingPosts(false))
    }
  }, [clientId, isAgentBazar])

  useEffect(() => {
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/senders?${params}`)
      .then(r => r.json())
      .then(d => setSenders(Array.isArray(d) ? d.filter((s: Sender) => s.dkim_status === "verified") : []))
    fetch(`/api/email/lists?${params}`)
      .then(r => r.json())
      .then(d => setLists(Array.isArray(d) ? d : []))
    fetch(`/api/email/tags?${params}`)
      .then(r => r.json())
      .then(d => setAllTags(Array.isArray(d) ? d : []))
  }, [clientId])

  const refreshHistory = useCallback(() => {
    setLoadingHistory(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/newsletter?${params}`)
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .finally(() => setLoadingHistory(false))
  }, [clientId])

  useEffect(() => { refreshHistory() }, [refreshHistory])

  const refreshTemplates = useCallback(() => {
    if (!clientId) return
    setLoadingTemplates(true)
    const params = new URLSearchParams({ client_id: clientId, template_type: "newsletter" })
    fetch(`/api/email/templates?${params}`)
      .then(r => r.json())
      .then(d => {
        const tmpl: NewsletterTemplate[] = Array.isArray(d) ? d : []
        setNewsletterTemplates(tmpl)
        if (tmpl.length === 1) setSelectedTemplateId(tmpl[0].id)
      })
      .finally(() => setLoadingTemplates(false))
  }, [clientId])

  useEffect(() => { refreshTemplates() }, [refreshTemplates])

  // ── Wizard helpers ──────────────────────────────────────────────────────────

  const resetWizard = () => {
    setStep(1)
    setSelectedPost(null)
    setTrendingPosts([])
    setPostSearch("")
    setSubject("")
    setSenderId("")
    setListId("")
    setFilterTagIds([])
    setRecipientType(isAgentBazar ? "list" : "leads")
    setSelectedTemplateId(newsletterTemplates.length === 1 ? newsletterTemplates[0].id : "")
    setEditingRecordId(null)
    setEditingRecordStatus("draft")
    setSendDropdownOpen(false)
  }

  const startNewWizard = () => {
    resetWizard()
    setView("wizard")
  }

  const startEditWizard = (ns: NewsletterSend) => {
    resetWizard()
    setEditingRecordId(ns.id)
    setEditingRecordStatus(ns.status)
    setSubject(ns.subject)
    setSenderId(ns.sender_id ?? "")
    setListId(ns.list_id ?? "")
    setFilterTagIds(ns.tag_ids ?? [])
    setSelectedTemplateId(ns.newsletter_template_id ?? "")
    setRecipientType((ns.recipient_type as "leads" | "list") ?? "list")
    const post = posts.find(p => p.id === ns.blog_post_id)
    if (post) {
      setSelectedPost(post)
      if (ns.trending_post_ids?.length) {
        setTrendingPosts(ns.trending_post_ids.map(id => posts.find(p => p.id === id)).filter(Boolean) as BlogPost[])
      }
    }
    setStep(post ? 2 : 1)
    setView("wizard")
    setOpenMenuId(null)
  }

  const startDuplicateWizard = (ns: NewsletterSend) => {
    resetWizard()
    setSubject(ns.subject)
    setSelectedTemplateId(ns.newsletter_template_id ?? "")
    const post = posts.find(p => p.id === ns.blog_post_id)
    if (post) setSelectedPost(post)
    // Pre-fill same post/subject but clear recipients so user picks new ones
    setStep(2)
    setView("wizard")
    setOpenMenuId(null)
  }

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Delete this newsletter?")) return
    setOpenMenuId(null)
    const res = await fetch(`/api/email/newsletter/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Newsletter deleted")
      refreshHistory()
    } else {
      toast.error("Delete failed")
    }
  }

  const handleSelectHero = (post: BlogPost) => {
    setSelectedPost(post)
    setSubject(post.title)
    setTrendingPosts(prev => prev.filter(t => t.id !== post.id))
    if (!isAgentBazar) setStep(2)
  }

  const toggleTrending = (post: BlogPost) => {
    setTrendingPosts(prev => {
      if (prev.some(t => t.id === post.id)) return prev.filter(t => t.id !== post.id)
      if (prev.length >= 2) return prev
      return [...prev, post]
    })
  }

  // ── Save / Send handlers ────────────────────────────────────────────────────

  const buildPayload = () => ({
    blog_post_id: selectedPost!.id,
    sender_id: senderId,
    subject,
    client_id: clientId || null,
    recipient_type: recipientType,
    list_id: recipientType === "list" ? listId : null,
    tag_ids: filterTagIds,
    newsletter_template_id: selectedTemplateId || null,
    trending_post_ids: isAgentBazar ? trendingPosts.map(p => p.id) : [],
  })

  const validateStep3 = () => {
    if (!selectedPost || !senderId || !subject) { toast.error("Fill all required fields"); return false }
    if ((isAgentBazar || recipientType === "list") && !listId) { toast.error("Select a recipient list"); return false }
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
          body: JSON.stringify({
            ...buildPayload(),
            ...(mode === "test" ? { test_email: TEST_EMAIL } : {}),
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (mode === "test") {
          toast.success(`Test email sent to ${TEST_EMAIL}`)
        } else {
          toast.success(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}${data.failed ? ` · ${data.failed} failed` : ""}`)
          setView("dashboard")
          refreshHistory()
        }
      } else {
        // Save as draft
        const isExistingDraft = editingRecordId && editingRecordStatus === "draft"
        const url = isExistingDraft ? `/api/email/newsletter/${editingRecordId}` : "/api/email/newsletter"
        const method = isExistingDraft ? "PATCH" : "POST"
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildPayload(), status: "draft" }),
        })
        if (!res.ok) throw new Error("Save failed")
        toast.success("Saved as draft")
        setView("dashboard")
        refreshHistory()
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
      const isExistingDraft = editingRecordId && editingRecordStatus === "draft"
      const url = isExistingDraft ? `/api/email/newsletter/${editingRecordId}` : "/api/email/newsletter"
      const method = isExistingDraft ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildPayload(),
          status: "scheduled",
          scheduled_at: new Date(scheduleDateTime).toISOString(),
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast.success("Newsletter scheduled!")
      setShowScheduleModal(false)
      setView("dashboard")
      refreshHistory()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Schedule failed")
    } finally {
      setSaving(false)
    }
  }

  // ── Template CRUD ───────────────────────────────────────────────────────────

  const openCreate = () => { setEditingTemplate(null); setIsCreating(true); setTmplName(""); setTmplSubject(""); setTmplHtml("") }
  const openEdit = (t: NewsletterTemplate) => { setEditingTemplate(t); setIsCreating(false); setTmplName(t.name); setTmplSubject(t.subject); setTmplHtml(t.html_body) }
  const cancelForm = () => { setEditingTemplate(null); setIsCreating(false) }

  const saveTemplate = async () => {
    if (!tmplName.trim() || !tmplHtml.trim()) { toast.error("Name and HTML body are required"); return }
    setSavingTemplate(true)
    try {
      if (isCreating) {
        const res = await fetch("/api/email/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_id: clientId, name: tmplName.trim(), subject: tmplSubject.trim(), html_body: tmplHtml.trim(), template_type: "newsletter" }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success("Template created")
      } else if (editingTemplate) {
        const res = await fetch(`/api/email/templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tmplName.trim(), subject: tmplSubject.trim(), html_body: tmplHtml.trim() }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success("Template updated")
      }
      cancelForm()
      refreshTemplates()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this newsletter template?")) return
    setDeletingTemplateId(id)
    try {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Template deleted")
      if (selectedTemplateId === id) setSelectedTemplateId("")
      refreshTemplates()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingTemplateId("")
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(postSearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(postSearch.toLowerCase())
  )

  const activeTemplate = newsletterTemplates.find(t => t.id === selectedTemplateId)

  // ── Dashboard view ──────────────────────────────────────────────────────────

  if (view === "dashboard") {
    return (
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">Newsletters</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {isAgentBazar
                ? "Send AgentBazar blog posts as branded newsletters via AWS SES"
                : "Send blog posts as email newsletters to leads or contacts via AWS SES"}
            </p>
          </div>
          <button
            onClick={startNewWizard}
            className="flex items-center gap-2 bg-[#003434] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#004848] active:scale-[0.98] transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New newsletter
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_170px_90px_90px_80px_140px_40px] gap-0 border-b border-zinc-200 px-5 py-3 bg-zinc-50/70">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Newsletter subject</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Recipients</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-right">Sent</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-right">Opens</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest text-right">Clicks</span>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Status</span>
            <span />
          </div>

          {/* Rows */}
          {loadingHistory ? (
            <div className="py-16 text-center">
              <div className="w-6 h-6 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Loading newsletters…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-sm font-semibold text-zinc-600 mb-1">No newsletters yet</p>
              <p className="text-xs text-zinc-400">Create your first newsletter to get started.</p>
            </div>
          ) : (
            history.map((ns, idx) => {
              const recipientLabel = ns.recipient_type === "leads"
                ? "Leads"
                : lists.find(l => l.id === ns.list_id)?.name ?? ns.list_id?.slice(0, 8) ?? "–"
              const tagNames = (ns.tag_ids ?? []).map(id => allTags.find(t => t.id === id)?.name).filter(Boolean)
              const openPct = ns.sent_count > 0 ? Math.round(((ns.opens_count ?? 0) / ns.sent_count) * 100) : 0
              const rowBg = idx % 2 === 0 ? "bg-white" : "bg-[#003434]/[0.022]"

              return (
                <div
                  key={ns.id}
                  className={`grid grid-cols-[1fr_170px_90px_90px_80px_140px_40px] gap-0 px-5 py-3.5 items-center border-b border-zinc-100 last:border-b-0 hover:bg-[#003434]/[0.04] transition-colors ${rowBg}`}
                >
                  {/* Subject */}
                  <div className="min-w-0 pr-4">
                    <button
                      onClick={() => startEditWizard(ns)}
                      className="text-sm font-semibold text-[#003434] hover:underline underline-offset-2 truncate block text-left max-w-full"
                    >
                      {ns.subject}
                    </button>
                    {ns.status === "scheduled" && ns.scheduled_at && (
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Scheduled · {new Date(ns.scheduled_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {ns.status === "draft" && (
                      <p className="text-xs text-zinc-400 mt-0.5">Draft · {new Date(ns.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    )}
                  </div>

                  {/* Recipients */}
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-zinc-600 truncate">{recipientLabel}</p>
                    {tagNames.length > 0 && (
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">+{tagNames.slice(0, 2).join(", ")}</p>
                    )}
                  </div>

                  {/* Sent */}
                  <div className="text-sm font-semibold text-zinc-700 text-right pr-3">
                    {ns.sent_count > 0 ? ns.sent_count.toLocaleString() : <span className="text-zinc-300 font-normal text-xs">–</span>}
                  </div>

                  {/* Opens */}
                  <div className="text-right pr-3">
                    {(ns.opens_count ?? 0) > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-[#003434]">{ns.opens_count}</p>
                        <p className="text-[10px] text-zinc-400">{openPct}%</p>
                      </>
                    ) : (
                      <span className="text-zinc-300 text-xs">–</span>
                    )}
                  </div>

                  {/* Clicks */}
                  <div className="text-right pr-3">
                    {(ns.clicks_count ?? 0) > 0 ? (
                      <p className="text-sm font-semibold text-[#003434]">{ns.clicks_count}</p>
                    ) : (
                      <span className="text-zinc-300 text-xs">–</span>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={ns.status} sentAt={ns.sent_at} scheduledAt={ns.scheduled_at} />
                    {ns.failed_count > 0 && (
                      <p className="text-[10px] text-red-400 mt-0.5 font-medium">{ns.failed_count} failed</p>
                    )}
                  </div>

                  {/* Action menu */}
                  <div className="relative flex justify-center" ref={openMenuId === ns.id ? menuRef : undefined}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === ns.id ? null : ns.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
                      </svg>
                    </button>

                    {openMenuId === ns.id && (
                      <div className="absolute right-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 w-36 ring-1 ring-black/5">
                        <button
                          onClick={() => startEditWizard(ns)}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/email/newsletter/${ns.id}`)
                            toast.success("Link copied!")
                            setOpenMenuId(null)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
                        >
                          Share
                        </button>
                        <button
                          onClick={() => startDuplicateWizard(ns)}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
                        >
                          Duplicate
                        </button>
                        <div className="border-t border-zinc-100 my-1" />
                        <button
                          onClick={() => handleDeleteRecord(ns.id)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Newsletter Templates Panel */}
        <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTemplatePanel(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-zinc-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-800">Newsletter Templates</span>
              {clientLabel && <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{clientLabel}</span>}
              {newsletterTemplates.length > 0 && (
                <span className="text-xs bg-[#003434]/10 text-[#003434] px-2 py-0.5 rounded-full font-medium">
                  {newsletterTemplates.length} template{newsletterTemplates.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="text-zinc-400 text-sm">{showTemplatePanel ? "▲" : "▼"}</span>
          </button>

          {showTemplatePanel && (
            <div className="border-t border-zinc-100 bg-white p-5 space-y-5">
              <p className="text-xs text-zinc-500">
                Newsletter templates are exclusive to this section. Write a full HTML email and use{" "}
                <code className="bg-zinc-100 px-1 rounded text-zinc-700">{"{{variable}}"}</code> placeholders for dynamic content.
                {clientId ? "" : " Select a client to manage their templates."}
              </p>

              {newsletterTemplates.length > 0 && !isCreating && !editingTemplate && (
                <div className="space-y-2">
                  {newsletterTemplates.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedTemplateId === t.id ? "border-[#003434] bg-[#003434]/5" : "border-zinc-100 bg-zinc-50"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 truncate">{t.name}</p>
                        {t.subject && <p className="text-xs text-zinc-400 truncate">Subject hint: {t.subject}</p>}
                        <p className="text-xs text-zinc-400 mt-0.5">Updated {new Date(t.updated_at).toLocaleDateString("en-IN")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedTemplateId === t.id ? (
                          <span className="text-xs font-semibold text-[#003434]">✓ Active</span>
                        ) : (
                          <button onClick={() => setSelectedTemplateId(t.id)} className="text-xs text-zinc-500 hover:text-[#003434] font-medium">Use</button>
                        )}
                        <button onClick={() => openEdit(t)} className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100">Edit</button>
                        <button onClick={() => deleteTemplate(t.id)} disabled={deletingTemplateId === t.id} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40">
                          {deletingTemplateId === t.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(isCreating || editingTemplate) ? (
                <div className="border border-zinc-200 rounded-xl p-4 space-y-4 bg-zinc-50">
                  <p className="text-sm font-semibold text-zinc-700">{isCreating ? "New newsletter template" : `Edit: ${editingTemplate!.name}`}</p>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Template name *</label>
                    <input type="text" value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder="e.g. AgentBazar Weekly" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Subject hint <span className="font-normal text-zinc-400">(optional)</span></label>
                    <input type="text" value={tmplSubject} onChange={e => setTmplSubject(e.target.value)} placeholder="e.g. This week in travel" className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-500">HTML body *</label>
                      <button type="button" onClick={() => setShowVarRef(v => !v)} className="text-xs text-[#003434] hover:underline">{showVarRef ? "Hide" : "Show"} variables</button>
                    </div>
                    {showVarRef && (
                      <div className="mb-2 rounded-lg border border-zinc-100 bg-white divide-y divide-zinc-50 text-xs overflow-hidden">
                        {VARIABLE_REFERENCE.map(v => (
                          <div key={v.key} className="flex items-center gap-3 px-3 py-1.5">
                            <code className="font-mono text-[#003434] shrink-0">{v.key}</code>
                            <span className="text-zinc-400">{v.desc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea value={tmplHtml} onChange={e => setTmplHtml(e.target.value)} rows={16} placeholder={"<!DOCTYPE html>\n<html>…use {{hero_title}}, {{hero_url}}, etc.</html>"} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white resize-y" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveTemplate} disabled={savingTemplate} className="flex-1 bg-[#003434] text-white text-sm py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors font-medium">
                      {savingTemplate ? "Saving…" : isCreating ? "Create template" : "Save changes"}
                    </button>
                    <button onClick={cancelForm} className="px-4 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancel</button>
                  </div>
                </div>
              ) : (
                clientId && (
                  <button onClick={openCreate} className="w-full border border-dashed border-zinc-200 rounded-xl py-3 text-sm text-zinc-400 hover:border-[#003434] hover:text-[#003434] transition-colors">
                    + New newsletter template
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Wizard view ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {/* Back link + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setView("dashboard"); resetWizard() }}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Newsletters
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-sm font-medium text-zinc-700">
          {editingRecordId && editingRecordStatus === "draft" ? "Edit draft" : "New newsletter"}
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1 mb-7 bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-3">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2.5 flex-1">
            <button
              onClick={() => { if (s < step || (s === 2 && selectedPost)) setStep(s) }}
              className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-all shrink-0 ${
                step === s
                  ? "bg-[#003434] text-white border-[#003434] shadow-sm"
                  : step > s
                  ? "bg-emerald-500 text-white border-emerald-500 cursor-pointer"
                  : "bg-white text-zinc-400 border-zinc-300 cursor-default"
              }`}
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

      {/* ── Step 1: Pick blog post(s) ── */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-1">
              {isAgentBazar ? "Select hero post (Today's Highlight)" : "Select a blog post"}
            </p>
            {isAgentBazar && <p className="text-xs text-zinc-400 mb-3">This appears as the featured story at the top of the newsletter.</p>}
            <input
              type="text"
              placeholder="Search by title or category…"
              value={postSearch}
              onChange={e => setPostSearch(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 mb-3"
            />
            {loadingPosts ? (
              <div className="py-8 text-center">
                <div className="w-5 h-5 border-2 border-[#003434]/20 border-t-[#003434] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-zinc-400">Loading posts…</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No published posts found.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredPosts.map(post => {
                  const isSelected = selectedPost?.id === post.id
                  return (
                    <button key={post.id} onClick={() => handleSelectHero(post)} className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all group ${isSelected ? "border-[#003434] bg-[#003434]/5" : "border-zinc-100 hover:border-[#003434] hover:bg-[#003434]/5"}`}>
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt="" className="w-16 h-16 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                      ) : (
                        <div className="w-16 h-16 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center"><span className="text-zinc-300 text-xs">No img</span></div>
                      )}
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
          </div>

          {/* Trending posts (AgentBazar only) */}
          {isAgentBazar && selectedPost && (
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-sm font-semibold text-zinc-700 mb-1">
                Select up to 2 trending posts
                <span className="ml-2 text-xs font-normal text-zinc-400">({trendingPosts.length}/2 selected)</span>
              </p>
              <p className="text-xs text-zinc-400 mb-3">These appear in the "Trending Today" section below the hero.</p>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {filteredPosts.filter(p => p.id !== selectedPost.id).map(post => {
                  const isSel = trendingPosts.some(t => t.id === post.id)
                  const isDisabled = !isSel && trendingPosts.length >= 2
                  return (
                    <button key={post.id} onClick={() => { if (!isDisabled) toggleTrending(post) }} disabled={isDisabled} className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all ${isSel ? "border-[#F47920] bg-orange-50" : isDisabled ? "border-zinc-100 opacity-40 cursor-not-allowed" : "border-zinc-100 hover:border-[#F47920] hover:bg-orange-50/40"}`}>
                      {post.cover_image_url ? (
                        <img src={post.cover_image_url} alt="" className="w-14 h-14 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                      ) : (
                        <div className="w-14 h-14 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center"><span className="text-zinc-300 text-xs">No img</span></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 truncate">{post.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{post.category}</p>
                      </div>
                      {isSel && <span className="text-xs font-semibold text-[#F47920] shrink-0 self-center">Trending ✓</span>}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setStep(2)} className="mt-4 w-full bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004848] active:scale-[0.98] transition-all font-semibold shadow-sm">
                Continue to configure →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Configure ── */}
      {step === 2 && selectedPost && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            {selectedPost.cover_image_url && (
              <img src={selectedPost.cover_image_url} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{selectedPost.title}</p>
              <p className="text-xs text-zinc-400">{selectedPost.category}</p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 shrink-0">Change</button>
          </div>

          {isAgentBazar && trendingPosts.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {trendingPosts.map(p => (
                <span key={p.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full truncate max-w-[200px]">Trending: {p.title}</span>
              ))}
            </div>
          )}

          {/* Newsletter template */}
          {!loadingTemplates && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Newsletter template</label>
              {newsletterTemplates.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                  <span className="text-xs text-zinc-400 flex-1">No newsletter templates yet — using default system layout.</span>
                  <button type="button" onClick={() => { setShowTemplatePanel(true); openCreate(); setView("dashboard") }} className="text-xs font-medium text-[#003434] hover:underline shrink-0">+ Create one</button>
                </div>
              ) : (
                <>
                  <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
                    <option value="">Default system layout</option>
                    {newsletterTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {selectedTemplateId
                    ? <p className="text-xs text-emerald-600 mt-1">✓ Custom template selected — your HTML design will be used</p>
                    : <p className="text-xs text-zinc-400 mt-1">Using the default branded layout</p>
                  }
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Subject line</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="Email subject…" />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Sender</label>
            <select value={senderId} onChange={e => setSenderId(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
              <option value="">Select a verified sender…</option>
              {senders.map(s => <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>)}
            </select>
            {senders.length === 0 && <p className="text-xs text-amber-600 mt-1">No verified senders found. Add & verify a sender first.</p>}
          </div>

          {isAgentBazar ? (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Recipient list</label>
              <select value={listId} onChange={e => setListId(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
                <option value="">Choose a contact list…</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contacts)</option>)}
              </select>
              {lists.length === 0 && <p className="text-xs text-amber-600 mt-1">No lists found. Create a list and add contacts first.</p>}
              {allTags.length > 0 && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Filter by tag <span className="font-normal text-zinc-400">(optional — sends to all if none selected)</span></label>
                  <TagMultiSelect allTags={allTags} value={filterTagIds} onChange={setFilterTagIds} placeholder="All contacts in list" />
                </div>
              )}
              <p className="text-xs text-zinc-400 mt-1.5">Sends only to subscribed, non-bounced contacts. Greeting is personalised using each contact&apos;s name.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Recipients</label>
                <div className="flex gap-2">
                  <button onClick={() => setRecipientType("leads")} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${recipientType === "leads" ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}>Leads</button>
                  <button onClick={() => setRecipientType("list")} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${recipientType === "list" ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}>Email list</button>
                </div>
              </div>
              {recipientType === "list" && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Select list</label>
                    <select value={listId} onChange={e => setListId(e.target.value)} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white">
                      <option value="">Choose a list…</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contacts)</option>)}
                    </select>
                  </div>
                  {allTags.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-zinc-500 block mb-1">Filter by tag <span className="font-normal text-zinc-400">(optional)</span></label>
                      <TagMultiSelect allTags={allTags} value={filterTagIds} onChange={setFilterTagIds} placeholder="All contacts in list" />
                    </div>
                  )}
                </div>
              )}
              {recipientType === "leads" && <p className="text-xs text-zinc-400">Sends to {clientId ? "leads for the selected client" : "all leads"} in the lead list.</p>}
            </>
          )}

          <button
            onClick={() => { if (senderId && subject && (isAgentBazar ? listId : (recipientType === "leads" || listId))) setStep(3) }}
            disabled={!senderId || !subject || (isAgentBazar ? !listId : (recipientType === "list" && !listId))}
            className="w-full bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004848] disabled:opacity-40 active:scale-[0.98] transition-all font-semibold shadow-sm"
          >
            Preview newsletter →
          </button>
        </div>
      )}

      {/* ── Step 3: Preview + send ── */}
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
                {trendingPosts.length > 0 && (
                  <div className="px-6 py-4 space-y-4 border-t border-zinc-100">
                    <p className="font-bold italic underline text-zinc-800">Trending Today</p>
                    {trendingPosts.map(p => (
                      <div key={p.id}>
                        {p.cover_image_url && <img src={p.cover_image_url} alt="" className="w-full h-28 object-cover rounded-lg mb-2" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
                        <p style={{ color: "#F47920" }} className="text-sm font-bold leading-snug mb-1">{p.title}</p>
                        {p.excerpt && <p className="text-xs text-zinc-600 leading-relaxed mb-2">{p.excerpt}</p>}
                        <span style={{ background: "#F47920" }} className="inline-block text-white text-xs font-bold italic px-4 py-1.5 rounded">Read More...</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: "#1a6b3a" }} className="px-6 py-4 text-center">
                  <p className="text-white text-xs mb-0.5">For the latest Travel Blog & Updates</p>
                  <p className="text-white font-bold text-sm mb-2">Join Our WhatsApp Community Now</p>
                  <span className="inline-block bg-white text-xs font-bold px-5 py-1.5 rounded-full" style={{ color: "#1a6b3a" }}>▶ JOIN NOW</span>
                </div>
                <div className="px-6 py-5 border-t border-zinc-100 bg-white text-center">
                  <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" className="h-8 mx-auto mb-2" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase mb-3">agentbazar.in</p>
                  <p className="text-[10px] font-bold text-zinc-800 underline mb-1">Unsubscribe from AgentBazar</p>
                  <p className="text-[10px] font-bold text-zinc-800">AgentBazar ©2025</p>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto">
                <div className="bg-[#003434] px-6 py-4">
                  <p className="text-white text-sm font-semibold">{senders.find(s => s.id === senderId)?.from_name ?? "Sender"}</p>
                </div>
                {selectedPost.cover_image_url && <img src={selectedPost.cover_image_url} alt="" className="w-full h-48 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />}
                <div className="p-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{selectedPost.category}</p>
                  <h2 className="text-xl font-bold text-zinc-900 mb-3 leading-snug">{selectedPost.title}</h2>
                  {selectedPost.excerpt && <p className="text-sm text-zinc-600 mb-5 leading-relaxed">{selectedPost.excerpt}</p>}
                  <span className="inline-block bg-[#003434] text-white text-sm font-semibold px-5 py-2.5 rounded-lg">Read the full article →</span>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400 text-center">You received this because you subscribed. <span className="underline">Unsubscribe</span></p>
                </div>
              </div>
            )}

            {/* Summary row */}
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-xs font-semibold text-zinc-700 truncate">{subject}</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Recipients</p>
                <p className="text-xs font-semibold text-zinc-700 capitalize">
                  {(isAgentBazar || recipientType === "list") ? lists.find(l => l.id === listId)?.name ?? "List" : "Leads"}
                </p>
              </div>
              <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Template</p>
                <p className="text-xs font-semibold text-zinc-700 truncate">{activeTemplate?.name ?? "Default"}</p>
              </div>
            </div>
          </div>

          {/* Action buttons — split button */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1" ref={sendDropdownRef}>
              <div className="flex rounded-xl overflow-hidden border-2 border-[#003434] shadow-sm">
                {/* Primary: Save draft */}
                <button
                  onClick={() => handleSaveWithMode("draft")}
                  disabled={saving}
                  className="flex-1 bg-white text-[#003434] text-sm py-3 font-semibold hover:bg-[#003434]/[0.04] disabled:opacity-50 transition-colors border-r-2 border-[#003434]"
                >
                  {saving ? "Saving…" : "Save draft"}
                </button>
                {/* Dropdown toggle */}
                <button
                  onClick={() => setSendDropdownOpen(v => !v)}
                  disabled={saving}
                  className="bg-white text-[#003434] px-4 hover:bg-[#003434]/[0.04] disabled:opacity-50 transition-colors"
                  aria-label="More send options"
                >
                  <svg className={`w-4 h-4 transition-transform ${sendDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {sendDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-zinc-200 rounded-2xl shadow-xl py-1.5 z-50 ring-1 ring-black/5">
                  <button
                    onClick={() => handleSaveWithMode("test")}
                    disabled={saving}
                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors disabled:opacity-50 rounded-lg mx-0"
                  >
                    <span className="text-sm font-semibold text-zinc-800">Save and test</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Send a test to {TEST_EMAIL}</span>
                  </button>
                  <button
                    onClick={() => handleSaveWithMode("schedule")}
                    disabled={saving}
                    className="w-full text-left px-4 py-2.5 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-semibold text-zinc-800">Save and schedule</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Pick a date and time to send</span>
                  </button>
                  <div className="border-t border-zinc-100 my-1.5 mx-4" />
                  <button
                    onClick={() => handleSaveWithMode("send")}
                    disabled={saving}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#003434]/[0.05] transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm font-bold text-[#003434]">Save and send now</span>
                    <span className="block text-xs text-zinc-400 mt-0.5">Send to all recipients immediately</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Schedule modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-zinc-800 mb-1">Schedule newsletter</h3>
            <p className="text-xs text-zinc-400 mb-4">Pick a date and time to send this newsletter.</p>
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={e => setScheduleDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 border border-zinc-200 text-zinc-600 text-sm py-2.5 rounded-xl hover:bg-zinc-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleConfirm}
                disabled={saving || !scheduleDateTime}
                className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] disabled:opacity-40 transition-colors font-medium"
              >
                {saving ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
