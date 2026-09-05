// ============================================================
// Irrigation Atlas — interactivity layer
// All charts are hand-built inline SVG (no chart library) so the
// visual language (colors, mono labels, hover ticks) matches the
// rest of the atlas exactly.
// ============================================================

const SVGNS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

// shared tooltip element, repositioned per chart container.
// Every chart is drawn in an SVG with a fixed viewBox of (vbW x vbH); to place
// the HTML tooltip correctly over the rendered (possibly scaled) SVG we convert
// viewBox coordinates -> rendered pixel coordinates using the SVG's actual
// bounding box, then position the tooltip relative to the chart-card (which
// is the tooltip's positioned ancestor).
function attachTooltip(card) {
  let tip = card.querySelector(".chart-tooltip");
  if (!tip) {
    tip = document.createElement("div");
    tip.className = "chart-tooltip";
    card.style.position = "relative";
    card.appendChild(tip);
  }
  return tip;
}

// vbX/vbY: coordinates in the SVG's own viewBox units
// svg: the <svg> element actually rendered on screen
// card: the positioned ancestor (.chart-card) the tooltip is placed within
function showTipAt(card, tip, svg, vbX, vbY, html) {
  const svgRect = svg.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const scaleX = svgRect.width / vb.width;
  const scaleY = svgRect.height / vb.height;
  const pxX = svgRect.left - cardRect.left + vbX * scaleX;
  const pxY = svgRect.top - cardRect.top + vbY * scaleY;
  tip.innerHTML = html;
  tip.style.left = pxX + "px";
  tip.style.top = pxY + "px";
  tip.classList.add("show");
}
function hideTip(tip) {
  tip.classList.remove("show");
}

// ------------------------------------------------------------
// 1. DIVISION IRRIGATION RATE — horizontal bar chart
// ------------------------------------------------------------
function buildDivisionChart() {
  const data = [
    { name: "Rajshahi", val: 93 },
    { name: "Rangpur", val: 89 },
    { name: "Mymensingh", val: 86 },
    { name: "Khulna", val: 75 },
    { name: "Dhaka", val: 64 },
    { name: "Chittagong", val: 61 },
    { name: "Sylhet", val: 59 },
    { name: "Barisal", val: 31 },
  ];
  const el = document.getElementById("chart-divisions");
  const w = 440, h = 340, padL = 100, padR = 46, padT = 10, padB = 10;
  const rowH = (h - padT - padB) / data.length;
  const maxV = 100;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  function colorFor(v) {
    if (v >= 85) return "#3E7A3F";
    if (v >= 65) return "#6B9A45";
    if (v >= 50) return "#C99A2E";
    return "#B25A2E";
  }

  const barMaxW = w - padL - padR;

  data.forEach((d, i) => {
    const y = padT + i * rowH;
    const barW = (d.val / maxV) * barMaxW;

    const label = svgEl("text", {
      x: padL - 12, y: y + rowH / 2 + 5, "text-anchor": "end",
      "font-family": "IBM Plex Mono, monospace", "font-size": "13", fill: "#3E534E", "font-weight":"500"
    });
    label.textContent = d.name;
    svg.appendChild(label);

    const track = svgEl("rect", {
      x: padL, y: y + rowH * 0.26, width: barMaxW, height: rowH * 0.5,
      rx: 3, fill: "rgba(11,31,28,0.06)"
    });
    svg.appendChild(track);

    const bar = svgEl("rect", {
      x: padL, y: y + rowH * 0.26, width: 0, height: rowH * 0.5,
      rx: 3, fill: colorFor(d.val), style: "cursor:pointer;transition:width .7s cubic-bezier(.4,0,.2,1);"
    });
    svg.appendChild(bar);
    requestAnimationFrame(() => setTimeout(() => bar.setAttribute("width", barW), i * 45));

    const valText = svgEl("text", {
      x: padL + barW + 10, y: y + rowH / 2 + 5,
      "font-family": "IBM Plex Mono, monospace", "font-size": "13", fill: "#0B1F1C", "font-weight": "700"
    });
    valText.textContent = d.val + "%";
    svg.appendChild(valText);

    const hitArea = svgEl("rect", {
      x: 0, y: y, width: w, height: rowH, fill: "transparent", style: "cursor:pointer;"
    });
    hitArea.addEventListener("mouseenter", () => {
      bar.style.opacity = "0.82";
      showTipAt(card, tip, svg, padL + barW / 2, y + rowH * 0.2, `${d.name}: <span class="tt-val">${d.val}% irrigated</span>`);
    });
    hitArea.addEventListener("mouseleave", () => { bar.style.opacity = "1"; hideTip(tip); });
    svg.appendChild(hitArea);
  });

  el.appendChild(svg);
}

