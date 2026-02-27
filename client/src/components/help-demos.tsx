import { useState, useEffect } from "react";
import {
  Inbox, Star, Send, Archive, Trash2, Sparkles,
  Search, Plus, Check, X, Wand2, Globe,
  FolderPlus, User, Languages, Loader2, Copy,
  Reply, Forward, PenSquare, Gift, Shield, Lock,
  Mail, Settings, ChevronRight, FileText,
} from "lucide-react";

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

const sidebarBg = "rgba(255,255,255,0.02)";
const panelBorder = "1px solid rgba(255,255,255,0.08)";
const subtleBorder = "1px solid rgba(255,255,255,0.06)";
const dimText = "rgba(255,255,255,0.35)";
const midText = "rgba(255,255,255,0.55)";
const brightText = "rgba(255,255,255,0.8)";
const accentBlue = "#3B82F6";
const accentPurple = "#A855F7";

function Panel({ children, height = 210 }: { children: React.ReactNode; height?: number }) {
  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(22,22,30,0.98) 0%, rgba(16,16,22,0.99) 100%)",
      border: panelBorder, borderRadius: 16, overflow: "hidden", position: "relative", height,
    }}>
      {children}
    </div>
  );
}

function Sidebar({ activeIndex = 0, children }: { activeIndex?: number; children?: React.ReactNode }) {
  const items = [
    { icon: Inbox, label: "Inbox", count: 12 },
    { icon: Send, label: "Sent" },
    { icon: Star, label: "Starred", count: 3 },
    { icon: Archive, label: "Archived" },
    { icon: Trash2, label: "Trash" },
  ];
  return (
    <div style={{ background: sidebarBg, borderRight: subtleBorder, padding: "10px 6px", width: 130, flexShrink: 0 }}>
      {children}
      {items.map((item, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 7, fontSize: 10.5,
          color: activeIndex === i ? brightText : dimText,
          background: activeIndex === i ? "rgba(59,130,246,0.12)" : "transparent",
          marginBottom: 1, transition: "all 0.4s",
        }}>
          <item.icon style={{ width: 13, height: 13 }} />
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.count && <span style={{ fontSize: 9, color: accentBlue, opacity: 0.7 }}>{item.count}</span>}
        </div>
      ))}
    </div>
  );
}

function ComposeBtn({ active = false }: { active?: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8,
      fontSize: 10.5, fontWeight: 600, background: active ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.12)",
      color: accentBlue, border: `1px solid ${active ? "rgba(59,130,246,0.4)" : "rgba(59,130,246,0.2)"}`,
      transition: "all 0.3s", transform: active ? "scale(0.96)" : "scale(1)", marginBottom: 8,
    }}>
      <PenSquare style={{ width: 11, height: 11 }} />
      Compose
    </div>
  );
}

function EmailRow({ from, subject, time, unread = false, highlighted = false, starred = false, fading = false }: {
  from: string; subject: string; time?: string; unread?: boolean; highlighted?: boolean; starred?: boolean; fading?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      background: highlighted ? "rgba(59,130,246,0.06)" : "transparent",
      opacity: fading ? 0.2 : 1, transform: fading ? "translateX(40px)" : "translateX(0)",
      transition: "all 0.4s",
    }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <User style={{ width: 10, height: 10, color: dimText }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: unread ? 700 : 500, color: unread ? brightText : midText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{from}</p>
        <p style={{ fontSize: 9, color: dimText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subject}</p>
      </div>
      {starred && <Star style={{ width: 11, height: 11, color: "#EAB308", fill: "#EAB308" }} />}
      {time && <span style={{ fontSize: 8, color: dimText, flexShrink: 0 }}>{time}</span>}
    </div>
  );
}

function StepLabel({ text }: { text: string }) {
  return (
    <div style={{
      position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
      background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)",
      borderRadius: 7, padding: "3px 10px", fontSize: 9, color: "#93C5FD",
      fontWeight: 600, whiteSpace: "nowrap", zIndex: 25,
    }}>
      {text}
    </div>
  );
}

function Btn({ color, active = false, children }: { color: string; active?: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
      padding: "5px 12px", borderRadius: 7, fontSize: 10, fontWeight: 600,
      background: active ? `${color}30` : `${color}12`, color,
      border: `1px solid ${active ? `${color}50` : `${color}20`}`,
      transition: "all 0.3s", transform: active ? "scale(0.95)" : "scale(1)",
    }}>
      {children}
    </div>
  );
}

