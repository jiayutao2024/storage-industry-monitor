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
  const finite = v => Number.isFinite(Number(v));
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
    const step=Math.max(1,Math.ceil(categories.length/8));
    const labels=categories.map((c,i)=>i%step===0||i===categories.length-1?`<text x="${x(i)}" y="${H-12}" text-anchor="middle">${String(c).replace(/^20/,"")}</text>`:"").join("");
    const paths=series.map((s,si)=>{
      let path="",started=false;
      s.values.forEach((v,i)=>{if(!finite(v)){started=false;return;}path+=`${started?"L":"M"}${x(i)},${y(v)} `;started=true;});
      const points=s.values.map((v,i)=>finite(v)?`<circle class="point" data-chart="${id}" data-series="${si}" data-x="${i}" cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color||COLORS[si%COLORS.length]}"/>`:"").join("");
      return `<g data-series-group="${si}"><path class="line" d="${path}" stroke="${s.color||COLORS[si%COLORS.length]}"/>${points}</g>`;
    }).join("");
    const zero=ymin<0&&ymax>0?`<line class="zero" x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}"/>`:"";
    return `<div class="chart" id="${id}" data-chart-type="line"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${grid}${zero}<line class="axis" x1="${L}" x2="${W-R}" y1="${H-B}" y2="${H-B}"/>${labels}${paths}</svg><div class="chart-legend">${series.map((s,i)=>`<span class="legend-key" data-legend="${i}"><i style="background:${s.color||COLORS[i%COLORS.length]}"></i>${s.name}</span>`).join("")}</div></div>`;
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
    document.querySelectorAll(".chart .point,.chart .bar").forEach(el=>{
      el.addEventListener("mousemove",e=>{
        const s=specs[el.dataset.chart]; if(!s)return; const i=Number(el.dataset.x),si=Number(el.dataset.series||0), value=s.series? s.series[si].values[i]:s.values[i];
        const name=s.series?s.series[si].name:s.name||"数值";
        tip.innerHTML=`<b>${s.categories[i]}</b>${name}：<em>${finite(value)?num(value,s.digits??1):"—"}${s.unit||""}</em>${s.note?`<br><span>${s.note}</span>`:""}`;
        tip.style.display="block";tip.style.left=`${Math.min(innerWidth-280,e.clientX+14)}px`;tip.style.top=`${Math.min(innerHeight-110,e.clientY+14)}px`;
      });
      el.addEventListener("mouseleave",()=>tip.style.display="none");
    });
    document.querySelectorAll(".legend-key[data-legend]").forEach(el=>el.addEventListener("click",()=>{
      const chart=el.closest(".chart"),group=chart.querySelector(`[data-series-group="${el.dataset.legend}"]`); if(group){const off=group.style.display!=="none";group.style.display=off?"none":"";el.classList.toggle("off",off);}
    }));
  }

  function card(title,value,foot,red=false){return `<article class="card storage-card"><div class="kpi-label">${title}</div><div class="metric-reading ${red?"red":""}">${value}</div><div class="metric-foot">${foot}</div></article>`}
  function chartCard(title,subtitle,chart,note=""){return `<article class="card chart-card"><div class="chart-head"><div><h3>${title}</h3><p>${subtitle}</p></div><div class="chart-note">${note}</div></div>${chart}</article>`}
  function table(headers,rows,cls=""){return `<div class="table-wrap ${cls}"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}
  function volumeText(value){const v=Number(value);if(!Number.isFinite(v)||!v)return "—";if(v>=1e8)return num(v/1e8,2)+"亿";if(v>=1e4)return num(v/1e4,1)+"万";return num(v,0)}
  function companyTile(x){const change=Number(x.change_pct),tone=change>0?"up":change<0?"down":"flat";return `<article class="company-pulse ${tone}"><div class="company-pulse-head"><span class="company-logo">${x.icon||x.short_name?.slice(0,1)||"M"}</span><div><b>${x.short_name||x.name}</b><small>${x.symbol}</small></div><span class="market-state">${x.listed===false?"未上市":x.trade_date||"待更新"}</span></div><div class="company-price">${x.listed===false?"—":x.price==null?"待更新":`${x.currency||""} ${num(x.price,2)}`}<em>${x.change_pct==null?"":`${change>0?"+":""}${num(change,2)}%`}</em></div><p>${x.daily_note||(`${x.role}；${x.listed===false?"跟踪事件与验证节点":"成交量 "+volumeText(x.volume)}`)}</p></article>`}

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
    const hist=D.storage.price_history||[], ids=[...new Set(hist.map(x=>x.metric_id))], cats=[...new Set(hist.map(x=>x.date))].sort();
    const selected=ids.slice(0,6), series=selected.map((id,i)=>{const rows=hist.filter(x=>x.metric_id===id), map=Object.fromEntries(rows.map(x=>[x.date,x.price]));return {name:rows[0]?.segment||id,values:cats.map(c=>map[c]??null),color:COLORS[i]}});
    const metrics=D.storage.price_metrics||[];
    const body=`<section class="section"><div class="callout"><b>读法：</b>先看同规格价格斜率，再看现货能否传导至合约价，最后用库存与原厂指引确认盈利；历史点不足时明确显示稀疏，不用两三个点制造趋势。</div></section><section class="section storage-grid-2">${chartCard("公开价格历史","按产品规格独立成线，悬停显示日期与绝对价格",lineChart("price-history",cats,series,{digits:2}),`历史${cats.length}个日期 · 最多展示6条`) }${chartCard("最新价格变化","现货/合约/模组/整盘分开解释",barChart("price-change",metrics.map(x=>x.segment),metrics.map(x=>Number(x.change_pct)||0),{percent:true}),"红=上行；灰=下行")}</section><section class="section card storage-card"><h3>价格明细与来源</h3>${table(["产品","规格","报价类型","均价","变化","数据日","来源"],metrics.map(x=>`<tr><td><span class="tag red">${x.product}</span></td><td><b>${x.item}</b><br><small>${x.segment}</small></td><td>${x.quote_type}</td><td class="num">${x.price==null?"—":"$"+num(x.price,3)}</td><td class="num">${finite(x.change_pct)?(Number(x.change_pct)>0?"+":"")+num(x.change_pct,2)+"%":"—"}</td><td>${(x.observed_at||"").slice(0,16).replace("T"," ")}</td><td><a href="${x.source_url}" target="_blank" rel="noopener">${x.source_name||"来源"} ↗</a></td></tr>`))}<p class="source-note">单位遵循来源页；颗粒、模组、晶圆与整盘不可直接比较绝对价格。</p></section>`;
    return {html:shell("cycle",body),charts:{"price-history":{categories:cats,series,unit:" USD",digits:3,note:"不同规格绝对值不可横向加总"},"price-change":{categories:metrics.map(x=>x.item),values:metrics.map(x=>Number(x.change_pct)||0),name:"变化",unit:"%",digits:2}}};
  }

  function supply(D,R) {
    const y=R.models.years, d=R.models.dram.base,n=R.models.nand.base,h=R.structural_data.hbm_wafer_input;
    const body=`<section class="section storage-grid-2">${chartCard("DRAM：需求与有效供给指数","2025=100；基准情景",lineChart("dram-index",y,[{name:"需求",values:d.demand_index,color:COLORS[0]},{name:"有效供给",values:d.supply_index,color:COLORS[1]}]),"G3研究测算")}${chartCard("NAND：需求与有效供给指数","2025=100；总量转平不等于eSSD转松",lineChart("nand-index",y,[{name:"需求",values:n.demand_index,color:COLORS[0]},{name:"有效供给",values:n.supply_index,color:COLORS[1]}]),"G3研究测算")}</section><section class="section storage-grid-2">${chartCard("供需缺口路径","负值=短缺；正值=宽松",lineChart("gap-path",y,[{name:"DRAM",values:d.gap_pct,color:COLORS[0]},{name:"NAND",values:n.gap_pct,color:COLORS[4]}],{percent:true}),"研究情景，不是行业指引")}${chartCard("HBM晶圆投入挤占","占前三大DRAM厂wafer input",barChart("hbm-wafer",h.years,h.share_pct,{percent:true,colors:[COLORS[1],COLORS[0],COLORS[0]]}),"TrendForce预测")}</section><section class="section storage-grid-2"><article class="card storage-card"><h3>有效bit，而不是厂房数量</h3><div class="model-formula">${R.models.effective_bit}</div><p>设备订单、厂房建设与WPM只是供给链的前段。OEE、良率、单die容量、产品良率与客户认证共同决定可销售供给。</p><p class="metric-foot">${R.models.formula}</p></article><article class="card storage-card"><h3>新增产能时间轴</h3><div class="timeline">${R.capacity_timeline.map(x=>`<div class="timeline-item"><b>${x.date} · ${x.company}</b><p><strong>${x.milestone}</strong>｜${x.meaning}</p><span class="tag ${x.status==="公司公告"?"red":""}">${x.status}</span></div>`).join("")}</div></article></section>`;
    return {html:shell("supply",body),charts:{"dram-index":{categories:y,series:[{name:"需求",values:d.demand_index},{name:"有效供给",values:d.supply_index}],digits:1},"nand-index":{categories:y,series:[{name:"需求",values:n.demand_index},{name:"有效供给",values:n.supply_index}],digits:1},"gap-path":{categories:y,series:[{name:"DRAM",values:d.gap_pct},{name:"NAND",values:n.gap_pct}],unit:"%",digits:2},"hbm-wafer":{categories:h.years,values:h.share_pct,name:"wafer input share",unit:"%",digits:0}}};
  }

  function products(D,R) {
    const e=R.structural_data.enterprise_ssd, hs=R.structural_data.hbm_share_q1_2026;
    const body=`<section class="section"><div class="callout"><b>核心切分：</b>训练强调带宽，推理与长上下文同时拉动容量和读写；热数据偏HBM/DRAM，温数据偏企业级SSD，冷数据仍由NAND/HDD/磁带分层承接。因此不能只看HBM。</div></section><section class="section product-map">${R.product_tree.map(x=>`<article class="product-family"><h3>${x.family}</h3><div class="product-list">${x.products.map(p=>`<span class="tag red">${p}</span>`).join("")}</div><div class="product-driver">核心驱动：${x.drivers}</div></article>`).join("")}</section><section class="section storage-grid-2">${chartCard("企业级SSD价值池迁移","占NAND收入比重；2026E为预测",barChart("essd-share",e.periods,e.revenue_share_pct,{percent:true,colors:[COLORS[1],COLORS[0]]}),"Counterpoint")}${chartCard("HBM竞争格局","2026Q1收入份额",donutChart("hbm-share",hs.labels,hs.values),"Counterpoint · 收入口径")}</section><section class="section card storage-card"><h3>技术事件应该如何进入投资判断</h3>${table(["技术/产品","首先验证","再看产业影响","不能直接推出"],[['DDR6 / LPDDR6','标准、IP、样片、量产节奏','接口芯片代际升级与原厂研发能力','当前收入或立刻放量'],['HBM4','平台认证、良率、封装产能、出货','高价值DRAM与先进封装需求','所有DRAM同步高增长'],['高层数TLC/QLC','有效bit、良率、控制器与客户认证','成本下降与eSSD容量提升','发布即等于企业级收入'],['CXL / SCM / 新型存储','平台支持、软件生态、TCO','内存池化和分层架构变化','短期替代DRAM/NAND']].map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`))}</section>`;
    return {html:shell("products",body),charts:{"essd-share":{categories:e.periods,values:e.revenue_share_pct,name:"eSSD收入占比",unit:"%",digits:0}}};
  }

  function companies(D,R) {
    const ds=R.structural_data.dram_share_q1_2026,ns=R.structural_data.nand_share_q1_2026;
    const quotes=D.storage.daily?.market||[], quoteBySymbol=Object.fromEntries(quotes.map(x=>[x.symbol,x]));
    const universe=(D.storage.market_universe||[]).map(x=>{
      const quote=quoteBySymbol[x.symbol]||{};
      return {...x,...quote,listed:quote.listed??!x.status};
    });
    const categories=[...new Set(universe.map(x=>x.category))];
    const body=`<section class="section storage-grid-2">${chartCard("DRAM收入份额","2026Q1；收入份额口径",donutChart("dram-share",ds.labels,ds.values),"Counterpoint · 四舍五入")}${chartCard("NAND收入份额","2026Q1；收入份额口径",donutChart("nand-share",ns.labels,ns.values),"TrendForce")}</section><section class="section"><div class="section-head"><div><h2>完整产业链公司池</h2><p>覆盖原厂、HDD、主控接口、模组品牌、分销、设备、材料和封测；行情按各市场最近完整交易日。</p></div></div><div class="company-toolbar"><button class="active" data-company-category="">全部 ${universe.length}</button>${categories.map(c=>`<button data-company-category="${c}">${c} ${universe.filter(x=>x.category===c).length}</button>`).join("")}</div><div class="company-universe" id="company-universe">${universe.map(x=>`<article class="company-universe-card" data-category="${x.category}"><span class="company-logo">${x.icon||x.short_name?.slice(0,1)}</span><div class="company-universe-main"><b>${x.name}</b><small>${x.symbol} · ${x.role}</small></div><div class="company-universe-quote"><strong>${x.price==null?(x.status||"待更新"):`${x.currency||""} ${num(x.price,2)}`}</strong><span class="${Number(x.change_pct)>0?"up":Number(x.change_pct)<0?"down":""}">${x.change_pct==null?"":`${Number(x.change_pct)>0?"+":""}${num(x.change_pct,2)}%`}</span><small>${x.trade_date||x.region}</small></div></article>`).join("")}</div></section><section class="section card storage-card"><h3>产业链投资信号</h3>${table(["层级","核心指标","频率","看多验证","证伪/转弱","时序"],R.signal_framework.map(x=>`<tr><td><span class="tag red">${x.layer}</span></td><td><b>${x.metric}</b></td><td>${x.frequency}</td><td>${x.bull}</td><td>${x.bear}</td><td>${x.lead}</td></tr>`))}</section>`;
    return {html:shell("companies",body),charts:{},after:wireCompanyFilter};
  }

  function wireCompanyFilter(){const buttons=[...document.querySelectorAll("[data-company-category]")],cards=[...document.querySelectorAll(".company-universe-card")];buttons.forEach(button=>button.addEventListener("click",()=>{buttons.forEach(x=>x.classList.remove("active"));button.classList.add("active");cards.forEach(card=>card.hidden=!!button.dataset.companyCategory&&card.dataset.category!==button.dataset.companyCategory)}));}

  function eventPage(D,R,H) {
    const body=`<section class="section card storage-card"><div class="event-toolbar"><input id="event-q" type="search" placeholder="搜索公司、产品、标题"><select id="event-quality"><option value="core">核心事件</option><option value="">全部历史（含待复核）</option><option value="archive">待复核归档</option></select><select id="event-product"><option value="">全部产品</option>${[...new Set(H.flatMap(x=>x.products||[]))].sort().map(x=>`<option>${x}</option>`).join("")}</select><select id="event-region"><option value="">全部地区</option><option value="China">国内</option><option value="Overseas">国外</option><option value="Unclear">未明确</option></select><select id="event-stage"><option value="">全部环节</option>${[...new Set(H.map(x=>x.stage_zh))].sort().map(x=>`<option>${x}</option>`).join("")}</select><select id="event-evidence"><option value="">全部证据</option>${[...new Set(H.map(x=>x.evidence_stage))].sort().map(x=>`<option value="${x}">${H.find(y=>y.evidence_stage===x)?.evidence_zh||x}</option>`).join("")}</select></div><div class="event-summary" id="event-summary"></div><div id="event-list"></div></section>`;
    return {html:shell("events",body),charts:{},after:()=>wireEvents(H)};
  }

  function wireEvents(H){const q=document.querySelector("#event-q"),quality=document.querySelector("#event-quality"),p=document.querySelector("#event-product"),r=document.querySelector("#event-region"),s=document.querySelector("#event-stage"),e=document.querySelector("#event-evidence"),out=document.querySelector("#event-list"),sum=document.querySelector("#event-summary");const params=new URL(location.href).searchParams;if(params.get("product"))p.value=params.get("product");const render=()=>{const text=q.value.trim().toLowerCase();const rows=H.filter(x=>(!quality.value||x.quality_level===quality.value)&&(!p.value||(x.products||[]).includes(p.value))&&(!r.value||x.region===r.value)&&(!s.value||x.stage_zh===s.value)&&(!e.value||x.evidence_stage===e.value)&&(!text||`${x.title} ${x.title_original||""} ${(x.entities||[]).join(" ")} ${(x.products||[]).join(" ")}`.toLowerCase().includes(text)));const strong=rows.filter(x=>/^[4-7]_/.test(x.evidence_stage)).length;sum.innerHTML=`<span class="tag red">匹配 ${rows.length}</span><span class="tag">强证据 ${strong}</span><span class="tag">历史总库 ${H.length}</span><span class="tag">核心口径：相关性≥30且含事件类型或公司实体</span>${rows.length>100?'<span class="tag">当前显示前100条，可继续筛选</span>':''}`;out.innerHTML=rows.slice(0,100).map(x=>`<div class="event-row"><div>${(x.published_at||"").slice(0,10)}<br><small>${x.publisher||"—"} · T${x.source_tier}</small></div><div><a class="event-title" href="${x.url}" target="_blank" rel="noopener">${x.title}</a><br>${(x.products||[]).map(y=>`<span class="tag red">${y}</span>`).join(" ")}</div><div>${x.stage_zh}</div><div>${(x.entities||[]).slice(0,3).join("、")||"—"}</div><div><span class="evidence-badge ${/^[4-7]_/.test(x.evidence_stage)?"strong":""}">${x.evidence_zh}</span></div></div>`).join("")||'<div class="empty">没有匹配事件</div>';};[q,quality,p,r,s,e].forEach(x=>x.addEventListener(x===q?"input":"change",render));render();}

  function dataPage(D,R,H) {
    const sources=R.sources||[];
    const body=`<section class="section storage-grid-3">${card("日报快照",D.meta.generated_at?.slice(0,16).replace("T"," ")||"—","每日05:00/17:00更新")}${card("价格历史",(D.storage.price_history||[]).length,"逐规格、逐观察日保存")}${card("事件历史",H.length,"去重发现事件；支持历史筛选")}</section><section class="section storage-grid-2"><article class="card storage-card"><h3>核心定义</h3><dl class="definition-list"><dt>短/中/长期</dt><dd>0–3个月 / 3–24个月 / 2–5年</dd><dt>有效bit</dt><dd>${R.models.effective_bit}</dd><dt>供需缺口</dt><dd>(供给-需求)/需求；负值代表短缺，正值代表宽松</dd><dt>事件证据</dt><dd>传闻→官方发布→送样→验证→合同→量产→出货/收入</dd><dt>事实标签</dt><dd>公司/监管官方、第三方统计、研究测算分开显示</dd><dt>正式观察点</dt><dd>每日05:00与17:00；对应隔夜信息和日间信息两次整理。</dd></dl></article><article class="card storage-card"><h3>数据健康与边界</h3><p><span class="tag red">价格 ${D.storage.price_quality?.status||"unknown"}</span> 抓取异常 ${(D.storage.price_quality?.errors||[]).length} 个</p><p><span class="tag">事件 ${D.storage.daily?.quality?.status||"unknown"}</span> 来源异常 ${D.storage.daily?.quality?.source_errors||0} 个</p><p>${R.meta.boundary}</p><p>新闻数量不作为趋势强弱分数；重大结论需回到公司、监管机构、客户或一手产业来源核验。</p><p class="metric-foot">模型：${R.meta.model_name} · ${R.meta.version}</p></article></section><section class="section card storage-card"><h3>来源台账</h3>${table(["编号","数据/结论","发布方","日期","等级","用途","链接"],sources.map(x=>`<tr><td>${x.id}</td><td><b>${x.title}</b></td><td>${x.publisher}</td><td>${x.date}</td><td><span class="tag ${x.tier===1?"red":""}">T${x.tier}</span></td><td>${x.use}</td><td><a href="${x.url}" target="_blank" rel="noopener">原文 ↗</a></td></tr>`),"source-ledger")}</section>`;
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
