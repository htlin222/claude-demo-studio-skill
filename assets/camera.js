/* =========================================================================
   Claude Demo Studio — camera (zoom / pan)
   Scenario-driven keyframes that scale + translate a `.camera` layer, giving
   a screencast "camera" that zooms into parts of the UI:
     "camera": [
       { "at": 0,    "zoom": 1 },                         // wide
       { "at": 1800, "zoom": 1.7, "target": ".composer" },// zoom to composer
       { "at": 1800, "ms": 700 },                          // optional move speed
       { "at": 4200, "zoom": 1 }                           // back out
     ]
   `target` is a CSS selector (centered in view); or give explicit `x`/`y`
   (px) offsets. Deterministic under Chrome virtual-time.
   ========================================================================= */
(() => {
  const S = window.SCENARIO || {};
  const kfs = S.camera;
  if (!kfs || !kfs.length) return;

  // ensure a camera layer exists (frame.js makes one; otherwise wrap #app)
  let cam = document.getElementById("camera");
  if (!cam) {
    const app = document.getElementById("app");
    if (!app) return;
    cam = document.createElement("div");
    cam.className = "camera"; cam.id = "camera";
    app.parentNode.insertBefore(cam, app);
    cam.appendChild(app);
  }

  const host = () => document.querySelector(".window-body") || cam;

  function focus(kf) {
    const z = kf.zoom != null ? kf.zoom : 1;
    let tx = kf.x || 0, ty = kf.y || 0;
    if (kf.ms != null) cam.style.setProperty("--cam-ms", kf.ms + "ms");
    if (kf.target) {
      const el = document.querySelector(kf.target);
      const h = host();
      if (el && h) {
        const hr = h.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        const cx = (er.left + er.width / 2) - (hr.left + hr.width / 2);
        const cy = (er.top + er.height / 2) - (hr.top + hr.height / 2);
        tx = -cx * z; ty = -cy * z;
      }
    }
    cam.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`;
  }

  kfs.forEach((kf) => setTimeout(() => focus(kf), kf.at || 0));
})();
