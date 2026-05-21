"use client"

import { useState, useEffect } from "react"
import {
  X, Image as ImageIcon, Type, Square, Minus,
  Columns2, LayoutTemplate, ChevronUp, ChevronDown, Trash2,
  AlignLeft, AlignCenter, AlignRight, Grid3X3
} from "lucide-react"
import toast from "react-hot-toast"

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType =
  | "text" | "image" | "button" | "divider"
  | "section" | "columns_2" | "columns_3" | "columns_4"

interface EmailBlock {
  id: string
  type: BlockType
  // text
  html?: string
  align?: "left" | "center" | "right"
  color?: string
  fontSize?: number
  // image
  src?: string
  alt?: string
  imgWidth?: string
  href?: string
  // button
  label?: string
  btnHref?: string
  bgColor?: string
  textColor?: string
  borderRadius?: number
  // divider
  dividerColor?: string
  thickness?: number
  // shared
  backgroundColor?: string
  paddingY?: number
  paddingX?: number
  // layout
  numColumns?: number
  columnBlocks?: EmailBlock[][]
}

interface EmailEditorModalProps {
  open: boolean
  onClose: () => void
  initialTemplate?: {
    id?: string
    name?: string
    subject?: string
    html_body?: string
  }
  clientId: string
  onSaved?: (templateId: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function createBlock(type: BlockType): EmailBlock {
  const base = { id: uid(), type, paddingY: 16, paddingX: 32, backgroundColor: "#ffffff" }
  switch (type) {
    case "text":
      return { ...base, html: "<p>Write something here…</p>", align: "left", color: "#333333", fontSize: 16 }
    case "image":
      return { ...base, src: "", alt: "Image", imgWidth: "100%", align: "center" }
    case "button":
      return { ...base, label: "Click Here", btnHref: "#", bgColor: "#003434", textColor: "#ffffff", borderRadius: 6, align: "center" }
    case "divider":
      return { ...base, dividerColor: "#e4e4e7", thickness: 1, paddingY: 16 }
    case "section":
      return { ...base, numColumns: 1, columnBlocks: [[]] }
    case "columns_2":
      return { ...base, numColumns: 2, columnBlocks: [[], []] }
    case "columns_3":
      return { ...base, numColumns: 3, columnBlocks: [[], [], []] }
    case "columns_4":
      return { ...base, numColumns: 4, columnBlocks: [[], [], [], []] }
    default:
      return base
  }
}

function renderBlockHtml(block: EmailBlock): string {
  const py = block.paddingY ?? 16
  const px = block.paddingX ?? 32
  const bg = block.backgroundColor || "#ffffff"
  const pad = `padding:${py}px ${px}px;`
  const bgStyle = bg !== "#ffffff" ? `background-color:${bg};` : ""

  switch (block.type) {
    case "text": {
      const align = block.align || "left"
      const color = block.color || "#333333"
      const fs = block.fontSize || 16
      return `<tr><td style="${pad}${bgStyle}"><div style="margin:0;font-size:${fs}px;color:${color};text-align:${align};line-height:1.6;">${block.html || ""}</div></td></tr>`
    }
    case "image": {
      const align = block.align || "center"
      const marginMap: Record<string, string> = { left: "0 auto 0 0", center: "0 auto", right: "0 0 0 auto" }
      const imgStyle = `max-width:100%;width:${block.imgWidth || "100%"};display:block;margin:${marginMap[align]};`
      const img = `<img src="${block.src || "https://via.placeholder.com/600x200"}" alt="${block.alt || ""}" style="${imgStyle}" />`
      const inner = block.href ? `<a href="${block.href}" style="display:block;">${img}</a>` : img
      return `<tr><td style="${pad}${bgStyle}text-align:${align};">${inner}</td></tr>`
    }
    case "button": {
      const align = block.align || "center"
      const btnStyle = `background-color:${block.bgColor || "#003434"};color:${block.textColor || "#ffffff"};padding:12px 28px;border-radius:${block.borderRadius ?? 6}px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;font-family:Arial,sans-serif;`
      return `<tr><td style="${pad}${bgStyle}text-align:${align};"><a href="${block.btnHref || "#"}" style="${btnStyle}">${block.label || "Click Here"}</a></td></tr>`
    }
    case "divider": {
      const color = block.dividerColor || "#e4e4e7"
      const thick = block.thickness || 1
      return `<tr><td style="${pad}${bgStyle}"><hr style="border:0;border-top:${thick}px solid ${color};margin:0;" /></td></tr>`
    }
    case "section": {
      const inner = (block.columnBlocks?.[0] || []).map(renderBlockHtml).join("")
      return `<tr><td style="${bgStyle}padding:${py}px 0;">${inner ? `<table width="100%" border="0" cellspacing="0" cellpadding="0">${inner}</table>` : ""}</td></tr>`
    }
    case "columns_2":
    case "columns_3":
    case "columns_4": {
      const n = block.numColumns || 2
      const w = Math.floor(100 / n)
      const cols = Array.from({ length: n }).map((_, i) => {
        const childHtml = (block.columnBlocks?.[i] || []).map(renderBlockHtml).join("")
        return `<td width="${w}%" style="vertical-align:top;padding:0 8px;">${childHtml ? `<table width="100%" border="0" cellspacing="0" cellpadding="0">${childHtml}</table>` : "&nbsp;"}</td>`
      }).join("")
      return `<tr><td style="${pad}${bgStyle}"><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr>${cols}</tr></table></td></tr>`
    }
    default:
      return ""
  }
}

function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map(renderBlockHtml).join("\n")
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title></title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;">
          ${rows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function parseBlocksFromHtml(html: string): EmailBlock[] | null {
  if (!html) return null
  const match = html.match(/<!--\s*blocks-json:([\s\S]*?)\s*-->/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    if (Array.isArray(parsed)) return parsed
    return null
  } catch {
    return null
  }
}

// ─── Sidebar Panel ───────────────────────────────────────────────────────────

const CONTENT_BLOCKS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "image",   label: "Image",           icon: <ImageIcon className="w-5 h-5" /> },
  { type: "text",    label: "Text",             icon: <Type className="w-5 h-5" /> },
  { type: "button",  label: "Button",           icon: <Square className="w-5 h-5" /> },
  { type: "divider", label: "Horizontal line",  icon: <Minus className="w-5 h-5" /> },
]

const LAYOUT_BLOCKS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "section",   label: "Section",    icon: <LayoutTemplate className="w-5 h-5" /> },
  { type: "columns_2", label: "2 columns",  icon: <Columns2 className="w-5 h-5" /> },
  { type: "columns_3", label: "3 columns",  icon: <Grid3X3 className="w-5 h-5" /> },
  { type: "columns_4", label: "4 columns",  icon: <Grid3X3 className="w-5 h-5" /> },
]

