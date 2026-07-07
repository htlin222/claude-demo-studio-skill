/* =========================================================================
   Claude Demo Studio — presentation frame
   Wraps #app in a macOS window on a decorative background. Enabled per
   scenario via `frame`:
     "frame": {
       "enabled": true,
       "title": "Claude — Opus 4.8",
       "background": "mesh",   // clay|sunset|dusk|mesh|paper|ink OR any CSS value
       "padding": 64,           // backdrop padding (px)
       "width": 1200,           // window width (px)
       "height": 760            // window body height (px)
     }
   Runs before the player fills #app (players fetch #app by id, so moving it
   into the window first is safe).
   ========================================================================= */
(() => {
  const S = window.SCENARIO || {};
  const f = S.frame;
  if (!f || !f.enabled) return;

  const PRESETS = ["clay", "sunset", "dusk", "mesh", "paper", "ink"];
  const app = document.getElementById("app");
  if (!app) return;

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  const bg = f.background || "mesh";
  if (PRESETS.includes(bg)) backdrop.dataset.bg = bg;
  else backdrop.style.background = bg;
  if (f.padding != null) backdrop.style.setProperty("--frame-pad", f.padding + "px");

  const cam = document.createElement("div");
  cam.className = "camera"; cam.id = "camera";

  const win = document.createElement("div");
  win.className = "mac-window";
  if (f.width) win.style.setProperty("--win-w", f.width + "px");
  if (f.height) win.style.setProperty("--win-h", f.height + "px");

  const bar = document.createElement("div");
  bar.className = "titlebar";
  const title = (f.title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  bar.innerHTML = '<div class="lights"><span class="light r"></span>'
    + '<span class="light y"></span><span class="light g"></span></div>'
    + '<div class="wtitle">' + title + "</div>";

  const body = document.createElement("div");
  body.className = "window-body";

  app.parentNode.insertBefore(backdrop, app);
  backdrop.appendChild(cam);
  cam.appendChild(win);
  win.appendChild(bar);
  win.appendChild(body);
  body.appendChild(app);
  document.body.classList.add("framed");
})();
