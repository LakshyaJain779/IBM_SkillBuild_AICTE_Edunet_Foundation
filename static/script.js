/* ═══════════════════════════════════════════════════════════════
   AI Travel Planner – Frontend Logic
   Communicates with Flask backend; never touches IBM credentials.
═══════════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────────────────────────
let currentPlan      = "";   // latest generated plan text
let lastUserPrompt   = "";   // last raw chat message sent

// ─── Drawer toggle ───────────────────────────────────────────────────────────
function toggleDetails() {
  const drawer = document.getElementById("detailsDrawer");
  const btn    = document.getElementById("detailsToggle");
  const open   = drawer.classList.toggle("hidden");
  // "hidden" toggled OFF means drawer is now visible
  btn.classList.toggle("active", !open);
}

// ─── Suggestion chip → fill chat input ───────────────────────────────────────
function fillChatInput(text) {
  const inp = document.getElementById("chatInput");
  inp.value = text;
  autoResizeChatInput();
  inp.focus();
}

// ─── Legacy fillPrompt (kept so nothing breaks) ───────────────────────────────
function fillPrompt(text) {
  const el = document.getElementById("travelPrompt");
  if (el) el.value = text;
}

// ─── Auto-resize chat textarea ────────────────────────────────────────────────
function autoResizeChatInput() {
  const ta = document.getElementById("chatInput");
  if (!ta) return;
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
}

// ─── Legacy char counter (kept so nothing breaks) ────────────────────────────
function updateCharCount() {
  const ta    = document.getElementById("travelPrompt");
  const count = document.getElementById("promptCharCount");
  if (!ta || !count) return;
  const len = ta.value.length;
  count.textContent = `${len} / 600`;
  count.style.color = len > 550 ? "var(--warning)" : "";
  if (len > 600) ta.value = ta.value.slice(0, 600);
}

// ─── Scroll chat to bottom ────────────────────────────────────────────────────
function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

// ─── Hide hero once first message appears ─────────────────────────────────────
function hideHero() {
  const hero = document.getElementById("chatHero");
  if (hero && !hero.classList.contains("hidden")) {
    hero.classList.add("hidden");
  }
}

// ─── Append a USER bubble ────────────────────────────────────────────────────
function appendUserBubble(text) {
  hideHero();
  const msgs = document.getElementById("chatMessages");
  const div  = document.createElement("div");
  div.className = "msg-user";
  div.innerHTML = `<div class="msg-user-bubble">${escapeHtml(text)}</div>`;
  msgs.appendChild(div);
  scrollToBottom();
  return div;
}

// ─── Append a TYPING bubble (returns the element so we can replace it) ────────
function appendTypingBubble() {
  const msgs = document.getElementById("chatMessages");
  const div  = document.createElement("div");
  div.className = "msg-ai msg-loading";
  div.id = "typingBubble";
  div.innerHTML = `
    <div class="msg-ai-avatar">✈</div>
    <div class="msg-ai-content">
      <div class="msg-ai-label">✨ IBM Granite is thinking…</div>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(div);
  scrollToBottom();
  return div;
}

// ─── Replace the typing bubble with the AI response ──────────────────────────
function replaceTypingWithPlan(planText) {
  const typing = document.getElementById("typingBubble");
  if (!typing) return;

  const msgId = "aiMsg_" + Date.now();
  typing.id        = msgId;
  typing.className = "msg-ai";
  typing.innerHTML = `
    <div class="msg-ai-avatar">✈</div>
    <div class="msg-ai-content">
      <div class="msg-ai-label">✨ IBM Granite · Travel Plan</div>
      <div class="msg-ai-body">${renderPlan(planText)}</div>
      <div class="msg-ai-footer">
        <span class="msg-ai-badge">🤖 AI-generated estimates · Not real-time data</span>
        <div class="msg-ai-actions">
          <button class="btn-icon-action" onclick="copyPlan()">📋 Copy</button>
          <button class="btn-icon-action" onclick="printPlan()">🖨 Print</button>
        </div>
      </div>
    </div>`;
  scrollToBottom();
}

// ─── Replace the typing bubble with an error message ─────────────────────────
function replaceTypingWithError(title, message) {
  const typing = document.getElementById("typingBubble");
  if (!typing) return;

  typing.id        = "errorBubble";
  typing.className = "msg-ai msg-error";
  typing.innerHTML = `
    <div class="msg-ai-avatar" style="background:var(--error)">⚠</div>
    <div class="msg-ai-content">
      <div class="msg-ai-label" style="color:var(--error)">${escapeHtml(title)}</div>
      <div class="msg-error-text">${escapeHtml(message)}</div>
      <button class="msg-error-retry" onclick="retryLastPrompt()">↩ Try Again</button>
    </div>`;
  scrollToBottom();
}

// ─── Retry the last prompt ────────────────────────────────────────────────────
function retryLastPrompt() {
  const errBubble = document.getElementById("errorBubble");
  if (errBubble) errBubble.remove();
  if (lastUserPrompt) {
    document.getElementById("chatInput").value = lastUserPrompt;
    chatSend();
  }
}

// ─── Collect form data (all existing fields preserved) ───────────────────────
function collectFormData() {
  return {
    from_location:        (document.getElementById("fromLocation")         || {}).value?.trim() || "",
    destination:          (document.getElementById("destination")           || {}).value?.trim() || "",
    num_travelers:        (document.getElementById("numTravelers")          || {}).value?.trim() || "2",
    duration:             (document.getElementById("duration")              || {}).value?.trim() || "",
    travel_dates:         (document.getElementById("travelDates")           || {}).value?.trim() || "",
    currency:             (document.getElementById("currency")              || {}).value         || "USD",
    budget:               (document.getElementById("budget")                || {}).value?.trim() || "",
    travel_style:         (document.getElementById("travelStyle")           || {}).value         || "Moderate",
    interests:            getSelectedInterests(),
    transportation:       (document.getElementById("transportation")        || {}).value         || "Any",
    accommodation:        (document.getElementById("accommodation")         || {}).value         || "Any",
    dietary:              (document.getElementById("dietary")               || {}).value?.trim() || "",
    special_requirements: (document.getElementById("specialRequirements")   || {}).value?.trim() || "",
    other_preferences:    (document.getElementById("otherPreferences")      || {}).value?.trim() || "",
    travel_prompt:        (document.getElementById("travelPrompt")          || {}).value?.trim() || "",
  };
}

function getSelectedInterests() {
  return Array.from(
    document.querySelectorAll("#interestGrid input[type='checkbox']:checked")
  ).map(cb => cb.value);
}

// ─── MAIN CHAT SEND ───────────────────────────────────────────────────────────
async function chatSend() {
  const input = document.getElementById("chatInput");
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  // Decide: is this a follow-up modification or a new plan request?
  const isModification = currentPlan && !looksLikeNewTrip(text);

  lastUserPrompt = text;
  input.value    = "";
  autoResizeChatInput();

  appendUserBubble(text);
  appendTypingBubble();
  setSendBtnLoading(true);

  try {
    let json;

    if (isModification) {
      // ── Follow-up: modify existing plan ──────────────────────────
      const response = await fetch("/api/modify-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ existing_plan: currentPlan, modification: text }),
      });
      json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error || `HTTP ${response.status}`);

    } else {
      // ── New plan: merge chat prompt with form data ────────────────
      const formData = collectFormData();

      // Let the chat text drive the prompt; also set the hidden field
      formData.travel_prompt = text;

      // If the drawer wasn't filled, destination/duration may be empty —
      // that's fine: the backend will use what the natural-language prompt says.
      // But we must pass something non-empty to pass server-side validation.
      if (!formData.destination) formData.destination = text.slice(0, 120);
      if (!formData.duration)    formData.duration    = "as described";

      const response = await fetch("/api/generate-plan", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(formData),
      });
      json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error || `HTTP ${response.status}`);
    }

    if (!json.plan || !json.plan.trim()) {
      throw new Error("IBM Granite returned an empty response. Please try again.");
    }

    currentPlan = json.plan;
    replaceTypingWithPlan(json.plan);

  } catch (err) {
    let msg = err.message || "An unexpected error occurred.";
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = "Could not reach the server. Please check your internet connection.";
    }
    replaceTypingWithError("Could not generate plan", msg);
  } finally {
    setSendBtnLoading(false);
  }
}

// ─── Heuristic: does this text look like a brand-new trip request? ────────────
function looksLikeNewTrip(text) {
  const t = text.toLowerCase();
  return (
    t.includes("plan") ||
    t.includes("trip") ||
    t.includes("travel") ||
    t.includes("visit") ||
    t.includes("itinerary") ||
    t.includes(" to ") ||
    t.includes("from ")
  );
}

// ─── "Generate with These Details" from the drawer ───────────────────────────
function generateFromDrawer() {
  const form   = collectFormData();
  const dest   = form.destination || form.from_location || "";
  const dur    = form.duration    || "";
  const budget = form.budget ? `${form.currency} ${form.budget}` : "";
  const style  = form.travel_style || "";

  // Build a natural summary from the drawer fields to show as the user bubble
  const parts = [];
  if (form.from_location && form.destination) parts.push(`from ${form.from_location} to ${form.destination}`);
  else if (form.destination) parts.push(`to ${form.destination}`);
  if (dur)            parts.push(dur);
  if (form.num_travelers && form.num_travelers !== "2") parts.push(`${form.num_travelers} travelers`);
  if (budget)         parts.push(`budget ${budget}`);
  if (style)          parts.push(style.toLowerCase() + " style");
  const interests = form.interests.join(", ");
  if (interests)      parts.push(interests.toLowerCase());
  if (form.travel_prompt) parts.push(form.travel_prompt);

  const summary = parts.length
    ? `Plan a trip ${parts.join(", ")}.`
    : `Plan a trip to ${dest || "my destination"}.`;

  // Close the drawer
  document.getElementById("detailsDrawer").classList.add("hidden");
  document.getElementById("detailsToggle").classList.remove("active");

  // Pre-fill the travelPrompt hidden field so the backend receives it
  const tp = document.getElementById("travelPrompt");
  if (tp && !tp.value) tp.value = summary;

  // Validation: ensure destination and duration are set
  if (!form.destination) form.destination = dest || summary.slice(0, 100);
  if (!form.duration)    form.duration    = "as described";

  // Render user bubble and fire
  lastUserPrompt = summary;
  appendUserBubble(summary);
  appendTypingBubble();
  setSendBtnLoading(true);

  fetch("/api/generate-plan", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(form),
  })
    .then(r => r.json().then(j => ({ ok: r.ok, json: j })))
    .then(({ ok, json }) => {
      if (!ok || json.error) throw new Error(json.error || "Server error");
      if (!json.plan || !json.plan.trim()) throw new Error("Empty response from IBM Granite.");
      currentPlan = json.plan;
      replaceTypingWithPlan(json.plan);
    })
    .catch(err => replaceTypingWithError("Could not generate plan", err.message))
    .finally(() => setSendBtnLoading(false));
}

// ─── Button loading helper ────────────────────────────────────────────────────
function setSendBtnLoading(loading) {
  const btn = document.getElementById("chatSendBtn");
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
      style="animation:spin .8s linear infinite">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/>
      </svg>`;
  } else {
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"></line>
      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`;
  }
}

// ─── Copy plan to clipboard ───────────────────────────────────────────────────
function copyPlan() {
  if (!currentPlan) return;
  navigator.clipboard.writeText(currentPlan)
    .then(() => {
      const btns = document.querySelectorAll('[onclick="copyPlan()"]');
      btns.forEach(btn => {
        const orig = btn.textContent;
        btn.textContent = "✅ Copied!";
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    })
    .catch(() => {
      const ta = document.createElement("textarea");
      ta.value = currentPlan;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
}

// ─── Print ────────────────────────────────────────────────────────────────────
function printPlan() { window.print(); }

// ─── Escape HTML for safe insertion ──────────────────────────────────────────
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Render plan text as formatted HTML ──────────────────────────────────────
function renderPlan(text) {
  if (!text) return "<p>No content returned.</p>";

  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm,  "<h3>$1</h3>")
    .replace(/^# (.+)$/gm,   "<h2>$1</h2>")
    .replace(/^([A-Z][A-Z0-9 _:/-]{4,})$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/^---+$/gm,       "<hr />")
    .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.+)$/gm,  "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g,   "<br />");

  return `<p>${html}</p>`;
}

// ─── Legacy stubs (kept so no broken-reference errors) ───────────────────────
function generatePlan()  { chatSend(); }
function modifyPlan()    {
  const inp = document.getElementById("modifyInput");
  if (inp && inp.value.trim()) {
    document.getElementById("chatInput").value = inp.value.trim();
    chatSend();
  }
}
function fillModify(text) {
  const inp = document.getElementById("modifyInput");
  if (inp) { inp.value = text; inp.focus(); }
  document.getElementById("chatInput").value = text;
}
function showState()  {}
function showError(title, msg) { replaceTypingWithError(title, msg); }
function resetError() {}
function scrollToResults() { scrollToBottom(); }
function setButtonLoading() {}

// ─── DOMContentLoaded wiring ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    // Auto-resize as user types
    chatInput.addEventListener("input", autoResizeChatInput);

    // Enter to send (Shift+Enter for newline)
    chatInput.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatSend();
      }
    });
  }

  // Legacy: wire char counter if the old travelPrompt textarea is present
  const tp = document.getElementById("travelPrompt");
  if (tp && tp.tagName === "TEXTAREA") {
    tp.addEventListener("input", updateCharCount);
  }
});
