import { useState, useEffect } from "react";
import {
  Inbox, Star, Send, Archive, Trash2, Mail, Sparkles, Settings,
  Search, Plus, ChevronRight, Check, X, Wand2, Globe, FileText,
  CreditCard, Gift, Shield, Mic, FolderPlus, ArrowRight, User,
  MousePointer2, MoreHorizontal, Languages, Loader2, Copy,
  Reply, Forward, RefreshCw, Bell, Lock, Eye, EyeOff, Pencil,
} from "lucide-react";

const S = {
  panel: {
    background: "linear-gradient(145deg, rgba(22,22,30,0.98) 0%, rgba(16,16,22,0.99) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  sidebar: {
    background: "rgba(255,255,255,0.02)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    padding: "12px 8px",
    width: 140,
    flexShrink: 0,
  },
  sidebarItem: (active: boolean) => ({
    display: "flex",
    alignItems: "center" as const,
    gap: 8,
    padding: "6px 10px",
    borderRadius: 8,
    fontSize: 11,
    color: active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
    background: active ? "rgba(59,130,246,0.15)" : "transparent",
    marginBottom: 2,
    transition: "all 0.3s",
  }),
  cursor: (x: number, y: number, clicking: boolean) => ({
    position: "absolute" as const,
    left: x,
    top: y,
    transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 20,
    filter: clicking ? "drop-shadow(0 0 8px rgba(59,130,246,0.5))" : "none",
    transform: clicking ? "scale(0.85)" : "scale(1)",
  }),
  clickRipple: (x: number, y: number, show: boolean) => ({
    position: "absolute" as const,
    left: x - 12,
    top: y - 12,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(59,130,246,0.3)",
    opacity: show ? 1 : 0,
    transform: show ? "scale(2)" : "scale(0)",
    transition: "all 0.4s",
    zIndex: 19,
    pointerEvents: "none" as const,
  }),
  emailRow: (highlighted: boolean) => ({
    display: "flex",
    alignItems: "center" as const,
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    background: highlighted ? "rgba(59,130,246,0.08)" : "transparent",
    transition: "all 0.3s",
  }),
  btn: (color: string, active: boolean) => ({
    display: "inline-flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    padding: "5px 12px",
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
    background: active ? `${color}30` : `${color}15`,
    color: color,
    border: `1px solid ${active ? `${color}50` : `${color}20`}`,
    transition: "all 0.3s",
    transform: active ? "scale(0.95)" : "scale(1)",
  }),
  label: {
    position: "absolute" as const,
    bottom: 8,
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: 8,
    padding: "3px 10px",
    fontSize: 9,
    color: "#93C5FD",
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    zIndex: 25,
  },
};

function useAnimationLoop(totalMs: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setTick((Date.now() - start) % totalMs);
    }, 60);
    return () => clearInterval(id);
  }, [totalMs]);
  return tick;
}

