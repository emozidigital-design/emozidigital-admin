// Single source of truth for onboarding dropdown / multi-select options.
// Values MUST match the client-facing form at
// c:/northeastforu/emozidigital/app/onboarding/_components/Step*.tsx
// so admin edits round-trip cleanly through the shared JSONB columns.

export type Opt = { value: string; label: string }

// ── Section A ────────────────────────────────────────────────────────────
export const INDUSTRIES = [
  "Retail / E-commerce", "Food & Beverage", "Healthcare / Wellness",
  "Finance / BFSI", "Real Estate", "Education / EdTech",
  "Technology / SaaS", "Professional Services", "Manufacturing",
  "Hospitality & Travel", "Beauty & Personal Care", "Fashion & Lifestyle",
  "Non-Profit / NGO", "Media & Entertainment", "Other",
]
export const BUSINESS_MODELS = [
  "B2B", "B2C", "D2C", "B2B2C", "Marketplace", "Franchise",
  "SaaS", "Agency / Service", "Other",
]
export const BUSINESS_TYPES = [
  "Sole Proprietorship", "Partnership", "LLP", "Private Limited",
  "Public Limited", "Trust / NGO", "Other",
]
export const TEAM_SIZES = ["Solo (1)", "2–5", "6–15", "16–50", "51–200", "200+"]
export const GEOGRAPHIES = [
  "India only", "South Asia", "Southeast Asia", "Middle East",
  "UK & Europe", "North America", "Global",
]
export const TIMEZONES = [
  "IST (UTC+5:30)", "GST (UTC+4)", "CET (UTC+1)", "GMT (UTC+0)",
  "EST (UTC-5)", "PST (UTC-8)", "SGT (UTC+8)", "AEST (UTC+10)",
]

// ── Section B ────────────────────────────────────────────────────────────
export const FOUNDER_ROLES = [
  "Founder / CEO", "Co-Founder", "Director", "Managing Partner",
  "Marketing Head", "Operations Head", "Other",
]
export const COMM_CHANNELS = [
  "WhatsApp", "Email", "Slack", "Microsoft Teams", "Google Chat",
  "Phone Call", "Any",
]
export const BEST_TIMES = [
  "Morning (9 AM – 12 PM)", "Afternoon (12 PM – 4 PM)",
  "Evening (4 PM – 8 PM)", "Flexible",
]
export const LANGUAGES = [
  "English", "Hindi", "Hinglish (Hindi + English)", "Tamil", "Telugu",
  "Kannada", "Marathi", "Bengali", "Other",
]

// ── Section C ────────────────────────────────────────────────────────────
export const TONES = [
  "Professional & Authoritative", "Friendly & Approachable",
  "Bold & Energetic", "Calm & Empathetic", "Playful & Fun",
  "Sophisticated & Premium", "Educational & Informative",
  "Inspirational & Motivational", "Conversational & Casual",
  "Corporate & Formal",
]

// ── Section D ────────────────────────────────────────────────────────────
export const PLATFORMS_OPTS: Opt[] = [
  { value: "instagram",         label: "Instagram" },
  { value: "facebook",          label: "Facebook" },
  { value: "linkedin_company",  label: "LinkedIn Company Page" },
  { value: "linkedin_personal", label: "LinkedIn Personal" },
  { value: "x",                 label: "X (Twitter)" },
  { value: "youtube",           label: "YouTube" },
  { value: "gbp",               label: "Google Business Profile" },
  { value: "whatsapp_business", label: "WhatsApp Business" },
  { value: "pinterest",         label: "Pinterest" },
]
export const CONTENT_FORMATS: Opt[] = [
  { value: "static_posts",  label: "Static Posts" },
  { value: "carousels",     label: "Carousels" },
  { value: "reels",         label: "Reels / Short Video" },
  { value: "stories",       label: "Stories" },
  { value: "long_video",    label: "Long-form Video" },
  { value: "live",          label: "Live / Streaming" },
  { value: "articles",      label: "Articles / Blogs" },
  { value: "infographics",  label: "Infographics" },
  { value: "ugc",           label: "UGC / Reposts" },
  { value: "newsletters",   label: "Newsletters" },
]
export const POST_FREQUENCIES = [
  "Daily (7×/week)", "5× per week", "3–4× per week", "2× per week",
  "1× per week", "2× per month", "Monthly or less", "Varies by platform",
]
export const ACCESS_STATUS_OPTS: Opt[] = [
  { value: "full_login",         label: "Full login — we have the credentials" },
  { value: "admin_business_mgr", label: "Admin via Business Manager" },
  { value: "collaborator",       label: "Collaborator / Editor access" },
  { value: "no_access",          label: "No access yet — will be provided" },
]
export const ACCESS_METHOD_OPTS: Opt[] = [
  { value: "shared_password",  label: "Shared password" },
  { value: "business_manager", label: "Meta Business Manager" },
  { value: "google_workspace", label: "Google Workspace / Gmail" },
  { value: "ads_manager",      label: "Ads Manager only" },
  { value: "brand_account",    label: "YouTube Brand Account" },
  { value: "app_password",     label: "App-specific password" },
  { value: "other",             label: "Other (describe in notes)" },
]
export const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin_company: "LinkedIn Company",
  linkedin_personal: "LinkedIn Personal",
  x: "X (Twitter)",
  youtube: "YouTube",
  gbp: "Google Business Profile",
  whatsapp_business: "WhatsApp Business",
  pinterest: "Pinterest",
}

