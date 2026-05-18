"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useClient } from "../client-context"

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

const STATUS_STYLE: Record<string, string> = {
  sending: "bg-amber-50 text-amber-700 border-amber-200",
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
}

export default function NewsletterPage() {
  const { clientId } = useClient()

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null)
  const [postSearch, setPostSearch] = useState("")
  const [recipientType, setRecipientType] = useState<"leads" | "list">("leads")
  const [senderId, setSenderId] = useState("")
  const [listId, setListId] = useState("")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)

  // Data
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [senders, setSenders] = useState<Sender[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [history, setHistory] = useState<NewsletterSend[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    setLoadingPosts(true)
    const params = new URLSearchParams({ status: "published", limit: "100" })
    if (clientId) params.set("clientId", clientId)
    fetch(`/api/blog?${params}`)
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .finally(() => setLoadingPosts(false))
  }, [clientId])

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

  const filteredPosts = posts.filter(p =>
    p.title.toLowerCase().includes(postSearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(postSearch.toLowerCase())
  )

  const handleSelectPost = (post: BlogPost) => {
    setSelectedPost(post)
    setSubject(`${post.title}`)
    setStep(2)
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
          sender_id: senderId,
          subject,
          client_id: clientId || null,
          recipient_type: recipientType,
          list_id: recipientType === "list" ? listId : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}${data.failed ? ` · ${data.failed} failed` : ""}`)
      // Reset form
      setStep(1)
      setSelectedPost(null)
      setPostSearch("")
      setSenderId("")
      setListId("")
      setSubject("")
      setRecipientType("leads")
      // Refresh history
      const params = new URLSearchParams()
      if (clientId) params.set("client_id", clientId)
      fetch(`/api/email/newsletter?${params}`).then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  const blogBaseUrl = "https://emozidigital.com/blog"

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Newsletter</h1>
        <p className="text-sm text-zinc-500 mt-1">Send blog posts as email newsletters to leads or contacts via AWS SES</p>
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
              {s === 1 ? "Pick blog post" : s === 2 ? "Configure" : "Preview & send"}
            </span>
            {i < 2 && <span className="text-zinc-200 text-sm mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Pick blog post */}
      {step === 1 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-zinc-700 mb-3">Select a blog post</p>
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
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredPosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => handleSelectPost(post)}
                  className="w-full text-left flex gap-4 p-3 rounded-lg border border-zinc-100 hover:border-[#003434] hover:bg-[#003434]/5 transition-all group"
                >
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-md shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 group-hover:text-[#003434] truncate">{post.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{post.category} · {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN") : "No date"}</p>
                    {post.excerpt && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{post.excerpt}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && selectedPost && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            {selectedPost.cover_image_url && (
              <img src={selectedPost.cover_image_url} alt="" className="w-12 h-12 object-cover rounded-md shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{selectedPost.title}</p>
              <p className="text-xs text-zinc-400">{selectedPost.category}</p>
            </div>
            <button onClick={() => setStep(1)} className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 shrink-0">Change</button>
          </div>

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

          <button
            onClick={() => { if (senderId && subject && (recipientType === "leads" || listId)) setStep(3) }}
            disabled={!senderId || !subject || (recipientType === "list" && !listId)}
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

            {/* Preview card */}
            <div className="border border-zinc-100 rounded-xl overflow-hidden max-w-lg mx-auto">
              <div className="bg-[#003434] px-6 py-4">
                <p className="text-white text-sm font-semibold">
                  {senders.find(s => s.id === senderId)?.from_name ?? "Sender"}
                </p>
              </div>
              {selectedPost.cover_image_url && (
                <img src={selectedPost.cover_image_url} alt="" className="w-full h-48 object-cover" />
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

            {/* Summary */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Subject</p>
                <p className="text-xs font-medium text-zinc-700 truncate">{subject}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Recipients</p>
                <p className="text-xs font-medium text-zinc-700 capitalize">
                  {recipientType === "list"
                    ? lists.find(l => l.id === listId)?.name ?? "List"
                    : "Leads"}
                </p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="text-xs text-zinc-400 mb-0.5">Blog link</p>
                <p className="text-xs font-medium text-zinc-700 truncate">{blogBaseUrl}/{selectedPost.slug}</p>
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

      {/* History */}
      <div className="mt-10">
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
