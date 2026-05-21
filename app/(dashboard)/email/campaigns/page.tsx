"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import { MoreVertical, X } from "lucide-react"
import { useClient } from "../client-context"

interface Sender {
  id: string
  from_email: string
  from_name: string
  domain: string
  dkim_status: string
}

interface TemplateOption {
  id: string
  name: string
  subject: string
}

interface EmailList {
  id: string
  name: string
  contact_count: number
}

interface Campaign {
  id: string
  client_id: string
  subject: string
  status: string
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  email_senders: { from_email: string; from_name: string } | null
  email_templates: { name: string; html_body?: string } | null
  email_lists: { name: string; contact_count: number } | null
}

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-zinc-100 text-zinc-600 border-zinc-200",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  sending:   "bg-amber-50 text-amber-700 border-amber-200",
  sent:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
}

const INPUT_CLS = "border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white w-full"

export default function CampaignsPage() {
  const { clientId } = useClient()

  // Campaign list
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  // Create / edit form
  const [creating, setCreating] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [form, setForm] = useState({
    client_id: "", sender_id: "", template_id: "", list_id: "", subject: "", scheduled_at: "",
  })
  const [saving, setSaving] = useState(false)

  // Dropdown selects data
  const [senders, setSenders] = useState<Sender[]>([])
  const [templatesList, setTemplatesList] = useState<TemplateOption[]>([])
  const [lists, setLists] = useState<EmailList[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)

  // Actions
  const [sending, setSending] = useState<string | null>(null)

  // ⋮ Dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Campaign preview modal
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null)
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (clientId) setForm(f => ({ ...f, client_id: clientId }))
  }, [clientId])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    fetch(`/api/email/campaigns?${params}`)
      .then(r => r.json())
      .then(d => setCampaigns(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [clientId])

  // Auto-open new campaign form if template was just saved from the editor
  useEffect(() => {
    const stored = localStorage.getItem("email_draft_template_id")
    if (stored) {
      localStorage.removeItem("email_draft_template_id")
      setForm(f => ({ ...f, template_id: stored }))
      setCreating(true)
    }
  }, [])

  // Fetch senders / templates / lists when form opens
  useEffect(() => {
    if (!creating) return
    setLoadingRelated(true)
    const params = new URLSearchParams()
    if (clientId) params.set("client_id", clientId)
    Promise.all([
      fetch(`/api/email/senders?${params}`).then(r => r.json()),
      fetch(`/api/email/templates?${params}`).then(r => r.json()),
      fetch(`/api/email/lists?${params}`).then(r => r.json()),
    ])
      .then(([s, t, l]) => {
        setSenders(Array.isArray(s) ? s : [])
        setTemplatesList(Array.isArray(t) ? t : [])
        setLists(Array.isArray(l) ? l : [])
      })
      .finally(() => setLoadingRelated(false))
  }, [creating, clientId])

  // Close dropdown on outside click
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [openMenuId])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setForm({ client_id: clientId, sender_id: "", template_id: "", list_id: "", subject: "", scheduled_at: "" })
    setEditingCampaign(null)
    setCreating(false)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/email/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduled_at: form.scheduled_at || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaigns(prev => [data, ...prev])
      resetForm()
      setPreviewCampaign(data)
      setShowSchedulePicker(false)
      toast.success("Campaign created")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCampaign) return
    setSaving(true)
    try {
      const res = await fetch(`/api/email/campaigns/${editingCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, scheduled_at: form.scheduled_at || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaigns(prev => prev.map(c => c.id === data.id ? data : c))
      resetForm()
      setPreviewCampaign(data)
      setShowSchedulePicker(false)
      toast.success("Campaign updated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  const startEditCampaign = (c: Campaign) => {
    setEditingCampaign(c)
    setForm({
      client_id: c.client_id,
      sender_id: "",   // UUIDs not in Campaign type; selects will show empty, user re-selects
      template_id: "",
      list_id: "",
      subject: c.subject,
      scheduled_at: c.scheduled_at ? c.scheduled_at.slice(0, 16) : "",
    })
    setCreating(true)
    setOpenMenuId(null)
  }

  const handleSend = async (id: string) => {
    if (!confirm("Send this campaign now to all eligible contacts?")) return
    setSending(id)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Sent to ${data.sent} contacts${data.failed ? ` (${data.failed} failed)` : ""}`)
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: "sent" } : c))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Send error")
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (id: string, subject: string) => {
    if (!confirm(`Delete campaign "${subject}"? This also removes all send logs.`)) return
    const res = await fetch(`/api/email/campaigns/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete"); return }
    setCampaigns(prev => prev.filter(c => c.id !== id))
    setOpenMenuId(null)
    toast.success("Campaign deleted")
  }

  const handleDuplicate = async (id: string) => {
    setOpenMenuId(null)
    try {
      const res = await fetch(`/api/email/campaigns/${id}/duplicate`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaigns(prev => [data, ...prev])
      toast.success("Campaign duplicated")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Duplicate error")
    }
  }

  const handleSaveTest = async (campaign: Campaign) => {
    setSendingTest(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}/send-test`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Test email sent to emozidigital@gmail.com")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Test send error")
    } finally {
      setSendingTest(false)
    }
  }

  const handleSaveSchedule = async (campaign: Campaign) => {
    if (!scheduleDateTime) { toast.error("Pick a date and time"); return }
    setScheduling(true)
    try {
      const res = await fetch(`/api/email/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduled_at: new Date(scheduleDateTime).toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCampaigns(prev => prev.map(c => c.id === data.id ? data : c))
      setPreviewCampaign(null)
      setShowSchedulePicker(false)
      setScheduleDateTime("")
      toast.success("Campaign scheduled!")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Schedule error")
    } finally {
      setScheduling(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Campaigns</h1>
          <p className="text-sm text-zinc-500 mt-1">Marketing bulk sends via AWS SES</p>
        </div>
        {!creating && (
          <button
            onClick={() => { setEditingCampaign(null); setCreating(true) }}
            className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] transition-colors"
          >
            New campaign
          </button>
        )}
      </div>

      {/* ── Create / Edit form ── */}
      {creating && (
        <form
          onSubmit={editingCampaign ? handleEdit : handleCreate}
          className="bg-white border border-zinc-200 rounded-xl p-5 mb-6 space-y-3"
        >
          <p className="text-sm font-semibold text-zinc-700">
            {editingCampaign ? "Edit campaign" : "New campaign"}
          </p>

          {loadingRelated ? (
            <p className="text-xs text-zinc-400 py-2">Loading options…</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Sender select */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Sender</label>
                <select
                  value={form.sender_id}
                  onChange={e => setForm(f => ({ ...f, sender_id: e.target.value }))}
                  className={INPUT_CLS}
                  required
                >
                  <option value="">Select sender…</option>
                  {senders
                    .filter(s => s.dkim_status === "verified")
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.from_name} &lt;{s.from_email}&gt;
                      </option>
                    ))}
                </select>
              </div>

              {/* Template select */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Template</label>
                <select
                  value={form.template_id}
                  onChange={e => setForm(f => ({ ...f, template_id: e.target.value }))}
                  className={INPUT_CLS}
                  required
                >
                  <option value="">Select template…</option>
                  {templatesList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* List select */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Contact list</label>
                <select
                  value={form.list_id}
                  onChange={e => setForm(f => ({ ...f, list_id: e.target.value }))}
                  className={INPUT_CLS}
                  required
                >
                  <option value="">Select list…</option>
                  {lists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.contact_count} contacts)
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Subject</label>
                <input
                  className={INPUT_CLS}
                  placeholder="Email subject line"
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Schedule (optional — leave blank to confirm manually)
            </label>
            <input
              type="datetime-local"
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
              value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || loadingRelated}
              className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : editingCampaign ? "Update & Preview" : "Create & Preview"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-zinc-500 hover:text-zinc-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Campaign list ── */}
      {loading ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-sm text-zinc-400">No campaigns yet.</p>
      ) : (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{c.subject}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {c.email_senders?.from_name} · {c.email_templates?.name} · {c.email_lists?.name}{" "}
                    {c.email_lists?.contact_count != null && `(${c.email_lists.contact_count} contacts)`}
                  </p>
                  {c.sent_at && (
                    <p className="text-xs text-zinc-400">
                      Sent {new Date(c.sent_at).toLocaleString("en-IN")}
                    </p>
                  )}
                  {c.scheduled_at && !c.sent_at && (
                    <p className="text-xs text-blue-500">
                      Scheduled for {new Date(c.scheduled_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status] ?? STATUS_STYLE.draft}`}>
                    {c.status}
                  </span>

                  {(c.status === "draft" || c.status === "scheduled") && (
                    <button
                      onClick={() => { setPreviewCampaign(c); setShowSchedulePicker(false) }}
                      className="text-xs bg-[#003434] text-white px-3 py-1 rounded-lg hover:bg-[#004444] transition-colors"
                    >
                      Preview
                    </button>
                  )}

                  {/* ⋮ Dropdown */}
                  <div
                    className="relative"
                    ref={openMenuId === c.id ? menuRef : undefined}
                  >
                    <button
                      onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === c.id && (
                      <div className="absolute right-0 top-8 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl py-1.5 w-36 ring-1 ring-black/5">
                        <button
                          onClick={() => startEditCampaign(c)}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDuplicate(c.id)}
                          className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                        >
                          Duplicate
                        </button>
                        <div className="border-t border-zinc-100 my-1" />
                        <button
                          onClick={() => handleDelete(c.id, c.subject)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Campaign Preview Modal ── */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
              <p className="font-semibold text-zinc-800">Campaign Preview</p>
              <button
                onClick={() => { setPreviewCampaign(null); setShowSchedulePicker(false); setScheduleDateTime("") }}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta bar */}
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 grid grid-cols-3 gap-3 shrink-0">
              <div>
                <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">Subject</p>
                <p className="text-xs text-zinc-700 font-semibold truncate mt-0.5">{previewCampaign.subject}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">From</p>
                <p className="text-xs text-zinc-700 font-semibold truncate mt-0.5">
                  {previewCampaign.email_senders?.from_name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">List</p>
                <p className="text-xs text-zinc-700 font-semibold mt-0.5">
                  {previewCampaign.email_lists?.name ?? "—"}
                  {previewCampaign.email_lists?.contact_count != null && (
                    <span className="text-zinc-400 font-normal"> ({previewCampaign.email_lists.contact_count})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Template HTML preview */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {previewCampaign.email_templates?.html_body ? (
                <div
                  className="border border-zinc-100 rounded-xl overflow-hidden bg-white"
                  dangerouslySetInnerHTML={{ __html: previewCampaign.email_templates.html_body }}
                />
              ) : (
                <div className="border border-dashed border-zinc-200 rounded-xl p-8 text-center text-zinc-400 text-sm">
                  No template preview available
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="px-5 py-4 border-t border-zinc-100 shrink-0">
              {/* Schedule picker (toggles in) */}
              {showSchedulePicker && (
                <div className="mb-3 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                  <input
                    type="datetime-local"
                    value={scheduleDateTime}
                    onChange={e => setScheduleDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
                  />
                  <button
                    onClick={() => handleSaveSchedule(previewCampaign)}
                    disabled={scheduling || !scheduleDateTime}
                    className="bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors font-medium whitespace-nowrap"
                  >
                    {scheduling ? "Scheduling…" : "Confirm Schedule"}
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveTest(previewCampaign)}
                  disabled={sendingTest}
                  className="flex-1 border border-zinc-200 text-zinc-700 text-sm py-2.5 rounded-xl hover:bg-zinc-50 font-medium disabled:opacity-50 transition-colors"
                >
                  {sendingTest ? "Sending test…" : "Save & Test"}
                </button>
                <button
                  onClick={() => setShowSchedulePicker(v => !v)}
                  className={`flex-1 border text-sm py-2.5 rounded-xl font-medium transition-colors ${showSchedulePicker ? "bg-[#003434] border-[#003434] text-white" : "border-[#003434] text-[#003434] hover:bg-[#003434]/5"}`}
                >
                  Save & Schedule
                </button>
                <button
                  onClick={() => {
                    setPreviewCampaign(null)
                    setShowSchedulePicker(false)
                    handleSend(previewCampaign.id)
                  }}
                  disabled={sending === previewCampaign.id}
                  className="flex-1 bg-[#003434] text-white text-sm py-2.5 rounded-xl hover:bg-[#004444] font-semibold disabled:opacity-50 transition-colors"
                >
                  {sending === previewCampaign.id ? "Sending…" : "Save & Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