// ── Section E ────────────────────────────────────────────────────────────
export const WEBSITE_PLATFORMS = [
  "WordPress", "Shopify", "Webflow", "Squarespace", "Wix",
  "Custom / Bespoke", "Framer", "Bubble", "No website yet", "Other",
]
export const ANALYTICS_PLATFORMS = [
  "Google Analytics 4 (GA4)", "Universal Analytics (old)", "Mixpanel",
  "Hotjar", "Clicky", "None", "Other",
]
export const CRM_PLATFORMS = [
  "HubSpot", "Salesforce", "Zoho CRM", "Pipedrive", "Freshsales",
  "ActiveCampaign", "Notion (manual)", "Spreadsheet", "None", "Other",
]
export const EMAIL_PLATFORMS = [
  "Mailchimp", "Klaviyo", "ActiveCampaign", "Brevo (Sendinblue)",
  "ConvertKit", "Constant Contact", "None", "Other",
]
export const SCHEDULERS = [
  "Buffer", "Hootsuite", "Sprout Social", "Later", "Publer",
  "Meta Business Suite", "No scheduler", "Other",
]
export const AD_PLATFORMS_OPTS: Opt[] = [
  { value: "google_ads",   label: "Google Ads" },
  { value: "meta_ads",     label: "Meta Ads (FB/IG)" },
  { value: "linkedin_ads", label: "LinkedIn Ads" },
  { value: "youtube_ads",  label: "YouTube Ads" },
  { value: "twitter_ads",  label: "X / Twitter Ads" },
  { value: "tiktok_ads",   label: "TikTok Ads" },
  { value: "amazon_ads",   label: "Amazon Ads" },
  { value: "none",         label: "Not running ads" },
]
export const ACCESS_OPTIONS = [
  "Full admin access", "View-only access",
  "Need to create account", "Other arrangement",
]
export const TAG_MANAGER_OPTS: Opt[] = [
  { value: "yes",    label: "Yes, GTM is set up" },
  { value: "no",     label: "No" },
  { value: "unsure", label: "Not sure" },
]