export function DemoConnectEmail() {
  const t = useAnimationLoop(10000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : t < 7500 ? 4 : t < 9000 ? 5 : 0;

  return (
    <Panel height={220}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase <= 1 && (
            <div style={{ padding: 16, textAlign: "center", paddingTop: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: brightText, marginBottom: 4 }}>Connect Your Email</p>
              <p style={{ fontSize: 9, color: dimText, marginBottom: 16 }}>Link your account to start managing emails</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 180, margin: "0 auto" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
                  background: phase === 1 ? "rgba(66,133,244,0.2)" : "rgba(66,133,244,0.08)",
                  border: phase === 1 ? "1px solid rgba(66,133,244,0.4)" : "1px solid rgba(66,133,244,0.15)",
                  transition: "all 0.3s", cursor: "pointer",
                }}>
                  <Mail style={{ width: 14, height: 14, color: "#4285F4" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#93B4F4" }}>Continue with Google</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
                  background: "rgba(0,120,212,0.08)", border: "1px solid rgba(0,120,212,0.15)",
                }}>
                  <Mail style={{ width: 14, height: 14, color: "#0078D4" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#7EB8E8" }}>Continue with Microsoft</span>
                </div>
              </div>
            </div>
          )}
          {phase === 2 && (
            <div style={{ padding: 16, textAlign: "center", paddingTop: 40 }}>
              <Loader2 style={{ width: 24, height: 24, color: "#4285F4", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 11, color: midText }}>Signing in with Google...</p>
              <p style={{ fontSize: 9, color: dimText, marginTop: 4 }}>Granting MyDraft access to your inbox</p>
            </div>
          )}
          {phase === 3 && (
            <div style={{ padding: 16, textAlign: "center", paddingTop: 30 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                <Check style={{ width: 20, height: 20, color: "#22C55E" }} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#86EFAC" }}>Connected!</p>
              <p style={{ fontSize: 9, color: dimText, marginTop: 2 }}>user@gmail.com</p>
              <p style={{ fontSize: 9, color: dimText, marginTop: 6 }}>Loading your emails...</p>
            </div>
          )}
          {phase >= 4 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
                <Inbox style={{ width: 13, height: 13, color: accentBlue }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
                <span style={{ fontSize: 9, color: accentBlue, marginLeft: "auto" }}>12</span>
              </div>
              <EmailRow from="Sarah Chen" subject="Q1 Report — Final numbers attached" time="10:30 AM" unread />
              <EmailRow from="Alex Johnson" subject="Meeting tomorrow at 2pm?" time="9:15 AM" unread />
              <EmailRow from="Newsletter" subject="Your weekly tech digest" time="8:00 AM" />
              {phase === 5 && <EmailRow from="Mike Wilson" subject="Invoice #4521 — Payment due" time="Yesterday" />}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Choose your email provider" : phase === 1 ? "Click to sign in with Google" :
            phase === 2 ? "Authorizing your account..." : phase === 3 ? "Email connected successfully!" :
            phase === 4 ? "Your inbox loads automatically" : "All your emails appear here"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoNavigateInbox() {
  const t = useAnimationLoop(9000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : t < 8000 ? 3 : 0;
  const activeFolder = phase === 0 ? 0 : phase === 1 ? 2 : phase === 2 ? 1 : 0;
  const folderNames = ["Inbox", "Sent", "Starred", "Archived", "Trash"];

  const emailsByFolder: Record<number, { from: string; subject: string; time: string; unread?: boolean; starred?: boolean }[]> = {
    0: [
      { from: "Sarah Chen", subject: "Q1 Report ready for review", time: "10:30 AM", unread: true },
      { from: "Alex Johnson", subject: "Meeting rescheduled to Friday", time: "9:15 AM", unread: true },
      { from: "Newsletter", subject: "Weekly tech digest", time: "8:00 AM" },
    ],
    2: [
      { from: "Client — Acme Corp", subject: "Contract renewal discussion", time: "Yesterday", starred: true },
      { from: "Sarah Chen", subject: "Budget approval needed", time: "Mon", starred: true },
    ],
    1: [
      { from: "To: Alex Johnson", subject: "RE: Meeting rescheduled", time: "11:00 AM" },
      { from: "To: Sarah Chen", subject: "RE: Q1 Report feedback", time: "Yesterday" },
    ],
  };

  const currentEmails = emailsByFolder[activeFolder] || emailsByFolder[0];

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={activeFolder}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>{folderNames[activeFolder]}</span>
          </div>
          {currentEmails.map((e, i) => (
            <EmailRow key={`${activeFolder}-${i}`} from={e.from} subject={e.subject} time={e.time} unread={e.unread} starred={e.starred} />
          ))}
          <StepLabel text={
            phase === 0 ? "You start in your Inbox" : phase === 1 ? "Click Starred to see important emails" :
            phase === 2 ? "Click Sent to see what you've sent" : "Click Inbox to go back"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoComposeEmail() {
  const t = useAnimationLoop(9000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6500 ? 3 : t < 8000 ? 4 : 0;
  const bodyText = "Hi Sarah, just following up on the Q1 report. Everything looks great — I've approved the budget.";
  const typedChars = phase >= 3 ? Math.min(bodyText.length, Math.floor((t - 4500) / 25)) : 0;

  return (
    <Panel height={220}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn active={phase === 1} />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="Sarah Chen" subject="Q1 Report — Final numbers" time="10:30 AM" unread />
              <EmailRow from="Alex Johnson" subject="Meeting tomorrow at 2pm?" time="9:15 AM" />
              <EmailRow from="Newsletter" subject="Weekly tech digest" time="8:00 AM" />
            </div>
          )}
          {phase >= 1 && phase < 5 && (
            <div style={{ padding: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: brightText, marginBottom: 8 }}>New Message</p>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5, padding: "4px 8px", borderRadius: 6, border: subtleBorder }}>
                <span style={{ fontSize: 9, color: dimText, width: 22 }}>To:</span>
                <span style={{ fontSize: 10, color: phase >= 2 ? "#93C5FD" : "rgba(255,255,255,0.15)" }}>{phase >= 2 ? "sarah@company.com" : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5, padding: "4px 8px", borderRadius: 6, border: subtleBorder }}>
                <span style={{ fontSize: 9, color: dimText, width: 22 }}>Subj:</span>
                <span style={{ fontSize: 10, color: phase >= 2 ? midText : "rgba(255,255,255,0.15)" }}>{phase >= 2 ? "RE: Q1 Report" : ""}</span>
              </div>
              <div style={{ padding: 8, borderRadius: 7, border: subtleBorder, minHeight: 50, fontSize: 10, color: midText, lineHeight: 1.5 }}>
                {typedChars > 0 ? bodyText.slice(0, typedChars) : ""}
                {phase === 3 && <span style={{ borderRight: "1.5px solid " + accentBlue }}>&nbsp;</span>}
              </div>
              {phase >= 4 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <Btn color="#22C55E" active={phase === 4}>
                    <Send style={{ width: 10, height: 10 }} />
                    Send
                  </Btn>
                </div>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Start from your inbox" : phase === 1 ? "Click Compose in the sidebar" :
            phase === 2 ? "Add recipient and subject" : phase === 3 ? "Type your message" : "Click Send"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoReplyForward() {
  const t = useAnimationLoop(8000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : t < 7500 ? 4 : 0;

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="Manager" subject="Meeting tomorrow at 3pm" time="10:00 AM" unread highlighted />
              <EmailRow from="Alex Johnson" subject="Project update" time="9:15 AM" />
            </div>
          )}
          {phase >= 1 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Meeting tomorrow at 3pm</p>
                <p style={{ fontSize: 9, color: dimText }}>From: manager@company.com</p>
              </div>
              <div style={{ padding: "8px 12px", fontSize: 9, color: dimText, lineHeight: 1.6 }}>
                Hi team, let's meet tomorrow to review the project status and next steps.
              </div>
              <div style={{ display: "flex", gap: 5, padding: "4px 12px" }}>
                <Btn color={accentBlue} active={phase === 2}>
                  <Reply style={{ width: 10, height: 10 }} />
                  Reply
                </Btn>
                <Btn color="#8B5CF6" active={false}>
                  <Reply style={{ width: 10, height: 10, transform: "scaleX(-1)" }} />
                  Reply All
                </Btn>
                <Btn color="#F59E0B" active={phase === 3}>
                  <Forward style={{ width: 10, height: 10 }} />
                  Forward
                </Btn>
              </div>
              {phase >= 4 && (
                <div style={{ margin: "6px 12px", padding: 7, borderRadius: 7, border: subtleBorder }}>
                  <p style={{ fontSize: 9, color: midText }}>Sounds good, I'll be there!</p>
                </div>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Click an email to open it" : phase === 1 ? "Read the email content" :
            phase === 2 ? "Click Reply to respond" : phase === 3 ? "Or Forward to share it" : "Type your reply and send"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoStarArchiveDelete() {
  const t = useAnimationLoop(10000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : t < 8000 ? 3 : t < 9500 ? 4 : 0;

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.03)",
            background: phase === 1 ? "rgba(234,179,8,0.06)" : "transparent", transition: "all 0.4s",
          }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User style={{ width: 10, height: 10, color: dimText }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: brightText }}>Important Client</p>
              <p style={{ fontSize: 9, color: dimText }}>Contract renewal — please review</p>
            </div>
            <Star style={{ width: 12, height: 12, color: phase >= 1 ? "#EAB308" : "rgba(255,255,255,0.12)", fill: phase >= 1 ? "#EAB308" : "none", transition: "all 0.3s" }} />
          </div>
          <EmailRow from="Newsletter" subject="Weekly digest — 5 new articles" time="9:00 AM"
            highlighted={phase === 2} fading={phase >= 3} />
          <EmailRow from="Promo" subject="50% off — Ends today!" time="8:00 AM"
            highlighted={phase === 4} fading={phase >= 4} />
          {phase >= 2 && phase < 4 && (
            <div style={{ position: "absolute", right: 12, top: 100, display: "flex", gap: 4 }}>
              <Btn color={accentBlue} active={phase === 2}><Archive style={{ width: 10, height: 10 }} /></Btn>
            </div>
          )}
          {phase >= 4 && (
            <div style={{ position: "absolute", right: 12, top: 130, display: "flex", gap: 4 }}>
              <Btn color="#EF4444" active><Trash2 style={{ width: 10, height: 10 }} /></Btn>
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Your inbox with emails" : phase === 1 ? "Click the star to mark important" :
            phase === 2 ? "Click archive to clean up" : phase === 3 ? "Email moved to Archive" : "Click trash to delete"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoCustomFolders() {
  const t = useAnimationLoop(9000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6500 ? 3 : t < 8500 ? 4 : 0;

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <div style={{ background: sidebarBg, borderRight: subtleBorder, padding: "10px 6px", width: 130, flexShrink: 0 }}>
          <ComposeBtn />
          {[
            { icon: Inbox, label: "Inbox", active: phase === 0 },
            { icon: Send, label: "Sent" },
            { icon: Star, label: "Starred" },
          ].map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 7, fontSize: 10.5,
              color: item.active ? brightText : dimText,
              background: item.active ? "rgba(59,130,246,0.12)" : "transparent", marginBottom: 1,
            }}>
              <item.icon style={{ width: 13, height: 13 }} />
              {item.label}
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "6px 4px" }} />
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", padding: "2px 9px", letterSpacing: 1 }}>FOLDERS</div>
          {phase >= 3 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 7, fontSize: 10.5,
              color: phase >= 4 ? brightText : "#C4B5FD",
              background: phase >= 4 ? "rgba(168,85,247,0.12)" : "transparent",
              transition: "all 0.4s",
            }}>
              <FolderPlus style={{ width: 13, height: 13, color: accentPurple }} />
              Invoices
            </div>
          )}
          {phase <= 1 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: 7,
              fontSize: 10, color: accentPurple, cursor: "pointer", marginTop: 2,
              background: phase === 1 ? "rgba(168,85,247,0.1)" : "transparent", transition: "all 0.3s",
            }}>
              <Plus style={{ width: 11, height: 11 }} />
              New Folder
            </div>
          )}
        </div>
        <div style={{ flex: 1, position: "relative", padding: phase >= 2 && phase < 4 ? 10 : 0 }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="Vendor" subject="Invoice #1042 — $299.00" time="10:00 AM" unread />
              <EmailRow from="Sarah Chen" subject="Q1 Report ready" time="9:30 AM" />
            </div>
          )}
          {phase === 2 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: brightText, marginBottom: 8 }}>Create Folder</p>
              <p style={{ fontSize: 9, color: dimText, marginBottom: 3 }}>Name</p>
              <div style={{ padding: "5px 9px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.3)", fontSize: 10, color: "#C4B5FD", marginBottom: 8 }}>Invoices</div>
              <p style={{ fontSize: 9, color: dimText, marginBottom: 3 }}>AI Description</p>
              <div style={{ padding: "5px 9px", borderRadius: 6, border: subtleBorder, fontSize: 9, color: dimText }}>Invoices and payment receipts</div>
            </div>
          )}
          {phase === 3 && (
            <div style={{ textAlign: "center", paddingTop: 30 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                <Check style={{ width: 18, height: 18, color: "#22C55E" }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#86EFAC" }}>Folder created!</p>
            </div>
          )}
          {phase >= 4 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#C4B5FD" }}>Invoices</span>
              </div>
              <EmailRow from="Vendor" subject="Invoice #1042 — $299.00" time="10:00 AM" />
              <EmailRow from="Billing" subject="Receipt — Annual subscription" time="Feb 20" />
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Start in your inbox" : phase === 1 ? "Click 'New Folder' in sidebar" :
            phase === 2 ? "Name it and add AI description" : phase === 3 ? "Folder appears in sidebar!" : "AI sorts matching emails here"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoAiDraft() {
  const t = useAnimationLoop(10000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4000 ? 2 : t < 6500 ? 3 : t < 8000 ? 4 : t < 9500 ? 5 : 0;
  const draftText = "Thank you for reaching out. I'd be happy to schedule a meeting to discuss this further. Does Thursday at 2pm work for you?";
  const typedChars = phase >= 3 ? Math.min(draftText.length, Math.floor((t - 4000) / 22)) : 0;

  return (
    <Panel height={230}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="Alex Johnson" subject="Can we schedule a meeting?" time="10:30 AM" unread highlighted />
              <EmailRow from="Sarah Chen" subject="Q1 numbers look great" time="9:15 AM" />
            </div>
          )}
          {phase >= 1 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Can we schedule a meeting?</p>
                  <p style={{ fontSize: 9, color: dimText }}>From: alex@client.com</p>
                </div>
                {phase >= 1 && phase < 3 && (
                  <Btn color={accentPurple} active={phase === 2}>
                    <Sparkles style={{ width: 10, height: 10 }} />
                    AI Reply
                  </Btn>
                )}
              </div>
              <div style={{ padding: "6px 12px", fontSize: 9, color: dimText, lineHeight: 1.6 }}>
                Hi, I wanted to discuss the project timeline. Could we find a time to meet this week?
              </div>
              {phase >= 3 && (
                <div style={{ margin: "4px 10px", padding: 8, borderRadius: 8, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <Sparkles style={{ width: 9, height: 9, color: accentPurple }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#C4B5FD" }}>AI Draft</span>
                    {typedChars < draftText.length && <Loader2 style={{ width: 9, height: 9, color: accentPurple, animation: "spin 1s linear infinite" }} />}
                  </div>
                  <p style={{ fontSize: 10, color: midText, lineHeight: 1.5 }}>
                    {draftText.slice(0, typedChars)}
                    {typedChars < draftText.length && <span style={{ borderRight: `1.5px solid ${accentPurple}` }}>&nbsp;</span>}
                  </p>
                </div>
              )}
              {phase >= 4 && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 10px", gap: 5 }}>
                  <Btn color="#6B7280" active={false}>Edit</Btn>
                  <Btn color="#22C55E" active={phase === 5}>
                    <Send style={{ width: 10, height: 10 }} />
                    Send
                  </Btn>
                </div>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Click an email to open it" : phase === 1 ? "Read the email you received" :
            phase === 2 ? "Click AI Reply" : phase === 3 ? "AI writes a draft for you..." :
            phase === 4 ? "Review the draft" : "Edit if needed, then Send"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoAiCleanup() {
  const t = useAnimationLoop(10000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6500 ? 3 : t < 8000 ? 4 : t < 9500 ? 5 : 0;

  const suggestions = [
    { subject: "50% off everything!", action: "Delete", color: "#F97316" },
    { subject: "Your weekly digest", action: "Archive", color: accentBlue },
    { subject: "Win a free prize!", action: "Spam", color: "#EF4444" },
  ];

  return (
    <Panel height={220}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
                <Btn color={accentPurple} active={false}>
                  <Wand2 style={{ width: 10, height: 10 }} />
                  AI Cleanup
                </Btn>
              </div>
              <EmailRow from="Promo Store" subject="50% off everything!" time="10:00 AM" />
              <EmailRow from="Newsletter" subject="Your weekly digest" time="9:00 AM" />
              <EmailRow from="Spam Sender" subject="Win a free prize!" time="8:00 AM" />
            </div>
          )}
          {phase === 1 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
                <Btn color={accentPurple} active>
                  <Wand2 style={{ width: 10, height: 10 }} />
                  AI Cleanup
                </Btn>
              </div>
              <div style={{ textAlign: "center", paddingTop: 30 }}>
                <Loader2 style={{ width: 22, height: 22, color: accentPurple, animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 10, color: dimText }}>Scanning your inbox...</p>
              </div>
            </div>
          )}
          {phase >= 2 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
                <Wand2 style={{ width: 13, height: 13, color: accentPurple }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>AI Cleanup</span>
                <span style={{ fontSize: 9, color: dimText, marginLeft: "auto" }}>3 suggestions</span>
              </div>
              {suggestions.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "6px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  opacity: phase >= 5 ? 0.2 : 1, transform: phase >= 5 ? "translateX(30px)" : "none",
                  transition: "all 0.4s",
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center",
                    border: `1.5px solid ${accentPurple}`, background: "rgba(168,85,247,0.12)",
                  }}>
                    {(phase < 3 || i !== 1) && <Check style={{ width: 9, height: 9, color: accentPurple }} />}
                  </div>
                  <span style={{ flex: 1, fontSize: 10, color: midText }}>{item.subject}</span>
                  <span style={{ fontSize: 9, color: item.color, fontWeight: 600 }}>{item.action}</span>
                </div>
              ))}
              {phase >= 2 && phase < 5 && (
                <div style={{ padding: "8px 12px" }}>
                  <Btn color={accentPurple} active={phase === 4}>
                    <Sparkles style={{ width: 10, height: 10 }} />
                    Clean up {phase === 3 ? "2" : "3"} emails
                  </Btn>
                </div>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Click AI Cleanup in your inbox" : phase === 1 ? "AI scans your emails..." :
            phase === 2 ? "All suggestions are pre-checked" : phase === 3 ? "Uncheck any you want to keep" :
            phase === 4 ? "Click Clean up to apply" : "Inbox cleaned!"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoWritingStyle() {
  const t = useAnimationLoop(10000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : t < 8000 ? 3 : t < 9500 ? 4 : 0;

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="You" subject="Sent: RE: Project update" time="Just now" />
              <EmailRow from="You" subject="Sent: RE: Budget approval" time="Yesterday" />
              <EmailRow from="You" subject="Sent: Meeting notes" time="Mon" />
              <div style={{ padding: "6px 12px" }}>
                <p style={{ fontSize: 8, color: dimText, textAlign: "center" }}>MyDraft learns from your sent emails</p>
              </div>
            </div>
          )}
          {phase === 1 && (
            <div style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles style={{ width: 14, height: 14, color: accentPurple }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Learning Your Style</span>
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 6 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i <= 2 ? accentPurple : "rgba(255,255,255,0.08)", transition: "all 0.3s" }} />
                ))}
              </div>
              <p style={{ fontSize: 9, color: dimText, textAlign: "center" }}>2 of 3 samples collected</p>
              <p style={{ fontSize: 8, color: dimText, textAlign: "center", marginTop: 4 }}>Send one more email to build your profile</p>
            </div>
          )}
          {phase === 2 && (
            <div style={{ padding: 14, textAlign: "center" }}>
              <Loader2 style={{ width: 22, height: 22, color: accentPurple, animation: "spin 1s linear infinite", margin: "12px auto 8px" }} />
              <p style={{ fontSize: 10, color: midText }}>Analyzing your writing patterns...</p>
              <p style={{ fontSize: 8, color: dimText, marginTop: 4 }}>Sentence length, tone, vocabulary, greetings</p>
            </div>
          )}
          {phase >= 3 && (
            <div style={{ padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Sparkles style={{ width: 14, height: 14, color: accentPurple }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Your Style Profile</span>
              </div>
              <div style={{ padding: 8, borderRadius: 8, background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.12)" }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "Tone", value: "Professional, warm" },
                    { label: "Greetings", value: "\"Hi [Name],\"" },
                    { label: "Sign-off", value: "\"Best regards\"" },
                    { label: "Style", value: "Concise, clear" },
                  ].map((item, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 8, color: dimText }}>{item.label}</p>
                      <p style={{ fontSize: 9, color: "#C4B5FD", fontWeight: 600 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {phase >= 4 && (
                <p style={{ fontSize: 8, color: "#86EFAC", textAlign: "center", marginTop: 6 }}>AI drafts will now match your writing voice</p>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Send emails as you normally would" : phase === 1 ? "AI collects writing samples" :
            phase === 2 ? "Analyzing your patterns..." : phase === 3 ? "Style profile is built!" : "Future drafts sound like you"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoTranslate() {
  const t = useAnimationLoop(9000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4000 ? 2 : t < 6000 ? 3 : t < 8000 ? 4 : 0;
  const translated = "Hello! I would like to discuss our partnership. Are you available next week?";
  const typedChars = phase >= 3 ? Math.min(translated.length, Math.floor((t - 4000) / 25)) : 0;

  return (
    <Panel height={220}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          {phase === 0 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Inbox</span>
              </div>
              <EmailRow from="Tanaka-san" subject={"\u3053\u3093\u306B\u3061\u306F \u2014 Partnership"} time="10:00 AM" unread highlighted />
              <EmailRow from="Sarah Chen" subject="Q1 Report" time="9:15 AM" />
            </div>
          )}
          {phase >= 1 && (
            <div>
              <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Partnership Discussion</p>
                  <p style={{ fontSize: 9, color: dimText }}>From: tanaka@company.co.jp</p>
                </div>
                <Btn color={accentBlue} active={phase === 2}>
                  <Languages style={{ width: 10, height: 10 }} />
                  Translate
                </Btn>
              </div>
              <div style={{ padding: "6px 12px", fontSize: 9, color: dimText, lineHeight: 1.6 }}>
                {"\u3053\u3093\u306B\u3061\u306F\uFF01\u79C1\u305F\u3061\u306E\u30D1\u30FC\u30C8\u30CA\u30FC\u30B7\u30C3\u30D7\u306B\u3064\u3044\u3066\u8A71\u3057\u5408\u3044\u305F\u3044\u3068\u601D\u3044\u307E\u3059\u3002\u6765\u9031\u306E\u3054\u90FD\u5408\u306F\u3044\u304B\u304C\u3067\u3057\u3087\u3046\u304B\uFF1F"}
              </div>
              {phase >= 3 && (
                <div style={{ margin: "4px 10px", padding: 8, borderRadius: 8, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <Globe style={{ width: 9, height: 9, color: "#60A5FA" }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#93C5FD" }}>English Translation</span>
                  </div>
                  <p style={{ fontSize: 10, color: midText, lineHeight: 1.5 }}>
                    {translated.slice(0, typedChars)}
                    {typedChars < translated.length && <span style={{ borderRight: "1.5px solid " + accentBlue }}>&nbsp;</span>}
                  </p>
                  {phase >= 4 && (
                    <div style={{ marginTop: 6, padding: "4px 8px", borderRadius: 6, background: "rgba(59,130,246,0.06)", fontSize: 8, color: "#93C5FD" }}>
                      Cultural note: Japanese business emails use formal keigo. Consider a respectful tone in your reply.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Open a foreign language email" : phase === 1 ? "Read the original content" :
            phase === 2 ? "Click Translate" : phase === 3 ? "Translation appears below..." : "Cultural notes help you reply"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoBilling() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5500 ? 2 : t < 7500 ? 3 : 0;

  return (
    <Panel height={200}>
      <div style={{ padding: "10px 16px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
        <Settings style={{ width: 13, height: 13, color: accentBlue }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Settings</span>
        <ChevronRight style={{ width: 10, height: 10, color: dimText }} />
        <span style={{ fontSize: 11, color: accentBlue }}>Billing</span>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 14px" }}>
        {[
          { name: "Free", price: "$0", color: "#6B7280", features: ["5 AI drafts/day"] },
          { name: "Pro", price: "$10/mo", color: accentBlue, features: ["100 AI drafts/day", "Style learning"] },
          { name: "Business", price: "$29/mo", color: "#F59E0B", features: ["Unlimited AI", "Enhanced quality"] },
        ].map((plan, i) => (
          <div key={i} style={{
            flex: 1, padding: 8, borderRadius: 10, textAlign: "center",
            background: (phase === 1 && i === 1) || (phase === 2 && i === 2) ? `${plan.color}15` : "rgba(255,255,255,0.02)",
            border: `1.5px solid ${(phase === 1 && i === 1) || (phase === 2 && i === 2) ? `${plan.color}40` : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.3s", transform: (phase === 1 && i === 1) || (phase === 2 && i === 2) ? "scale(1.03)" : "scale(1)",
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: plan.color }}>{plan.name}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: midText, margin: "3px 0" }}>{plan.price}</p>
            {plan.features.map((f, j) => (
              <p key={j} style={{ fontSize: 7.5, color: dimText }}>{f}</p>
            ))}
          </div>
        ))}
      </div>
      {phase >= 3 && (
        <div style={{ textAlign: "center", padding: "0 14px" }}>
          <Btn color="#22C55E" active>
            <Check style={{ width: 10, height: 10 }} />
            Plan updated!
          </Btn>
        </div>
      )}
      <StepLabel text={
        phase === 0 ? "Go to Settings > Billing" : phase === 1 ? "Compare plans" :
        phase === 2 ? "Select the plan you want" : "Subscription updated!"
      } />
    </Panel>
  );
}

export function DemoReferral() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 4000 ? 1 : t < 6000 ? 2 : t < 7500 ? 3 : 0;

  return (
    <Panel height={195}>
      <div style={{ padding: "10px 16px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
        <Settings style={{ width: 13, height: 13, color: accentBlue }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Settings</span>
        <ChevronRight style={{ width: 10, height: 10, color: dimText }} />
        <span style={{ fontSize: 11, color: accentPurple }}>Referrals</span>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Gift style={{ width: 14, height: 14, color: accentPurple }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Give Pro, Get Pro</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <div style={{ flex: 1, padding: "5px 9px", borderRadius: 6, border: subtleBorder, fontSize: 10, color: dimText }}>
            mydraft.io/ref/ABC123
          </div>
          <Btn color={accentBlue} active={phase === 1}>
            <Copy style={{ width: 10, height: 10 }} />
            Copy
          </Btn>
        </div>
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: dimText }}>Progress to next reward</span>
            <span style={{ fontSize: 9, color: accentPurple }}>{phase >= 2 ? "1" : "0"}/2 referrals</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
            <div style={{ height: 5, borderRadius: 3, background: `linear-gradient(90deg, ${accentPurple}, #6366F1)`, width: phase >= 2 ? "50%" : "0%", transition: "width 0.6s" }} />
          </div>
        </div>
        {phase >= 3 && (
          <p style={{ fontSize: 9, color: "#86EFAC", textAlign: "center", marginTop: 6 }}>1 more referral = 1 free month of Pro!</p>
        )}
      </div>
      <StepLabel text={
        phase === 0 ? "Go to Settings > Referrals" : phase === 1 ? "Copy your unique link and share it" :
        phase === 2 ? "Track your referral progress" : "Every 2 referrals = 1 free month!"
      } />
    </Panel>
  );
}

export function DemoDeleteAccount() {
  const t = useAnimationLoop(9000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : t < 7500 ? 4 : t < 8500 ? 5 : 0;

  return (
    <Panel height={200}>
      <div style={{ padding: "10px 16px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
        <Settings style={{ width: 13, height: 13, color: accentBlue }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Settings</span>
        <ChevronRight style={{ width: 10, height: 10, color: dimText }} />
        <span style={{ fontSize: 11, color: phase >= 1 ? accentBlue : dimText }}>Account</span>
      </div>
      <div style={{ padding: "10px 14px", position: "relative" }}>
        {phase <= 2 && (
          <>
            <div style={{ padding: 8, borderRadius: 7, border: subtleBorder, marginBottom: 6 }}>
              <p style={{ fontSize: 9, color: dimText }}>Email: user@email.com</p>
            </div>
            <div style={{ padding: 8, borderRadius: 7, border: subtleBorder, marginBottom: 10 }}>
              <p style={{ fontSize: 9, color: dimText }}>Plan: Pro</p>
            </div>
            <p style={{ fontSize: 9, fontWeight: 600, color: "#EF4444", marginBottom: 5 }}>Danger Zone</p>
            <Btn color="#EF4444" active={phase === 2}>
              <Trash2 style={{ width: 10, height: 10 }} />
              Delete Account
            </Btn>
          </>
        )}
        {phase >= 3 && phase < 6 && (
          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,68,68,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Shield style={{ width: 18, height: 18, color: "#EF4444" }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, color: brightText, marginBottom: 3 }}>Delete your account?</p>
            <p style={{ fontSize: 8, color: dimText, marginBottom: 10 }}>This permanently removes all your data</p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <Btn color="#6B7280" active={false}>Cancel</Btn>
              <Btn color="#EF4444" active={phase === 4}>
                <Trash2 style={{ width: 10, height: 10 }} />
                Confirm Delete
              </Btn>
            </div>
          </div>
        )}
      </div>
      <StepLabel text={
        phase === 0 ? "Go to Settings > Account" : phase === 1 ? "Scroll down to Danger Zone" :
        phase === 2 ? "Click Delete Account" : phase === 3 ? "Confirmation dialog appears" :
        phase === 4 ? "Click Confirm to delete permanently" : "Account deleted"
      } />
    </Panel>
  );
}

export function DemoSecurity() {
  const t = useAnimationLoop(8000);
  const phase = t < 2000 ? 0 : t < 3500 ? 1 : t < 5000 ? 2 : t < 6500 ? 3 : t < 7500 ? 4 : 0;

  return (
    <Panel height={200}>
      <div style={{ padding: "10px 16px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
        <Settings style={{ width: 13, height: 13, color: accentBlue }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Settings</span>
        <ChevronRight style={{ width: 10, height: 10, color: dimText }} />
        <span style={{ fontSize: 11, color: accentBlue }}>Security</span>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 7, border: subtleBorder, marginBottom: 8 }}>
          <Lock style={{ width: 13, height: 13, color: "#60A5FA" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, color: midText }}>Two-Factor Authentication</p>
            <p style={{ fontSize: 8, color: dimText }}>Extra security for your account</p>
          </div>
          <div style={{
            width: 30, height: 16, borderRadius: 8, padding: 2,
            background: phase >= 2 ? "#22C55E" : "rgba(255,255,255,0.1)",
            transition: "all 0.3s", display: "flex", alignItems: "center",
            justifyContent: phase >= 2 ? "flex-end" : "flex-start",
          }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "white", transition: "all 0.3s" }} />
          </div>
        </div>
        {phase >= 2 && phase < 4 && (
          <div style={{ padding: 8, borderRadius: 7, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Shield style={{ width: 12, height: 12, color: "#22C55E" }} />
              <p style={{ fontSize: 9, color: "#86EFAC" }}>
                {phase === 2 ? "Scan QR code with your authenticator app..." : "2FA enabled! Your account is more secure."}
              </p>
            </div>
          </div>
        )}
        {phase >= 4 && (
          <div style={{ padding: 8, borderRadius: 7, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check style={{ width: 12, height: 12, color: "#22C55E" }} />
              <p style={{ fontSize: 9, color: "#86EFAC" }}>2FA is active. You'll need a code when logging in.</p>
            </div>
          </div>
        )}
      </div>
      <StepLabel text={
        phase === 0 ? "Go to Settings > Security" : phase === 1 ? "Find Two-Factor Authentication" :
        phase === 2 ? "Toggle it on" : phase === 3 ? "Set up your authenticator app" : "2FA is now enabled!"
      } />
    </Panel>
  );
}

export function DemoSignature() {
  const t = useAnimationLoop(7000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 5000 ? 2 : t < 6500 ? 3 : 0;
  const sig = "Best regards,\nJohn Smith\nProduct Manager | Acme Corp";

  return (
    <Panel height={190}>
      <div style={{ padding: "10px 16px", borderBottom: subtleBorder, display: "flex", alignItems: "center", gap: 6 }}>
        <Settings style={{ width: 13, height: 13, color: accentBlue }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>Settings</span>
        <ChevronRight style={{ width: 10, height: 10, color: dimText }} />
        <span style={{ fontSize: 11, color: accentBlue }}>Email</span>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: midText, marginBottom: 5 }}>Email Signature</p>
        <div style={{ padding: 8, borderRadius: 7, border: subtleBorder, minHeight: 45, fontSize: 10 }}>
          {phase >= 1 ? sig.split("\n").map((line, i) => (
            <p key={i} style={{ color: midText, lineHeight: 1.5 }}>{line}</p>
          )) : <span style={{ color: "rgba(255,255,255,0.12)" }}>Add your signature...</span>}
        </div>
        {phase >= 2 && (
          <div style={{ marginTop: 8 }}>
            <Btn color="#22C55E" active={phase === 2}>
              <Check style={{ width: 10, height: 10 }} />
              {phase === 2 ? "Save" : "Saved!"}
            </Btn>
          </div>
        )}
        {phase >= 3 && (
          <p style={{ fontSize: 8, color: "#86EFAC", marginTop: 5 }}>Your signature will be added to all outgoing emails automatically.</p>
        )}
      </div>
      <StepLabel text={
        phase === 0 ? "Go to Settings > Email" : phase === 1 ? "Type your signature" :
        phase === 2 ? "Click Save" : "Auto-added to every email you send"
      } />
    </Panel>
  );
}

export function DemoSearch() {
  const t = useAnimationLoop(8000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : t < 7500 ? 4 : 0;
  const query = "quarterly report";
  const typedChars = phase >= 2 ? Math.min(query.length, Math.floor((t - 3000) / 80)) : 0;

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ padding: "8px 12px" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 8,
              border: phase >= 1 ? "1px solid rgba(59,130,246,0.3)" : subtleBorder,
              background: "rgba(255,255,255,0.02)", transition: "all 0.3s",
            }}>
              <Search style={{ width: 13, height: 13, color: phase >= 1 ? "#60A5FA" : dimText }} />
              <span style={{ fontSize: 10.5, color: typedChars > 0 ? midText : "rgba(255,255,255,0.18)" }}>
                {typedChars > 0 ? query.slice(0, typedChars) : "Search emails..."}
              </span>
            </div>
          </div>
          {phase < 2 && (
            <div>
              <EmailRow from="Sarah Chen" subject="Q1 Report ready" time="10:30 AM" unread />
              <EmailRow from="Newsletter" subject="Weekly digest" time="9:00 AM" />
            </div>
          )}
          {phase >= 3 && (
            <div style={{ padding: "0 8px" }}>
              {[
                { from: "Finance Team", subject: "Quarterly Report Q4 — Final", time: "Feb 15" },
                { from: "Sarah Chen", subject: "RE: Quarterly Report Review", time: "Feb 10" },
                { from: "Alex Johnson", subject: "Q3 Quarterly Summary attached", time: "Jan 28" },
              ].map((r, i) => (
                <EmailRow key={i} from={r.from} subject={r.subject} time={r.time} highlighted={phase === 4 && i === 0} />
              ))}
            </div>
          )}
          <StepLabel text={
            phase === 0 ? "Your inbox with emails" : phase === 1 ? "Click the search bar" :
            phase === 2 ? "Type what you're looking for" : phase === 3 ? "Results appear instantly" : "Click to open the email"
          } />
        </div>
      </div>
    </Panel>
  );
}

export function DemoMultiSelect() {
  const t = useAnimationLoop(8000);
  const phase = t < 1500 ? 0 : t < 3000 ? 1 : t < 4500 ? 2 : t < 6000 ? 3 : t < 7500 ? 4 : 0;
  const selected = phase >= 1 ? [0] : [];
  if (phase >= 2) { selected.push(1); selected.push(2); }

  return (
    <Panel height={210}>
      <div className="flex" style={{ height: "100%" }}>
        <Sidebar activeIndex={0}>
          <ComposeBtn />
        </Sidebar>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={{ padding: "8px 12px", borderBottom: subtleBorder, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: brightText }}>
              {phase >= 2 ? `${selected.length} selected` : "Inbox"}
            </span>
            {phase >= 2 && (
              <div style={{ display: "flex", gap: 4 }}>
                <Btn color={accentBlue} active={phase === 3}><Archive style={{ width: 10, height: 10 }} /> Archive</Btn>
                <Btn color="#EF4444" active={false}><Trash2 style={{ width: 10, height: 10 }} /> Delete</Btn>
              </div>
            )}
          </div>
          {["Newsletter — Weekly digest", "Promo — Sale ends today", "System — Notification update"].map((subj, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              background: selected.includes(i) ? "rgba(59,130,246,0.06)" : "transparent",
              opacity: phase >= 4 && selected.includes(i) ? 0.2 : 1,
              transform: phase >= 4 && selected.includes(i) ? "translateX(30px)" : "none",
              transition: "all 0.4s",
            }}>
              <div style={{
                width: 15, height: 15, borderRadius: 4,
                border: selected.includes(i) ? `1.5px solid ${accentBlue}` : "1.5px solid rgba(255,255,255,0.1)",
                background: selected.includes(i) ? "rgba(59,130,246,0.15)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s",
              }}>
                {selected.includes(i) && <Check style={{ width: 9, height: 9, color: "#60A5FA" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: midText }}>{subj}</p>
              </div>
            </div>
          ))}
          <StepLabel text={
            phase === 0 ? "Your inbox with emails" : phase === 1 ? "Long-press to select the first email" :
            phase === 2 ? "Tap more to add to selection" : phase === 3 ? "Click Archive or Delete" : "All selected emails processed!"
          } />
        </div>
      </div>
    </Panel>
  );
}

export const demoMap: Record<string, () => JSX.Element> = {
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
  "multilingual": DemoTranslate,
  "plans-pricing": DemoBilling,
  "upgrade-plan": DemoBilling,
  "referral-program": DemoReferral,
  "delete-account": DemoDeleteAccount,
  "two-factor-auth": DemoSecurity,
  "email-signature": DemoSignature,
  "search-inbox": DemoSearch,
  "select-multiple": DemoMultiSelect,
};