// ------------------------------------------------------------
// 2. NCA / TIA / NIA classification — donut, switchable via toggle
// ------------------------------------------------------------
const NCA_DATASETS = {
  nca: {
    label: "Net Cultivated Area classes",
    segs: [
      { l: "28,329–69,686 ha", v: 22, n: 14, c: "#EFE7B8" },
      { l: "69,606–120,192 ha", v: 30, n: 19, c: "#C9D9A0" },
      { l: "120,192–171,167 ha", v: 28, n: 18, c: "#7FB08A" },
      { l: "171,182–220,149 ha", v: 16, n: 10, c: "#3E8A82" },
      { l: "220,149–292,993 ha", v: 5, n: 3, c: "#1B6E63" },
    ]
  },
  tia: {
    label: "Total Irrigated Area classes",
    segs: [
      { l: "11,331–47,079 ha", v: 28, n: 18, c: "#F5D8DE" },
      { l: "47,079–92,771 ha", v: 34, n: 22, c: "#E7A9B8" },
      { l: "92,771–135,001 ha", v: 17, n: 11, c: "#C97590" },
      { l: "135,001–194,883 ha", v: 16, n: 10, c: "#A44A6B" },
      { l: "194,883–266,001 ha", v: 5, n: 3, c: "#7E2A20" },
    ]
  },
  nia: {
    label: "Non-Irrigated Area classes",
    segs: [
      { l: "511–11,574 ha", v: 47, n: 30, c: "#F5E3C8" },
      { l: "11,574–34,925 ha", v: 19, n: 12, c: "#E8C088" },
      { l: "34,925–62,297 ha", v: 9, n: 6, c: "#D99A4E" },
      { l: "62,297–110,713 ha", v: 3, n: 2, c: "#C97A2E" },
      { l: "110,713–144,356 ha", v: 22, n: 14, c: "#8A4A1E" },
    ]
  }
};

function buildDonut(containerId, dataset, centerLabel) {
  const el = document.getElementById(containerId);
  el.innerHTML = "";
  const w = 340, h = 300, cx = 118, cy = 148, rOuter = 98, rInner = 60;
  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  let angleStart = -Math.PI / 2;
  const total = dataset.segs.reduce((s, d) => s + d.v, 0);

  dataset.segs.forEach((seg, i) => {
    const angle = (seg.v / total) * Math.PI * 2;
    const angleEnd = angleStart + angle;
    const midAngle = (angleStart + angleEnd) / 2;

    const x1o = cx + rOuter * Math.cos(angleStart), y1o = cy + rOuter * Math.sin(angleStart);
    const x2o = cx + rOuter * Math.cos(angleEnd), y2o = cy + rOuter * Math.sin(angleEnd);
    const x1i = cx + rInner * Math.cos(angleEnd), y1i = cy + rInner * Math.sin(angleEnd);
    const x2i = cx + rInner * Math.cos(angleStart), y2i = cy + rInner * Math.sin(angleStart);
    const largeArc = angle > Math.PI ? 1 : 0;

    const d = `M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2i} ${y2i} Z`;
    const path = svgEl("path", { d, fill: seg.c, stroke: "var(--paper-card)", "stroke-width": "2", style: "cursor:pointer;transition:opacity .15s ease;" });

    const tipX = cx + (rOuter + rInner) / 2 * Math.cos(midAngle);
    const tipY = cy + (rOuter + rInner) / 2 * Math.sin(midAngle);

    path.addEventListener("mouseenter", () => {
      path.style.opacity = "0.75";
      showTipAt(card, tip, svg, tipX, tipY, `${seg.l}: <span class="tt-val">${seg.v}% · n=${seg.n}</span>`);
    });
    path.addEventListener("mouseleave", () => { path.style.opacity = "1"; hideTip(tip); });

    svg.appendChild(path);
    angleStart = angleEnd;
  });

  const centerText1 = svgEl("text", { x: cx, y: cy - 4, "text-anchor": "middle", "font-family": "Fraunces, serif", "font-weight": "700", "font-size": "34", fill: "#0B1F1C" });
  centerText1.textContent = "64";
  const centerText2 = svgEl("text", { x: cx, y: cy + 19, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": "11.5", fill: "#4F6560" });
  centerText2.textContent = "districts";
  svg.appendChild(centerText1);
  svg.appendChild(centerText2);

  // legend list to the right
  const legendX = 250;
  dataset.segs.forEach((seg, i) => {
    const ly = 40 + i * 46;
    const sw = svgEl("rect", { x: legendX, y: ly - 11, width: 13, height: 13, rx: 3, fill: seg.c });
    svg.appendChild(sw);
    const t1 = svgEl("text", { x: legendX + 19, y: ly, "font-family": "IBM Plex Mono, monospace", "font-size": "13", fill: "#0B1F1C", "font-weight": "700" });
    t1.textContent = seg.v + "%";
    svg.appendChild(t1);
    const t2 = svgEl("text", { x: legendX + 19, y: ly + 15, "font-family": "IBM Plex Mono, monospace", "font-size": "9.5", fill: "#4F6560" });
    t2.textContent = "n=" + seg.n;
    svg.appendChild(t2);
  });

  el.appendChild(svg);
}

function setupNcaToggle() {
  const toggle = document.getElementById("toggle-nca");
  buildDonut("chart-nca", NCA_DATASETS.nca);
  toggle.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      toggle.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      buildDonut("chart-nca", NCA_DATASETS[btn.dataset.v]);
    });
  });
}

