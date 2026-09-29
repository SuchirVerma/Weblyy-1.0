/*!
 * Weblyy add-ons for an existing website: Call / WhatsApp / Book buttons and a booking form.
 * Everything lives in its own Shadow DOM, so the site's design is never touched and its CSS can't break these.
 *   <script src="https://YOUR-WEBLYY-URL/weblyy-addons.js" data-config='{"agent":"…","phone":"…","whatsapp":"…","services":[…]}' async></script>
 */
(function () {
  var script = document.currentScript;
  if (!script || window.__weblyyAddons) return;
  var cfg;
  try {
    cfg = JSON.parse(script.getAttribute("data-config") || "{}");
  } catch (_) {
    return;
  }
  if (!cfg.agent || !/^[a-f0-9]{6,32}$/i.test(cfg.agent)) return;
  window.__weblyyAddons = true;
  var origin = new URL(script.src, location.href).origin;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var host = document.createElement("div");
  host.setAttribute("data-weblyy", "addons");
  host.style.cssText = "all:initial;position:fixed;inset:auto;z-index:2147482999";
  (document.body || document.documentElement).appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var ICON = {
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.2.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  };

  var css =
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    ".dock{position:fixed;left:20px;bottom:20px;display:flex;gap:8px;padding:6px;border-radius:999px;background:rgba(0, 0, 0,.92);box-shadow:0 14px 34px -10px rgba(0,0,0,.45);z-index:2147482999;" +
    (reduce ? "" : "animation:rise .6s cubic-bezier(.22,1,.36,1) .4s both") +
    "}" +
    "@keyframes rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}" +
    ".dock a,.dock button{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px;border:0;border-radius:999px;background:transparent;color:#fff;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;transition:background .2s}" +
    ".dock a:hover,.dock button:hover{background:rgba(255,255,255,.12)}" +
    ".dock .book{background:#fff;color:#000000}.dock .book:hover{background:#f4f4f4}" +
    ".dock .wa svg{color:#ffffff}.dock svg{width:18px;height:18px;flex:none}" +
    ".tag{position:fixed;z-index:2147482999;padding:5px 10px;border-radius:999px;background:#000000;color:#fff;font-size:12px;font-weight:700;letter-spacing:.01em;box-shadow:0 8px 20px -6px rgba(0, 0, 0,.7);pointer-events:none;white-space:nowrap}" +
    ".tag::after{content:'';position:absolute;left:50%;bottom:-5px;width:10px;height:10px;background:#000000;transform:translateX(-50%) rotate(45deg)}" +
    ".ring{position:fixed;z-index:2147482998;border-radius:999px;border:2px solid #000000;pointer-events:none;" +
    (reduce ? "" : "animation:pulse 1.8s ease-out infinite") +
    "}" +
    "@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0, 0, 0,.5)}100%{box-shadow:0 0 0 14px rgba(0, 0, 0,0)}}" +
    ".veil{position:fixed;inset:0;z-index:2147483001;display:grid;place-items:center;padding:16px;background:rgba(0, 0, 0,.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}" +
    ".card{position:relative;width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:26px;border-radius:22px;background:#fff;color:#000000;box-shadow:0 40px 100px -30px rgba(0,0,0,.5);" +
    (reduce ? "" : "animation:pop .35s cubic-bezier(.22,1,.36,1)") +
    "}" +
    "@keyframes pop{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}" +
    ".card h2{margin:0 0 4px;font-size:22px;letter-spacing:-.01em}.card p{margin:0 0 18px;color:#3d3d3d;font-size:14px;line-height:1.5}" +
    ".close{position:absolute;top:14px;right:14px;display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:#f4f4f4;color:#000000;cursor:pointer}.close svg{width:16px;height:16px}" +
    "label{display:grid;gap:6px;margin-bottom:12px;font-size:13px;font-weight:600;color:#3d3d3d}" +
    "input,select,textarea{width:100%;height:46px;padding:0 14px;border:1px solid #e5e5e5;border-radius:12px;background:#fff;color:#000000;font-size:16px;font-weight:400}" +
    "textarea{height:74px;padding:10px 14px;resize:vertical}" +
    "input:focus,select:focus,textarea:focus{outline:2px solid #000000;outline-offset:1px;border-color:transparent}" +
    ".submit{width:100%;height:50px;margin-top:6px;border:0;border-radius:999px;background:#000000;color:#fff;font-size:16px;font-weight:700;cursor:pointer}.submit:disabled{opacity:.6;cursor:default}" +
    ".err{margin:0 0 10px;padding:10px 12px;border-radius:10px;background:#f4f4f4;color:#000000;font-size:13px}" +
    ".done{text-align:center;padding:10px 0}.done .tick{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 14px;border-radius:50%;background:#e5e5e5;color:#000000;font-size:28px;font-weight:700}" +
    ".hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}" +
    ".note{margin-top:12px;text-align:center;font-size:12px;color:#a0a0a0}" +
    "@media (max-width:640px){.dock{left:12px;bottom:14px;right:auto}.dock .lbl{display:none}.dock a,.dock button{padding:0 13px}.dock .book .lbl{display:inline}}";

  var style = document.createElement("style");
  style.textContent = css;
  root.appendChild(style);
  var pageStyle = document.createElement("style");
  pageStyle.setAttribute("data-weblyy", "widget-fit");
  pageStyle.textContent = "@media (max-width:640px){.fs-w-btn{width:54px!important;padding:0!important;justify-content:center!important}.fs-w-btn span{display:none!important}}";
  (document.head || document.documentElement).appendChild(pageStyle);

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    for (var k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  }
  function text(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  /* ------------------------------------------------------------ quick actions */
  var dock = el("div", { class: "dock", role: "group", "aria-label": "Contact " + (cfg.name || "us") });
  if (cfg.phone) dock.appendChild(el("a", { href: "tel:" + cfg.phone, "aria-label": "Call" }, ICON.call + '<span class="lbl">Call</span>'));
  if (cfg.whatsapp && cfg.whatsapp.length >= 10)
    dock.appendChild(
      el(
        "a",
        { class: "wa", href: "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent("Hi " + (cfg.name || "") + ", I'd like to know more."), target: "_blank", rel: "noopener", "aria-label": "WhatsApp" },
        ICON.wa + '<span class="lbl">WhatsApp</span>',
      ),
    );
  var bookBtn = el("button", { class: "book", type: "button", "aria-label": "Book" }, ICON.book + '<span class="lbl">Book</span>');
  bookBtn.addEventListener("click", openBooking);
  dock.appendChild(bookBtn);
  root.appendChild(dock);

  /* ------------------------------------ never cover the site's own buttons */
  // Sites often pin their own WhatsApp or call button to a bottom corner. Ours move up above it instead.
  function isOurs(n) {
    return n === host || (n.closest && n.closest(".fs-w-btn, .fs-w-frame, [data-weblyy]"));
  }
  function pinnedAncestor(n) {
    for (var cur = n; cur && cur !== document.body && cur !== document.documentElement; cur = cur.parentElement) {
      var pos = getComputedStyle(cur).position;
      if (pos === "fixed" || pos === "sticky") return cur;
    }
    return null;
  }
  function taken(xs) {
    var h = window.innerHeight;
    var up = 0;
    xs.forEach(function (x) {
      [h - 30, h - 60, h - 95].forEach(function (y) {
        (document.elementsFromPoint ? document.elementsFromPoint(x, y) : []).forEach(function (n) {
          if (isOurs(n)) return;
          var fixed = pinnedAncestor(n);
          if (!fixed) return;
          var r = fixed.getBoundingClientRect();
          // Ignore full-screen layers and anything that isn't really sitting at the bottom.
          if (r.height > h * 0.5 || r.bottom < h - 140) return;
          up = Math.max(up, h - r.top);
        });
      });
    });
    return up;
  }
  // If the site already keeps its own call or WhatsApp button on screen, ours would just repeat it.
  function sitePins(sel) {
    var found = false;
    document.querySelectorAll(sel).forEach(function (a) {
      if (found || isOurs(a)) return;
      var fixed = pinnedAncestor(a);
      if (!fixed) return;
      var r = a.getBoundingClientRect();
      var onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
      if (onScreen && getComputedStyle(a).visibility !== "hidden" && Number(getComputedStyle(fixed).opacity) > 0.05) found = true;
    });
    return found;
  }
  function dedupe() {
    var call = dock.querySelector('a[href^="tel:"]');
    var wa = dock.querySelector("a.wa");
    if (call) call.style.display = sitePins('a[href^="tel:"]') ? "none" : "";
    if (wa) wa.style.display = sitePins('a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="whatsapp:"]') ? "none" : "";
  }
  function avoid() {
    dedupe();
    var w = window.innerWidth;
    var right = taken([w - 30, w - 80, w - 140]);
    var bubble = document.querySelector(".fs-w-btn");
    var frame = document.querySelector(".fs-w-frame");
    if (bubble) {
      var b = right ? right + 12 : 20;
      bubble.style.bottom = b + "px";
      if (frame) frame.style.bottom = b + 66 + "px";
    }
    var left = taken([30, 90, 150]);
    dock.style.bottom = (left ? left + 12 : window.innerWidth <= 640 ? 14 : 20) + "px";
  }
  [600, 1500, 3500].forEach(function (ms) {
    setTimeout(avoid, ms);
  });
  window.addEventListener("resize", function () {
    clearTimeout(avoid.t);
    avoid.t = setTimeout(avoid, 200);
  });

  /* --------------------------------------------------------- booking form */
  var lastFocus = null;
  function openBooking() {
    lastFocus = document.activeElement;
    var veil = el("div", { class: "veil", role: "dialog", "aria-modal": "true", "aria-label": "Book an appointment" });
    var options = (cfg.services || [])
      .map(function (s) {
        return "<option>" + text(s) + "</option>";
      })
      .join("");
    var card = el(
      "div",
      { class: "card" },
      '<button class="close" type="button" aria-label="Close">' +
        ICON.x +
        "</button>" +
        "<h2>Book an appointment</h2><p>Leave your details and " +
        text(cfg.name || "we") +
        " will confirm your time" +
        (cfg.hours ? " (" + text(cfg.hours) + ")" : "") +
        ".</p>" +
        "<form novalidate>" +
        '<div class="err" hidden></div>' +
        '<label>Your name<input name="name" autocomplete="name" required maxlength="60"></label>' +
        '<label>Phone number<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="98765 43210"></label>' +
        (options ? '<label>Service<select name="service"><option value="">Choose a service</option>' + options + "<option>Something else</option></select></label>" : "") +
        '<label>Preferred day and time<input name="when" maxlength="60" placeholder="e.g. Saturday 4 pm"></label>' +
        '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<button class="submit" type="submit">Request appointment</button>' +
        '<div class="note">Added by Weblyy · your details go only to ' +
        text(cfg.name || "the business") +
        "</div>" +
        "</form>",
    );
    veil.appendChild(card);
    root.appendChild(veil);
    var form = card.querySelector("form");
    var err = card.querySelector(".err");
    var first = card.querySelector('input[name="name"]');
    if (first) first.focus();

    function close() {
      veil.remove();
      document.removeEventListener("keydown", onKey, true);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey, true);
    veil.addEventListener("click", function (e) {
      if (e.target === veil) close();
    });
    card.querySelector(".close").addEventListener("click", close);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var name = String(f.get("name") || "").trim();
      var phone = String(f.get("phone") || "").trim();
      err.hidden = true;
      if (!name) return showErr("Please add your name.");
      if (phone.replace(/\D/g, "").length < 10) return showErr("Please add a 10-digit phone number.");
      var btn = form.querySelector(".submit");
      btn.disabled = true;
      btn.textContent = "Sending…";
      var service = String(f.get("service") || "");
      var when = String(f.get("when") || "").trim();
      fetch(origin + "/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId: cfg.agent,
          name: name,
          phone: phone,
          interest: service || "Appointment",
          message: "Appointment request" + (when ? " · Preferred: " + when : "") + " · from the website booking button",
          website: String(f.get("website") || ""),
        }),
      })
        .then(function (r) {
          return r.json().then(function (d) {
            if (!r.ok) throw new Error(d && d.error ? d.error : "Something went wrong. Please try again.");
            return d;
          });
        })
        .then(function () {
          card.innerHTML =
            '<div class="done"><div class="tick">✓</div><h2>Request sent</h2><p>Thanks ' +
            text(name.split(" ")[0]) +
            "! " +
            text(cfg.name || "We") +
            " will call you on " +
            text(phone) +
            ' to confirm.</p><button class="submit" type="button">Done</button></div>';
          card.querySelector(".submit").addEventListener("click", close);
        })
        .catch(function (e2) {
          btn.disabled = false;
          btn.textContent = "Request appointment";
          showErr(e2 && e2.message ? e2.message : "Couldn't send. Please check your connection and try again.");
        });
    });
    function showErr(m) {
      err.textContent = m;
      err.hidden = false;
    }
  }

  /* ------------------------------------------------ "what's new" highlights */
  if (cfg.highlight) {
    var marks = [];
    function mark(label, rectFn) {
      var ring = el("div", { class: "ring" });
      var tag = el("div", { class: "tag" }, text(label));
      root.appendChild(ring);
      root.appendChild(tag);
      marks.push({ ring: ring, tag: tag, rect: rectFn });
    }
    function dockLabel() {
      var names = [];
      dock.querySelectorAll("a, button").forEach(function (b) {
        if (b.style.display !== "none") names.push(b.getAttribute("aria-label") || b.textContent.trim());
      });
      return "New · " + names.join(", ");
    }
    function place() {
      if (marks[0]) marks[0].tag.textContent = dockLabel();
      marks.forEach(function (m) {
        var r = m.rect();
        if (!r || !r.width) {
          m.ring.style.display = m.tag.style.display = "none";
          return;
        }
        m.ring.style.display = m.tag.style.display = "";
        m.ring.style.left = r.left - 6 + "px";
        m.ring.style.top = r.top - 6 + "px";
        m.ring.style.width = r.width + 12 + "px";
        m.ring.style.height = r.height + 12 + "px";
        var tw = m.tag.offsetWidth;
        var left = Math.min(window.innerWidth - tw - 8, Math.max(8, r.left + r.width / 2 - tw / 2));
        m.tag.style.left = left + "px";
        m.tag.style.top = r.top - 44 + "px";
        m.tag.style.setProperty("--x", r.left + r.width / 2 - left + "px");
      });
    }
    mark("New", function () {
      return dock.getBoundingClientRect();
    });
    mark("New · AI assistant", function () {
      var b = document.querySelector(".fs-w-btn");
      return b ? b.getBoundingClientRect() : null;
    });
    var tries = 0;
    var t = setInterval(function () {
      place();
      if (++tries > 40) clearInterval(t);
    }, 150);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
  }
})();
