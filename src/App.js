import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// DATABASE LAYER (IndexedDB via localStorage fallback)
// ============================================================
const DB = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getAll: (key) => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  push: (key, item) => {
    const arr = DB.getAll(key);
    arr.push(item);
    DB.set(key, arr);
    return item;
  },
  update: (key, id, updates) => {
    const arr = DB.getAll(key);
    const idx = arr.findIndex(i => i.id === id);
    if (idx !== -1) { arr[idx] = { ...arr[idx], ...updates }; DB.set(key, arr); }
  },
  remove: (key, id) => {
    const arr = DB.getAll(key).filter(i => i.id !== id);
    DB.set(key, arr);
  },
  nextId: (key) => {
    const arr = DB.getAll(key);
    return arr.length > 0 ? Math.max(...arr.map(i => i.id || 0)) + 1 : 1;
  }
};

// ============================================================
// SEED DATA
// ============================================================
const seedData = () => {
  if (!DB.get("seeded")) {
    DB.set("settings", {
      businessName: "AK Enterprises",
      ownerName: "Anil Kumar",
      mobile: "9876543210",
      email: "ak@akenterprises.com",
      gst: "27AABCU9603R1ZX",
      pan: "AABCU9603R",
      address: "123, Main Market, Pune, Maharashtra - 411001",
      bankName: "State Bank of India",
      accountNo: "1234567890",
      ifsc: "SBIN0001234",
      upi: "ak@upi",
      invoicePrefix: "AKE-2026-",
      startingInvoice: 1001,
      currentInvoice: 1001,
      defaultGst: 18,
      enableGst: true,
      enableDiscount: true,
      enableShipping: true,
      roundOff: true,
      defaultPaymentMode: "Cash",
      terms: "1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. E. & O.E.",
      notes: "Thank you for your business!"
    });
    const products = [
      { id: 1, name: "HP Laptop 15s", code: "HP-15S-001", category: "Electronics", hsn: "8471", purchasePrice: 35000, sellingPrice: 42000, gst: 18, stock: 15, minStock: 3, unit: "Nos", supplier: "HP Distributors" },
      { id: 2, name: "Dell Mouse Wireless", code: "DELL-MS-001", category: "Accessories", hsn: "8471", purchasePrice: 450, sellingPrice: 750, gst: 18, stock: 45, minStock: 10, unit: "Nos", supplier: "Dell India" },
      { id: 3, name: "USB-C Hub 7-in-1", code: "USB-HUB-001", category: "Accessories", hsn: "8536", purchasePrice: 800, sellingPrice: 1499, gst: 18, stock: 30, minStock: 5, unit: "Nos", supplier: "AmazonBasics" },
      { id: 4, name: "A4 Paper Ream 500 Sheets", code: "A4-PAPER-001", category: "Stationery", hsn: "4802", purchasePrice: 180, sellingPrice: 280, gst: 12, stock: 200, minStock: 50, unit: "Box", supplier: "Paper World" },
      { id: 5, name: "Printer Ink Cartridge Black", code: "INK-BLK-001", category: "Stationery", hsn: "3215", purchasePrice: 320, sellingPrice: 550, gst: 18, stock: 2, minStock: 5, unit: "Nos", supplier: "HP Distributors" },
      { id: 6, name: "Hdmi Cable 2m", code: "HDMI-2M-001", category: "Cables", hsn: "8544", purchasePrice: 120, sellingPrice: 299, gst: 18, stock: 60, minStock: 10, unit: "Nos", supplier: "Generic" },
    ];
    DB.set("products", products);
    const customers = [
      { id: 1, name: "Raj Electronics", mobile: "9011223344", address: "Pune", gst: "27RAJEL1234A1Z5", type: "Wholesale" },
      { id: 2, name: "Suresh Kumar", mobile: "9822334455", address: "Mumbai", gst: "", type: "Retail" },
      { id: 3, name: "City Computers", mobile: "9733445566", address: "Nashik", gst: "27CITYC5678B1Z3", type: "Wholesale" },
    ];
    DB.set("customers", customers);
    const invoices = [
      {
        id: 1, invoiceNo: "AKE-2026-1001", date: "2026-02-10", customerId: 1, customerName: "Raj Electronics",
        customerMobile: "9011223344", customerAddress: "Pune", customerGst: "27RAJEL1234A1Z5",
        items: [{ productId: 1, name: "HP Laptop 15s", code: "HP-15S-001", qty: 2, rate: 42000, discount: 0, gst: 18, amount: 84000 }],
        subtotal: 84000, discount: 0, gstAmount: 15120, cgst: 7560, sgst: 7560, shipping: 0, roundOff: 0,
        grandTotal: 99120, paid: 99120, balance: 0, paymentMode: "Bank Transfer", status: "Paid"
      },
      {
        id: 2, invoiceNo: "AKE-2026-1002", date: "2026-02-15", customerId: 2, customerName: "Suresh Kumar",
        customerMobile: "9822334455", customerAddress: "Mumbai", customerGst: "",
        items: [
          { productId: 2, name: "Dell Mouse Wireless", code: "DELL-MS-001", qty: 3, rate: 750, discount: 0, gst: 18, amount: 2250 },
          { productId: 3, name: "USB-C Hub 7-in-1", code: "USB-HUB-001", qty: 1, rate: 1499, discount: 0, gst: 18, amount: 1499 },
        ],
        subtotal: 3749, discount: 0, gstAmount: 674.82, cgst: 337.41, sgst: 337.41, shipping: 50, roundOff: 0.18,
        grandTotal: 4474, paid: 2000, balance: 2474, paymentMode: "Cash", status: "Partial"
      },
    ];
    DB.set("invoices", invoices);
    DB.set("seeded", true);
  }
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const fmt = (n) => "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtNum = (n) => (Number(n) || 0).toFixed(2);
const today = () => new Date().toISOString().split("T")[0];
const uid = () => Date.now() + Math.random().toString(36).slice(2);

// ============================================================
// COLORS & THEME
// ============================================================
const theme = {
  bg: "#0F1117",
  surface: "#1A1D27",
  surface2: "#22263A",
  border: "#2E3250",
  accent: "#F5A623",
  accentLight: "#FFD080",
  accentDim: "rgba(245,166,35,0.12)",
  text: "#E8EAF6",
  textMuted: "#7B82A8",
  success: "#4CAF82",
  danger: "#F44560",
  info: "#4A90E2",
  warning: "#FF9800",
};

// ============================================================
// GLOBAL STYLES
// ============================================================
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; background: ${theme.bg}; color: ${theme.text}; font-family: 'DM Sans', sans-serif; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: ${theme.surface}; }
    ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${theme.accent}; }
    input, select, textarea { outline: none; font-family: 'DM Sans', sans-serif; }
    button { cursor: pointer; font-family: 'Syne', sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    @keyframes fadeIn { from { opacity:0; transform: translateY(12px);} to {opacity:1; transform: translateY(0);}}
    @keyframes slideIn { from { transform: translateX(-20px); opacity:0;} to { transform: translateX(0); opacity:1;}}
    @keyframes pulse { 0%,100% {opacity:1;} 50% {opacity:.5;}}
    .fade-in { animation: fadeIn 0.3s ease forwards; }
    .card { background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 12px; }
    .btn-primary { background: ${theme.accent}; color: #0F1117; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 700; font-size: 14px; transition: all 0.2s; }
    .btn-primary:hover { background: ${theme.accentLight}; transform: translateY(-1px); }
    .btn-secondary { background: transparent; color: ${theme.text}; border: 1px solid ${theme.border}; border-radius: 8px; padding: 9px 20px; font-weight: 600; font-size: 14px; transition: all 0.2s; }
    .btn-secondary:hover { border-color: ${theme.accent}; color: ${theme.accent}; }
    .btn-danger { background: rgba(244,69,96,0.15); color: ${theme.danger}; border: 1px solid rgba(244,69,96,0.3); border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; transition: all 0.2s;}
    .btn-danger:hover { background: rgba(244,69,96,0.25); }
    .btn-sm { padding: 6px 14px; font-size: 12px; }
    .input { background: ${theme.surface2}; border: 1px solid ${theme.border}; border-radius: 8px; padding: 10px 14px; color: ${theme.text}; font-size: 14px; width: 100%; transition: border-color 0.2s; }
    .input:focus { border-color: ${theme.accent}; }
    .input::placeholder { color: ${theme.textMuted}; }
    .label { font-size: 12px; color: ${theme.textMuted}; font-weight: 500; margin-bottom: 5px; display: block; letter-spacing: 0.03em; text-transform: uppercase; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: 'Syne', sans-serif; }
    .badge-success { background: rgba(76,175,130,0.15); color: ${theme.success}; }
    .badge-danger { background: rgba(244,69,96,0.15); color: ${theme.danger}; }
    .badge-warning { background: rgba(255,152,0,0.15); color: ${theme.warning}; }
    .badge-info { background: rgba(74,144,226,0.15); color: ${theme.info}; }
    tr:hover { background: rgba(245,166,35,0.04) !important; }
    .modal-overlay { position:fixed; inset:0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 1000; display:flex; align-items:center; justify-content:center; padding: 20px; }
    .modal { background: ${theme.surface}; border: 1px solid ${theme.border}; border-radius: 16px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; animation: fadeIn 0.25s ease; }
    .sidebar-item { display:flex; align-items:center; gap:12px; padding:11px 16px; border-radius:10px; cursor:pointer; transition: all 0.15s; font-weight: 500; font-size: 14px; color: ${theme.textMuted}; }
    .sidebar-item:hover { background: ${theme.accentDim}; color: ${theme.accent}; }
    .sidebar-item.active { background: ${theme.accentDim}; color: ${theme.accent}; border-left: 3px solid ${theme.accent}; }
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; color: black !important; }
    }
  `}</style>
);

// ============================================================
// ICON COMPONENTS
// ============================================================
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    invoice: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
    product: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    customer: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    report: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 17.66l-1.41 1.41M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2"/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>,
    print: <><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    close: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    warning: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    rupee: <><line x1="6" y1="3" x2="19" y2="3"/><line x1="6" y1="8" x2="19" y2="8"/><line x1="6" y1="13" x2="12" y2="13"/><path d="M6 8c0 4 3 7 7 7"/><polyline points="6 19 12 13"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    check: <><polyline points="20 6 9 17 4 12"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    chart: <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || null}
    </svg>
  );
};

// ============================================================
// REUSABLE COMPONENTS
// ============================================================
const Modal = ({ title, onClose, children, width = "700px" }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={{ maxWidth: width }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${theme.border}` }}>
        <h3 style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18 }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: theme.textMuted, padding: 4 }}><Icon name="close" /></button>
      </div>
      <div style={{ padding: "24px" }}>{children}</div>
    </div>
  </div>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label className="label">{label}</label>
    {children}
  </div>
);

