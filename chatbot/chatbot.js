/**
 * chatbot.js — Romal's AI Assistant widget
 * Drop into any page. Requires chatbot.css.
 */

(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────────────
  const CONFIG = {
    API_URL: "https://chatbot-backend-bq3a.vercel.app/api/chat",
    BOT_NAME: "Romal's AI Assistant",
    BOT_INITIAL: "R",
    USER_INITIAL: "You",
    CV_URL: "https://romalthakkar.cv",
    // CV-related keywords that trigger the View CV button
    CV_KEYWORDS: ["cv", "curriculum vitae", "resume", "résumé", "download cv", "view cv", "provide", "share cv"],
    SUGGESTIONS: [
      "Tell me about his current role at Insight Research Centre.",
      "What recent projects has he worked on?",
      "Provide me his CV!",
    ],
    WELCOME_MESSAGE:
      "Hi there! I'm Romal's AI assistant. I can tell you about his research, projects, skills, and experience. What are you curious about?",
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];
  let bubbleShrunk = false;

  // ── Build DOM ──────────────────────────────────────────────────────────────
  function buildWidget() {
    // Inject CSS
    if (!document.getElementById("cb-styles")) {
      const link = document.createElement("link");
      link.id = "cb-styles";
      link.rel = "stylesheet";
      const scriptSrc =
        document.currentScript?.src ||
        [...document.querySelectorAll("script")].slice(-1)[0]?.src ||
        "";
      link.href = scriptSrc.replace(/chatbot\.js$/, "chatbot.css");
      document.head.appendChild(link);
    }

    // ── Bubble ──
    const bubble = el("button", { id: "cb-bubble", "aria-label": "Open chat" }, `
      <span id="cb-bubble-icon">
        <svg class="cb-icon-chat" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <svg class="cb-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </span>
      <span id="cb-bubble-label">Ask me anything!</span>
    `);

    // ── Chat window ──
    const win = el("div", {
      id: "cb-window",
      role: "dialog",
      "aria-label": "Chat with Romal's AI Assistant",
      "aria-modal": "false"
    }, `
      <div id="cb-header">
        <div id="cb-avatar">${CONFIG.BOT_INITIAL}</div>
        <div id="cb-header-text">
          <div id="cb-header-name">${CONFIG.BOT_NAME}</div>
          <div id="cb-header-status">Online</div>
        </div>
        <button id="cb-reset" title="Reset Chat" aria-label="Reset Chat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>

      <div id="cb-messages" role="log" aria-live="polite" aria-label="Conversation"></div>

      <div id="cb-input-area">
        <textarea
          id="cb-input"
          placeholder="Ask me about Romal's work…"
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
    `);

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    // ── Events ──
    bubble.addEventListener("click", toggleChat);

    document.getElementById("cb-reset").addEventListener("click", resetChat);

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

    // ── Shrink bubble after 8 seconds ──
    setTimeout(shrinkBubble, 8000);

    // ── Shrink bubble on scroll ──
    let scrollHandler = () => { shrinkBubble(); window.removeEventListener("scroll", scrollHandler); };
    window.addEventListener("scroll", scrollHandler, { passive: true });

    // ── Initial messages ──
    appendBotMessage(CONFIG.WELCOME_MESSAGE);
    renderSuggestions();
  }

  // ── Shrink bubble to icon-only ─────────────────────────────────────────────
  function shrinkBubble() {
    if (bubbleShrunk) return;
    bubbleShrunk = true;
    document.getElementById("cb-bubble")?.classList.add("cb-icon-only");
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

  // ── Reset chat ─────────────────────────────────────────────────────────────
  function resetChat() {
    conversationHistory = [];
    const msgs = document.getElementById("cb-messages");
    if (msgs) msgs.innerHTML = "";
    appendBotMessage(CONFIG.WELCOME_MESSAGE);
    renderSuggestions();
  }

  // ── Render suggested questions ─────────────────────────────────────────────
  function renderSuggestions() {
    const msgs = document.getElementById("cb-messages");
    const container = el("div", { id: "cb-suggestions" });
    CONFIG.SUGGESTIONS.forEach((q) => {
      const btn = el("button", { class: "cb-suggestion" }, escHtml(q));
      btn.addEventListener("click", () => {
        container.remove();
        sendMessage(q);
      });
      container.appendChild(btn);
    });
    msgs.appendChild(container);
    scrollToBottom();
  }

  // ── Message helpers ────────────────────────────────────────────────────────
  function isCvQuery(text) {
    const lower = text.toLowerCase();
    return CONFIG.CV_KEYWORDS.some(k => lower.includes(k));
  }

  function appendBotMessage(text, isError = false) {
    const msgs = document.getElementById("cb-messages");

    // Check if this response relates to a CV query — inject button if so
    const hasCvBtn = !isError && isCvQuery(text);

    const cvBtnHtml = hasCvBtn
      ? `<br><a class="cb-cv-btn" href="${CONFIG.CV_URL}" target="_blank" rel="noopener noreferrer">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
           View CV
         </a>`
      : "";

    const div = el(
      "div",
      { class: `cb-msg bot${isError ? " cb-error" : ""}` },
      `<div class="cb-msg-avatar">${CONFIG.BOT_INITIAL}</div>
       <div class="cb-msg-bubble">${formatText(text)}${cvBtnHtml}</div>`
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

  function removeTyping() { document.getElementById("cb-typing")?.remove(); }

  function scrollToBottom() {
    const msgs = document.getElementById("cb-messages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Send flow ──────────────────────────────────────────────────────────────
  function handleSend() {
    const input = document.getElementById("cb-input");
    const text = input.value.trim();
    if (!text || isLoading) return;
    document.getElementById("cb-suggestions")?.remove();
    input.value = "";
    autoResize(input);
    document.getElementById("cb-send").disabled = true;
    sendMessage(text);
  }

  async function sendMessage(userText) {
    appendUserMessage(userText);
    conversationHistory.push({ role: "user", content: userText });

    // If it's a CV request, respond immediately without hitting the API
    if (isCvQuery(userText)) {
      isLoading = true;
      showTyping();
      await delay(600); // brief natural pause
      removeTyping();
      const cvReply = "You can view and download Romal's full CV using the button below.";
      conversationHistory.push({ role: "assistant", content: cvReply });
      appendBotMessage(cvReply);
      isLoading = false;
      const input = document.getElementById("cb-input");
      if (input) document.getElementById("cb-send").disabled = input.value.trim() === "";
      return;
    }

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
        try { const err = await response.json(); if (err.error) errMsg = err.error; } catch {}
        appendBotMessage(errMsg, true);
        conversationHistory.pop();
        return;
      }

      const data = await response.json();
      const reply = data.reply || "Sorry, I didn't get a response. Please try again.";
      conversationHistory.push({ role: "assistant", content: reply });

      // If the AI's reply itself talks about the CV, also show the button
      appendBotMessage(reply);
    } catch {
      removeTyping();
      appendBotMessage("Network error — please check your connection and try again.", true);
      conversationHistory.pop();
    } finally {
      isLoading = false;
      const input = document.getElementById("cb-input");
      if (input) document.getElementById("cb-send").disabled = input.value.trim() === "";
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
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

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

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Init ───────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
