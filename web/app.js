(() => {
  "use strict";
  const PASSWORD_SHA256 = "2926a2731f4b312c08982cacf8061eb14bf65c1a87cc5d70e864e079c6220731";
  const root = window.DASHBOARD_ROOT || "./";
  const gate = document.querySelector("#access-gate");
  const site = document.querySelector("#site");
  const app = document.querySelector("#app");
  let loaded = false;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const n = (value, digits=1) => Number(value).toLocaleString("zh-CN",{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const compact = value => new Intl.NumberFormat("zh-CN",{notation:"compact",maximumFractionDigits:1}).format(Number(value));
  const dateText = value => value ? new Date(value).toLocaleString("zh-CN",{hour12:false}) : "未生成";
  const sourceLink = (url,label="来源") => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : '<span class="muted">来源待补</span>';
  const sectionHead = (title,subtitle,note="") => `<div class="section-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${note?`<div class="source-note">${note}</div>`:""}</div>`;

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
  }

  async function loadDashboard() {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch(`${root}api/dashboard.json`, {cache:"no-store"});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      document.title = data.meta.title;
      document.querySelector("#header-freshness").textContent = `最新 ${dateText(data.meta.generated_at)} · ${data.meta.schedule}`;
      document.querySelector("#public-policy").textContent = data.meta.public_policy;
      window.StorageDashboard.render(data,{root,app,esc,n,compact,dateText,sourceLink,sectionHead});
    } catch (error) {
      app.innerHTML = `<section class="error"><h2>快照暂时不可用</h2><p>${esc(error.message)}</p></section>`;
    }
  }

  async function unlock(password, remember=true) {
    if (await sha256(password) !== PASSWORD_SHA256) return false;
    document.body.classList.remove("locked");
    gate.hidden = true; site.setAttribute("aria-hidden","false");
    if (remember) sessionStorage.setItem("storage_access","granted");
    await loadDashboard();
    return true;
  }

  document.querySelector("#access-form").addEventListener("submit", async event => {
    event.preventDefault();
    const field=document.querySelector("#access-password"), error=document.querySelector("#gate-error");
    error.textContent="";
    if (!(await unlock(field.value))) {
      error.textContent="密码不正确，请重新输入。"; field.select();
    }
  });
  document.querySelector("#lock-button").addEventListener("click",()=>{sessionStorage.removeItem("storage_access");location.reload();});
  if (sessionStorage.getItem("storage_access") === "granted") unlock("8888",false);
})();
