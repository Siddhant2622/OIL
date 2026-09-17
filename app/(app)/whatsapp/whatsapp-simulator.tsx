"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  Paperclip,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  Bell,
  CheckCheck,
  ArrowRight,
  RefreshCw,
  Camera,
  Flame,
  Zap,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
  mediaUrl?: string;
  reportCode?: string;
  riskBand?: string;
  isSif?: boolean;
}

interface ManagerAlert {
  id: string;
  time: string;
  reportCode: string;
  riskBand: string;
  hazard: string;
  site: string;
  rule: string;
  preview: string;
  reportId: string;
}

export function WhatsAppSimulator({ userPhone }: { userPhone?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-0",
      sender: "bot",
      text: "👋 Welcome to SIF Sentinel (Oil India Safety Precursor AI).\n\nText *Hi* to verify your account, or describe any unsafe act, unsafe condition, or near miss with a photo!",
      time: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"worker" | "manager">("worker");
  const [managerAlerts, setManagerAlerts] = useState<ManagerAlert[]>([]);
  const [phone, setPhone] = useState(userPhone || "+916266770991");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Handle sending a message to the real /api/whatsapp/webhook endpoint
  async function handleSendMessage(customText?: string, customImage?: string) {
    const textToSend = customText !== undefined ? customText : inputText;
    const imageToSend = customImage !== undefined ? customImage : selectedImage;

    if (!textToSend.trim() && !imageToSend) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add user message to chat
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: "user",
      text: textToSend,
      time: timeStr,
      mediaUrl: imageToSend || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSelectedImage(null);
    setSending(true);

    try {
      // Call the live Next.js WhatsApp webhook
      const res = await fetch("/api/whatsapp/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: `whatsapp:${phone}`,
          Body: textToSend,
          ...(imageToSend ? { MediaUrl0: imageToSend, MediaContentType0: "image/jpeg" } : {}),
        }).toString(),
      });

      const data = await res.json();

      // Check if message was a greeting or report
      if (textToSend.trim().toLowerCase() === "hi" || textToSend.trim().toLowerCase() === "hello") {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: `👋 *Welcome to SIF Sentinel (Oil India Limited)*\n\nYour number *${phone}* is ready. Tap below to verify your corporate Google profile:\n\n👉 [Tap to Verify Google Account](/link-phone?token=demo_token)\n\nOnce linked, you can report unsafe acts, conditions, or near misses directly in this chat anytime!`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else if (textToSend.trim().toLowerCase() === "status") {
        setMessages((prev) => [
          ...prev,
          {
            id: `b-${Date.now()}`,
            sender: "bot",
            text: `📋 *Your Recent Reports:*\n• *OIL-2026-000042* (NEAR MISS)\n  Status: _ANALYZED_ | Risk: *HIGH*\n  Link: /reports\n\n• *OIL-2026-000041* (UNSAFE CONDITION)\n  Status: _IN REVIEW_ | Risk: *CRITICAL*`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        // Incident Report submitted
        const isCritical =
          /gas|fire|pressur|sling|crane|fall|height|loto|live|wire|blowout/i.test(textToSend);
        const reportCode = `OIL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;

        // Simulated AI response based on real pipeline logic
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              sender: "bot",
              text: `✅ *Safety Report Logged Successfully!*\n\n📋 *Report Code:* ${reportCode}\n🏷️ *Category:* NEAR MISS\n⚠️ *Risk Band:* ${isCritical ? "CRITICAL" : "HIGH"}\n${isCritical ? "🚨 *SIF Precursor Flagged:* Yes — Potential for serious injury or fatality!" : "ℹ️ *SIF Precursor:* Precursor observed."}\n\n${isCritical ? "🔔 *Action Taken:* Your Rig Supervisor & HSE Manager have been sent immediate WhatsApp alerts." : "📋 *Action Taken:* Routed to supervisor for review."}\n\n🔗 *Track Online:* /reports`,
              time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              reportCode,
              riskBand: isCritical ? "CRITICAL" : "HIGH",
              isSif: isCritical,
            },
          ]);

          // Broadcast alert to manager simulation
          if (isCritical) {
            setManagerAlerts((prev) => [
              {
                id: `alt-${Date.now()}`,
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                reportCode,
                riskBand: "CRITICAL",
                hazard: /gas/i.test(textToSend) ? "Flammable Gas / Hydrocarbon" : "Suspended Load / Mechanical",
                site: "Digboi Rig #04 (Drilling)",
                rule: "Life-Saving Rule #3 Breached",
                preview: textToSend.slice(0, 120),
                reportId: "latest",
              },
              ...prev,
            ]);
          }
        }, 1200);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: "bot",
          text: `⚠️ Webhook simulated response: Report received and queued for Gemini 2.5 analysis.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              SIF Sentinel WhatsApp Gateway
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Interactive Safety Bot portal. Test field worker incident reporting and real-time manager alerts without any billing or upgrade requirements!
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex rounded-xl bg-white/[0.05] p-1 border border-white/10">
          <button
            onClick={() => setActiveTab("worker")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "worker"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Field Worker Chat
          </button>
          <button
            onClick={() => setActiveTab("manager")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition relative ${
              activeTab === "manager"
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Bell className="h-4 w-4" />
            Manager Alerts
            {managerAlerts.length > 0 && (
              <span className="ml-1 rounded-full bg-rose-400 text-slate-950 font-bold px-1.5 py-0.2 text-[10px]">
                {managerAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main: WhatsApp Screen */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-md bg-[#111b21] rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[650px]">
            {/* Phone Notch & WhatsApp Header */}
            <div className="bg-[#202c33] px-4 py-3 border-b border-white/5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shadow">
                  <ShieldCheck className="h-6 w-6" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#202c33]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-slate-100">SIF Sentinel Safety Bot</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                      OIL
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400">Online • Auto Precursor AI</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-1 rounded">
                  {phone}
                </span>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
              <div className="text-center my-2">
                <span className="text-[10px] bg-[#182229] text-slate-400 px-3 py-1 rounded-full border border-white/5 shadow-sm">
                  Messages are end-to-end encrypted with Oil India HSE
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-md ${
                      msg.sender === "user"
                        ? "bg-[#005c4b] text-white rounded-tr-none"
                        : "bg-[#202c33] text-slate-200 rounded-tl-none border border-white/5"
                    }`}
                  >
                    {/* Optional Image */}
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-h-48">
                        <img
                          src={msg.mediaUrl}
                          alt="Incident attachment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                      <span>{msg.time}</span>
                      {msg.sender === "user" && <CheckCheck className="h-3.5 w-3.5 text-sky-400" />}
                    </div>
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#202c33] p-2.5 rounded-xl w-fit border border-white/5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  Gemini AI evaluating SIF risk & guardrails...
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Selected Image Preview before sending */}
            {selectedImage && (
              <div className="bg-[#202c33] p-2 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-10 w-10 object-cover rounded border border-white/20"
                  />
                  <span className="text-xs text-slate-300">Photo attached</span>
                </div>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-rose-400 hover:underline px-2"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="bg-[#202c33] p-2.5 border-t border-white/5 flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*,application/pdf"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition"
                title="Attach photo or document"
              >
                <Paperclip className="h-5 w-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
                placeholder="Describe hazard or send 'Hi'..."
                className="flex-1 bg-[#2a3942] text-white text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
              />

              <button
                type="button"
                disabled={sending || (!inputText.trim() && !selectedImage)}
                onClick={() => handleSendMessage()}
                className="p-2.5 rounded-full bg-[#00a884] text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition shadow"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Quick Actions & Real-Time Manager View */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Scenario Buttons */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              ⚡ 1-Tap Incident Simulations
            </h3>
            <p className="text-xs text-slate-400">
              Click any scenario to instantly send a realistic field report and trigger Gemini 2.5 SIF detection:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage("Hi")}
                className="w-full text-left p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-200 transition flex items-center justify-between"
              >
                <span>💬 <strong>Send &quot;Hi&quot;</strong> (Get Google OAuth link)</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <button
                onClick={() =>
                  handleSendMessage(
                    "Near Miss: Crane sling wire frayed and slipped during 5-ton casing lift at Rig 04. Worker leaped aside to avoid falling pipe.",
                    "https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?w=500&auto=format&fit=crop&q=60"
                  )
                }
                className="w-full text-left p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-200 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>Crane Sling Snap</strong> (Lifting SIF Precursor)
                  </span>
                </div>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono">
                  CRITICAL
                </span>
              </button>

              <button
                onClick={() =>
                  handleSendMessage(
                    "Unsafe Condition: High pressure gas leakage detected near separator unit #2 during night shift. Valve bonnet seal failed.",
                    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60"
                  )
                }
                className="w-full text-left p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-xs text-amber-200 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Gas Leak at Separator</strong> (Flammable Energy)
                  </span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                  CRITICAL
                </span>
              </button>

              <button
                onClick={() =>
                  handleSendMessage(
                    "Unsafe Act: Electrician started motor maintenance on 415V pump without performing Lockout-Tagout (LOTO) verification.",
                    undefined
                  )
                }
                className="w-full text-left p-2.5 rounded-xl border border-sky-500/20 bg-sky-500/10 hover:bg-sky-500/20 text-xs text-sky-200 transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>
                    <strong>Live 415V without LOTO</strong> (Electrical Guardrail)
                  </span>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono">
                  CRITICAL
                </span>
              </button>
            </div>
          </div>

          {/* Real-time Outbound Manager WhatsApp Alert Monitor */}
          <div className="rounded-2xl border border-rose-500/30 bg-[#111b21] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">
                  Outbound WhatsApp Alerts to HSE & Managers
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Live Broadcast</span>
            </div>

            {managerAlerts.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 space-y-1">
                <ShieldCheck className="h-8 w-8 mx-auto text-emerald-400 opacity-60" />
                <p>No urgent SIF alerts sent yet.</p>
                <p className="text-[11px] text-slate-400">
                  Send a critical report from the chat to see real-time manager alerts!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {managerAlerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="rounded-xl border border-rose-500/30 bg-[#202c33] p-3 text-xs space-y-2 shadow"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        🚨 URGENT SIF ALERT ({alt.riskBand})
                      </span>
                      <span className="text-[10px] text-slate-400">{alt.time}</span>
                    </div>

                    <div className="text-slate-200 text-[11px] space-y-1 font-mono">
                      <div>📋 Code: <strong className="text-white">{alt.reportCode}</strong></div>
                      <div>📍 Site: {alt.site}</div>
                      <div>⚠️ Hazard: {alt.hazard}</div>
                      <div>🛡️ Rule: {alt.rule}</div>
                    </div>

                    <div className="text-[11px] italic text-slate-400 border-l-2 border-rose-500 pl-2">
                      &quot;{alt.preview}...&quot;
                    </div>

                    <div className="pt-1">
                      <Link
                        href="/reports"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition shadow"
                      >
                        Tap to Review & Issue CAPA
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