function SidebarPanel({ addBlock }: { addBlock: (b: EmailBlock) => void }) {
  function handleDragStart(e: React.DragEvent, type: BlockType) {
    e.dataTransfer.setData("block-type", type)
    e.dataTransfer.effectAllowed = "copy"
  }

  function BlockItem({ type, label, icon }: { type: BlockType; label: string; icon: React.ReactNode }) {
    return (
      <div
        draggable
        onDragStart={e => handleDragStart(e, type)}
        onClick={() => addBlock(createBlock(type))}
        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-zinc-200 bg-white cursor-grab hover:border-[#003434] hover:bg-[#003434]/5 select-none transition-colors active:cursor-grabbing"
      >
        <span className="text-zinc-500">{icon}</span>
        <span className="text-[11px] text-zinc-600 font-medium leading-none">{label}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Content</p>
        <div className="grid grid-cols-2 gap-2">
          {CONTENT_BLOCKS.map(b => <BlockItem key={b.type} {...b} />)}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Layout</p>
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_BLOCKS.map(b => <BlockItem key={b.type} {...b} />)}
        </div>
      </div>
    </div>
  )
}

// ─── Block Visual (canvas preview) ───────────────────────────────────────────

function BlockVisual({ block }: { block: EmailBlock }) {
  const bg = block.backgroundColor || "#ffffff"
  const py = block.paddingY ?? 16
  const px = block.paddingX ?? 32

  switch (block.type) {
    case "text":
      return (
        <div
          style={{ padding: `${py}px ${px}px`, background: bg, fontSize: block.fontSize || 16, color: block.color || "#333333", textAlign: block.align || "left", lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: block.html || "<p>Empty text block</p>" }}
        />
      )
    case "image":
      return (
        <div style={{ padding: `${py}px ${px}px`, background: bg, textAlign: block.align || "center" }}>
          {block.src ? (
            <img src={block.src} alt={block.alt || ""} style={{ maxWidth: "100%", width: block.imgWidth || "100%", display: "inline-block" }} />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg bg-zinc-100 border-2 border-dashed border-zinc-300" style={{ height: 120 }}>
              <ImageIcon className="w-8 h-8 text-zinc-300" />
              <span className="text-xs text-zinc-400">Add image URL in properties</span>
            </div>
          )}
        </div>
      )
    case "button":
      return (
        <div style={{ padding: `${py}px ${px}px`, background: bg, textAlign: block.align || "center" }}>
          <span style={{ background: block.bgColor || "#003434", color: block.textColor || "#ffffff", padding: "10px 24px", borderRadius: block.borderRadius ?? 6, fontSize: 14, fontWeight: 600, display: "inline-block" }}>
            {block.label || "Click Here"}
          </span>
        </div>
      )
    case "divider":
      return (
        <div style={{ padding: `${py}px ${px}px`, background: bg }}>
          <hr style={{ border: 0, borderTop: `${block.thickness || 1}px solid ${block.dividerColor || "#e4e4e7"}`, margin: 0 }} />
        </div>
      )
    case "section":
      return (
        <div style={{ padding: `${py}px ${px}px`, background: bg }}>
          {(block.columnBlocks?.[0] || []).length > 0
            ? (block.columnBlocks![0]).map(child => <BlockVisual key={child.id} block={child} />)
            : <div className="rounded-lg border-2 border-dashed border-zinc-200 text-center py-4 text-xs text-zinc-400">Section — add content blocks</div>
          }
        </div>
      )
    case "columns_2":
    case "columns_3":
    case "columns_4": {
      const n = block.numColumns || 2
      return (
        <div style={{ padding: `${py}px ${px}px`, background: bg, display: "flex", gap: 8 }}>
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }} className="border border-dashed border-zinc-300 rounded p-2 min-h-[60px]">
              {(block.columnBlocks?.[i] || []).length > 0
                ? (block.columnBlocks![i]).map(child => <BlockVisual key={child.id} block={child} />)
                : <p className="text-[11px] text-zinc-400 text-center py-2">Col {i + 1}</p>
              }
            </div>
          ))}
        </div>
      )
    }
    default:
      return null
  }
}

