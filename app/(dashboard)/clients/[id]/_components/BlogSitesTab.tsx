"use client"

import { useState } from "react"
import { useClientUpdate } from "@/lib/useClientUpdate"
import type { BlogSite, BlogSiteType } from "@/lib/blog-sites"
import { Globe, Pencil, Trash2, Plus, Eye, EyeOff, X, Check, Bot } from "lucide-react"

const OPENROUTER_MODELS = [
  // OpenAI
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini" },
  { value: "openai/gpt-5.4", label: "GPT-5.4" },
  { value: "openai/gpt-5.4-pro", label: "GPT-5.4 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-4.1", label: "GPT-4.1" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-oss-20b", label: "GPT OSS 20B" },
  { value: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
  { value: "openai/o4-mini", label: "o4 Mini" },
  { value: "openai/o3-mini", label: "o3 Mini" },
  // Anthropic
  { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5" },
  { value: "anthropic/claude-opus-4", label: "Claude Opus 4" },
  // Google
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  // DeepSeek
  { value: "deepseek/deepseek-chat-v3.1", label: "DeepSeek V3.1" },
  { value: "deepseek/deepseek-r1-0528", label: "DeepSeek R1 0528" },
  // Qwen
  { value: "qwen/qwen3-235b-a22b", label: "Qwen3 235B A22B" },
  { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
  // MoonshotAI
  { value: "moonshotai/kimi-k2", label: "Kimi K2" },
  // Meta
  { value: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  // Mistral
  { value: "mistralai/mistral-large-2512", label: "Mistral Large 3" },
  { value: "mistralai/mistral-small-3.2-24b-instruct", label: "Mistral Small 3.2" },
]

type SupabaseClient = {
  id: string
  section_l: Record<string, unknown> | null
}

const EMPTY_FORM: Omit<BlogSite, 'id'> = {
  name: '',
  site_url: '',
  type: 'supabase',
  supabase_url: '',
  supabase_service_key: '',
  revalidate_secret: '',
  webhook_url: '',
  webhook_secret: '',
}

function SecretInput({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

function BlogSiteModal({
  initial,
  onSave,
  onClose,
}: {
  initial: BlogSite | null
  onSave: (site: BlogSite) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<BlogSite, 'id'>>(
    initial
      ? { ...EMPTY_FORM, ...initial }
      : { ...EMPTY_FORM }
  )

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.site_url.trim()) return
    onSave({
      ...form,
      id: initial?.id ?? crypto.randomUUID(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="font-semibold text-zinc-900">{initial ? 'Edit Blog Site' : 'Add Blog Site'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Site Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Agent Bazar Blog"
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Site URL *</label>
            <input
              type="url"
              value={form.site_url}
              onChange={e => set('site_url', e.target.value)}
              placeholder="https://blog.example.com"
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-2">Sync Type *</label>
            <div className="flex gap-3">
              {(['supabase', 'webhook'] as BlogSiteType[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={form.type === t}
                    onChange={() => set('type', t)}
                    className="accent-[#003434]"
                  />
                  <span className="text-sm text-zinc-700 capitalize">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {form.type === 'supabase' && (
            <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Supabase Config</p>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Supabase Project URL</label>
                <input
                  type="url"
                  value={form.supabase_url ?? ''}
                  onChange={e => set('supabase_url', e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors font-mono"
                />
              </div>
              <SecretInput
                label="Service Role Key"
                value={form.supabase_service_key ?? ''}
                onChange={v => set('supabase_service_key', v)}
                placeholder="eyJhbGci..."
              />
              <SecretInput
                label="Revalidate Secret (optional)"
                value={form.revalidate_secret ?? ''}
                onChange={v => set('revalidate_secret', v)}
                placeholder="For ISR cache busting"
              />
            </div>
          )}

          {form.type === 'webhook' && (
            <div className="space-y-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
              <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Webhook Config</p>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={form.webhook_url ?? ''}
                  onChange={e => set('webhook_url', e.target.value)}
                  placeholder="https://example.com/api/blog-ingest"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors font-mono"
                />
              </div>
              <SecretInput
                label="Webhook Secret (optional)"
                value={form.webhook_secret ?? ''}
                onChange={v => set('webhook_secret', v)}
                placeholder="Bearer token sent in Authorization header"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#003434] hover:bg-[#004444] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {initial ? 'Save Changes' : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SiteCard({
  site,
  onEdit,
  onDelete,
}: {
  site: BlogSite
  onEdit: () => void
  onDelete: () => void
}) {
  const isSupabase = site.type === 'supabase'
  const configured = isSupabase
    ? !!(site.supabase_url && site.supabase_service_key)
    : !!(site.webhook_url)

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 flex items-start gap-4 shadow-sm">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#003434]/10 flex items-center justify-center shrink-0">
        <Globe className="w-4 h-4 text-[#003434]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-zinc-900 truncate">{site.name}</p>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide ${
            site.type === 'supabase'
              ? 'bg-blue-50 text-blue-600'
              : 'bg-orange-50 text-orange-600'
          }`}>
            {site.type}
          </span>
          {!configured && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-500">
              Missing credentials
            </span>
          )}
        </div>
        <a
          href={site.site_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#003434] hover:underline font-mono truncate block mb-2"
        >
          {site.site_url}
        </a>
        <div className="text-xs text-zinc-400 space-y-0.5">
          {isSupabase && site.supabase_url && (
            <p><span className="text-zinc-500">URL:</span> {site.supabase_url}</p>
          )}
          {isSupabase && site.supabase_service_key && (
            <p><span className="text-zinc-500">Key:</span> {'•'.repeat(16)}</p>
          )}
          {isSupabase && site.revalidate_secret && (
            <p><span className="text-zinc-500">Revalidate:</span> {'•'.repeat(12)}</p>
          )}
          {!isSupabase && site.webhook_url && (
            <p><span className="text-zinc-500">Webhook:</span> {site.webhook_url}</p>
          )}
          {!isSupabase && site.webhook_secret && (
            <p><span className="text-zinc-500">Secret:</span> {'•'.repeat(12)}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-zinc-400 hover:text-[#003434] hover:bg-zinc-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function BlogSitesTab({ client }: { client: SupabaseClient }) {
  const { update, saving, saved, error } = useClientUpdate(client.id)
  const [sites, setSites] = useState<BlogSite[]>(
    ((client.section_l as any)?.blog_sites ?? []) as BlogSite[]
  )
  const [showModal, setShowModal] = useState(false)
  const [editingSite, setEditingSite] = useState<BlogSite | null>(null)
  const [blogPrompt, setBlogPrompt] = useState<string>(
    ((client.section_l as any)?.blog_prompt ?? '') as string
  )
  const [blogModel, setBlogModel] = useState<string>(
    ((client.section_l as any)?.blog_model ?? '') as string
  )
  const [promptSaving, setPromptSaving] = useState(false)

  function savePrompt() {
    setPromptSaving(true)
    update('section_l', { blog_prompt: blogPrompt, blog_model: blogModel })
    setTimeout(() => setPromptSaving(false), 1500)
  }

  function persist(updated: BlogSite[]) {
    setSites(updated)
    update('section_l', { blog_sites: updated })
  }

  function handleSave(site: BlogSite) {
    const existing = sites.findIndex(s => s.id === site.id)
    const updated = existing >= 0
      ? sites.map(s => s.id === site.id ? site : s)
      : [...sites, site]
    persist(updated)
    setShowModal(false)
    setEditingSite(null)
  }

  function handleDelete(site: BlogSite) {
    if (!confirm(`Remove "${site.name}"? This will stop syncing blog posts to this site.`)) return
    persist(sites.filter(s => s.id !== site.id))
  }

  function openAdd() {
    setEditingSite(null)
    setShowModal(true)
  }

  function openEdit(site: BlogSite) {
    setEditingSite(site)
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 shadow-sm">
        <span className="text-red-400">⚠️</span>
        <p className="text-red-400 text-sm font-medium">
          Credentials stored securely and visible to admins only. Service role keys have full DB access — handle with care.
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#70BF4B]" />
            <h3 className="text-zinc-900 text-sm font-semibold">Blog Sites</h3>
            <span className="text-xs text-zinc-400 font-mono">{sites.length} configured</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-zinc-400">Saving…</span>}
            {saved && <span className="text-xs text-[#70BF4B]">Saved</span>}
            {error && <span className="text-xs text-red-500">Error saving</span>}
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-[#003434] hover:bg-[#004444] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Blog Site
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {sites.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-600">No blog sites configured</p>
                <p className="text-xs text-zinc-400 mt-1">Add a site to start syncing blog posts automatically.</p>
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 border border-[#003434] text-[#003434] hover:bg-[#003434] hover:text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Blog Site
              </button>
            </div>
          ) : (
            sites.map(site => (
              <SiteCard
                key={site.id}
                site={site}
                onEdit={() => openEdit(site)}
                onDelete={() => handleDelete(site)}
              />
            ))
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-700 text-xs font-medium mb-1">How it works</p>
        <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
          <li><strong>Supabase:</strong> Posts are upserted directly into the external blog's Supabase database and ISR cache is busted via the revalidate endpoint.</li>
          <li><strong>Webhook:</strong> Post data is POSTed as JSON to your endpoint with an optional Bearer token.</li>
          <li>Blog posts sync automatically on every save in the Blog Editor.</li>
        </ul>
      </div>

      {/* Blog Prompt Section */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-[#D0F255]" />
            <Bot className="w-4 h-4 text-zinc-500" />
            <h3 className="text-zinc-900 text-sm font-semibold">Blog AI Prompt</h3>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-zinc-400">Saving…</span>}
            {saved && <span className="text-xs text-[#70BF4B]">Saved</span>}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">LLM Model</label>
            <select
              value={blogModel}
              onChange={e => setBlogModel(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors"
            >
              <option value="">Default (GPT-5.4 Mini)</option>
              {OPENROUTER_MODELS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">System Prompt</label>
            <textarea
              value={blogPrompt}
              onChange={e => setBlogPrompt(e.target.value)}
              placeholder="Enter a custom AI system prompt for this client's blog generation. Leave empty to use the generic default prompt."
              rows={10}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#003434] transition-colors resize-y font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Leave empty to use the generic default prompt. The prompt should instruct the AI and end with the required JSON response format.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={savePrompt}
              disabled={promptSaving}
              className="flex items-center gap-2 bg-[#003434] hover:bg-[#004444] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              <Check className="w-4 h-4" />
              {promptSaving ? 'Saving…' : 'Save Prompt'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <BlogSiteModal
          initial={editingSite}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingSite(null) }}
        />
      )}
    </div>
  )
}
