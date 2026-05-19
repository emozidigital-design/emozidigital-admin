"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"

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
  sent_at: string | null
  created_at: string
  blog_post_id: string
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

const STATUS_STYLE: Record<string, string> = {
  sending: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
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

export default function NewsletterPage() {
  const { clientId, clients } = useClient()
  const isAgentBazar = clientId === AGENTBAZAR_CLIENT_ID
  const clientLabel = clients.find(c => c.client_id === clientId)?.label

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [trendingPosts, setTrendingPosts] = useState<BlogPost[]>([])
  const [postSearch, setPostSearch] = useState("")
  const [recipientType, setRecipientType] = useState<"leads" | "list">("leads")

  useEffect(() => {
    if (isAgentBazar) setRecipientType("list")
  }, [isAgentBazar])

  const [senderId, setSenderId] = useState("")
  const [listId, setListId] = useState("")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)

  // Newsletter template state
  const [newsletterTemplates, setNewsletterTemplates] = useState<NewsletterTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Template panel state
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)
  const [showVarRef, setShowVarRef] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NewsletterTemplate | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [tmplName, setTmplName] = useState("")
  const [tmplSubject, setTmplSubject] = useState("")
  const [tmplHtml, setTmplHtml] = useState("")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [deletingId, setDeletingId] = useState("")

  // Data
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [senders, setSenders] = useState<Sender[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [history, setHistory] = useState<NewsletterSend[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    setLoadingPosts(true)
    if (isAgentBazar) {
      fetch(`/api/blog/agentbazar`)
        .then(r => r.json())
        .then(d => {
          const normalized: BlogPost[] = (d.posts ?? []).map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            category: p.category ?? "",
            status: p.status,
            excerpt: p.excerpt,
            cover_image_url: p.cover_image,
            published_at: p.published_date ?? null,
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
  }, [clientId])

  useEffect(() => {
    setLoadingHistory(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/newsletter?${params}`)
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .finally(() => setLoadingHistory(false))
  }, [clientId])

  // Fetch newsletter templates for current client — auto-select if exactly one
  useEffect(() => {
    if (!clientId) {
      setNewsletterTemplates([])
      setSelectedTemplateId("")
      return
    }
    setLoadingTemplates(true)
    const params = new URLSearchParams({ client_id: clientId, template_type: "newsletter" })
    fetch(`/api/email/templates?${params}`)
      .then(r => r.json())
      .then(d => {
        const tmpl: NewsletterTemplate[] = Array.isArray(d) ? d : []
        setNewsletterTemplates(tmpl)
        setSelectedTemplateId(tmpl.length === 1 ? tmpl[0].id : "")
      })
      .finally(() => setLoadingTemplates(false))
  }, [clientId])

  const refreshTemplates = () => {
    if (!clientId) return
    const params = new URLSearchParams({ client_id: clientId, template_type: "newsletter" })
    fetch(`/api/email/templates?${params}`)
      .then(r => r.json())
      .then(d => {
        const tmpl: NewsletterTemplate[] = Array.isArray(d) ? d : []
        setNewsletterTemplates(tmpl)
        if (tmpl.length === 1) setSelectedTemplateId(tmpl[0].id)
      })
  }

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(postSearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(postSearch.toLowerCase())
  )

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

  const handleSend = async () => {
    if (!selectedPost || !senderId || !subject) {
      toast.error("Please fill all required fields")
      return
    }
    if (recipientType === "list" && !listId) {
      toast.error("Please select a list")
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/email/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blog_post_id: selectedPost.id,
          trending_post_ids: isAgentBazar ? trendingPosts.map(p => p.id) : undefined,
          sender_id: senderId,
          subject,
          client_id: clientId || null,
          recipient_type: recipientType,
          list_id: recipientType === "list" ? listId : null,
          newsletter_template_id: selectedTemplateId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}${data.failed ? ` · ${data.failed} failed` : ""}`)
      setStep(1)
      setSelectedPost(null)
      setTrendingPosts([])
      setPostSearch("")
      setSenderId("")
      setListId("")
      setSubject("")
      setRecipientType("leads")
      const params = new URLSearchParams()
      if (clientId) params.set("client_id", clientId)
      fetch(`/api/email/newsletter?${params}`).then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  // Template CRUD
  const openCreate = () => {
    setEditingTemplate(null)
    setIsCreating(true)
    setTmplName("")
    setTmplSubject("")
    setTmplHtml("")
  }

  const openEdit = (t: NewsletterTemplate) => {
    setEditingTemplate(t)
    setIsCreating(false)
    setTmplName(t.name)
    setTmplSubject(t.subject)
    setTmplHtml(t.html_body)
  }

  const cancelForm = () => {
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const saveTemplate = async () => {
    if (!tmplName.trim() || !tmplHtml.trim()) {
      toast.error("Name and HTML body are required")
      return
    }
    setSavingTemplate(true)
    try {
      if (isCreating) {
        const res = await fetch("/api/email/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            name: tmplName.trim(),
            subject: tmplSubject.trim(),
            html_body: tmplHtml.trim(),
            template_type: "newsletter",
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        toast.success("Template created")
      } else if (editingTemplate) {
        const res = await fetch(`/api/email/templates/${editingTemplate.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tmplName.trim(),
            subject: tmplSubject.trim(),
            html_body: tmplHtml.trim(),
          }),
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
    setDeletingId(id)
    try {
      const res = await fetch(`/api/email/templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success("Template deleted")
      if (selectedTemplateId === id) setSelectedTemplateId("")
      refreshTemplates()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletingId("")
    }
  }

  const blogBaseUrl = isAgentBazar ? "https://blog.agentbazar.in" : "https://emozidigital.com/blog"
  const activeTemplate = newsletterTemplates.find(t => t.id === selectedTemplateId)

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Newsletter</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isAgentBazar
            ? "Send AgentBazar blog posts as branded newsletters via AWS SES"
            : "Send blog posts as email newsletters to leads or contacts via AWS SES"}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => { if (s < step || (s === 2 && selectedPost)) setStep(s) }}
              className={`w-7 h-7 rounded-full text-xs font-semibold border transition-colors ${
                step === s
                  ? "bg-[#003434] text-white border-[#003434]"
                  : step > s
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-pointer hover:bg-emerald-100"
                  : "bg-zinc-50 text-zinc-400 border-zinc-200 cursor-default"
              }`}
            >
              {step > s ? "✓" : s}
            </button>
            <span className={`text-xs font-medium ${step === s ? "text-zinc-800" : "text-zinc-400"}`}>
              {s === 1 ? (isAgentBazar ? "Pick posts" : "Pick blog post") : s === 2 ? "Configure" : "Preview & send"}
            </span>
            {i < 2 && <span className="text-zinc-200 text-sm mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Pick blog post(s) */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-1">
              {isAgentBazar ? "Select hero post (Today's Highlight)" : "Select a blog post"}
            </p>
            {isAgentBazar && (
              <p className="text-xs text-zinc-400 mb-3">This appears as the featured story at the top of the newsletter.</p>
            )}
            <input
              type="text"
              placeholder="Search by title or category…"
              value={postSearch}
              onChange={e => setPostSearch(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 mb-3"
            />
            {loadingPosts ? (
              <p className="text-sm text-zinc-400 py-4 text-center">Loading posts…</p>
            ) : filteredPosts.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No published posts found.</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredPosts.map(post => {
                  const isSelected = selectedPost?.id === post.id
                  return (
                    <button
                      key={post.id}
                      onClick={() => handleSelectHero(post)}
                      className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all group ${
                        isSelected
                          ? "border-[#003434] bg-[#003434]/5"
                          : "border-zinc-100 hover:border-[#003434] hover:bg-[#003434]/5"
                      }`}
                    >
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt=""
                          className="w-16 h-16 object-cover rounded-md shrink-0"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center">
                          <span className="text-zinc-300 text-xs">No img</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-800 group-hover:text-[#003434] truncate">{post.title}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{post.category} · {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN") : "No date"}</p>
                        {post.excerpt && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{post.excerpt}</p>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-xs font-semibold text-[#003434] shrink-0 self-center">Hero ✓</span>
                      )}
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
                {filteredPosts
                  .filter(p => p.id !== selectedPost.id)
                  .map(post => {
                    const isSelected = trendingPosts.some(t => t.id === post.id)
                    const isDisabled = !isSelected && trendingPosts.length >= 2
                    return (
                      <button
                        key={post.id}
                        onClick={() => { if (!isDisabled) toggleTrending(post) }}
                        disabled={isDisabled}
                        className={`w-full text-left flex gap-4 p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-[#F47920] bg-orange-50"
                            : isDisabled
                            ? "border-zinc-100 opacity-40 cursor-not-allowed"
                            : "border-zinc-100 hover:border-[#F47920] hover:bg-orange-50/40"
                        }`}
                      >
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt=""
                            className="w-14 h-14 object-cover rounded-md shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-md shrink-0 bg-zinc-100 flex items-center justify-center">
                            <span className="text-zinc-300 text-xs">No img</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-800 truncate">{post.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{post.category}</p>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-semibold text-[#F47920] shrink-0 self-center">Trending ✓</span>
                        )}
                      </button>
                    )
                  })}
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-4 w-full bg-[#003434] text-white text-sm py-2.5 rounded-lg hover:bg-[#004444] transition-colors font-medium"
              >
                Continue to configure →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && selectedPost && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
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
                <span key={p.id} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                  Trending: {p.title}
                </span>
              ))}
            </div>
          )}

          {/* Newsletter template selector */}
          {!loadingTemplates && (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Newsletter template</label>
              {newsletterTemplates.length === 0 ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                  <span className="text-xs text-zinc-400 flex-1">No newsletter templates yet — using default system layout.</span>
                  <button
                    type="button"
                    onClick={() => { setShowTemplatePanel(true); openCreate() }}
                    className="text-xs font-medium text-[#003434] hover:underline shrink-0"
                  >
                    + Create one
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  >
                    <option value="">Default system layout</option>
                    {newsletterTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {selectedTemplateId && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Custom template selected — your HTML design will be used</p>
                  )}
                  {!selectedTemplateId && (
                    <p className="text-xs text-zinc-400 mt-1">Using the default AgentBazar branded layout</p>
                  )}
                </>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Subject line</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
              placeholder="Email subject…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 block mb-1">Sender</label>
            <select
              value={senderId}
              onChange={e => setSenderId(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
            >
              <option value="">Select a verified sender…</option>
              {senders.map(s => (
                <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>
              ))}
            </select>
            {senders.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No verified senders found. Add & verify a sender first.</p>
            )}
          </div>

          {isAgentBazar ? (
            <div>
              <label className="text-xs font-medium text-zinc-500 block mb-1">Recipient list</label>
              <select
                value={listId}
                onChange={e => setListId(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
              >
                <option value="">Choose a contact list…</option>
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contacts)</option>
                ))}
              </select>
              {lists.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No lists found. Create a list and add contacts first.</p>
              )}
              <p className="text-xs text-zinc-400 mt-1.5">
                Sends only to subscribed, non-bounced contacts in this list. Greeting is personalised using each contact&apos;s name.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-500 block mb-1">Recipients</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecipientType("leads")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      recipientType === "leads"
                        ? "bg-[#003434] text-white border-[#003434]"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    Leads
                  </button>
                  <button
                    onClick={() => setRecipientType("list")}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      recipientType === "list"
                        ? "bg-[#003434] text-white border-[#003434]"
                        : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    Email list
                  </button>
                </div>
              </div>

              {recipientType === "list" && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Select list</label>
                  <select
                    value={listId}
                    onChange={e => setListId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  >
                    <option value="">Choose a list…</option>
                    {lists.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contacts)</option>
                    ))}
                  </select>
                </div>
              )}

              {recipientType === "leads" && (
                <p className="text-xs text-zinc-400">
                  Will send to {clientId ? "leads for the selected client" : "all leads"} in the lead_list table.
                </p>
              )}
            </>
          )}

          <button
            onClick={() => { if (senderId && subject && (isAgentBazar ? listId : (recipientType === "leads" || listId))) setStep(3) }}
            disabled={!senderId || !subject || (isAgentBazar ? !listId : (recipientType === "list" && !listId))}
            className="w-full bg-[#003434] text-white text-sm py-2.5 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors font-medium"
          >
            Preview newsletter →
          </button>
        </div>
      )}

      {/* Step 3: Preview + send */}
      {step === 3 && selectedPost && (
        <div className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-zinc-700">Newsletter preview</p>
              <button onClick={() => setStep(2)} className="text-xs text-zinc-400 hover:text-zinc-600">← Edit</button>
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
                <div style={{ background: "#001D4A" }} className="px-6 py-3 text-center">
                  <p className="text-white text-xs font-bold tracking-wider">agentBazar.in</p>
                </div>
                <div className="px-6 pt-4 pb-3" style={{ borderBottom: "2px solid #F47920" }}>
                  <p className="italic text-zinc-700">Hello [subscriber],</p>
                  <p className="font-bold text-zinc-800 text-xs mt-0.5">Today&apos;s Highlight</p>
                </div>
                {selectedPost.cover_image_url && (
                  <img src={selectedPost.cover_image_url} alt="" className="w-full h-40 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                )}
                <div className="px-6 py-4">
                  <p style={{ color: "#F47920" }} className="font-bold text-base leading-snug mb-2">{selectedPost.title}</p>
                  {selectedPost.excerpt && (
                    <p className="text-zinc-700 text-xs leading-relaxed font-semibold mb-4">{selectedPost.excerpt}</p>
                  )}
                  <span style={{ background: "#F47920" }} className="inline-block text-white text-xs font-bold italic px-5 py-2 rounded">
                    Read Full Blog...
                  </span>
                </div>
                <div className="px-6"><hr className="border-zinc-100" /></div>
                {trendingPosts.length > 0 && (
                  <div className="px-6 py-4 space-y-4">
                    <p className="font-bold italic underline text-zinc-800">Trending Today</p>
                    {trendingPosts.map(p => (
                      <div key={p.id}>
                        {p.cover_image_url && (
                          <img src={p.cover_image_url} alt="" className="w-full h-28 object-cover rounded-lg mb-2" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                        )}
                        <p style={{ color: "#F47920" }} className="text-sm font-bold leading-snug mb-1">{p.title}</p>
                        {p.excerpt && <p className="text-xs text-zinc-600 leading-relaxed mb-2">{p.excerpt}</p>}
                        <span style={{ background: "#F47920" }} className="inline-block text-white text-xs font-bold italic px-4 py-1.5 rounded">Read More...</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: "#1a6b3a" }} className="px-6 py-4 text-center">
                  <p className="text-white text-xs mb-0.5">For the latest Travel Blog &amp; Updates</p>
                  <p className="text-white font-bold text-sm mb-2">Join Our WhatsApp Community Now</p>
                  <span className="inline-block bg-white text-xs font-bold px-5 py-1.5 rounded-full" style={{ color: "#1a6b3a" }}>▶ JOIN NOW</span>
                </div>
                {/* Footer: white BW Travel style */}
                <div className="px-6 py-5 border-t border-zinc-100 bg-white text-center">
                  <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" className="h-8 mx-auto mb-2" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                  <p className="text-[10px] text-zinc-400 tracking-widest uppercase mb-3">agentbazar.in</p>
                  <div className="flex justify-center gap-2 mb-3">
                    {["FB","X","IG","YT","WA"].map(s => (
                      <span key={s} className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center text-white text-[8px] font-bold">{s}</span>
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-zinc-800 mb-1">HOME · ABOUT US · BLOG · HELP</p>
                  <p className="text-[10px] font-bold text-zinc-700 mb-1">For Enquiries, please contact:</p>
                  <p className="text-[10px] text-zinc-500 mb-1">+91-9435009519 · support@agentbazar.in</p>
                  <p className="text-[10px] text-zinc-400 mb-2">Tripforu Holidays Pvt. Ltd. (Guwahati)</p>
                  <hr className="border-zinc-100 mb-2" />
                  <p className="text-[10px] font-bold text-zinc-800 underline mb-1">Unsubscribe from AgentBazar</p>
                  <p className="text-[10px] font-bold text-zinc-800">AgentBazar ©2025</p>
                </div>
              </div>
            ) : (
              <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto">
                <div className="bg-[#003434] px-6 py-4">
                  <p className="text-white text-sm font-semibold">
                    {senders.find(s => s.id === senderId)?.from_name ?? "Sender"}
                  </p>
                </div>
                {selectedPost.cover_image_url && (
                  <img src={selectedPost.cover_image_url} alt="" className="w-full h-48 object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                )}
                <div className="p-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">{selectedPost.category}</p>
                  <h2 className="text-xl font-bold text-zinc-900 mb-3 leading-snug">{selectedPost.title}</h2>
                  {selectedPost.excerpt && (
                    <p className="text-sm text-zinc-600 mb-5 leading-relaxed">{selectedPost.excerpt}</p>
                  )}
                  <span className="inline-block bg-[#003434] text-white text-sm font-semibold px-5 py-2.5 rounded-lg">
                    Read the full article →
                  </span>
                </div>
                <div className="px-6 py-4 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400 text-center">
                    You received this email because you subscribed. <span className="underline">Unsubscribe</span>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Subject</p>
                <p className="text-xs font-medium text-zinc-700 truncate">{subject}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Recipients</p>
                <p className="text-xs font-medium text-zinc-700 capitalize">
                  {(isAgentBazar || recipientType === "list")
                    ? lists.find(l => l.id === listId)?.name ?? "List"
                    : "Leads"}
                </p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Template</p>
                <p className="text-xs font-medium text-zinc-700 truncate">{activeTemplate?.name ?? "Default"}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-[#003434] text-white text-sm py-3 rounded-xl hover:bg-[#004444] disabled:opacity-50 transition-colors font-semibold"
          >
            {sending ? "Sending…" : "Send newsletter now"}
          </button>
        </div>
      )}

      {/* Newsletter Templates Panel */}
      <div className="mt-8 border border-zinc-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowTemplatePanel(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-zinc-800">Newsletter Templates</span>
            {clientLabel && (
              <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{clientLabel}</span>
            )}
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

            {/* Template list */}
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
                        <button
                          onClick={() => setSelectedTemplateId(t.id)}
                          className="text-xs text-zinc-500 hover:text-[#003434] font-medium"
                        >
                          Use
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(t)}
                        className="text-xs text-zinc-400 hover:text-zinc-700 px-2 py-1 rounded hover:bg-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        disabled={deletingId === t.id}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-40"
                      >
                        {deletingId === t.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create/Edit form */}
            {(isCreating || editingTemplate) ? (
              <div className="border border-zinc-200 rounded-xl p-4 space-y-4 bg-zinc-50">
                <p className="text-sm font-semibold text-zinc-700">{isCreating ? "New newsletter template" : `Edit: ${editingTemplate!.name}`}</p>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Template name *</label>
                  <input
                    type="text"
                    value={tmplName}
                    onChange={e => setTmplName(e.target.value)}
                    placeholder="e.g. AgentBazar Weekly"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Subject hint <span className="font-normal text-zinc-400">(optional reference)</span></label>
                  <input
                    type="text"
                    value={tmplSubject}
                    onChange={e => setTmplSubject(e.target.value)}
                    placeholder="e.g. This week in travel"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-500">HTML body *</label>
                    <button
                      type="button"
                      onClick={() => setShowVarRef(v => !v)}
                      className="text-xs text-[#003434] hover:underline"
                    >
                      {showVarRef ? "Hide" : "Show"} variables
                    </button>
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

                  <textarea
                    value={tmplHtml}
                    onChange={e => setTmplHtml(e.target.value)}
                    rows={16}
                    placeholder={"<!DOCTYPE html>\n<html>…use {{hero_title}}, {{hero_url}}, etc.</html>"}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white resize-y"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveTemplate}
                    disabled={savingTemplate}
                    className="flex-1 bg-[#003434] text-white text-sm py-2 rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors font-medium"
                  >
                    {savingTemplate ? "Saving…" : isCreating ? "Create template" : "Save changes"}
                  </button>
                  <button
                    onClick={cancelForm}
                    className="px-4 py-2 text-sm text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              clientId && (
                <button
                  onClick={openCreate}
                  className="w-full border border-dashed border-zinc-200 rounded-xl py-3 text-sm text-zinc-400 hover:border-[#003434] hover:text-[#003434] transition-colors"
                >
                  + New newsletter template
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-700 mb-3">Send history</h2>
        {loadingHistory ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-zinc-400">No newsletters sent yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{h.subject}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 capitalize">
                    {h.recipient_type} · {h.sent_count} sent{h.failed_count > 0 ? ` · ${h.failed_count} failed` : ""}
                    {h.sent_at ? ` · ${new Date(h.sent_at).toLocaleString("en-IN")}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLE[h.status] ?? STATUS_STYLE.sending}`}>
                  {h.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