export function DemoDeleteAccount() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5000 ? 2 : t < 6500 ? 3 : 4;

  return (
    <div style={{ ...S.panel, height: 200 }} className="flex">
      <div style={S.sidebar}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", padding: "4px 10px", marginBottom: 8 }}>Menu</div>
        {[{ icon: Inbox, label: "Inbox" }, { icon: Star, label: "Starred" }, { icon: Send, label: "Sent" }].map((item, i) => (
          <div key={i} style={S.sidebarItem(false)}>
            <item.icon style={{ width: 12, height: 12 }} />
            {item.label}
          </div>
        ))}
        <div style={{ ...S.sidebarItem(phase >= 1), marginTop: 12, color: phase >= 1 ? "#60A5FA" : "rgba(255,255,255,0.4)" }}>
          <Settings style={{ width: 12, height: 12 }} />
          Settings
        </div>
      </div>
      <div style={{ flex: 1, padding: 16, position: "relative" }}>
        {phase < 1 && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Navigate to Settings...</p>
          </div>
        )}
        {phase >= 1 && phase < 3 && (
          <>
            <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>Account Settings</p>
            <div style={{ padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Email: user@email.com</p>
            </div>
            <div style={{ padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 12 }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Plan: Pro</p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#EF4444", marginBottom: 6 }}>Danger Zone</p>
            <div style={S.btn("#EF4444", phase === 2)}>
              <Trash2 style={{ width: 10, height: 10 }} />
              Delete Account
            </div>
          </>
        )}
        {phase >= 3 && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(239,68,68,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Shield style={{ width: 20, height: 20, color: "#EF4444" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>Confirm Deletion?</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>This action cannot be undone</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <div style={S.btn("#6B7280", false)}>Cancel</div>
              <div style={S.btn("#EF4444", phase === 4)}>
                <Trash2 style={{ width: 10, height: 10 }} />
                Delete
              </div>
            </div>
          </div>
        )}
        <MousePointer2 style={{
          ...S.cursor(
            phase === 0 ? 20 : phase === 1 ? 60 : phase === 2 ? 50 : phase === 3 ? 140 : 140,
            phase === 0 ? 100 : phase === 1 ? 130 : phase === 2 ? 140 : phase === 3 ? 130 : 130
          ),
          width: 16, height: 16, color: "#60A5FA",
        }} />
        <div style={S.clickRipple(
          phase === 2 ? 50 : phase === 4 ? 140 : -100,
          phase === 2 ? 140 : phase === 4 ? 130 : -100,
          phase === 2 || phase === 4
        )} />
        <div style={S.label}>
          {phase === 0 ? "Click Settings" : phase <= 2 ? "Scroll to Danger Zone" : "Confirm deletion"}
        </div>
      </div>
    </div>
  );
}

export function DemoComposeEmail() {
  const t = useAnimationLoop(7000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : 4;
  const typingText = "Hi Sarah, just following up on...";
  const typedChars = phase >= 2 ? Math.min(typingText.length, Math.floor((t - 3000) / 60)) : 0;

  return (
    <div style={{ ...S.panel, height: 200 }} className="flex">
      <div style={S.sidebar}>
        <div style={S.btn("#3B82F6", phase === 0)}>
          <Plus style={{ width: 10, height: 10 }} />
          Compose
        </div>
        <div style={{ marginTop: 12 }}>
          {[{ icon: Inbox, label: "Inbox", count: 12 }, { icon: Star, label: "Starred" }, { icon: Send, label: "Sent" }].map((item, i) => (
            <div key={i} style={S.sidebarItem(false)}>
              <item.icon style={{ width: 12, height: 12 }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count && <span style={{ fontSize: 9, color: "#60A5FA" }}>{item.count}</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, position: "relative" }}>
        {phase >= 1 && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", width: 20 }}>To:</span>
                <span style={{ fontSize: 10, color: phase >= 1 ? "#93C5FD" : "rgba(255,255,255,0.2)" }}>{phase >= 1 ? "sarah@company.com" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", width: 20 }}>Subj:</span>
                <span style={{ fontSize: 10, color: phase >= 2 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>{phase >= 2 ? "Follow up - Meeting" : ""}</span>
              </div>
            </div>
            <div style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", minHeight: 60, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
              {typedChars > 0 ? typingText.slice(0, typedChars) : ""}
              {phase >= 2 && phase < 4 && <span style={{ borderRight: "1.5px solid #60A5FA", marginLeft: 1, animation: "blink 1s infinite" }}>&nbsp;</span>}
            </div>
            {phase >= 3 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 6 }}>
                <div style={S.btn("#3B82F6", phase === 4)}>
                  <Send style={{ width: 10, height: 10 }} />
                  Send
                </div>
              </div>
            )}
          </>
        )}
        <MousePointer2 style={{
          ...S.cursor(
            phase === 0 ? -80 : phase === 1 ? 120 : phase === 2 ? 100 : phase >= 3 ? 190 : 100,
            phase === 0 ? 20 : phase === 1 ? 30 : phase === 2 ? 80 : phase >= 3 ? 155 : 80
          ),
          width: 16, height: 16, color: "#60A5FA",
        }} />
        <div style={S.label}>
          {phase === 0 ? "Click Compose" : phase === 1 ? "Add recipient" : phase <= 2 ? "Type your message" : "Click Send"}
        </div>
      </div>
    </div>
  );
}

export function DemoStarArchiveDelete() {
  const t = useAnimationLoop(9000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : t < 8000 ? 3 : 0;

  const emails = [
    { from: "John", subject: "Quarterly report", starred: phase >= 1, archived: false, deleted: false },
    { from: "Newsletter", subject: "Weekly digest", starred: false, archived: phase >= 2, deleted: false },
    { from: "Promo", subject: "50% off sale!", starred: false, archived: false, deleted: phase >= 3 },
  ];

  return (
    <div style={{ ...S.panel, height: 190, position: "relative" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Inbox style={{ width: 14, height: 14, color: "#60A5FA" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Inbox</span>
      </div>
      {emails.map((email, i) => (
        <div key={i} style={{
          ...S.emailRow(phase === i + 1),
          opacity: email.archived || email.deleted ? 0.3 : 1,
          transform: email.archived || email.deleted ? "translateX(20px)" : "translateX(0)",
          transition: "all 0.4s",
        }}>
          <Star style={{ width: 12, height: 12, color: email.starred ? "#EAB308" : "rgba(255,255,255,0.15)", fill: email.starred ? "#EAB308" : "none", transition: "all 0.3s" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{email.from}</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{email.subject}</p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {phase === i + 1 && i === 0 && <Star style={{ width: 12, height: 12, color: "#EAB308" }} />}
            {phase === i + 1 && i === 1 && <Archive style={{ width: 12, height: 12, color: "#3B82F6" }} />}
            {phase === i + 1 && i === 2 && <Trash2 style={{ width: 12, height: 12, color: "#EF4444" }} />}
          </div>
        </div>
      ))}
      <div style={S.label}>
        {phase === 0 ? "Select an email" : phase === 1 ? "Star important emails" : phase === 2 ? "Archive to clean up" : "Delete unwanted emails"}
      </div>
    </div>
  );
}

export function DemoAiDraft() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5500 ? 2 : t < 7000 ? 3 : 4;
  const draftText = "Thank you for reaching out. I'd be happy to schedule a meeting to discuss this further. Does Thursday at 2pm work for you?";
  const typedChars = phase >= 2 ? Math.min(draftText.length, Math.floor((t - 3500) / 20)) : 0;

  return (
    <div style={{ ...S.panel, height: 210, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>From: alex@client.com</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Can we schedule a meeting?</p>
        </div>
        <div style={S.btn("#A855F7", phase === 1)}>
          <Sparkles style={{ width: 10, height: 10 }} />
          AI Reply
        </div>
      </div>
      <div style={{ padding: 12, fontSize: 9, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
        Hi, I wanted to discuss the project timeline and deliverables. Could we find a time to meet this week?
      </div>
      {phase >= 2 && (
        <div style={{ margin: "0 12px", padding: 10, borderRadius: 10, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <Sparkles style={{ width: 10, height: 10, color: "#A855F7" }} />
            <span style={{ fontSize: 9, fontWeight: 600, color: "#C4B5FD" }}>AI Draft</span>
            {phase === 2 && typedChars < draftText.length && <Loader2 style={{ width: 10, height: 10, color: "#A855F7", animation: "spin 1s linear infinite" }} />}
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            {draftText.slice(0, typedChars)}
            {typedChars < draftText.length && <span style={{ borderRight: "1.5px solid #A855F7", marginLeft: 1 }}>&nbsp;</span>}
          </p>
        </div>
      )}
      {phase >= 3 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", gap: 6 }}>
          <div style={S.btn("#6B7280", false)}>Edit</div>
          <div style={S.btn("#22C55E", phase === 4)}>
            <Send style={{ width: 10, height: 10 }} />
            Send
          </div>
        </div>
      )}
      <div style={S.label}>
        {phase <= 1 ? "Click AI Reply" : phase === 2 ? "AI generates a draft..." : "Review and send"}
      </div>
    </div>
  );
}

export function DemoAiCleanup() {
  const t = useAnimationLoop(8000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 5000 ? 2 : t < 6500 ? 3 : 4;

  const items = [
    { subject: "50% off everything!", action: "Delete", checked: true },
    { subject: "Your weekly digest", action: "Archive", checked: true },
    { subject: "Win a prize!", action: "Spam", checked: true },
  ];

  return (
    <div style={{ ...S.panel, height: 200, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Wand2 style={{ width: 14, height: 14, color: "#A855F7" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>AI Cleanup</span>
      </div>
      {phase === 0 && (
        <div style={{ textAlign: "center", padding: "24px 16px" }}>
          <div style={S.btn("#A855F7", true)}>
            <Sparkles style={{ width: 10, height: 10 }} />
            Start Scan
          </div>
        </div>
      )}
      {phase === 1 && (
        <div style={{ textAlign: "center", padding: "30px 16px" }}>
          <Loader2 style={{ width: 24, height: 24, color: "#A855F7", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Scanning inbox...</p>
        </div>
      )}
      {phase >= 2 && (
        <div style={{ padding: "4px 0" }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", transition: "all 0.3s", opacity: phase >= 4 ? 0.3 : 1, transform: phase >= 4 ? "translateX(30px)" : "translateX(0)" }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid #A855F7", background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check style={{ width: 9, height: 9, color: "#A855F7" }} />
              </div>
              <span style={{ flex: 1, fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{item.subject}</span>
              <span style={{ fontSize: 9, color: item.action === "Spam" ? "#EF4444" : item.action === "Delete" ? "#F97316" : "#3B82F6", fontWeight: 600 }}>{item.action}</span>
            </div>
          ))}
          {phase >= 2 && phase < 4 && (
            <div style={{ padding: "8px 16px", marginTop: 4 }}>
              <div style={S.btn("#A855F7", phase === 3)}>
                <Sparkles style={{ width: 10, height: 10 }} />
                Clean up 3 emails
              </div>
            </div>
          )}
        </div>
      )}
      <div style={S.label}>
        {phase === 0 ? "Start the scan" : phase === 1 ? "AI analyzes emails..." : phase <= 3 ? "Review and clean up" : "Inbox cleaned!"}
      </div>
    </div>
  );
}

export function DemoConnectEmail() {
  const t = useAnimationLoop(7000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5000 ? 2 : t < 6500 ? 3 : 0;

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Connect Your Email</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {phase < 2 && (
          <>
            <div style={{ ...S.btn("#4285F4", phase === 1), padding: "8px 16px", fontSize: 11, justifyContent: "flex-start", gap: 8 }}>
              <Mail style={{ width: 14, height: 14 }} />
              Continue with Gmail
            </div>
            <div style={{ ...S.btn("#0078D4", false), padding: "8px 16px", fontSize: 11, justifyContent: "flex-start", gap: 8 }}>
              <Mail style={{ width: 14, height: 14 }} />
              Continue with Microsoft
            </div>
          </>
        )}
        {phase === 2 && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Loader2 style={{ width: 20, height: 20, color: "#4285F4", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Connecting to Google...</p>
          </div>
        )}
        {phase === 3 && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
              <Check style={{ width: 18, height: 18, color: "#22C55E" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#86EFAC" }}>Connected!</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>user@gmail.com</p>
          </div>
        )}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Choose your provider" : phase === 1 ? "Click to connect" : phase === 2 ? "Authorizing..." : "Email connected!"}
      </div>
    </div>
  );
}

export function DemoTranslate() {
  const t = useAnimationLoop(7000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5500 ? 2 : 3;
  const translated = "Hello! I would like to discuss our partnership. Are you available next week?";
  const typedChars = phase >= 2 ? Math.min(translated.length, Math.floor((t - 3500) / 25)) : 0;

  return (
    <div style={{ ...S.panel, height: 200, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Email from: tanaka@co.jp</p>
        <div style={S.btn("#3B82F6", phase === 1)}>
          <Languages style={{ width: 10, height: 10 }} />
          Translate
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 8 }}>
          &#x3053;&#x3093;&#x306B;&#x3061;&#x306F;&#xFF01;&#x79C1;&#x305F;&#x3061;&#x306E;&#x30D1;&#x30FC;&#x30C8;&#x30CA;&#x30FC;&#x30B7;&#x30C3;&#x30D7;&#x306B;&#x3064;&#x3044;&#x3066;&#x8A71;&#x3057;&#x5408;&#x3044;&#x305F;&#x3044;&#x3068;&#x601D;&#x3044;&#x307E;&#x3059;&#x3002;
        </p>
        {phase >= 2 && (
          <div style={{ padding: 8, borderRadius: 8, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Globe style={{ width: 10, height: 10, color: "#60A5FA" }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: "#93C5FD" }}>English Translation</span>
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              {translated.slice(0, typedChars)}
              {typedChars < translated.length && <span style={{ borderRight: "1.5px solid #60A5FA" }}>&nbsp;</span>}
            </p>
          </div>
        )}
      </div>
      <div style={S.label}>
        {phase <= 1 ? "Click Translate" : phase === 2 ? "Translating..." : "Translation complete"}
      </div>
    </div>
  );
}

export function DemoNavigateInbox() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : 3;
  const folders = [
    { icon: Inbox, label: "Inbox", count: 12 },
    { icon: Star, label: "Starred", count: 3 },
    { icon: Send, label: "Sent" },
    { icon: Archive, label: "Archive" },
    { icon: Trash2, label: "Trash" },
  ];

  return (
    <div style={{ ...S.panel, height: 190 }} className="flex">
      <div style={S.sidebar}>
        {folders.map((f, i) => (
          <div key={i} style={S.sidebarItem(phase === i || (phase === 3 && i === 0))}>
            <f.icon style={{ width: 12, height: 12 }} />
            <span style={{ flex: 1 }}>{f.label}</span>
            {f.count && <span style={{ fontSize: 9, color: "#60A5FA" }}>{f.count}</span>}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
            {folders[phase >= 3 ? 0 : phase]?.label}
          </span>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={S.emailRow(false)}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `rgba(${60 + i * 40},${100 + i * 30},246,0.15)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 10, height: 10, color: "rgba(255,255,255,0.3)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ width: `${50 + i * 10}%`, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
              <div style={{ width: `${70 - i * 10}%`, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", marginTop: 4 }} />
            </div>
          </div>
        ))}
        <div style={S.label}>
          {phase === 0 ? "Inbox view" : phase === 1 ? "Switch to Starred" : phase === 2 ? "Check Sent emails" : "Back to Inbox"}
        </div>
      </div>
    </div>
  );
}

export function DemoReplyForward() {
  const t = useAnimationLoop(6000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : 2;

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Meeting tomorrow at 3pm</p>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>From: manager@company.com</p>
      </div>
      <div style={{ padding: 12, fontSize: 9, color: "rgba(255,255,255,0.35)" }}>
        Hi team, let's meet tomorrow to review the project status.
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 12px 8px" }}>
        <div style={S.btn("#3B82F6", phase === 1)}>
          <Reply style={{ width: 10, height: 10 }} />
          Reply
        </div>
        <div style={S.btn("#8B5CF6", false)}>
          <Reply style={{ width: 10, height: 10, transform: "scaleX(-1)" }} />
          Reply All
        </div>
        <div style={S.btn("#F59E0B", phase === 2)}>
          <Forward style={{ width: 10, height: 10 }} />
          Forward
        </div>
      </div>
      {phase >= 1 && (
        <div style={{ margin: "0 12px 8px", padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{phase === 1 ? "Type your reply..." : "Forward to: colleague@company.com"}</p>
        </div>
      )}
      <div style={S.label}>
        {phase === 0 ? "Choose an action" : phase === 1 ? "Reply to sender" : "Forward to someone else"}
      </div>
    </div>
  );
}

export function DemoCustomFolders() {
  const t = useAnimationLoop(7000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5500 ? 2 : 3;

  return (
    <div style={{ ...S.panel, height: 190 }} className="flex">
      <div style={S.sidebar}>
        <div style={S.sidebarItem(false)}><Inbox style={{ width: 12, height: 12 }} /> Inbox</div>
        <div style={S.sidebarItem(false)}><Star style={{ width: 12, height: 12 }} /> Starred</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "6px 0" }} />
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", padding: "2px 10px" }}>FOLDERS</div>
        {phase >= 1 && (
          <div style={{ ...S.sidebarItem(phase >= 2), opacity: phase >= 1 ? 1 : 0, transition: "all 0.4s" }}>
            <FolderPlus style={{ width: 12, height: 12, color: "#A855F7" }} />
            <span style={{ color: "#C4B5FD" }}>Invoices</span>
          </div>
        )}
        <div style={S.btn("#A855F7", phase === 0)} >
          <Plus style={{ width: 10, height: 10 }} />
          New
        </div>
      </div>
      <div style={{ flex: 1, padding: 12, position: "relative" }}>
        {phase === 0 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingTop: 40 }}>Click "New" to create a folder</p>}
        {phase === 1 && (
          <div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>Create Folder</p>
            <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.3)", fontSize: 10, color: "#C4B5FD", marginBottom: 6 }}>Invoices</div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>AI Description:</p>
            <div style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Invoices and payment receipts</div>
          </div>
        )}
        {phase >= 2 && (
          <div>
            <p style={{ fontSize: 10, color: "#C4B5FD", fontWeight: 600, marginBottom: 8 }}>Invoices</p>
            {phase >= 3 && ["Invoice #1042 - $299", "Receipt - Annual Plan"].map((s, i) => (
              <div key={i} style={{ ...S.emailRow(false), opacity: 0, animation: `fadeSlideIn 0.4s ${i * 0.2}s forwards` }}>
                <FileText style={{ width: 12, height: 12, color: "#A855F7" }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{s}</span>
              </div>
            ))}
          </div>
        )}
        <div style={S.label}>
          {phase === 0 ? "Create a new folder" : phase === 1 ? "Name it & add AI description" : phase === 2 ? "Folder created!" : "AI sorts emails here"}
        </div>
      </div>
      <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export function DemoSettings() {
  const t = useAnimationLoop(6000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : 2;
  const tabs = ["Account", "Security", "AI", "Email", "Billing"];

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Settings</span>
      </div>
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "0 12px" }}>
        {tabs.map((tab, i) => (
          <div key={i} style={{
            padding: "8px 10px", fontSize: 10,
            color: (phase === 0 && i === 0) || (phase === 1 && i === 2) || (phase === 2 && i === 4) ? "#60A5FA" : "rgba(255,255,255,0.3)",
            borderBottom: (phase === 0 && i === 0) || (phase === 1 && i === 2) || (phase === 2 && i === 4) ? "2px solid #3B82F6" : "2px solid transparent",
            transition: "all 0.3s",
          }}>
            {tab}
          </div>
        ))}
      </div>
      <div style={{ padding: 12 }}>
        {phase === 0 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Manage your account details, password, and profile...</p>}
        {phase === 1 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Tone: Professional | Language: English | Region: US...</p>}
        {phase === 2 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Plan: Pro | Next billing: March 15, 2026...</p>}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Account settings" : phase === 1 ? "AI preferences" : "Billing & subscription"}
      </div>
    </div>
  );
}

export function DemoReferral() {
  const t = useAnimationLoop(7000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 5500 ? 2 : 3;

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Gift style={{ width: 14, height: 14, color: "#A855F7" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Referrals</span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            mydraft.io/ref/ABC123
          </div>
          <div style={S.btn("#3B82F6", phase === 1)}>
            <Copy style={{ width: 10, height: 10 }} />
            Copy
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Progress</span>
            <span style={{ fontSize: 9, color: "#A855F7" }}>{phase >= 2 ? "1" : "0"}/2 referrals</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ height: 6, borderRadius: 3, background: "linear-gradient(90deg, #A855F7, #6366F1)", width: phase >= 2 ? "50%" : "0%", transition: "width 0.6s" }} />
          </div>
        </div>
        {phase >= 3 && (
          <p style={{ fontSize: 9, color: "#86EFAC", textAlign: "center" }}>1 more referral = 1 free month of Pro!</p>
        )}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Your referral link" : phase === 1 ? "Copy and share" : "Track your progress"}
      </div>
    </div>
  );
}

export function DemoBilling() {
  const t = useAnimationLoop(7000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5500 ? 2 : 3;

  return (
    <div style={{ ...S.panel, height: 190, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Choose a Plan</span>
      </div>
      <div style={{ display: "flex", gap: 8, padding: 12 }}>
        {[
          { name: "Free", price: "$0", color: "#6B7280" },
          { name: "Pro", price: "$10/mo", color: "#3B82F6" },
          { name: "Business", price: "$29/mo", color: "#F59E0B" },
        ].map((plan, i) => (
          <div key={i} style={{
            flex: 1, padding: 10, borderRadius: 10, textAlign: "center",
            background: (phase === 1 && i === 1) || (phase === 2 && i === 2) ? `${plan.color}15` : "rgba(255,255,255,0.02)",
            border: `1.5px solid ${(phase === 1 && i === 1) || (phase === 2 && i === 2) ? `${plan.color}40` : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.3s",
            transform: (phase === 1 && i === 1) || (phase === 2 && i === 2) ? "scale(1.03)" : "scale(1)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: plan.color }}>{plan.name}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", margin: "4px 0" }}>{plan.price}</p>
          </div>
        ))}
      </div>
      {phase >= 3 && (
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          <div style={S.btn("#22C55E", true)}>
            <Check style={{ width: 10, height: 10 }} />
            Plan updated!
          </div>
        </div>
      )}
      <div style={S.label}>
        {phase === 0 ? "View available plans" : phase === 1 ? "Select Pro" : phase === 2 ? "Or choose Business" : "Plan updated!"}
      </div>
    </div>
  );
}

export function DemoSearch() {
  const t = useAnimationLoop(6000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : 3;
  const query = "quarterly report";
  const typedChars = phase >= 1 ? Math.min(query.length, Math.floor((t - 1500) / 80)) : 0;

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, border: phase >= 1 ? "1px solid rgba(59,130,246,0.3)" : "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", transition: "all 0.3s" }}>
          <Search style={{ width: 14, height: 14, color: phase >= 1 ? "#60A5FA" : "rgba(255,255,255,0.25)" }} />
          <span style={{ fontSize: 11, color: typedChars > 0 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)" }}>
            {typedChars > 0 ? query.slice(0, typedChars) : "Search emails..."}
          </span>
        </div>
      </div>
      {phase >= 2 && (
        <div style={{ padding: "0 16px" }}>
          {["Quarterly Report Q4 - from: finance@co.com", "RE: Quarterly Report Review", "Q3 Quarterly Summary"].map((r, i) => (
            <div key={i} style={{ padding: "6px 8px", borderRadius: 6, fontSize: 10, color: "rgba(255,255,255,0.5)", background: phase === 3 && i === 0 ? "rgba(59,130,246,0.08)" : "transparent", transition: "all 0.3s", marginBottom: 2 }}>
              {r}
            </div>
          ))}
        </div>
      )}
      <div style={S.label}>
        {phase === 0 ? "Click the search bar" : phase === 1 ? "Type your search" : phase === 2 ? "Results appear instantly" : "Click to open"}
      </div>
    </div>
  );
}

export function DemoSignature() {
  const t = useAnimationLoop(6000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : 2;
  const sig = "Best regards,\nJohn Smith\nProduct Manager";

  return (
    <div style={{ ...S.panel, height: 170, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Settings &gt; Email</span>
      </div>
      <div style={{ padding: 12 }}>
        <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Email Signature</p>
        <div style={{ padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", minHeight: 50, fontSize: 10 }}>
          {phase >= 1 ? sig.split("\n").map((line, i) => (
            <p key={i} style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{line}</p>
          )) : <span style={{ color: "rgba(255,255,255,0.15)" }}>Add your signature...</span>}
        </div>
        {phase >= 2 && (
          <div style={{ marginTop: 8 }}>
            <div style={S.btn("#22C55E", true)}>
              <Check style={{ width: 10, height: 10 }} />
              Saved!
            </div>
          </div>
        )}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Open email settings" : phase === 1 ? "Type your signature" : "Signature saved!"}
      </div>
    </div>
  );
}

export function DemoSecurity() {
  const t = useAnimationLoop(6000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : 2;

  return (
    <div style={{ ...S.panel, height: 180, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Security</span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
          <Lock style={{ width: 14, height: 14, color: "#60A5FA" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Two-Factor Auth</p>
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>Add extra security</p>
          </div>
          <div style={{
            width: 32, height: 18, borderRadius: 9, padding: 2,
            background: phase >= 1 ? "#22C55E" : "rgba(255,255,255,0.1)",
            transition: "all 0.3s",
            display: "flex", alignItems: phase >= 1 ? "center" : "center",
            justifyContent: phase >= 1 ? "flex-end" : "flex-start",
          }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "white", transition: "all 0.3s" }} />
          </div>
        </div>
        {phase >= 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
            <Shield style={{ width: 14, height: 14, color: "#22C55E" }} />
            <p style={{ fontSize: 9, color: "#86EFAC" }}>{phase >= 2 ? "2FA enabled! Your account is more secure." : "Scan QR code with your authenticator app..."}</p>
          </div>
        )}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Toggle 2FA on" : phase === 1 ? "Set up authenticator" : "2FA enabled!"}
      </div>
    </div>
  );
}

export function DemoMultiSelect() {
  const t = useAnimationLoop(7000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : 0;
  const selected = phase >= 1 ? [0] : [];
  if (phase >= 2) selected.push(1, 2);

  return (
    <div style={{ ...S.panel, height: 190, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Inbox</span>
        {phase >= 2 && (
          <div style={{ display: "flex", gap: 4 }}>
            <div style={S.btn("#3B82F6", phase === 3)}><Archive style={{ width: 10, height: 10 }} /> Archive</div>
            <div style={S.btn("#EF4444", false)}><Trash2 style={{ width: 10, height: 10 }} /> Delete</div>
          </div>
        )}
      </div>
      {["Newsletter Weekly", "Promo: Sale ends today", "System Notification"].map((subj, i) => (
        <div key={i} style={{ ...S.emailRow(selected.includes(i)), transition: "all 0.3s" }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            border: selected.includes(i) ? "1.5px solid #3B82F6" : "1.5px solid rgba(255,255,255,0.12)",
            background: selected.includes(i) ? "rgba(59,130,246,0.2)" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.3s",
          }}>
            {selected.includes(i) && <Check style={{ width: 10, height: 10, color: "#60A5FA" }} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{subj}</p>
          </div>
        </div>
      ))}
      <div style={S.label}>
        {phase === 0 ? "Long-press to select" : phase === 1 ? "First email selected" : phase === 2 ? "Tap more to add" : "Batch archive!"}
      </div>
    </div>
  );
}

export function DemoWritingStyle() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : 3;

  return (
    <div style={{ ...S.panel, height: 190, position: "relative" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <Sparkles style={{ width: 14, height: 14, color: "#A855F7" }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Writing Style</span>
      </div>
      <div style={{ padding: 12 }}>
        {phase === 0 && (
          <div style={{ textAlign: "center", paddingTop: 16 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Send emails to start learning...</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
          </div>
        )}
        {phase === 1 && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i <= 2 ? "#A855F7" : "rgba(255,255,255,0.08)", transition: "all 0.3s" }} />
              ))}
            </div>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>2 of 3 samples collected...</p>
          </div>
        )}
        {phase === 2 && (
          <div style={{ textAlign: "center" }}>
            <Loader2 style={{ width: 20, height: 20, color: "#A855F7", animation: "spin 1s linear infinite", margin: "8px auto" }} />
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Analyzing your writing style...</p>
          </div>
        )}
        {phase === 3 && (
          <div>
            <div style={{ padding: 8, borderRadius: 8, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.12)" }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: "#C4B5FD", marginBottom: 4 }}>Your Style Profile</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>Tone: Professional, warm | Greetings: "Hi [Name]," | Sign-off: "Best regards" | Style: Concise, action-oriented</p>
            </div>
          </div>
        )}
      </div>
      <div style={S.label}>
        {phase === 0 ? "Start sending emails" : phase === 1 ? "AI collects samples" : phase === 2 ? "Analyzing patterns..." : "Style profile built!"}
      </div>
    </div>
  );
}

export const demoMap: Record<string, () => JSX.Element> = {
  "create-account": DemoConnectEmail,
  "connect-email": DemoConnectEmail,
  "navigate-inbox": DemoNavigateInbox,
  "compose-email": DemoComposeEmail,
  "reply-forward": DemoReplyForward,
  "star-archive-delete": DemoStarArchiveDelete,
  "custom-folders": DemoCustomFolders,
  "ai-draft-replies": DemoAiDraft,
  "ai-cleanup": DemoAiCleanup,
  "writing-style": DemoWritingStyle,
  "email-translation": DemoTranslate,
  "ai-assistant": DemoAiDraft,
  "plans-pricing": DemoBilling,
  "upgrade-plan": DemoBilling,
  "referral-program": DemoReferral,
  "delete-account": DemoDeleteAccount,
  "disconnect-email": DemoSettings,
  "two-factor-auth": DemoSecurity,
  "change-appearance": DemoSettings,
  "ai-preferences": DemoSettings,
  "email-signature": DemoSignature,
  "search-inbox": DemoSearch,
  "select-multiple": DemoMultiSelect,
  "change-password": DemoSecurity,
  "mark-read-unread": DemoNavigateInbox,
  "email-scheduling": DemoComposeEmail,
  "attachments": DemoComposeEmail,
  "swipe-gestures": DemoStarArchiveDelete,
  "ai-refine": DemoAiDraft,
  "email-summary": DemoTranslate,
  "promo-codes": DemoBilling,
  "voice-assistant": DemoAiDraft,
  "data-security": DemoSecurity,
  "email-storage": DemoSecurity,
  "contact-support": DemoSettings,
  "free-trial": DemoBilling,
  "cancel-subscription": DemoSettings,
  "payment-methods": DemoBilling,
  "supported-providers": DemoConnectEmail,
  "mobile-use": DemoNavigateInbox,
  "inbox-zero": DemoAiCleanup,
  "multilingual": DemoTranslate,
  "ai-limits": DemoAiDraft,
  "spam-phishing": DemoAiCleanup,
  "cc-bcc": DemoComposeEmail,
  "email-notifications": DemoSettings,
  "export-data": DemoSettings,
  "billing-annual": DemoBilling,
};
