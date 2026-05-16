(function () {
  if (document.getElementById("yt-chatbot-btn")) return; // already injected

  // ── Floating toggle button ──────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "yt-chatbot-btn";
  btn.textContent = "Chat";
  Object.assign(btn.style, {
    position:   "fixed",
    bottom:     "80px",
    right:      "20px",
    zIndex:     "99999",
    padding:    "10px 16px",
    background: "linear-gradient(135deg, #ff4d2d, #ff8a3d)",
    color:      "#fff",
    border:     "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "999px",
    cursor:     "pointer",
    fontSize:   "13px",
    fontWeight: "700",
    letterSpacing: "0.02em",
    boxShadow:  "0 10px 24px rgba(0,0,0,0.35)",
    userSelect: "none",
    touchAction: "none",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  });

  // ── Sidebar iframe ──────────────────────────────────────────────────────
  const sidebar = document.createElement("iframe");
  sidebar.id  = "yt-chatbot-sidebar";
  sidebar.src = chrome.runtime.getURL("sidebar.html");
  Object.assign(sidebar.style, {
    position:    "fixed",
    bottom:      "0",
    right:       "0",
    width:       "380px",
    height:      "100vh",
    zIndex:      "99998",
    border:      "none",
    display:     "none",
    boxShadow:   "-4px 0 20px rgba(0,0,0,0.2)",
  });

  document.body.appendChild(btn);
  document.body.appendChild(sidebar);

  // ── Restore button position ───────────────────────────────────────────
  chrome.storage.local.get(["ytChatbotBtnPos"], (result) => {
    const pos = result?.ytChatbotBtnPos;
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      btn.style.left = `${pos.x}px`;
      btn.style.top = `${pos.y}px`;
      btn.style.right = "auto";
      btn.style.bottom = "auto";
    }
  });

  // ── Drag to move button ───────────────────────────────────────────────
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let suppressClick = false;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  btn.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    suppressClick = false;
    btn.setPointerCapture(event.pointerId);
    btn.style.transition = "none";
    btn.style.cursor = "grabbing";
    const rect = btn.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
  });

  btn.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    suppressClick = true;
    const x = clamp(event.clientX - dragOffsetX, 8, window.innerWidth - btn.offsetWidth - 8);
    const y = clamp(event.clientY - dragOffsetY, 8, window.innerHeight - btn.offsetHeight - 8);
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  });

  btn.addEventListener("pointerup", (event) => {
    if (!isDragging) return;
    isDragging = false;
    btn.releasePointerCapture(event.pointerId);
    btn.style.transition = "transform 160ms ease, box-shadow 160ms ease";
    btn.style.cursor = "pointer";

    const left = parseInt(btn.style.left || "0", 10);
    const top = parseInt(btn.style.top || "0", 10);
    if (Number.isFinite(left) && Number.isFinite(top)) {
      chrome.storage.local.set({ ytChatbotBtnPos: { x: left, y: top } });
    }
  });

  window.addEventListener("resize", () => {
    if (!btn.style.left || !btn.style.top) return;
    const left = parseInt(btn.style.left || "0", 10);
    const top = parseInt(btn.style.top || "0", 10);
    const x = clamp(left, 8, window.innerWidth - btn.offsetWidth - 8);
    const y = clamp(top, 8, window.innerHeight - btn.offsetHeight - 8);
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
  });

  // ── Toggle sidebar + auto-send video id ────────────────────────────────
  btn.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const isHidden = sidebar.style.display === "none";
    sidebar.style.display = isHidden ? "block" : "none";
    btn.style.display = isHidden ? "none" : "inline-flex";

    if (isHidden) {
      // Extract video id from URL and send to sidebar
      const params  = new URLSearchParams(window.location.search);
      const videoId = params.get("v");
      if (videoId) {
        // Wait for iframe to be ready, then post message
        sidebar.addEventListener(
          "load",
          () => sidebar.contentWindow.postMessage({ type: "VIDEO_ID", videoId }, "*"),
          { once: true }
        );
        // If already loaded, post immediately
        sidebar.contentWindow?.postMessage({ type: "VIDEO_ID", videoId }, "*");
      }
    }
  });

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "TOGGLE_SIDEBAR") return;
    if (event.data?.action !== "close") return;
    sidebar.style.display = "none";
    btn.style.display = "inline-flex";
  });
})();