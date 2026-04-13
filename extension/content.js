(function () {
  if (document.getElementById("yt-chatbot-btn")) return; // already injected

  // ── Floating toggle button ──────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "yt-chatbot-btn";
  btn.textContent = "💬 Chat";
  Object.assign(btn.style, {
    position:   "fixed",
    bottom:     "80px",
    right:      "20px",
    zIndex:     "99999",
    padding:    "10px 16px",
    background: "#ff0000",
    color:      "#fff",
    border:     "none",
    borderRadius: "24px",
    cursor:     "pointer",
    fontSize:   "14px",
    fontWeight: "bold",
    boxShadow:  "0 4px 12px rgba(0,0,0,0.3)",
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

  // ── Toggle sidebar + auto-send video id ────────────────────────────────
  btn.addEventListener("click", () => {
    const isHidden = sidebar.style.display === "none";
    sidebar.style.display = isHidden ? "block" : "none";

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
})();