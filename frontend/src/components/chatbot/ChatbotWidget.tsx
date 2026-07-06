import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  findBestMatch,
  getEntriesByIds,
  getStarterQuestions,
  type KBEntry,
  type KBRole,
} from "./knowledgeBase";
import "./chatbot.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageRole = "user" | "bot";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  followUps?: KBEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

/** Detect user role based on current URL path */
function detectRole(pathname: string): KBRole {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/provider")) return "provider";
  return "customer";
}

/** Convert markdown-lite text to JSX */
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;


  for (const line of lines) {
    if (line.trim() === "") {
      elements.push(<div key={key++} className="hf-spacer" style={{ height: 4 }} />);
      continue;
    }

    // Bold **text**
    const boldParsed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Table row
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.split("|").filter((c) => c.trim() !== "");
      const isSeparator = cells.every((c) => /^[-: ]+$/.test(c));
      if (isSeparator) continue;
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 2 }}>
          {cells.map((cell, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: "#1E293B",
                flex: 1,
                fontWeight: cell === cells[0] ? 600 : 400,
              }}
              dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
            />
          ))}
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      elements.push(
        <p
          key={key++}
          style={{ margin: "2px 0", paddingLeft: 16, fontSize: 12.5, lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: boldParsed }}
        />
      );
      continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("✅ ") || line.startsWith("⚠️ ") || line.startsWith("💡 ") || line.startsWith("📍 ") || line.startsWith("📧 ") || line.startsWith("📅 ") || line.startsWith("📌 ") || line.startsWith("📝 ") || line.startsWith("📋 ") || line.startsWith("📸 ") || line.startsWith("📈 ") || line.startsWith("📊 ") || line.startsWith("📢 ") || line.startsWith("💳 ") || line.startsWith("💰 ") || line.startsWith("⭐ ") || line.startsWith("🔒 ") || line.startsWith("🎛️ ") || line.startsWith("🔍 ") || line.startsWith("🗑️ ") || line.startsWith("🚫 ") || line.startsWith("❌ ") || line.startsWith("✉️ ") || line.startsWith("🟢 ") || line.startsWith("🤖 ") || line.startsWith("🔐 ") || line.startsWith("⏰ ") || line.startsWith("⏳ ") || line.startsWith("➕ ") || line.startsWith("✏️ ") || line.startsWith("⚡ ") || line.startsWith("🔄 ") || line.startsWith("🔧 ") || line.startsWith("💬 ") || line.startsWith("🌿 ") || line.startsWith("🪚 ") || line.startsWith("🖌️ ") || line.startsWith("🧹 ") || line.startsWith("❄️ ") || line.startsWith("🧱 ") || line.startsWith("🏠 ") || line.startsWith("🔌 ") || line.startsWith("🐛 ") || line.startsWith("🛠️ ")) {
      elements.push(
        <p
          key={key++}
          style={{ margin: "2px 0", paddingLeft: 8, fontSize: 12.5, lineHeight: 1.55 }}
          dangerouslySetInnerHTML={{ __html: boldParsed }}
        />
      );
      continue;
    }

    // Normal paragraph
    elements.push(
      <p
        key={key++}
        style={{ margin: "2px 0", fontSize: 12.5, lineHeight: 1.6 }}
        dangerouslySetInnerHTML={{ __html: boldParsed }}
      />
    );
  }

  return <div>{elements}</div>;
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="hf-message" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1F3A63, #2d4a7a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 13,
        }}
      >
        🤖
      </div>
      <div
        style={{
          background: "rgba(31, 58, 99, 0.07)",
          borderRadius: "4px 14px 14px 14px",
          padding: "10px 14px",
          display: "flex",
          gap: 5,
          alignItems: "center",
        }}
      >
        <span className="hf-dot" />
        <span className="hf-dot" />
        <span className="hf-dot" />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onFollowUp: (entry: KBEntry) => void;
}