// ── Section F ────────────────────────────────────────────────────────────
export const PRIMARY_GOALS = [
  "Brand Awareness", "Lead Generation", "Sales / Revenue Growth",
  "Customer Retention", "Product Launch", "Market Expansion",
  "Thought Leadership", "Hiring / Employer Brand", "Community Building",
  "Other",
]
export const SECONDARY_GOAL_OPTS: Opt[] = [
  { value: "awareness",    label: "Brand Awareness" },
  { value: "leads",        label: "Lead Generation" },
  { value: "sales",        label: "Sales Growth" },
  { value: "retention",    label: "Customer Retention" },
  { value: "seo",          label: "SEO / Organic Traffic" },
  { value: "partnerships", label: "Partnerships" },
  { value: "launch",       label: "Product / Service Launch" },
  { value: "trust",        label: "Trust Building" },
]
export const TIMEFRAMES = [
  "Next 3 months", "Next 6 months", "This financial year",
  "Next 12 months", "Ongoing / No fixed deadline",
]
export const KPI_OPTS: Opt[] = [
  { value: "followers",        label: "Follower Growth" },
  { value: "reach",            label: "Reach / Impressions" },
  { value: "engagement",       label: "Engagement Rate" },
  { value: "website_traffic",  label: "Website Traffic" },
  { value: "leads",            label: "Leads Generated" },
  { value: "conversions",      label: "Conversions / Sales" },
  { value: "roas",             label: "ROAS (Paid Ads)" },
  { value: "cac",              label: "Customer Acquisition Cost" },
  { value: "reviews",          label: "Reviews / Rating" },
  { value: "seo_rank",         label: "SEO Rankings" },
]
export const BUDGET_OPTIONS = [
  "Under ₹20,000/mo", "₹20,000 – ₹50,000/mo", "₹50,000 – ₹1 lakh/mo",
  "₹1 – ₹2.5 lakh/mo", "₹2.5 – ₹5 lakh/mo", "₹5 lakh+/mo",
  "Not sure yet", "Prefer not to say",
]
export const GROWTH_STAGES = [
  "Pre-launch / Startup", "Early stage (< 1 year)",
  "Growth stage (1–3 years)", "Established (3–7 years)",
  "Mature / Scale-up", "Enterprise",
]
export const COMMON_PAIN_POINTS_OPTS: Opt[] = [
  { value: "inconsistent_flow", label: "Inconsistent Lead Flow" },
  { value: "poor_followup",     label: "Poor Lead Follow-up System" },
  { value: "owner_dependence",  label: "Overdependence on Owner" },
  { value: "lack_marketing",    label: "Lack of Structured Marketing" },
  { value: "repetitive_tasks",  label: "Time Lost in Repetitive Tasks" },
  { value: "weak_conversion",   label: "Weak Conversion Systems" },
  { value: "no_analytics",      label: "No Data Tracking or Analytics" },
  { value: "skill_gaps",        label: "Hiring and Skill Gaps" },
  { value: "cash_instability",  label: "Cash Flow Instability" },
  { value: "tool_overload",     label: "Tool Overload Without Integration" },
]
export const SECTOR_PAIN_POINTS_OPTS: Opt[] = [
  { value: "travel_aggregators",    label: "Travel Agencies — Dependency on Aggregators" },
  { value: "retail_digital",        label: "Retail Shopkeepers — Limited Digital Presence" },
  { value: "ecommerce_cac",         label: "E-commerce — High Customer Acquisition Cost" },
  { value: "freelance_pipeline",    label: "Freelancers — Irregular Client Pipeline" },
  { value: "agency_retention",      label: "Digital Marketing Agencies — Client Retention" },
  { value: "consultancy_cycle",     label: "Consultancies — Long Sales Cycles" },
  { value: "showroom_conversion",   label: "Showrooms — Low Footfall Conversion" },
  { value: "online_dependency",     label: "Online Sellers — Platform Dependency Risk" },
  { value: "process_chaos",         label: "Small Offices — Process Chaos" },
  { value: "reputation_management", label: "Local Businesses — Poor Reputation Management" },
]

