"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"
import FareTagModal from "./FareTagModal"

interface SectorGroup {
  name: string
  sectorlist: string
}

const SECTOR_GROUPS: SectorGroup[] = [
  { name: "NORTH EAST",  sectorlist: "GAU-CCU,CCU-GAU,GAU-DEL,DEL-GAU,GAU-MAA,MAA-GAU,BLR-GAU,GAU-BLR,GAU-JAI,JAI-GAU" },
  { name: "WEST BENGAL", sectorlist: "GAU-CCU,CCU-GAU,CCU-MAA,CCU-IXZ,IXZ-CCU,CCU-BLR,BLR-CCU,CCU-BOM,BOM-CCU,MAA-CCU,CCU-DEL,DEL-CCU" },
  { name: "DELHI",       sectorlist: "DEL-BOM,DEL-STV,GOX-DEL,DEL-BLR,BLR-DEL,BOM-DEL,GAU-DEL,DEL-GAU,DEL-NMI,NMI-DEL,STV-DEL,DEL-IXR,DEL-VNS,DEL-SXR,SXR-DEL,IXR-DEL,PAT-DEL,PNQ-DEL,VNS-DEL,DEL-PAT,DEL-PNQ,DEL-GOX" },
  { name: "MUMBAI / GOA",sectorlist: "DEL-BOM,GOX-BOM,BOM-DEL,GOI-BOM,BOM-GOI,IXR-BOM,BOM-LKO,BOM-IXR,LKO-BOM,JAI-BOM,BOM-GOX,BOM-JAI,VNS-BOM,DEL-NMI,NMI-DEL,VNS-NMI,NMI-BLR,BLR-NMI" },
  { name: "BENGALORE",   sectorlist: "BLR-AMD,LKO-BLR,BLR-IXR,PAT-BLR,HYD-BLR,BLR-LKO,DEL-BLR,BLR-DED,BBI-BLR,IXR-BLR,IXZ-BLR,BLR-PAT,PNQ-BLR,AMD-BLR,BLR-PNQ,BLR-JAI,BLR-DEL,BLR-IXZ,JAI-BLR,BLR-BBI,VNS-BLR,BLR-GAU,GAU-BLR,BLR-VNS,BLR-STV,STV-BLR,NMI-BLR,BLR-NMI" },
  { name: "GUJRAT",      sectorlist: "BOM-AMD,AMD-BOM,AMD-BLR,BLR-AMD,DEL-STV,BLR-STV,STV-BLR,STV-DEL" },
  { name: "RANCHI",      sectorlist: "BLR-IXR,IXR-BLR,IXR-BOM,BOM-IXR,DEL-IXR,IXR-DEL,HYD-IXR" },
  { name: "CHENNAI",     sectorlist: "GAU-MAA,MAA-GAU,CCU-MAA,MAA-IXZ,IXZ-MAA,MAA-CCU" },
  { name: "PATNA",       sectorlist: "PAT-BLR,BLR-PAT,PAT-DEL,DEL-PAT" },
  { name: "PORT BLAIR",  sectorlist: "IXZ-BLR,BLR-IXZ,CCU-IXZ,IXZ-CCU,MAA-IXZ,IXZ-MAA" },
  { name: "HYDERABAD",   sectorlist: "BLR-HYD,HYD-BLR,HYD-IXB,HYD-IXR,IXB-HYD" },
  { name: "LUCKNOW",     sectorlist: "LKO-BLR,BLR-LKO,BOM-LKO,LKO-BOM" },
  { name: "BAGDOGRA",    sectorlist: "HYD-IXB,IXB-HYD" },
]

interface Tag { id: string; name: string }

interface FareGeneratorProps {
  clientId: string
  onGenerated: (
    html: string,
    templateName: string,
    subject: string,
    tagIds: string[],
    tagNames: string[]
  ) => void
}

const INPUT_CLS =
  "w-full bg-white border border-zinc-200 text-zinc-800 placeholder-zinc-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 focus:border-[#003434]/40 transition-colors"

const SELECT_CLS =
  "w-full bg-white border border-zinc-200 text-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003434]/20 focus:border-[#003434]/40 transition-colors appearance-none cursor-pointer"

const LABEL_CLS = "block text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wide"

