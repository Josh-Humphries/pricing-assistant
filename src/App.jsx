import { useState, useEffect } from "react";
import { useQuotes } from './hooks/useQuotes';
import { useSettings } from './hooks/useSettings';

// ─── Constants ───
const DEFAULT_RATE = 175;
const DEFAULT_MIN_PROJECT = 1750;
const DEFAULT_LANDING_PAGE_PRICE = 700;
const STORAGE_KEY = "pricing-studio-quotes";
const THEME_KEY = "pricing-studio-theme";
const SETTINGS_KEY = "pricing-studio-settings";
const STATUSES = ["Draft", "Sent", "Accepted", "Declined"];
const STATUS_COLORS = { Draft: "#888", Sent: "#c9a96e", Accepted: "#6ec96e", Declined: "#c96e6e" };

// ─── Themes ───
const themes = {
  dark: {
    bg: "#0a0a0f", surface: "#0e0e16", surfaceAlt: "#12121a", surfaceHover: "#16162a",
    border: "#1e1e28", borderLight: "#2a2a36", borderAccent: "#c9a96e55",
    text: "#e8e4df", textMuted: "#888", textDim: "#666", textFaint: "#555", textGhost: "#444",
    accent: "#c9a96e", accentDim: "#a88c5a", accentBg: "#c9a96e18", accentBorder: "#c9a96e33",
    green: "#6ec96e", red: "#c96e6e",
    summaryBg: "linear-gradient(160deg, #111119 0%, #14142a 100%)",
    headerBg: "linear-gradient(135deg, #12121a 0%, #16162a 100%)",
    btnPrimary: "linear-gradient(135deg, #c9a96e, #a8843f)", btnPrimaryText: "#0a0a0f",
    divider: "#1a1a24", dividerAccent: "#c9a96e33",
    toggleBg: "#1e1e28", toggleDot: "#555",
  },
  light: {
    bg: "#f5f3ef", surface: "#ffffff", surfaceAlt: "#f9f8f6", surfaceHover: "#f0eeea",
    border: "#e2dfd8", borderLight: "#d5d1c9", borderAccent: "#c9a96e55",
    text: "#2a2520", textMuted: "#777", textDim: "#999", textFaint: "#aaa", textGhost: "#ccc",
    accent: "#a8843f", accentDim: "#8a6d33", accentBg: "#c9a96e15", accentBorder: "#c9a96e33",
    green: "#3d9a3d", red: "#c94444",
    summaryBg: "linear-gradient(160deg, #ffffff 0%, #faf9f6 100%)",
    headerBg: "linear-gradient(135deg, #ffffff 0%, #faf8f4 100%)",
    btnPrimary: "linear-gradient(135deg, #a8843f, #8a6d33)", btnPrimaryText: "#ffffff",
    divider: "#e8e5de", dividerAccent: "#c9a96e33",
    toggleBg: "#e2dfd8", toggleDot: "#bbb",
  },
};

// ─── Helpers ───
function formatPrice(n) { return "\u00a3" + n.toLocaleString("en-GB"); }
function formatDate(iso) { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function loadTheme() { try { return localStorage.getItem(THEME_KEY) || "dark"; } catch { return "dark"; } }
// Note: loadQuotes, saveQuotes, loadSettings, saveSettings removed - now handled by custom hooks

function calcTotal(q, settings) {
  const rate = settings?.rate || DEFAULT_RATE;
  const minProject = settings?.minProject || DEFAULT_MIN_PROJECT;
  const landingPagePrice = settings?.landingPagePrice || DEFAULT_LANDING_PAGE_PRICE;
  const sc = (q.includeDesign ? 1 : 0) + (q.includeDev ? 1 : 0) + (q.includeCopy ? 1 : 0);
  const pt = q.isLandingPage ? landingPagePrice : q.pages * sc * rate;
  const pluginCost = (q.plugins || []).reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  const sub = pt + (q.addBlog ? 700 : 0) + (q.addShop ? 700 : 0) + ((q.customPostTypes || []).length * 700) + pluginCost;
  const pm = q.includePM ? Math.round(sub * 0.2) : 0;
  const cont = q.includeContingency ? Math.round(sub * 0.2) : 0;
  const pre = sub + pm + cont;
  const disc = q.discountValue > 0 ? (q.discountType === "percent" ? Math.round(pre * (q.discountValue / 100)) : Math.min(q.discountValue, pre)) : 0;
  const raw = pre - disc;
  return q.isLandingPage ? raw : Math.max(raw, minProject);
}

function calcRecurringCosts(q) {
  const monthly = (q.plugins || []).filter(function(p) { return p.frequency === "monthly"; }).reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  const annual = (q.plugins || []).filter(function(p) { return p.frequency === "annual"; }).reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  return { monthly: monthly, annual: annual };
}

// ─── AnimatedNumber ───
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display; const diff = value - start;
    if (diff === 0) return;
    let step = 0;
    const interval = setInterval(() => { step++; setDisplay(Math.round(start + diff * (1 - Math.pow(1 - step / 18, 3)))); if (step >= 18) clearInterval(interval); }, 20);
    return () => clearInterval(interval);
  }, [value]);
  return <>{formatPrice(display)}</>;
}

// ─── Toggle ───
const Toggle = ({ active, onToggle, label, sublabel, rightContent, t }) => (
  <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 10, background: active ? t.surfaceAlt : t.surface, border: "1px solid " + (active ? t.borderAccent : t.border), cursor: "pointer", transition: "all 0.25s ease" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 22, borderRadius: 99, background: active ? t.accentBg : t.toggleBg, border: "1px solid " + (active ? t.accent : t.borderLight), position: "relative", transition: "all 0.3s ease", flexShrink: 0 }}>
        <div style={{ width: 16, height: 16, borderRadius: 99, background: active ? t.accent : t.toggleDot, position: "absolute", top: 2, left: active ? 20 : 2, transition: "all 0.3s ease" }} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: active ? t.text : t.textMuted }}>{label}</div>
        {sublabel && <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
    {rightContent && <div style={{ fontSize: 14, color: t.accent, fontWeight: 500 }}>{rightContent}</div>}
  </div>
);

