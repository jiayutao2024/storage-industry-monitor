(() => {
  "use strict";
  const root = window.DASHBOARD_ROOT || "./";
  const app = document.querySelector("#app");

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const n = (value, digits=1) => Number(value).toLocaleString("zh-CN",{minimumFractionDigits:digits,maximumFractionDigits:digits});
  const compact = value => new Intl.NumberFormat("zh-CN",{notation:"compact",maximumFractionDigits:1}).format(Number(value));
  const dateText = value => value ? new Date(value).toLocaleString("zh-CN",{hour12:false}) : "未生成";
  const sourceLink = (url,label="来源") => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>` : '<span class="muted">来源待补</span>';
  const sectionHead = (title,subtitle,note="") => `<div class="section-head"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${note?`<div class="source-note">${note}</div>`:""}</div>`;

  async function loadDashboard() {
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

  loadDashboard();
})();
