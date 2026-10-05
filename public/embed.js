/*!
 * Xpert AI embed - adds a floating robot chat button to any website.
 *
 * Usage (paste before </body> on your existing site):
 *   <script src="https://YOUR-XPERT-AI-DOMAIN/embed.js" defer></script>
 *
 * Optional attributes on the <script> tag:
 *   data-label="Ask me about property!"   greeting bubble text
 *   data-position="right"                 "right" (default) or "left"
 */
(function () {
  if (window.__xpertEmbedLoaded) return;
  window.__xpertEmbedLoaded = true;

  var script = document.currentScript;
  var origin = new URL(script.src).origin;
  var greeting = script.getAttribute("data-label") || "Hi! Ask me about property \u{1F3E1}";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var PINE = "#1e5b4a";
  var PINE_DARK = "#143f33";
  var BRASS = "#d3b064";
  var SEEN_KEY = "xpert.greeted";

  var css =
    // ---- floating robot button ----
    ".xpert-bot{position:fixed;bottom:18px;" + side + ":18px;z-index:2147483000;width:80px;height:80px;padding:0;border:0;" +
    "background:none;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
    ".xpert-bot:focus-visible{outline:3px solid " + BRASS + ";outline-offset:4px;border-radius:50%}" +
    ".xpert-bot .xb-float{display:block;width:100%;height:100%;animation:xb-float 3.2s ease-in-out infinite}" +
    ".xpert-bot:hover .xb-float{animation-play-state:paused;transform:translateY(-3px) scale(1.06);transition:transform .2s}" +
    ".xpert-bot .xb-shadow{position:absolute;left:50%;bottom:-6px;width:46px;height:8px;margin-left:-23px;border-radius:50%;" +
    "background:rgba(0,0,0,.22);filter:blur(2px);animation:xb-shadow 3.2s ease-in-out infinite}" +
    ".xpert-bot svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 6px 10px rgba(20,63,51,.35))}" +
    ".xpert-bot .xb-eye{transform-origin:center;transform-box:fill-box;animation:xb-blink 4.5s infinite}" +
    ".xpert-bot .xb-light{animation:xb-pulse 1.8s ease-in-out infinite}" +
    ".xpert-bot .xb-wave{transform-origin:20% 90%;transform-box:fill-box;animation:xb-wave 4.5s ease-in-out infinite}" +
    // pulse ring to draw attention
    ".xpert-bot .xb-ring{position:absolute;inset:6px;border-radius:50%;border:2px solid " + BRASS + ";opacity:0;animation:xb-ring 3.2s ease-out infinite}" +
    // close (X) state while chat is open
    ".xpert-bot .xb-x{position:absolute;inset:8px;display:none;align-items:center;justify-content:center;border-radius:50%;background:" + PINE + ";color:#fff;" +
    "box-shadow:0 8px 20px -6px rgba(0,0,0,.45)}" +
    ".xpert-bot.is-open .xb-float,.xpert-bot.is-open .xb-shadow,.xpert-bot.is-open .xb-ring{display:none}" +
    ".xpert-bot.is-open .xb-x{display:flex}" +
    // ---- greeting bubble ----
    ".xpert-bubble{position:fixed;bottom:106px;" + side + ":20px;z-index:2147483000;max-width:230px;padding:11px 34px 11px 14px;border-radius:16px;" +
    "border-bottom-" + side + "-radius:4px;background:#fff;color:#1a2420;font:500 14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;" +
    "box-shadow:0 10px 30px -10px rgba(0,0,0,.35);cursor:pointer;opacity:0;transform:translateY(8px) scale(.96);" +
    "transition:opacity .25s,transform .25s;pointer-events:none}" +
    ".xpert-bubble.show{opacity:1;transform:none;pointer-events:auto}" +
    ".xpert-bubble b{display:block;color:" + PINE + ";font-weight:700;margin-bottom:2px}" +
    ".xpert-bubble button{position:absolute;top:6px;" + (side === "right" ? "right" : "left") + ":6px;width:24px;height:24px;border:0;border-radius:50%;" +
    "background:transparent;color:#5b6863;font:600 16px/1 system-ui,sans-serif;cursor:pointer}" +
    ".xpert-bubble button:hover{background:#eceff0}" +
    // ---- chat panel ----
    ".xpert-panel{position:fixed;bottom:108px;" + side + ":20px;z-index:2147483000;width:400px;height:min(680px,calc(100vh - 132px));" +
    "border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 20px 60px -15px rgba(0,0,0,.45);display:none;flex-direction:column}" +
    ".xpert-panel.open{display:flex;animation:xb-pop .22s ease-out}.xpert-panel iframe{flex:1;width:100%;border:0}" +
    ".xpert-close{display:none}" +
    "@media (max-width:640px){.xpert-panel{inset:0;width:100%;height:100%;border-radius:0}" +
    // On phones the chat fills the screen; a full-width "Close chat" bar sits above it.
    ".xpert-panel.open~.xpert-bot{display:none}.xpert-close{display:flex;position:static;order:-1;flex:none;width:100%;" +
    "height:44px;justify-content:center;border:0;border-radius:0;background:" + PINE + ";color:#fff;font:600 14px system-ui,sans-serif;align-items:center;cursor:pointer}" +
    ".xpert-bot{width:68px;height:68px;bottom:14px;" + side + ":14px}.xpert-bubble{bottom:92px;" + side + ":14px}}" +
    // ---- animations ----
    "@keyframes xb-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}" +
    "@keyframes xb-shadow{0%,100%{transform:scaleX(1);opacity:.9}50%{transform:scaleX(.75);opacity:.5}}" +
    "@keyframes xb-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}" +
    "@keyframes xb-pulse{0%,100%{opacity:1}50%{opacity:.35}}" +
    "@keyframes xb-wave{0%,70%,100%{transform:rotate(0)}76%{transform:rotate(-24deg)}82%{transform:rotate(8deg)}88%{transform:rotate(-18deg)}94%{transform:rotate(0)}}" +
    "@keyframes xb-ring{0%{transform:scale(.9);opacity:.7}70%,100%{transform:scale(1.35);opacity:0}}" +
    "@keyframes xb-pop{from{opacity:0;transform:translateY(10px) scale(.98)}}" +
    "@media (prefers-reduced-motion:reduce){.xpert-bot *,.xpert-panel{animation:none!important}}";

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Original robot character in Ghandhara Estate colours: pine-green head, brass antenna & ears,
  // friendly screen face, waving hand.
  var ROBOT_SVG =
    '<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">' +
    // antenna
    '<line x1="40" y1="10" x2="40" y2="18" stroke="' + BRASS + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="xb-light" cx="40" cy="8" r="4.5" fill="' + BRASS + '"/>' +
    // ears
    '<rect x="8" y="34" width="8" height="16" rx="4" fill="' + BRASS + '"/>' +
    '<rect x="64" y="34" width="8" height="16" rx="4" fill="' + BRASS + '"/>' +
    // head
    '<rect x="13" y="17" width="54" height="48" rx="18" fill="' + PINE + '"/>' +
    '<rect x="13" y="17" width="54" height="24" rx="18" fill="#ffffff" opacity=".07"/>' +
    // face screen
    '<rect x="20" y="26" width="40" height="29" rx="12" fill="#f4f6f3"/>' +
    // eyes
    '<ellipse class="xb-eye" cx="31" cy="38" rx="4" ry="5" fill="' + PINE_DARK + '"/>' +
    '<ellipse class="xb-eye" cx="49" cy="38" rx="4" ry="5" fill="' + PINE_DARK + '"/>' +
    '<circle cx="32.3" cy="36.3" r="1.3" fill="#fff"/><circle cx="50.3" cy="36.3" r="1.3" fill="#fff"/>' +
    // cheeks + smile
    '<circle cx="25.5" cy="46" r="2.6" fill="' + BRASS + '" opacity=".55"/><circle cx="54.5" cy="46" r="2.6" fill="' + BRASS + '" opacity=".55"/>' +
    '<path d="M34 46.5q6 5 12 0" fill="none" stroke="' + PINE_DARK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    // little house badge on the forehead
    '<path d="M36 22.5l4-3.2 4 3.2v2.6h-8z" fill="' + BRASS + '"/>' +
    // waving hand
    '<g class="xb-wave"><rect x="64" y="56" width="7" height="14" rx="3.5" fill="' + PINE + '" transform="rotate(-25 67 63)"/>' +
    '<circle cx="71" cy="54" r="5.5" fill="' + BRASS + '"/></g>' +
    "</svg>";

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
  btn.className = "xpert-bot";
  btn.type = "button";
  btn.setAttribute("aria-controls", "xpert-panel");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Chat with Xpert AI, our property assistant");
  btn.title = "Chat with Xpert AI";
  btn.innerHTML =
    '<span class="xb-ring"></span><span class="xb-shadow"></span><span class="xb-float">' + ROBOT_SVG + "</span>" +
    '<span class="xb-x"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span>';

  var bubble = document.createElement("div");
  bubble.className = "xpert-bubble";
  bubble.setAttribute("role", "status");
  bubble.innerHTML = "<b>Xpert AI</b><span></span><button type=\"button\" aria-label=\"Dismiss\">&times;</button>";
  bubble.querySelector("span").textContent = greeting;

  var iframe = null;
  function hideBubble(remember) {
    bubble.classList.remove("show");
    if (remember) {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch (e) {}
    }
  }

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
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close chat" : "Chat with Xpert AI, our property assistant");
    if (open) hideBubble(true);
    if (open && iframe) iframe.focus();
  }

  btn.addEventListener("click", function () {
    setOpen(!panel.classList.contains("open"));
  });
  bubble.addEventListener("click", function (e) {
    if (e.target.tagName === "BUTTON") {
      e.stopPropagation();
      hideBubble(true);
      return;
    }
    setOpen(true);
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

  // Always show the robot. If the AI service isn't available (no key or
  // no credit), the chat itself shows a friendly message with contact details.
  document.body.appendChild(panel);
  document.body.appendChild(bubble);
  document.body.appendChild(btn);

  // Say hello a few seconds after the page loads (once per visit), then tuck away.
  var greeted = false;
  try {
    greeted = sessionStorage.getItem(SEEN_KEY) === "1";
  } catch (e) {}
  if (!greeted) {
    setTimeout(function () {
      if (!panel.classList.contains("open")) bubble.classList.add("show");
    }, 2500);
    setTimeout(function () {
      hideBubble(false);
    }, 14000);
  }
})();
