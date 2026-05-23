"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  X, Image as ImageIcon, Type, Square, Minus, Plus,
  Columns2, LayoutTemplate, ChevronUp, ChevronDown, Trash2,
  AlignLeft, AlignCenter, AlignRight, Grid3X3, Code
} from "lucide-react"
import toast from "react-hot-toast"

const AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"

// Fixed AgentBazar header HTML (always prepended, never editable)
const AGENTBAZAR_HEADER_HTML = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr><td style="background:#001D4A;height:10px;font-size:1px;line-height:1px;"> </td></tr>
  <tr><td style="background:#ffffff;padding:10px 24px;text-align:center;">
    <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" height="52" style="height:52px;max-height:52px;border:0;display:inline-block;" />
  </td></tr>
  <tr><td style="background:#F47920;height:10px;font-size:1px;line-height:1px;"> </td></tr>
</table>`

// ─── Types ───────────────────────────────────────────────────────────────────

type BlockType =
  | "text" | "image" | "button" | "divider" | "html"
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
  // html block
  rawHtml?: string
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
    template_type?: string
  }
  clientId: string
  onSaved?: (templateId: string) => void
  defaultTemplateType?: "campaign" | "newsletter"
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
    case "html":
      return { ...base, rawHtml: "<p>Custom HTML here…</p>", paddingY: 0, paddingX: 0 }
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
    case "html": {
      return `<tr><td>${block.rawHtml || ""}</td></tr>`
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

function blocksToHtml(blocks: EmailBlock[], prependHeader?: string): string {
  const rows = blocks.map(renderBlockHtml).join("\n")
  const headerRow = prependHeader ? `<tr><td style="padding:0;">${prependHeader}</td></tr>` : ""
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
          ${headerRow}
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

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function updateBlockInTree(blocks: EmailBlock[], id: string, patch: Partial<EmailBlock>): EmailBlock[] {
  return blocks.map(b => {
    if (b.id === id) return { ...b, ...patch }
    if (b.columnBlocks) {
      return {
        ...b,
        columnBlocks: b.columnBlocks.map(col =>
          col.map(child => child.id === id ? { ...child, ...patch } : child)
        ),
      }
    }
    return b
  })
}

function deleteBlockInTree(blocks: EmailBlock[], id: string): EmailBlock[] {
  return blocks
    .filter(b => b.id !== id)
    .map(b => {
      if (!b.columnBlocks) return b
      return {
        ...b,
        columnBlocks: b.columnBlocks.map(col => col.filter(child => child.id !== id)),
      }
    })
}

function findBlockInTree(id: string, blocks: EmailBlock[]): EmailBlock | null {
  for (const b of blocks) {
    if (b.id === id) return b
    if (b.columnBlocks) {
      for (const col of b.columnBlocks) {
        for (const child of col) {
          if (child.id === id) return child
        }
      }
    }
  }
  return null
}

// ─── Block type metadata ──────────────────────────────────────────────────────

const CONTENT_BLOCKS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "image",   label: "Image",          icon: <ImageIcon className="w-5 h-5" /> },
  { type: "text",    label: "Text",            icon: <Type className="w-5 h-5" /> },
  { type: "button",  label: "Button",          icon: <Square className="w-5 h-5" /> },
  { type: "divider", label: "Horizontal line", icon: <Minus className="w-5 h-5" /> },
  { type: "html",    label: "HTML",            icon: <Code className="w-5 h-5" /> },
]

const LAYOUT_BLOCKS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "section",   label: "Section",   icon: <LayoutTemplate className="w-5 h-5" /> },
  { type: "columns_2", label: "2 columns", icon: <Columns2 className="w-5 h-5" /> },
  { type: "columns_3", label: "3 columns", icon: <Grid3X3 className="w-5 h-5" /> },
  { type: "columns_4", label: "4 columns", icon: <Grid3X3 className="w-5 h-5" /> },
]

// ─── Systeme.io-style Left Panel ──────────────────────────────────────────────
// Left panel shows block library when nothing selected, or block properties when selected.

function PPField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">{label}</label>
      {children}
    </div>
  )
}

function PPTextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white"
    />
  )
}

function PPColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded border border-zinc-200 cursor-pointer p-0.5 shrink-0" />
      <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-zinc-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20" placeholder="#000000" />
    </div>
  )
}

function PPNumberInput({ value, onChange, min, max, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; unit?: string }) {
  return (
    <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min ?? 0, value - 1))}
        className="px-2 py-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors text-sm font-bold leading-none"
      >−</button>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="flex-1 text-center text-sm py-1.5 focus:outline-none w-12 min-w-0 bg-transparent"
      />
      {unit && <span className="text-xs text-zinc-400 pr-1">{unit}</span>}
      <button
        type="button"
        onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
        className="px-2 py-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors text-sm font-bold leading-none"
      >+</button>
    </div>
  )
}

function PPAlignButtons({ value, onChange }: { value: string; onChange: (v: "left" | "center" | "right") => void }) {
  return (
    <div className="flex gap-1">
      {(["left", "center", "right"] as const).map(a => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`flex-1 flex items-center justify-center py-2 rounded-lg text-xs transition-colors border ${value === a ? "bg-[#003434] text-white border-[#003434]" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300"}`}
        >
          {a === "left" ? <AlignLeft className="w-3.5 h-3.5" /> : a === "center" ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
        </button>
      ))}
    </div>
  )
}

function PPImageUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/email/upload-image", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onChange(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 min-w-0"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium text-zinc-600 hover:border-[#003434] hover:text-[#003434] hover:bg-[#003434]/5 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {uploading ? "…" : "Upload"}
        </button>
      </div>
      {value && (
        <img src={value} alt="preview" className="w-full rounded-lg border border-zinc-100 object-cover max-h-24" />
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── Left panel: block library or properties ──────────────────────────────────

function LeftPanel({
  selectedBlock,
  updateBlock,
  addBlock,
  onBack,
}: {
  selectedBlock: EmailBlock | undefined
  updateBlock: (id: string, patch: Partial<EmailBlock>) => void
  addBlock: (b: EmailBlock) => void
  onBack: () => void
}) {
  function handleDragStart(e: React.DragEvent, type: BlockType) {
    e.dataTransfer.setData("block-type", type)
    e.dataTransfer.effectAllowed = "copy"
  }

  // ── Block library ──
  if (!selectedBlock) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-5">
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Content</p>
            <div className="space-y-1">
              {CONTENT_BLOCKS.map(b => (
                <div
                  key={b.type}
                  draggable
                  onDragStart={e => handleDragStart(e, b.type)}
                  onClick={() => addBlock(createBlock(b.type))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-100 bg-white cursor-pointer hover:border-[#003434]/30 hover:bg-[#003434]/5 select-none transition-colors group"
                >
                  <span className="text-zinc-400 group-hover:text-[#003434] transition-colors">{b.icon}</span>
                  <span className="text-sm text-zinc-700 font-medium group-hover:text-[#003434] transition-colors">{b.label}</span>
                  <span className="ml-auto text-zinc-300 group-hover:text-zinc-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Layout</p>
            <div className="space-y-1">
              {LAYOUT_BLOCKS.map(b => (
                <div
                  key={b.type}
                  draggable
                  onDragStart={e => handleDragStart(e, b.type)}
                  onClick={() => addBlock(createBlock(b.type))}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-100 bg-white cursor-pointer hover:border-[#003434]/30 hover:bg-[#003434]/5 select-none transition-colors group"
                >
                  <span className="text-zinc-400 group-hover:text-[#003434] transition-colors">{b.icon}</span>
                  <span className="text-sm text-zinc-700 font-medium group-hover:text-[#003434] transition-colors">{b.label}</span>
                  <span className="ml-auto text-zinc-300 group-hover:text-zinc-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Block properties ──
  const b = selectedBlock
  const id = b.id

  return (
    <div className="h-full flex flex-col">
      {/* Back header */}
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {b.type === "columns_2" || b.type === "columns_3" || b.type === "columns_4"
            ? b.type.replace("_", " ") : b.type.charAt(0).toUpperCase() + b.type.slice(1)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {b.type === "text" && (
          <>
            <PPField label="Content (HTML)">
              <textarea
                value={b.html || ""}
                onChange={e => updateBlock(id, { html: e.target.value })}
                rows={6}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 resize-y"
                placeholder="<p>Your text here…</p>"
              />
            </PPField>
            <PPField label="Font Size">
              <PPNumberInput value={b.fontSize ?? 16} onChange={v => updateBlock(id, { fontSize: v })} min={8} max={72} unit="px" />
            </PPField>
            <PPField label="Color">
              <PPColorInput value={b.color || "#333333"} onChange={v => updateBlock(id, { color: v })} />
            </PPField>
            <PPField label="Align">
              <PPAlignButtons value={b.align || "left"} onChange={v => updateBlock(id, { align: v })} />
            </PPField>
          </>
        )}

        {b.type === "image" && (
          <>
            <PPField label="Upload a new file">
              <PPImageUploadField value={b.src || ""} onChange={v => updateBlock(id, { src: v })} />
            </PPField>
            <PPField label="Open URL when image is clicked">
              <PPTextInput value={b.href || ""} onChange={v => updateBlock(id, { href: v })} placeholder="https://..." />
            </PPField>
            <PPField label="Image size">
              <div className="space-y-2">
                <input
                  type="range"
                  min={100}
                  max={600}
                  value={parseInt(b.imgWidth?.replace("px", "") || "600")}
                  onChange={e => updateBlock(id, { imgWidth: `${e.target.value}px` })}
                  className="w-full accent-[#003434]"
                />
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>100px</span>
                  <span className="font-semibold text-zinc-600">{b.imgWidth || "100%"}</span>
                  <span>600px</span>
                </div>
              </div>
            </PPField>
            <PPField label="Align">
              <PPAlignButtons value={b.align || "center"} onChange={v => updateBlock(id, { align: v })} />
            </PPField>
          </>
        )}

        {b.type === "button" && (
          <>
            <PPField label="Button Label">
              <PPTextInput value={b.label || ""} onChange={v => updateBlock(id, { label: v })} placeholder="Click Here" />
            </PPField>
            <PPField label="Link URL">
              <PPTextInput value={b.btnHref || ""} onChange={v => updateBlock(id, { btnHref: v })} placeholder="https://..." />
            </PPField>
            <PPField label="Background Color">
              <PPColorInput value={b.bgColor || "#003434"} onChange={v => updateBlock(id, { bgColor: v })} />
            </PPField>
            <PPField label="Text Color">
              <PPColorInput value={b.textColor || "#ffffff"} onChange={v => updateBlock(id, { textColor: v })} />
            </PPField>
            <PPField label="Border Radius">
              <PPNumberInput value={b.borderRadius ?? 6} onChange={v => updateBlock(id, { borderRadius: v })} min={0} max={50} unit="px" />
            </PPField>
            <PPField label="Align">
              <PPAlignButtons value={b.align || "center"} onChange={v => updateBlock(id, { align: v })} />
            </PPField>
          </>
        )}

        {b.type === "divider" && (
          <>
            <PPField label="Color">
              <PPColorInput value={b.dividerColor || "#e4e4e7"} onChange={v => updateBlock(id, { dividerColor: v })} />
            </PPField>
            <PPField label="Thickness">
              <PPNumberInput value={b.thickness ?? 1} onChange={v => updateBlock(id, { thickness: v })} min={1} max={10} unit="px" />
            </PPField>
          </>
        )}

        {b.type === "html" && (
          <PPField label="Custom HTML">
            <textarea
              value={b.rawHtml || ""}
              onChange={e => updateBlock(id, { rawHtml: e.target.value })}
              rows={14}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#003434]/20 resize-y"
              placeholder="<table>…</table>"
            />
          </PPField>
        )}

        {(b.type === "section" || b.type === "columns_2" || b.type === "columns_3" || b.type === "columns_4") && (
          <>
            <p className="text-xs text-zinc-400">Layout container — click inside columns on the canvas to add content.</p>
            <PPField label="Background">
              <PPColorInput value={b.backgroundColor || "#ffffff"} onChange={v => updateBlock(id, { backgroundColor: v })} />
            </PPField>
          </>
        )}

        {/* Padding — all non-html blocks */}
        {b.type !== "html" && (
          <div className="border-t border-zinc-100 pt-4 space-y-3">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Spacing</p>
            <PPField label="Padding Top/Bottom">
              <PPNumberInput value={b.paddingY ?? 16} onChange={v => updateBlock(id, { paddingY: v })} min={0} unit="px" />
            </PPField>
            <PPField label="Padding Left/Right">
              <PPNumberInput value={b.paddingX ?? 32} onChange={v => updateBlock(id, { paddingX: v })} min={0} unit="px" />
            </PPField>
            {b.type !== "divider" && b.type !== "section" && !b.type.startsWith("columns_") && (
              <PPField label="Background">
                <PPColorInput value={b.backgroundColor || "#ffffff"} onChange={v => updateBlock(id, { backgroundColor: v })} />
              </PPField>
            )}
          </div>
        )}

        {/* Item visibility — systeme.io style */}
        <div className="border-t border-zinc-100 pt-4 space-y-2">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Item visible on:</p>
          {(["Desktop", "Mobile"] as const).map(d => (
            <label key={d} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-zinc-300 accent-[#003434]" />
              <span className="text-sm text-zinc-700">{d}</span>
            </label>
          ))}
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
              <span className="text-xs text-zinc-400">Upload or paste image URL in the panel</span>
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
    case "html":
      return (
        <div dangerouslySetInnerHTML={{ __html: block.rawHtml || "" }} />
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

const CTRL_BTN = "p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
const CTRL_DEL = "p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"

interface CanvasBlockProps {
  block: EmailBlock
  isSelected: boolean
  isFirst: boolean
  isLast: boolean
  selectedId: string | null
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  onSelectChild: (id: string) => void
  onInsertContent: (parentId: string, colIndex: number) => void
  onDeleteChild: (id: string) => void
  onMoveChild: (parentId: string, colIndex: number, childIdx: number, dir: -1 | 1) => void
}

function CanvasBlock({
  block, isSelected, isFirst, isLast, selectedId,
  onSelect, onMoveUp, onMoveDown, onDelete,
  onSelectChild, onInsertContent, onDeleteChild, onMoveChild,
}: CanvasBlockProps) {
  const isLayout = block.type === "section" || block.type.startsWith("columns_")
  const n = block.numColumns || 1
  const py = block.paddingY ?? 16
  const px = block.paddingX ?? 32
  const bg = block.backgroundColor || "#ffffff"

  return (
    <div
      className={`relative group cursor-pointer transition-all ${isSelected ? "ring-2 ring-inset ring-[#003434]" : "hover:ring-1 hover:ring-inset hover:ring-[#003434]/40"}`}
      onClick={onSelect}
    >
      {/* Top-level block controls */}
      <div className="absolute top-1 right-1 z-20 hidden group-hover:flex gap-1 bg-white rounded-lg shadow-md border border-zinc-200 p-0.5">
        <button onClick={e => { e.stopPropagation(); onMoveUp() }} disabled={isFirst} className={CTRL_BTN} title="Move up">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); onMoveDown() }} disabled={isLast} className={CTRL_BTN} title="Move down">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <div className="w-px bg-zinc-200 mx-0.5" />
        <button onClick={e => { e.stopPropagation(); onDelete() }} className={CTRL_DEL} title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {isSelected && (
        <div className="absolute top-0 left-0 z-20 bg-[#003434] text-white text-[10px] font-medium px-2 py-0.5 rounded-br-md leading-tight">
          {block.type.replace(/_/g, " ")}
        </div>
      )}

      {isLayout ? (
        <div style={{ padding: `${py}px ${px}px`, background: bg, display: "flex", gap: 8 }}>
          {Array.from({ length: n }).map((_, colIndex) => {
            const children = block.columnBlocks?.[colIndex] || []
            return (
              <div
                key={colIndex}
                style={{ flex: 1, minWidth: 0 }}
                className="border border-dashed border-zinc-300 rounded min-h-[60px] overflow-hidden"
              >
                {children.map((child, childIdx) => (
                  <div
                    key={child.id}
                    className={`relative group/child cursor-pointer transition-all ${selectedId === child.id ? "ring-2 ring-inset ring-[#003434]" : "hover:ring-1 hover:ring-inset hover:ring-[#003434]/40"}`}
                    onClick={e => { e.stopPropagation(); onSelectChild(child.id) }}
                  >
                    <div className="absolute top-1 right-1 z-30 hidden group-hover/child:flex gap-1 bg-white rounded-lg shadow border border-zinc-200 p-0.5">
                      <button onClick={e => { e.stopPropagation(); onMoveChild(block.id, colIndex, childIdx, -1) }} disabled={childIdx === 0} className={CTRL_BTN} title="Move up">
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); onMoveChild(block.id, colIndex, childIdx, 1) }} disabled={childIdx === children.length - 1} className={CTRL_BTN} title="Move down">
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="w-px bg-zinc-200 mx-0.5" />
                      <button onClick={e => { e.stopPropagation(); onDeleteChild(child.id) }} className={CTRL_DEL} title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    {selectedId === child.id && (
                      <div className="absolute top-0 left-0 z-20 bg-[#003434] text-white text-[10px] font-medium px-2 py-0.5 rounded-br-md leading-tight">
                        {child.type}
                      </div>
                    )}
                    <BlockVisual block={child} />
                  </div>
                ))}
                <button
                  onClick={e => { e.stopPropagation(); onInsertContent(block.id, colIndex) }}
                  className="w-full py-2 text-[11px] text-zinc-400 hover:text-[#003434] hover:bg-[#003434]/5 flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add content
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <BlockVisual block={block} />
      )}
    </div>
  )
}

// ─── Insert Content Popup ─────────────────────────────────────────────────────

function InsertContentPopup({ onInsert, onClose }: { onInsert: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/30 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[500px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-zinc-800">Insert new content</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {CONTENT_BLOCKS.map(item => (
            <button
              key={item.type}
              onClick={() => onInsert(item.type)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-zinc-200 hover:border-[#003434] hover:bg-[#003434]/5 transition-colors cursor-pointer"
            >
              <span className="text-zinc-500">{item.icon}</span>
              <span className="text-xs text-zinc-600 font-medium leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── HTML Preview iframe ──────────────────────────────────────────────────────

function HtmlPreviewPane({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(html || "<body style='margin:0;background:#f4f4f5;'></body>")
    doc.close()
  }, [html])

  return (
    <iframe
      ref={iframeRef}
      title="HTML Preview"
      className="w-full border-0"
      sandbox="allow-same-origin"
      style={{ height: "calc(100vh - 100px)", display: "block" }}
    />
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function EmailEditorModal({
  open,
  onClose,
  initialTemplate,
  clientId,
  onSaved,
  defaultTemplateType = "campaign",
}: EmailEditorModalProps) {
  const router = useRouter()
  const isAgentBazar = clientId === AGENTBAZAR_CLIENT_ID

  const [blocks, setBlocks] = useState<EmailBlock[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [insertTarget, setInsertTarget] = useState<{ parentId: string; colIndex: number } | null>(null)
  const [mode, setMode] = useState<"visual" | "html">("visual")
  const [htmlSource, setHtmlSource] = useState("")
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [templateType, setTemplateType] = useState<"campaign" | "newsletter">(defaultTemplateType)
  const [saving, setSaving] = useState(false)
  const [dragOverCanvas, setDragOverCanvas] = useState(false)

  // For HTML mode: live preview pane
  const [showHtmlPreview, setShowHtmlPreview] = useState(true)

  // Initialize from template on open
  useEffect(() => {
    if (!open) return
    if (initialTemplate) {
      setName(initialTemplate.name || "")
      setSubject(initialTemplate.subject || "")
      setTemplateType((initialTemplate.template_type as "campaign" | "newsletter") || defaultTemplateType)
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
      setTemplateType(defaultTemplateType)
      setBlocks([])
      setHtmlSource("")
      setMode("visual")
    }
    setSelectedId(null)
    setSavedTemplateId(null)
  }, [open, initialTemplate, defaultTemplateType])

  const addBlock = useCallback((block: EmailBlock) => {
    setBlocks(prev => [...prev, block])
    setSelectedId(block.id)
  }, [])

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
    setBlocks(prev => deleteBlockInTree(prev, id))
    if (selectedId === id) setSelectedId(null)
  }

  function updateBlock(id: string, patch: Partial<EmailBlock>) {
    setBlocks(prev => updateBlockInTree(prev, id, patch))
  }

  function addChildBlock(parentId: string, colIndex: number, type: BlockType) {
    const newBlock = createBlock(type)
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId || !b.columnBlocks) return b
      return { ...b, columnBlocks: b.columnBlocks.map((col, ci) => ci === colIndex ? [...col, newBlock] : col) }
    }))
    setSelectedId(newBlock.id)
    setInsertTarget(null)
  }

  function moveChildInColumn(parentId: string, colIndex: number, childIdx: number, dir: -1 | 1) {
    setBlocks(prev => prev.map(b => {
      if (b.id !== parentId || !b.columnBlocks) return b
      return {
        ...b,
        columnBlocks: b.columnBlocks.map((col, ci) => {
          if (ci !== colIndex) return col
          const arr = [...col]
          const target = childIdx + dir
          if (target < 0 || target >= arr.length) return arr
          ;[arr[childIdx], arr[target]] = [arr[target], arr[childIdx]]
          return arr
        }),
      }
    }))
  }

  function handleSwitchToHtml() {
    const header = isAgentBazar ? AGENTBAZAR_HEADER_HTML : undefined
    const html = blocksToHtml(blocks, header) + `\n<!-- blocks-json:${JSON.stringify(blocks)} -->`
    setHtmlSource(html)
    setMode("html")
  }

  function handleSwitchToVisual() {
    const parsed = parseBlocksFromHtml(htmlSource)
    if (parsed) {
      setBlocks(parsed)
      setSelectedId(null)
      setMode("visual")
    } else if (window.confirm("Switching to Visual will discard manual HTML edits not parseable as blocks. Continue?")) {
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
    const header = isAgentBazar ? AGENTBAZAR_HEADER_HTML : undefined
    const html =
      mode === "html"
        ? htmlSource
        : blocksToHtml(blocks, header) + `\n<!-- blocks-json:${JSON.stringify(blocks)} -->`
    try {
      const payload = {
        client_id: clientId,
        name: name.trim(),
        subject: subject.trim(),
        html_body: html,
        variables: [],
        template_type: templateType,
      }
      const url = initialTemplate?.id ? `/api/email/templates/${initialTemplate.id}` : "/api/email/templates"
      const method = initialTemplate?.id ? "PATCH" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(initialTemplate?.id ? "Template updated" : "Template created")
      setSavedTemplateId(data.id)
      onSaved?.(data.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save error")
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const selectedBlock = selectedId ? findBlockInTree(selectedId, blocks) ?? undefined : undefined

  // HTML mode preview content
  const htmlPreviewContent = htmlSource

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

        {/* Template type */}
        <select
          value={templateType}
          onChange={e => setTemplateType(e.target.value as "campaign" | "newsletter")}
          className="border border-zinc-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#003434]/20 bg-white shrink-0 text-zinc-700"
        >
          <option value="campaign">Campaign</option>
          <option value="newsletter">Newsletter</option>
        </select>

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

        {/* ── Left Panel (systeme.io style) — visual mode only ── */}
        {mode === "visual" && (
          <div className="w-[300px] shrink-0 bg-white border-r border-zinc-200 overflow-hidden flex flex-col">
            <LeftPanel
              selectedBlock={selectedBlock}
              updateBlock={updateBlock}
              addBlock={addBlock}
              onBack={() => setSelectedId(null)}
            />
          </div>
        )}

        {/* ── Canvas ── */}
        {mode === "html" ? (
          /* HTML mode: editor + live preview side by side */
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 border-r border-zinc-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">HTML Source</span>
              </div>
              <textarea
                value={htmlSource}
                onChange={e => setHtmlSource(e.target.value)}
                spellCheck={false}
                className="w-full h-[calc(100vh-120px)] font-mono text-xs border border-zinc-200 rounded-xl p-4 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-[#003434]/20"
                placeholder="<!DOCTYPE html>&#10;<html>…</html>"
              />
            </div>
            {showHtmlPreview && (
              <div className="w-[640px] shrink-0 bg-zinc-100 overflow-y-auto flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200 shrink-0">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Preview</span>
                  <button
                    onClick={() => setShowHtmlPreview(false)}
                    className="text-xs text-zinc-400 hover:text-zinc-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <HtmlPreviewPane html={htmlPreviewContent} />
                </div>
              </div>
            )}
            {!showHtmlPreview && (
              <button
                onClick={() => setShowHtmlPreview(true)}
                className="shrink-0 w-10 bg-white border-l border-zinc-200 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-[#003434] transition-colors text-[10px] font-medium"
                title="Show preview"
              >
                <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                <span style={{ writingMode: "vertical-rl" }}>Preview</span>
              </button>
            )}
          </div>
        ) : (
          /* Visual mode canvas */
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-100">
            {/* AgentBazar fixed header preview (non-editable) */}
            {isAgentBazar && (
              <div className="w-[600px] mx-auto mb-0 select-none pointer-events-none">
                <div className="relative">
                  <div style={{ background: "#001D4A", height: 10 }} />
                  <div style={{ background: "#ffffff", padding: "10px 24px", textAlign: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://blog.agentbazar.in/new-logo.jpg" alt="AgentBazar" style={{ height: 52, display: "inline-block" }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                  </div>
                  <div style={{ background: "#F47920", height: 10 }} />
                  <div className="absolute inset-0 flex items-center justify-end pr-2 pt-1">
                    <span className="text-[9px] font-bold bg-[#F47920] text-white px-1.5 py-0.5 rounded select-none">FIXED HEADER</span>
                  </div>
                </div>
              </div>
            )}

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
                    selectedId={selectedId}
                    onSelect={() => setSelectedId(block.id)}
                    onMoveUp={() => moveBlock(idx, -1)}
                    onMoveDown={() => moveBlock(idx, 1)}
                    onDelete={() => deleteBlock(block.id)}
                    onSelectChild={id => setSelectedId(id)}
                    onInsertContent={(pid, ci) => setInsertTarget({ parentId: pid, colIndex: ci })}
                    onDeleteChild={id => deleteBlock(id)}
                    onMoveChild={moveChildInColumn}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Insert content popup */}
      {insertTarget && (
        <InsertContentPopup
          onInsert={type => addChildBlock(insertTarget.parentId, insertTarget.colIndex, type)}
          onClose={() => setInsertTarget(null)}
        />
      )}

      {/* ── Post-save action bar ── */}
      {savedTemplateId && (
        <div className="shrink-0 border-t border-zinc-200 bg-white px-6 py-4 flex items-center justify-between gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">Template saved!</p>
              <p className="text-xs text-zinc-400">
                {templateType === "newsletter" ? "This template is available in the Newsletter section." : "Create a campaign using this template, or exit."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { onClose() }}
              className="px-4 py-2 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Exit
            </button>
            {templateType === "newsletter" ? (
              <button
                onClick={() => { onClose() }}
                className="px-5 py-2 text-sm font-semibold bg-[#003434] text-white rounded-xl hover:bg-[#004444] transition-colors"
              >
                Done — back to Newsletters →
              </button>
            ) : (
              <button
                onClick={() => {
                  localStorage.setItem("email_draft_template_id", savedTemplateId)
                  onClose()
                  router.push("/email/campaigns")
                }}
                className="px-5 py-2 text-sm font-semibold bg-[#003434] text-white rounded-xl hover:bg-[#004444] transition-colors"
              >
                Create Campaign →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
