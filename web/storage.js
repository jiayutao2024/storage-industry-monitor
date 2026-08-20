(() => {
  "use strict";

  const PAGES = [
    ["overview","今日总览","今天发生了什么，影响哪个期限"],
    ["cycle","周期与价格","现货、合约价、库存与盈利验证"],
    ["supply","供需与有效bit","需求增量何时撞上可销售供给"],
    ["products","产品与技术","不同数据负载对应不同存储价值池"],
    ["companies","竞争格局与公司","谁能把结构趋势转化为收入与现金流"],
    ["events","事件与新闻库","从传闻到出货收入的证据升级"],
    ["data","数据与方法","口径、来源、更新与模型边界"]
  ];
  const COLORS = ["#aa0002","#44484c","#c17a2b","#7d5aa6","#3b7d6b","#9c9c9c"];
  const num = (v,d=1) => Number(v).toLocaleString("zh-CN",{minimumFractionDigits:d,maximumFractionDigits:d});
  const finite = v => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  function tooltip() {
    let node = document.querySelector("#storage-chart-tooltip");
    if (!node) {
      node = document.createElement("div"); node.id="storage-chart-tooltip"; node.className="chart-tooltip";
      document.body.appendChild(node);
    }
    return node;
  }

  function lineChart(id, categories, series, opts={}) {
    const W=720,H=255,L=48,R=18,T=18,B=38;
    const all=series.flatMap(s=>s.values).filter(finite).map(Number);
    let ymin=opts.min != null ? opts.min : Math.min(...all), ymax=opts.max != null ? opts.max : Math.max(...all);
    if (ymin===ymax) ymax=ymin+1;
    const pad=(ymax-ymin)*.08; if(opts.min==null)ymin-=pad;if(opts.max==null)ymax+=pad;
    const x=i=>L+(categories.length<2?0:(W-L-R)*i/(categories.length-1));
    const y=v=>T+(H-T-B)*(ymax-Number(v))/(ymax-ymin);
    const ticks=5;
    const grid=Array.from({length:ticks+1},(_,i)=>{const v=ymax-(ymax-ymin)*i/ticks,yy=y(v);return `<line class="gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-7}" y="${yy+3}" text-anchor="end">${opts.percent?num(v,0)+"%":num(v,opts.digits??0)}</text>`}).join("");
    const tickCount=Math.min(8,categories.length),tickIndices=new Set(Array.from({length:tickCount},(_,k)=>tickCount<2?0:Math.round(k*(categories.length-1)/(tickCount-1))));
    const labels=categories.map((c,i)=>tickIndices.has(i)?`<text x="${x(i)}" y="${H-12}" text-anchor="middle">${String(c).replace(/^20/,"")}</text>`:"").join("");
    const showMarkers=categories.length<=24;
    const paths=series.map((s,si)=>{
      let path="",started=false;
      s.values.forEach((v,i)=>{if(!finite(v)){started=false;return;}path+=`${started?"L":"M"}${x(i)},${y(v)} `;started=true;});
      const points=showMarkers?s.values.map((v,i)=>finite(v)?`<circle class="point" data-chart="${id}" data-series="${si}" data-x="${i}" cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color||COLORS[si%COLORS.length]}"/>`:"").join(""):"";
      return `<g data-series-group="${si}"><path class="line" d="${path}" stroke="${s.color||COLORS[si%COLORS.length]}"/>${points}</g>`;
    }).join("");
    const zero=ymin<0&&ymax>0?`<line class="zero" x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}"/>`:"";
    const focus=series.map((s,i)=>`<circle class="crosshair-point" data-focus="${i}" r="5" fill="${s.color||COLORS[i%COLORS.length]}"/>`).join("");
    return `<div class="chart" id="${id}" data-chart-type="line"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${zero}<line class="axis" x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}"/>${labels}${paths}<g class="crosshair-layer"><line class="crosshair-line" x1="${L}" x2="${L}" y1="${T}" y2="${H-B}"/>${focus}</g><rect class="chart-hitbox" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}"/></svg><div class="chart-legend">${series.map((s,i)=>`<span class="legend-key" data-legend="${i}"><i style="background:${s.color||COLORS[i%COLORS.length]}"></i>${s.name}</span>`).join("")}</div></div>`;
  }

  function rangeChart(id,categories,lows,highs,opts={}){
    const W=720,H=255,L=48,R=18,T=20,B=42,all=[...lows,...highs].filter(finite).map(Number),min=Math.min(0,...all),max=Math.max(1,...all),range=max-min||1;
    const y=v=>T+(H-T-B)*(max-Number(v))/range,group=(W-L-R)/categories.length,bw=Math.min(42,group*.48),base=y(0);
    const grid=Array.from({length:5},(_,i)=>{const v=max-(max-min)*i/4,yy=y(v);return `<line class="gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-7}" y="${yy+3}" text-anchor="end">${num(v,0)}%</text>`}).join("");
    const marks=categories.map((c,i)=>{const lo=Number(lows[i]),hi=Number(highs[i]),x=L+i*group+group/2,top=y(hi),bottom=y(lo);return `<line class="range-stem" x1="${x}" x2="${x}" y1="${top}" y2="${bottom}"/><rect class="range-band" data-chart="${id}" data-x="${i}" x="${x-bw/2}" y="${top}" width="${bw}" height="${Math.max(bottom-top,3)}" rx="4"/><text class="range-label" x="${x}" y="${top-6}" text-anchor="middle">${lo===hi?`${num(lo,0)}%`:`${num(lo,0)}~${num(hi,0)}%`}</text><text x="${x}" y="${H-14}" text-anchor="middle">${c}</text>`}).join("");
    return `<div class="chart" id="${id}" data-chart-type="range"><svg viewBox="0 0 ${W} ${H}">${grid}<line class="zero" x1="${L}" x2="${W-R}" y1="${base}" y2="${base}"/>${marks}</svg></div>`;
  }

  function barChart(id, labels, values, opts={}) {
    const W=720,H=255,L=48,R=18,T=18,B=48;
    const vals=values.flat?values:[]; const max=Math.max(...vals.filter(finite).map(Number),1), min=Math.min(...vals.filter(finite).map(Number),0);
    const range=max-min||1, base=T+(H-T-B)*max/range, group=(W-L-R)/Math.max(labels.length,1), bw=group*.62;
    const grid=Array.from({length:5},(_,i)=>{const v=max-(max-min)*i/4,yy=T+(H-T-B)*(max-v)/range;return `<line class="gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-7}" y="${yy+3}" text-anchor="end">${opts.percent?num(v,0)+"%":num(v,0)}</text>`}).join("");
    const bars=labels.map((lab,i)=>{const v=Number(values[i]),xx=L+i*group+(group-bw)/2, yy=T+(H-T-B)*(max-v)/range,hh=Math.abs(base-yy);return `<rect class="bar" data-chart="${id}" data-x="${i}" x="${xx}" y="${Math.min(base,yy)}" width="${bw}" height="${Math.max(hh,1)}" rx="2" fill="${opts.colors?.[i]||COLORS[i%COLORS.length]}"/><text x="${xx+bw/2}" y="${H-27}" text-anchor="middle">${lab}</text><text x="${xx+bw/2}" y="${v>=0?yy-5:yy+13}" text-anchor="middle" style="fill:#333;font-weight:700">${opts.percent?num(v,1)+"%":num(v,opts.digits??0)}</text>`}).join("");
    return `<div class="chart" id="${id}" data-chart-type="bar"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}<line class="axis" x1="${L}" x2="${W-R}" y1="${base}" y2="${base}"/>${bars}</svg></div>`;
  }

  function donutChart(id, labels, values) {
    const total=values.reduce((a,b)=>a+Number(b),0)||1; let acc=0;
    const stops=values.map((v,i)=>{const a=acc/total*100;acc+=Number(v);return `${COLORS[i%COLORS.length]} ${a}% ${acc/total*100}%`}).join(",");
    return `<div class="chart" id="${id}" style="display:grid;grid-template-columns:210px 1fr;align-items:center;min-height:245px"><div style="width:178px;height:178px;border-radius:50%;background:conic-gradient(${stops});position:relative;margin:auto"><div style="position:absolute;inset:43px;background:#fff;border-radius:50%;display:grid;place-items:center;text-align:center"><b>${num(total,0)}%</b><small>合计</small></div></div><div class="chart-legend">${labels.map((x,i)=>`<span class="legend-key"><i style="height:10px;background:${COLORS[i%COLORS.length]}"></i>${x} ${num(values[i],1)}%</span>`).join("")}</div></div>`;
  }

  function wireCharts(specs) {
    const tip=tooltip();
    document.querySelectorAll(".chart .point,.chart .bar,.chart .range-band").forEach(el=>{
      el.addEventListener("mousemove",e=>{
        const s=specs[el.dataset.chart]; if(!s)return; const i=Number(el.dataset.x),si=Number(el.dataset.series||0), value=s.series? s.series[si].values[i]:s.values[i];
        const name=s.series?s.series[si].name:s.name||"数值",range=s.lows?`${num(s.lows[i],0)}% ~ ${num(s.highs[i],0)}%`:null;
        tip.innerHTML=`<b>${s.categories[i]}</b>${name}：<em>${range||`${finite(value)?num(value,s.digits??1):"—"}${s.unit||""}`}</em>${s.note?`<br><span>${s.note}</span>`:""}`;
        tip.style.display="block";tip.style.left=`${Math.min(innerWidth-280,e.clientX+14)}px`;tip.style.top=`${Math.min(innerHeight-110,e.clientY+14)}px`;
      });
      el.addEventListener("mouseleave",()=>tip.style.display="none");
    });
    document.querySelectorAll('.chart[data-chart-type="line"]').forEach(chart=>{
      const spec=specs[chart.id],svg=chart.querySelector("svg"),hit=chart.querySelector(".chart-hitbox"),layer=chart.querySelector(".crosshair-layer");if(!spec?.series||!hit)return;
      const W=720,L=48,R=18,T=18,H=255,B=38,cats=spec.categories||[],all=spec.series.flatMap(s=>s.values).filter(finite).map(Number);if(!cats.length||!all.length)return;
      let ymin=Math.min(...all),ymax=Math.max(...all);if(ymin===ymax)ymax=ymin+1;const pad=(ymax-ymin)*.08;ymin-=pad;ymax+=pad;
      const x=i=>L+(cats.length<2?0:(W-L-R)*i/(cats.length-1)),y=v=>T+(H-T-B)*(ymax-Number(v))/(ymax-ymin);
      hit.addEventListener("mousemove",e=>{const rect=svg.getBoundingClientRect(),vx=(e.clientX-rect.left)/rect.width*W,i=Math.max(0,Math.min(cats.length-1,Math.round((vx-L)/(W-L-R)*(cats.length-1))));layer.style.display="block";layer.querySelector(".crosshair-line").setAttribute("x1",x(i));layer.querySelector(".crosshair-line").setAttribute("x2",x(i));
        const rows=spec.series.map((s,si)=>{const v=s.values[i],dot=layer.querySelector(`[data-focus="${si}"]`);if(finite(v)){dot.style.display="";dot.setAttribute("cx",x(i));dot.setAttribute("cy",y(v));}else dot.style.display="none";return `<span class="tooltip-row"><i style="background:${s.color||COLORS[si%COLORS.length]}"></i><label>${s.name}</label><em>${finite(v)?num(v,spec.digits??1)+(spec.unit||""):"—"}</em></span>`}).join("");
        tip.innerHTML=`<b>${cats[i]}</b><div class="tooltip-series">${rows}</div>${spec.note?`<small>${spec.note}</small>`:""}`;tip.style.display="block";tip.style.left=`${Math.min(innerWidth-290,e.clientX+14)}px`;tip.style.top=`${Math.min(innerHeight-190,e.clientY+14)}px`;
      });
      hit.addEventListener("mouseleave",()=>{layer.style.display="none";tip.style.display="none"});
    });
    document.querySelectorAll(".legend-key[data-legend]").forEach(el=>el.addEventListener("click",()=>{
      const chart=el.closest(".chart"),group=chart.querySelector(`[data-series-group="${el.dataset.legend}"]`); if(group){const off=group.style.display!=="none";group.style.display=off?"none":"";el.classList.toggle("off",off);}
    }));
  }

  function card(title,value,foot,red=false){return `<article class="card storage-card"><div class="kpi-label">${title}</div><div class="metric-reading ${red?"red":""}">${value}</div><div class="metric-foot">${foot}</div></article>`}
  function chartCard(title,subtitle,chart,note=""){return `<article class="card chart-card"><div class="chart-head"><div><h3>${title}</h3><p>${subtitle}</p></div><div class="chart-note">${note}</div></div>${chart}</article>`}
  function table(headers,rows,cls=""){return `<div class="table-wrap ${cls}"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}
  function volumeText(value){const v=Number(value);if(!Number.isFinite(v)||!v)return "—";if(v>=1e8)return num(v/1e8,2)+"亿";if(v>=1e4)return num(v/1e4,1)+"万";return num(v,0)}
  function logoFile(symbol){return `assets/logos/${String(symbol||"").replace(/[^a-z0-9]/gi,"-")}.png`}
  function logoMark(x){const fallback=x.icon||x.short_name?.slice(0,1)||"M";return `<span class="company-logo"><em>${fallback}</em><img src="${logoFile(x.symbol)}" alt="${x.short_name||x.name} Logo" loading="lazy" onerror="this.remove()"></span>`}
  function companyTile(x){const change=Number(x.change_pct),tone=change>0?"up":change<0?"down":"flat";return `<article class="company-pulse ${tone}"><div class="company-pulse-head">${logoMark(x)}<div><b>${x.short_name||x.name}</b><small>${x.symbol}</small></div><span class="market-state">${x.listed===false?"未上市":x.trade_date||"待更新"}</span></div><div class="company-price">${x.listed===false?"—":x.price==null?"待更新":`${x.currency||""} ${num(x.price,2)}`}<em>${x.change_pct==null?"":`${change>0?"+":""}${num(change,2)}%`}</em></div><p>${x.daily_note||(`${x.role}；${x.listed===false?"跟踪事件与验证节点":"成交量 "+volumeText(x.volume)}`)}</p></article>`}

  function shell(page, body, H) {
    const info=PAGES.find(x=>x[0]===page)||PAGES[0];
    return `<div class="storage-shell"><aside class="storage-nav"><div class="storage-nav-title">RESEARCH VIEWS</div>${PAGES.map((p,i)=>`<a href="?page=${p[0]}" data-storage-page="${p[0]}" class="${p[0]===page?"active":""}"><span class="nav-index">0${i+1}</span>${p[1]}</a>`).join("")}</aside><div class="storage-content"><div class="storage-topbar"><div class="view-title"><h2>${info[1]}</h2><p>${info[2]}</p></div><select class="filter-chip" id="global-product"><option value="">全部产品</option><option>DRAM</option><option>HBM</option><option>NAND</option><option>SSD</option><option>HDD</option></select><span class="tag red">05:00 / 17:00 更新</span></div>${body}</div></div>`;
  }

  function overview(D,R,H) {
    const S=D.storage, metrics=S.price_metrics||[], fresh=metrics.filter(x=>x.freshness?.status!=="stale");
    const up=fresh.filter(x=>Number(x.change_pct)>0).length, down=fresh.filter(x=>Number(x.change_pct)<0).length;
    const news=(S.daily?.events||[]).slice(0,5), companies=S.homepage_market||[];
    const body=`<section class="section daily-brief"><div><span class="brief-date">DAILY VIEW · ${(D.meta.generated_at||"").slice(0,10)}</span><h3>${S.cycle.label||"价格状态待更新"}，AI结构需求仍是中期主线</h3><p>短期继续验证现货向合约价与盈利传导；中期关注HBM/eSSD增量能否快于有效bit供给；长期观察两长技术、客户和量产证据。</p></div><div class="brief-metrics"><span><b>${up}/${fresh.length}</b>上涨指标</span><span><b>${down}</b>下跌指标</span><span><b>${news.length}</b>核心新闻</span></div></section>
    <section class="section"><div class="horizon-ribbon">${R.horizons.map(x=>`<div><small>${x.label}</small><b>${x.state}</b><span>${x.question}</span></div>`).join("")}</div></section>
    <section class="section"><div class="section-head"><div><h2>核心原厂动态</h2><p>上市公司显示最近完整交易日；未上市公司显示事件与验证状态。</p></div><a href="?page=companies">查看完整产业链 →</a></div><div class="company-pulse-grid">${companies.map(companyTile).join("")||'<div class="empty">行情正在首次更新，完成后将展示七家核心原厂。</div>'}</div></section>
    <section class="section"><div class="section-head"><div><h2>今日五条</h2><p>按相关性、来源等级与国内外覆盖筛选；标题可回到原文。</p></div><a href="?page=events">进入历史事件库 →</a></div><div class="top-news">${news.map((x,i)=>`<article><span class="news-rank">0${i+1}</span><div><a href="${x.url}" target="_blank" rel="noopener">${x.title_zh||x.title}</a><p>${(x.brief_zh||"").replace(/^报道显示：/,"")}</p><small>${(x.published_at||"").slice(5,16).replace("T"," ")} · ${x.publisher||"—"} · T${x.source_tier||"—"} · ${x.evidence_stage||"未明确"}</small></div></article>`).join("")||'<div class="empty">本轮暂无满足条件的核心新闻。</div>'}</div></section>`;
    return {html:shell("overview",body),charts:{}};
  }

  function cycle(D,R) {
    const hist=(D.storage.price_history||[]).filter(x=>finite(x.price)&&Number(x.price)>0), metrics=(D.storage.price_metrics||[]).filter(x=>finite(x.price)&&Number(x.price)>0);
    const cp=R.contract_price_cycle,changes=metrics.filter(x=>finite(x.change_pct));
    const depth=[...new Set(hist.map(x=>x.metric_id))].map(id=>{const rows=hist.filter(x=>x.metric_id===id).sort((a,b)=>a.date.localeCompare(b.date));return {name:rows[0]?.segment||id,count:rows.length,from:rows[0]?.date,to:rows.at(-1)?.date}}).sort((a,b)=>b.count-a.count);
    const priceRows=metrics.sort((a,b)=>(a.product+a.segment).localeCompare(b.product+b.segment));
    const body=`<section class="section"><div class="callout"><b>价格页采用三层口径：</b>①行业周期看同口径季度合约价涨跌区间；②交易景气看同一规格现货/模组快照；③盈利验证看原厂ASP、收入与毛利。公开快照不足8点时不再连接成趋势线。</div></section><section class="section storage-grid-2">${chartCard("传统DRAM整体合约价季度环比","不含HBM；区间为TrendForce各期公开调查/预测，E表示预测",rangeChart("dram-contract-range",cp.dram.periods,cp.dram.low_pct,cp.dram.high_pct),"百分比区间 · 2025Q2—2026Q3E")}${chartCard("NAND Flash整体合约价季度环比","整体合约价口径；不混入晶圆现货、SSD零售价或单一产品",rangeChart("nand-contract-range",cp.nand.periods,cp.nand.low_pct,cp.nand.high_pct),"百分比区间 · 2025Q3—2026Q3E")}</section><section class="section storage-grid-2"><article class="card storage-card"><h3>最新公开价格快照</h3><p class="metric-foot">每行保持原规格、原单位和来源日期；仅比较同一行的后续观察。</p>${table(["产品/层级","完整规格","报价类型","均价","来源变化","观察时间"],priceRows.map(x=>`<tr><td><span class="tag red">${x.product}</span><br><small>${x.segment}</small></td><td><b>${x.item}</b></td><td>${x.quote_type}</td><td class="num">${x.currency||"USD"} ${num(x.price,3)}</td><td class="num">${finite(x.change_pct)?(Number(x.change_pct)>0?"+":"")+num(x.change_pct,2)+"%":"—"}</td><td>${(x.observed_at||"").slice(0,16).replace("T"," ")}</td></tr>`))}</article><article class="card storage-card"><h3>价格传导验证链</h3><div class="price-ladder"><div><b>1 现货/渠道</b><span>同规格spot、模组报价、渠道库存和交期</span><em>领先但噪声大</em></div><div><b>2 合约价格</b><span>PC、服务器、Mobile、NAND各产品季度合约</span><em>核心周期指标</em></div><div><b>3 原厂ASP与收入</b><span>ASP上涨需结合bit shipment，区分价格和销量贡献</span><em>财务同步验证</em></div><div><b>4 毛利与现金流</b><span>库存成本、产品组合、折旧和资本开支决定盈利弹性</span><em>最终兑现</em></div></div><p class="metric-foot">不能用SSD零售价上涨直接推出NAND原厂ASP，也不能用一个DDR4规格代表全部DRAM。</p></article></section><section class="section storage-grid-2">${chartCard("最新规格价格变化","仅为各来源页披露的当期变化，周期可能是日/周/月；用于扫描，不横向排名",barChart("price-change",changes.map(x=>x.segment),changes.map(x=>Number(x.change_pct)),{percent:true}),"规格口径见下表") }<article class="card storage-card"><h3>公开快照覆盖审计</h3>${table(["规格层级","有效点","起始","最新","可否画趋势"],depth.map(x=>`<tr><td>${x.name}</td><td class="num">${x.count}</td><td>${x.from}</td><td>${x.to}</td><td>${x.count>=8?'<span class="tag red">可以</span>':'仅作锚点'}</td></tr>`))}<p class="metric-foot">历史下载属于TrendForce付费服务；本站只保存公开页面观察，不补造缺失日期。</p></article></section><section class="section card storage-card"><h3>逐规格来源与定义</h3>${table(["产品","完整规格","层级/报价","币种与单位","数据日","来源"],priceRows.map(x=>`<tr><td>${x.product}</td><td><b>${x.item}</b></td><td>${x.segment} / ${x.quote_type}</td><td>${x.currency||"USD"} / ${x.unit||"来源原单位"}</td><td>${(x.observed_at||"").slice(0,10)}</td><td><a href="${x.source_url}" target="_blank" rel="noopener">${x.source_name||"TrendForce"} ↗</a></td></tr>`))}<p class="source-note">${cp.note}</p></section>`;
    return {html:shell("cycle",body),charts:{"dram-contract-range":{categories:cp.dram.periods,lows:cp.dram.low_pct,highs:cp.dram.high_pct,name:"传统DRAM合约价环比"},"nand-contract-range":{categories:cp.nand.periods,lows:cp.nand.low_pct,highs:cp.nand.high_pct,name:"NAND合约价环比"},"price-change":{categories:changes.map(x=>x.item),values:changes.map(x=>Number(x.change_pct)),name:"来源变化",unit:"%",digits:2}}};
  }

  function supply(D,R) {
    const y=R.models.years,d=R.models.dram.base,n=R.models.nand.base,h=R.structural_data.hbm_wafer_input,t=R.structural_data.terminal_demand_2026,mix=R.structural_data.nand_demand_mix_2026;
    const body=`<section class="section storage-grid-2">${chartCard("DRAM：需求与有效供给指数","2025=100；基准情景",lineChart("dram-index",y,[{name:"需求",values:d.demand_index,color:COLORS[0]},{name:"有效供给",values:d.supply_index,color:COLORS[1]}]),"G3研究测算")}${chartCard("NAND：需求与有效供给指数","2025=100；总量转平不等于eSSD转松",lineChart("nand-index",y,[{name:"需求",values:n.demand_index,color:COLORS[0]},{name:"有效供给",values:n.supply_index,color:COLORS[1]}]),"G3研究测算")}</section><section class="section storage-grid-2">${chartCard("供需缺口路径","负值=短缺；正值=宽松",lineChart("gap-path",y,[{name:"DRAM",values:d.gap_pct,color:COLORS[0]},{name:"NAND",values:n.gap_pct,color:COLORS[4]}],{percent:true}),"研究情景，不是行业指引")}${chartCard("HBM晶圆投入与bit贡献","晶圆占比显著高于bit占比，差值体现对传统DRAM有效供给的挤占",lineChart("hbm-wafer",h.years,[{name:"wafer input",values:h.share_pct,color:COLORS[0]},{name:"bit贡献",values:h.bit_share_pct,color:COLORS[1]}],{percent:true}),"TrendForce预测")}</section><section class="section storage-grid-2">${chartCard("2026E终端需求剪刀差","服务器为出货口径，手机/笔电为产量口径；只比较方向",barChart("terminal-demand",t.labels,t.values,{percent:true}),"手机采用区间中值绘图") }<article class="card storage-card"><h3>NAND需求结构锚点</h3><div class="storage-grid-3">${card("服务器bit需求",`>${mix.server_bit_share_floor}%`,"2026E；不是收入份额",true)}${card("手机+笔电",`约${mix.smartphone_notebook_share_approx}%`,"2026E NAND bit需求")}${card("中国bit产出",`接近${mix.china_bit_output_share_forecast}%`,"全球占比预测")}</div><p class="metric-foot">服务器成为最大单一增量，但消费端合计仍不可忽略；三者口径不可直接相加推导总需求增速。</p></article></section><section class="section storage-grid-2"><article class="card storage-card"><h3>有效bit，而不是厂房数量</h3><div class="model-formula">${R.models.effective_bit}</div><p>设备订单、厂房建设与WPM只是供给链的前段。OEE、良率、单die容量、产品良率与客户认证共同决定可销售供给。</p><p class="metric-foot">${R.models.formula}</p></article><article class="card storage-card"><h3>新增产能时间轴</h3><div class="timeline">${R.capacity_timeline.map(x=>`<div class="timeline-item"><b>${x.date} · ${x.company}</b><p><strong>${x.milestone}</strong>｜${x.meaning}</p><span class="tag ${x.status==="公司公告"?"red":""}">${x.status}</span></div>`).join("")}</div></article></section>`;
    return {html:shell("supply",body),charts:{"dram-index":{categories:y,series:[{name:"需求",values:d.demand_index},{name:"有效供给",values:d.supply_index}],digits:1},"nand-index":{categories:y,series:[{name:"需求",values:n.demand_index},{name:"有效供给",values:n.supply_index}],digits:1},"gap-path":{categories:y,series:[{name:"DRAM",values:d.gap_pct},{name:"NAND",values:n.gap_pct}],unit:"%",digits:2},"hbm-wafer":{categories:h.years,series:[{name:"wafer input",values:h.share_pct},{name:"bit贡献",values:h.bit_share_pct}],unit:"%",digits:0},"terminal-demand":{categories:t.labels,values:t.values,name:"同比",unit:"%",digits:1}}};
  }

  function products(D,R) {
    const e=R.structural_data.enterprise_ssd,ev=R.structural_data.enterprise_ssd_vendor_share_q1_2026,er=R.structural_data.enterprise_ssd_revenue_anchors,hs=R.structural_data.hbm_share_q1_2026;
    const tree=(R.industry_tree||[]).map((g,gi)=>`<article class="tree-group"><div class="tree-group-head"><span>0${gi+1}</span><div><h3>${g.group}</h3><small>${g.english}</small><p>${g.role}</p></div></div><div class="tree-branches">${g.branches.map(b=>`<details class="tree-node" ${gi<2&&["DRAM","NAND Flash","SSD","HBM"].includes(b.name)?"open":""}><summary><b>${b.name}</b><span>${b.full}</span></summary><div class="tree-node-body"><p><strong>是什么：</strong>${b.what}</p><p><strong>关键分支：</strong>${b.children}</p><p><strong>产业链：</strong>${b.chain}</p></div></details>`).join("")}</div></article>`).join("");
    const body=`<section class="section"><div class="callout"><b>读图方法：</b>先按“计算中的数据→持久数据→扩展与池化→温冷归档”理解介质，再沿“晶圆/颗粒→控制器与封装→模组/系统→客户认证”寻找价值增量。缩写首次出现均给出英文全称与中文含义。</div></section><section class="section storage-memory-pyramid"><div><b>更快 / 更贵 / 更靠近计算</b><span>SRAM → HBM / DRAM → SCM / CXL扩展 → Enterprise SSD → HDD → Tape</span><em>更大 / 更便宜 / 更强调持久性与归档</em></div></section><section class="section industry-tree">${tree}</section><section class="section storage-grid-2">${chartCard("企业级SSD厂商收入份额","2026Q1；由各厂商收入/18.46bn计算",donutChart("essd-vendor-share",ev.labels,ev.share_pct),"TrendForce · 收入口径")}${chartCard("企业级SSD市场收入锚点","离散季度，不对缺失季度插值",barChart("essd-revenue",er.periods,er.revenue_usd_b,{digits:2,colors:[COLORS[1],COLORS[1],COLORS[0]]}),"十亿美元 · TrendForce")}</section><section class="section storage-grid-2">${chartCard("企业级SSD占NAND收入","2026Q1当前份额：eSSD 43%、其他NAND 57%",donutChart("essd-value-pool",["企业级SSD","其他NAND"],[e.revenue_share_pct[0],100-e.revenue_share_pct[0]]),"Counterpoint · 2026E预计>60%")}${chartCard("HBM竞争格局","2026Q1收入份额",donutChart("hbm-share",hs.labels,hs.values),"Counterpoint · 收入口径")}</section><section class="section card storage-card"><h3>企业级SSD份额为什么比单纯价格更重要</h3><p>2026Q1前五家企业级SSD收入约184.6亿美元，其中Samsung/SK Group/Micron合计约80%。份额来自高容量QLC/TLC、Controller控制器、Firmware固件、QoS（Quality of Service，服务质量）、耐久性和CSP（Cloud Service Provider，云服务商）认证的共同结果；NAND颗粒涨价只能解释收入的一部分。</p><p class="metric-foot">Counterpoint的“eSSD占NAND收入43%”与TrendForce的“eSSD厂商收入排名”属于不同机构口径，页面并列展示而不强行勾稽。</p></section><section class="section card storage-card"><h3>技术事件应该如何进入投资判断</h3>${table(["技术/产品","首先验证","再看产业影响","不能直接推出"],[['DDR6 / LPDDR6','标准、IP、样片、量产节奏','接口芯片代际升级与原厂研发能力','当前收入或立刻放量'],['HBM4','平台认证、良率、封装产能、出货','高价值DRAM与先进封装需求','所有DRAM同步高增长'],['高层数TLC/QLC','有效bit、良率、控制器与客户认证','成本下降与eSSD容量提升','发布即等于企业级收入'],['CXL / SCM / 新型存储','平台支持、软件生态、TCO','内存池化和分层架构变化','短期替代DRAM/NAND']].map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`))}</section>`;
    return {html:shell("products",body),charts:{"essd-revenue":{categories:er.periods,values:er.revenue_usd_b,name:"市场收入",unit:"bn USD",digits:2}}};
  }

  function companies(D,R) {
    const ds=R.structural_data.dram_share_q1_2026,ns=R.structural_data.nand_share_q1_2026,cx=R.structural_data.cxmt_operating;
    const quotes=D.storage.daily?.market||[], quoteBySymbol=Object.fromEntries(quotes.map(x=>[x.symbol,x]));
    const universe=(D.storage.market_universe||[]).map(x=>{
      const quote=quoteBySymbol[x.symbol]||{};
      return {...x,...quote,listed:quote.listed??!x.status};
    });
    const categories=[...new Set(universe.map(x=>x.category))];
    const mh=(D.storage.market_history||[]).filter(x=>finite(x.price)&&Number(x.price)>0),core=["005930.KS","000660.KS","MU","285A.T","SNDK","688825.SS"],allStockDates=[...new Set(mh.filter(x=>core.includes(x.symbol)).map(x=>x.trade_date))].sort(),latestDate=new Date(allStockDates.at(-1)),cutoff=new Date(latestDate);cutoff.setDate(cutoff.getDate()-92);const stockDates=allStockDates.filter(x=>new Date(x)>=cutoff);
    const stockSeries=core.map((symbol,i)=>{const rows=mh.filter(x=>x.symbol===symbol&&stockDates.includes(x.trade_date)).sort((a,b)=>a.trade_date.localeCompare(b.trade_date));if(rows.length<2)return null;const base=Number(rows[0].price),map=Object.fromEntries(rows.map(x=>[x.trade_date,Number(x.price)/base*100]));let last=null;return {name:rows[0].short_name||rows[0].name||symbol,values:stockDates.map(d=>{if(finite(map[d]))last=map[d];return last}),color:COLORS[i]}}).filter(Boolean);
    const body=`<section class="section storage-grid-2">${chartCard("DRAM收入份额","2026Q1；收入份额口径",donutChart("dram-share",ds.labels,ds.values),"Counterpoint · 四舍五入")}${chartCard("NAND收入份额","2026Q1；收入份额口径",donutChart("nand-share",ns.labels,ns.values),"TrendForce")}</section><section class="section">${chartCard("核心存储原厂股价指数","各公司首个有效交易日=100；本币计价，不做汇率换算",stockSeries.length?lineChart("core-stock-index",stockDates,stockSeries,{digits:0}):'<div class="empty">历史行情正在回填</div>',`Yahoo Finance公开行情 · ${stockDates.length}个交易日`)}</section><section class="section storage-grid-2">${chartCard("长鑫科技产能利用率","12英寸DRAM产线；高利用率意味着短期增量更依赖扩产与工艺升级",barChart("cxmt-util",cx.years,cx.utilization_pct,{percent:true,colors:[COLORS[1],COLORS[1],COLORS[0]]}),"招股书 · 监管披露")}${chartCard("长鑫科技资本性支出","购建固定资产、无形资产及其他长期资产现金支出",barChart("cxmt-capex",cx.years,cx.capex_cny_b,{digits:1,colors:[COLORS[1],COLORS[0],COLORS[1]]}),"十亿元人民币 · 招股书")}</section><section class="section"><div class="section-head"><div><h2>完整产业链公司池</h2><p>覆盖原厂、HDD、主控接口、模组品牌、分销、设备、材料和封测；行情按各市场最近完整交易日。</p></div></div><div class="company-toolbar"><button class="active" data-company-category="">全部 ${universe.length}</button>${categories.map(c=>`<button data-company-category="${c}">${c} ${universe.filter(x=>x.category===c).length}</button>`).join("")}</div><div class="company-universe" id="company-universe">${universe.map(x=>`<article class="company-universe-card" data-category="${x.category}">${logoMark(x)}<div class="company-universe-main"><b>${x.name}</b><small>${x.symbol} · ${x.role}</small></div><div class="company-universe-quote"><strong>${x.price==null?(x.status||"待更新"):`${x.currency||""} ${num(x.price,2)}`}</strong><span class="${Number(x.change_pct)>0?"up":Number(x.change_pct)<0?"down":""}">${x.change_pct==null?"":`${Number(x.change_pct)>0?"+":""}${num(x.change_pct,2)}%`}</span><small>${x.trade_date||x.region}</small></div></article>`).join("")}</div></section><section class="section card storage-card"><h3>产业链投资信号</h3>${table(["层级","核心指标","频率","看多验证","证伪/转弱","时序"],R.signal_framework.map(x=>`<tr><td><span class="tag red">${x.layer}</span></td><td><b>${x.metric}</b></td><td>${x.frequency}</td><td>${x.bull}</td><td>${x.bear}</td><td>${x.lead}</td></tr>`))}</section>`;
    return {html:shell("companies",body),charts:{"core-stock-index":{categories:stockDates,series:stockSeries,name:"股价指数",unit:"",digits:1},"cxmt-util":{categories:cx.years,values:cx.utilization_pct,name:"产能利用率",unit:"%",digits:2},"cxmt-capex":{categories:cx.years,values:cx.capex_cny_b,name:"资本性支出",unit:"十亿元",digits:3}},after:wireCompanyFilter};
  }

  function wireCompanyFilter(){const buttons=[...document.querySelectorAll("[data-company-category]")],cards=[...document.querySelectorAll(".company-universe-card")];buttons.forEach(button=>button.addEventListener("click",()=>{buttons.forEach(x=>x.classList.remove("active"));button.classList.add("active");cards.forEach(card=>card.hidden=!!button.dataset.companyCategory&&card.dataset.category!==button.dataset.companyCategory)}));}

  function eventPage(D,R,H) {
    const body=`<section class="section card storage-card"><div class="event-toolbar"><input id="event-q" type="search" placeholder="搜索公司、产品、标题"><select id="event-quality"><option value="core">核心事件</option><option value="">全部历史（含待复核）</option><option value="archive">待复核归档</option></select><select id="event-product"><option value="">全部产品</option>${[...new Set(H.flatMap(x=>x.products||[]))].sort().map(x=>`<option>${x}</option>`).join("")}</select><select id="event-region"><option value="">全部地区</option><option value="China">国内</option><option value="Overseas">国外</option><option value="Unclear">未明确</option></select><select id="event-stage"><option value="">全部环节</option>${[...new Set(H.map(x=>x.stage_zh))].sort().map(x=>`<option>${x}</option>`).join("")}</select><select id="event-evidence"><option value="">全部证据</option>${[...new Set(H.map(x=>x.evidence_stage))].sort().map(x=>`<option value="${x}">${H.find(y=>y.evidence_stage===x)?.evidence_zh||x}</option>`).join("")}</select></div><div class="event-summary" id="event-summary"></div><div id="event-list"></div></section>`;
    return {html:shell("events",body),charts:{},after:()=>wireEvents(H)};
  }

  function wireEvents(H){const q=document.querySelector("#event-q"),quality=document.querySelector("#event-quality"),p=document.querySelector("#event-product"),r=document.querySelector("#event-region"),s=document.querySelector("#event-stage"),e=document.querySelector("#event-evidence"),out=document.querySelector("#event-list"),sum=document.querySelector("#event-summary");const params=new URL(location.href).searchParams;if(params.get("product"))p.value=params.get("product");const render=()=>{const text=q.value.trim().toLowerCase();const rows=H.filter(x=>(!quality.value||x.quality_level===quality.value)&&(!p.value||(x.products||[]).includes(p.value))&&(!r.value||x.region===r.value)&&(!s.value||x.stage_zh===s.value)&&(!e.value||x.evidence_stage===e.value)&&(!text||`${x.title} ${x.title_original||""} ${(x.entities||[]).join(" ")} ${(x.products||[]).join(" ")}`.toLowerCase().includes(text)));const strong=rows.filter(x=>/^[4-7]_/.test(x.evidence_stage)).length;sum.innerHTML=`<span class="tag red">匹配 ${rows.length}</span><span class="tag">强证据 ${strong}</span><span class="tag">历史总库 ${H.length}</span><span class="tag">核心口径：相关性≥30且含事件类型或公司实体</span>${rows.length>100?'<span class="tag">当前显示前100条，可继续筛选</span>':''}`;out.innerHTML=rows.slice(0,100).map(x=>`<div class="event-row"><div>${(x.published_at||"").slice(0,10)}<br><small>${x.publisher||"—"} · T${x.source_tier}</small></div><div><a class="event-title" href="${x.url}" target="_blank" rel="noopener">${x.title}</a><br>${(x.products||[]).map(y=>`<span class="tag red">${y}</span>`).join(" ")}</div><div>${x.stage_zh}</div><div>${(x.entities||[]).slice(0,3).join("、")||"—"}</div><div><span class="evidence-badge ${/^[4-7]_/.test(x.evidence_stage)?"strong":""}">${x.evidence_zh}</span></div></div>`).join("")||'<div class="empty">没有匹配事件</div>';};[q,quality,p,r,s,e].forEach(x=>x.addEventListener(x===q?"input":"change",render));render();}

  function dataPage(D,R,H) {
    const sources=R.sources||[],catalog=R.metric_catalog||[];
    const body=`<section class="section storage-grid-3">${card("上市公司行情",(D.storage.market_universe||[]).filter(x=>!x.status).length,"近1年日频；完整序列可下载")}${card("价格历史",(D.storage.price_history||[]).filter(x=>finite(x.price)&&Number(x.price)>0).length,"逐规格保存；缺失值不补0")}${card("事件历史",H.length,"去重发现事件；支持历史筛选")}</section><section class="section card storage-card"><div class="section-head"><div><h2>细颗粒监测指标字典</h2><p>每项指标明确当前锚点、更新频率、可用历史和来源；离散锚点不伪装成连续序列。</p></div></div>${table(["类别","指标","观察期","当前值/状态","频率","历史深度","来源"],catalog.map(x=>`<tr><td><span class="tag ${["价格","供需","公司"].includes(x.category)?"red":""}">${x.category}</span></td><td><b>${x.metric}</b></td><td>${x.period}</td><td class="num">${x.value}</td><td>${x.frequency}</td><td>${x.history}</td><td>${x.source_id}</td></tr>`),"source-ledger")}</section><section class="section storage-grid-2"><article class="card storage-card"><h3>核心定义</h3><dl class="definition-list"><dt>短/中/长期</dt><dd>0–3个月 / 3–24个月 / 2–5年</dd><dt>有效bit</dt><dd>${R.models.effective_bit}</dd><dt>供需缺口</dt><dd>(供给-需求)/需求；负值代表短缺，正值代表宽松</dd><dt>股价历史</dt><dd>本币复权收盘价；跨市场比较时统一指数化为首个有效日=100</dd><dt>事件证据</dt><dd>传闻→官方发布→送样→验证→合同→量产→出货/收入</dd><dt>正式观察点</dt><dd>每日05:00与17:00；对应隔夜信息和日间信息两次整理。</dd></dl></article><article class="card storage-card"><h3>数据健康与边界</h3><p><span class="tag red">价格 ${D.storage.price_quality?.status||"unknown"}</span> 抓取异常 ${(D.storage.price_quality?.errors||[]).length} 个</p><p><span class="tag">事件 ${D.storage.daily?.quality?.status||"unknown"}</span> 来源异常 ${D.storage.daily?.quality?.source_errors||0} 个</p><p>${R.meta.boundary}</p><p>新闻数量不作为趋势强弱分数；重大结论需回到公司、监管机构、客户或一手产业来源核验。</p><p class="metric-foot">模型：${R.meta.model_name} · ${R.meta.version}</p></article></section><section class="section card storage-card"><h3>来源台账</h3>${table(["编号","数据/结论","发布方","日期","等级","用途","链接"],sources.map(x=>`<tr><td>${x.id}</td><td><b>${x.title}</b></td><td>${x.publisher}</td><td>${x.date}</td><td><span class="tag ${x.tier===1?"red":""}">T${x.tier}</span></td><td>${x.use}</td><td><a href="${x.url}" target="_blank" rel="noopener">原文 ↗</a></td></tr>`),"source-ledger")}</section>`;
    return {html:shell("data",body),charts:{}};
  }

  async function render(D,HLP) {
    const page=new URL(location.href).searchParams.get("page")||"overview";
    HLP.app.innerHTML='<section class="card load-state">正在载入存储研究数据与历史库…</section>';
    try {
      const [R,E]=await Promise.all([fetch(`${HLP.root}api/storage-research.json`,{cache:"no-store"}).then(x=>x.json()),fetch(`${HLP.root}api/storage-events.json`,{cache:"no-store"}).then(x=>x.json()).catch(()=>({rows:D.storage.daily?.events||[]}))]);
      const H=E.rows||[]; let result;
      if(page==="cycle") result=cycle(D,R); else if(page==="supply") result=supply(D,R); else if(page==="products") result=products(D,R); else if(page==="companies") result=companies(D,R); else if(page==="events") result=eventPage(D,R,H); else if(page==="data") result=dataPage(D,R,H); else result=overview(D,R,H);
      HLP.app.innerHTML=result.html; wireCharts(result.charts||{}); if(result.after)result.after();
      document.querySelector("#global-product")?.addEventListener("change",ev=>{const target=ev.target.value;if(!target)return;const url=new URL(location.href);url.searchParams.set("page","events");url.searchParams.set("product",target);location.href=url;});
    } catch(err) { HLP.app.innerHTML=`<section class="card error"><h2>存储研究层暂时不可用</h2><p>${String(err.message||err)}</p></section>`; }
  }

  window.StorageDashboard={render};
})();