// ------------------------------------------------------------
// 3. SURFACE WATER — area share by class, vertical bar
// ------------------------------------------------------------
function buildSurfaceChart() {
  const data = [
    { l: "Very Small", range: "10–3,000 ha", v: 2.0, c: "#EDE3F5" },
    { l: "Small", range: "3,000–9,000 ha", v: 4.9, c: "#C9B3E0" },
    { l: "Small-Med", range: "9,000–18,000 ha", v: 4.0, c: "#9E8AC9" },
    { l: "Medium", range: "18,000–31,000 ha", v: 7.6, c: "#6E6FB0" },
    { l: "Med-Large", range: "31,000–53,000 ha", v: 13.6, c: "#4A6B9E" },
    { l: "Large", range: "53,000–80,000 ha", v: 25.8, c: "#2E6C8A" },
    { l: "Very Large", range: "80,000–149,818 ha", v: 42.0, c: "#1B6E63" },
  ];
  const el = document.getElementById("chart-surface");
  const w = 440, h = 320, padL = 20, padR = 20, padT = 24, padB = 58;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const barGap = 8;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;
  const maxV = 45;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  data.forEach((d, i) => {
    const x = padL + i * (barW + barGap);
    const barH = (d.v / maxV) * chartH;
    const y = padT + chartH - barH;

    const rect = svgEl("rect", { x, y: padT + chartH, width: barW, height: 0, fill: d.c, rx: 2, style: "cursor:pointer;transition:y .6s cubic-bezier(.4,0,.2,1), height .6s cubic-bezier(.4,0,.2,1);" });
    svg.appendChild(rect);
    requestAnimationFrame(() => setTimeout(() => { rect.setAttribute("y", y); rect.setAttribute("height", barH); }, i * 55));

    rect.addEventListener("mouseenter", () => {
      rect.style.opacity = "0.8";
      showTipAt(card, tip, svg, x + barW / 2, y, `${d.l} (${d.range}): <span class="tt-val">${d.v}%</span>`);
    });
    rect.addEventListener("mouseleave", () => { rect.style.opacity = "1"; hideTip(tip); });

    const valLabel = svgEl("text", { x: x + barW / 2, y: y - 8, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": "12", fill: "#0B1F1C", "font-weight": "700" });
    valLabel.textContent = d.v + "%";
    svg.appendChild(valLabel);

    const lbl = svgEl("text", { x: x + barW / 2, y: h - padB + 18, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": "9.8", fill: "#3E534E", "font-weight":"500" });
    // wrap label into two lines if needed
    const words = d.l.split(" ");
    if (words.length > 1) {
      const t1 = svgEl("tspan", { x: x + barW / 2, dy: 0 }); t1.textContent = words[0];
      const t2 = svgEl("tspan", { x: x + barW / 2, dy: 13 }); t2.textContent = words.slice(1).join(" ");
      lbl.appendChild(t1); lbl.appendChild(t2);
    } else {
      lbl.textContent = d.l;
    }
    svg.appendChild(lbl);
  });

  el.appendChild(svg);
}

// ------------------------------------------------------------
// 4. SURFACE vs GROUNDWATER — simple split bar (single comparison, not repeated map stats)
// ------------------------------------------------------------
function buildGwSwChart() {
  const el = document.getElementById("chart-gwsw");
  const gw = 72, sw = 28;
  const w = 440, h = 280;
  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  const barY = 110, barH = 62, barX = 20, barMaxW = w - 40;
  const gwW = (gw / 100) * barMaxW;

  const track = svgEl("rect", { x: barX, y: barY, width: barMaxW, height: barH, rx: 4, fill: "rgba(11,31,28,0.06)" });
  svg.appendChild(track);

  const gwRect = svgEl("rect", { x: barX, y: barY, width: 0, height: barH, rx: 4, fill: "#2662A6", style: "cursor:pointer;transition:width .8s cubic-bezier(.4,0,.2,1);" });
  svg.appendChild(gwRect);
  requestAnimationFrame(() => setTimeout(() => gwRect.setAttribute("width", gwW), 100));

  const swRect = svgEl("rect", { x: barX + gwW, y: barY, width: 0, height: barH, rx: 0, fill: "#1B6E63", style: "cursor:pointer;transition:width .8s cubic-bezier(.4,0,.2,1);" });
  svg.appendChild(swRect);
  requestAnimationFrame(() => setTimeout(() => swRect.setAttribute("width", barMaxW - gwW), 100));

  [
    { rect: gwRect, label: "Groundwater", val: "4,161K ha · 72%", x: barX + gwW / 2 },
    { rect: swRect, label: "Surface water", val: "1,617K ha · 28%", x: barX + gwW + (barMaxW - gwW) / 2 }
  ].forEach(item => {
    item.rect.addEventListener("mouseenter", () => {
      item.rect.style.opacity = "0.85";
      showTipAt(card, tip, svg, item.x, barY, `${item.label}: <span class="tt-val">${item.val}</span>`);
    });
    item.rect.addEventListener("mouseleave", () => { item.rect.style.opacity = "1"; hideTip(tip); });
  });

  const gwLabel = svgEl("text", { x: barX, y: barY - 18, "font-family": "IBM Plex Mono, monospace", "font-size": "14", fill: "#2662A6", "font-weight": "700" });
  gwLabel.textContent = "Groundwater — 72%";
  svg.appendChild(gwLabel);

  const swLabel = svgEl("text", { x: barX + barMaxW, y: barY - 18, "text-anchor": "end", "font-family": "IBM Plex Mono, monospace", "font-size": "14", fill: "#1B6E63", "font-weight": "700" });
  swLabel.textContent = "Surface water — 28%";
  svg.appendChild(swLabel);

  const noteY = barY + barH + 42;
  const note = svgEl("text", { x: barX, y: noteY, "font-family": "IBM Plex Mono, monospace", "font-size": "12.5", fill: "#3E534E" });
  note.textContent = "Groundwater carries 2.6× the area surface water does.";
  svg.appendChild(note);

  const note2 = svgEl("text", { x: barX, y: noteY + 24, "font-family": "IBM Plex Mono, monospace", "font-size": "12.5", fill: "#3E534E" });
  note2.textContent = "5,778K ha total irrigated, Rabi 2023–24.";
  svg.appendChild(note2);

  el.appendChild(svg);
}

// ------------------------------------------------------------
// 5. POWER — diverging bar chart (diesel vs electric), by division
// ------------------------------------------------------------
function buildPowerChart() {
  const data = [
    { name: "Rajshahi", elec: 64.2, diesel: 35.8 },
    { name: "Mymensingh", elec: 50.9, diesel: 49.1 },
    { name: "Chittagong", elec: 49.5, diesel: 50.5 },
    { name: "Rangpur", elec: 48.8, diesel: 51.2 },
    { name: "Dhaka", elec: 46.3, diesel: 53.7 },
    { name: "Khulna", elec: 31.3, diesel: 68.7 },
    { name: "Sylhet", elec: 17.2, diesel: 82.8 },
    { name: "Barisal", elec: 12.2, diesel: 87.8 },
  ].sort((a, b) => b.elec - a.elec);

  const el = document.getElementById("chart-power");
  const w = 460, h = 340, padT = 10, padB = 10, rowH = (h - padT - padB) / data.length;
  const centerX = w / 2, halfW = w / 2 - 82;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  // center axis
  svg.appendChild(svgEl("line", { x1: centerX, x2: centerX, y1: padT, y2: h - padB, stroke: "rgba(11,31,28,0.15)", "stroke-width": "1" }));

  data.forEach((d, i) => {
    const y = padT + i * rowH;
    const barY = y + rowH * 0.34;
    const barH = rowH * 0.42;
    const dieselW = (d.diesel / 100) * halfW;
    const elecW = (d.elec / 100) * halfW;

    const dieselBar = svgEl("rect", { x: centerX, y: barY, width: 0, height: barH, fill: "#C97A2E", rx: 2, style: "cursor:pointer;transition:width .6s ease, x .6s ease;" });
    svg.appendChild(dieselBar);
    requestAnimationFrame(() => setTimeout(() => { dieselBar.setAttribute("x", centerX - dieselW); dieselBar.setAttribute("width", dieselW); }, i * 45));

    const elecBar = svgEl("rect", { x: centerX, y: barY, width: 0, height: barH, fill: "#3E7A3F", rx: 2, style: "cursor:pointer;transition:width .6s ease;" });
    svg.appendChild(elecBar);
    requestAnimationFrame(() => setTimeout(() => elecBar.setAttribute("width", elecW), i * 45));

    const nameLabel = svgEl("text", { x: centerX, y: y + rowH * 0.18, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace", "font-size": "11.5", fill: "#0B1F1C", "font-weight": "700" });
    nameLabel.textContent = d.name;
    svg.appendChild(nameLabel);

    const dieselVal = svgEl("text", { x: centerX - dieselW - 8, y: barY + barH / 2 + 4, "text-anchor": "end", "font-family": "IBM Plex Mono, monospace", "font-size": "11.5", fill: "#C97A2E", "font-weight": "700" });
    dieselVal.textContent = d.diesel.toFixed(1) + "%";
    svg.appendChild(dieselVal);

    const elecVal = svgEl("text", { x: centerX + elecW + 8, y: barY + barH / 2 + 4, "font-family": "IBM Plex Mono, monospace", "font-size": "11.5", fill: "#3E7A3F", "font-weight": "700" });
    elecVal.textContent = d.elec.toFixed(1) + "%";
    svg.appendChild(elecVal);

    const hit = svgEl("rect", { x: 0, y, width: w, height: rowH, fill: "transparent", style: "cursor:pointer;" });
    hit.addEventListener("mouseenter", () => {
      showTipAt(card, tip, svg, centerX, barY, `${d.name}: <span class="tt-val">${d.elec}% electric / ${d.diesel}% diesel</span>`);
    });
    hit.addEventListener("mouseleave", () => hideTip(tip));
    svg.appendChild(hit);
  });

  // legend row at very top overlapping - instead append small legend below via HTML
  el.appendChild(svg);
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.innerHTML = `<span><span class="sw" style="background:#3E7A3F;"></span>Electricity</span><span><span class="sw" style="background:#C97A2E;"></span>Diesel</span>`;
  el.closest(".chart-card").appendChild(legend);
}

// ------------------------------------------------------------
// 6. ZONING — avg max depth by division, filterable by zone-class color threshold
// ------------------------------------------------------------
const ZONING_DATA = [
  { name: "Barisal", depth: 2.8, zone: "safe" },
  { name: "Khulna", depth: 5.7, zone: "safe" },
  { name: "Rangpur", depth: 5.7, zone: "safe" },
  { name: "Chittagong", depth: 6.8, zone: "safe" },
  { name: "Sylhet", depth: 7.4, zone: "safe" },
  { name: "Dhaka", depth: 7.8, zone: "moderate" },
  { name: "Rajshahi", depth: 10.4, zone: "moderate" },
  { name: "Mymensingh", depth: 10.8, zone: "moderate" },
];
const ZONE_COLORS = { safe: "#3E7A3F", moderate: "#C99A2E", deep: "#B25A2E", critical: "#7E2A20" };

function buildZoningChart(activeZones = null) {
  const el = document.getElementById("chart-zoning");
  el.innerHTML = "";
  const w = 460, h = 340, padL = 112, padR = 52, padT = 12, padB = 12;
  const rowH = (h - padT - padB) / ZONING_DATA.length;
  const maxV = 12;
  const barMaxW = w - padL - padR;

  const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}` });
  const card = el.closest(".chart-card");
  const tip = attachTooltip(card);

  // safe threshold line at 7.6m
  const threshX = padL + (7.6 / maxV) * barMaxW;
  svg.appendChild(svgEl("line", { x1: threshX, x2: threshX, y1: padT - 2, y2: h - padB + 2, stroke: "#C99A2E", "stroke-width": "1", "stroke-dasharray": "3,3", opacity: "0.6" }));

  ZONING_DATA.forEach((d, i) => {
    const y = padT + i * rowH;
    const barW = (d.depth / maxV) * barMaxW;
    const dimmed = activeZones && !activeZones.has(d.zone);

    const label = svgEl("text", { x: padL - 12, y: y + rowH/2 + 5, "text-anchor":"end", "font-family":"IBM Plex Mono, monospace", "font-size":"13", "font-weight":"500", fill: dimmed ? "#B8C2BE" : "#3E534E" });
    label.textContent = d.name;
    svg.appendChild(label);

    const track = svgEl("rect", { x: padL, y: y + rowH*0.26, width: barMaxW, height: rowH*0.48, rx:3, fill:"rgba(11,31,28,0.05)" });
    svg.appendChild(track);

    const bar = svgEl("rect", { x: padL, y: y + rowH*0.26, width: 0, height: rowH*0.48, rx:3,
      fill: dimmed ? "#D8DCD8" : ZONE_COLORS[d.zone], style:"cursor:pointer;transition:width .6s ease, fill .3s ease;" });
    svg.appendChild(bar);
    requestAnimationFrame(() => setTimeout(() => bar.setAttribute("width", barW), i * 60));

    const val = svgEl("text", { x: padL + barW + 10, y: y + rowH/2 + 5, "font-family":"IBM Plex Mono, monospace", "font-size":"13", fill: dimmed ? "#B8C2BE" : "#0B1F1C", "font-weight":"700" });
    val.textContent = d.depth + "m";
    svg.appendChild(val);

    const hit = svgEl("rect", { x:0, y, width:w, height:rowH, fill:"transparent", style:"cursor:pointer;" });
    hit.addEventListener("mouseenter", () => {
      showTipAt(card, tip, svg, padL + barW / 2, y + rowH * 0.2, `${d.name}: <span class="tt-val">${d.depth}m avg</span> (${d.zone})`);
    });
    hit.addEventListener("mouseleave", () => hideTip(tip));
    svg.appendChild(hit);
  });

  el.appendChild(svg);
}

function setupZoneLegendFilter() {
  const chips = document.querySelectorAll("#zoneLegend .zonechip");
  let activeSet = new Set(["safe", "moderate", "deep", "critical"]);
  let allActive = true;

  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const zone = chip.dataset.zone;
      if (allActive) {
        // first click: isolate this zone only
        activeSet = new Set([zone]);
        allActive = false;
        chips.forEach(c => c.classList.toggle("active", c.dataset.zone === zone));
      } else if (activeSet.has(zone) && activeSet.size === 1) {
        // clicking the only active one again resets to show all
        activeSet = new Set(["safe", "moderate", "deep", "critical"]);
        allActive = true;
        chips.forEach(c => c.classList.add("active"));
      } else {
        activeSet = new Set([zone]);
        chips.forEach(c => c.classList.toggle("active", c.dataset.zone === zone));
      }
      buildZoningChart(allActive ? null : activeSet);
    });
  });
}

// ------------------------------------------------------------
// 7. SPOTLIGHT — groundwater reliance rows with depth marker + depletion projector
// ------------------------------------------------------------
const SPOTLIGHT_DATA = [
  { name: "Rajshahi", reliance: 99, depth: 10.4 },
  { name: "Mymensingh", reliance: 86, depth: 10.8 },
  { name: "Rangpur", reliance: 89, depth: 5.7 },
  { name: "Dhaka", reliance: 64, depth: 7.8 },
  { name: "Barisal", reliance: 31, depth: 2.8 },
];
// illustrative per-division drawdown rate (m/yr) — derived proportionally from reliance for the projector demo
function drawdownRate(d) {
  return (d.reliance / 100) * (d.depth > 8 ? 0.35 : 0.12);
}

function buildSpotlightRows() {
  const wrap = document.getElementById("spotRows");
  wrap.innerHTML = "";
  const maxDepth = 20; // scale for marker position within track

  SPOTLIGHT_DATA.forEach(d => {
    const row = document.createElement("div");
    row.className = "spot-row";
    row.innerHTML = `
      <div class="name">${d.name}</div>
      <div class="track">
        <div class="seg-gw" style="width:0%;" data-final="${d.reliance}"></div>
        <div class="depth-marker" style="left:${Math.min(d.depth / maxDepth * 100, 96)}%;" data-depth="${d.depth}"></div>
      </div>
      <div class="pct">${d.reliance}%</div>
    `;
    wrap.appendChild(row);
    const seg = row.querySelector(".seg-gw");
    requestAnimationFrame(() => setTimeout(() => seg.style.width = d.reliance + "%", 150));
  });
}

function setupProjector() {
  const slider = document.getElementById("projSlider");
  const yearOut = document.getElementById("projYear");
  const note = document.getElementById("projNote");
  const maxDepth = 20;

  function update() {
    const years = parseInt(slider.value, 10);
    yearOut.textContent = (years === 0 ? "+0 yrs" : "+" + years + " yrs");

    document.querySelectorAll("#spotRows .spot-row").forEach((row, i) => {
      const d = SPOTLIGHT_DATA[i];
      const marker = row.querySelector(".depth-marker");
      const projectedDepth = d.depth + drawdownRate(d) * years;
      marker.style.left = Math.min(projectedDepth / maxDepth * 100, 97) + "%";
      marker.title = `${d.name}: ${projectedDepth.toFixed(1)}m projected`;
    });

    const rajProjected = (SPOTLIGHT_DATA[0].depth + drawdownRate(SPOTLIGHT_DATA[0]) * years).toFixed(1);
    if (years === 0) {
      note.className = "projector-note";
      note.textContent = "Rajshahi's divisional average sits at 10.4m today. Drag the slider to project a straight-line extension of the observed drawdown rate — illustrative, not a hydrological forecast.";
    } else {
      const crossesCritical = rajProjected >= 20;
      note.className = "projector-note" + (crossesCritical ? " warn" : "");
      note.textContent = `At +${years} years, Rajshahi's projected average reaches ${rajProjected}m` +
        (crossesCritical ? " — past the critical threshold (20m) used in Layer 05's zoning." : ", assuming today's drawdown rate holds steady.");
    }
  }

  slider.addEventListener("input", update);
  update();
}

// ------------------------------------------------------------
// SCROLL-DRIVEN WATER GAUGE (persistent instrument)
// ------------------------------------------------------------
function setupGauge() {
  const water = document.getElementById("gaugeWater");
  const depthVal = document.getElementById("gaugeDepthVal");
  const zoneLabel = document.getElementById("gaugeZoneLabel");
  const topBar = document.getElementById("topProgress");
  const maxDepth = 32;

  function zoneFor(d) {
    if (d < 7.6) return { name: "SAFE", color: "#3E7A3F" };
    if (d < 11.3) return { name: "MODERATE", color: "#C99A2E" };
    if (d < 20) return { name: "DEEP", color: "#B25A2E" };
    return { name: "CRITICAL", color: "#7E2A20" };
  }

  // document.scrollingElement is the reliable cross-browser way to read the
  // element that actually scrolls the page (documentElement in almost every
  // real case, but this avoids the rare quirks-mode/embedding edge cases
  // where document.documentElement.scrollHeight under-reports).
  const scroller = document.scrollingElement || document.documentElement;
  let lastProgress = -1;

  function update() {
    const scrollable = scroller.scrollHeight - window.innerHeight;
    const scrollY = window.scrollY || scroller.scrollTop || 0;
    const progress = scrollable > 0 ? Math.min(Math.max(scrollY / scrollable, 0), 1) : 0;
    if (progress === lastProgress) return;
    lastProgress = progress;

    const depth = progress * maxDepth;
    const zone = zoneFor(depth);

    if (water) {
      water.style.height = Math.max(progress * 100, 2) + "%";
      water.style.background = `linear-gradient(180deg, ${zone.color}, ${zone.color}88)`;
    }
    if (depthVal) depthVal.textContent = depth.toFixed(1) + " m";
    if (zoneLabel) { zoneLabel.textContent = zone.name; zoneLabel.style.color = zone.color; }
    if (topBar) { topBar.style.width = (progress * 100) + "%"; topBar.style.background = zone.color; }
  }

  window.addEventListener("scroll", update, { passive: true });
  document.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  // Backup: some embedding/preview contexts don't reliably dispatch the
  // 'scroll' event to window even though the page visibly scrolls. Polling
  // scrollY every frame costs nothing (update() bails out instantly when the
  // position hasn't changed) and guarantees the gauge can never get stuck.
  (function poll() {
    update();
    requestAnimationFrame(poll);
  })();
}

// ------------------------------------------------------------
// NAV active-link highlighting
// ------------------------------------------------------------
function setupNavHighlight() {
  const sections = document.querySelectorAll("section[id], .layer[id]");
  const links = document.querySelectorAll(".navlinks a");
  const map = {};
  links.forEach(l => map[l.getAttribute("href").slice(1)] = l);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = map[entry.target.id];
      if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { rootMargin: "-40% 0px -50% 0px" });

  sections.forEach(s => { if (map[s.id]) observer.observe(s); });
}

// ------------------------------------------------------------
// LIGHTBOX for map figures
// ------------------------------------------------------------
function setupLightbox() {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");
  const lbClose = document.getElementById("lbClose");

  document.querySelectorAll("[data-lightbox]").forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      lbImg.src = trigger.dataset.img;
      lbCap.textContent = trigger.dataset.cap || "";
      lb.classList.add("open");
    });
  });
  function close() { lb.classList.remove("open"); lbImg.src = ""; }
  lbClose.addEventListener("click", close);
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// ------------------------------------------------------------
// PPKX REQUEST MODAL — in-page form that composes a mailto: on submit
// ------------------------------------------------------------
function setupPpkxModal() {
  const trigger = document.getElementById("ppkxRequestBtn");
  const modal = document.getElementById("ppkxModal");
  if (!trigger || !modal) return;

  const closeBtn = document.getElementById("ppkxClose");
  const form = document.getElementById("ppkxForm");
  const formView = document.getElementById("ppkxFormView");
  const sentView = document.getElementById("ppkxSentView");
  const backBtn = document.getElementById("ppkxBackBtn");

  const RECIPIENT = "partho.2105056@bau.edu.bd";

  function open() {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("ppkxName").focus();
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    formView.style.display = "";
    sentView.style.display = "none";
  }

  trigger.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
  if (backBtn) backBtn.addEventListener("click", () => { formView.style.display = ""; sentView.style.display = "none"; });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("ppkxName").value.trim();
    const email = document.getElementById("ppkxEmail").value.trim();
    const org = document.getElementById("ppkxOrg").value.trim();
    const reason = document.getElementById("ppkxReason").value.trim();

    const subject = `Request for ArcGIS project file (.ppkx) — Irrigation Atlas`;
    const bodyLines = [
      `Hi Deboneel,`,
      ``,
      `I'd like to request the ArcGIS project file (.ppkx) for the Rabi 2023–24 Irrigation Atlas.`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      org ? `Organisation: ${org}` : null,
      ``,
      `Reason for request:`,
      reason,
      ``,
      `Thanks!`
    ].filter(line => line !== null).join("\n");

    const mailtoUrl = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
    window.location.href = mailtoUrl;

    formView.style.display = "none";
    sentView.style.display = "";
  });
}

// ------------------------------------------------------------
// INIT
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  buildDivisionChart();
  setupNcaToggle();
  buildSurfaceChart();
  buildGwSwChart();
  buildPowerChart();
  buildZoningChart();
  setupZoneLegendFilter();
  buildSpotlightRows();
  setupProjector();
  setupGauge();
  setupNavHighlight();
  setupLightbox();
  setupPpkxModal();
});