function MessageBubble({ message, onFollowUp }: MessageBubbleProps) {
  const isBot = message.role === "bot";

  return (
    <div className="hf-message" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          flexDirection: isBot ? "row" : "row-reverse",
        }}
      >
        {/* Avatar */}
        {isBot && (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1F3A63, #2d4a7a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 13,
            }}
          >
            🤖
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            maxWidth: "78%",
            padding: "10px 14px",
            borderRadius: isBot ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
            background: isBot ? "rgba(31, 58, 99, 0.07)" : "linear-gradient(135deg, #F97316, #fb923c)",
            color: isBot ? "#1E293B" : "#ffffff",
            boxShadow: isBot
              ? "0 1px 3px rgba(31,58,99,0.08)"
              : "0 2px 8px rgba(249,115,22,0.35)",
          }}
        >
          {isBot ? renderMarkdown(message.text) : (
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{message.text}</p>
          )}
        </div>
      </div>

      {/* Follow-up chips */}
      {isBot && message.followUps && message.followUps.length > 0 && (
        <div style={{ paddingLeft: 36, display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
          {message.followUps.map((entry) => (
            <button
              key={entry.id}
              className="hf-chip"
              onClick={() => onFollowUp(entry)}
            >
              {entry.question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

const FALLBACK_ANSWER =
  "I'm not sure about that specific question. 🤔\n\nHere are some things I can help you with:\n- **Posting & managing jobs**\n- **Provider verification & bidding**\n- **Admin panel features**\n- **Payments & reviews**\n\nFor direct help, email **support@homefixr.com**.";

const GREETING_BY_ROLE: Record<KBRole, string> = {
  all: "👋 Hi! I'm the **HomeFixr Assistant**.\n\nI can answer questions about posting jobs, bidding, payments, provider verification, and more. What would you like to know?",
  customer: "👋 Hi there! I'm the **HomeFixr Assistant**.\n\nI can help you post jobs, understand bidding, manage payments, and more. What would you like to know?",
  provider: "👋 Welcome, provider! I'm the **HomeFixr Assistant**.\n\nI can help with profile setup, verification, bidding on jobs, managing your availability, and more. What would you like to know?",
  admin: "👋 Hello, Admin! I'm the **HomeFixr Assistant**.\n\nI can guide you through managing users, providers, payments, verification, settings, and all other admin panel features. What do you need help with?",
};

export function ChatbotWidget() {
  const location = useLocation();
  const role = detectRole(location.pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Show tooltip pulse after 4 seconds on first load
  useEffect(() => {
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 4000);
    return () => {
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    };
  }, []);

  const addBotMessage = useCallback(
    (text: string, followUpIds?: string[]) => {
      const followUps = followUpIds ? getEntriesByIds(followUpIds) : [];
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: "bot",
          text,
          timestamp: new Date(),
          followUps,
        },
      ]);
    },
    []
  );

  // Open chat and greet
  const handleOpen = () => {
    setIsOpen(true);
    setShowTooltip(false);
    if (!hasGreeted) {
      setHasGreeted(true);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const starters = getStarterQuestions(role);
        addBotMessage(GREETING_BY_ROLE[role], starters.map((s) => s.id));
      }, 900);
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleSend = (text: string = input.trim()) => {
    if (!text) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "user", text, timestamp: new Date() },
    ]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay then respond
    setTimeout(
      () => {
        setIsTyping(false);
        const match = findBestMatch(text);
        if (match) {
          addBotMessage(match.answer, match.followUps);
        } else {
          // Fallback
          const starters = getStarterQuestions(role);
          addBotMessage(FALLBACK_ANSWER, starters.map((s) => s.id));
        }
      },
      700 + Math.random() * 500
    );
  };

  const handleFollowUp = (entry: KBEntry) => {
    setMessages((prev) => [
      ...prev,
      { id: genId(), role: "user", text: entry.question, timestamp: new Date() },
    ]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(entry.answer, entry.followUps);
    }, 600 + Math.random() * 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <>
      {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="hf-panel"
          role="dialog"
          aria-label="HomeFixr Assistant"
          style={{
            position: "fixed",
            bottom: 88,
            right: 20,
            width: 380,
            maxHeight: "calc(100vh - 120px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 20px 60px -10px rgba(31, 58, 99, 0.3), 0 0 0 1px rgba(31,58,99,0.08)",
            background: "#ffffff",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #1F3A63 0%, #2d4a7a 100%)",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#fff", lineHeight: 1.2 }}>
                HomeFixr Assistant
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                ● Online — ask me anything
              </p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close chat"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            >
              ✕
            </button>
          </div>

          {/* Role badge */}
          {role !== "all" && (
            <div
              style={{
                background: "rgba(31,58,99,0.04)",
                borderBottom: "1px solid rgba(31,58,99,0.08)",
                padding: "6px 18px",
                fontSize: 11,
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  background: role === "admin" ? "#1F3A63" : role === "provider" ? "#22C55E" : "#F97316",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {role}
              </span>
              <span>mode — showing relevant help</span>
            </div>
          )}

          {/* Messages */}
          <div
            className="hf-messages-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} onFollowUp={handleFollowUp} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div
            style={{
              borderTop: "1px solid rgba(31,58,99,0.08)",
              padding: "12px 14px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about HomeFixr…"
              aria-label="Chat input"
              style={{
                flex: 1,
                border: "1.5px solid #E2E8F0",
                borderRadius: 12,
                padding: "9px 14px",
                fontSize: 12.5,
                outline: "none",
                color: "#1E293B",
                background: "#F8FAFC",
                transition: "border-color 0.15s",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#F97316")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              aria-label="Send message"
              style={{
                background:
                  !input.trim() || isTyping
                    ? "#E2E8F0"
                    : "linear-gradient(135deg, #F97316, #fb923c)",
                border: "none",
                borderRadius: 12,
                width: 38,
                height: 38,
                cursor: !input.trim() || isTyping ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
                boxShadow:
                  !input.trim() || isTyping ? "none" : "0 2px 8px rgba(249,115,22,0.35)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={!input.trim() || isTyping ? "#94A3B8" : "#fff"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Footer branding */}
          <div
            style={{
              textAlign: "center",
              padding: "6px 14px 10px",
              fontSize: 10,
              color: "#94A3B8",
              background: "#fff",
              flexShrink: 0,
            }}
          >
            Powered by <strong style={{ color: "#1F3A63" }}>HomeFixr AI</strong>
          </div>
        </div>
      )}

      {/* ── Floating Action Button ──────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9998 }}>
        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              right: 0,
              background: "#1F3A63",
              color: "#fff",
              borderRadius: 10,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              boxShadow: "0 4px 16px rgba(31,58,99,0.3)",
              animation: "hf-msg-in 0.2s ease-out both",
              cursor: "pointer",
            }}
            onClick={handleOpen}
          >
            💬 Need help? Ask me!
            <div
              style={{
                position: "absolute",
                bottom: -6,
                right: 18,
                width: 12,
                height: 12,
                background: "#1F3A63",
                transform: "rotate(45deg)",
                borderRadius: 2,
              }}
            />
          </div>
        )}

        <button
          id="homefixr-chatbot-btn"
          className={!isOpen ? "hf-chat-fab" : undefined}
          onClick={isOpen ? handleClose : handleOpen}
          aria-label={isOpen ? "Close chat" : "Open HomeFixr Assistant"}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isOpen
              ? "linear-gradient(135deg, #1F3A63, #2d4a7a)"
              : "linear-gradient(135deg, #F97316, #fb923c)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(31,58,99,0.3)",
            transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            color: "#fff",
          }}
        >
          {isOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
