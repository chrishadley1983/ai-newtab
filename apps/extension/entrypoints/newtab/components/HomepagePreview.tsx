import { SandpackLayout, SandpackPreview, SandpackProvider } from "@codesandbox/sandpack-react";
import { LINK_MESSAGE_SOURCE } from "@/lib/link-overlay";

const INDEX_JS = `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

// Links can't navigate out of this sandboxed frame, so hand every click to the
// new-tab page: a plain click opens the reading overlay, a modified or middle
// click opens a real tab.
function handOff(e) {
  const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
  if (!a || !/^https?:/i.test(a.href)) return;
  if (e.type === "auxclick" && e.button !== 1) return;
  e.preventDefault();
  const tab = e.type === "auxclick" || e.ctrlKey || e.metaKey || e.shiftKey;
  window.top.postMessage(
    { source: "${LINK_MESSAGE_SOURCE}", kind: tab ? "open-tab" : "open-overlay", url: a.href,
      title: (a.textContent || "").trim().slice(0, 200) },
    "*",
  );
}
document.addEventListener("click", handOff, true);
document.addEventListener("auxclick", handOff, true);
// Focus often stays in this frame after a click; pass Esc up so it still closes the overlay.
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.top.postMessage({ source: "${LINK_MESSAGE_SOURCE}", kind: "close-overlay" }, "*");
});`;

const INDEX_HTML = `<!DOCTYPE html>
<html><head><title>My Personalized Homepage</title></head>
<body><div id="root"></div></body></html>`;

/**
 * Renders the agent's component in a Sandpack iframe. The code is
 * model-generated, so it runs sandboxed rather than in the extension's own page.
 */
export function HomepagePreview({ code }: { code: string }) {
  const files = {
    "/App.js": { code },
    "/index.js": { code: INDEX_JS },
    "/index.html": { code: INDEX_HTML },
  };

  return (
    <SandpackProvider files={files} template="react" options={{ autorun: true }}>
      <SandpackLayout style={{ height: "100vh", width: "100vw" }}>
        <SandpackPreview style={{ height: "100%" }} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