const StatCard = ({ label, value, icon, color = theme.accent, sub }) => (
  <div className="card fade-in" style={{ padding: "20px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", right: 16, top: 16, width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Icon name={icon} color={color} />
    </div>
    <div style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 28, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6 }}>{sub}</div>}
  </div>
);

const Table = ({ headers, children, empty = "No records found" }) => (
  <div style={{ overflowX: "auto" }}>
    <table>
      <thead>
        <tr style={{ background: theme.surface2 }}>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", fontFamily: "Syne" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {children}
      </tbody>
    </table>
    {!children || (Array.isArray(children) && children.length === 0) ? (
      <div style={{ textAlign: "center", padding: "40px 20px", color: theme.textMuted }}>{empty}</div>
    ) : null}
  </div>
);

const Td = ({ children, mono }) => (
  <td style={{ padding: "13px 16px", borderBottom: `1px solid ${theme.border}`, fontSize: 14, fontFamily: mono ? "DM Mono" : "DM Sans", whiteSpace: "nowrap" }}>{children}</td>
);

// ============================================================
// MINI BAR CHART
// ============================================================
const MiniBarChart = ({ data, label, color = theme.accent }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: `${(d.value / max) * 70}px`, background: `linear-gradient(to top, ${color}, ${color}88)`, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.5s ease" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, color: theme.textMuted }}>{d.label}</div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// SIDEBAR
// ============================================================
const Sidebar = ({ page, setPage, sidebarOpen, setSidebarOpen }) => {
  const items = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "invoice", icon: "invoice", label: "New Invoice" },
    { id: "invoices", icon: "report", label: "All Invoices" },
    { id: "products", icon: "product", label: "Products" },
    { id: "customers", icon: "customer", label: "Customers" },
    { id: "reports", icon: "chart", label: "Reports" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];

  return (
    <>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.5)" }} />}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 220,
        background: theme.surface, borderRight: `1px solid ${theme.border}`,
        zIndex: 99, display: "flex", flexDirection: "column",
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: theme.accent, letterSpacing: "-0.02em" }}>AK</div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 13, color: theme.text }}>Enterprises</div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>Billing Software v1.0</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map(item => (
            <div key={item.id} className={`sidebar-item ${page === item.id ? "active" : ""}`}
              onClick={() => { setPage(item.id); setSidebarOpen(false); }}>
              <Icon name={item.icon} size={17} />
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${theme.border}`, fontSize: 11, color: theme.textMuted }}>
          © 2026 AK Enterprises
        </div>
      </div>
    </>
  );
};

// ============================================================
// TOPBAR
// ============================================================
const TopBar = ({ page, setSidebarOpen, setPage }) => {
  const titles = { dashboard: "Dashboard", invoice: "New Invoice", invoices: "All Invoices", products: "Products & Inventory", customers: "Customers", reports: "Reports", settings: "Settings" };
  return (
    <div style={{ height: 60, background: theme.surface, borderBottom: `1px solid ${theme.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => setSidebarOpen(p => !p)} style={{ background: "none", border: "none", color: theme.textMuted, padding: 4 }}><Icon name="menu" /></button>
        <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18 }}>{titles[page] || page}</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: "DM Mono" }}>{today()}</span>
        <button className="btn-primary btn-sm" onClick={() => setPage("invoice")}><Icon name="plus" size={14} /> New Bill</button>
      </div>
    </div>
  );
};

