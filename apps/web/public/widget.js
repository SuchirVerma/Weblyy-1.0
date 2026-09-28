/*!
 * Weblyy chat widget. Add to any website:
 *   <script src="https://YOUR-WEBLYY-URL/widget.js" data-agent="AGENT_ID" async></script>
 * Optional: data-color="#2563eb" data-label="Chat with us"
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__weblyyWidget) return;
  var agent = script.getAttribute("data-agent");
  if (!agent || !/^[a-f0-9]{6,32}$/i.test(agent)) return;
  window.__weblyyWidget = true;

  var origin = new URL(script.src, location.href).origin;
  var color = script.getAttribute("data-color") || "#2563eb";
  var label = script.getAttribute("data-label") || "Chat with us";

  var style = document.createElement("style");
  style.textContent =
    ".fs-w-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;align-items:center;gap:10px;height:54px;padding:0 20px 0 16px;border:0;border-radius:999px;background:" +
    color +
    ";color:#fff;font:600 15px/1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 12px 30px -8px rgba(0,0,0,.35);cursor:pointer;transition:transform .25s cubic-bezier(.22,1,.36,1)}" +
    ".fs-w-btn:hover{transform:translateY(-2px)}.fs-w-btn svg{width:22px;height:22px}" +
    ".fs-w-frame{position:fixed;right:20px;bottom:86px;z-index:2147483000;width:380px;height:620px;max-height:calc(100vh - 110px);border:0;border-radius:24px;box-shadow:0 30px 80px -20px rgba(0,0,0,.45);background:#fff;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .3s,transform .35s cubic-bezier(.22,1,.36,1)}" +
    ".fs-w-frame.open{opacity:1;transform:none;pointer-events:auto}" +
    "@media (max-width:520px){.fs-w-frame{right:0;bottom:0;width:100vw;height:100dvh;max-height:none;border-radius:0}.fs-w-btn.open{display:none}}" +
    ".fs-w-close{position:fixed;right:14px;top:14px;z-index:2147483001;display:none;width:40px;height:40px;border:0;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:20px;cursor:pointer}" +
    "@media (max-width:520px){.fs-w-close.open{display:block}}";
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.className = "fs-w-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", label);
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span></span>';
  btn.querySelector("span").textContent = label;

  var frame = null;
  var close = document.createElement("button");
  close.className = "fs-w-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";

  function toggle(open) {
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "fs-w-frame";
      frame.title = label;
      frame.src = origin + "/chat/" + agent + "?embed=1";
      frame.setAttribute("allow", "clipboard-write");
      document.body.appendChild(frame);
      // let the iframe paint before animating in
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          toggle(open);
        });
      });
      return;
    }
    frame.classList.toggle("open", open);
    btn.classList.toggle("open", open);
    close.classList.toggle("open", open);
    btn.querySelector("span").textContent = open ? "Close" : label;
  }

  var isOpen = false;
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    toggle(isOpen);
  });
  close.addEventListener("click", function () {
    isOpen = false;
    toggle(false);
  });

  // Let the host page open the chat from its own buttons: window.WeblyyWidget.open()
  window.WeblyyWidget = {
    open: function () {
      isOpen = true;
      toggle(true);
    },
  };

  function mount() {
    document.body.appendChild(btn);
    document.body.appendChild(close);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