export default function FareGenerator({ clientId, onGenerated }: FareGeneratorProps) {
  const [selectedGroup, setSelectedGroup] = useState<SectorGroup | null>(null)
  const [sectorlist, setSectorlist]       = useState("")
  const [fromDate, setFromDate]           = useState("")
  const [toDate, setToDate]               = useState("")
  const [priceLogic, setPriceLogic]       = useState<"live" | "cache">("live")
  const [markup, setMarkup]               = useState("100")

  // Multi-select tags
  const [allTags, setAllTags]           = useState<Tag[]>([])
  const [tagsLoaded, setTagsLoaded]     = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagDropOpen, setTagDropOpen]   = useState(false)
  const tagDropRef                      = useRef<HTMLDivElement>(null)
  const tagButtonRef                    = useRef<HTMLButtonElement>(null)

  const [generating, setGenerating] = useState(false)

  // Load tags for client
  useEffect(() => {
    if (!clientId) return
    setTagsLoaded(false)
    fetch(`/api/email/tags?client_id=${clientId}`)
      .then(r => r.json())
      .then((data: Tag[]) => {
        const sorted = Array.isArray(data)
          ? [...data].sort((a, b) => a.name.localeCompare(b.name))
          : []
        setAllTags(sorted)
        setTagsLoaded(true)
      })
      .catch(() => setTagsLoaded(true))
  }, [clientId])

  // Close tag dropdown on outside click
  useEffect(() => {
    if (!tagDropOpen) return
    const handler = (e: MouseEvent) => {
      if (
        tagDropRef.current && !tagDropRef.current.contains(e.target as Node) &&
        tagButtonRef.current && !tagButtonRef.current.contains(e.target as Node)
      ) {
        setTagDropOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [tagDropOpen])

  function handleGroupChange(groupName: string) {
    const g = SECTOR_GROUPS.find(g => g.name === groupName) ?? null
    setSelectedGroup(g)
    setSectorlist(g?.sectorlist ?? "")
    setMarkup("100")
  }

  function toggleTag(id: string) {
    setSelectedTagIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  function selectAll() { setSelectedTagIds(allTags.map(t => t.id)) }
  function clearAll()  { setSelectedTagIds([]) }

  const selectedTags  = allTags.filter(t => selectedTagIds.includes(t.id))
  const tagButtonLabel = selectedTagIds.length === 0
    ? "Select Tag"
    : selectedTagIds.length === 1
    ? selectedTags[0]?.name
    : `${selectedTagIds.length} tags`

  function buildSubject() {
    return `Daily Fare of ${selectedGroup?.name ?? ""} from ${fromDate} to ${toDate} for {{agent_name}}`
  }

  function buildTemplateName() {
    return `Daily Fare ${selectedGroup?.name ?? ""} ${fromDate} - ${toDate}`
  }

  async function handleGenerate() {
    if (!sectorlist.trim())        { toast.error("Enter at least one sector"); return }
    if (!fromDate)                 { toast.error("Select a From Date"); return }
    if (!toDate)                   { toast.error("Select a To Date"); return }
    if (fromDate > toDate)         { toast.error("From Date must be before To Date"); return }
    if (selectedTagIds.length === 0) { toast.error("Select at least one tag"); return }

    setGenerating(true)
    try {
      const res = await fetch("/api/email/fares/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromdate:   fromDate,
          todate:     toDate,
          sectorlist: sectorlist.trim(),
          pricelogic: priceLogic,
          markup,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate template")
      onGenerated(
        data.html,
        buildTemplateName(),
        buildSubject(),
        selectedTagIds,
        selectedTags.map(t => t.name)
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate template")
    } finally {
      setGenerating(false)
    }
  }

  function handleTagCreated(tag: Tag) {
    setAllTags(prev => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedTagIds(prev => [...prev, tag.id])
  }

  const canGenerate = !!sectorlist.trim() && !!fromDate && !!toDate && selectedTagIds.length > 0 && !generating

  return (
    <>
      <div className="bg-[#0d1f1f] border border-white/10 rounded-2xl p-5 mb-6">

        {/* Title */}
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-sm font-semibold text-white">Series Fare Calender Template</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-[#70BF4B]/15 text-[#70BF4B] border-[#70BF4B]/30 uppercase tracking-wide">
            AgentBazar
          </span>
        </div>

        {/* ── Sector List row ── */}
        <div className="mb-4">
          <label className={LABEL_CLS}>Sector List</label>
          <div className="flex gap-2">
            {/* Editable sector input with inline Tag button */}
            <div className="relative flex-1">
              <input
                type="text"
                className={`${INPUT_CLS} pr-32`}
                value={sectorlist}
                onChange={e => setSectorlist(e.target.value)}
                placeholder="Example: GAU-MAA,MAA-GAU,CCU-MAA,…"
              />
              <button
                ref={tagButtonRef}
                type="button"
                onClick={() => setTagDropOpen(o => !o)}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                  selectedTagIds.length > 0
                    ? "bg-[#003434] text-white border-[#003434]"
                    : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 border-zinc-200"
                }`}
              >
                {selectedTagIds.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#70BF4B] text-[#003434] text-[9px] font-black flex items-center justify-center shrink-0">
                    {selectedTagIds.length}
                  </span>
                )}
                {tagButtonLabel}
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Preset group picker */}
            <div className="relative shrink-0 w-44">
              <select
                className={SELECT_CLS}
                value={selectedGroup?.name ?? ""}
                onChange={e => handleGroupChange(e.target.value)}
              >
                <option value="">Preset group…</option>
                {SECTOR_GROUPS.map(g => (
                  <option key={g.name} value={g.name}>{g.name}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </div>

          {/* ── Tag multi-select dropdown ── */}
          {tagDropOpen && (
            <div
              ref={tagDropRef}
              className="mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* Header with select/clear all */}
              <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Select Tags</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    className="text-[11px] text-[#003434] font-semibold hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-zinc-200">|</span>
                  <button
                    onClick={clearAll}
                    className="text-[11px] text-zinc-400 font-semibold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tag list — horizontal wrap, all visible */}
              <div className="px-4 py-3">
                {!tagsLoaded ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
                    <span className="text-xs text-zinc-400">Loading tags…</span>
                  </div>
                ) : allTags.length === 0 ? (
                  <p className="text-xs text-zinc-400">No tags yet — create one below</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => {
                      const checked = selectedTagIds.includes(tag.id)
                      return (
                        <label
                          key={tag.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer select-none transition-colors text-xs font-medium ${
                            checked
                              ? "bg-[#003434] border-[#003434] text-white"
                              : "bg-white border-zinc-200 text-zinc-600 hover:border-[#003434]/40 hover:text-[#003434]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleTag(tag.id)}
                          />
                          {checked && (
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {tag.name}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-100 px-4 py-2.5 flex items-center justify-between">
                <button
                  onClick={() => { setTagDropOpen(false); setTagModalOpen(true) }}
                  className="text-xs text-[#003434] hover:text-[#004444] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create new tag
                </button>
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={() => setTagDropOpen(false)}
                    className="text-xs font-semibold bg-[#003434] text-white px-3 py-1 rounded-lg hover:bg-[#004444] transition-colors"
                  >
                    Done ({selectedTagIds.length})
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Selected tags chips */}
          {selectedTagIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#70BF4B]/20 text-[#70BF4B] border border-[#70BF4B]/40 font-medium"
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTag(tag.id)}
                    className="hover:text-white transition-colors leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Row 2: Dates / Price Logic / Markup / Generate ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 items-end">

          <div>
            <label className={LABEL_CLS}>From Date</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className={LABEL_CLS}>To Date</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className={LABEL_CLS}>Price Logic</label>
            <select
              className={SELECT_CLS}
              value={priceLogic}
              onChange={e => setPriceLogic(e.target.value as "live" | "cache")}
            >
              <option value="live">Live</option>
              <option value="cache">Cache</option>
            </select>
            <span className="pointer-events-none absolute right-3 bottom-2.5 text-zinc-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          <div>
            <label className={LABEL_CLS}>Mark up</label>
            <input
              type="number"
              min="0"
              className={INPUT_CLS}
              value={markup}
              onChange={e => setMarkup(e.target.value)}
              placeholder="100"
            />
          </div>

          <div className="flex items-end flex-col gap-1">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              title={
                !sectorlist.trim() ? "Enter sectors" :
                selectedTagIds.length === 0 ? "Select at least one tag" :
                "Generate fare email template"
              }
              className="w-full bg-[#1a56db] hover:bg-[#1e4fc0] disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {generating && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {generating ? "Fetching fares…" : "Generate"}
            </button>
            {generating && (
              <p className="text-[10px] text-white/40 text-center w-full">
                Live fares may take up to 60s
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Tag creation modal */}
      <FareTagModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        tagName={selectedGroup?.name ?? ""}
        clientId={clientId}
        onTagCreated={handleTagCreated}
      />
    </>
  )
}
