"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { 
  CreditCard, 
  Plus, 
  Search, 
  ExternalLink, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { toast } from "react-hot-toast";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Client {
  id: string;
  legal_name: string;
  email: string;
  section_m: any;
}

interface PaymentLog {
  id: string;
  created_at: string;
  scenario: string;
  status: string;
  payload: {
    client_id: string;
    amount: number;
    link_id: string;
    short_url: string;
  };
}

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clientsData, isLoading: clientsLoading } = useSWR("/api/clients", fetcher);
  // We'll fetch logs where scenario = 'payment_link_created' or 'razorpay_payment_captured'
  const { data: logsData, mutate: mutateLogs } = useSWR("/api/automations/logs", fetcher);

  const clients = (clientsData?.clients || []) as Client[];
  const paymentLogs = (logsData?.logs || []).filter(
    (log: any) => log.scenario === "payment_link_created" || log.scenario === "razorpay_payment_captured"
  ) as PaymentLog[];

  const filteredLogs = paymentLogs.filter((log) => {
    const client = clients.find((c) => c.id === log.payload.client_id);
    const searchStr = `${client?.legal_name || ""} ${log.payload.link_id || ""}`.toLowerCase();
    return searchStr.includes(searchQuery.toLowerCase());
  });

  const totalRevenue = clients.reduce((sum, c) => {
    const val = c.section_m?.monthly_value;
    return sum + (val ? Number(val) : 0);
  }, 0);

  const pendingPayments = clients.filter(c => 
    c.section_m?.payment_status === 'Pending' || c.section_m?.payment_status === 'Overdue'
  ).length;

  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId || !amount) {
      toast.error("Please select a client and enter an amount");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/create-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          amount: Number(amount),
          description,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        toast.success("Payment link generated!");
        setIsModalOpen(false);
        setAmount("");
        setDescription("");
        setSelectedClientId("");
        mutateLogs();
        
        // Open the link in a new tab
        window.open(result.short_url, "_blank");
      } else {
        toast.error(result.error || "Failed to generate link");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Payments</h1>
          <p className="text-zinc-500 mt-1">Generate payment links and track revenue collection.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#003434] hover:bg-[#004d4d] text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Create Payment Link
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-16 h-16 text-[#003434]" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-zinc-600" />
            </div>
            <span className="text-zinc-500 text-sm font-medium">Monthly Recurring Revenue</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">₹{totalRevenue.toLocaleString("en-IN")}</div>
          <p className="text-emerald-600 text-xs mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Projected for this month
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-16 h-16 text-amber-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-zinc-500 text-sm font-medium">Pending Collections</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{pendingPayments}</div>
          <p className="text-amber-600 text-xs mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Requires follow-up
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-3xl relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-16 h-16 text-sky-500" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-zinc-500 text-sm font-medium">Active Clients</span>
          </div>
          <div className="text-3xl font-bold text-zinc-900">{clients.length}</div>
          <p className="text-sky-600 text-xs mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Onboarded & Active
          </p>
        </div>
      </div>

      {/* ── LOGS TABLE ── */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-zinc-900 font-bold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-zinc-600" />
            Recent Payment Activity
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search links or clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-zinc-200 text-zinc-900 text-sm rounded-xl pl-10 pr-4 py-2 outline-none focus:border-[#70BF4B] transition-all w-full md:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Client</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const client = clients.find((c) => c.id === log.payload.client_id);
                  const isCaptured = log.scenario === "razorpay_payment_captured";
                  
                  return (
                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900">{client?.legal_name || "Unknown"}</div>
                        <div className="text-xs text-zinc-500">{client?.email}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-emerald-600">
                        ₹{Number(log.payload.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCaptured ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
                        }`}>
                          {isCaptured ? "CAPTURED" : "LINK CREATED"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isCaptured ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                          <span className="text-xs text-zinc-500">{isCaptured ? "Paid" : "Pending"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isCaptured && log.payload.short_url && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => copyToClipboard(log.payload.short_url)}
                              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                              title="Copy Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <a
                              href={log.payload.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                              title="View Link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-sm">
                    No payment logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white border border-zinc-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50">
              <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-zinc-600" />
                Create Payment Link
              </h3>
            </div>

            <form onSubmit={handleCreateLink} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Select Client</label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 outline-none focus:border-[#70BF4B] transition-all appearance-none cursor-pointer"
                >
                  <option value="">Choose a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.legal_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Amount (INR)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</div>
                  <input
                    required
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-[#70BF4B] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Description (Optional)</label>
                <textarea
                  placeholder="e.g. Monthly Retainer for May 2026"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 outline-none focus:border-[#70BF4B] transition-all resize-none h-24"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 text-zinc-500 font-bold hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#003434] hover:bg-[#004d4d] text-white px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Generate Link
                      <ExternalLink className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
