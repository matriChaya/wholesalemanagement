import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Ensure backup storage directory exists
const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create backup directory:", err);
}

// Lazy Google Gen AI
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API Health Check (supports standard Cloud Run & Kubernetes probes)
app.get(["/api/health", "/health", "/healthz"], (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Automatic & Manual Cloud / Server Backup Endpoints
app.post("/api/backup/save", (req, res) => {
  try {
    const snapshot = req.body;
    if (!snapshot || !snapshot.id) {
      return res.status(400).json({ success: false, error: "Invalid backup payload" });
    }

    const backupFileName = `backup_${snapshot.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    const filePath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

    // Maintain manifest of latest 25 backups
    const manifestPath = path.join(BACKUP_DIR, "manifest.json");
    let manifest: any[] = [];
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch {
        manifest = [];
      }
    }

    const metaItem = {
      id: snapshot.id,
      timestamp: snapshot.timestamp || new Date().toISOString(),
      version: snapshot.version || "2.4",
      createdBy: snapshot.createdBy || "System",
      createdByName: snapshot.createdByName || "User",
      totalRecords:
        (snapshot.counts?.products || 0) +
        (snapshot.counts?.orders || 0) +
        (snapshot.counts?.retailers || 0) +
        (snapshot.counts?.suppliers || 0) +
        (snapshot.counts?.transfers || 0) +
        (snapshot.counts?.capitalTransactions || 0),
      financialSummary: `Inv: ৳${snapshot.financials?.totalStockValue || 0}, Rec: ৳${snapshot.financials?.totalReceivables || 0}`,
      fileName: backupFileName,
      source: "server-file",
    };

    manifest = [metaItem, ...manifest.filter((m: any) => m.id !== snapshot.id)].slice(0, 25);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    return res.json({
      success: true,
      message: "Backup safely saved to server storage.",
      backupId: snapshot.id,
      timestamp: snapshot.timestamp,
    });
  } catch (err: any) {
    console.error("Error saving backup on server:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to save backup" });
  }
});

// Temporary download cache for PWA / Mobile Android OS DownloadManager support
interface TempDownloadItem {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  expiresAt: number;
}
const tempDownloadStore = new Map<string, TempDownloadItem>();

// Clean expired download buffers every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of tempDownloadStore.entries()) {
    if (item.expiresAt < now) {
      tempDownloadStore.delete(key);
    }
  }
}, 60000);

// Endpoint to prepare a download file from PWA client (PDF, JSON, CSV)
app.post("/api/download/prepare", (req, res) => {
  try {
    const { filename, mimeType, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ success: false, error: "Missing filename or base64 data" });
    }

    const buffer = Buffer.from(base64, "base64");
    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const effectiveMime = mimeType || "application/octet-stream";

    tempDownloadStore.set(downloadId, {
      buffer,
      mimeType: effectiveMime,
      filename,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes TTL
    });

    const safeFilename = encodeURIComponent(filename);
    return res.json({
      success: true,
      downloadId,
      downloadUrl: `/api/download/file/${downloadId}/${safeFilename}`,
    });
  } catch (err: any) {
    console.error("Error preparing download file:", err);
    return res.status(500).json({ success: false, error: err.message || "Failed to prepare download" });
  }
});

// Serve the file with proper HTTP headers to trigger OS-level DownloadManager in Android PWA
app.get("/api/download/file/:id/:filename", (req, res) => {
  try {
    const { id } = req.params;
    const item = tempDownloadStore.get(id);
    if (!item) {
      return res.status(404).send("Download link expired or not found. Please try downloading again from the app.");
    }

    const cleanFilename = item.filename.replace(/[^\w\d_.-]/g, "_");
    const encodedFilename = encodeURIComponent(item.filename);

    res.setHeader("Content-Type", item.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader("Content-Length", item.buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.send(item.buffer);
  } catch (err: any) {
    console.error("Error serving download file:", err);
    return res.status(500).send("Error serving file download.");
  }
});

// App Version & Deployment Info for PWA & Client In-App Updater
const APP_VERSION = "3.0.0";
// Current updated build timestamp to trigger live PWA update detection across devices
const SERVER_BOOT_TIMESTAMP = 1760700000000;
const BUILD_INFO = {
  version: APP_VERSION,
  buildTime: new Date().toISOString(),
  buildTimestamp: SERVER_BOOT_TIMESTAMP,
  releaseName: "মাতৃছায়া টেলিকম ডিলার ইআরপি আল্ট্রা (v3.0.0) - ফুল অ্যান্ড ফাইনাল সেটআপ",
  releaseNotes: "এডমিন (01937200635), ক্যাশ কাউন্টার (01949663733), ডিএসআর (01615154653) লাইভ অটো-সিঙ্ক, গুগল ড্রাইভ ১৫ জিবি ব্যাকআপ, মোবাইল ইনস্টল ফিক্স ও লাইভ ডিভাইস উপস্থিতি মনিটর",
};

app.get("/api/app/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.json({
    success: true,
    ...BUILD_INFO,
    currentTime: Date.now(),
  });
});

app.get("/api/backup/list", (_req, res) => {
  try {
    const manifestPath = path.join(BACKUP_DIR, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      return res.json({ success: true, backups: [] });
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return res.json({ success: true, backups: manifest });
  } catch (err: any) {
    return res.json({ success: true, backups: [] });
  }
});

app.get("/api/backup/get/:id", (req, res) => {
  try {
    const backupId = req.params.id;
    const backupFileName = `backup_${backupId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    const filePath = path.join(BACKUP_DIR, backupFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Backup file not found" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Error reading backup file" });
  }
});

// Direct Backup JSON file download endpoint
app.get(["/api/backup/download", "/api/backup/export-json", "/api/backup/download-latest"], (_req, res) => {
  try {
    const backupCandidates = [
      path.join(BACKUP_DIR, "matrichaya_telecom_erp_backup.json"),
      path.join(process.cwd(), "public", "downloads", "matrichaya_telecom_erp_backup.json")
    ];

    for (const filePath of backupCandidates) {
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="matrichaya_telecom_erp_backup.json"');
        return res.sendFile(filePath);
      }
    }

    return res.status(404).json({ success: false, error: "Backup file not found on server" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || "Error downloading backup" });
  }
});

// Explicit static serving for downloads folder before Vite
app.use("/downloads", express.static(path.join(process.cwd(), "public", "downloads")));

// ==========================================
// REAL-TIME MULTI-DEVICE PRESENCE & FLEET REGISTRY
// ==========================================
interface DeviceRecord {
  deviceId: string;
  adminPhone: string;
  role: 'admin' | 'counter' | 'dsr';
  phone: string;
  name: string;
  deviceType: string;
  userAgent?: string;
  firstInstalledAt: string;
  lastSeenAt: string;
  lastHeartbeatMs: number;
  ip?: string;
  appVersion?: string;
  pendingFilesCount: number;
  pendingItems?: any[];
}

const DEVICES_FILE = path.join(process.cwd(), "data", "devices_registry.json");
const devicesMap = new Map<string, DeviceRecord>();

// Ensure data folder exists
try {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (fs.existsSync(DEVICES_FILE)) {
    const list: DeviceRecord[] = JSON.parse(fs.readFileSync(DEVICES_FILE, "utf-8"));
    if (Array.isArray(list)) {
      list.forEach((dev) => {
        if (dev && dev.deviceId) devicesMap.set(dev.deviceId, dev);
      });
    }
  }
} catch (e) {
  console.warn("Could not load devices registry:", e);
}

function saveDevicesRegistry() {
  try {
    const arr = Array.from(devicesMap.values());
    fs.writeFileSync(DEVICES_FILE, JSON.stringify(arr, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not save devices registry:", e);
  }
}

// 1. Device Registration Endpoint (Called upon login or installation on any device)
app.post("/api/device/register", (req, res) => {
  try {
    const { deviceId, adminPhone = "01937200635", role, phone, name, deviceType, appVersion } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, error: "Missing deviceId" });

    const nowIso = new Date().toISOString();
    const existing = devicesMap.get(deviceId);
    const updated: DeviceRecord = {
      deviceId,
      adminPhone: adminPhone || "01937200635",
      role: role || (existing ? existing.role : "counter"),
      phone: phone || (existing ? existing.phone : ""),
      name: name || (existing ? existing.name : "Staff Device"),
      deviceType: deviceType || (existing ? existing.deviceType : "Unknown Device"),
      userAgent: req.headers["user-agent"] || "",
      firstInstalledAt: existing ? existing.firstInstalledAt : nowIso,
      lastSeenAt: nowIso,
      lastHeartbeatMs: Date.now(),
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "",
      appVersion: appVersion || "3.0.0",
      pendingFilesCount: existing ? existing.pendingFilesCount : 0,
      pendingItems: existing ? existing.pendingItems : [],
    };

    devicesMap.set(deviceId, updated);
    saveDevicesRegistry();
    return res.json({ success: true, device: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Presence Heartbeat Endpoint (Every active device pulses every 8-12 seconds)
app.post("/api/presence/heartbeat", (req, res) => {
  try {
    const {
      deviceId,
      adminPhone = "01937200635",
      role,
      phone,
      name,
      deviceType,
      appVersion,
      pendingFilesCount = 0,
      pendingItems = [],
    } = req.body;

    if (!deviceId) return res.status(400).json({ success: false, error: "Missing deviceId" });

    const nowIso = new Date().toISOString();
    const existing = devicesMap.get(deviceId);
    const updated: DeviceRecord = {
      deviceId,
      adminPhone: adminPhone || "01937200635",
      role: role || (existing ? existing.role : "counter"),
      phone: phone || (existing ? existing.phone : ""),
      name: name || (existing ? existing.name : "Staff Device"),
      deviceType: deviceType || (existing ? existing.deviceType : "Device"),
      userAgent: req.headers["user-agent"] || (existing ? existing.userAgent : ""),
      firstInstalledAt: existing ? existing.firstInstalledAt : nowIso,
      lastSeenAt: nowIso,
      lastHeartbeatMs: Date.now(),
      ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "",
      appVersion: appVersion || (existing ? existing.appVersion : "3.0.0"),
      pendingFilesCount: typeof pendingFilesCount === "number" ? pendingFilesCount : 0,
      pendingItems: Array.isArray(pendingItems) ? pendingItems : (existing?.pendingItems || []),
    };

    devicesMap.set(deviceId, updated);
    saveDevicesRegistry();
    return res.json({ success: true, serverTime: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Presence Status Query (All connected clients poll to see remote device statuses)
app.get("/api/presence/status", (req, res) => {
  try {
    const adminPhone = (req.query.adminPhone as string) || "01937200635";
    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 38000; // 38 seconds timeout

    const matchingDevices = Array.from(devicesMap.values()).filter(
      (d) => d.adminPhone === adminPhone || !d.adminPhone
    );

    const enriched = matchingDevices.map((d) => {
      const diffMs = Math.max(0, now - (d.lastHeartbeatMs || 0));
      const isOnline = diffMs <= ONLINE_THRESHOLD_MS;
      return {
        ...d,
        isOnline,
        lastSeenSec: Math.floor(diffMs / 1000),
      };
    });

    const isDsrOnline = enriched.some((d) => d.role === "dsr" && d.isOnline);
    const isCounterOnline = enriched.some((d) => d.role === "counter" && d.isOnline);
    const isAdminOnline = enriched.some((d) => d.role === "admin" && d.isOnline);

    return res.json({
      success: true,
      adminPhone,
      serverTime: now,
      onlineSummary: {
        dsrOnline: isDsrOnline,
        counterOnline: isCounterOnline,
        adminOnline: isAdminOnline,
        totalOnline: enriched.filter((d) => d.isOnline).length,
        totalRegistered: enriched.length,
      },
      devices: enriched,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Fleet Device List under Admin
app.get("/api/device/list", (req, res) => {
  try {
    const adminPhone = (req.query.adminPhone as string) || "01937200635";
    const now = Date.now();
    const ONLINE_THRESHOLD_MS = 38000;

    const list = Array.from(devicesMap.values())
      .filter((d) => d.adminPhone === adminPhone || !d.adminPhone)
      .map((d) => ({
        ...d,
        isOnline: Math.max(0, now - (d.lastHeartbeatMs || 0)) <= ONLINE_THRESHOLD_MS,
      }));

    return res.json({ success: true, adminPhone, count: list.length, devices: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Multi-Device Pending Sync Queue: Report pending items from a device
app.post("/api/device/pending-sync/report", (req, res) => {
  try {
    const { deviceId, pendingItems = [] } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, error: "Missing deviceId" });

    const existing = devicesMap.get(deviceId);
    if (existing) {
      existing.pendingItems = Array.isArray(pendingItems) ? pendingItems : [];
      existing.pendingFilesCount = existing.pendingItems.length;
      existing.lastHeartbeatMs = Date.now();
      existing.lastSeenAt = new Date().toISOString();
      devicesMap.set(deviceId, existing);
      saveDevicesRegistry();
    }
    return res.json({ success: true, count: existing?.pendingFilesCount || 0 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Admin inspects all pending items from all devices
app.get("/api/device/pending-sync/all", (req, res) => {
  try {
    const adminPhone = (req.query.adminPhone as string) || "01937200635";
    const matching = Array.from(devicesMap.values()).filter(
      (d) => d.adminPhone === adminPhone || !d.adminPhone
    );

    const devicesWithPending = matching
      .filter((d) => (d.pendingItems && d.pendingItems.length > 0) || d.pendingFilesCount > 0)
      .map((d) => ({
        deviceId: d.deviceId,
        role: d.role,
        name: d.name,
        phone: d.phone,
        deviceType: d.deviceType,
        pendingFilesCount: d.pendingFilesCount,
        pendingItems: d.pendingItems || [],
        lastSeenAt: d.lastSeenAt,
      }));

    return res.json({
      success: true,
      totalPendingDevices: devicesWithPending.length,
      totalPendingFiles: devicesWithPending.reduce((sum, d) => sum + d.pendingFilesCount, 0),
      devices: devicesWithPending,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Admin Clears Device Pending Queue & exports to an emergency JSON backup
app.post("/api/device/pending-sync/clear-to-backup", (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ success: false, error: "Missing deviceId" });

    const device = devicesMap.get(deviceId);
    if (!device) return res.status(404).json({ success: false, error: "Device not found" });

    const pending = device.pendingItems || [];
    const timestamp = new Date().toISOString();
    const backupId = `pending_clear_${deviceId}_${Date.now()}`;
    const backupFileName = `emergency_backup_${backupId}.json`;
    const filePath = path.join(BACKUP_DIR, backupFileName);

    const snapshot = {
      id: backupId,
      timestamp,
      sourceDevice: deviceId,
      deviceRole: device.role,
      devicePhone: device.phone,
      deviceName: device.name,
      clearedBy: "Admin 01937200635",
      clearedItemCount: pending.length,
      items: pending,
    };

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");

    // Clear queue for this device
    device.pendingItems = [];
    device.pendingFilesCount = 0;
    devicesMap.set(deviceId, device);
    saveDevicesRegistry();

    return res.json({
      success: true,
      message: `পেন্ডিং ${pending.length}টি ফাইল সফলভাবে ক্লিয়ার করে ইমার্জেন্সি ব্যাকআপ ফাইলে সংরক্ষণ করা হয়েছে।`,
      backupFileName,
      downloadUrl: `/api/backup/emergency/${backupFileName}`,
      clearedCount: pending.length,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Download Emergency Backup generated from pending queues
app.get("/api/backup/emergency/:filename", (req, res) => {
  try {
    const filename = req.params.filename.replace(/[^a-zA-Z0-9_.-]/g, "");
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Emergency backup file not found.");
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(500).send("Error reading backup file.");
  }
});


// Helper function to convert Bengali digits (০-৯) and clean numeric strings to valid float numbers
function parseBanglaNumber(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val)
    .replace(/০/g, "0")
    .replace(/১/g, "1")
    .replace(/২/g, "2")
    .replace(/৩/g, "3")
    .replace(/৪/g, "4")
    .replace(/৫/g, "5")
    .replace(/৬/g, "6")
    .replace(/৭/g, "7")
    .replace(/৮/g, "8")
    .replace(/৯/g, "9")
    .replace(/[৳,/\-a-zA-Z\s]/g, "")
    .trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Get current date string in Asia/Dhaka (or fallback UTC) formatted as YYYY-MM-DD
function getBangladeshTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// Check if year, month, day form a valid calendar date
function isValidInvoiceDate(year: number, month: number, day: number): boolean {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  // Year sanity check: business invoices are generally recent (2024 - 2030)
  if (year < 2024 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

// Robust auto-extractor and normalizer for invoice dates
function normalizeInvoiceDate(rawDate: any): string {
  const todayStr = getBangladeshTodayDateString();
  if (!rawDate) return todayStr;

  let str = String(rawDate).trim();
  if (!str || ["n/a", "null", "undefined", "unknown", "none"].includes(str.toLowerCase())) {
    return todayStr;
  }

  // Convert Bengali digits (০-৯) to standard numbers (0-9)
  const bnDigits: { [k: string]: string } = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
  };
  str = str.replace(/[০-৯]/g, (d) => bnDigits[d] || d);

  // Strip prefixes like "Date:", "Dated:", "Dt:", "তারিখ:", etc.
  str = str.replace(/^(date|dated|dt|তারিখ)[\s:\-_]+/i, "").trim();

  // Pattern 1: ISO format YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (isValidInvoiceDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (Standard Bangladesh & UK format)
  const dmyMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    if (isValidInvoiceDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Pattern 3: DD/MM/YY (2-digit year)
  const dmy2Match = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})$/);
  if (dmy2Match) {
    const d = parseInt(dmy2Match[1], 10);
    const m = parseInt(dmy2Match[2], 10);
    const y = parseInt(dmy2Match[3], 10) + 2000;
    if (isValidInvoiceDate(y, m, d)) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Pattern 4: Named months (English & Bengali)
  const monthMap: { [k: string]: string } = {
    "january": "01", "jan": "01", "জানুয়ারি": "01", "জানুয়ারি": "01",
    "february": "02", "feb": "02", "ফেব্রুয়ারি": "02", "ফেব্রুয়ারি": "02",
    "march": "03", "mar": "03", "মার্চ": "03",
    "april": "04", "apr": "04", "এপ্রিল": "04",
    "may": "05", "মে": "05",
    "june": "06", "jun": "06", "জুন": "06",
    "july": "07", "jul": "07", "জুলাই": "07",
    "august": "08", "aug": "08", "আগস্ট": "08",
    "september": "09", "sep": "09", "সেপ্টেম্বর": "09",
    "october": "10", "oct": "10", "অক্টোবর": "10",
    "november": "11", "nov": "11", "নভেম্বর": "11",
    "december": "12", "dec": "12", "ডিসেম্বর": "12"
  };

  for (const [monthName, monthNum] of Object.entries(monthMap)) {
    const r1 = new RegExp(`(\\d{1,2})\\s*(?:st|nd|rd|th|ঠা|শে|ই)?\\s*${monthName}\\s*,?\\s*(\\d{2,4})`, "i");
    const m1 = str.match(r1);
    if (m1) {
      const d = parseInt(m1[1], 10);
      let y = parseInt(m1[2], 10);
      if (y < 100) y += 2000;
      const m = parseInt(monthNum, 10);
      if (isValidInvoiceDate(y, m, d)) {
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  // Fallback: Default directly to today's date so scanned invoice ALWAYS has accurate current date
  return todayStr;
}

// Categorize product based on extracted name
function inferProductCategory(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("battery") || n.includes("ব্যাটারি")) return "Battery";
  if (n.includes("charger") || n.includes("চার্জার") || n.includes("adapter")) return "Charger";
  if (n.includes("cable") || n.includes("ক্যাবল") || n.includes("type-c") || n.includes("usb")) return "Cable";
  if (n.includes("headphone") || n.includes("হেডফোন") || n.includes("earphone") || n.includes("earbud") || n.includes("airpod") || n.includes("বাডস")) return "Headphone";
  if (n.includes("display") || n.includes("ডিসপ্লে") || n.includes("touch") || n.includes("টাচ") || n.includes("lcd")) return "Display / Touch";
  if (n.includes("speaker") || n.includes("স্পিকার") || n.includes("sound")) return "Speaker";
  if (n.includes("power bank") || n.includes("পাওয়ার ব্যাংক")) return "Power Bank";
  if (n.includes("casing") || n.includes("cover") || n.includes("কেসিং") || n.includes("কভার")) return "Casing / Cover";
  if (n.includes("glass") || n.includes("গ্লাস") || n.includes("protector") || n.includes("প্রটেক্টর")) return "Glass Protector";
  if (n.includes("parts") || n.includes("পার্টস") || n.includes("ic") || n.includes("ribbon")) return "Spare Parts";
  if (n.includes("juice") || n.includes("জুস") || n.includes("drink") || n.includes("পানীয়") || n.includes("water") || n.includes("frooto") || n.includes("coke") || n.includes("beverage")) return "Beverages";
  if (n.includes("oil") || n.includes("তেল") || n.includes("rice") || n.includes("চাল") || n.includes("sugar") || n.includes("চিনি") || n.includes("flour") || n.includes("আটা") || n.includes("ময়দা") || n.includes("dal") || n.includes("ডাল") || n.includes("spice") || n.includes("মশলা") || n.includes("biscuit") || n.includes("বিস্কুট") || n.includes("snack") || n.includes("মরিচ") || n.includes("হলুদ")) return "Grocery / Food";
  if (n.includes("soap") || n.includes("সাবান") || n.includes("shampoo") || n.includes("শ্যাম্পু") || n.includes("cream") || n.includes("লোশন")) return "Accessories";
  return "General Wholesale";
}

// AI Receipt & Invoice Scanner using Gemini with Ultra-Accurate Multi-Language OCR
app.post(["/api/scan-receipt", "/api/scan-invoice"], async (req, res) => {
  try {
    const {
      imageBase64,
      image,
      mimeType = "image/jpeg",
      isSampleTest = false,
      expectedDocType,
      docType,
    } = req.body || {};

    const rawImage = imageBase64 || image;
    const targetDocType = expectedDocType || docType;

    if (!rawImage) {
      return res.status(400).json({
        success: false,
        error: "Image data is required",
      });
    }

    // Extract exact MIME type and clean base64 data
    let detectedMime = mimeType || "image/jpeg";
    let cleanBase64 = rawImage;

    if (rawImage.includes(";base64,")) {
      const parts = rawImage.split(";base64,");
      detectedMime = parts[0].replace(/^data:/, "") || "image/jpeg";
      cleanBase64 = parts[1];
    } else {
      cleanBase64 = rawImage.replace(/^data:[^;]+;base64,/, "");
    }

    const todayDhakaStr = getBangladeshTodayDateString();

    const systemInstruction = `You are a world-class optical character recognition (OCR) and document intelligence AI.
Your job is to read images of invoices, supply delivery challans, sales cash memos, replacement/return slips, and handwritten vouchers from Bangladesh (Bangla & English mixed) and international markets.

CRITICAL HANDWRITING & PEN NOTES SUPPORT:
You MUST accurately transcribe both printed computer invoices AND handwritten pen notes (কলমে বা বলপয়েন্টে লেখা মেমো, খাতার পাতা, ডেলিভারি স্লিপ, ও রিটার্ন লিস্ট)। Recognize cursive handwriting, handwritten Bengali (বাংলা হাতের লেখা), handwritten English, and carbon copies.

DOCUMENT TYPES:
1. PURCHASE (সাপ্লাই / ক্রয় চালান): Delivery from factory/supplier with supplier name, challan #, previous DO #, previous DO date, product items.
2. SALE (বিক্রয় / সেলস মেমো / খাতায় লেখা বিক্রয়): Sales bill or handwritten notebook sales entries to retailer or customer with shop/customer name, memo/page #, items, quantities, selling rates, total, paid cash, and due.
3. REPLACEMENT_RETURN (মার্কেট থেকে রিপ্লেস / ড্যামেজ রিটার্ন মেমো): Return slip for damaged/expired/broken items from retailers or to companies with items, quantities, and return reasons.
4. SALE_WITH_REPLACEMENT (ক্যাশ কাউন্টার বা ডিএসআর সেলস এবং রিপ্লেসমেন্ট মেমো/খাতার পাতা): Memos or handwritten notebook pages that contain both regular sales items AND returned/damage replacement items with replacement deduction from bill.

RULES FOR ACCURACY:
1. READ EVERY LINE ITEM: Transcribe all product rows from the bill table or handwritten notebook lines. Look for columns like (ক্রমিক নং / Sl, পণ্যের নাম / Description / Item Name / Particulars, পরিমাণ / Qty / সংখ্যা / Pcs / Ctn / Box / Bag / Kg, দর / Rate / Unit Price / Selling Rate, মোট টাকা / Amount / Total).
2. DISTINGUISH SALES VS REPLACEMENT: If a handwritten memo or khata has notes like "রিপ্লেস", "ফেরত", "ড্যামেজ", "নষ্ট মাল", "বাদ", separate those items into "replacementItems" and regular sold items into "items".
3. ACCURATE NAMES: Extract exact product names, pack sizes, and codes visible on the invoice or handwritten sheet.
4. BENGALI & ENGLISH: Preserve original language names (whether written in বাংলা or English or mixed). Convert Bengali numerals (০, ১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯) into standard Arabic numbers (0, 1, 2, 3...).
5. MATHEMATICAL RECONCILIATION:
   - If costPrice/rate is visible and quantity is visible: totalPrice = quantity * costPrice.
   - If totalPrice and quantity are visible but costPrice is blank: costPrice = totalPrice / quantity.
   - If unit is not explicitly written, infer standard unit (e.g. 'Pcs', 'Box', 'Ctn', 'Bag', 'Kg', 'Ltr', 'Pack', 'Dzn').
6. HEADER EXTRACTION:
   - docType: Detect whether document is 'PURCHASE' or 'SALE' or 'REPLACEMENT_RETURN' or 'SALE_WITH_REPLACEMENT'. If targetDocType is specified, align with it unless clearly contradictory.
   - supplierName: Company, Distributor, Depot, or Store name at the top (e.g., "মেসার্স...", "M/S...", "Enterprise", "Traders", "Depot").
   - retailerName: Retailer, Shop name, or Customer name (e.g. "দোকানদার / ক্রেতা / মেসার্স ... স্টোর / ভাই ভাই স্টোর").
   - supplierContact: Mobile/Phone number printed or written on bill if present.
   - invoiceNumber: Memo number, Challan number, or Bill number.
   - previousDoNo: Previous Delivery Order (পূর্বের ডিও নং / Prev DO #) if noted or referenced on the bill.
   - previousDoDate: Previous Delivery Order Date (পূর্বের ডিও তারিখ) in YYYY-MM-DD if noted on the bill.
   - invoiceDate: Extract the invoice date and convert to YYYY-MM-DD. If NO date is clearly printed or readable on the bill, set invoiceDate to today's date "${todayDhakaStr}". Do NOT invent arbitrary old years.
   - paidAmount: Cash amount received/paid (নগদ আদায় / জমা).
   - dueAmount: Remaining due amount (বকেয়া / বাকি).
   - replacementReason: Return reason if this is a replacement slip (e.g. 'EXPIRED', 'DAMAGED_PACKAGING', 'LEAKAGE_BROKEN', 'MANUFACTURING_DEFECT').
   - replacementItems: List of any returned/replacement items if present on the memo.
   - replacementDeduction: Total adjustment value deducted for replacement.
7. Return valid JSON adhering strictly to the schema.`;

    const prompt = `Analyze this document image carefully. Recognize printed text as well as pen/handwritten text (কলমে লেখা রশিদ, খাতার হিসাব, বা মেমো). ${
      targetDocType ? `Target document type is: ${targetDocType}. ` : ''
    }Extract all product rows, quantities, rates, totals, supplier/retailer name, invoice/memo number, previous DO number & date (if present), docType (${targetDocType || 'PURCHASE, SALE, or REPLACEMENT_RETURN'}), paid amount, due amount, replacement reason if any, and date (convert to YYYY-MM-DD, or use ${todayDhakaStr} if omitted) into structured JSON.`;

    // If this was a sample test button click, return sample preset data instantly
    if (isSampleTest) {
      const nowStr = getBangladeshTodayDateString();
      if (targetDocType === 'REPLACEMENT_RETURN') {
        return res.json({
          success: true,
          data: {
            retailerName: "জনতা ইলেকট্রনিক্স",
            supplierContact: "01911-223344",
            invoiceNumber: `RET-${Date.now().toString().slice(-6)}`,
            invoiceDate: nowStr,
            docType: 'REPLACEMENT_RETURN',
            items: [],
            replacementItems: [
              {
                name: "Earbuds Stereo Bass M10",
                quantity: 4,
                unit: "Pcs",
                reason: "একপাশে সাউন্ড হয় না",
                value: 1400,
              },
              {
                name: "Fast Charger Adapter 25W",
                quantity: 2,
                unit: "Pcs",
                reason: "বোর্ড শট / স্পার্ক",
                value: 500,
              }
            ],
            subtotal: 1900,
            totalAmount: 1900,
            paidAmount: 0,
            dueAmount: 0,
          },
          source: "sample-preset",
        });
      }

      return res.json({
        success: true,
        data: {
          supplierName: targetDocType === 'SALE' || targetDocType === 'SALE_WITH_REPLACEMENT' ? "" : "PRAN Foods Distribution Hub",
          retailerName: targetDocType === 'SALE' || targetDocType === 'SALE_WITH_REPLACEMENT' ? "ভাই ভাই ট্রেডার্স" : "",
          supplierContact: "+880 1713-998877",
          invoiceNumber: `${targetDocType === 'SALE' ? 'CTR' : 'INV'}-${Date.now().toString().slice(-6)}`,
          invoiceDate: nowStr,
          docType: targetDocType || 'PURCHASE',
          items: [
            {
              name: "PRAN Mango Juice Frooto 1L (12 Ctn)",
              sku: "SKU-FRT-1L",
              category: "Beverages",
              quantity: 15,
              unit: "Carton",
              costPrice: 650,
              suggestedRetailPrice: 780,
              totalPrice: 9750,
            },
            {
              name: "PRAN Potata Spicy Biscuit 100g (48 Box)",
              sku: "SKU-POT-100",
              category: "Grocery / Food",
              quantity: 20,
              unit: "Box",
              costPrice: 420,
              suggestedRetailPrice: 500,
              totalPrice: 8400,
            }
          ],
          subtotal: 18150,
          discount: 0,
          tax: 0,
          totalAmount: 18150,
          paymentStatus: "Unpaid",
          paymentMethod: "Credit",
          notes: "Sample preset invoice.",
        },
        source: "sample-preset",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not configured in server environment.");
      const nowStr = getBangladeshTodayDateString();
      return res.json({
        success: true,
        data: {
          supplierName: targetDocType === 'SALE' || targetDocType === 'SALE_WITH_REPLACEMENT' ? "" : "সাপ্লায়ার কোম্পানি / Supplier",
          retailerName: targetDocType === 'SALE' || targetDocType === 'SALE_WITH_REPLACEMENT' ? "নগদ ক্রেতা / দোকানদার" : "",
          supplierContact: "",
          invoiceNumber: `${targetDocType === 'SALE' ? 'CTR' : 'INV'}-${Date.now().toString().slice(-6)}`,
          invoiceDate: nowStr,
          docType: targetDocType || 'PURCHASE',
          items: [
            {
              name: "পণ্য আইটেম ১",
              sku: `SKU-${Date.now().toString().slice(-4)}`,
              category: "General Wholesale",
              quantity: 1,
              unit: "Pcs",
              costPrice: 100,
              suggestedRetailPrice: 120,
              totalPrice: 100,
            }
          ],
          subtotal: 100,
          discount: 0,
          tax: 0,
          totalAmount: 100,
          paymentStatus: "Unpaid",
          paymentMethod: "Credit",
          notes: "",
          requiresManualInput: true,
        },
        warning: "ছবি থেকে তথ্য রিড করতে এআই কী কনফিগার করা নেই। আপনার ছবির তথ্য দেখে নাম ও দর পূরণ করুন।",
        source: "manual-assistant",
      });
    }

    let extractedData: any = null;
    let scanSource = "";
    let lastError: any = null;

    // Supported models based on official SDK guidance
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-flash-latest",
      "gemini-3.6-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview"
    ];
    const ai = getGenAI();

    // Pass 1: Try structured output generation with candidate models
    for (const modelName of candidateModels) {
      if (extractedData) break;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                docType: { type: Type.STRING, description: "PURCHASE or SALE or REPLACEMENT_RETURN or SALE_WITH_REPLACEMENT" },
                supplierName: { type: Type.STRING, description: "Supplier or company name" },
                retailerName: { type: Type.STRING, description: "Retailer, shop, or customer name" },
                supplierContact: { type: Type.STRING, description: "Supplier or customer contact phone" },
                invoiceNumber: { type: Type.STRING, description: "Invoice, Challan, or Memo number" },
                previousDoNo: { type: Type.STRING, description: "Previous D.O. Number (পূর্বের ডিও নং) if printed or referenced" },
                previousDoDate: { type: Type.STRING, description: "Previous D.O. Date (পূর্বের ডিও তারিখ) in YYYY-MM-DD if printed" },
                invoiceDate: { type: Type.STRING, description: "Invoice date in YYYY-MM-DD" },
                replacementReason: { type: Type.STRING, description: "Reason if replacement/return slip (e.g. EXPIRED, DAMAGED_PACKAGING, LEAKAGE_BROKEN, OTHER)" },
                items: {
                  type: Type.ARRAY,
                  description: "List of all product items in the invoice table",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Full product name as written" },
                      sku: { type: Type.STRING, description: "Product code or SKU if available" },
                      category: { type: Type.STRING, description: "Product category" },
                      quantity: { type: Type.NUMBER, description: "Quantity" },
                      unit: { type: Type.STRING, description: "Unit of measurement (Pcs, Box, Ctn, Bag, Kg, Ltr, Dzn)" },
                      costPrice: { type: Type.NUMBER, description: "Purchase or selling price per unit in BDT" },
                      suggestedRetailPrice: { type: Type.NUMBER, description: "Suggested retail selling price" },
                      totalPrice: { type: Type.NUMBER, description: "Total line price in BDT" },
                    },
                    required: ["name", "quantity", "costPrice", "totalPrice"],
                  },
                },
                replacementItems: {
                  type: Type.ARRAY,
                  description: "List of any replacement, damaged, or returned items noted on the memo/page",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Product name returned or replaced" },
                      quantity: { type: Type.NUMBER, description: "Quantity returned" },
                      unit: { type: Type.STRING, description: "Unit" },
                      reason: { type: Type.STRING, description: "Defect or return reason" },
                      value: { type: Type.NUMBER, description: "Value or adjustment amount in BDT" },
                    },
                    required: ["name", "quantity"],
                  },
                },
                replacementDeduction: { type: Type.NUMBER, description: "Total deduction value for replacement items" },
                subtotal: { type: Type.NUMBER },
                discount: { type: Type.NUMBER },
                tax: { type: Type.NUMBER },
                totalAmount: { type: Type.NUMBER },
                paidAmount: { type: Type.NUMBER, description: "Paid amount in cash or digital payment" },
                dueAmount: { type: Type.NUMBER, description: "Remaining due or credit balance" },
                paymentStatus: { type: Type.STRING },
                paymentMethod: { type: Type.STRING },
                notes: { type: Type.STRING },
              },
              required: ["items"],
            },
          },
        });

        const responseText = response.text || "{}";
        let parsed: any = null;
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const match = responseText.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          // Normalize and cleanse extracted items
          const cleanedItems = parsed.items
            .filter((it: any) => it && (it.name || it.description || it.productName))
            .map((it: any, idx: number) => {
              const rawName = String(it.name || it.description || it.productName || `Item ${idx + 1}`).trim();
              const qty = Math.max(1, parseBanglaNumber(it.quantity) || 1);
              let cost = parseBanglaNumber(it.costPrice || it.rate || it.unitPrice || 0);
              let total = parseBanglaNumber(it.totalPrice || it.amount || it.total || 0);

              if (cost === 0 && total > 0) {
                cost = Math.round(total / qty);
              } else if (total === 0 && cost > 0) {
                total = Math.round(cost * qty);
              }

              const retail = parseBanglaNumber(it.suggestedRetailPrice) || Math.round(cost * 1.15);
              const category = it.category || inferProductCategory(rawName);

              return {
                name: rawName,
                sku: it.sku || `SKU-${Date.now().toString().slice(-4)}${idx + 1}`,
                category: category,
                quantity: qty,
                unit: it.unit || "Pcs",
                costPrice: cost,
                suggestedRetailPrice: retail,
                totalPrice: total,
              };
            });

          if (cleanedItems.length > 0) {
            const calculatedTotal = cleanedItems.reduce((s: number, i: any) => s + (i.totalPrice || 0), 0);
            parsed.items = cleanedItems;
            parsed.totalAmount = parseBanglaNumber(parsed.totalAmount) || calculatedTotal;
            parsed.subtotal = parseBanglaNumber(parsed.subtotal) || calculatedTotal;
            parsed.paidAmount = parseBanglaNumber(parsed.paidAmount) || 0;
            parsed.dueAmount = parseBanglaNumber(parsed.dueAmount) || Math.max(0, parsed.totalAmount - parsed.paidAmount);
            parsed.supplierName = parsed.supplierName || "Direct Supplier";
            parsed.retailerName = parsed.retailerName ? String(parsed.retailerName).trim() : "";
            
            const rawDocType = String(parsed.docType || targetDocType || "").toUpperCase();
            if (rawDocType.includes("SALE") || rawDocType.includes("SELL") || rawDocType.includes("বিক্রয়") || rawDocType.includes("মেমো")) {
              parsed.docType = rawDocType.includes("REPLACE") ? "SALE_WITH_REPLACEMENT" : "SALE";
            } else if (rawDocType.includes("REPLACE") || rawDocType.includes("RETURN") || rawDocType.includes("ড্যামেজ") || rawDocType.includes("নষ্ট")) {
              parsed.docType = "REPLACEMENT_RETURN";
            } else if (rawDocType.includes("PURCHASE") || rawDocType.includes("CHALLAN") || rawDocType.includes("চালান") || rawDocType.includes("ক্রয়")) {
              parsed.docType = "PURCHASE";
            } else {
              parsed.docType = targetDocType || "PURCHASE";
            }
            parsed.replacementReason = parsed.replacementReason ? String(parsed.replacementReason).trim() : "";
            
            // Clean & normalize replacement items if found on the memo/khata
            if (Array.isArray(parsed.replacementItems)) {
              parsed.replacementItems = parsed.replacementItems
                .map((rep: any, rIdx: number) => ({
                  name: String(rep.name || rep.productName || `Replacement Item ${rIdx + 1}`).trim(),
                  quantity: Math.max(1, parseBanglaNumber(rep.quantity) || 1),
                  unit: rep.unit || "Pcs",
                  reason: rep.reason || rep.defect || "ড্যামেজ / নষ্ট / মেয়াদোত্তীর্ণ",
                  value: parseBanglaNumber(rep.value || rep.amount || 0),
                }))
                .filter((rep: any) => rep.name);
            } else {
              parsed.replacementItems = [];
            }
            parsed.replacementDeduction = parseBanglaNumber(parsed.replacementDeduction) ||
              parsed.replacementItems.reduce((acc: number, item: any) => acc + (item.value || 0), 0);

            parsed.invoiceNumber = parsed.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
            parsed.previousDoNo = parsed.previousDoNo ? String(parsed.previousDoNo).trim() : "";
            parsed.previousDoDate = parsed.previousDoDate ? normalizeInvoiceDate(parsed.previousDoDate) : "";
            parsed.invoiceDate = normalizeInvoiceDate(parsed.invoiceDate);

            extractedData = parsed;
            scanSource = modelName;
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        const isTemporaryHighDemand =
          err?.status === "UNAVAILABLE" ||
          err?.status === 503 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("429") ||
          err?.message?.includes("RESOURCE_EXHAUSTED");

        if (isTemporaryHighDemand) {
          // Gracefully continue to next fallback candidate
          await new Promise((r) => setTimeout(r, 200));
        } else {
          console.warn(`Scan model ${modelName} attempt:`, err?.message || err);
        }
      }
    }

    // Pass 2: If structured schema failed, try direct unstructured text extraction & JSON markdown parsing
    if (!extractedData) {
      for (const fallbackModel of ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.6-flash", "gemini-3.1-flash-lite"]) {
        if (extractedData) break;
        try {
          const fallbackPrompt = `Examine this invoice/challan image. Transcribe all table rows and details. Output a JSON object in this format:
\`\`\`json
{
  "supplierName": "Name of Company / Supplier",
  "supplierContact": "Phone number if any",
  "invoiceNumber": "Memo/Invoice No",
  "invoiceDate": "YYYY-MM-DD",
  "items": [
    {
      "name": "Product Name",
      "quantity": 10,
      "unit": "Pcs/Ctn/Box/Bag/Kg",
      "costPrice": 500,
      "suggestedRetailPrice": 580,
      "totalPrice": 5000
    }
  ],
  "totalAmount": 5000
}
\`\`\``;

          const response = await ai.models.generateContent({
            model: fallbackModel,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: detectedMime,
                    data: cleanBase64,
                  },
                },
                { text: fallbackPrompt },
              ],
            },
          });

          const text = response.text || "";
          const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
              parsed.items = parsed.items.map((it: any, idx: number) => {
                const rawName = String(it.name || `Item ${idx + 1}`).trim();
                const qty = Math.max(1, parseBanglaNumber(it.quantity) || 1);
                let cost = parseBanglaNumber(it.costPrice || 0);
                let total = parseBanglaNumber(it.totalPrice || 0);
                if (cost === 0 && total > 0) cost = Math.round(total / qty);
                if (total === 0 && cost > 0) total = Math.round(cost * qty);
                return {
                  name: rawName,
                  sku: it.sku || `SKU-${Date.now().toString().slice(-4)}${idx + 1}`,
                  category: it.category || inferProductCategory(rawName),
                  quantity: qty,
                  unit: it.unit || "Pcs",
                  costPrice: cost,
                  suggestedRetailPrice: parseBanglaNumber(it.suggestedRetailPrice) || Math.round(cost * 1.15),
                  totalPrice: total,
                };
              });

              const calculatedTotal = parsed.items.reduce((s: number, i: any) => s + (i.totalPrice || 0), 0);
              parsed.items = parsed.items.filter((it: any) => it.name);
              if (parsed.items.length > 0) {
                parsed.totalAmount = parseBanglaNumber(parsed.totalAmount) || calculatedTotal;
                parsed.subtotal = parseBanglaNumber(parsed.subtotal) || calculatedTotal;
                parsed.supplierName = parsed.supplierName || "Direct Supplier";
                parsed.invoiceNumber = parsed.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
                parsed.invoiceDate = normalizeInvoiceDate(parsed.invoiceDate);

                extractedData = parsed;
                scanSource = `${fallbackModel}-unstructured`;
                break;
              }
            }
          }
        } catch (fErr: any) {
          // Continue to next fallback model
        }
      }
    }

    if (extractedData) {
      return res.json({
        success: true,
        data: extractedData,
        source: scanSource,
      });
    }

    console.error("All Gemini OCR attempts failed. Last error:", lastError?.message);

    // If this was a sample test button click, return sample preset data
    if (isSampleTest) {
      const nowStr = getBangladeshTodayDateString();
      return res.json({
        success: true,
        data: {
          supplierName: "PRAN Foods Distribution Hub",
          supplierContact: "+880 1713-998877",
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          invoiceDate: nowStr,
          items: [
            {
              name: "PRAN Mango Juice Frooto 1L (12 Ctn)",
              sku: "SKU-FRT-1L",
              category: "Beverages",
              quantity: 15,
              unit: "Carton",
              costPrice: 650,
              suggestedRetailPrice: 780,
              totalPrice: 9750,
            },
            {
              name: "PRAN Potata Spicy Biscuit 100g (48 Box)",
              sku: "SKU-POT-100",
              category: "Grocery / Food",
              quantity: 20,
              unit: "Box",
              costPrice: 420,
              suggestedRetailPrice: 500,
              totalPrice: 8400,
            }
          ],
          subtotal: 18150,
          discount: 0,
          tax: 0,
          totalAmount: 18150,
          paymentStatus: "Unpaid",
          paymentMethod: "Credit",
          notes: "Sample preset invoice.",
        },
        source: "sample-preset",
      });
    }

    // For real user photos where OCR encountered blurry or unreadable lines:
    const nowStr = getBangladeshTodayDateString();
    return res.json({
      success: true,
      data: {
        supplierName: "সাপ্লায়ার কোম্পানি / Supplier",
        supplierContact: "",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: nowStr,
        items: [
          {
            name: "পণ্য আইটেম ১",
            sku: `SKU-${Date.now().toString().slice(-4)}`,
            category: "General Wholesale",
            quantity: 10,
            unit: "Pcs",
            costPrice: 100,
            suggestedRetailPrice: 120,
            totalPrice: 1000,
          }
        ],
        subtotal: 1000,
        discount: 0,
        tax: 0,
        totalAmount: 1000,
        paymentStatus: "Unpaid",
        paymentMethod: "Credit",
        notes: "",
        requiresManualInput: true,
      },
      warning: "ছবি থেকে স্বয়ংক্রিয় টেক্সট স্ক্যান করতে কিছুটা অস্পষ্টতা ছিল। আপনার ছবির তথ্য দেখে নিচের তালিকায় নাম, পরিমাণ ও দর ঠিক করে সেভ করুন।",
      source: "manual-assistant",
    });
  } catch (error: any) {
    console.error("Receipt Scan Critical Exception:", error);
    const nowStr = new Date().toISOString().split("T")[0];
    return res.json({
      success: true,
      data: {
        supplierName: "",
        supplierContact: "",
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: nowStr,
        items: [
          {
            name: "",
            sku: `SKU-${Date.now().toString().slice(-4)}`,
            category: "General Wholesale",
            quantity: 1,
            unit: "Pcs",
            costPrice: 0,
            suggestedRetailPrice: 0,
            totalPrice: 0,
          }
        ],
        subtotal: 0,
        discount: 0,
        tax: 0,
        totalAmount: 0,
        paymentStatus: "Unpaid",
        paymentMethod: "Credit",
        notes: "",
        requiresManualInput: true,
      },
      warning: "সার্ভার সাময়িকভাবে ব্যস্ত। আপনি সরাসরি ছবি দেখে নিচে আইটেম লিখে সেভ করতে পারেন।",
      source: "manual-assistant",
    });
  }
});

// Vite & Static file serving setup
async function startServer() {
  const isServerCjs = Boolean(process.argv[1] && (process.argv[1].endsWith("server.cjs") || process.argv[1].includes("dist")));
  const isProduction = process.env.NODE_ENV === "production" || isServerCjs;

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const possibleDistPaths = [
      path.join(process.cwd(), "dist"),
      __dirname,
      path.join(__dirname, "..", "dist"),
      path.resolve("dist"),
    ];
    const distPath =
      possibleDistPaths.find(
        (p) => fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))
      ) || path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Application build artifacts not found. Please rebuild.");
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wholesale Management App running on http://0.0.0.0:${PORT} (mode: ${isProduction ? "production" : "development"})`);
  });

  // Handle graceful shutdowns
  const shutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