// ─── Canvas Block wrapper ─────────────────────────────────────────────────────

interface CanvasBlockProps {
  block: EmailBlock
  isSelected: boolean
  isFirst: boolean
  isLast: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

function CanvasBlock({ block, isSelected, isFirst, isLast, onSelect, onMoveUp, onMoveDown, onDelete }: CanvasBlockProps) {
  return (
    <div
      className={`relative group cursor-pointer transition-all ${isSelected ? "ring-2 ring-inset ring-[#003434]" : "hover:ring-1 hover:ring-inset hover:ring-[#003434]/40"}`}
      onClick={onSelect}
    >
      {/* Hover controls */}
      <div className="absolute top-1 right-1 z-20 hidden group-hover:flex gap-1 bg-white rounded-lg shadow-md border border-zinc-200 p-0.5">
        <button
          onClick={e => { e.stopPropagation(); onMoveUp() }}
          disabled={isFirst}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onMoveDown() }}
          disabled={isLast}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <div className="w-px bg-zinc-200 mx-0.5" />
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block type label (show when selected) */}
      {isSelected && (
        <div className="absolute top-0 left-0 z-20 bg-[#003434] text-white text-[10px] font-medium px-2 py-0.5 rounded-br-md leading-tight">
          {block.type.replace(/_/g, " ")}
        </div>
      )}

      <BlockVisual block={block} />
    </div>
  )
}

