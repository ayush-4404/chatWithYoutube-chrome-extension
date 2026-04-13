const BACKEND = "http://localhost:8000";

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

// ── Load video ────────────────────────────────────────────────────────────────

async function loadVideo(videoId) {
  if (videoId === currentVideoId) return; // already loaded
  currentVideoId = videoId;
  chatBox.innerHTML = "";
  setStatus(`Loading video context for ${videoId} …`, "loading");
  sendBtn.disabled = true;

  try {
    const res  = await fetch(`${BACKEND}/load`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ video_id: videoId }),
    });
    const data = await res.json();

    if (data.status === "ok") {
      setStatus(`✓ Ready — ${videoId}`, "loaded");
      addBubble("Video ready! Ask me anything about this video.", "bot");
      sendBtn.disabled = false;
    } else {
      setStatus(`Error: ${data.message}`, "error");
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
    const res  = await fetch(`${BACKEND}/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ video_id: currentVideoId, question }),
    });
    const data = await res.json();

    thinking.remove();

    if (data.status === "ok") {
      addBubble(data.answer, "bot");
    } else {
      addBubble(`Error: ${data.message}`, "bot");
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
    fetch(`${BACKEND}/history/${currentVideoId}`, { method: "DELETE" });
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