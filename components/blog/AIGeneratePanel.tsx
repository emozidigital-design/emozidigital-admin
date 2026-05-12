"use client"

import { useState, useRef } from "react"
import {
  Sparkles,
  Link2,
  FileText,
  Loader2,
  Check,
  X,
  Upload,
  RotateCcw,
  ChevronDown,
} from "lucide-react"
import toast from "react-hot-toast"

export type GeneratedBlogData = {
  title: string
  slug: string
  content: string
  excerpt: string
  seo_title: string
  seo_description: string
  focus_keyword: string
  tags: string[]
  author: string
  category: string
  industry: string
}

type Props = {
  onApply: (data: GeneratedBlogData) => void
  defaultExpanded?: boolean
}

type InputMode = "url" | "text"

type Step = {
  label: string
  done: boolean
}

const STEPS: Step[] = [
  { label: "Fetching source content...", done: false },
  { label: "Analyzing with AI...", done: false },
  { label: "Writing blog & SEO content...", done: false },
  { label: "Generating social media copy...", done: false },
]

export function AIGeneratePanel({ onApply, defaultExpanded = false }: Props) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [inputMode, setInputMode] = useState<InputMode>("url")
  const [urlInput, setUrlInput] = useState("")
  const [textInput, setTextInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [result, setResult] = useState<GeneratedBlogData | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function markStep(index: number) {
    setSteps(prev => prev.map((s, i) => ({ ...s, done: i <= index })))
  }

  async function handleGenerate() {
    const input = inputMode === "url" ? urlInput.trim() : textInput.trim()
    if (!input) {
      toast.error(inputMode === "url" ? "Enter a URL to continue" : "Paste or upload content first")
      return
    }

    setIsGenerating(true)
    setResult(null)
    setSteps(STEPS.map(s => ({ ...s, done: false })))

    const t1 = setTimeout(() => markStep(0), 1200)
    const t2 = setTimeout(() => markStep(1), 6000)
    const t3 = setTimeout(() => markStep(2), 18000)

    try {
      const body =
        inputMode === "url"
          ? { type: "url", url: input }
          : { type: "text", content: input }

      const res = await fetch("/api/blog/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Generation failed")
      }

      const { data } = await res.json()
      setSteps(STEPS.map(s => ({ ...s, done: true })))
      await new Promise(r => setTimeout(r, 400))
      setResult(data)
      toast.success("Blog content generated!")
    } catch (err: any) {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      toast.error(err.message || "Generation failed. Please try again.")
      setSteps([])
    } finally {
      setIsGenerating(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setTextInput((ev.target?.result as string) || "")
      setInputMode("text")
      toast.success(`Loaded: ${file.name}`)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleApply() {
    if (!result) return
    onApply(result)
    toast.success("Form filled with AI-generated content!")
    setIsExpanded(false)
  }

  function reset() {
    setResult(null)
    setSteps([])
  }

  const activeStepIndex = steps.findIndex(s => !s.done)

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2.5 border border-dashed border-[#70BF4B]/25 hover:border-[#70BF4B]/50 rounded-2xl py-3.5 text-[#70BF4B]/50 hover:text-[#70BF4B] text-[11px] font-bold uppercase tracking-[0.15em] transition-all group"
      >
        <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
        AI Generate from URL or File
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-b from-[#001f1f] to-[#001a1a] border border-[#70BF4B]/20 rounded-2xl overflow-hidden shadow-lg shadow-[#70BF4B]/5">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#003434]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#70BF4B]/10 border border-[#70BF4B]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#70BF4B]" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">AI Content Generator</h3>
            <p className="text-[#70BF4B]/40 text-[9px] uppercase tracking-widest font-bold mt-0.5">
              AgentBazar PROMPT_AB
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-zinc-700 hover:text-zinc-400 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* ── INPUT SECTION ── */}
        {!isGenerating && !result && (
          <>
            {/* Mode Toggle */}
            <div className="flex gap-1.5 bg-[#001a1a] border border-[#003434] p-1 rounded-xl">
              <button
                onClick={() => setInputMode("url")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  inputMode === "url"
                    ? "bg-[#003434] text-[#70BF4B] shadow-sm"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                URL Link
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all ${
                  inputMode === "text"
                    ? "bg-[#003434] text-[#70BF4B] shadow-sm"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste / File
              </button>
            </div>

            {/* URL Input */}
            {inputMode === "url" && (
              <div>
                <label className="block text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">
                  Source Article URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleGenerate()}
                  placeholder="https://example.com/travel-news-article..."
                  className="w-full bg-[#001a1a] border border-[#003434] focus:border-[#70BF4B]/40 text-[#70BF4B] text-sm rounded-xl px-4 py-3 outline-none transition-all placeholder-zinc-800 font-mono"
                />
                <p className="text-[9px] text-zinc-700 mt-2 italic">
                  For JS-heavy pages, use Paste mode instead
                </p>
              </div>
            )}

            {/* Text / File Input */}
            {inputMode === "text" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                    Paste Content
                  </label>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 text-[10px] text-[#70BF4B]/60 hover:text-[#70BF4B] font-bold transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Upload File
                  </button>
                </div>
                <textarea
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Paste blog content, news article, or travel update here..."
                  rows={7}
                  className="w-full bg-[#001a1a] border border-[#003434] focus:border-[#70BF4B]/40 text-zinc-300 text-sm rounded-xl px-4 py-3 outline-none transition-all resize-none placeholder-zinc-800"
                />
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.html,.htm"
                  onChange={handleFileUpload}
                />
                <p className="text-[9px] text-zinc-700 italic">Accepts .txt, .md, .html files</p>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!(inputMode === "url" ? urlInput.trim() : textInput.trim())}
              className="w-full flex items-center justify-center gap-2.5 bg-[#70BF4B] hover:bg-[#5faa3e] disabled:opacity-40 disabled:cursor-not-allowed text-[#001a1a] font-bold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-[#70BF4B]/15 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Generate Blog Post
            </button>
          </>
        )}

        {/* ── LOADING STATE ── */}
        {isGenerating && (
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 text-[#70BF4B] animate-spin" />
              <span className="text-white font-bold text-sm">Generating content package...</span>
            </div>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const isCurrent = i === activeStepIndex
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        step.done
                          ? "bg-[#70BF4B]"
                          : isCurrent
                          ? "bg-[#001a1a] border-2 border-[#70BF4B]"
                          : "bg-[#001a1a] border border-[#003434]"
                      }`}
                    >
                      {step.done ? (
                        <Check className="w-3 h-3 text-[#001a1a]" />
                      ) : isCurrent ? (
                        <Loader2 className="w-3 h-3 text-[#70BF4B] animate-spin" />
                      ) : null}
                    </div>
                    <span
                      className={`text-sm transition-colors ${
                        step.done
                          ? "text-[#70BF4B]"
                          : isCurrent
                          ? "text-white"
                          : "text-zinc-700"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="text-zinc-700 text-[10px] text-center italic">
              This takes 30–60 seconds — please wait
            </p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {result && !isGenerating && (
          <div className="space-y-4">
            {/* Success badge */}
            <div className="flex items-center gap-2 bg-[#70BF4B]/10 border border-[#70BF4B]/20 rounded-xl px-4 py-2.5">
              <Check className="w-4 h-4 text-[#70BF4B] shrink-0" />
              <span className="text-[#70BF4B] text-xs font-bold">
                Full content package generated
              </span>
            </div>

            {/* Blog Preview */}
            <div className="space-y-3">
              <Field label="Title" value={result.title} large />
              <Field label="Slug" value={`/${result.slug}`} mono />
              <Field label="Excerpt" value={result.excerpt} />
              <div className="grid grid-cols-2 gap-2">
                <Field
                  label={`SEO Title (${result.seo_title?.length ?? 0}/60)`}
                  value={result.seo_title}
                  warn={(result.seo_title?.length ?? 0) > 60}
                />
                <Field label="Focus Keyword" value={result.focus_keyword} />
              </div>
              <Field label="SEO Description" value={result.seo_description} />
              <div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {result.tags?.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[9px] text-zinc-400 bg-[#003434] px-2 py-0.5 rounded-md font-mono"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <Field label="Industry / Category" value={`${result.industry} → ${result.category}`} />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-2 bg-[#70BF4B] hover:bg-[#5faa3e] text-[#001a1a] font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-[#70BF4B]/15 active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                Apply to Form
              </button>
              <button
                onClick={reset}
                title="Start over"
                className="px-4 py-3 text-zinc-600 hover:text-zinc-300 border border-[#003434] hover:border-[#70BF4B]/30 rounded-xl transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Small helper components ──

function Field({
  label,
  value,
  large,
  mono,
  warn,
}: {
  label: string
  value?: string
  large?: boolean
  mono?: boolean
  warn?: boolean
}) {
  return (
    <div className="bg-[#001a1a] border border-[#003434] rounded-xl p-3">
      <p className="text-[9px] text-zinc-600 font-bold uppercase mb-1">{label}</p>
      <p
        className={`leading-snug ${
          large ? "text-white text-sm font-bold" : "text-zinc-400 text-xs"
        } ${mono ? "font-mono text-[#70BF4B]" : ""} ${warn ? "text-red-400" : ""}`}
      >
        {value || <span className="text-zinc-700 italic">—</span>}
      </p>
    </div>
  )
}