// ============================================================
// DASHBOARD PAGE
// ============================================================
const Dashboard = ({ setPage }) => {
  const invoices = DB.getAll("invoices");
  const products = DB.getAll("products");
  const customers = DB.getAll("customers");
  const todayStr = today();

  const todaySales = invoices.filter(i => i.date === todayStr).reduce((s, i) => s + i.grandTotal, 0);
  const monthSales = invoices.filter(i => i.date?.startsWith("2026-02")).reduce((s, i) => s + i.grandTotal, 0);
  const totalProfit = invoices.reduce((s, inv) => {
    const profit = inv.items.reduce((p, it) => {
      const prod = products.find(pr => pr.id === it.productId);
      return p + (it.qty * ((it.rate / 1.18) - (prod?.purchasePrice || 0)));
    }, 0);
    return s + profit;
  }, 0);
  const pending = invoices.filter(i => i.balance > 0).reduce((s, i) => s + i.balance, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);

  const monthlyData = ["Oct", "Nov", "Dec", "Jan", "Feb"].map((m, i) => ({
    label: m, value: [45000, 62000, 81000, 73000, monthSales][i]
  }));
  const topProducts = products.sort((a, b) => (b.sellingPrice - b.purchasePrice) - (a.sellingPrice - a.purchasePrice)).slice(0, 5);

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Today's Sales" value={fmt(todaySales)} icon="rupee" color={theme.accent} />
        <StatCard label="Monthly Sales" value={fmt(monthSales)} icon="chart" color={theme.info} />
        <StatCard label="Total Profit" value={fmt(totalProfit)} icon="rupee" color={theme.success} />
        <StatCard label="Pending Dues" value={fmt(pending)} icon="warning" color={theme.danger} />
        <StatCard label="Total Products" value={products.length} icon="product" color={theme.accent} />
        <StatCard label="Customers" value={customers.length} icon="customer" color={theme.info} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Monthly Sales Trend</div>
          <MiniBarChart data={monthlyData} color={theme.accent} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Top Products (by Margin)</div>
          {topProducts.map((p, i) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < topProducts.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{p.category}</div>
              </div>
              <span style={{ color: theme.success, fontFamily: "DM Mono", fontSize: 13 }}>+{fmt(p.sellingPrice - p.purchasePrice)}</span>
            </div>
          ))}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card" style={{ padding: 20, borderColor: `${theme.danger}44` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, color: theme.danger }}>
            <Icon name="warning" color={theme.danger} />
            <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15 }}>Low Stock Alerts ({lowStock.length})</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {lowStock.map(p => (
              <div key={p.id} style={{ background: "rgba(244,69,96,0.08)", border: `1px solid rgba(244,69,96,0.2)`, borderRadius: 8, padding: "8px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: theme.danger }}>Stock: {p.stock} {p.unit} (Min: {p.minStock})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15 }}>Recent Invoices</span>
          <button className="btn-secondary btn-sm" onClick={() => setPage("invoices")}>View All</button>
        </div>
        <Table headers={["Invoice #", "Customer", "Date", "Amount", "Status"]}>
          {invoices.slice(-5).reverse().map(inv => (
            <tr key={inv.id}>
              <Td mono>{inv.invoiceNo}</Td>
              <Td>{inv.customerName}</Td>
              <Td mono>{inv.date}</Td>
              <Td mono>{fmt(inv.grandTotal)}</Td>
              <Td>
                <span className={`badge badge-${inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "danger"}`}>
                  {inv.status}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
};

// ============================================================
// PRODUCTS PAGE
// ============================================================
const Products = () => {
  const [products, setProducts] = useState(DB.getAll("products"));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // null | "add" | {product}
  const [form, setForm] = useState({});

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ name: "", code: "", category: "", hsn: "", purchasePrice: "", sellingPrice: "", gst: 18, stock: 0, minStock: 5, unit: "Nos", supplier: "" });
    setModal("add");
  };
  const openEdit = (p) => { setForm({ ...p }); setModal("edit"); };

  const handleSave = () => {
    if (!form.name || !form.code) return alert("Name and Code are required");
    if (modal === "add") {
      const prod = { ...form, id: DB.nextId("products"), purchasePrice: +form.purchasePrice, sellingPrice: +form.sellingPrice, gst: +form.gst, stock: +form.stock, minStock: +form.minStock };
      DB.push("products", prod);
      setProducts(DB.getAll("products"));
    } else {
      DB.update("products", form.id, { ...form, purchasePrice: +form.purchasePrice, sellingPrice: +form.sellingPrice, gst: +form.gst, stock: +form.stock, minStock: +form.minStock });
      setProducts(DB.getAll("products"));
    }
    setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this product?")) return;
    DB.remove("products", id);
    setProducts(DB.getAll("products"));
  };

  const F = ({ label, field, type = "text", options }) => (
    <FormField label={label}>
      {options ? (
        <select className="input" value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input className="input" type={type} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
      )}
    </FormField>
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}><Icon name="search" size={15} /></span>
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search products by name, code, category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}><Icon name="plus" size={15} /> Add Product</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <Table headers={["Product", "Code", "Category", "Purchase ₹", "Selling ₹", "GST", "Stock", "Status", "Actions"]}>
          {filtered.map(p => (
            <tr key={p.id}>
              <Td>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{p.supplier}</div>
              </Td>
              <Td mono>{p.code}</Td>
              <Td>{p.category}</Td>
              <Td mono>{fmt(p.purchasePrice)}</Td>
              <Td mono>{fmt(p.sellingPrice)}</Td>
              <Td mono>{p.gst}%</Td>
              <Td>
                <span style={{ fontFamily: "DM Mono", fontSize: 13, color: p.stock <= p.minStock ? theme.danger : theme.success, fontWeight: 600 }}>
                  {p.stock} {p.unit}
                </span>
              </Td>
              <Td>
                <span className={`badge ${p.stock <= p.minStock ? "badge-danger" : "badge-success"}`}>
                  {p.stock <= p.minStock ? "Low Stock" : "In Stock"}
                </span>
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-secondary btn-sm" onClick={() => openEdit(p)}><Icon name="edit" size={13} /></button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(p.id)}><Icon name="trash" size={13} /></button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      {modal && (
        <Modal title={modal === "add" ? "Add New Product" : "Edit Product"} onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <F label="Product Name *" field="name" />
            <F label="Product Code / SKU *" field="code" />
            <F label="Category" field="category" />
            <F label="HSN Code" field="hsn" />
            <F label="Purchase Price (₹)" field="purchasePrice" type="number" />
            <F label="Selling Price (₹)" field="sellingPrice" type="number" />
            <F label="GST %" field="gst" options={["0", "5", "12", "18", "28"]} />
            <F label="Unit" field="unit" options={["Nos", "Kg", "Litre", "Box", "Meter", "Pcs", "Set"]} />
            <F label="Current Stock" field="stock" type="number" />
            <F label="Minimum Stock Alert" field="minStock" type="number" />
            <div style={{ gridColumn: "1/-1" }}><F label="Supplier Name" field="supplier" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>{modal === "add" ? "Add Product" : "Save Changes"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================
// CUSTOMERS PAGE
// ============================================================
const Customers = () => {
  const [customers, setCustomers] = useState(DB.getAll("customers"));
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.includes(search)
  );

  const openAdd = () => { setForm({ name: "", mobile: "", address: "", gst: "", type: "Retail" }); setModal("add"); };
  const openEdit = (c) => { setForm({ ...c }); setModal("edit"); };

  const handleSave = () => {
    if (!form.name || !form.mobile) return alert("Name and Mobile required");
    if (modal === "add") {
      DB.push("customers", { ...form, id: DB.nextId("customers") });
    } else {
      DB.update("customers", form.id, form);
    }
    setCustomers(DB.getAll("customers"));
    setModal(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}><Icon name="search" size={15} /></span>
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}><Icon name="plus" size={15} /> Add Customer</button>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <Table headers={["Customer", "Mobile", "Type", "GST Number", "Actions"]}>
          {filtered.map(c => (
            <tr key={c.id}>
              <Td><div style={{ fontWeight: 600 }}>{c.name}</div><div style={{ fontSize: 11, color: theme.textMuted }}>{c.address}</div></Td>
              <Td mono>{c.mobile}</Td>
              <Td><span className={`badge ${c.type === "Wholesale" ? "badge-info" : "badge-success"}`}>{c.type}</span></Td>
              <Td mono>{c.gst || "—"}</Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-secondary btn-sm" onClick={() => openEdit(c)}><Icon name="edit" size={13} /></button>
                  <button className="btn-danger btn-sm" onClick={() => { if (confirm("Delete?")) { DB.remove("customers", c.id); setCustomers(DB.getAll("customers")); } }}><Icon name="trash" size={13} /></button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>
      {modal && (
        <Modal title={modal === "add" ? "Add Customer" : "Edit Customer"} onClose={() => setModal(null)} width="500px">
          {[["Customer Name *", "name"], ["Mobile Number *", "mobile"], ["Address", "address"], ["GST Number", "gst"]].map(([label, field]) => (
            <FormField key={field} label={label}>
              <input className="input" value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
            </FormField>
          ))}
          <FormField label="Customer Type">
            <select className="input" value={form.type || "Retail"} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option>Retail</option><option>Wholesale</option>
            </select>
          </FormField>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ============================================================
// INVOICE CREATOR
// ============================================================
const InvoiceCreator = ({ setPage }) => {
  const settings = DB.get("settings") || {};
  const allProducts = DB.getAll("products");
  const allCustomers = DB.getAll("customers");

  const [customer, setCustomer] = useState({ name: "", mobile: "", address: "", gst: "", type: "Retail" });
  const [items, setItems] = useState([]);
  const [searchProd, setSearchProd] = useState("");
  const [prodResults, setProdResults] = useState([]);
  const [shipping, setShipping] = useState(0);
  const [paid, setPaid] = useState(0);
  const [payMode, setPayMode] = useState(settings.defaultPaymentMode || "Cash");
  const [custSearch, setCustSearch] = useState("");
  const [custResults, setCustResults] = useState([]);
  const [saved, setSaved] = useState(null);

  const searchProducts = (q) => {
    setSearchProd(q);
    if (q.length < 1) { setProdResults([]); return; }
    setProdResults(allProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || p.code.toLowerCase().includes(q.toLowerCase())).slice(0, 6));
  };

  const searchCustomers = (q) => {
    setCustSearch(q);
    setCustomer(c => ({ ...c, name: q }));
    if (q.length < 1) { setCustResults([]); return; }
    setCustResults(allCustomers.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.mobile.includes(q)).slice(0, 5));
  };

  const addItem = (prod) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === prod.id);
      if (existing) {
        return prev.map(i => i.productId === prod.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: uid(), productId: prod.id, name: prod.name, code: prod.code, qty: 1, rate: prod.sellingPrice, discount: 0, gst: prod.gst, stock: prod.stock }];
    });
    setSearchProd(""); setProdResults([]);
  };

  const updateItem = (id, field, val) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: Number(val) } : i));
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const calcItem = (item) => {
    const base = item.qty * item.rate;
    const disc = item.discount ? (base * item.discount / 100) : 0;
    return base - disc;
  };

  const subtotal = items.reduce((s, i) => s + calcItem(i), 0);
  const gstAmount = items.reduce((s, i) => s + (calcItem(i) * i.gst / 100), 0);
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const raw = subtotal + gstAmount + Number(shipping);
  const roundOff = settings.roundOff ? Math.round(raw) - raw : 0;
  const grandTotal = raw + roundOff;
  const balance = grandTotal - Number(paid);

  const getStatus = () => {
    if (balance <= 0) return "Paid";
    if (Number(paid) > 0) return "Partial";
    return "Unpaid";
  };

  const handleSave = () => {
    if (!customer.name) return alert("Please enter customer name");
    if (items.length === 0) return alert("Please add at least one item");
    const invNo = `${settings.invoicePrefix || "INV-"}${settings.currentInvoice || 1001}`;
    const invoice = {
      id: DB.nextId("invoices"),
      invoiceNo: invNo,
      date: today(),
      customerId: null,
      customerName: customer.name,
      customerMobile: customer.mobile,
      customerAddress: customer.address,
      customerGst: customer.gst,
      items,
      subtotal,
      gstAmount,
      cgst,
      sgst,
      shipping: Number(shipping),
      roundOff,
      grandTotal,
      paid: Number(paid),
      balance,
      paymentMode: payMode,
      status: getStatus()
    };
    DB.push("invoices", invoice);
    // Reduce stock
    items.forEach(item => {
      const prod = allProducts.find(p => p.id === item.productId);
      if (prod) DB.update("products", item.productId, { stock: Math.max(0, prod.stock - item.qty) });
    });
    // Increment invoice number
    const s = DB.get("settings");
    if (s) DB.set("settings", { ...s, currentInvoice: (s.currentInvoice || 1001) + 1 });
    setSaved(invoice);
  };

  if (saved) return <InvoicePrint invoice={saved} settings={settings} onBack={() => { setSaved(null); setPage("invoices"); }} />;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 14, fontSize: 15, color: theme.accent }}>Customer Details</div>
          <div style={{ position: "relative" }}>
            <FormField label="Customer Name *">
              <input className="input" placeholder="Type customer name..." value={custSearch || customer.name}
                onChange={e => searchCustomers(e.target.value)} />
              {custResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 8, zIndex: 10, overflow: "hidden" }}>
                  {custResults.map(c => (
                    <div key={c.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${theme.border}` }}
                      onClick={() => { setCustomer(c); setCustSearch(""); setCustResults([]); }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: theme.textMuted }}>{c.mobile} · {c.type}</div>
                    </div>
                  ))}
                </div>
              )}
            </FormField>
          </div>
          <FormField label="Mobile">
            <input className="input" value={customer.mobile || ""} onChange={e => setCustomer(c => ({ ...c, mobile: e.target.value }))} />
          </FormField>
          <FormField label="Address">
            <input className="input" value={customer.address || ""} onChange={e => setCustomer(c => ({ ...c, address: e.target.value }))} />
          </FormField>
          <FormField label="GST Number (optional)">
            <input className="input" value={customer.gst || ""} onChange={e => setCustomer(c => ({ ...c, gst: e.target.value }))} />
          </FormField>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 14, fontSize: 15, color: theme.accent }}>Payment Details</div>
          <FormField label="Payment Mode">
            <select className="input" value={payMode} onChange={e => setPayMode(e.target.value)}>
              {["Cash", "UPI", "Card", "Bank Transfer", "Credit"].map(m => <option key={m}>{m}</option>)}
            </select>
          </FormField>
          <FormField label="Shipping Charges (₹)">
            <input className="input" type="number" value={shipping} onChange={e => setShipping(e.target.value)} />
          </FormField>
          <FormField label="Paid Amount (₹)">
            <input className="input" type="number" value={paid} onChange={e => setPaid(e.target.value)} placeholder="0" />
          </FormField>
          <div style={{ marginTop: 8, padding: "12px 14px", background: theme.surface2, borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: theme.textMuted, fontSize: 13 }}>Grand Total</span>
              <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: theme.accent }}>{fmt(grandTotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: theme.textMuted, fontSize: 13 }}>Balance Due</span>
              <span style={{ fontFamily: "DM Mono", fontWeight: 700, color: balance > 0 ? theme.danger : theme.success }}>{fmt(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontFamily: "Syne", fontWeight: 700, marginBottom: 14, fontSize: 15, color: theme.accent }}>Add Products</div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}><Icon name="search" size={15} /></span>
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search product by name or code..." value={searchProd} onChange={e => searchProducts(e.target.value)} />
          {prodResults.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 8, zIndex: 10, overflow: "hidden" }}>
              {prodResults.map(p => (
                <div key={p.id} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${theme.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => addItem(p)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>{p.code} · Stock: {p.stock} {p.unit}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "DM Mono", fontWeight: 700 }}>{fmt(p.sellingPrice)}</div>
                    <div style={{ fontSize: 11, color: theme.textMuted }}>GST: {p.gst}%</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
          <Table headers={["#", "Product", "Qty", "Rate (₹)", "Disc %", "GST %", "Amount", ""]}>
            {items.map((item, idx) => (
              <tr key={item.id}>
                <Td><span style={{ color: theme.textMuted }}>{idx + 1}</span></Td>
                <Td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{item.code}</div>
                </Td>
                <Td>
                  <input type="number" style={{ width: 70, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 13, fontFamily: "DM Mono" }}
                    value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} min={1} />
                </Td>
                <Td>
                  <input type="number" style={{ width: 100, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 13, fontFamily: "DM Mono" }}
                    value={item.rate} onChange={e => updateItem(item.id, "rate", e.target.value)} />
                </Td>
                <Td>
                  <input type="number" style={{ width: 70, background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 13, fontFamily: "DM Mono" }}
                    value={item.discount} onChange={e => updateItem(item.id, "discount", e.target.value)} min={0} max={100} />
                </Td>
                <Td mono>{item.gst}%</Td>
                <Td><span style={{ fontFamily: "DM Mono", fontWeight: 700, color: theme.accent }}>{fmt(calcItem(item))}</span></Td>
                <Td>
                  <button className="btn-danger btn-sm" onClick={() => removeItem(item.id)}><Icon name="trash" size={13} /></button>
                </Td>
              </tr>
            ))}
          </Table>
          <div style={{ padding: "16px 20px", background: theme.surface2, borderTop: `1px solid ${theme.border}` }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
                {[["Subtotal", fmt(subtotal)], ["CGST", fmt(cgst)], ["SGST", fmt(sgst)], ["Shipping", fmt(shipping)], ["Round Off", fmtNum(roundOff)]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: theme.textMuted }}>{l}</span>
                    <span style={{ fontFamily: "DM Mono" }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${theme.border}`, paddingTop: 10, marginTop: 4 }}>
                  <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15 }}>Grand Total</span>
                  <span style={{ fontFamily: "DM Mono", fontWeight: 800, fontSize: 20, color: theme.accent }}>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button className="btn-secondary" onClick={() => setPage("invoices")}>Cancel</button>
        <button className="btn-primary" style={{ padding: "12px 28px" }} onClick={handleSave}><Icon name="invoice" size={15} /> Generate Invoice</button>
      </div>
    </div>
  );
};