// ─── PDF Export ───
function exportPDF(q, settings) {
  const rate = settings?.rate || DEFAULT_RATE;
  const landingPagePrice = settings?.landingPagePrice || DEFAULT_LANDING_PAGE_PRICE;
  const total = calcTotal(q, settings);
  const sc = (q.includeDesign ? 1 : 0) + (q.includeDev ? 1 : 0) + (q.includeCopy ? 1 : 0);
  const pt = q.isLandingPage ? landingPagePrice : q.pages * sc * rate;
  const pluginCost = (q.plugins || []).reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  const sub = pt + (q.addBlog ? 700 : 0) + (q.addShop ? 700 : 0) + ((q.customPostTypes || []).length * 700) + pluginCost;
  const pm = q.includePM ? Math.round(sub * 0.2) : 0;
  const cont = q.includeContingency ? Math.round(sub * 0.2) : 0;
  const pre = sub + pm + cont;
  const disc = q.discountValue > 0 ? (q.discountType === "percent" ? Math.round(pre * (q.discountValue / 100)) : Math.min(q.discountValue, pre)) : 0;

  // When hiding internal costs, adjust displayed rate to include PM/contingency
  const pmMultiplier = q.includePM ? 1.2 : 1;
  const contMultiplier = q.includeContingency ? 1.2 : 1;
  const adjustedRate = settings?.showInternalCosts ? rate : Math.round(rate * pmMultiplier * contMultiplier);

  const svcs = [];
  if (!q.isLandingPage) { if (q.includeDesign) svcs.push("Design"); if (q.includeDev) svcs.push("Development"); if (q.includeCopy) svcs.push("Copywriting"); }
  const rows = [];
  if (q.isLandingPage) { rows.push(["Landing Page Offer", formatPrice(landingPagePrice)]); }
  else { svcs.forEach(function(s) { rows.push([s + " (" + q.pages + " pages \u00d7 " + formatPrice(adjustedRate) + ")", formatPrice(q.pages * adjustedRate)]); }); }
  if (q.addBlog) rows.push(["Blog (Index + Archive)", formatPrice(700)]);
  if (q.addShop) rows.push(["Shop", formatPrice(700)]);
  (q.customPostTypes || []).forEach(function(cpt) { rows.push([cpt.name + " (Index + Archive)", formatPrice(700)]); });
  (q.plugins || []).forEach(function(plugin) {
    var label = plugin.name + " (Plugin/Service)";
    if (plugin.frequency === "monthly") label += " - Monthly";
    if (plugin.frequency === "annual") label += " - Annual";
    rows.push([label, formatPrice(plugin.cost)]);
  });
  rows.push(["__div__", ""]);
  if (settings?.showInternalCosts) {
    rows.push(["Subtotal", formatPrice(sub)]);
    if (q.includePM) rows.push(["Project Management (20%)", formatPrice(pm)]);
    if (q.includeContingency) rows.push(["Contingency (20%)", formatPrice(cont)]);
  }
  if (disc > 0) rows.push(["Discount" + (q.discountType === "percent" ? " (" + q.discountValue + "%)" : ""), "\u2212" + formatPrice(disc)]);
  const trs = rows.map(function(r) { if (r[0] === "__div__") return '<tr><td colspan="2" style="border-bottom:1px solid #ddd;padding:8px 0"></td></tr>'; return '<tr><td style="padding:8px 0;color:#555">' + r[0] + '</td><td style="padding:8px 0;text-align:right;font-weight:600">' + r[1] + '</td></tr>'; }).join("");
  const recurring = calcRecurringCosts(q);
  const recurringHTML = (recurring.monthly > 0 || recurring.annual > 0) ? '<div style="margin-top:32px;padding:20px;background:#f8f7f5;border-radius:8px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:12px;font-weight:600">Recurring Costs</div>' + (recurring.monthly > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span>Monthly</span><span style="font-weight:600">' + formatPrice(recurring.monthly) + '/mo</span></div>' : '') + (recurring.annual > 0 ? '<div style="display:flex;justify-content:space-between;font-size:14px"><span>Annual</span><span style="font-weight:600">' + formatPrice(recurring.annual) + '/yr</span></div>' : '') + '</div>' : '';
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quote</title><style>@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap");body{font-family:"DM Sans",sans-serif;padding:60px;color:#333;max-width:700px;margin:0 auto}h1{font-family:"Playfair Display",serif;font-weight:400;font-size:28px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:24px 0}.total{font-family:"Playfair Display",serif;font-size:36px;font-weight:700;text-align:right;padding-top:16px;border-top:2px solid #333}.meta{color:#888;font-size:13px;margin-bottom:4px}.status{display:inline-block;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:600;margin-top:8px}.notes{margin-top:24px;padding:16px;background:#f8f7f5;border-radius:8px;font-size:13px;color:#666;line-height:1.6}@media print{body{padding:40px}}</style></head><body><div style="margin-bottom:32px"><h1>' + (q.projectName || "Project Quote") + '</h1>' + (q.clientName ? '<div class="meta">Prepared for ' + q.clientName + '</div>' : '') + '<div class="meta">' + formatDate(q.createdAt) + '</div><div class="status" style="background:' + STATUS_COLORS[q.status] + '22;color:' + STATUS_COLORS[q.status] + '">' + q.status + '</div></div><table>' + trs + '</table><div class="total">' + formatPrice(total) + '</div>' + recurringHTML + (q.notes ? '<div class="notes"><strong>Notes</strong><br>' + q.notes.replace(/\n/g, "<br>") + '</div>' : '') + '<script>window.onload=function(){window.print()}<\/script></body></html>';
  const w = window.open("", "_blank"); w.document.write(html); w.document.close();
}

// ─── Copy quote to clipboard ───
function buildQuoteText(q, settings) {
  const rate = settings?.rate || DEFAULT_RATE;
  const landingPagePrice = settings?.landingPagePrice || DEFAULT_LANDING_PAGE_PRICE;

  // When hiding internal costs, adjust displayed rate to include PM/contingency
  const pmMultiplier = q.includePM ? 1.2 : 1;
  const contMultiplier = q.includeContingency ? 1.2 : 1;
  const adjustedRate = settings?.showInternalCosts ? rate : Math.round(rate * pmMultiplier * contMultiplier);

  const sc = (q.includeDesign ? 1 : 0) + (q.includeDev ? 1 : 0) + (q.includeCopy ? 1 : 0);
  const pt = q.isLandingPage ? landingPagePrice : q.pages * sc * rate;
  const blog = q.addBlog ? 700 : 0; const shop = q.addShop ? 700 : 0;
  const cpts = (q.customPostTypes || []);
  const cptTotal = cpts.length * 700;
  const pluginTotal = (q.plugins || []).reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  const sub = pt + blog + shop + cptTotal + pluginTotal;
  const pm = q.includePM ? Math.round(sub * 0.2) : 0;
  const cont = q.includeContingency ? Math.round(sub * 0.2) : 0;
  const pre = sub + pm + cont;
  const disc = q.discountValue > 0 ? (q.discountType === "percent" ? Math.round(pre * (q.discountValue / 100)) : Math.min(q.discountValue, pre)) : 0;
  const total = calcTotal(q, settings);
  const svcs = [];
  if (!q.isLandingPage) { if (q.includeDesign) svcs.push("Design"); if (q.includeDev) svcs.push("Dev"); if (q.includeCopy) svcs.push("Copy"); }
  const dl = disc > 0 ? "Discount" + (q.discountType === "percent" ? " (" + q.discountValue + "%)" : "") + ": -" + formatPrice(disc) : null;
  var lines = [
    "Web Design Estimate",
    q.clientName ? "Client: " + q.clientName : null,
    q.projectName ? "Project: " + q.projectName : null, "",
    q.isLandingPage ? "Landing Page Offer: " + formatPrice(landingPagePrice) : q.pages + " Pages",
    !q.isLandingPage ? "Services: " + svcs.join(", ") + " @ " + formatPrice(adjustedRate) + "/page each" : null,
    !q.isLandingPage ? "Page Total: " + formatPrice(q.pages * sc * adjustedRate) : null,
    q.addBlog ? "Blog (Index + Archive): " + formatPrice(blog) : null,
    q.addShop ? "Shop: " + formatPrice(shop) : null,
  ];
  cpts.forEach(function(c) { lines.push(c.name + " (Index + Archive): " + formatPrice(700)); });
  (q.plugins || []).forEach(function(p) {
    var label = p.name + " (Plugin/Service)";
    if (p.frequency === "monthly") label += " - Monthly";
    if (p.frequency === "annual") label += " - Annual";
    lines.push(label + ": " + formatPrice(p.cost));
  });
  if (settings?.showInternalCosts) {
    lines = lines.concat([
      "Subtotal: " + formatPrice(sub), "",
      q.includePM ? "Project Management (20%): " + formatPrice(pm) : null,
      q.includeContingency ? "Contingency (20%): " + formatPrice(cont) : null,
      dl, "", "Total: " + formatPrice(total),
    ]);
  } else {
    lines = lines.concat([
      dl, "", "Total: " + formatPrice(total),
    ]);
  }
  const recurring = calcRecurringCosts(q);
  if (recurring.monthly > 0 || recurring.annual > 0) {
    lines.push("", "Recurring Costs:");
    if (recurring.monthly > 0) lines.push("Monthly: " + formatPrice(recurring.monthly) + "/mo");
    if (recurring.annual > 0) lines.push("Annual: " + formatPrice(recurring.annual) + "/yr");
  }
  return lines.filter(function(l) { return l !== null; }).join("\n");
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function PricingAssistant() {
  const [mode, setMode] = useState(loadTheme);
  const [view, setView] = useState("calculator");
  const { quotes, setQuotes, addQuote, updateQuote, deleteQuote: deleteQuoteAPI, loading: quotesLoading, error: quotesError } = useQuotes();
  const { settings, setSettings, updateSettings, loading: settingsLoading, error: settingsError } = useSettings();

  const [pages, setPages] = useState(5);
  const [includeDesign, setIncludeDesign] = useState(true);
  const [includeDev, setIncludeDev] = useState(true);
  const [includeCopy, setIncludeCopy] = useState(false);
  const [isLandingPage, setIsLandingPage] = useState(false);
  const [addBlog, setAddBlog] = useState(false);
  const [addShop, setAddShop] = useState(false);
  const [customPostTypes, setCustomPostTypes] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [includePM, setIncludePM] = useState(true);
  const [includeContingency, setIncludeContingency] = useState(true);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [copiedQuoteId, setCopiedQuoteId] = useState(null);

  const t = themes[mode];

  // Theme is still stored in localStorage (hooks handle quotes/settings)
  useEffect(() => { localStorage.setItem(THEME_KEY, mode); }, [mode]);

  // ─── Pricing ───
  const RATE = settings.rate;
  const MIN_PROJECT = settings.minProject;
  const LANDING_PAGE_PRICE = settings.landingPagePrice;
  const effectivePages = isLandingPage ? 1 : pages;
  const services = [];
  if (!isLandingPage) { if (includeDesign) services.push("Design"); if (includeDev) services.push("Dev"); if (includeCopy) services.push("Copy"); }

  // When hiding internal costs, adjust displayed rate to include PM/contingency
  const pmMultiplier = includePM ? 1.2 : 1;
  const contMultiplier = includeContingency ? 1.2 : 1;
  const displayRate = settings.showInternalCosts ? RATE : Math.round(RATE * pmMultiplier * contMultiplier);

  const perPageCost = services.length * RATE;
  const pageTotal = isLandingPage ? LANDING_PAGE_PRICE : effectivePages * perPageCost;
  const blogCost = addBlog ? 700 : 0;
  const shopCost = addShop ? 700 : 0;
  const cptCost = customPostTypes.length * 700;
  const pluginCost = plugins.reduce(function(sum, p) { return sum + (p.cost || 0); }, 0);
  const recurringCosts = calcRecurringCosts({ plugins: plugins });
  const subtotal = pageTotal + blogCost + shopCost + cptCost + pluginCost;
  const pmCost = includePM ? Math.round(subtotal * 0.2) : 0;
  const contingencyCost = includeContingency ? Math.round(subtotal * 0.2) : 0;
  const preDiscountTotal = subtotal + pmCost + contingencyCost;
  const discountAmount = discountValue > 0 ? (discountType === "percent" ? Math.round(preDiscountTotal * (discountValue / 100)) : Math.min(discountValue, preDiscountTotal)) : 0;
  const rawTotal = preDiscountTotal - discountAmount;
  const hasServices = isLandingPage || services.length > 0;
  const total = isLandingPage ? rawTotal : Math.max(rawTotal, hasServices ? MIN_PROJECT : 0);
  const belowMinimum = !isLandingPage && rawTotal < MIN_PROJECT && hasServices;

  const saveQuote = async () => {
    const data = { pages, includeDesign, includeDev, includeCopy, isLandingPage, addBlog, addShop, customPostTypes, plugins, includePM, includeContingency, discountType, discountValue, clientName, projectName, total, status: "Draft", notes: "", createdAt: new Date().toISOString() };
    if (editingId) {
      // Update existing quote
      await updateQuote(editingId, data);
      setEditingId(null);
    } else {
      // Add new quote
      data.id = uid();
      await addQuote(data);
    }
    setView("crm");
  };

  const editQuote = (q) => {
    setPages(q.pages); setIncludeDesign(q.includeDesign); setIncludeDev(q.includeDev); setIncludeCopy(q.includeCopy); setIsLandingPage(q.isLandingPage); setAddBlog(q.addBlog); setAddShop(q.addShop); setCustomPostTypes(q.customPostTypes || []); setPlugins(q.plugins || []); setIncludePM(q.includePM); setIncludeContingency(q.includeContingency); setDiscountType(q.discountType); setDiscountValue(q.discountValue); setClientName(q.clientName); setProjectName(q.projectName); setEditingId(q.id); setView("calculator");
  };

  const deleteQuote = async (id) => {
    await deleteQuoteAPI(id);
    if (expandedId === id) setExpandedId(null);
  };

  const updateStatus = async (id, s) => {
    await updateQuote(id, { status: s });
  };

  const updateNotes = async (id, n) => {
    await updateQuote(id, { notes: n });
  };

  const resetCalculator = () => {
    setPages(5); setIncludeDesign(true); setIncludeDev(true); setIncludeCopy(false); setIsLandingPage(false); setAddBlog(false); setAddShop(false); setCustomPostTypes([]); setPlugins([]); setIncludePM(true); setIncludeContingency(true); setDiscountType("percent"); setDiscountValue(0); setClientName(""); setProjectName(""); setEditingId(null);
  };

  const copyEstimate = () => {
    const text = buildQuoteText({ pages, includeDesign, includeDev, includeCopy, isLandingPage, addBlog, addShop, customPostTypes, plugins, includePM, includeContingency, discountType, discountValue, clientName, projectName }, settings);
    navigator.clipboard.writeText(text); setCopied(true); setTimeout(function() { setCopied(false); }, 2000);
  };

  const copyQuote = (q) => { navigator.clipboard.writeText(buildQuoteText(q, settings)); setCopiedQuoteId(q.id); setTimeout(function() { setCopiedQuoteId(null); }, 2000); };

  const filtered = filterStatus === "All" ? quotes : quotes.filter(function(q) { return q.status === filterStatus; });
  const totalQuoted = quotes.reduce(function(s, q) { return s + calcTotal(q, settings); }, 0);
  const totalAccepted = quotes.filter(function(q) { return q.status === "Accepted"; }).reduce(function(s, q) { return s + calcTotal(q, settings); }, 0);

  // ─── Dynamic CSS ───
  const css = [
    "* { box-sizing: border-box; margin: 0; padding: 0; }",
    "::selection { background: " + t.accentBg + "; }",
    ".fade-in { animation: fadeIn 0.4s ease forwards; }",
    "@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }",
    "input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; background: " + t.border + "; border-radius: 99px; outline: none; }",
    "input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: " + t.accent + "; cursor: pointer; border: 3px solid " + t.bg + "; box-shadow: 0 0 0 1px " + t.accentBorder + "; }",
    "input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: " + t.accent + "; cursor: pointer; border: 3px solid " + t.bg + "; }",
    "input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }",
    "input[type=number] { -moz-appearance: textfield; }",
    ".input-field { background: " + t.surfaceAlt + "; border: 1px solid " + t.border + "; border-radius: 8px; padding: 12px 16px; color: " + t.text + "; font-size: 14px; width: 100%; outline: none; transition: border-color 0.25s ease; font-family: inherit; }",
    ".input-field:focus { border-color: " + t.borderAccent + "; }",
    ".input-field::placeholder { color: " + t.textGhost + "; }",
    "textarea.input-field { resize: vertical; min-height: 80px; }",
    ".btn-primary { background: " + t.btnPrimary + "; color: " + t.btnPrimaryText + "; border: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; letter-spacing: 0.3px; font-family: inherit; }",
    ".btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 24px " + t.accentBorder + "; }",
    ".btn-sm { padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid " + t.border + "; background: transparent; color: " + t.textMuted + "; font-family: inherit; transition: all 0.2s ease; }",
    ".btn-sm:hover { border-color: " + t.textDim + "; color: " + t.text + "; }",
    ".section-label { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; color: " + t.textFaint + "; margin-bottom: 14px; }",
    ".summary-row { display: flex; justify-content: space-between; padding: 9px 0; font-size: 14px; }",
    ".summary-divider { height: 1px; background: " + t.divider + "; margin: 6px 0; }",
    ".tab { padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; font-family: inherit; transition: all 0.25s ease; }",
    ".tab-active { background: " + t.accentBg + "; color: " + t.accent + "; }",
    ".tab-inactive { background: transparent; color: " + t.textDim + "; }",
    ".tab-inactive:hover { color: " + t.textMuted + "; }",
    ".quote-card { background: " + t.surface + "; border: 1px solid " + t.border + "; border-radius: 12px; transition: all 0.25s ease; }",
    ".quote-card:hover { border-color: " + t.borderLight + "; }",
    "@media (max-width: 768px) { .container { padding: 24px 16px 40px !important; } }",
    "@media (max-width: 768px) { .tab { padding: 8px 16px; font-size: 13px; } }",
    "@media (max-width: 768px) { .btn-primary { padding: 12px 24px; font-size: 14px; } }",
    "@media (max-width: 768px) { .header-title { font-size: 24px !important; } }",
    "@media (max-width: 768px) { .header-tabs { flex-direction: column; width: 100%; gap: 8px !important; } }",
    "@media (max-width: 768px) { .header-tabs .tab { width: 100%; text-align: center; } }",
    "@media (max-width: 968px) { .calculator-grid { grid-template-columns: 1fr !important; gap: 32px !important; } }",
    "@media (max-width: 968px) { .summary-card { position: relative !important; top: 0 !important; } }",
    "@media (max-width: 968px) { .calculator-right { order: -1; } }",
    "@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr !important; } }",
    "@media (min-width: 641px) and (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }",
    "@media (max-width: 768px) { .quote-details { grid-template-columns: 1fr !important; } }",
    "@media (max-width: 640px) { .quote-card-header { flex-direction: column; align-items: flex-start !important; } }",
    "@media (max-width: 640px) { .quote-card-meta { width: 100%; justify-content: space-between; } }",
  ].join("\n");

  // ─── Theme toggle button ───
  const ThemeToggle = () => (
    <button onClick={() => setMode(mode === "dark" ? "light" : "dark")} style={{ background: t.surfaceAlt, border: "1px solid " + t.border, borderRadius: 99, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "all 0.3s ease", color: t.accent, flexShrink: 0 }} title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
      {mode === "dark" ? "\u2600" : "\u263D"}
    </button>
  );

  // ─── Chip button helper ───
  const Chip = ({ active, onClick, children, color }) => (
    <button onClick={onClick} style={{ padding: "7px 18px", borderRadius: 99, border: "1px solid " + (active ? (color || t.accent) : t.border), background: active ? (color || t.accent) + "18" : "transparent", color: active ? (color || t.accent) : t.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 500, transition: "all 0.25s ease" }}>
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", width: "100%", position: "absolute", top: 0, left: 0, right: 0, transition: "background 0.4s ease, color 0.4s ease" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div style={{ maxWidth: 920, margin: "0 auto", padding: "40px 32px 60px" }} className="container">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: t.textFaint, marginBottom: 8 }}>Pricing Studio</div>
            <h1 className="header-title" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 400, lineHeight: 1.2 }}>
              {view === "calculator" ? (<>Project <span style={{ color: t.accent, fontStyle: "italic" }}>Estimate</span></>) : view === "crm" ? (<>Saved <span style={{ color: t.accent, fontStyle: "italic" }}>Quotes</span></>) : view === "analytics" ? (<>Business <span style={{ color: t.accent, fontStyle: "italic" }}>Analytics</span></>) : (<>Pricing <span style={{ color: t.accent, fontStyle: "italic" }}>Settings</span></>)}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <ThemeToggle />
            <div className="header-tabs" style={{ display: "flex", gap: 4, background: t.surfaceAlt, borderRadius: 10, padding: 4 }}>
              <button className={"tab " + (view === "calculator" ? "tab-active" : "tab-inactive")} onClick={() => setView("calculator")}>Calculator</button>
              <button className={"tab " + (view === "crm" ? "tab-active" : "tab-inactive")} onClick={() => setView("crm")}>Quotes{quotes.length > 0 ? " (" + quotes.length + ")" : ""}</button>
              <button className={"tab " + (view === "analytics" ? "tab-active" : "tab-inactive")} onClick={() => setView("analytics")}>Analytics</button>
              <button className={"tab " + (view === "settings" ? "tab-active" : "tab-inactive")} onClick={() => setView("settings")}>Settings</button>
            </div>
          </div>
        </div>

        {/* ══════════ CALCULATOR ══════════ */}
        {view === "calculator" && (
          <div className="fade-in">
            {editingId && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: t.accentBg, border: "1px solid " + t.accentBorder, fontSize: 13, color: t.accent, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Editing: {projectName || clientName || "Untitled"}</span>
                <button className="btn-sm" onClick={resetCalculator} style={{ color: t.accent, borderColor: t.accentBorder }}>Cancel</button>
              </div>
            )}

            <div className="calculator-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 40 }}>
              {/* LEFT */}
              <div className="calculator-left" style={{ display: "flex", flexDirection: "column", gap: 32 }}>

                <div>
                  <div className="section-label">Project Type</div>
                  <Toggle t={t} active={isLandingPage} onToggle={() => setIsLandingPage(!isLandingPage)} label="Landing Page Offer" sublabel={"Flat rate \u2014 design, dev & deploy"} rightContent={isLandingPage ? formatPrice(LANDING_PAGE_PRICE) : null} />
                  {isLandingPage && <div style={{ padding: "12px 16px", borderRadius: 8, background: t.accentBg, border: "1px solid " + t.accentBorder, fontSize: 13, color: t.accentDim, lineHeight: 1.5, marginTop: 8 }}>Fixed {formatPrice(LANDING_PAGE_PRICE)} package. No minimum project cost.</div>}
                </div>

                {!isLandingPage && (
                  <div>
                    <div className="section-label">Services</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <Toggle t={t} active={includeDesign} onToggle={() => setIncludeDesign(!includeDesign)} label="Design" sublabel={formatPrice(displayRate) + " per page"} rightContent={includeDesign ? formatPrice(effectivePages * displayRate) : null} />
                      <Toggle t={t} active={includeDev} onToggle={() => setIncludeDev(!includeDev)} label="Development" sublabel={formatPrice(displayRate) + " per page"} rightContent={includeDev ? formatPrice(effectivePages * displayRate) : null} />
                      <Toggle t={t} active={includeCopy} onToggle={() => setIncludeCopy(!includeCopy)} label="Copywriting" sublabel={formatPrice(displayRate) + " per page"} rightContent={includeCopy ? formatPrice(effectivePages * displayRate) : null} />
                    </div>
                  </div>
                )}

                {!isLandingPage && (
                  <div>
                    <div className="section-label">Pages</div>
                    <div style={{ padding: "20px 24px", borderRadius: 12, background: t.surface, border: "1px solid " + t.border }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 14, color: t.textMuted }}>Number of pages</span>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: t.accent, fontWeight: 700 }}>{pages}</div>
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <input type="range" min={1} max={30} value={pages} onChange={(e) => setPages(parseInt(e.target.value))} />
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textGhost, marginTop: 6 }}><span>1</span><span>30</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {!isLandingPage && (
                  <div>
                    <div className="section-label">Add-ons</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <Toggle t={t} active={addBlog} onToggle={() => setAddBlog(!addBlog)} label="Blog" sublabel="Index + Archive (Design \u00d7 2, Dev \u00d7 2)" rightContent={addBlog ? formatPrice(700) : null} />
                      <Toggle t={t} active={addShop} onToggle={() => setAddShop(!addShop)} label="Shop" sublabel="E-commerce integration" rightContent={addShop ? formatPrice(700) : null} />
                    </div>

                    {/* Custom Post Types */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Custom Post Types</div>
                        <button onClick={() => setCustomPostTypes(customPostTypes.concat([{ id: uid(), name: "" }]))} style={{ padding: "5px 14px", borderRadius: 99, border: "1px solid " + t.border, background: "transparent", color: t.accent, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500, transition: "all 0.2s ease" }}>+ Add CPT</button>
                      </div>
                      {customPostTypes.length === 0 && (
                        <div style={{ fontSize: 13, color: t.textFaint, padding: "8px 0" }}>e.g. Downloads, Gallery, Case Studies</div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {customPostTypes.map(function(cpt, i) {
                          return (
                            <div key={cpt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: t.surfaceAlt, border: "1px solid " + t.borderAccent }}>
                              <input
                                className="input-field"
                                placeholder="e.g. Case Studies"
                                value={cpt.name}
                                onChange={function(e) {
                                  var updated = customPostTypes.map(function(c, j) { return j === i ? Object.assign({}, c, { name: e.target.value }) : c; });
                                  setCustomPostTypes(updated);
                                }}
                                style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                              />
                              <div style={{ fontSize: 13, color: t.accent, fontWeight: 500, whiteSpace: "nowrap" }}>{formatPrice(700)}</div>
                              <button onClick={function() { setCustomPostTypes(customPostTypes.filter(function(_, j) { return j !== i; })); }} style={{ background: "transparent", border: "none", color: t.red, cursor: "pointer", fontSize: 16, padding: "4px 8px", lineHeight: 1 }}>{"\u00d7"}</button>
                            </div>
                          );
                        })}
                      </div>
                      {customPostTypes.length > 0 && (
                        <div style={{ fontSize: 12, color: t.textDim, marginTop: 8 }}>
                          Index + Archive per CPT (Design \u00d7 2, Dev \u00d7 2) \u00b7 {customPostTypes.length} CPT{customPostTypes.length !== 1 ? "s" : ""} = {formatPrice(customPostTypes.length * 700)}
                        </div>
                      )}
                    </div>

                    {/* Plugins / Third-party Costs */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div className="section-label" style={{ marginBottom: 0 }}>Plugins / Third-Party Services</div>
                        <button onClick={() => setPlugins(plugins.concat([{ id: uid(), name: "", cost: 0, frequency: "one-time" }]))} style={{ padding: "5px 14px", borderRadius: 99, border: "1px solid " + t.border, background: "transparent", color: t.accent, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500, transition: "all 0.2s ease" }}>+ Add Plugin</button>
                      </div>
                      {plugins.length === 0 && (
                        <div style={{ fontSize: 13, color: t.textFaint, padding: "8px 0" }}>e.g. SEO tools, analytics, premium themes</div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {plugins.map(function(plugin, i) {
                          return (
                            <div key={plugin.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: t.surfaceAlt, border: "1px solid " + t.borderAccent, flexWrap: "wrap" }}>
                              <input
                                className="input-field"
                                placeholder="e.g. Yoast SEO Premium"
                                value={plugin.name}
                                onChange={function(e) {
                                  var updated = plugins.map(function(p, j) { return j === i ? Object.assign({}, p, { name: e.target.value }) : p; });
                                  setPlugins(updated);
                                }}
                                style={{ flex: "1 1 180px", minWidth: 180, padding: "8px 12px", fontSize: 13 }}
                              />
                              <div style={{ position: "relative", width: 100 }}>
                                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 12, pointerEvents: "none" }}>£</span>
                                <input
                                  className="input-field"
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={plugin.cost || ""}
                                  onChange={function(e) {
                                    var updated = plugins.map(function(p, j) { return j === i ? Object.assign({}, p, { cost: Math.max(0, parseInt(e.target.value) || 0) }) : p; });
                                    setPlugins(updated);
                                  }}
                                  style={{ padding: "8px 8px 8px 24px", fontSize: 13, textAlign: "right" }}
                                />
                              </div>
                              <select
                                className="input-field"
                                value={plugin.frequency || "one-time"}
                                onChange={function(e) {
                                  var updated = plugins.map(function(p, j) { return j === i ? Object.assign({}, p, { frequency: e.target.value }) : p; });
                                  setPlugins(updated);
                                }}
                                style={{ padding: "8px 12px", fontSize: 13, width: 110 }}
                              >
                                <option value="one-time">One-time</option>
                                <option value="monthly">/month</option>
                                <option value="annual">/year</option>
                              </select>
                              <button onClick={function() { setPlugins(plugins.filter(function(_, j) { return j !== i; })); }} style={{ background: "transparent", border: "none", color: t.red, cursor: "pointer", fontSize: 16, padding: "4px 8px", lineHeight: 1 }}>{"\u00d7"}</button>
                            </div>
                          );
                        })}
                      </div>
                      {plugins.length > 0 && pluginCost > 0 && (
                        <div style={{ fontSize: 12, color: t.textDim, marginTop: 8 }}>
                          {plugins.length} plugin{plugins.length !== 1 ? "s" : ""} / service{plugins.length !== 1 ? "s" : ""} = {formatPrice(pluginCost)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="section-label">Project Overheads</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Toggle t={t} active={includePM} onToggle={() => setIncludePM(!includePM)} label="Project Management" sublabel="20% of subtotal" rightContent={includePM ? formatPrice(pmCost) : null} />
                    <Toggle t={t} active={includeContingency} onToggle={() => setIncludeContingency(!includeContingency)} label="Contingency" sublabel="20% of subtotal" rightContent={includeContingency ? formatPrice(contingencyCost) : null} />
                  </div>
                </div>

                <div>
                  <div className="section-label">Discount</div>
                  <div style={{ padding: "20px 24px", borderRadius: 12, background: t.surface, border: "1px solid " + t.border }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                      <Chip active={discountType === "percent"} onClick={() => { setDiscountType("percent"); setDiscountValue(0); }}>%</Chip>
                      <Chip active={discountType === "fixed"} onClick={() => { setDiscountType("fixed"); setDiscountValue(0); }}>{"\u00a3"}</Chip>
                      {discountValue > 0 && <button onClick={() => setDiscountValue(0)} style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 99, border: "1px solid " + t.border, background: "transparent", color: t.textDim, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Clear</button>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textFaint, fontSize: 14, pointerEvents: "none" }}>{discountType === "percent" ? "%" : "\u00a3"}</span>
                        <input className="input-field" type="number" min={0} max={discountType === "percent" ? 100 : preDiscountTotal} value={discountValue || ""} onChange={(e) => { let v = parseFloat(e.target.value) || 0; if (discountType === "percent") v = Math.min(100, Math.max(0, v)); else v = Math.max(0, v); setDiscountValue(v); }} placeholder="0" style={{ paddingLeft: 34 }} />
                      </div>
                      {discountAmount > 0 && <div style={{ fontSize: 14, color: t.green, fontWeight: 500, whiteSpace: "nowrap" }}>{"\u2212"}{formatPrice(discountAmount)}</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — Summary */}
              <div className="calculator-right">
                <div className="summary-card" style={{ position: "sticky", top: 32, background: t.summaryBg, border: "1px solid " + t.accentBorder, borderRadius: 16, padding: 28 }}>
                  <div style={{ marginBottom: 20 }}>
                    <input className="input-field" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} style={{ marginBottom: 8 }} />
                    <input className="input-field" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                  </div>
                  <div className="section-label" style={{ marginBottom: 10 }}>Breakdown</div>

                  {!isLandingPage && services.length === 0 ? (
                    <div style={{ fontSize: 13, color: t.textFaint, padding: "12px 0" }}>Select at least one service.</div>
                  ) : isLandingPage ? (
                    <>
                      <div className="summary-row"><span>Landing Page Offer</span><span style={{ color: t.accent }}>{formatPrice(LANDING_PAGE_PRICE)}</span></div>
                      <div style={{ fontSize: 12, color: t.textDim, padding: "4px 0 12px" }}>Design, development & deployment</div>
                      {(includePM || includeContingency) && (<><div className="summary-divider" />{includePM && <div className="summary-row" style={{ color: t.textMuted }}><span>PM (20%)</span><span>{formatPrice(pmCost)}</span></div>}{includeContingency && <div className="summary-row" style={{ color: t.textMuted }}><span>Contingency (20%)</span><span>{formatPrice(contingencyCost)}</span></div>}</>)}
                      {discountAmount > 0 && <div className="summary-row" style={{ color: t.green }}><span>Discount{discountType === "percent" ? " (" + discountValue + "%)" : ""}</span><span>{"\u2212"}{formatPrice(discountAmount)}</span></div>}
                      <div style={{ height: 1, background: t.dividerAccent, margin: "10px 0" }} />
                      <div style={{ textAlign: "center", marginTop: 16, padding: "20px 0 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.textDim, marginBottom: 6 }}>Project Total</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: t.accent, lineHeight: 1 }}><AnimatedNumber value={total} /></div>
                      </div>
                      <button className="btn-primary" onClick={saveQuote} style={{ width: "100%", marginTop: 12 }}>{editingId ? "Update Quote" : "Save Quote"}</button>
                      <button className="btn-sm" onClick={copyEstimate} style={{ width: "100%", marginTop: 8 }}>{copied ? "\u2713 Copied!" : "Copy to clipboard"}</button>
                    </>
                  ) : (
                    <>
                      <div className="summary-row" style={{ color: t.textMuted }}><span>{effectivePages} page{effectivePages !== 1 ? "s" : ""}</span><span>{formatPrice(services.length * displayRate)}/pg</span></div>
                      {services.map((s) => (<div key={s} className="summary-row" style={{ color: t.textDim, fontSize: 13, paddingLeft: 12 }}><span>{s}</span><span>{formatPrice(effectivePages * displayRate)}</span></div>))}
                      <div className="summary-divider" />
                      <div className="summary-row"><span>Pages</span><span>{formatPrice(effectivePages * services.length * displayRate)}</span></div>
                      {addBlog && <div className="summary-row" style={{ color: t.textMuted }}><span>Blog</span><span>{formatPrice(700)}</span></div>}
                      {addShop && <div className="summary-row" style={{ color: t.textMuted }}><span>Shop</span><span>{formatPrice(700)}</span></div>}
                      {customPostTypes.map(function(cpt) { return <div key={cpt.id} className="summary-row" style={{ color: t.textMuted }}><span>{cpt.name || "Custom Post Type"}</span><span>{formatPrice(700)}</span></div>; })}
                      {plugins.map(function(plugin) { return plugin.cost > 0 ? <div key={plugin.id} className="summary-row" style={{ color: t.textMuted }}><span>{plugin.name || "Plugin/Service"}{plugin.frequency !== "one-time" ? " (" + (plugin.frequency === "monthly" ? "/mo" : "/yr") + ")" : ""}</span><span>{formatPrice(plugin.cost)}</span></div> : null; })}
                      <div className="summary-divider" />
                      {settings.showInternalCosts && (
                        <>
                          <div className="summary-row" style={{ fontWeight: 500 }}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                          {includePM && <div className="summary-row" style={{ color: t.textMuted }}><span>PM (20%)</span><span>{formatPrice(pmCost)}</span></div>}
                          {includeContingency && <div className="summary-row" style={{ color: t.textMuted }}><span>Contingency (20%)</span><span>{formatPrice(contingencyCost)}</span></div>}
                        </>
                      )}
                      {discountAmount > 0 && <div className="summary-row" style={{ color: t.green }}><span>Discount{discountType === "percent" ? " (" + discountValue + "%)" : ""}</span><span>{"\u2212"}{formatPrice(discountAmount)}</span></div>}
                      <div style={{ height: 1, background: t.dividerAccent, margin: "10px 0" }} />
                      {belowMinimum && <div className="summary-row" style={{ fontSize: 12, color: t.accentDim }}><span>Min. project cost</span><span>{formatPrice(MIN_PROJECT)}</span></div>}
                      <div style={{ textAlign: "center", marginTop: 16, padding: "20px 0 12px" }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: t.textDim, marginBottom: 6 }}>Project Total</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, color: t.accent, lineHeight: 1 }}><AnimatedNumber value={total} /></div>
                      </div>
                      <button className="btn-primary" onClick={saveQuote} style={{ width: "100%", marginTop: 12 }}>{editingId ? "Update Quote" : "Save Quote"}</button>
                      <button className="btn-sm" onClick={copyEstimate} style={{ width: "100%", marginTop: 8 }}>{copied ? "\u2713 Copied!" : "Copy to clipboard"}</button>
                      {(recurringCosts.monthly > 0 || recurringCosts.annual > 0) && (
                        <div style={{ marginTop: 20, padding: 16, background: t.accentBg, border: "1px solid " + t.accentBorder, borderRadius: 10 }}>
                          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: t.accentDim, marginBottom: 10 }}>Recurring Costs</div>
                          {recurringCosts.monthly > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.text, marginBottom: 6 }}><span>Monthly</span><span style={{ fontWeight: 600, color: t.accent }}>{formatPrice(recurringCosts.monthly)}/mo</span></div>}
                          {recurringCosts.annual > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: t.text }}><span>Annual</span><span style={{ fontWeight: 600, color: t.accent }}>{formatPrice(recurringCosts.annual)}/yr</span></div>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════ CRM ══════════ */}
        {view === "crm" && (
          <div className="fade-in">
            {/* Stats */}
            <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Quotes", value: quotes.length, color: t.text, isCurrency: false },
                { label: "Total Quoted", value: totalQuoted, color: t.accent, isCurrency: true },
                { label: "Accepted", value: totalAccepted, color: t.green, isCurrency: true },
              ].map(function(s) {
                return (
                  <div key={s.label} style={{ padding: "20px 24px", borderRadius: 12, background: t.surface, border: "1px solid " + t.border }}>
                    <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: t.textFaint, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.isCurrency ? formatPrice(s.value) : s.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
              {["All"].concat(STATUSES).map(function(s) { return <Chip key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{s}</Chip>; })}
              <button className="btn-primary" onClick={() => { resetCalculator(); setView("calculator"); }} style={{ marginLeft: "auto", padding: "10px 24px", fontSize: 13 }}>+ New Quote</button>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: t.textFaint }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>{"\u25C7"}</div>
                <div style={{ fontSize: 14 }}>{quotes.length === 0 ? "No quotes yet. Create your first one!" : "No quotes match this filter."}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {filtered.map(function(q) {
                  const qTotal = calcTotal(q, settings);
                  const isExp = expandedId === q.id;
                  return (
                    <div key={q.id} className="quote-card">
                      <div onClick={() => setExpandedId(isExp ? null : q.id)} className="quote-card-header" style={{ padding: "20px 24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{q.projectName || q.clientName || "Untitled"}</div>
                          <div style={{ fontSize: 12, color: t.textDim }}>{q.clientName && q.projectName ? q.clientName + " \u00b7 " : ""}{formatDate(q.createdAt)}{q.isLandingPage ? " \u00b7 Landing Page" : " \u00b7 " + q.pages + " pages"}</div>
                        </div>
                        <div className="quote-card-meta" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                          <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: STATUS_COLORS[q.status] + "18", color: STATUS_COLORS[q.status] }}>{q.status}</span>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: t.accent }}>{formatPrice(qTotal)}</div>
                          <span style={{ color: t.textFaint, fontSize: 18, transition: "transform 0.2s ease", transform: isExp ? "rotate(180deg)" : "rotate(0deg)" }}>{"\u25BE"}</span>
                        </div>
                      </div>
                      {isExp && (
                        <div style={{ padding: "0 24px 24px", borderTop: "1px solid " + t.divider }}>
                          <div className="quote-details" style={{ paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                            <div>
                              <div className="section-label">Status</div>
                              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                                {STATUSES.map(function(s) { return <Chip key={s} active={q.status === s} color={STATUS_COLORS[s]} onClick={() => updateStatus(q.id, s)}>{s}</Chip>; })}
                              </div>
                              <div className="section-label">Notes</div>
                              <textarea className="input-field" value={q.notes || ""} onChange={(e) => updateNotes(q.id, e.target.value)} placeholder="Add notes..." />
                            </div>
                            <div>
                              <div className="section-label">Actions</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <button className="btn-primary" onClick={() => exportPDF(q, settings)} style={{ padding: "12px 20px", fontSize: 13 }}>Export PDF</button>
                                <button className="btn-sm" onClick={() => copyQuote(q)}>{copiedQuoteId === q.id ? "\u2713 Copied!" : "Copy to Clipboard"}</button>
                                <button className="btn-sm" onClick={() => editQuote(q)}>Edit in Calculator</button>
                                <button className="btn-sm" onClick={() => { if (window.confirm("Delete this quote?")) deleteQuote(q.id); }} style={{ color: t.red, borderColor: t.red + "33" }}>Delete Quote</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ ANALYTICS ══════════ */}
        {view === "analytics" && (
          <div className="fade-in">
            {quotes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: t.textFaint }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: 14 }}>No data yet. Create some quotes to see analytics!</div>
              </div>
            ) : (() => {
              // Calculate analytics
              const totalQuotes = quotes.length;
              const sentQuotes = quotes.filter(q => q.status === "Sent").length;
              const acceptedQuotes = quotes.filter(q => q.status === "Accepted").length;
              const declinedQuotes = quotes.filter(q => q.status === "Declined").length;

              const totalQuoted = quotes.reduce((s, q) => s + calcTotal(q, settings), 0);
              const totalAccepted = quotes.filter(q => q.status === "Accepted").reduce((s, q) => s + calcTotal(q, settings), 0);
              const totalDeclined = quotes.filter(q => q.status === "Declined").reduce((s, q) => s + calcTotal(q, settings), 0);

              // Win rate: accepted / (sent + accepted + declined) - excludes drafts
              const sentOrCompleted = sentQuotes + acceptedQuotes + declinedQuotes;
              const winRate = sentOrCompleted > 0 ? Math.round((acceptedQuotes / sentOrCompleted) * 100) : 0;
              const avgQuoteValue = totalQuotes > 0 ? Math.round(totalQuoted / totalQuotes) : 0;
              const avgAcceptedValue = acceptedQuotes > 0 ? Math.round(totalAccepted / acceptedQuotes) : 0;

              // Service popularity
              const serviceStats = quotes.reduce((acc, q) => {
                if (q.isLandingPage) {
                  acc.landingPages = (acc.landingPages || 0) + 1;
                } else {
                  if (q.includeDesign) acc.design = (acc.design || 0) + 1;
                  if (q.includeDev) acc.dev = (acc.dev || 0) + 1;
                  if (q.includeCopy) acc.copy = (acc.copy || 0) + 1;
                }
                if (q.addBlog) acc.blog = (acc.blog || 0) + 1;
                if (q.addShop) acc.shop = (acc.shop || 0) + 1;
                return acc;
              }, {});

              const mostPopularService = Object.entries(serviceStats).sort((a, b) => b[1] - a[1])[0];

              // Monthly breakdown (last 6 months)
              const now = new Date();
              const monthlyData = [];
              for (let i = 5; i >= 0; i--) {
                const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthQuotes = quotes.filter(q => {
                  const qDate = new Date(q.createdAt);
                  return qDate.getMonth() === month.getMonth() && qDate.getFullYear() === month.getFullYear();
                });
                const monthAccepted = monthQuotes.filter(q => q.status === "Accepted");
                const acceptedCount = monthAccepted.length;
                const totalCount = monthQuotes.length;

                // Safety check: accepted should never exceed total
                if (acceptedCount > totalCount) {
                  console.warn("Data inconsistency: accepted (" + acceptedCount + ") > total (" + totalCount + ") for month", month);
                }

                monthlyData.push({
                  label: month.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
                  quotes: totalCount,
                  accepted: Math.min(acceptedCount, totalCount), // Cap at total
                  revenue: monthAccepted.reduce((s, q) => s + calcTotal(q, settings), 0),
                  winRate: totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0
                });
              }

              const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

              return (
                <>
                  {/* Key Metrics */}
                  <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
                    {[
                      { label: "Win Rate", value: winRate + "%", color: winRate >= 50 ? t.green : winRate >= 25 ? t.accent : t.red, sublabel: acceptedQuotes + " won of " + sentOrCompleted + " quotes" },
                      { label: "Avg Quote Value", value: formatPrice(avgQuoteValue), color: t.accent, sublabel: "Across " + totalQuotes + " quotes" },
                      { label: "Total Revenue", value: formatPrice(totalAccepted), color: t.green, sublabel: "From " + acceptedQuotes + " accepted" },
                    ].map(s => (
                      <div key={s.label} style={{ padding: "24px", borderRadius: 12, background: t.surface, border: "1px solid " + t.border }}>
                        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: t.textFaint, marginBottom: 8 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: t.textDim }}>{s.sublabel}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status Breakdown */}
                  <div style={{ background: t.surface, border: "1px solid " + t.border, borderRadius: 16, padding: 32, marginBottom: 24 }}>
                    <div className="section-label" style={{ marginBottom: 20 }}>Quote Status Distribution</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                      {[
                        { status: "Draft", count: quotes.filter(q => q.status === "Draft").length, color: STATUS_COLORS.Draft },
                        { status: "Sent", count: sentQuotes, color: STATUS_COLORS.Sent },
                        { status: "Accepted", count: acceptedQuotes, color: STATUS_COLORS.Accepted },
                        { status: "Declined", count: declinedQuotes, color: STATUS_COLORS.Declined },
                      ].map(s => (
                        <div key={s.status} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px", borderRadius: 10, background: s.color + "08", border: "1px solid " + s.color + "33" }}>
                          <div style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: "'Playfair Display', serif" }}>{s.count}</div>
                          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>{s.status}</div>
                          <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                            {totalQuotes > 0 ? Math.round((s.count / totalQuotes) * 100) : 0}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Revenue by Month */}
                  <div style={{ background: t.surface, border: "1px solid " + t.border, borderRadius: 16, padding: 32, marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                      <div className="section-label" style={{ marginBottom: 0 }}>Revenue Trend (Last 6 Months)</div>
                      <div style={{ display: "flex", gap: 20, fontSize: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(180deg, " + t.green + ", " + t.green + "dd)" }} />
                          <span style={{ color: t.textDim }}>Revenue</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: t.accentBg, border: "2px solid " + t.accent }} />
                          <span style={{ color: t.textDim }}>Quotes</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart area with grid */}
                    <div style={{ position: "relative", paddingTop: 40 }}>
                      {/* Horizontal grid lines */}
                      <div style={{ position: "absolute", top: 40, left: 0, right: 0, height: 240, display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} style={{ height: 1, background: t.divider, opacity: 0.5 }} />
                        ))}
                      </div>

                      {/* Bars */}
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 240, position: "relative" }}>
                        {monthlyData.map((m, i) => {
                          const heightPercent = maxMonthlyRevenue > 0 ? (m.revenue / maxMonthlyRevenue) * 100 : 0;
                          const hasData = m.revenue > 0 || m.quotes > 0;
                          return (
                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                              {/* Revenue value on top */}
                              <div style={{ fontSize: 13, color: t.green, fontWeight: 700, minHeight: 20, fontFamily: "'DM Sans', sans-serif" }}>
                                {m.revenue > 0 ? formatPrice(m.revenue) : ""}
                              </div>

                              {/* Bar */}
                              <div style={{ width: "100%", height: heightPercent + "%", minHeight: hasData ? 32 : 8, background: m.revenue > 0 ? "linear-gradient(180deg, " + t.green + ", " + t.green + "dd)" : t.divider, borderRadius: "6px 6px 0 0", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", boxShadow: m.revenue > 0 ? "0 -2px 12px " + t.green + "22" : "none" }}>
                                {/* Accepted count badge */}
                                {m.accepted > 0 && (
                                  <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: t.green, color: mode === "dark" ? "#0a0a0f" : "#ffffff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                                    {m.accepted} won
                                  </div>
                                )}
                              </div>

                              {/* Month label */}
                              <div style={{ fontSize: 12, color: t.text, fontWeight: 600, marginTop: 8 }}>{m.label}</div>

                              {/* Quote count */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.textMuted }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: m.quotes > 0 ? t.accent : t.border }} />
                                <span>{m.quotes} created</span>
                              </div>
                              {m.quotes > 0 && (
                                <div style={{ fontSize: 10, color: m.winRate >= 50 ? t.green : m.winRate >= 25 ? t.accent : t.textFaint, marginTop: -4, fontWeight: 600 }}>
                                  {m.winRate}% win rate
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Service Insights */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
                    {/* Popular Services */}
                    <div style={{ background: t.surface, border: "1px solid " + t.border, borderRadius: 16, padding: 28 }}>
                      <div className="section-label" style={{ marginBottom: 16 }}>Popular Services</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {Object.entries(serviceStats)
                          .sort((a, b) => b[1] - a[1])
                          .map(([service, count]) => {
                            const maxCount = Math.max(...Object.values(serviceStats));
                            const widthPercent = (count / maxCount) * 100;
                            const labels = { design: "Design", dev: "Development", copy: "Copywriting", blog: "Blog", shop: "Shop", landingPages: "Landing Pages" };
                            return (
                              <div key={service}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                                  <span style={{ color: t.text }}>{labels[service] || service}</span>
                                  <span style={{ color: t.accent, fontWeight: 600 }}>{count}</span>
                                </div>
                                <div style={{ height: 6, background: t.border, borderRadius: 99, overflow: "hidden" }}>
                                  <div style={{ width: widthPercent + "%", height: "100%", background: "linear-gradient(90deg, " + t.accent + ", " + t.accentDim + ")", transition: "width 0.3s ease" }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Value Insights */}
                    <div style={{ background: t.surface, border: "1px solid " + t.border, borderRadius: 16, padding: 28 }}>
                      <div className="section-label" style={{ marginBottom: 16 }}>Value Insights</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 4 }}>Average Quote</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: "'Playfair Display', serif" }}>{formatPrice(avgQuoteValue)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 4 }}>Average Accepted</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: t.green, fontFamily: "'Playfair Display', serif" }}>{formatPrice(avgAcceptedValue)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 4 }}>Lost Revenue</div>
                          <div style={{ fontSize: 24, fontWeight: 700, color: t.red, fontFamily: "'Playfair Display', serif" }}>{formatPrice(totalDeclined)}</div>
                          <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>From {declinedQuotes} declined quotes</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ══════════ SETTINGS ══════════ */}
        {view === "settings" && (
          <div className="fade-in">
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ background: t.surface, border: "1px solid " + t.border, borderRadius: 16, padding: 32 }}>
                <div style={{ marginBottom: 32 }}>
                  <div className="section-label">Default Rates</div>
                  <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20, lineHeight: 1.6 }}>
                    Configure your default pricing rates. These will be used for all new quotes. Existing quotes will continue to use their original rates.
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Per Page Rate */}
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>
                        Per Page Rate
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 14, pointerEvents: "none" }}>£</span>
                        <input
                          className="input-field"
                          type="number"
                          min={0}
                          value={settings.rate}
                          onChange={(e) => {
                            const newRate = Math.max(0, parseInt(e.target.value) || 0);
                            updateSettings({ rate: newRate });
                          }}
                          style={{ paddingLeft: 34 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
                        Cost per page for each service (design, dev, copywriting)
                      </div>
                    </div>

                    {/* Landing Page Price */}
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>
                        Landing Page Price
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 14, pointerEvents: "none" }}>£</span>
                        <input
                          className="input-field"
                          type="number"
                          min={0}
                          value={settings.landingPagePrice}
                          onChange={(e) => {
                            const newPrice = Math.max(0, parseInt(e.target.value) || 0);
                            updateSettings({ landingPagePrice: newPrice });
                          }}
                          style={{ paddingLeft: 34 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
                        Fixed price for landing page package
                      </div>
                    </div>

                    {/* Minimum Project Cost */}
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 8 }}>
                        Minimum Project Cost
                      </label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: t.textMuted, fontSize: 14, pointerEvents: "none" }}>£</span>
                        <input
                          className="input-field"
                          type="number"
                          min={0}
                          value={settings.minProject}
                          onChange={(e) => {
                            const newMin = Math.max(0, parseInt(e.target.value) || 0);
                            updateSettings({ minProject: newMin });
                          }}
                          style={{ paddingLeft: 34 }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
                        Minimum total for standard projects (not applied to landing pages)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Presentation Options */}
                <div style={{ marginBottom: 32, paddingTop: 32, borderTop: "1px solid " + t.divider }}>
                  <div className="section-label">Client Presentation</div>
                  <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20, lineHeight: 1.6 }}>
                    Control what clients see in quotes, PDFs, and exports.
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", borderRadius: 10, background: t.surfaceAlt, border: "1px solid " + t.border, cursor: "pointer" }} onClick={() => updateSettings({ showInternalCosts: !settings.showInternalCosts })}>
                    <div style={{ width: 40, height: 22, borderRadius: 99, background: settings.showInternalCosts ? t.accentBg : t.toggleBg, border: "1px solid " + (settings.showInternalCosts ? t.accent : t.borderLight), position: "relative", transition: "all 0.3s ease", flexShrink: 0, marginTop: 2 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 99, background: settings.showInternalCosts ? t.accent : t.toggleDot, position: "absolute", top: 2, left: settings.showInternalCosts ? 20 : 2, transition: "all 0.3s ease" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 4 }}>Show PM & Contingency as Line Items</div>
                      <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.5 }}>
                        When OFF (recommended): PM and contingency costs are included in the total but hidden from clients.
                        When ON: These costs appear as separate line items in quotes and PDFs.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Backup */}
                <div style={{ marginBottom: 32, paddingTop: 32, borderTop: "1px solid " + t.divider }}>
                  <div className="section-label">Data Backup</div>
                  <div style={{ fontSize: 13, color: t.textDim, marginBottom: 20, lineHeight: 1.6 }}>
                    Export all your quotes and settings to a file, or import from a backup. This protects your data if you clear your browser cache.
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const data = { quotes: quotes, settings: settings, exportDate: new Date().toISOString(), version: "1.0" };
                        const json = JSON.stringify(data, null, 2);
                        const blob = new Blob([json], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "pricing-studio-backup-" + new Date().toISOString().split("T")[0] + ".json";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{ padding: "12px 24px", fontSize: 13 }}
                    >
                      Export Data
                    </button>
                    <button
                      className="btn-sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "application/json";
                        input.onchange = function(e) {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = function(event) {
                            try {
                              const data = JSON.parse(event.target.result);
                              if (data.quotes) setQuotes(data.quotes);
                              if (data.settings) setSettings(data.settings);
                              alert("Data imported successfully! Loaded " + (data.quotes?.length || 0) + " quotes.");
                            } catch (err) {
                              alert("Failed to import data. Please check the file format.");
                            }
                          };
                          reader.readAsText(file);
                        };
                        input.click();
                      }}
                      style={{ padding: "12px 24px", fontSize: 13 }}
                    >
                      Import Data
                    </button>
                  </div>

                  <div style={{ fontSize: 12, color: t.textFaint, marginTop: 12, lineHeight: 1.5 }}>
                    💡 Tip: Export regularly to keep a backup of your quotes and settings. The exported file can be imported back at any time.
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid " + t.divider }}>
                    <button
                      className="btn-sm"
                      onClick={async () => {
                        if (!window.confirm("Migrate localStorage data to database? This is a one-time operation.")) return;

                        try {
                          const localQuotes = JSON.parse(localStorage.getItem('pricing-studio-quotes') || '[]');
                          const localSettings = JSON.parse(localStorage.getItem('pricing-studio-settings') || '{}');

                          const res = await fetch('/api/migrate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              quotes: localQuotes,
                              settings: localSettings,
                            }),
                          });

                          const result = await res.json();
                          alert(`Migration complete! Imported ${result.imported} quotes, skipped ${result.skipped} duplicates.`);

                          // Refresh data
                          window.location.reload();
                        } catch (err) {
                          alert('Migration failed: ' + err.message);
                        }
                      }}
                      style={{ color: t.green, borderColor: t.green + "33", marginBottom: 16 }}
                    >
                      Migrate to Database
                    </button>
                    <div style={{ fontSize: 11, color: t.textFaint, marginBottom: 16 }}>
                      One-time: Upload your localStorage data to the database
                    </div>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid " + t.divider }}>
                    <button
                      className="btn-sm"
                      onClick={() => {
                        if (!window.confirm("Add 20 test quotes with realistic data? This will help you test the Analytics dashboard.")) return;

                        const clients = ["Acme Corp", "TechStart Ltd", "Green Energy Co", "Urban Cafe", "FitLife Gym", "BookWorm Publishing", "StyleHub Fashion", "AutoCare Services", "HomeDesign Pro", "EcoFriendly Products"];
                        const projects = ["Corporate Website", "E-commerce Store", "Portfolio Site", "Landing Page Campaign", "Blog Platform", "Product Showcase", "Service Directory", "Booking System", "Marketing Site", "Company Rebrand"];
                        const statuses = ["Draft", "Sent", "Accepted", "Declined"];
                        const statusWeights = [0.15, 0.25, 0.45, 0.15]; // 45% accepted, realistic

                        const testQuotes = [];
                        const now = Date.now();

                        for (let i = 0; i < 20; i++) {
                          // Random date within last 6 months
                          const daysAgo = Math.floor(Math.random() * 180);
                          const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();

                          // Random status based on weights
                          const rand = Math.random();
                          let status = statuses[0];
                          let cumWeight = 0;
                          for (let j = 0; j < statuses.length; j++) {
                            cumWeight += statusWeights[j];
                            if (rand <= cumWeight) {
                              status = statuses[j];
                              break;
                            }
                          }

                          const isLandingPage = Math.random() < 0.2;
                          const pages = isLandingPage ? 1 : Math.floor(Math.random() * 15) + 3;
                          const includeDesign = !isLandingPage && Math.random() < 0.85;
                          const includeDev = !isLandingPage && Math.random() < 0.9;
                          const includeCopy = !isLandingPage && Math.random() < 0.3;
                          const addBlog = !isLandingPage && Math.random() < 0.4;
                          const addShop = !isLandingPage && Math.random() < 0.2;
                          const includePM = Math.random() < 0.8;
                          const includeContingency = Math.random() < 0.7;

                          const hasDiscount = Math.random() < 0.25;
                          const discountType = hasDiscount ? (Math.random() < 0.6 ? "percent" : "fixed") : "percent";
                          const discountValue = hasDiscount ? (discountType === "percent" ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 500) + 100) : 0;

                          const quote = {
                            id: uid(),
                            clientName: clients[Math.floor(Math.random() * clients.length)],
                            projectName: projects[Math.floor(Math.random() * projects.length)],
                            pages: pages,
                            includeDesign: includeDesign,
                            includeDev: includeDev,
                            includeCopy: includeCopy,
                            isLandingPage: isLandingPage,
                            addBlog: addBlog,
                            addShop: addShop,
                            customPostTypes: [],
                            plugins: [],
                            includePM: includePM,
                            includeContingency: includeContingency,
                            discountType: discountType,
                            discountValue: discountValue,
                            status: status,
                            notes: status === "Accepted" ? "Client approved! Starting next week." : status === "Declined" ? "Budget constraints." : "",
                            createdAt: createdAt
                          };

                          quote.total = calcTotal(quote, settings);
                          testQuotes.push(quote);
                        }

                        setQuotes(testQuotes.concat(quotes));
                        alert("Added 20 test quotes! Check the Analytics tab to see them in action.");
                        setView("analytics");
                      }}
                      style={{ color: t.accent, borderColor: t.accentBorder }}
                    >
                      + Add Test Data
                    </button>
                    <div style={{ fontSize: 11, color: t.textFaint, marginTop: 8 }}>
                      Generates 20 realistic quotes with varied dates, statuses, and configurations
                    </div>
                  </div>
                </div>

                {/* Reset to defaults */}
                <div style={{ borderTop: "1px solid " + t.divider, paddingTop: 24 }}>
                  <button
                    className="btn-sm"
                    onClick={() => {
                      if (window.confirm("Reset all settings to default values?")) {
                        updateSettings({ rate: DEFAULT_RATE, minProject: DEFAULT_MIN_PROJECT, landingPagePrice: DEFAULT_LANDING_PAGE_PRICE, showInternalCosts: false });
                      }
                    }}
                    style={{ color: t.textDim, borderColor: t.border }}
                  >
                    Reset to Defaults
                  </button>
                  <div style={{ fontSize: 12, color: t.textFaint, marginTop: 12 }}>
                    Default: {formatPrice(DEFAULT_RATE)}/page · {formatPrice(DEFAULT_LANDING_PAGE_PRICE)} landing page · {formatPrice(DEFAULT_MIN_PROJECT)} minimum
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: 32, padding: 20, background: t.accentBg, border: "1px solid " + t.accentBorder, borderRadius: 12 }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: t.accentDim, marginBottom: 12 }}>Preview</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: t.text }}>
                      <span>5-page website (Design + Dev)</span>
                      <span style={{ fontWeight: 600, color: t.accent }}>{formatPrice(5 * 2 * settings.rate)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: t.text }}>
                      <span>Landing page offer</span>
                      <span style={{ fontWeight: 600, color: t.accent }}>{formatPrice(settings.landingPagePrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}