// ── Section G ────────────────────────────────────────────────────────────
export const AGE_OPTS: Opt[] = [
  { value: "13-17", label: "13–17" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55-64", label: "55–64" },
  { value: "65+",   label: "65+" },
]
export const GENDERS = [
  "Primarily male", "Primarily female", "Balanced (all genders)",
  "Other / Non-binary focus", "Not gender-specific",
]
export const INCOME_LEVELS = [
  "Lower income (< ₹3L/year)", "Lower-middle (₹3L–₹8L/year)",
  "Middle income (₹8L–₹20L/year)", "Upper-middle (₹20L–₹50L/year)",
  "High income (₹50L+/year)", "HNI / Ultra-HNI", "Not income-sensitive",
]
export const EDUCATION_LEVELS = [
  "High school", "College / University", "Post-graduate",
  "Professionals", "No specific requirement",
]

// ── Section H ────────────────────────────────────────────────────────────
export const MARKET_POSITIONS = [
  "Market leader", "Strong challenger", "Niche specialist",
  "Emerging player", "Budget / value option", "Premium / luxury option",
  "Disruptor",
]

// ── Section I ────────────────────────────────────────────────────────────
export const REGULATION_OPTS: Opt[] = [
  { value: "gdpr",   label: "GDPR (EU)" },
  { value: "hipaa",  label: "HIPAA (Healthcare US)" },
  { value: "fssai",  label: "FSSAI (Food India)" },
  { value: "sebi",   label: "SEBI (Finance India)" },
  { value: "irdai",  label: "IRDAI (Insurance India)" },
  { value: "rbi",    label: "RBI Guidelines" },
  { value: "bar",    label: "Bar Council (Legal)" },
  { value: "mci",    label: "Medical Council (Healthcare)" },
  { value: "asci",   label: "ASCI (Advertising)" },
  { value: "it_act", label: "IT Act / PDPB (India)" },
  { value: "pharma", label: "Drugs & Magic Remedies Act" },
  { value: "other",  label: "Other regulation" },
]
export const REGULATED_OPTS: Opt[] = [
  { value: "yes",    label: "Yes — regulated industry" },
  { value: "no",     label: "No — no specific regulations" },
  { value: "unsure", label: "Not sure" },
]
export const TRADEMARK_OPTS: Opt[] = [
  { value: "yes",     label: "Yes" },
  { value: "no",      label: "No" },
  { value: "applied", label: "Applied / Pending" },
]
export const DISCLAIMER_OPTS: Opt[] = [
  { value: "yes",       label: "Yes — required" },
  { value: "no",        label: "No" },
  { value: "sometimes", label: "Sometimes (certain content types)" },
]

// ── Section J ────────────────────────────────────────────────────────────
export const CALENDAR_LEADS = [
  "Emozi Digital leads entirely", "Client leads with our support",
  "Collaborative — 50/50", "Client plans, we execute", "Other",
]
export const APPROVAL_TIMEFRAMES = [
  "Same day (within 8 hours)", "24 hours", "48 hours", "72 hours",
  "Weekly batch approval", "No formal approval needed",
]
export const POST_TONES = [
  "Match brand voice exactly", "Slightly more formal than brand",
  "Slightly more casual than brand", "Very formal / corporate",
  "Very casual / conversational", "Platform-specific variation",
]
export const MEDIA_OPTIONS = [
  "Emozi Digital creates all media", "Client provides all media",
  "Collaborative — we create, client adds", "Client provides raw, we edit",
  "Mix of provided and created",
]
export const REVISION_OPTIONS = ["1 round", "2 rounds", "3 rounds", "Unlimited within reason"]
export const APPROVAL_REQ_OPTS: Opt[] = [
  { value: "yes_all",   label: "Yes — all content" },
  { value: "yes_major", label: "Yes — major content only" },
  { value: "no",        label: "No — publish directly" },
]
export const STOCK_OPTS: Opt[] = [
  { value: "yes_all",     label: "Yes — any stock" },
  { value: "yes_branded", label: "Yes — only styled to brand" },
  { value: "no",          label: "No — original only" },
  { value: "discuss",     label: "Discuss case by case" },
]

// ── Section K ────────────────────────────────────────────────────────────
export const REPORT_FREQS = [
  "Weekly", "Bi-weekly (every 2 weeks)", "Monthly", "Quarterly",
  "On request only",
]
export const REPORT_FORMATS = [
  "PDF report", "Google Slides", "Notion dashboard", "Email summary",
  "Looker Studio / Data Studio", "Excel / Google Sheets",
  "Video walkthrough",
]
export const MEETING_FREQS = [
  "Weekly", "Bi-weekly", "Monthly", "Quarterly", "As-needed / Ad hoc",
]
export const MEETING_FORMATS = [
  "Google Meet", "Zoom", "Microsoft Teams", "WhatsApp call",
  "In-person", "Any",
]
export const METRICS_OPTS: Opt[] = [
  { value: "reach",        label: "Reach & Impressions" },
  { value: "engagement",   label: "Engagement Rate" },
  { value: "followers",    label: "Follower Growth" },
  { value: "website",      label: "Website Traffic" },
  { value: "leads",        label: "Leads / Enquiries" },
  { value: "conversions",  label: "Conversions / Sales" },
  { value: "roas",         label: "ROAS (Paid)" },
  { value: "cpa",          label: "Cost per Acquisition" },
  { value: "video_views",  label: "Video Views" },
  { value: "saves_shares", label: "Saves & Shares" },
  { value: "seo",          label: "SEO Rankings" },
  { value: "reviews",      label: "Reviews & Ratings" },
]
export const DASHBOARD_OPTS: Opt[] = [
  { value: "yes",   label: "Yes — set up a live dashboard for us" },
  { value: "no",    label: "No — reports only" },
  { value: "later", label: "Not now, but interested later" },
]
