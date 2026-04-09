/**
 * chatbot.js — Romal's AI Assistant widget
 * Drop into any page. Requires chatbot.css.
 *
 * Config: set CHATBOT_API_URL below to your deployed Vercel function URL.
 */

(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────────────
  const CONFIG = {
    API_URL: "https://YOUR-PROJECT.vercel.app/api/chat", // ← update after deploying
    BOT_NAME: "Romal's AI Assistant",
    BOT_INITIAL: "R",   // avatar initials
    USER_INITIAL: "You",
    SUGGESTIONS: [
      "What's your experience?",
      "What projects have you worked on?",
      "Tell me about your current role as a Researcher",
      "Provide me your CV",
    ],
    WELCOME_MESSAGE:
      "Hi there! 👋 I'm Romal's AI assistant. I can tell you about his research, projects, skills, and experience. What would you like to know?",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = []; // { role: 'user'|'assistant', content: string }[]

  // ── Build DOM ──────────────────────────────────────────────────────────────
  function buildWidget() {
    // Inject CSS link if not already present
    if (!document.getElementById("cb-styles")) {
      const link = document.createElement("link");
      link.id = "cb-styles";
      link.rel = "stylesheet";
      // Resolve CSS path relative to this script's location
      const scriptSrc =
        document.currentScript?.src ||
        [...document.querySelectorAll("script")].slice(-1)[0]?.src ||
        "";
      link.href = scriptSrc.replace(/chatbot\.js$/, "chatbot.css");
      document.head.appendChild(link);
    }

    // ── Bubble button ──
    const bubble = el("button", { id: "cb-bubble", "aria-label": "Open chat" }, `
      <svg class="cb-icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="cb-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    `);

    // ── Chat window ──
    const win = el("div", { id: "cb-window", role: "dialog", "aria-label": "Chat with Romal's AI Assistant", "aria-modal": "false" }, `
      <div id="cb-header">
        <div id="cb-avatar">${CONFIG.BOT_INITIAL}</div>
        <div id="cb-header-text">
          <div id="cb-header-name">${CONFIG.BOT_NAME}</div>
          <div id="cb-header-status">Online · portfolio assistant</div>
        </div>
      </div>

      <div id="cb-messages" role="log" aria-live="polite" aria-label="Conversation"></div>

      <div id="cb-input-area">
        <textarea
          id="cb-input"
          placeholder="Ask about Romal's work…"
          rows="1"
          aria-label="Your message"
          autocomplete="off"
          spellcheck="true"
        ></textarea>
        <button id="cb-send" aria-label="Send message" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      <div id="cb-footer">Powered by GPT-4o mini · answers based on Romal's CV</div>
    `);

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    // ── Wire up events ──
    bubble.addEventListener("click", toggleChat);

    const input = document.getElementById("cb-input");
    const sendBtn = document.getElementById("cb-send");

    input.addEventListener("input", () => {
      autoResize(input);
      sendBtn.disabled = input.value.trim() === "" || isLoading;
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) handleSend();
      }
    });

    sendBtn.addEventListener("click", handleSend);

    // Render welcome message + suggestions
    appendBotMessage(CONFIG.WELCOME_MESSAGE);
    renderSuggestions();
  }

  // ── Toggle open/close ──────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    const bubble = document.getElementById("cb-bubble");
    const win = document.getElementById("cb-window");
    bubble.classList.toggle("is-open", isOpen);
    win.classList.toggle("is-open", isOpen);
    win.setAttribute("aria-modal", isOpen ? "true" : "false");

    if (isOpen) {
      setTimeout(() => document.getElementById("cb-input")?.focus(), 280);
    }
  }

  // ── Render suggested questions ─────────────────────────────────────────────
  function renderSuggestions() {
    const msgs = document.getElementById("cb-messages");
    const container = el("div", { id: "cb-suggestions" });
    CONFIG.SUGGESTIONS.forEach((q) => {
      const btn = el("button", { class: "cb-suggestion" }, escHtml(q));
      btn.addEventListener("click", () => {
        // Remove suggestions once one is clicked
        container.remove();
        sendMessage(q);
      });
      container.appendChild(btn);
    });
    msgs.appendChild(container);
    scrollToBottom();
  }

  // ── Message helpers ────────────────────────────────────────────────────────
  function appendBotMessage(text, isError = false) {
    const msgs = document.getElementById("cb-messages");
    const div = el(
      "div",
      { class: `cb-msg bot${isError ? " cb-error" : ""}` },
      `<div class="cb-msg-avatar">${CONFIG.BOT_INITIAL}</div>
       <div class="cb-msg-bubble">${formatText(text)}</div>`
    );
    msgs.appendChild(div);
    scrollToBottom();
    return div;
  }

  function appendUserMessage(text) {
    const msgs = document.getElementById("cb-messages");
    const div = el(
      "div",
      { class: "cb-msg user" },
      `<div class="cb-msg-bubble">${escHtml(text)}</div>
       <div class="cb-msg-avatar">${CONFIG.USER_INITIAL.charAt(0)}</div>`
    );
    msgs.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    const msgs = document.getElementById("cb-messages");
    const div = el(
      "div",
      { id: "cb-typing", class: "cb-msg bot cb-typing" },
      `<div class="cb-msg-avatar">${CONFIG.BOT_INITIAL}</div>
       <div class="cb-msg-bubble"><div class="cb-dots"><span></span><span></span><span></span></div></div>`
    );
    msgs.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    document.getElementById("cb-typing")?.remove();
  }

  function scrollToBottom() {
    const msgs = document.getElementById("cb-messages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Send flow ──────────────────────────────────────────────────────────────
  function handleSend() {
    const input = document.getElementById("cb-input");
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Remove suggestions if still visible
    document.getElementById("cb-suggestions")?.remove();

    input.value = "";
    autoResize(input);
    document.getElementById("cb-send").disabled = true;

    sendMessage(text);
  }

  async function sendMessage(userText) {
    appendUserMessage(userText);

    // Add to history
    conversationHistory.push({ role: "user", content: userText });

    isLoading = true;
    showTyping();

    try {
      const response = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory }),
      });

      removeTyping();

      if (!response.ok) {
        let errMsg = "Something went wrong. Please try again.";
        try {
          const err = await response.json();
          if (err.error) errMsg = err.error;
        } catch {}
        appendBotMessage(errMsg, true);
        // Remove the last user message from history so they can retry cleanly
        conversationHistory.pop();
        return;
      }

      const data = await response.json();
      const reply = data.reply || "Sorry, I didn't get a response. Please try again.";

      conversationHistory.push({ role: "assistant", content: reply });
      appendBotMessage(reply);
    } catch (err) {
      removeTyping();
      appendBotMessage(
        "Network error — please check your connection and try again.",
        true
      );
      conversationHistory.pop();
    } finally {
      isLoading = false;
      const input = document.getElementById("cb-input");
      if (input) {
        document.getElementById("cb-send").disabled = input.value.trim() === "";
      }
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  function el(tag, attrs = {}, html = "") {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    node.innerHTML = html;
    return node;
  }

  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Very light markdown → HTML (bold, italic, line breaks, links)
  function formatText(text) {
    return escHtml(text)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--cb-terracotta);text-decoration:underline;">$1</a>'
      )
      .replace(/\n/g, "<br>");
  }

  function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
