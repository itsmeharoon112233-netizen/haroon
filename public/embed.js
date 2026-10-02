/*!
 * Xpert AI embed — adds a chat button to any website.
 *
 * Usage (paste before </body> on your existing site):
 *   <script src="https://YOUR-XPERT-AI-DOMAIN/embed.js" defer></script>
 *
 * Optional attributes on the <script> tag:
 *   data-label="Chat with Xpert AI"   button text
 *   data-position="right"             "right" (default) or "left"
 */
(function () {
  if (window.__xpertEmbedLoaded) return;
  window.__xpertEmbedLoaded = true;

  var script = document.currentScript;
  var origin = new URL(script.src).origin;
  var label = script.getAttribute("data-label") || "Chat with Xpert AI";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var PINE = "#1e5b4a";

  var css =
    ".xpert-btn{position:fixed;bottom:20px;" + side + ":20px;z-index:2147483000;display:flex;align-items:center;gap:8px;" +
    "height:52px;padding:0 20px 0 16px;border:0;border-radius:26px;background:" + PINE + ";color:#fff;" +
    "font:600 15px/1 system-ui,-apple-system,Segoe UI,sans-serif;cursor:pointer;box-shadow:0 8px 24px -8px rgba(0,0,0,.45);transition:transform .15s}" +
    ".xpert-btn:hover{transform:translateY(-1px)}.xpert-btn:focus-visible{outline:3px solid #d3b064;outline-offset:3px}" +
    ".xpert-panel{position:fixed;bottom:84px;" + side + ":20px;z-index:2147483000;width:400px;height:min(680px,calc(100vh - 110px));" +
    "border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 20px 60px -15px rgba(0,0,0,.45);display:none;flex-direction:column}" +
    ".xpert-panel.open{display:flex}.xpert-panel iframe{flex:1;width:100%;border:0}" +
    ".xpert-close{position:absolute;top:8px;" + (side === "right" ? "right" : "left") + ":8px;display:none}" +
    "@media (max-width:640px){.xpert-panel{inset:0;width:100%;height:100%;border-radius:0}" +
    // On phones the chat fills the screen; a full-width "Close chat" bar sits above it
    // so it never covers the message box.
    ".xpert-panel.open~.xpert-btn{display:none}.xpert-close{display:flex;position:static;order:-1;flex:none;width:100%;" +
    "height:44px;justify-content:center;border:0;border-radius:0;background:" + PINE + ";color:#fff;font:600 14px system-ui,sans-serif;align-items:center;cursor:pointer}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "xpert-panel";
  panel.id = "xpert-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Xpert AI chat");

  var closeMobile = document.createElement("button");
  closeMobile.className = "xpert-close";
  closeMobile.type = "button";
  closeMobile.textContent = "Close chat";
  panel.appendChild(closeMobile);

  var btn = document.createElement("button");
  btn.className = "xpert-btn";
  btn.type = "button";
  btn.setAttribute("aria-controls", "xpert-panel");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg><span></span>';
  btn.querySelector("span").textContent = label;

  var iframe = null;
  function setOpen(open) {
    if (open && !iframe) {
      // Load the chat only when first opened, so it never slows down your site.
      iframe = document.createElement("iframe");
      iframe.src = origin + "/";
      iframe.title = "Xpert AI chat";
      iframe.allow = "clipboard-write";
      panel.appendChild(iframe);
    }
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector("span").textContent = open ? "Close" : label;
    if (open && iframe) iframe.focus();
  }

  btn.addEventListener("click", function () {
    setOpen(!panel.classList.contains("open"));
  });
  closeMobile.addEventListener("click", function () {
    setOpen(false);
    btn.focus();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      setOpen(false);
      btn.focus();
    }
  });
  // Escape pressed inside the chat itself.
  window.addEventListener("message", function (e) {
    if (e.origin === origin && e.data && e.data.type === "xpert:close") {
      setOpen(false);
      btn.focus();
    }
  });

  // Always show the chat button. If the AI service isn't available (no key or
  // no credit), the chat itself shows a friendly message with contact details.
  document.body.appendChild(panel);
  document.body.appendChild(btn);
})();