// ============================================================
// INVOICE PRINT VIEW
// ============================================================
const InvoicePrint = ({ invoice, settings, onBack }) => {
  const s = settings || DB.get("settings") || {};
  const calcItem = (item) => {
    const base = item.qty * item.rate;
    const disc = item.discount ? (base * item.discount / 100) : 0;
    return base - disc;
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button className="btn-secondary" onClick={onBack}>← Back to Invoices</button>
        <button className="btn-primary" onClick={() => window.print()}><Icon name="print" size={15} /> Print Invoice</button>
      </div>
      <div id="print-area" style={{ background: "white", color: "#000", padding: "30px 36px", maxWidth: 800, margin: "0 auto", borderRadius: 8, fontFamily: "Arial, sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: "2px solid #F5A623", paddingBottom: 20 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#F5A623", letterSpacing: "-0.02em" }}>{s.businessName || "AK Enterprises"}</div>
            <div style={{ fontSize: 13, color: "#555", marginTop: 2 }}>{s.address}</div>
            <div style={{ fontSize: 12, color: "#555" }}>GST: {s.gst} · PAN: {s.pan}</div>
            <div style={{ fontSize: 12, color: "#555" }}>📞 {s.mobile} · ✉ {s.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#333" }}>TAX INVOICE</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F5A623", marginTop: 4 }}>{invoice.invoiceNo}</div>
            <div style={{ fontSize: 12, color: "#555" }}>Date: {invoice.date}</div>
            <div style={{ marginTop: 8, padding: "4px 12px", background: invoice.status === "Paid" ? "#e8f5e9" : "#fff3e0", color: invoice.status === "Paid" ? "#2e7d32" : "#e65100", borderRadius: 20, display: "inline-block", fontSize: 12, fontWeight: 700 }}>{invoice.status}</div>
          </div>
        </div>
        {/* Bill to */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div style={{ background: "#f9f9f9", padding: "14px 16px", borderRadius: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Bill To</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{invoice.customerName}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{invoice.customerMobile}</div>
            <div style={{ fontSize: 13, color: "#555" }}>{invoice.customerAddress}</div>
            {invoice.customerGst && <div style={{ fontSize: 12, color: "#777" }}>GST: {invoice.customerGst}</div>}
          </div>
          <div style={{ background: "#f9f9f9", padding: "14px 16px", borderRadius: 6 }}>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Payment</div>
            <div style={{ fontSize: 13 }}>Mode: <strong>{invoice.paymentMode}</strong></div>
            <div style={{ fontSize: 13 }}>Paid: <strong>₹{(invoice.paid || 0).toFixed(2)}</strong></div>
            <div style={{ fontSize: 13 }}>Balance: <strong style={{ color: invoice.balance > 0 ? "#c62828" : "#2e7d32" }}>₹{(invoice.balance || 0).toFixed(2)}</strong></div>
          </div>
        </div>
        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#F5A623", color: "white" }}>
              {["#", "Product", "Qty", "Rate", "Disc%", "GST%", "Amount"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: h === "#" || h === "Qty" || h === "Disc%" || h === "GST%" || h === "Amount" || h === "Rate" ? "right" : "left", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 500 }}>{item.name}<br /><span style={{ fontSize: 11, color: "#888" }}>{item.code}</span></td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>{item.qty}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>₹{item.rate.toFixed(2)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>{item.discount || 0}%</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13 }}>{item.gst}%</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700 }}>₹{calcItem(item).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <div style={{ minWidth: 260 }}>
            {[["Subtotal", invoice.subtotal], ["CGST", invoice.cgst], ["SGST", invoice.sgst], ["Shipping", invoice.shipping], ["Round Off", invoice.roundOff]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: "1px solid #eee" }}>
                <span style={{ color: "#666" }}>{l}</span>
                <span>₹{(Number(v) || 0).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontWeight: 800, fontSize: 17, color: "#F5A623" }}>
              <span>Grand Total</span>
              <span>₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        {/* Bank Details + Terms */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, borderTop: "1px solid #eee", paddingTop: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Bank Details</div>
            <div style={{ fontSize: 12, color: "#555" }}>Bank: {s.bankName}</div>
            <div style={{ fontSize: 12, color: "#555" }}>A/C: {s.accountNo}</div>
            <div style={{ fontSize: 12, color: "#555" }}>IFSC: {s.ifsc}</div>
            <div style={{ fontSize: 12, color: "#555" }}>UPI: {s.upi}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", color: "#888", marginBottom: 6 }}>Terms & Conditions</div>
            <div style={{ fontSize: 11, color: "#777", whiteSpace: "pre-line" }}>{s.terms}</div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#999", borderTop: "1px solid #eee", paddingTop: 12 }}>
          {s.notes} · This is a computer-generated invoice
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ALL INVOICES PAGE
// ============================================================
const AllInvoices = ({ setPage, setViewInvoice }) => {
  const [invoices, setInvoices] = useState(DB.getAll("invoices"));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [preview, setPreview] = useState(null);

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) || inv.customerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || inv.status === filter;
    return matchSearch && matchFilter;
  }).reverse();

  const settings = DB.get("settings") || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}><Icon name="search" size={15} /></span>
          <input className="input" style={{ paddingLeft: 38 }} placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["All", "Paid", "Partial", "Unpaid"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${filter === f ? theme.accent : theme.border}`, background: filter === f ? theme.accentDim : "transparent", color: filter === f ? theme.accent : theme.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{f}</button>
        ))}
        <button className="btn-primary" onClick={() => setPage("invoice")}><Icon name="plus" size={15} /> New Invoice</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <Table headers={["Invoice #", "Customer", "Date", "Amount", "Paid", "Balance", "Mode", "Status", "Actions"]}>
          {filtered.map(inv => (
            <tr key={inv.id}>
              <Td mono><span style={{ color: theme.accent, fontWeight: 700 }}>{inv.invoiceNo}</span></Td>
              <Td><div style={{ fontWeight: 600 }}>{inv.customerName}</div><div style={{ fontSize: 11, color: theme.textMuted }}>{inv.customerMobile}</div></Td>
              <Td mono>{inv.date}</Td>
              <Td mono>{fmt(inv.grandTotal)}</Td>
              <Td mono style={{ color: theme.success }}>{fmt(inv.paid)}</Td>
              <Td mono style={{ color: inv.balance > 0 ? theme.danger : theme.success }}>{fmt(inv.balance)}</Td>
              <Td><span style={{ fontSize: 12, color: theme.textMuted }}>{inv.paymentMode}</span></Td>
              <Td>
                <span className={`badge badge-${inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "danger"}`}>{inv.status}</span>
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-secondary btn-sm" onClick={() => setPreview(inv)} title="View"><Icon name="eye" size={13} /></button>
                  <button className="btn-danger btn-sm" onClick={() => { if (confirm("Cancel this invoice?")) { DB.update("invoices", inv.id, { status: "Cancelled" }); setInvoices(DB.getAll("invoices")); } }} title="Cancel"><Icon name="trash" size={13} /></button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </div>

      {preview && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPreview(null)}>
          <div style={{ background: theme.surface, borderRadius: 16, width: "95%", maxWidth: 820, maxHeight: "92vh", overflow: "auto" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${theme.border}` }}>
              <span style={{ fontFamily: "Syne", fontWeight: 700 }}>Invoice Preview</span>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary btn-sm" onClick={() => window.print()}><Icon name="print" size={13} /> Print</button>
                <button className="btn-secondary btn-sm" onClick={() => setPreview(null)}><Icon name="close" size={13} /></button>
              </div>
            </div>
            <InvoicePrint invoice={preview} settings={settings} onBack={() => setPreview(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// REPORTS PAGE
// ============================================================
const Reports = () => {
  const [dateFrom, setDateFrom] = useState("2026-02-01");
  const [dateTo, setDateTo] = useState(today());
  const [activeTab, setActiveTab] = useState("sales");

  const invoices = DB.getAll("invoices");
  const products = DB.getAll("products");

  const filtered = invoices.filter(inv => inv.date >= dateFrom && inv.date <= dateTo);
  const totalSales = filtered.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid = filtered.reduce((s, i) => s + i.paid, 0);
  const totalPending = filtered.reduce((s, i) => s + i.balance, 0);
  const totalGst = filtered.reduce((s, i) => s + i.gstAmount, 0);

  const tabs = [
    { id: "sales", label: "Sales" },
    { id: "gst", label: "GST" },
    { id: "stock", label: "Stock" },
    { id: "outstanding", label: "Outstanding" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 160 }} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 160 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Sales" value={fmt(totalSales)} icon="rupee" color={theme.accent} />
        <StatCard label="Total Collected" value={fmt(totalPaid)} icon="check" color={theme.success} />
        <StatCard label="Pending" value={fmt(totalPending)} icon="warning" color={theme.danger} />
        <StatCard label="Total GST" value={fmt(totalGst)} icon="rupee" color={theme.info} />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "8px 20px", borderRadius: 8, border: `1px solid ${activeTab === t.id ? theme.accent : theme.border}`, background: activeTab === t.id ? theme.accentDim : "transparent", color: activeTab === t.id ? theme.accent : theme.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.label} Report</button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {activeTab === "sales" && (
          <Table headers={["Invoice #", "Date", "Customer", "Subtotal", "GST", "Total", "Status"]}>
            {filtered.map(inv => (
              <tr key={inv.id}>
                <Td mono>{inv.invoiceNo}</Td>
                <Td mono>{inv.date}</Td>
                <Td>{inv.customerName}</Td>
                <Td mono>{fmt(inv.subtotal)}</Td>
                <Td mono>{fmt(inv.gstAmount)}</Td>
                <Td mono><strong>{fmt(inv.grandTotal)}</strong></Td>
                <Td><span className={`badge badge-${inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "danger"}`}>{inv.status}</span></Td>
              </tr>
            ))}
          </Table>
        )}
        {activeTab === "gst" && (
          <Table headers={["Invoice #", "Date", "Customer", "Taxable Amount", "CGST", "SGST", "Total GST"]}>
            {filtered.map(inv => (
              <tr key={inv.id}>
                <Td mono>{inv.invoiceNo}</Td>
                <Td mono>{inv.date}</Td>
                <Td>{inv.customerName}</Td>
                <Td mono>{fmt(inv.subtotal)}</Td>
                <Td mono>{fmt(inv.cgst)}</Td>
                <Td mono>{fmt(inv.sgst)}</Td>
                <Td mono><strong style={{ color: theme.accent }}>{fmt(inv.gstAmount)}</strong></Td>
              </tr>
            ))}
          </Table>
        )}
        {activeTab === "stock" && (
          <Table headers={["Product", "Code", "Category", "Purchase ₹", "Sell ₹", "Stock", "Value", "Status"]}>
            {products.map(p => (
              <tr key={p.id}>
                <Td>{p.name}</Td>
                <Td mono>{p.code}</Td>
                <Td>{p.category}</Td>
                <Td mono>{fmt(p.purchasePrice)}</Td>
                <Td mono>{fmt(p.sellingPrice)}</Td>
                <Td mono><span style={{ color: p.stock <= p.minStock ? theme.danger : theme.success }}>{p.stock} {p.unit}</span></Td>
                <Td mono>{fmt(p.stock * p.purchasePrice)}</Td>
                <Td><span className={`badge ${p.stock <= p.minStock ? "badge-danger" : "badge-success"}`}>{p.stock <= p.minStock ? "Low" : "OK"}</span></Td>
              </tr>
            ))}
          </Table>
        )}
        {activeTab === "outstanding" && (
          <Table headers={["Invoice #", "Date", "Customer", "Total", "Paid", "Balance Due", "Mode"]}>
            {filtered.filter(i => i.balance > 0).map(inv => (
              <tr key={inv.id}>
                <Td mono>{inv.invoiceNo}</Td>
                <Td mono>{inv.date}</Td>
                <Td>{inv.customerName}<br /><span style={{ fontSize: 11, color: theme.textMuted }}>{inv.customerMobile}</span></Td>
                <Td mono>{fmt(inv.grandTotal)}</Td>
                <Td mono style={{ color: theme.success }}>{fmt(inv.paid)}</Td>
                <Td mono><strong style={{ color: theme.danger }}>{fmt(inv.balance)}</strong></Td>
                <Td>{inv.paymentMode}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS PAGE
// ============================================================
const Settings = () => {
  const [form, setForm] = useState(DB.get("settings") || {});
  const [saved, setSaved] = useState(false);

  const F = ({ label, field, type = "text", full, options }) => (
    <div style={{ gridColumn: full ? "1/-1" : undefined, marginBottom: 16 }}>
      <label className="label">{label}</label>
      {options ? (
        <select className="input" value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}>
          {options.map(o => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea className="input" rows={4} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} style={{ resize: "vertical" }} />
      ) : type === "toggle" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
          <div onClick={() => setForm(p => ({ ...p, [field]: !p[field] }))} style={{ width: 44, height: 24, borderRadius: 12, background: form[field] ? theme.accent : theme.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: form[field] ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: 13, color: theme.textMuted }}>{form[field] ? "Enabled" : "Disabled"}</span>
        </div>
      ) : (
        <input className="input" type={type} value={form[field] || ""} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))} />
      )}
    </div>
  );

  const handleSave = () => {
    DB.set("settings", form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const sections = [
    {
      title: "🏢 Company Details", fields: [
        { label: "Business Name", field: "businessName" },
        { label: "Owner Name", field: "ownerName" },
        { label: "Mobile Number", field: "mobile" },
        { label: "Alternate Mobile", field: "altMobile" },
        { label: "Email", field: "email" },
        { label: "GST Number", field: "gst" },
        { label: "PAN Number", field: "pan" },
        { label: "Full Address", field: "address", full: true },
      ]
    },
    {
      title: "🏦 Bank Details", fields: [
        { label: "Bank Name", field: "bankName" },
        { label: "Account Number", field: "accountNo" },
        { label: "IFSC Code", field: "ifsc" },
        { label: "UPI ID", field: "upi" },
      ]
    },
    {
      title: "🧾 Invoice Settings", fields: [
        { label: "Invoice Prefix", field: "invoicePrefix" },
        { label: "Current Invoice Number", field: "currentInvoice", type: "number" },
        { label: "Default GST %", field: "defaultGst", options: [5, 12, 18, 28] },
        { label: "Default Payment Mode", field: "defaultPaymentMode", options: ["Cash", "UPI", "Card", "Bank Transfer", "Credit"] },
        { label: "Enable GST", field: "enableGst", type: "toggle" },
        { label: "Enable Discount", field: "enableDiscount", type: "toggle" },
        { label: "Enable Shipping", field: "enableShipping", type: "toggle" },
        { label: "Enable Round Off", field: "roundOff", type: "toggle" },
        { label: "Terms & Conditions", field: "terms", type: "textarea", full: true },
        { label: "Invoice Notes", field: "notes", type: "textarea", full: true },
      ]
    }
  ];

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      {sections.map(section => (
        <div key={section.title} className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${theme.border}` }}>{section.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            {section.fields.map(f => <F key={f.field} {...f} />)}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
        {saved && <span style={{ color: theme.success, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}><Icon name="check" size={15} color={theme.success} /> Settings saved!</span>}
        <button className="btn-primary" style={{ padding: "12px 32px" }} onClick={handleSave}>Save All Settings</button>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    seedData();
    // Auto-open sidebar on desktop
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard setPage={setPage} />;
      case "invoice": return <InvoiceCreator setPage={setPage} />;
      case "invoices": return <AllInvoices setPage={setPage} />;
      case "products": return <Products />;
      case "customers": return <Customers />;
      case "reports": return <Reports />;
      case "settings": return <Settings />;
      default: return <Dashboard setPage={setPage} />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar page={page} setPage={setPage} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div style={{ flex: 1, marginLeft: sidebarOpen && window.innerWidth > 768 ? 220 : 0, transition: "margin-left 0.25s ease", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <TopBar page={page} setSidebarOpen={setSidebarOpen} setPage={setPage} />
          <main style={{ flex: 1 }} className="fade-in" key={page}>
            {renderPage()}
          </main>
        </div>
      </div>
    </>
  );
}
