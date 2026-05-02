/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { useClientUpdate } from "@/lib/useClientUpdate"
import { EField, ESelect, ETextarea } from "./EditFields"
import { ACCESS_STATUS_OPTS, ACCESS_METHOD_OPTS, PLATFORM_LABELS } from "./onboarding-options"

const YES_NO_OPTS = [
  { value: "yes", label: "Yes" },
  { value: "no",  label: "No" },
]
const EXISTS_OPTS = [
  { value: "yes", label: "Yes — account exists" },
  { value: "no",  label: "No — needs to be created" },
]

// Platforms that have ad accounts
const HAS_AD_ACCOUNT = new Set([
  "instagram", "facebook", "linkedin_company", "x", "youtube", "pinterest",
])
const HAS_PUBLIC_ADDRESS = new Set(["gbp"])

export default function PlatformModuleCard({
  clientId,
  platformKey,
  platformData,
}: {
  clientId: string
  platformKey: string
  platformData: Record<string, any>
}) {
  const [open, setOpen] = useState(false)
  const { update } = useClientUpdate(clientId)
  const data = platformData ?? {}
  const exists = data.exists as "yes" | "no" | undefined
  const label = PLATFORM_LABELS[platformKey] ?? platformKey

  function saveField(key: string, value: unknown) {
    const next = { ...data, [key]: value }
    update("section_d", { [platformKey]: next })
  }

  const sub = (key: string) => ({
    clientId,
    section: undefined,
    field: key,
    value: data[key] ?? "",
    onCustomSave: (v: string) => saveField(key, v),
  })

  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors text-left"
      >
        <span className="font-semibold text-zinc-900 text-sm">{label}</span>
        {exists === "yes" && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">
            Active account
          </span>
        )}
        {exists === "no" && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-full">
            New account
          </span>
        )}
        <svg
          className={`ml-auto w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-100 space-y-1 bg-zinc-50/30">
          <ESelect
            {...sub("exists")}
            label="Account Exists?"
            options={EXISTS_OPTS}
          />

          {exists === "yes" && (
            <>
              <EField {...sub("url")} label="Profile URL" inputType="url" />
              <EField {...sub("handle")} label="Handle" />
              <EField {...sub("followers")} label="Followers / Subscribers" />
              <ESelect {...sub("access_status")} label="Access Status" options={ACCESS_STATUS_OPTS} />
              <ESelect {...sub("access_method")} label="Access Method" options={ACCESS_METHOD_OPTS} />
              <ESelect {...sub("login_email_known")} label="Login Email Known?" options={YES_NO_OPTS} />
              {HAS_AD_ACCOUNT.has(platformKey) && (
                <EField {...sub("ad_account_id")} label="Ad Account ID" />
              )}
              {HAS_PUBLIC_ADDRESS.has(platformKey) && (
                <EField {...sub("public_address")} label="Public Business Address" />
              )}
              <ETextarea {...sub("bio")} label="Bio / Description" />
            </>
          )}

          {exists === "no" && (
            <>
              <EField {...sub("username_pref_1")} label="Username Pref 1" />
              <EField {...sub("username_pref_2")} label="Username Pref 2" />
              <EField {...sub("username_pref_3")} label="Username Pref 3" />
              <EField {...sub("reg_email")} label="Registration Email" inputType="email" />
              <EField {...sub("reg_phone")} label="Registration Phone" />
              <EField {...sub("biz_category")} label="Business Category" />
              {HAS_PUBLIC_ADDRESS.has(platformKey) && (
                <EField {...sub("public_address")} label="Public Business Address" />
              )}
              <ESelect {...sub("bio_draft_needed")} label="Should we draft the bio?" options={YES_NO_OPTS} />
            </>
          )}

          {exists && (
            <ETextarea {...sub("extras")} label="Extra Notes" />
          )}
        </div>
      )}
    </div>
  )
}
