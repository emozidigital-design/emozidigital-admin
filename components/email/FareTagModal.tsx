"use client"

import { useState, useEffect, useRef } from "react"
import toast from "react-hot-toast"

interface FareTagModalProps {
  open: boolean
  onClose: () => void
  tagName: string
  clientId: string
  onTagCreated: (tag: { id: string; name: string }) => void
}

type ModalStep = "confirm" | "upload"

interface ImportResult {
  imported: number
  invalid: number
  skipped: number
}

export default function FareTagModal({
  open,
  onClose,
  tagName,
  clientId,
  onTagCreated,
}: FareTagModalProps) {
  const [step, setStep] = useState<ModalStep>("confirm")
  const [creating, setCreating] = useState(false)
  const [createdTag, setCreatedTag] = useState<{ id: string; name: string } | null>(null)

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset when tagName changes (different sector group)
  useEffect(() => {
    setStep("confirm")
    setCreatedTag(null)
    setCsvFile(null)
    setImportResult(null)
    setImportError(null)
  }, [tagName])

  if (!open) return null

  async function handleCreateTag() {
    setCreating(true)
    try {
      const res = await fetch("/api/email/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, name: tagName }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          // Race condition — tag already exists, find it
          const tagsRes = await fetch(`/api/email/tags?client_id=${clientId}`)
          const tags = await tagsRes.json()
          const found = Array.isArray(tags)
            ? tags.find((t: { name: string; id: string }) =>
                t.name.toLowerCase() === tagName.toLowerCase()
              )
            : null
          if (found) {
            setCreatedTag(found)
            onTagCreated(found)
            setStep("upload")
            return
          }
        }
        throw new Error(data.error ?? "Failed to create tag")
      }

      setCreatedTag(data)
      onTagCreated(data)
      setStep("upload")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create tag")
    } finally {
      setCreating(false)
    }
  }

  function handleFileSelect(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are accepted")
      return
    }
    setCsvFile(file)
    setImportResult(null)
    setImportError(null)
  }

  async function handleImport() {
    if (!csvFile || !createdTag) return
    setImporting(true)
    setImportError(null)
    try {
      const fd = new FormData()
      fd.append("client_id", clientId)
      fd.append("file", csvFile)
      fd.append("tag_id", createdTag.id)

      const res = await fetch("/api/email/contacts/import", {
        method: "POST",
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      setImportResult({
        imported: data.imported ?? 0,
        invalid: data.invalid ?? 0,
        skipped: data.skipped ?? 0,
      })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-[#003434] px-6 py-4 flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">
            {step === "confirm" ? `Tag Required: ${tagName}` : `Import Contacts — ${tagName}`}
          </h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {step === "confirm" && (
            <>
              <p className="text-sm text-zinc-600 mb-1">
                No tag named <span className="font-semibold text-zinc-800">&ldquo;{tagName}&rdquo;</span> exists for this client.
              </p>
              <p className="text-sm text-zinc-500 mb-6">
                Creating a tag lets you target this sector group in campaigns. You can optionally import contacts via CSV after creating it.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-[#003434] text-white rounded-lg hover:bg-[#004444] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {creating && (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Create Tag
                </button>
              </div>
            </>
          )}

          {step === "upload" && (
            <>
              {/* Success badge */}
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#70BF4B]/10 border border-[#70BF4B]/30 rounded-lg">
                <svg className="w-4 h-4 text-[#70BF4B] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-medium text-[#003434]">Tag &ldquo;{tagName}&rdquo; created successfully</p>
              </div>

              <p className="text-sm text-zinc-500 mb-4">
                Optionally import contacts from a CSV file. They&apos;ll be assigned to this tag. Existing contacts won&apos;t be duplicated.
              </p>

              {/* Drop zone */}
              {!importResult && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) handleFileSelect(file)
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
                      dragOver
                        ? "border-[#003434] bg-[#003434]/5"
                        : csvFile
                        ? "border-[#70BF4B] bg-[#70BF4B]/5"
                        : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileSelect(file)
                      }}
                    />
                    <svg
                      className={`w-8 h-8 mx-auto mb-2 ${csvFile ? "text-[#70BF4B]" : "text-zinc-300"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {csvFile ? (
                      <p className="text-sm font-medium text-[#003434]">{csvFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-zinc-600">Drop or Upload CSV to Import</p>
                        <p className="text-xs text-zinc-400 mt-1">Must have an &quot;email&quot; column</p>
                      </>
                    )}
                  </div>

                  {importError && (
                    <p className="text-xs text-red-600 mb-3 px-1">{importError}</p>
                  )}

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      Skip import
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!csvFile || importing}
                      className="px-4 py-2 text-sm bg-[#003434] text-white rounded-lg hover:bg-[#004444] disabled:opacity-40 transition-colors flex items-center gap-2"
                    >
                      {importing && (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      Import Contacts
                    </button>
                  </div>
                </>
              )}

              {/* Import result */}
              {importResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <p className="text-xl font-bold text-emerald-600">{importResult.imported}</p>
                      <p className="text-xs text-emerald-700 font-medium">Imported</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xl font-bold text-amber-600">{importResult.skipped}</p>
                      <p className="text-xs text-amber-700 font-medium">Skipped</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <p className="text-xl font-bold text-red-500">{importResult.invalid}</p>
                      <p className="text-xs text-red-600 font-medium">Invalid</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm bg-[#003434] text-white rounded-lg hover:bg-[#004444] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
