const BACKEND = "https://13.49.67.238.sslip.io";

let currentVideoId = null;

const statusBar  = document.getElementById("status-bar");
const chatBox    = document.getElementById("chat-box");
const userInput  = document.getElementById("user-input");
const sendBtn    = document.getElementById("send-btn");
const clearBtn   = document.getElementById("clear-btn");

// ── Helpers ──────────────────────────────────────────────────────────────────

function setStatus(text, type = "") {
  statusBar.textContent = text;
  statusBar.className = type;
}

function addBubble(text, role) {
  const div = document.createElement("div");
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

function getErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  if (Array.isArray(payload.detail) && payload.detail.length > 0) {
    const first = payload.detail[0];
    if (typeof first === "string") return first;
    if (first && typeof first.msg === "string") return first.msg;
  }
  return fallback;
}

function apiUrl(path) {
  const base = BACKEND.replace(/\/+$/, "");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return `${base}/${cleanPath}`;
}

// ── Load video ────────────────────────────────────────────────────────────────

async function loadVideo(videoId) {
  if (videoId === currentVideoId) return; // already loaded
  currentVideoId = videoId;
  chatBox.innerHTML = "";
  setStatus(`Loading video context for ${videoId} …`, "loading");
  sendBtn.disabled = true;

  try {
    const res  = await fetch(apiUrl("/load"), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ video_id: videoId }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.status === "ok") {
      setStatus(`✓ Ready — ${videoId}`, "loaded");
      addBubble("Video ready! Ask me anything about this video.", "bot");
      sendBtn.disabled = false;
    } else {
      const message = getErrorMessage(data, `Load failed (${res.status}).`);
      setStatus(`Error: ${message}`, "error");
      currentVideoId = null;
    }
  } catch (err) {
    setStatus("Cannot reach backend (is it running?)", "error");
    currentVideoId = null;
  }
}

// ── Send message ──────────────────────────────────────────────────────────────

async function sendMessage() {
  const question = userInput.value.trim();
  if (!question || !currentVideoId) return;

  userInput.value = "";
  sendBtn.disabled = true;
  addBubble(question, "user");
  const thinking = addBubble("Thinking…", "bot thinking");

  try {
    const res  = await fetch(apiUrl("/chat"), {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ video_id: currentVideoId, question }),
    });
    const data = await res.json().catch(() => null);

    thinking.remove();

    if (res.ok && data?.status === "ok") {
      addBubble(data.answer, "bot");
    } else {
      const message = getErrorMessage(data, `Request failed (${res.status}).`);
      addBubble(`Error: ${message}`, "bot");
    }
  } catch (err) {
    thinking.remove();
    addBubble("Could not reach the backend.", "bot");
  } finally {
    sendBtn.disabled = false;
    userInput.focus();
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// clearBtn.addEventListener("click", () => {
//   chatBox.innerHTML = "";
//   if (currentVideoId) {
//     fetch(`${BACKEND}/session/${currentVideoId}`, { method: "DELETE" });
//     currentVideoId = null;
//     setStatus("Session cleared — reload the video to start fresh.");
//   }
// });
clearBtn.addEventListener("click", () => {
  chatBox.innerHTML = "";
  
  if (currentVideoId) {
    fetch(apiUrl(`/history/${currentVideoId}`), { method: "DELETE" });
    // Don't null out currentVideoId — keep the video loaded
  }

  // Re-add the welcome message
  addBubble("Chat cleared! You can keep asking questions about this video.", "bot");
  
  // Make sure input stays enabled
  sendBtn.disabled = false;
  userInput.focus();
});

// ── Listen for video id from content.js ──────────────────────────────────────

window.addEventListener("message", (event) => {
  if (event.data?.type === "VIDEO_ID") {
    loadVideo(event.data.videoId);
  }
});