// ─── Properties Panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  block,
  updateBlock,
}: {
  block: EmailBlock | undefined
  updateBlock: (id: string, patch: Partial<EmailBlock>) => void
}) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center pt-12 px-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
          <Square className="w-5 h-5 text-zinc-300" />
        </div>
        <p className="text-sm font-medium text-zinc-500">No block selected</p>
        <p className="text-xs text-zinc-400 mt-1">Click a block on the canvas to edit its properties</p>
      </div>
    )
  }

  // Narrowed reference — TS can't narrow outer param inside nested functions
  const b = block
  const id = b.id

  function AlignButtons({ value, onChange }: { value: string; onChange: (v: "left" | "center" | "right") => void }) {
    return (
      <div className="flex gap-1">
        {(["left", "center", "right"] as const).map(a => (
          <button
            key={a}
            onClick={() => onChange(a)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs transition-colors ${value === a ? "bg-[#003434] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}
          >
            {a === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : a === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>
    )
  }

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
        {children}
      </div>
    )
  }

  function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
      />
    )
  }

  function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-9 h-9 rounded-lg border border-zinc-200 cursor-pointer p-0.5 shrink-0" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="#000000" />
      </div>
    )
  }

  function NumberInput({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
        />
        {unit && <span className="text-xs text-zinc-400 shrink-0">{unit}</span>}
      </div>
    )
  }

  // Shared padding fields
  function PaddingFields() {
    return (
      <>
        <Field label="Padding Y">
          <NumberInput value={b.paddingY ?? 16} onChange={v => updateBlock(id, { paddingY: v })} min={0} unit="px" />
        </Field>
        <Field label="Padding X">
          <NumberInput value={b.paddingX ?? 32} onChange={v => updateBlock(id, { paddingX: v })} min={0} unit="px" />
        </Field>
        <Field label="Background">
          <ColorInput value={b.backgroundColor || "#ffffff"} onChange={v => updateBlock(id, { backgroundColor: v })} />
        </Field>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-zinc-800 capitalize">{b.type.replace(/_/g, " ")} Settings</p>

      {b.type === "text" && (
        <>
          <Field label="Content (HTML)">
            <textarea
              value={b.html || ""}
              onChange={e => updateBlock(id, { html: e.target.value })}
              rows={6}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 resize-y"
              placeholder="<p>Your text here…</p>"
            />
          </Field>
          <Field label="Font Size">
            <NumberInput value={b.fontSize ?? 16} onChange={v => updateBlock(id, { fontSize: v })} min={8} max={72} unit="px" />
          </Field>
          <Field label="Color">
            <ColorInput value={b.color || "#333333"} onChange={v => updateBlock(id, { color: v })} />
          </Field>
          <Field label="Alignment">
            <AlignButtons value={b.align || "left"} onChange={v => updateBlock(id, { align: v })} />
          </Field>
          <PaddingFields />
        </>
      )}

      {b.type === "image" && (
        <>
          <Field label="Image URL">
            <TextInput value={b.src || ""} onChange={v => updateBlock(id, { src: v })} placeholder="https://..." />
          </Field>
          <Field label="Alt Text">
            <TextInput value={b.alt || ""} onChange={v => updateBlock(id, { alt: v })} placeholder="Image description" />
          </Field>
          <Field label="Width">
            <TextInput value={b.imgWidth || "100%"} onChange={v => updateBlock(id, { imgWidth: v })} placeholder="100% or 300px" />
          </Field>
          <Field label="Link URL (optional)">
            <TextInput value={b.href || ""} onChange={v => updateBlock(id, { href: v })} placeholder="https://..." />
          </Field>
          <Field label="Alignment">
            <AlignButtons value={b.align || "center"} onChange={v => updateBlock(id, { align: v })} />
          </Field>
          <PaddingFields />
        </>
      )}

      {b.type === "button" && (
        <>
          <Field label="Button Label">
            <TextInput value={b.label || ""} onChange={v => updateBlock(id, { label: v })} placeholder="Click Here" />
          </Field>
          <Field label="Link URL">
            <TextInput value={b.btnHref || ""} onChange={v => updateBlock(id, { btnHref: v })} placeholder="https://..." />
          </Field>
          <Field label="Background Color">
            <ColorInput value={b.bgColor || "#003434"} onChange={v => updateBlock(id, { bgColor: v })} />
          </Field>
          <Field label="Text Color">
            <ColorInput value={b.textColor || "#ffffff"} onChange={v => updateBlock(id, { textColor: v })} />
          </Field>
          <Field label="Border Radius">
            <NumberInput value={b.borderRadius ?? 6} onChange={v => updateBlock(id, { borderRadius: v })} min={0} max={50} unit="px" />
          </Field>
          <Field label="Alignment">
            <AlignButtons value={b.align || "center"} onChange={v => updateBlock(id, { align: v })} />
          </Field>
          <PaddingFields />
        </>
      )}

      {b.type === "divider" && (
        <>
          <Field label="Color">
            <ColorInput value={b.dividerColor || "#e4e4e7"} onChange={v => updateBlock(id, { dividerColor: v })} />
          </Field>
          <Field label="Thickness">
            <NumberInput value={b.thickness ?? 1} onChange={v => updateBlock(id, { thickness: v })} min={1} max={10} unit="px" />
          </Field>
          <PaddingFields />
        </>
      )}

      {(b.type === "section" || b.type === "columns_2" || b.type === "columns_3" || b.type === "columns_4") && (
        <>
          <p className="text-xs text-zinc-400">Layout container — add blocks by clicking inside columns in the canvas.</p>
          <PaddingFields />
        </>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function EmailEditorModal({
  open,
  onClose,
  initialTemplate,
  clientId,
  onSaved,
}: EmailEditorModalProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<"visual" | "html">("visual")
  const [htmlSource, setHtmlSource] = useState("")
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [saving, setSaving] = useState(false)
  const [dragOverCanvas, setDragOverCanvas] = useState(false)

  // Initialize from template on open
  useEffect(() => {
    if (!open) return
    if (initialTemplate) {
      setName(initialTemplate.name || "")
      setSubject(initialTemplate.subject || "")
      const parsed = parseBlocksFromHtml(initialTemplate.html_body || "")
      if (parsed) {
        setBlocks(parsed)
        setMode("visual")
      } else {
        setBlocks([])
        setHtmlSource(initialTemplate.html_body || "")
        setMode("html")
      }
    } else {
      setName("")
      setSubject("")
      setBlocks([])
      setHtmlSource("")
      setMode("visual")
    }
    setSelectedId(null)
  }, [open, initialTemplate])

  function addBlock(block: EmailBlock) {
    setBlocks(prev => [...prev, block])
    setSelectedId(block.id)
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    setBlocks(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function updateBlock(id: string, patch: Partial<EmailBlock>) {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)))
  }

  function handleSwitchToHtml() {
    setHtmlSource(blocksToHtml(blocks))
    setMode("html")
  }

  function handleSwitchToVisual() {
    const parsed = parseBlocksFromHtml(htmlSource)
    if (parsed) {
      setBlocks(parsed)
      setSelectedId(null)
      setMode("visual")
    } else if (window.confirm("Switching back to Visual will discard manual HTML edits. Continue?")) {
      setBlocks([])
      setSelectedId(null)
      setMode("visual")
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOverCanvas(false)
    const type = e.dataTransfer.getData("block-type") as BlockType
    if (!type) return
    addBlock(createBlock(type))
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Template name is required"); return }
    if (!subject.trim()) { toast.error("Subject line is required"); return }
    setSaving(true)
    const html =
      mode === "html"
        ? htmlSource
        : blocksToHtml(blocks) + `\n<!-- blocks-json:${JSON.stringify(blocks)} -->`
    try {
      const payload = {
        client_id: clientId,
        name: name.trim(),
        subject: subject.trim(),
        html_body: html,
        variables: [],
      }
      const url = initialTemplate?.id
        ? `/api/email/templates/${initialTemplate.id}`
        : "/api/email/templates"
      const method = initialTemplate?.id ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem("email_draft_template_id", data.id)
      toast.success(initialTemplate?.id ? "Template updated" : "Template created")
      onSaved?.(data.id)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save error")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const selectedBlock = blocks.find(b => b.id === selectedId)

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-100 flex flex-col">
      {/* ── Top bar ── */}
      <div className="h-14 border-b border-zinc-200 bg-white flex items-center px-4 gap-3 shrink-0 shadow-sm">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Template name"
          className="border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 w-44 shrink-0"
        />
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject line…"
          className="flex-1 min-w-0 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
        />
        {/* Mode toggle */}
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs shrink-0">
          <button
            onClick={() => mode === "html" ? handleSwitchToVisual() : undefined}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === "visual" ? "bg-[#003434] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
          >
            Visual
          </button>
          <button
            onClick={() => mode === "visual" ? handleSwitchToHtml() : undefined}
            className={`px-3 py-1.5 font-medium transition-colors ${mode === "html" ? "bg-[#003434] text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
          >
            HTML
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 bg-[#003434] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors font-medium"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <button
          onClick={onClose}
          className="shrink-0 text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          title="Close editor"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — visual mode only */}
        {mode === "visual" && (
          <div className="w-[280px] shrink-0 bg-white border-r border-zinc-200 overflow-y-auto p-4">
            <SidebarPanel addBlock={addBlock} />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-100">
          {mode === "html" ? (
            <textarea
              value={htmlSource}
              onChange={e => setHtmlSource(e.target.value)}
              spellCheck={false}
              className="w-full min-h-[600px] h-full font-mono text-xs border border-zinc-200 rounded-xl p-4 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
              placeholder="<!DOCTYPE html>&#10;<html>…</html>"
            />
          ) : (
            <div
              className={`w-[600px] mx-auto bg-white shadow-md min-h-[400px] rounded-sm transition-all ${dragOverCanvas ? "ring-2 ring-[#003434]/50 ring-offset-2" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOverCanvas(true) }}
              onDragLeave={() => setDragOverCanvas(false)}
              onDrop={handleDrop}
            >
              {blocks.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="text-4xl mb-3 select-none">✉</div>
                  <p className="text-zinc-400 text-sm font-medium">Drag blocks here or click from the sidebar</p>
                  <p className="text-zinc-300 text-xs mt-1">Build your email visually</p>
                </div>
              ) : (
                blocks.map((block, idx) => (
                  <CanvasBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedId === block.id}
                    isFirst={idx === 0}
                    isLast={idx === blocks.length - 1}
                    onSelect={() => setSelectedId(block.id)}
                    onMoveUp={() => moveBlock(idx, -1)}
                    onMoveDown={() => moveBlock(idx, 1)}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Right properties panel — visual mode only */}
        {mode === "visual" && (
          <div className="w-[260px] shrink-0 bg-white border-l border-zinc-200 overflow-y-auto p-4">
            <PropertiesPanel block={selectedBlock} updateBlock={updateBlock} />
          </div>
        )}
      </div>
    </div>
  )
}
