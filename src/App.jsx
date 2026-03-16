import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Plus,
  Minus,
  Users,
  Disc3,
  Settings,
  Sparkles,
  Save,
  Trash2,
  Pencil,
  LayoutGrid,
  Move,
  Image as ImageIcon,
  Music,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  ListMusic,
  GripVertical,
} from "lucide-react";

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 10);


// --- 总选举顺位展示：把"十四位/14位/14/圈外/加入前"等统一格式化 ---
const _cnDigit = { "零":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9 };
function chineseToInt(s) {
  // 仅需支持到几十位（本项目足够用）
  if (!s) return NaN;
  s = String(s).replace(/位/g, "").trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s === "十") return 10;
  const tenIdx = s.indexOf("十");
  if (tenIdx === -1) return _cnDigit[s] ?? NaN;
  const left = s.slice(0, tenIdx);
  const right = s.slice(tenIdx + 1);
  const tens = left ? (_cnDigit[left] ?? NaN) : 1;
  const ones = right ? (_cnDigit[right] ?? NaN) : 0;
  if (Number.isNaN(tens) || Number.isNaN(ones)) return NaN;
  return tens * 10 + ones;
}

// edition 参数可选，用于判断圈外阈值：第四届及以后22+为圈外，之前20+为圈外
function getElectionBadge(raw, edition) {
  const v = (raw ?? "").toString().trim();
  if (!v) return { text: "—", className: "bg-[#F0F0F0] text-[#6B6B6B] border-[#E0E0E0]" };
  if (v === "加入前") return { text: "加入前", className: "bg-[#F0F0F0] text-[#6B6B6B] border-[#E0E0E0]" };
  if (v === "未参选") return { text: "未参选", className: "bg-[#F5F5F5] text-[#7A7A7A] border-[#E5E5E5]" };
  if (v === "圈外") return { text: "圈外", className: "bg-[#F0F0F0] text-[#6B6B6B] border-[#E0E0E0]" };

  // 允许输入：14位 / 14 / 十四位 / 十四
  const numFromDigits = v.match(/\d+/);
  const n = numFromDigits ? parseInt(numFromDigits[0], 10) : chineseToInt(v);

  if (!Number.isFinite(n)) {
    return { text: v, className: "bg-[#F0F0F0] text-[#1C1C1C] border-[#E0E0E0]" };
  }

  // 判断本届是否为第四届及以后
  const editionStr = String(edition || "");
  const editionNum = editionStr.match(/\d+/)
    ? parseInt(editionStr.match(/\d+/)[0], 10)
    : chineseToInt(editionStr.replace(/届/g, "").replace(/第/g, "").trim());
  const isFrom4th = Number.isFinite(editionNum) && editionNum >= 4;
  const outerThreshold = isFrom4th ? 22 : 20;

  if (n >= outerThreshold) return { text: "圈外", className: "bg-[#F0F0F0] text-[#6B6B6B] border-[#E0E0E0]" };

  const group = n >= 13 ? "UG" : "选拔";
  const text = `${n}位（${group}）`;

  // 配色：1 金，2 银，3-7 粉，8-12 蓝，13-19 紫
  let className = "bg-sky-50 text-sky-800 border-sky-200";
  if (n === 1) className = "bg-amber-100 text-amber-800 border-amber-200";
  else if (n === 2) className = "bg-[#F0F0F0] text-[#1C1C1C] border-[#E0E0E0]";
  else if (n >= 3 && n <= 7) className = "bg-rose-50 text-rose-700 border-rose-200";
  else if (n <= 12) className = "bg-sky-50 text-sky-800 border-sky-200";
  else className = "bg-violet-50 text-violet-800 border-violet-200";

  return { text, className };
}

function parseRankNum(raw) {
  const v = (raw ?? "").toString().trim();
  if (!v || v === "加入前" || v === "未参选") return Infinity;
  if (v === "圈外") return 9999;
  const m = v.match(/\d+/);
  if (m) return Number(m[0]);
  const n = chineseToInt(v);
  return Number.isFinite(n) ? n : Infinity;
}

function parseEditionNum(edition) {
  const s = (edition ?? "").toString();
  const m = s.match(/\d+/);
  if (m) return Number(m[0]);
  return chineseToInt(s);
}

const ELECTION_SUBTITLES = {
  "第1届": "面对未知",
  "第2届": "被选择的幸福",
  "第3届": "搅动风云",
  "第4届": "百家争鸣之战",
  "第5届": "Make XP Great Again!",
};

const SINGLE_KIND_OPTIONS = ["常规单曲", "投票单曲", "总选单曲", "猜拳单曲", "企划单曲", "纪念单曲"];

function singleKindBadge(kind) {
  if (!kind || kind === "常规单曲") return null;
  if (kind === "投票单曲") return { text: "投票单曲", className: "border-sky-200 bg-sky-50 text-sky-800" };
  if (kind === "总选单曲") return { text: "总选单曲", className: "border-orange-200 bg-orange-50 text-orange-800" };
  if (kind === "猜拳单曲") return { text: "猜拳单曲", className: "border-violet-200 bg-violet-50 text-violet-800" };
  if (kind === "企划单曲") return { text: "企划单曲", className: "border-teal-200 bg-teal-50 text-teal-700" };
  if (kind === "纪念单曲") return { text: "纪念单曲", className: "border-amber-200 bg-amber-50 text-amber-800" };
  return { text: kind, className: "border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B]" };
}

const splitSingleTitle = (fullTitle) => {
  // Expect formats like: "1st Single · Neon Bloom"
  const t = (fullTitle ?? "").toString().trim();
  if (!t) return { prefix: "", name: "" };
  const parts = t.split("·").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { prefix: "", name: t };
  return { prefix: parts[0], name: parts.slice(1).join(" · ") };
};


function ensureTrackShape(track, no, isAside) {
  const t = track && typeof track === "object" ? track : {};
  return {
    no,
    title: typeof t.title === "string" ? t.title : isAside ? "(A-side)" : "",
    isAside,
    audio: isAside && typeof t.audio === "string" ? t.audio : "",
  };
}

/**
 * 根据单曲标题前缀（如 "27th Single"）判断是否属于"新版公式照"语境（第27单起）
 */
function isSingleNewContext(single) {
  const prefix = splitSingleTitle(single?.title ?? "").prefix;
  const num = parseInt((prefix || "").match(/\d+/)?.[0], 10);
  return Number.isFinite(num) && num >= 27;
}

/**
 * 根据总选届数字符串（如 "第5届"）判断是否属于"新版公式照"语境（第5届起）
 */
function isEditionNewContext(editionStr) {
  const num = parseEditionNum(editionStr);
  return Number.isFinite(num) && num >= 5;
}

/**
 * 根据语境返回应展示的公式照 URL。
 * - isNewContext=true（27单+/5届+）且 officialPhotos 有 ≥2 张：返回最新版
 * - 否则：返回第一版
 * - officialPhotos 为空时回退 avatar
 */
function getOfficialPhotoUrl(member, isNewContext) {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  if (photos.length === 0) return member?.avatar ?? "";
  if (isNewContext && photos.length >= 2) return photos[photos.length - 1].url;
  return photos[0].url;
}

const buildRowMeta = (rows) => {
  const out = [];
  let start = 0;
  for (let i = 0; i < (rows ?? []).length; i += 1) {
    const n = Number(rows[i]) || 0;
    out.push({ rowIndexFromBack: i + 1, start, end: start + n });
    start += n;
  }
  return out;
};

const getRowFromFrontBySlot = (rows, slotIndex) => {
  const meta = buildRowMeta(rows);
  for (const r of meta) {
    if (slotIndex >= r.start && slotIndex < r.end) {
      const totalRows = meta.length || 1;
      // 约定：rows 数组从"后排"到"前排"，所以越靠后的 rowIndexFromBack 越前排
      const rowFromFront = totalRows - r.rowIndexFromBack + 1;
      return rowFromFront;
    }
  }
  return 1;
};

// rows 数组按"后排 -> 前排"顺序存储：例如 [5,5,1] 代表 3 排，其中最后的 1 是"第 1 排（最前）"。
// 这里返回"从后往前数"的排数：1 表示最后排（最靠后），rows.length 表示最前排。
const getRowFromBack = (rows, slotIndex) => {
  const meta = buildRowMeta(rows);
  for (const r of meta) {
    if (slotIndex >= r.start && slotIndex < r.end) return r.rowIndexFromBack;
  }
  return 1;
};

const computeMemberLineupHistory = (memberId, singles) => {
  if (!memberId) return [];
  const list = [];
  for (const s of (singles ?? [])) {
    const rows = s?.asideLineup?.rows ?? [];
    const slots = s?.asideLineup?.slots ?? [];
    const slotRoles = s?.asideLineup?.slotRoles ?? {};

    const idx = slots.findIndex((x) => x === memberId);
    if (idx === -1) {
      list.push({ singleId: s?.id, singleTitle: s?.title, kind: "未入选" });
      continue;
    }

    const rowFromFront = getRowFromFrontBySlot(rows, idx);
    // role 对所有位置生效（不再限制第1排）
    const role = slotRoles?.[idx] ?? null;
    list.push({
      singleId: s?.id,
      singleTitle: s?.title,
      kind: "A面选拔",
      rowFromFront,
      role,
    });
  }

  // 最新在后，历史在前：按 releaseDate 升序
  return list.sort((a, b) => {
    const da = (singles.find((x) => x.id === a.singleId)?.releaseDate ?? "").toString();
    const db = (singles.find((x) => x.id === b.singleId)?.releaseDate ?? "").toString();
    return da.localeCompare(db);
  });
};

const selectionKindTag = (kind) => {
  if (kind === "A面选拔") return { text: "A面选拔", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (kind === "B面") return { text: "B面", className: "bg-sky-50 text-sky-700 border-sky-200" };
  return { text: "未入选", className: "bg-[#F0F0F0] text-[#6B6B6B] border-[#E0E0E0]" };
};

const roleBadge = (role) => {
  if (role === "center") return { text: "CENTER", className: "bg-amber-100 text-amber-800 border-amber-200" };
  if (role === "guardian") return { text: "护法", className: "bg-[#F0F0F0] text-[#1C1C1C] border-[#E0E0E0]" };
  return null;
};

// ---------- Graduation helpers ----------
const isoDate = (v) => (v ? String(v).slice(0, 10) : "");

function getLastSingleBeforeGrad({ graduationDate }, singles) {
  const gd = isoDate(graduationDate);
  if (!gd) return { lastSingleId: null, lastRelease: "" };
  let best = null;
  for (const s of Array.isArray(singles) ? singles : []) {
    const r = isoDate(s?.release);
    if (!r) continue;
    if (r <= gd) {
      if (!best || r > best.release) best = { id: s.id, release: r };
    }
  }
  return { lastSingleId: best?.id ?? null, lastRelease: best?.release ?? "" };
}

function formatElectionRank(raw) {
  return getElectionBadge(raw).text;
}
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));


function generationBadgeClass(gen = "") {
  const g = String(gen || "");
  if (g.startsWith("1")) return "bg-rose-50 text-rose-700";
  if (g.startsWith("2")) return "bg-emerald-50 text-emerald-700";
  if (g.startsWith("3")) return ""; // styled via generationBadgeStyle
  if (g.startsWith("4")) return "bg-amber-50 text-amber-700";
  if (g.startsWith("5")) return ""; // styled via generationBadgeStyle
  if (g.startsWith("6")) return ""; // styled via generationBadgeStyle
  if (g.startsWith("7")) return ""; // styled via generationBadgeStyle
  return "bg-[#F0F0F0] text-[#6B6B6B]";
}

function generationBadgeStyle(gen = "") {
  const g = String(gen || "");
  const base = { padding: '2px 8px', fontWeight: 500, fontSize: '10px', letterSpacing: '0.04em' };
  if (g.startsWith("3")) return { ...base, backgroundColor: "#EEF2FF", color: "#4338CA" };
  if (g.startsWith("5")) return { ...base, backgroundColor: "#F0FDFA", color: "#0F766E" };
  if (g.startsWith("6")) return { ...base, backgroundColor: "#FAF5FF", color: "#7C3AED" };
  if (g.startsWith("7")) return { ...base, backgroundColor: "#FFF7ED", color: "#C2410C" };
  return base;
}


// ---------- Backend API ----------
// 不再使用 localStorage：数据与图片都走后端。
// 约定：
// - GET  {API_BASE}/data   -> { members, singles }
// - POST {API_BASE}/data  -> 覆盖保存
// - POST {API_BASE}/upload (form-data: image) -> { url }
// ✅ 使用相对路径，避免 ngrok/手机端访问时写死 localhost
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function normalizeAppDataShape(raw) {
  return {
    members: Array.isArray(raw?.members) ? raw.members : [],
    singles: Array.isArray(raw?.singles) ? raw.singles : [],
    gallery: Array.isArray(raw?.gallery) ? raw.gallery : [],
    playlists: Array.isArray(raw?.playlists) ? raw.playlists : [],
  };
}

// ✅ 前端渲染媒体资源时：/uploads/... 需要在生产环境拼上后端域名；本地开发同域时保持相对路径
function resolveMediaUrl(v) {
  if (!v) return v;
  if (typeof v !== "string") return v;
  // 已经是完整链接就不动
  if (/^https?:\/\//i.test(v)) return v;
  // 仅处理后端静态资源
  if (v.startsWith("/uploads/")) {
    return API_BASE ? `${API_BASE}${v}` : v;
  }
  return v;
}

function MediaImage({ src, alt, className, eager = false, ...props }) {
  return (
    <img
      src={resolveMediaUrl(src)}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      {...props}
    />
  );
}

// ✅ 把任何绝对 uploads URL 归一成相对路径（/uploads/...），确保可跨终端访问
function toRelativeUploadsUrl(v) {
  if (!v) return v;
  if (typeof v !== "string") return v;
  if (v.startsWith("/uploads/")) return v;
  const m = v.match(/https?:\/\/[^/]+(\/uploads\/.*)$/i);
  if (m && m[1]) return m[1];
  return v;
}

function sanitizeDbPayload(db) {
  if (!db || typeof db !== "object") return db;
  const out = JSON.parse(JSON.stringify(db));
  if (Array.isArray(out.members)) {
    for (const m of out.members) {
      if (m && typeof m === "object") {
        if (typeof m.avatar === "string") {
          m.avatar = toRelativeUploadsUrl(m.avatar);
        }
        if (Array.isArray(m.officialPhotos)) {
          m.officialPhotos = m.officialPhotos.map((p) =>
            p && typeof p === "object" && typeof p.url === "string"
              ? { ...p, url: toRelativeUploadsUrl(p.url) }
              : p
          );
        }
      }
    }
  }
  if (Array.isArray(out.singles)) {
    for (const s of out.singles) {
      if (!s || typeof s !== "object") continue;
      if (typeof s.cover === "string") s.cover = toRelativeUploadsUrl(s.cover);
      if (Array.isArray(s.tracks)) {
        for (const t of s.tracks) {
          if (t && typeof t === "object" && typeof t.audio === "string") {
            t.audio = toRelativeUploadsUrl(t.audio);
          }
        }
      }
    }
  }
  if (Array.isArray(out.gallery)) {
    out.gallery = out.gallery.map((p) =>
      p && typeof p === "object" && typeof p.url === "string"
        ? { ...p, url: toRelativeUploadsUrl(p.url) }
        : p
    );
  }
  if (Array.isArray(out.playlists)) {
    out.playlists = out.playlists.map((pl) =>
      pl && typeof pl === "object" && typeof pl.cover === "string"
        ? { ...pl, cover: toRelativeUploadsUrl(pl.cover) }
        : pl
    );
  }
  return out;
}

async function apiGetData() {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) throw new Error("Failed to load data");
  return res.json();
}

async function apiSaveData(data) {
  const cleaned = sanitizeDbPayload(data);
  const res = await fetch(`${API_BASE}/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cleaned),
  });
  if (!res.ok) throw new Error("Failed to save data");
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.url;
}

async function uploadAudio(file) {
  const form = new FormData();
  form.append("audio", file);
  const res = await fetch(`${API_BASE}/upload-audio`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Upload audio failed");
  const json = await res.json();
  return json.url;
}

// Compress image on client before uploading.
// Strategy: resize to maxSide, then try quality tiers until blob < targetBytes.
function compressImage(file, maxSide = 1200, targetBytes = 350_000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (Math.max(width, height) > maxSide) {
        if (width >= height) { height = Math.round(height * maxSide / width); width = maxSide; }
        else { width = Math.round(width * maxSide / height); height = maxSide; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      const qualities = [0.82, 0.72, 0.62, 0.50];
      let qi = 0;
      const tryNext = () => {
        const q = qualities[qi++];
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("Compression failed")); return; }
          if (blob.size <= targetBytes || qi >= qualities.length) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            tryNext();
          }
        }, "image/jpeg", q);
      };
      tryNext();
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

function withRecomputedSelections(data) {
  const singles = Array.isArray(data?.singles) ? data.singles : [];
  const members = Array.isArray(data?.members) ? data.members : [];

  // 纪念单判定：当单曲 release 在成员毕业日之后（或未填写 release），且成员为非现役，并被选入该单曲站位
  const isOGPickedInSingle = (member, single) => {
    if (!member || !single) return false;
    if (member?.isActive) return false;
    const slots = Array.isArray(single?.asideLineup?.slots) ? single.asideLineup.slots : [];
    if (!slots.includes(member.id)) return false;
    const sRelease = isoDate(single?.release);
    const gd = isoDate(member?.graduationDate);
    // 未填 release：只要被选入且是毕业成员，就视作纪念单参与
    if (!sRelease) return true;
    // 未填毕业日：只要被选入且是毕业成员，也视作纪念单参与
    if (!gd) return true;
    return sRelease > gd;
  };

  const nextMembers = members.map((m) => {
    const prev =
      m?.selectionHistory && typeof m.selectionHistory === "object"
        ? m.selectionHistory
        : {};

    // 毕业成员：只保留毕业前（含毕业单曲）的记录
    const gradInfo =
      m?.isActive === false
        ? getLastSingleBeforeGrad(m, singles)
        : { lastSingleId: null, lastRelease: "" };
    const gradLimit = gradInfo?.lastRelease || "";

    // ✅ 关键：不再把 prev 整体拷贝进来，而是从当期 singles 重新生成
    const next = {};

    for (const s of singles) {
      const sid = s?.id;
      if (!sid) continue;

      const sRelease = isoDate(s?.release);
      // 毕业之后发行的单曲：默认不生成任何记录；但如果该成员以 OG 身份被选入（纪念单），则仍然生成
      if (gradLimit && sRelease && sRelease > gradLimit && !isOGPickedInSingle(m, s)) {
        continue;
      }

      const manual = (prev?.[sid] ?? "").toString().trim();
      // 允许在成员编辑里"手动标记为加入前"，此时不受站位影响
      if (manual.includes("加入前")) {
        next[sid] = "加入前";
        continue;
      }

      const lineup = s?.asideLineup || {};
      const slots = Array.isArray(lineup.slots) ? lineup.slots : [];
      const rowSizes = Array.isArray(lineup.rows) ? lineup.rows : [];
      const slotRoles =
        lineup.slotRoles && typeof lineup.slotRoles === "object"
          ? lineup.slotRoles
          : {};

      const slotIndex = slots.findIndex((x) => x === m.id);
      if (slotIndex === -1) {
        // 没出现在站位里：
        // - 对于毕业后的单曲，默认不记录；
        // - 对于毕业前（含毕业单曲）仍保持旧逻辑：记录为"落选"。
        if (gradLimit && sRelease && sRelease > gradLimit) {
          continue;
        }
        next[sid] = "落选";
        continue;
      }

      const rowFromBack = getRowFromBack(rowSizes, slotIndex);
      const rowCount = rowSizes.length || 1;
      const rowFromFront = rowCount - rowFromBack + 1;

      const roleRaw = slotRoles?.[slotIndex] ?? null;
      const role =
        roleRaw === "center"
          ? "center"
          : roleRaw === "guardian" || roleRaw === "护法"
          ? "护法"
          : "";

      next[sid] = `A面选拔（第${rowFromFront}排${role ? " " + role : ""}）`;
    }

    return { ...m, selectionHistory: next };
  });

  return { ...data, members: nextMembers };
}
// 兼容旧数据：早期 selectionHistory 可能以"标题/描述"作为 key。
// 这里把能识别出来的条目迁移成以 single.id 为 key（避免改标题后展示为空 & 避免重复）。
function migrateSelectionHistoryKeys(members, singles) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const extractTitleFromLegacyKey = (k) => {
    // 旧 key 形如："1st Single · Red Star Love A面选拔（第1排 center）"
    const parts = String(k || "").split("·").map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return parts.slice(1).join(" · ");
    return String(k || "");
  };
  const resolveSingleId = (k, v) => {
    if (!k) return v?.singleId || null;
    // 1) 已经是 id
    const byId = singles.find((s) => s.id === k);
    if (byId) return byId.id;
    // 2) value 里有 singleId
    if (v && typeof v === "object" && v.singleId) return v.singleId;
    // 3) 通过标题匹配
    const t = norm(extractTitleFromLegacyKey(k));
    const exact = singles.find((s) => norm(s.title) === t);
    if (exact) return exact.id;
    const included = singles.find((s) => t.includes(norm(s.title)) || norm(s.title).includes(t));
    return included ? included.id : null;
  };

  return (members || []).map((m) => {
    const hist = m.selectionHistory || {};
    const next = {};

    // 先放入已经是 id 的 key（优先级最高）
    for (const [k, v] of Object.entries(hist)) {
      if (singles.some((s) => s.id === k)) next[k] = v;
    }
    // 再处理 legacy key（只在目标 id 尚未存在时写入）
    for (const [k, v] of Object.entries(hist)) {
      if (singles.some((s) => s.id === k)) continue;
      const sid = resolveSingleId(k, v);
      if (sid && next[sid] == null) next[sid] = v;
      else if (!sid) next[k] = v;
    }

    return { ...m, selectionHistory: next };
  });
}

// ---------- Components ----------

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">页面渲染出错（已拦截，避免白屏）</div>
          <div className="mt-2 break-words whitespace-pre-wrap">
            {String(this.state.error || "")}
          </div>
          <div className="mt-2 text-xs text-red-700">
            请把控制台（Console）里第一条红色报错复制给我，我可以精准修复。
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-white text-[#1C1C1C]">
      {children}
      <footer className="border-t border-[#E0E0E0] py-10 mt-16">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between">
          <div className="text-xs text-[#6B6B6B]">
            <span className="font-semibold tracking-widest">XP</span>
            <span className="mx-2">·</span>
            <span>Official Website</span>
          </div>
          <div className="text-[10px] text-[#B0B0B0] tracking-wider">DATA SAVED VIA API</div>
        </div>
      </footer>
    </div>
  );
}

// ---- Playlist Helpers & Components ----

// Resolve playlist track refs into full QueueItems for playback
function resolvePlaylistTracks(playlist, singles) {
  if (!playlist?.tracks?.length) return [];
  return playlist.tracks
    .map(({ singleId, trackNo }) => {
      const single = singles?.find((s) => s.id === singleId);
      if (!single) return null;
      const track = single.tracks?.find((t) => t.no === trackNo);
      if (!track?.audio) return null;
      return {
        singleId: single.id,
        trackNo: track.no,
        title: track.title,
        singleTitle: single.title,
        coverUrl: resolveMediaUrl(single.cover),
        audioUrl: resolveMediaUrl(track.audio),
      };
    })
    .filter(Boolean);
}

function PlaylistBuilder({ singles, initialPlaylist, onSave, onClose }) {
  // initialPlaylist is null for create mode, or an existing playlist for edit mode
  const [title, setTitle] = useState(initialPlaylist?.title ?? "");
  const [cover, setCover] = useState(initialPlaylist?.cover ?? "");
  const [coverPreview, setCoverPreview] = useState(
    initialPlaylist?.cover ? resolveMediaUrl(initialPlaylist.cover) : null
  );
  const [uploading, setUploading] = useState(false);

  // selectedTracks: array of { singleId, trackNo } — order matters
  const [selectedTracks, setSelectedTracks] = useState(() => {
    if (!initialPlaylist?.tracks) return [];
    return initialPlaylist.tracks;
  });

  // DnD state
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const rowRefs = useRef([]);

  // All tracks with audio, sorted by single release desc then track no
  const allAudioTracks = useMemo(() => {
    const result = [];
    const sorted = [...(singles || [])].sort((a, b) => {
      const ta = Date.parse(a.release || "");
      const tb = Date.parse(b.release || "");
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    for (const single of sorted) {
      for (const track of (single.tracks || [])) {
        if (track.audio) {
          result.push({ singleId: single.id, trackNo: track.no, single, track });
        }
      }
    }
    return result;
  }, [singles]);

  const isSelected = (singleId, trackNo) =>
    selectedTracks.some((t) => t.singleId === singleId && t.trackNo === trackNo);

  const toggleTrack = (singleId, trackNo) => {
    if (isSelected(singleId, trackNo)) {
      setSelectedTracks((prev) => prev.filter((t) => !(t.singleId === singleId && t.trackNo === trackNo)));
    } else {
      setSelectedTracks((prev) => [...prev, { singleId, trackNo }]);
    }
  };

  const removeTrack = (idx) => {
    setSelectedTracks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Pointer-event drag-and-drop
  const handleDragPointerDown = (e, idx) => {
    e.preventDefault();
    setDragIndex(idx);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDragPointerMove = (e, idx) => {
    if (dragIndex === null) return;
    // Find drop index based on pointer Y vs row midpoints
    let newDrop = selectedTracks.length;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        newDrop = i;
        break;
      }
    }
    setDropIndex(newDrop);
  };

  const handleDragPointerUp = () => {
    if (dragIndex !== null && dropIndex !== null && dragIndex !== dropIndex) {
      setSelectedTracks((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(dragIndex, 1);
        const insertAt = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
        arr.splice(insertAt, 0, moved);
        return arr;
      });
    }
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleCoverFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const url = await uploadImage(compressed);
      setCover(url);
      setCoverPreview(resolveMediaUrl(url));
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const canSave = title.trim().length > 0 && selectedTracks.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const playlist = {
      id: initialPlaylist?.id ?? ("pl_" + uid()),
      title: title.trim(),
      cover,
      tracks: selectedTracks,
      createdAt: initialPlaylist?.createdAt ?? new Date().toISOString(),
    };
    onSave(playlist);
  };

  // Get resolved info for a selected track ref
  const getSelectedTrackInfo = (ref) => {
    const entry = allAudioTracks.find((e) => e.singleId === ref.singleId && e.trackNo === ref.trackNo);
    return entry ?? null;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-light text-[#1C1C1C]">
          {initialPlaylist ? "编辑歌单" : "新建歌单"}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: meta */}
        <div className="md:w-48 shrink-0">
          {/* Cover upload */}
          <label className="block cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />
            <div className={`aspect-square w-full flex items-center justify-center border ${uploading ? "border-[#E0E0E0]" : "border-dashed border-[#E0E0E0]"} bg-[#F7F7F7] overflow-hidden relative`}>
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#AAAAAA]">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px] tracking-[0.15em] uppercase">封面</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-[10px] text-[#6B6B6B] tracking-wider">上传中…</span>
                </div>
              )}
            </div>
          </label>
          {/* Title input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="歌单名称"
            className="mt-3 text-sm border-[#E0E0E0] focus:border-[#1C1C1C] rounded-none"
          />
        </div>

        {/* Right: track selection */}
        <div className="flex-1 min-w-0">
          {/* TRACKS section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Tracks</div>
          </div>

          {allAudioTracks.length === 0 ? (
            <div className="text-sm text-[#AAAAAA] py-4">暂无有音源的曲目</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {allAudioTracks.map(({ singleId, trackNo, single, track }) => {
                const selected = isSelected(singleId, trackNo);
                const kb = singleKindBadge(single.singleKind);
                return (
                  <div
                    key={`${singleId}-${trackNo}`}
                    onClick={() => toggleTrack(singleId, trackNo)}
                    className={`flex items-center gap-3 py-2.5 border-b border-[#E0E0E0] cursor-pointer ${selected ? "bg-[#F7F7F7]" : "hover:bg-[#FAFAFA]"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      className="shrink-0 accent-[#1C1C1C]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-[#AAAAAA] tracking-[0.08em]">
                        {splitSingleTitle(single.title).prefix}
                      </span>
                      <span className="text-[13px] text-[#1C1C1C] ml-2 tracking-[0.04em]">{track.title}</span>
                    </div>
                    {kb && (
                      <span className={`text-[10px] tracking-wider border px-1.5 py-0.5 shrink-0 ${kb.className}`}>
                        {kb.text}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* SELECTED TRACKS section */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#1C1C1C]" />
              <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">
                已选曲目 ({selectedTracks.length})
              </div>
            </div>

            {selectedTracks.length === 0 ? (
              <div className="text-sm text-[#AAAAAA] py-2">尚未选择曲目</div>
            ) : (
              <div>
                {selectedTracks.map((ref, idx) => {
                  const info = getSelectedTrackInfo(ref);
                  const isDragging = dragIndex === idx;
                  const isDropTarget = dropIndex === idx;
                  return (
                    <div key={`${ref.singleId}-${ref.trackNo}`}>
                      {/* Drop insertion line */}
                      {isDropTarget && (
                        <div className="h-0.5 bg-[#1C1C1C] mx-2 my-0.5" />
                      )}
                      <div
                        ref={(el) => { rowRefs.current[idx] = el; }}
                        className={`flex items-center gap-3 py-2.5 border-b border-[#E0E0E0] select-none ${isDragging ? "opacity-40" : ""}`}
                      >
                        {/* Drag handle — pointer events live here because setPointerCapture is called here */}
                        <div
                          className="shrink-0 cursor-grab text-[#CCCCCC] hover:text-[#888]"
                          style={{ touchAction: "none" }}
                          onPointerDown={(e) => handleDragPointerDown(e, idx)}
                          onPointerMove={(e) => handleDragPointerMove(e, idx)}
                          onPointerUp={handleDragPointerUp}
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        {/* Index */}
                        <span className="text-[10px] text-[#AAAAAA] w-5 shrink-0 text-right">{idx + 1}.</span>
                        {/* Title info */}
                        <div className="flex-1 min-w-0">
                          {info ? (
                            <>
                              <span className="text-[10px] text-[#AAAAAA]">{splitSingleTitle(info.single.title).prefix} · </span>
                              <span className="text-[13px] text-[#1C1C1C]">{info.track.title}</span>
                            </>
                          ) : (
                            <span className="text-[13px] text-[#AAAAAA]">（已删除）</span>
                          )}
                        </div>
                        {/* Remove */}
                        <button
                          onClick={() => removeTrack(idx)}
                          className="shrink-0 text-[#AAAAAA] hover:text-[#1C1C1C] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Drop line at end */}
                {dropIndex === selectedTracks.length && (
                  <div className="h-0.5 bg-[#1C1C1C] mx-2 my-0.5" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#E0E0E0]">
        <button
          onClick={onClose}
          className="border border-[#1C1C1C] text-[#1C1C1C] text-xs tracking-widest px-6 py-2.5 hover:bg-[#F0F0F0] transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`text-xs tracking-widest px-6 py-2.5 transition-colors ${canSave ? "bg-[#1C1C1C] text-white hover:bg-[#333]" : "bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed"}`}
        >
          保存
        </button>
      </div>
    </div>
  );
}

// PlaylistCard is at module scope (not inside PlaylistPage) to avoid React remounting on every render
function PlaylistCard({ pl, isLocal, singles, admin, onPlay, onEdit, onDelete }) {
  const trackCount = pl.tracks?.length ?? 0;
  const hasPlayable = resolvePlaylistTracks(pl, singles).length > 0;
  return (
    <div className="group relative">
      {/* Cover */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F7F7]">
        {pl.cover ? (
          <img
            src={resolveMediaUrl(pl.cover)}
            alt={pl.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ListMusic className="w-8 h-8 text-[#CCCCCC]" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPlay(pl)}
            disabled={!hasPlayable}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${hasPlayable ? "bg-[#1C1C1C] text-white hover:bg-[#333]" : "bg-[#E0E0E0] text-[#AAAAAA] cursor-not-allowed"}`}
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Admin/local controls */}
        {(admin || isLocal) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(pl, isLocal)}
              className="w-6 h-6 bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Pencil className="w-3 h-3 text-[#1C1C1C]" />
            </button>
            <button
              onClick={() => onDelete(pl.id, isLocal)}
              className="w-6 h-6 bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="mt-2">
        <div className="text-sm font-medium text-[#1C1C1C] leading-snug truncate">{pl.title}</div>
        <div className="text-[10px] text-[#AAAAAA] tracking-[0.08em] mt-0.5">{trackCount} 首</div>
      </div>
    </div>
  );
}

function PlaylistPage({ data, setData, admin, playQueue }) {
  const permanentPlaylists = data?.playlists ?? [];

  const [localPlaylists, setLocalPlaylists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("xjp56_playlists") ?? "[]");
    } catch {
      return [];
    }
  });

  const saveLocalPlaylists = (updated) => {
    setLocalPlaylists(updated);
    try {
      localStorage.setItem("xjp56_playlists", JSON.stringify(updated));
    } catch {}
  };

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [editingIsLocal, setEditingIsLocal] = useState(false);

  const openCreate = () => {
    setEditingPlaylist(null);
    setEditingIsLocal(!admin);
    setBuilderOpen(true);
  };

  const openEdit = (pl, isLocal) => {
    setEditingPlaylist(pl);
    setEditingIsLocal(isLocal);
    setBuilderOpen(true);
  };

  const handleSave = (pl) => {
    if (editingIsLocal) {
      const existing = localPlaylists.findIndex((p) => p.id === pl.id);
      if (existing >= 0) {
        const updated = [...localPlaylists];
        updated[existing] = pl;
        saveLocalPlaylists(updated);
      } else {
        saveLocalPlaylists([...localPlaylists, pl]);
      }
    } else {
      const existing = permanentPlaylists.findIndex((p) => p.id === pl.id);
      if (existing >= 0) {
        const updated = [...permanentPlaylists];
        updated[existing] = pl;
        setData((prev) => ({ ...prev, playlists: updated }));
      } else {
        setData((prev) => ({ ...prev, playlists: [...(prev.playlists ?? []), pl] }));
      }
    }
    setBuilderOpen(false);
  };

  const handleDelete = (id, isLocal) => {
    if (isLocal) {
      saveLocalPlaylists(localPlaylists.filter((p) => p.id !== id));
    } else {
      setData((prev) => ({ ...prev, playlists: prev.playlists.filter((p) => p.id !== id) }));
    }
  };

  const handlePlay = (pl) => {
    const items = resolvePlaylistTracks(pl, data?.singles);
    if (items.length) playQueue(items, 0);
  };

  const hasContent = permanentPlaylists.length > 0 || localPlaylists.length > 0;

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl">
      {/* Page header */}
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light text-[#1C1C1C] tracking-tight">歌单</h1>
          <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mt-1">PLAYLIST</div>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5 hover:bg-[#333] transition-colors"
        >
          新建歌单
        </button>
      </div>

      {!hasContent && (
        <div className="text-center py-20 text-sm text-[#AAAAAA]">暂无歌单</div>
      )}

      {/* Permanent playlists */}
      {permanentPlaylists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8 mb-12">
          {permanentPlaylists.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} isLocal={false} singles={data?.singles} admin={admin} onPlay={handlePlay} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Local playlists */}
      {localPlaylists.length > 0 && (
        <div>
          {permanentPlaylists.length > 0 && (
            <div className="border-t border-[#E0E0E0] mb-6 pt-6">
              <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4">本地歌单</div>
            </div>
          )}
          {permanentPlaylists.length === 0 && (
            <div className="text-[10px] tracking-[0.25em] text-[#AAAAAA] uppercase mb-4">本地歌单</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
            {localPlaylists.map((pl) => (
              <PlaylistCard key={pl.id} pl={pl} isLocal={true} singles={data?.singles} admin={admin} onPlay={handlePlay} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* PlaylistBuilder modal */}
      <Dialog open={builderOpen} onOpenChange={(open) => { if (!open) setBuilderOpen(false); }}>
        <ScrollDialogContent className="max-w-3xl">
          <PlaylistBuilder
            singles={data?.singles ?? []}
            initialPlaylist={editingPlaylist}
            onSave={handleSave}
            onClose={() => setBuilderOpen(false)}
          />
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

// ---- Gallery Page ----
function GalleryPage({ data, setData, admin }) {
  const photos = useMemo(
    () => [...(data.gallery || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [data.gallery]
  );

  const [lightbox, setLightbox] = useState(null); // photo object or null
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState(null);
  const [captionInput, setCaptionInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPendingPreview(url);
    setUploadError("");
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const compressed = await compressImage(pendingFile);
      const url = await uploadImage(compressed);
      const newPhoto = {
        id: uid(),
        url: toRelativeUploadsUrl(url),
        caption: captionInput.trim(),
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({ ...prev, gallery: [newPhoto, ...(prev.gallery || [])] }));
      // Reset
      setPendingFile(null);
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingPreview(null);
      setCaptionInput("");
      setUploadOpen(false);
    } catch (e) {
      setUploadError(e?.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id) => {
    setData((prev) => ({ ...prev, gallery: (prev.gallery || []).filter((p) => p.id !== id) }));
    if (lightbox?.id === id) setLightbox(null);
  };

  const handleCloseUpload = () => {
    if (uploading) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setCaptionInput("");
    setUploadError("");
    setUploadOpen(false);
  };

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[10px] tracking-[0.25em] font-medium text-[#AAAAAA] uppercase mb-1">
            GALLERY
          </div>
          <h1 className="text-2xl font-light tracking-tight text-[#1C1C1C]">相册</h1>
        </div>
        {admin && (
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 bg-[#1C1C1C] text-white text-xs tracking-widest px-5 py-2.5 hover:bg-[#333] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            上传照片
          </button>
        )}
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="py-24 text-center">
          <div className="text-[#D0D0D0] mb-3">
            <ImageIcon className="h-10 w-10 mx-auto" strokeWidth={1} />
          </div>
          <div className="text-sm text-[#AAAAAA] tracking-wide">暂无照片</div>
          {admin && (
            <div className="mt-4 text-xs text-[#C0C0C0]">点击右上角「上传照片」添加第一张</div>
          )}
        </div>
      )}

      {/* Masonry grid — CSS columns */}
      {photos.length > 0 && (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
          <AnimatePresence>
            {photos.map((photo, idx) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.4) }}
                className="break-inside-avoid mb-3 sm:mb-4 group cursor-pointer"
                onClick={() => setLightbox(photo)}
              >
                <div className="relative overflow-hidden bg-[#F7F7F7]">
                  <MediaImage
                    src={photo.url}
                    alt={photo.caption || ""}
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Admin delete overlay */}
                  {admin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                      className="absolute top-2 right-2 w-7 h-7 bg-white/90 border border-[#E0E0E0] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[#6B6B6B] hover:text-red-500" />
                    </button>
                  )}
                </div>
                {photo.caption && (
                  <div className="pt-1.5 pb-0.5 text-[11px] text-[#6B6B6B] leading-snug tracking-[0.02em]">
                    {photo.caption}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <ScrollDialogContent className="max-w-3xl">
          {lightbox && (
            <div className="flex flex-col items-center gap-4">
              <MediaImage
                src={lightbox.url}
                alt={lightbox.caption || ""}
                className="w-full h-auto max-h-[75vh] object-contain"
                eager
              />
              {lightbox.caption && (
                <div className="w-full text-center text-sm text-[#6B6B6B] leading-relaxed tracking-[0.02em] px-2">
                  {lightbox.caption}
                </div>
              )}
              <div className="text-[10px] text-[#AAAAAA] tracking-wider">
                {lightbox.createdAt ? new Date(lightbox.createdAt).toLocaleDateString("zh-CN") : ""}
              </div>
            </div>
          )}
        </ScrollDialogContent>
      </Dialog>

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!o) handleCloseUpload(); }}>
        <ScrollDialogContent className="max-w-lg">
          <div className="grid gap-6">
            <div className="flex items-center gap-3">
              <div className="w-5 h-px bg-[#1C1C1C]" />
              <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">上传照片</div>
            </div>

            {/* File picker / preview */}
            {!pendingPreview ? (
              <label className="flex flex-col items-center justify-center border border-dashed border-[#D0D0D0] py-14 cursor-pointer hover:bg-[#F7F7F7] transition-colors">
                <ImageIcon className="h-8 w-8 text-[#C0C0C0] mb-3" strokeWidth={1} />
                <span className="text-xs text-[#6B6B6B] tracking-wide">点击选择照片</span>
                <span className="text-[10px] text-[#AAAAAA] mt-1">JPG / PNG · 自动压缩</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="relative">
                <img src={pendingPreview} alt="" className="w-full h-auto max-h-64 object-contain bg-[#F7F7F7]" />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(pendingPreview);
                    setPendingPreview(null);
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 border border-[#E0E0E0] flex items-center justify-center hover:bg-[#F0F0F0]"
                >
                  <Minus className="h-3.5 w-3.5 text-[#6B6B6B]" />
                </button>
              </div>
            )}

            {/* Caption */}
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[#AAAAAA] uppercase mb-2">Caption</div>
              <Textarea
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                placeholder="输入照片说明（可选）"
                className="text-sm rounded-none border-[#E0E0E0] resize-none focus-visible:ring-0 focus-visible:border-[#1C1C1C]"
                rows={2}
              />
            </div>

            {uploadError && (
              <div className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">{uploadError}</div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCloseUpload}
                disabled={uploading}
                className="border border-[#1C1C1C] text-[#1C1C1C] text-xs tracking-widest px-6 py-2.5 hover:bg-[#F0F0F0] transition-colors disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={!pendingFile || uploading}
                className="bg-[#1C1C1C] text-white text-xs tracking-widest px-6 py-2.5 hover:bg-[#333] transition-colors disabled:opacity-40"
              >
                {uploading ? "上传中…" : "确认上传"}
              </button>
            </div>
          </div>
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function TopBar({ page, setPage, admin, setAdmin, onReset }) {
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const tabs = [
    { key: "home", cn: "主页", en: "HOME" },
    { key: "members", cn: "成员", en: "MEMBER" },
    { key: "singles", cn: "单曲", en: "SINGLES" },
    { key: "election", cn: "总选举", en: "ELECTION" },
    { key: "gallery", cn: "相册", en: "GALLERY" },
  ];
  const isActive = (key) => page === key || (page === "member-detail" && key === "members");

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E0E0E0]">
      <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => setPage("home")} className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L19.5 12L30 16L19.5 20L16 30L12.5 20L2 16L12.5 12Z" fill="#1C1C1C"/>
            </svg>
            <span className="text-[15px] font-bold tracking-[0.12em] text-[#1C1C1C] leading-none">XP</span>
          </div>
          {admin && (
            <span className="text-[9px] tracking-widest bg-[#1C1C1C] text-white px-2 py-0.5">ADMIN</span>
          )}
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setPage(t.key)}
              className={
                "flex flex-col items-center pb-1 border-b-2 transition-all duration-200 " +
                (isActive(t.key)
                  ? "border-[#1C1C1C]"
                  : "border-transparent hover:border-[#D0D0D0]")
              }
            >
              <span className={"text-sm font-medium leading-tight " + (isActive(t.key) ? "text-[#1C1C1C]" : "text-[#6B6B6B]")}>
                {t.cn}
              </span>
              <span className="text-[9px] tracking-[0.15em] text-[#B0B0B0] leading-tight">{t.en}</span>
            </button>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {isLocalhost && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs border border-[#E0E0E0] px-3 py-1.5 hover:bg-[#F0F0F0] transition-colors">
                <Settings className="h-3.5 w-3.5 text-[#6B6B6B]" />
                <span className="hidden sm:block text-[#6B6B6B]">{admin ? "管理员" : "设置"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white border border-[#E0E0E0] shadow-lg rounded-none p-0">
              <DropdownMenuLabel className="text-[10px] tracking-wider text-[#A0A0A0] px-3 py-2">控制台</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#E0E0E0] my-0" />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setAdmin((v) => !v); }}
                className="text-xs px-3 py-2 cursor-pointer hover:bg-[#F0F0F0] focus:bg-[#F0F0F0] rounded-none"
              >
                {admin ? "退出管理员" : "进入管理员"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#E0E0E0] my-0" />
              <DropdownMenuItem
                className="text-xs text-red-600 px-3 py-2 cursor-pointer hover:bg-red-50 focus:bg-red-50 rounded-none"
                onSelect={(e) => { e.preventDefault(); onReset(); }}
              >
                重置为示例数据
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="md:hidden flex items-center justify-center border border-[#E0E0E0] w-9 h-9 hover:bg-[#F0F0F0] transition-colors">
                <LayoutGrid className="h-4 w-4 text-[#6B6B6B]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-white border-l border-[#E0E0E0] rounded-none p-0">
              <SheetHeader className="px-6 py-5 border-b border-[#E0E0E0]">
                <SheetTitle className="text-sm font-medium text-[#1C1C1C]">导航</SheetTitle>
                <SheetDescription className="text-[10px] tracking-widest text-[#B0B0B0]">NAVIGATION</SheetDescription>
              </SheetHeader>
              <nav className="py-4">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setPage(t.key)}
                    className={
                      "w-full flex items-center justify-between px-6 py-3 text-sm transition-colors " +
                      (isActive(t.key)
                        ? "bg-[#1C1C1C] text-white"
                        : "hover:bg-[#F0F0F0] text-[#1C1C1C]")
                    }
                  >
                    <span className="font-medium">{t.cn}</span>
                    <span className={"text-[9px] tracking-widest " + (isActive(t.key) ? "text-white/50" : "text-[#B0B0B0]")}>{t.en}</span>
                  </button>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// ---- 无限横向滚动成员条 ----
function MemberMarquee({ members }) {

  if (!members.length) return null;
  const items = [...members, ...members];
  return (
    <div className="overflow-hidden border-b border-[#E0E0E0] bg-white">
      <div className="xp-marquee-track flex w-max py-5 gap-8 px-4">
        {items.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 w-16 shrink-0">
            <div className={"w-14 h-14 overflow-hidden bg-[#F0F0F0] " + (!m.isActive ? "grayscale opacity-60" : "")}>
              <MediaImage src={m.avatar} alt={m.name} className="w-full h-full object-cover object-top" />
            </div>
            <span className="text-[9px] text-[#6B6B6B] text-center leading-tight">{m.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Hero 区域 ----
function Hero({ singles, members, activeMembersCount, totalMembersCount, singlesCount, onGo }) {
  // Build carousel: latest first + 4 random others, chosen once per mount
  const slides = useMemo(() => {
    if (!singles.length) return [];
    const [latest, ...rest] = singles;
    const shuffled = [...rest].sort(() => Math.random() - 0.5).slice(0, 4);
    return [latest, ...shuffled];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [idx, setIdx] = useState(0);
  const current = slides[idx] || null;
  const { prefix, name } = current ? splitSingleTitle(current.title) : { prefix: "", name: "" };

  const prev = () => setIdx((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIdx((i) => (i + 1) % slides.length);

  return (
    <div>
      {/* Full-bleed hero image */}
      <div className="relative overflow-hidden" style={{ height: "72vh", minHeight: 360 }}>
        {/* Background slides */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            {current?.cover ? (
              <>
                {/* Base: heavily blurred fill for color tone */}
                <MediaImage
                  src={current.cover}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover scale-125"
                  eager
                  style={{ filter: "blur(40px) brightness(0.5) saturate(1.8)" }}
                />
                {/* Left accent: large cover bleeding in from left, medium blur */}
                <MediaImage
                  src={current.cover}
                  alt=""
                  aria-hidden="true"
                  className="absolute w-auto"
                  eager
                  style={{
                    height: "130%",
                    top: "50%",
                    left: "-8%",
                    transform: "translateY(-50%)",
                    filter: "blur(12px) brightness(0.8) saturate(1.4)",
                    opacity: 0.85,
                    mixBlendMode: "screen",
                  }}
                />
                {/* Right accent: mirrored cover bleeding in from right */}
                <MediaImage
                  src={current.cover}
                  alt=""
                  aria-hidden="true"
                  className="absolute w-auto"
                  eager
                  style={{
                    height: "130%",
                    top: "50%",
                    right: "-8%",
                    transform: "translateY(-50%) scaleX(-1)",
                    filter: "blur(12px) brightness(0.8) saturate(1.4)",
                    opacity: 0.85,
                    mixBlendMode: "screen",
                  }}
                />
                {/* Center vignette: fade side accents into center cleanly */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: "radial-gradient(ellipse 55% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.35) 100%)",
                  }}
                />
                {/* Crisp centered cover at native aspect ratio */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <MediaImage
                    src={current.cover}
                    alt={current.title}
                    className="h-full w-auto max-h-full object-contain"
                    eager
                    style={{ filter: "drop-shadow(0 0 48px rgba(0,0,0,0.7))" }}
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-[#1C1C1C]" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.05) 100%)" }}
        />

        {/* text content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-[10px] tracking-[0.25em] text-white/50 mb-3">
                {idx === 0 ? "XP · LATEST SINGLE" : "XP · SINGLE"}
              </div>
              {prefix && <div className="text-sm text-white/60 mb-1">{prefix}</div>}
              <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight leading-none">{name || "XP"}</h1>
              {current?.release && (
                <div className="mt-3 text-sm text-white/50 tracking-wider">{current.release.replace(/-/g, ".")}</div>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => onGo("singles")}
                  className="text-xs tracking-widest bg-white text-[#1C1C1C] px-6 py-2.5 hover:bg-[#F0F0F0] transition-colors"
                >
                  查看详情
                </button>
                <button
                  onClick={() => onGo("members")}
                  className="text-xs tracking-widest border border-white/40 text-white px-6 py-2.5 hover:bg-white/10 transition-colors"
                >
                  成员
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Arrow navigation */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-8 right-8 flex gap-2 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={"transition-all duration-300 rounded-full " + (i === idx ? "w-4 h-[3px] bg-white rounded-none" : "w-[3px] h-[3px] bg-white/40 hover:bg-white/70")}
              />
            ))}
          </div>
        )}
      </div>

      {/* Member scroll strip */}
      <MemberMarquee members={members.filter((m) => m.isActive)} />

      {/* Stats bar */}
      <div className="border-b border-[#E0E0E0] py-4">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-center gap-6 text-xs text-[#6B6B6B] tracking-wider">
          <span><span className="text-[#1C1C1C] font-medium">{activeMembersCount}</span> 位在籍成员</span>
          <span className="text-[#D0D0D0]">·</span>
          <span><span className="text-[#1C1C1C] font-medium">{totalMembersCount}</span> 位历代成员</span>
          <span className="text-[#D0D0D0]">·</span>
          <span><span className="text-[#1C1C1C] font-medium">{singlesCount}</span> 张单曲</span>
        </div>
      </div>
    </div>
  );
}

// ---- 总选举页面 ----
function ElectionPage({ data }) {
  const editions = useMemo(() => {
    const set = new Set();
    (data.members || []).forEach((m) =>
      (m.electionRanks || []).forEach((r) => { if (r.edition) set.add(r.edition); })
    );
    return [...set].sort((a, b) => parseEditionNum(a) - parseEditionNum(b));
  }, [data.members]);

  const [activeEdition, setActiveEdition] = useState(() => editions[editions.length - 1] ?? "");
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (editions.length && !editions.includes(activeEdition)) {
      setActiveEdition(editions[editions.length - 1]);
    }
  }, [editions]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevEdition = useMemo(() => {
    const idx = editions.indexOf(activeEdition);
    return idx > 0 ? editions[idx - 1] : null;
  }, [editions, activeEdition]);

  const rows = useMemo(() => {
    const editionNum = parseEditionNum(activeEdition);
    const threshold = editionNum >= 4 ? 22 : 20; // 第4届起22名圈外，之前20名圈外
    const result = [];
    (data.members || []).forEach((m) => {
      const entry = (m.electionRanks || []).find((r) => r.edition === activeEdition);
      if (!entry) return;
      const rankNum = parseRankNum(entry.rank);
      if (rankNum === Infinity || rankNum >= threshold) return; // 加入前、圈外 — 不显示
      result.push({ member: m, rank: entry.rank, rankNum });
    });
    result.sort((a, b) => a.rankNum - b.rankNum);
    return result;
  }, [data.members, activeEdition]);

  function getDelta(member, currRankNum) {
    if (!prevEdition) return null;
    const prev = (member.electionRanks || []).find((r) => r.edition === prevEdition);
    if (!prev) return { type: "new" };
    const pv = (prev.rank ?? "").toString().trim();
    if (pv === "加入前") return { type: "joinBefore" };
    const prevNum = parseRankNum(pv);
    if (prevNum === 9999) return { type: "outside" };
    if (!Number.isFinite(prevNum) || !Number.isFinite(currRankNum)) return null;
    const diff = prevNum - currRankNum;
    if (diff > 0) return { type: "up", diff };
    if (diff < 0) return { type: "down", diff: Math.abs(diff) };
    return { type: "same" };
  }

  return (
    <div className="px-4 py-8 mx-auto max-w-3xl">
      {/* Section label */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-5 h-px bg-[#1C1C1C]" />
        <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">General Election</div>
      </div>

      {/* Edition picker */}
      {editions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {editions.map((ed) => (
            <button
              key={ed}
              onClick={() => setActiveEdition(ed)}
              className={
                "text-xs tracking-wider px-4 py-1.5 border transition-colors " +
                (ed === activeEdition
                  ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                  : "border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]")
              }
            >
              {ed}
            </button>
          ))}
        </div>
      )}

      {/* Big title — fades when edition changes */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEdition + "_title"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="text-center my-10 md:my-14"
        >
          <div className="text-3xl md:text-5xl font-light text-[#1C1C1C] tracking-tight">
            XP{activeEdition}总选举
          </div>
          {ELECTION_SUBTITLES[activeEdition] && (
            <div className="mt-3 text-sm text-[#6B6B6B] tracking-[0.25em]">
              ～{ELECTION_SUBTITLES[activeEdition]}～
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Rank list — staggered entry, fades on edition switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEdition + "_list"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {rows.length === 0 ? (
            <div className="text-sm text-[#AAAAAA] text-center py-16">暂无数据</div>
          ) : (
            <div>
              {rows.map(({ member, rankNum }, i) => {
                const delta = getDelta(member, rankNum);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    onClick={() => setSelectedMember(member)}
                    className="flex items-center gap-4 sm:gap-6 py-3.5 border-b border-[#E0E0E0] last:border-b-0 cursor-pointer hover:bg-[#F7F7F7] transition-colors px-2 -mx-2"
                  >
                    {/* 排名 */}
                    <div className="w-8 shrink-0 text-center">
                      <span className="text-xl font-light text-[#1C1C1C] tabular-nums leading-none">
                        {String(rankNum).padStart(2, "0")}
                      </span>
                    </div>

                    {/* 头像 */}
                    <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 overflow-hidden bg-[#F0F0F0]">
                      {(member.avatar || member.officialPhotos?.length > 0) ? (
                        <MediaImage
                          src={getOfficialPhotoUrl(member, isEditionNewContext(activeEdition))}
                          alt={member.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#E0E0E0]" />
                      )}
                    </div>

                    {/* 期数 + 姓名 + romaji */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {member.generation && (
                          <span
                            style={generationBadgeStyle(member.generation)}
                            className={generationBadgeClass(member.generation)}
                          >
                            {member.generation}
                          </span>
                        )}
                        <span className="text-sm font-medium text-[#1C1C1C] tracking-[0.04em]">
                          {member.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#AAAAAA] tracking-[0.08em] mt-0.5">
                        {member.romaji}
                      </div>
                    </div>

                    {/* 上届变化 */}
                    <div className="shrink-0 w-12 sm:w-16 flex items-center justify-end">
                      {delta === null && <span className="text-xs text-[#AAAAAA]">—</span>}
                      {delta?.type === "new" && <span className="text-[10px] tracking-wider text-[#AAAAAA]">NEW</span>}
                      {delta?.type === "joinBefore" && <span className="text-[10px] tracking-wider text-[#AAAAAA]">加入前</span>}
                      {delta?.type === "outside" && <span className="text-[10px] tracking-wider text-[#AAAAAA]">圈外</span>}
                      {delta?.type === "same" && <span className="text-xs text-[#AAAAAA]">—</span>}
                      {delta?.type === "up" && (
                        <span className="flex items-center gap-0.5 text-rose-500">
                          <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-medium tabular-nums">{delta.diff}</span>
                        </span>
                      )}
                      {delta?.type === "down" && (
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-medium tabular-nums">{delta.diff}</span>
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Member detail modal */}
      <Dialog open={!!selectedMember} onOpenChange={(v) => { if (!v) setSelectedMember(null); }}>
        <ScrollDialogContent className="max-w-4xl">
          <MemberDetailContent member={selectedMember} data={data} />
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div className="text-2xl font-light text-[#1C1C1C] tracking-tight">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-[#6B6B6B]">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

function ImageUploader({ label, value, onChange, hint }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-[#6B6B6B]">{hint}</div> : null}
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <div className="overflow-hidden border border-[#E0E0E0] bg-white">
          {value ? (
            <MediaImage
              src={value}
              alt="preview"
              className="h-[140px] w-[140px] object-cover bg-[#F0F0F0]"
            />
          ) : (
            <div className="grid h-[140px] w-[140px] place-items-center text-[#6B6B6B]">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = await uploadImage(file);
              onChange(url);
              e.target.value = "";
            }}
          />
          <div className="text-xs text-[#6B6B6B]">
            上传后会上传到后端并自动压缩（前端只保存 URL）。
          </div>
        </div>
      </div>
    </div>
  );
}

function OfficialPhotosEditor({ photos, displayAvatar, onChangePhotos, onChangeAvatar }) {
  const safePhotos = Array.isArray(photos) ? photos : [];
  // 若 officialPhotos 为空但 avatar 存在，把 avatar 视为隐式第一版
  const hasImplicitV1 = safePhotos.length === 0 && !!displayAvatar;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    // 若 officialPhotos 为空，先把现有 avatar 迁入为第一版，新图为第二版
    const base = hasImplicitV1 ? [{ url: displayAvatar, version: 1 }] : safePhotos;
    const nextVersion = base.length > 0 ? Math.max(...base.map((p) => p.version || 0)) + 1 : 1;
    const newPhoto = { url, version: nextVersion };
    const next = [...base, newPhoto];
    onChangePhotos(next);
    onChangeAvatar(url);
    e.target.value = "";
  };

  const handleDelete = (version) => {
    const deleted = safePhotos.find((p) => p.version === version);
    const next = safePhotos.filter((p) => p.version !== version);
    onChangePhotos(next);
    if (deleted && deleted.url === displayAvatar) {
      onChangeAvatar(next.length > 0 ? next[next.length - 1].url : "");
    }
  };

  const handleSetDisplay = (url) => {
    onChangeAvatar(url);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">公式照</div>
        <div className="text-xs text-[#6B6B6B]">最新上传的默认展示</div>
      </div>

      {/* 显示照片列表：officialPhotos 有内容时用它，否则把 avatar 显示为第一版 */}
      {(safePhotos.length > 0 || hasImplicitV1) && (
        <div className="flex flex-wrap gap-3">
          {(safePhotos.length > 0 ? safePhotos : [{ url: displayAvatar, version: 1, _implicit: true }]).map((photo) => {
            const isDisplay = photo.url === displayAvatar || safePhotos.length === 1;
            const versionLabel = `第${photo.version}版`;
            return (
              <div key={photo.version} className="flex flex-col items-center gap-1">
                <div
                  className={
                    "relative overflow-hidden border bg-[#F0F0F0] " +
                    (isDisplay ? "border-[#1C1C1C] ring-1 ring-[#1C1C1C]" : "border-[#E0E0E0]")
                  }
                  style={{ width: 80, height: 107 }}
                >
                  <MediaImage
                    src={photo.url}
                    alt={versionLabel}
                    className="h-full w-full object-cover object-top"
                  />
                  {isDisplay && (
                    <div className="absolute bottom-0 left-0 right-0 bg-[#1C1C1C]/80 text-white text-[9px] tracking-wider text-center py-0.5">
                      展示中
                    </div>
                  )}
                </div>
                <div className="text-[10px] tracking-[0.15em] text-[#6B6B6B]">{versionLabel}</div>
                {/* 隐式第一版（尚未迁入 officialPhotos）只读，无操作按钮 */}
                {!photo._implicit && (
                  <div className="flex gap-1">
                    {!isDisplay && (
                      <button
                        type="button"
                        onClick={() => handleSetDisplay(photo.url)}
                        className="text-[9px] px-1.5 py-0.5 border border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#F0F0F0] tracking-wider"
                      >
                        展示
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.version)}
                      className="text-[9px] px-1.5 py-0.5 border border-[#E0E0E0] text-[#6B6B6B] hover:border-red-300 hover:text-red-600 tracking-wider"
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />
        <div className="text-xs text-[#6B6B6B]">
          上传后自动设为展示版（第{hasImplicitV1 ? 2 : safePhotos.length + 1}版）。上传到后端并保存 URL。
        </div>
      </div>
    </div>
  );
}

function AudioUploader({ label, value, onChange, hint }) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-[#6B6B6B]">{hint}</div> : null}
      </div>
      <div className="grid gap-2">
        <Input
          type="file"
          accept="audio/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const url = await uploadAudio(file);
            onChange(url);
            e.target.value = "";
          }}
        />
        <div className="text-xs text-[#6B6B6B]">
          {value ? "已上传音源（可播放）。" : "未上传音源。"}
          {" "}
          （音频将上传到服务器）
        </div>
        {value ? <audio className="w-full" controls preload="none" src={resolveMediaUrl(value)} /> : null}
      </div>
    </div>
  );
}


function OfficialPhotosGalleryDialog({ open, onClose, photos, displayAvatar }) {
  const safePhotos = Array.isArray(photos) && photos.length > 0
    ? photos
    : displayAvatar ? [{ url: displayAvatar, version: 1 }] : [];

  const count = safePhotos.length;

  const gridClass = count === 1
    ? "flex justify-center"
    : count === 2
    ? "grid grid-cols-2 gap-4 sm:gap-8"
    : "grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <ScrollDialogContent className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-5 h-px bg-[#1C1C1C]" />
          <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Official Photos</div>
        </div>

        {safePhotos.length === 0 ? (
          <div className="text-sm text-[#6B6B6B] text-center py-8">暂无公式照</div>
        ) : (
          <div className={gridClass}>
            {safePhotos.map((photo) => {
              const versionLabel = `第${photo.version}版`;
              const isDisplay = photo.url === displayAvatar;
              return (
                <div
                  key={photo.version}
                  className={
                    "flex flex-col items-center gap-2 " +
                    (count === 1 ? "max-w-[200px] sm:max-w-[240px] w-full" : "w-full")
                  }
                >
                  <div className="overflow-hidden bg-[#F0F0F0] w-full">
                    <MediaImage
                      src={photo.url}
                      alt={versionLabel}
                      className="aspect-[3/4] w-full object-cover object-top"
                    />
                  </div>
                  <div className="text-center w-full">
                    <div className="text-[10px] tracking-[0.25em] text-[#6B6B6B] uppercase">{versionLabel}</div>
                    {isDisplay && (
                      <div className="mt-1 w-full h-px bg-[#1C1C1C]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {safePhotos.length > 1 && (
          <div className="mt-6 text-[10px] text-[#AAAAAA] tracking-wider text-center">
            下划线标注为当前展示版
          </div>
        )}
      </ScrollDialogContent>
    </Dialog>
  );
}

// DialogContent wrapper: fixed height + inner scroll (prevents dialogs being cut off)
function ScrollDialogContent({ className = "", children, ...props }) {
  const base =
    "left-1/2 top-[3vh] -translate-x-1/2 translate-y-0 " +
    "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[94vh] overflow-hidden p-0 " +
    "rounded-none border border-[#E0E0E0] bg-white text-[#1C1C1C] shadow-lg";
  return (
    <DialogContent {...props} className={`${base} ${className}`}>
      <div className="overflow-y-auto overflow-x-hidden h-full max-h-[94vh] p-4 sm:p-6 w-full box-border">{children}</div>
    </DialogContent>
  );
}

// ---- 成员详情内容（MembersPage 和 ElectionPage 共用）----
function MemberDetailContent({ member, data }) {
  if (!member) return null;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const officialPhotos = Array.isArray(member.officialPhotos) ? member.officialPhotos : [];
  const hasMultiplePhotos = officialPhotos.length > 1;
  const generationNum = parseInt(String(member?.generation || "").match(/\d+/)?.[0], 10);
  const shouldShowAdmireSenior = Number.isFinite(generationNum) && generationNum >= 2;
  const favoriteSongs = Array.isArray(member?.favoriteSongs)
    ? member.favoriteSongs.filter((x) => typeof x === "string" && x.trim())
    : (member?.favoriteSong ? [member.favoriteSong] : []);
  return (
    <div className="grid gap-10">

      {/* Name + romaji — centered */}
      <div className="text-center">
        <div className="text-2xl font-light text-[#1C1C1C] tracking-tight">
          {member.name}{!member.isActive ? " - 卒业" : ""}
        </div>
        {member.romaji ? (
          <div className="text-[11px] tracking-[0.2em] text-[#6B6B6B] mt-1">{member.romaji}</div>
        ) : null}
        <div className="text-xs text-[#6B6B6B] mt-1">
          {[member.origin, member.generation].filter(Boolean).join(" · ")}
        </div>
      </div>

      {/* Centered portrait photo */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className={
            "overflow-hidden bg-[#F0F0F0] w-full max-w-[200px] sm:max-w-[240px] " +
            (hasMultiplePhotos ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-default") +
            (!member.isActive ? " grayscale opacity-80" : "")
          }
          onClick={() => { if (hasMultiplePhotos) setGalleryOpen(true); }}
          title={hasMultiplePhotos ? "点击查看全部公式照" : undefined}
        >
          <MediaImage
            src={member.avatar}
            alt={member.name}
            className="aspect-[3/4] w-full object-cover object-top"
          />
        </button>
        {hasMultiplePhotos && (
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            className="text-[10px] tracking-[0.2em] text-[#AAAAAA] hover:text-[#1C1C1C] transition-colors uppercase"
          >
            查看全部公式照 ({officialPhotos.length})
          </button>
        )}
        {officialPhotos.length === 1 && (
          <div className="text-[10px] tracking-[0.15em] text-[#AAAAAA]">第1版</div>
        )}
      </div>

      <OfficialPhotosGalleryDialog
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={officialPhotos}
        displayAvatar={member.avatar}
      />

      {/* PROFILE */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-px bg-[#1C1C1C]" />
          <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Profile</div>
        </div>
        <div>
          {[
            ["身高", member.profile?.height],
            ["生日", member.profile?.birthday],
            ["血型", member.profile?.blood],
            ["爱好", member.profile?.hobby],
            ["特长", member.profile?.skill],
            ...(!member.isActive && member.graduationDate
              ? [["毕业", isoDate(member.graduationDate) + ((member.graduationSongTitle || "").trim() && (member.graduationSongTitle || "").trim() !== "无" ? " · " + member.graduationSongTitle : "")]]
              : []),
          ].filter(([, v]) => v).map(([label, value], i) => (
            <div
              key={label}
              className="flex items-baseline gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0"
            >
              <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-10 shrink-0">{label}</span>
              <span className="text-[13px] text-[#1C1C1C] tracking-[0.04em]">{value}</span>
            </div>
          ))}
          {member.profile?.catchphrase ? (
            <div className="flex items-baseline gap-6 py-2.5">
              <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-10 shrink-0">口号</span>
              <span className="text-[13px] text-[#1C1C1C] tracking-[0.04em] leading-relaxed">{member.profile.catchphrase}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ELECTION */}
      {(member.electionRanks || []).length ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Election</div>
          </div>
          <div>
            {(member.electionRanks || []).map((r, idx) => {
              const b = getElectionBadge(r.rank, r.edition);
              return (
                <div
                  key={`${r.edition || ""}-${r.rank || ""}-${idx}`}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-[#E0E0E0] last:border-b-0"
                >
                  <span className="text-[13px] text-[#6B6B6B] tracking-[0.04em] shrink-0">{r.edition || "—"}</span>
                  <span className={"inline-flex items-center border px-2 py-0.5 text-[10px] font-medium shrink-0 " + b.className}>{b.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* FAVORITES */}
      {(shouldShowAdmireSenior && Array.isArray(member.admireSenior) && member.admireSenior.length) || (Array.isArray(member.friends) && member.friends.length) || favoriteSongs.length ? (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Favorites</div>
          </div>
          <div>
            {shouldShowAdmireSenior && Array.isArray(member.admireSenior) && member.admireSenior.length ? (
              <div className="flex items-baseline gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0">
                <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-14 shrink-0">前辈</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {member.admireSenior.map((id) => {
                    const mm = (data.members || []).find((x) => x.id === id);
                    return mm ? <span key={id} className="text-[13px] text-[#1C1C1C] tracking-[0.04em]">{mm.name}</span> : null;
                  })}
                </div>
              </div>
            ) : null}
            
            {Array.isArray(member.friends) && member.friends.length ? (
              <div className="flex items-baseline gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0">
                <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-14 shrink-0">亲友</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {member.friends.map((id) => {
                    const mm = (data.members || []).find((x) => x.id === id);
                    return mm ? (
                      <span key={id} className="text-[13px] text-[#1C1C1C] tracking-[0.04em]">{mm.name}</span>
                    ) : null;
                  })}
                </div>
              </div>
            ) : null}

            {favoriteSongs.length ? (
              <div className="flex items-baseline gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0">
                <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-14 shrink-0">歌曲</span>
                <div className="min-w-0 flex-1 grid gap-2">
                  {favoriteSongs.slice(0, 3).map((song, idx) => {
                    const single = (data.singles || []).find((sg) =>
                      (sg.tracks || []).some((t) => (typeof t === "string" ? t : t?.title) === song)
                    );
                    const sp = single ? splitSingleTitle(single.title) : null;
                    const singleName = sp?.prefix ? `${sp.prefix} · ${sp.name}` : single?.title;
                    return (
                      <div
                        key={`${song}-${idx}`}
                        className="min-w-0 pt-3 border-t border-[#E5E5E5] first:border-t-0 first:pt-0"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F7F7F7] text-[#6B6B6B]">
                            <Music className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] text-[#1C1C1C] tracking-[0.04em] break-words leading-6">
                              {song}
                            </div>
                            {singleName ? (
                              <div className="mt-1">
                                <Badge className="rounded-full border-[#E5E5E5] bg-[#F7F7F7] px-2 py-0.5 text-[10px] font-normal tracking-[0.04em] text-[#6B6B6B] hover:bg-[#F7F7F7]">
                                  收录于 {singleName}
                                </Badge>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* DISCOGRAPHY */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-px bg-[#1C1C1C]" />
          <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Discography</div>
        </div>
        {(() => {
          const raw = member?.selectionHistory || {};
          const gradLast = (!member?.isActive && member?.graduationDate)
            ? getLastSingleBeforeGrad(member, data?.singles || [])
            : { lastSingleId: null, lastRelease: "" };
          const lastSingleIdBeforeGrad = gradLast.lastSingleId;
          const entries = Object.entries(raw).map(([k, v]) => {
            if (v && typeof v === "object") return { k, label: v.label ?? k, value: v.value ?? "" };
            return { k, label: k, value: String(v ?? "") };
          });
          if (entries.length === 0) return <div className="text-sm text-[#6B6B6B]">—</div>;

          // ---- 动态统计 ----
          let selectionCount = 0;
          let fukujinCount = 0;
          let guardianCount = 0;
          let centerCount = 0;
          let centerSoloCount = 0;
          entries.forEach(({ k, value }) => {
            if (!value.includes("A面")) return;
            selectionCount++;
            const rowM = value.match(/第(\d+)排/);
            const rowNum = rowM ? Number(rowM[1]) : null;
            const isCenter = value.includes("center");
            const isGuardian = value.includes("护法") || value.includes("guardian");
            if (rowNum && rowNum <= 2) fukujinCount++;
            if (isGuardian) guardianCount++;
            if (isCenter) {
              const totalCenters = (data?.members || []).reduce((acc, mm) => {
                const vv = mm?.selectionHistory?.[k];
                const sv = vv && typeof vv === "object" ? String(vv.value ?? "") : String(vv ?? "");
                return sv.includes("center") ? acc + 1 : acc;
              }, 0);
              if (totalCenters === 1) centerSoloCount++;
              centerCount += totalCenters > 0 ? 1 / totalCenters : 1;
            }
          });
          const fmtCenter = parseFloat(centerCount.toFixed(2)).toString();

          return (
            <div>
              {/* 统计摘要 */}
              {(
                <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 py-3 mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase">选拔</span>
                    <span className="text-base font-light text-[#1C1C1C] tabular-nums leading-none">{selectionCount}</span>
                  </div>
                  {fukujinCount > 0 && (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase">福神</span>
                      <span className="text-base font-light text-[#1C1C1C] tabular-nums leading-none">{fukujinCount}</span>
                    </div>
                  )}
                  {guardianCount > 0 && (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase">护法</span>
                      <span className="text-base font-light text-[#1C1C1C] tabular-nums leading-none">{guardianCount}</span>
                    </div>
                  )}
                  {centerCount > 0 && (
                    <div className="flex items-baseline gap-1.5 px-2 py-0.5 bg-amber-50">
                      <span className="text-[10px] tracking-[0.15em] text-amber-600 uppercase">Center</span>
                      <span className="text-base font-light text-amber-700 tabular-nums leading-none">{fmtCenter}</span>
                      {centerSoloCount > 0 && <span className="text-[10px] text-amber-500 leading-none">({centerSoloCount})</span>}
                    </div>
                  )}
                </div>
              )}
              {entries.map(({ k, label, value }, rowIdx) => {
                const singleObj = (data?.singles || []).find((s) => s.id === k);
                let title = (singleObj?.title ?? label ?? "").toString();
                const parts = title.split("·").map((s) => s.trim()).filter(Boolean);
                if (parts.length >= 3) title = parts.slice(parts.length - 2).join(" · ");
                const { prefix, name } = splitSingleTitle(title);
                const pickType = value.includes("加入前") ? "加入前"
                  : value.includes("A面") ? "A面选拔"
                  : value.includes("B面") ? "B面"
                  : value.includes("落选") || value.includes("未入选") ? "落选"
                  : "";
                const typeTagClass = pickType === "A面选拔" ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : pickType === "B面" ? "border-sky-200 bg-sky-50 text-sky-800"
                  : pickType === "加入前" ? "border-violet-200 bg-violet-50 text-violet-800"
                  : "border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B]";
                const rowM = value.match(/第(\d+)排/);
                const rowNum = rowM ? Number(rowM[1]) : null;
                const role = value.includes("center") ? "center"
                  : value.includes("护法") || value.includes("guardian") ? "guardian"
                  : null;
                const top2Count = rowNum && rowNum <= 2
                  ? (data?.members || []).reduce((acc, mm) => {
                      const vv = mm?.selectionHistory?.[k];
                      const s = vv && typeof vv === "object" ? String(vv.value ?? "") : String(vv ?? "");
                      const rm = s.match(/第(\d+)排/);
                      const rn = rm ? Number(rm[1]) : null;
                      return rn && rn <= 2 ? acc + 1 : acc;
                    }, 0)
                  : 0;
                const rowTagText = role === "center" || role === "guardian" ? ""
                  : rowNum && rowNum <= 2 && top2Count ? `${top2Count}福神` : "";
                const isFukujinRowTag = typeof rowTagText === "string" && /福神$/.test(rowTagText);
                const tagNodes = pickType === "加入前" ? (
                  <span className={"inline-flex items-center border px-1.5 py-0.5 text-[10px] " + typeTagClass}>加入前</span>
                ) : <>
                  {pickType === "落选" ? (
                    <span className={"inline-flex items-center border px-1.5 py-0.5 text-[10px] " + typeTagClass}>落选</span>
                  ) : null}
                  {pickType === "A面选拔" && !rowTagText && !role ? (
                    <span className={"inline-flex items-center border px-1.5 py-0.5 text-[10px] " + typeTagClass}>A面选拔</span>
                  ) : null}
                  {rowTagText ? (
                    <span className={"inline-flex items-center border px-1.5 py-0.5 text-[10px] " + (isFukujinRowTag ? "border-rose-200 bg-rose-50 text-rose-700" : "border-[#E0E0E0] text-[#6B6B6B]")}>{rowTagText}</span>
                  ) : null}
                  {role === "center" ? (
                    <span className="inline-flex items-center border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">CENTER</span>
                  ) : role === "guardian" ? (
                    <span className="inline-flex items-center border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">护法</span>
                  ) : null}
                </>;
                return (
                  <div key={k} className="py-2.5 md:py-3.5 border-b border-[#E0E0E0] last:border-b-0">
                    {/* 手机：两行布局 */}
                    <div className="flex md:hidden items-baseline gap-1.5 mb-1">
                      <span className="text-[10px] tracking-wider text-[#6B6B6B]">{prefix || ""}</span>
                      <span className="text-[10px] tracking-[0.08em] text-[#AAAAAA]">{singleObj?.singleKind || "常规单曲"}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-5">
                      {/* 桌面：编号 + 类型列 */}
                      <div className="hidden md:block text-[11px] tracking-wider text-[#6B6B6B] shrink-0 w-20">{prefix || ""}</div>
                      <div className="hidden md:block text-[10px] tracking-[0.08em] text-[#AAAAAA] shrink-0 w-16">{singleObj?.singleKind || "常规单曲"}</div>
                      <div className="text-[13px] text-[#1C1C1C] flex-1 min-w-0 truncate tracking-[0.04em]">{name}</div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">{tagNodes}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

function MembersPage({ data, setData, admin }) {
  const [selected, setSelected] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active"); // all | active | inactive
  const [genFilter, setGenFilter] = useState("all"); // all | "1期" | "2期" ...

  const members = data.members;

  const generations = useMemo(() => {
    const set = new Set();
    members.forEach((m) => {
      const g = (m.generation ?? "").toString().trim();
      if (g) set.add(g);
    });
    const arr = Array.from(set);
    // 尽量按数字期排序：1期,2期...
    arr.sort((a, b) => {
      const na = parseInt(String(a).replace(/\D/g, ""), 10);
      const nb = parseInt(String(b).replace(/\D/g, ""), 10);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return arr;
  }, [members]);

  const filteredMembers = useMemo(() => {
    let list = members;
    if (statusFilter === "active") list = list.filter((m) => m.isActive);
    if (statusFilter === "inactive") list = list.filter((m) => !m.isActive);
    if (genFilter !== "all") list = list.filter((m) => (m.generation ?? "").toString().trim() === genFilter);
    return list;
  }, [members, statusFilter, genFilter]);

  const openEdit = (m) => {
    setEditing(
      m ?? {
        id: `m_${uid()}`,
        name: "",
        romaji: "",
        origin: "",
        generation: "",
        avatar: "",
        officialPhotos: [],
        isActive: true,
        graduationDate: "",
        // 总选举顺位：[{ edition: "第一届", rank: "一位" }, ...]
        electionRanks: [],
        profile: {
          height: "",
          birthday: "",
          blood: "",
          hobby: "",
          skill: "",
          catchphrase: "",
        },
        selectionHistory: {
          "1st Single": "",
          "2nd Single": "",
        },
      }
    );
    setEditorOpen(true);
  };

  const saveMember = () => {
    // 切换到毕业（isActive === false）时，必须填写毕业日期与毕业曲（可以写"无"）
    if (editing && editing.isActive === false) {
      const gd = isoDate(editing.graduationDate);
      if (!gd) {
        // eslint-disable-next-line no-alert
        alert("请先填写毕业日期（YYYY-MM-DD）");
        return;
      }
      const gTitle = (editing.graduationSongTitle || "").toString().trim();
      if (!gTitle) {
        // eslint-disable-next-line no-alert
        alert("请填写毕业曲的 title（填写'无'表示没有毕业曲且在成员界面不显示)");
        return;
      }
    }
    setData((prev) => {
      const exists = prev.members.some((x) => x.id === editing.id);
      const nextMembers = exists
        ? prev.members.map((x) =>
            x.id === editing.id ? editing : x
          )
        : [...prev.members, editing];

      return withRecomputedSelections({
        ...prev,
        members: nextMembers,
      });
    });
    setEditorOpen(false);
  };


  const deleteMember = (id) => {
    setData((prev) => {
      const nextMembers = prev.members.filter((m) => m.id !== id);
      // 同时把单曲站位里引用的成员清掉
      const nextSingles = prev.singles.map((s) => ({
        ...s,
        asideLineup: {
          ...s.asideLineup,
          slots: s.asideLineup.slots.map((mid) =>
            mid === id ? null : mid
          ),
        },
      }));

      return withRecomputedSelections({
        ...prev,
        members: nextMembers,
        singles: nextSingles,
      });
    });
  };

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl">
      <SectionHeader
        right={
          admin ? (
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新增成员
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "全部" },
          { key: "active", label: "在籍" },
          { key: "inactive", label: "毕业" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={
              "text-xs tracking-wider px-3 py-1 border transition-colors " +
              (statusFilter === key
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]")
            }
          >
            {label}
          </button>
        ))}

        <div className="mx-2 h-4 w-px bg-[#E0E0E0]" />

        {[{ key: "all", label: "全部期" }, ...generations.map((g) => ({ key: g, label: g }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGenFilter(key)}
            className={
              "text-xs tracking-wider px-3 py-1 border transition-colors " +
              (genFilter === key
                ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                : "border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]")
            }
          >
            {label}
          </button>
        ))}

        <div className="ml-auto text-xs text-[#6B6B6B]">
          共 {filteredMembers.length} 人
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredMembers.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="group overflow-hidden">
              <div className="relative">
                <button className="block w-full" onClick={() => setSelected(m)}>
                  <MediaImage
                    src={m.avatar}
                    alt={m.name}
                    className={"aspect-[3/4] w-full object-cover object-top bg-[#F0F0F0] transition duration-300 group-hover:scale-[1.02] " + (!m.isActive ? "grayscale opacity-70" : "")}
                  />
                </button>
                <div className="absolute left-2 top-2 flex gap-1">
                  <span className={generationBadgeClass(m.generation)} style={generationBadgeStyle(m.generation)}>
                    {m.generation}
                  </span>
                </div>
                {admin ? (
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 flex items-center justify-center bg-white/90 border border-[#E0E0E0] hover:bg-[#F0F0F0] transition-colors">
                          <Settings className="h-3.5 w-3.5 text-[#1C1C1C]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-[#E0E0E0] rounded-none shadow-md">
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" onClick={() => deleteMember(m.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium text-[#1C1C1C] leading-tight">{m.name}{!m.isActive ? " - 卒业" : ""}</div>
                <div className="mt-0.5 text-[10px] text-[#6B6B6B] tracking-wide">{m.romaji || ""}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(v) => (!v ? setSelected(null) : null)}
      >
        <ScrollDialogContent className="max-w-4xl">
          <MemberDetailContent member={selected} data={data} />
        </ScrollDialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollDialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing?.name ? "编辑成员" : "新增成员"}</DialogTitle>
            <DialogDescription className="text-[#6B6B6B]">
              上传公式照（大头照）并编辑基础信息。
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">姓名</div>
                  <Input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="例如：星野 明里"
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="text-sm font-medium">罗马音</div>
                  <Input
                    value={editing.romaji || ""}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, romaji: e.target.value }))
                    }
                    placeholder="例如：Akari Hoshino"
                  />
                </div>
<div className="grid gap-2">
                  <div className="text-sm font-medium">出身</div>
                  <Input
                    value={editing.origin}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, origin: e.target.value }))
                    }
                    placeholder="例如：东京 · 练马"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">期数</div>
                  <Input
                    value={editing.generation}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, generation: e.target.value }))
                    }
                    placeholder="例如：2期"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="text-sm font-medium">是否在籍</div>
                  <div className="flex items-center gap-3 border border-[#E0E0E0] bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!editing.isActive}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          isActive: e.target.checked,
                          graduationDate: e.target.checked ? "" : (p.graduationDate || ""),
                        }))
                      }
                    />
                    <div className="text-sm text-[#6B6B6B]">在籍</div>
                  </div>
                </div>

                {!editing.isActive ? (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">毕业日期</div>
                    <Input
                      value={editing.graduationDate || ""}
                      onChange={(e) => setEditing((p) => ({ ...p, graduationDate: e.target.value }))}
                      placeholder="YYYY-MM-DD"
                    />
                    <div className="text-sm font-medium">毕业曲（填"无"表示不显示）</div>
                    <Input
                      value={editing.graduationSongTitle || ""}
                      onChange={(e) => setEditing((p) => ({ ...p, graduationSongTitle: e.target.value }))}
                      placeholder="例如：Farewell Song / 无"
                    />
                    <div className="text-xs text-[#6B6B6B]">把成员从在籍改为毕业时必须填写。</div>
                  </div>
                ) : null}
              </div>

              <OfficialPhotosEditor
                photos={editing.officialPhotos || []}
                displayAvatar={editing.avatar}
                onChangePhotos={(photos) => setEditing((p) => ({ ...p, officialPhotos: photos }))}
                onChangeAvatar={(url) => setEditing((p) => ({ ...p, avatar: url }))}
              />

              <div className="border border-[#E0E0E0] bg-white">
                <div className="px-4 py-3 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium text-[#1C1C1C]">基础信息</div>
                </div>
                <div className="p-4 grid gap-3 md:grid-cols-2">
                  <LabeledInput
                    label="身高"
                    value={editing.profile.height}
                    onChange={(v) =>
                      setEditing((p) => ({
                        ...p,
                        profile: { ...p.profile, height: v },
                      }))
                    }
                  />
                  <LabeledInput
                    label="生日"
                    value={editing.profile.birthday}
                    onChange={(v) =>
                      setEditing((p) => ({
                        ...p,
                        profile: { ...p.profile, birthday: v },
                      }))
                    }
                  />
                  <LabeledInput
                    label="血型"
                    value={editing.profile.blood}
                    onChange={(v) =>
                      setEditing((p) => ({
                        ...p,
                        profile: { ...p.profile, blood: v },
                      }))
                    }
                  />
                  <LabeledInput
                    label="爱好"
                    value={editing.profile.hobby}
                    onChange={(v) =>
                      setEditing((p) => ({
                        ...p,
                        profile: { ...p.profile, hobby: v },
                      }))
                    }
                  />
                  <LabeledInput
                    label="特长"
                    value={editing.profile.skill}
                    onChange={(v) =>
                      setEditing((p) => ({
                        ...p,
                        profile: { ...p.profile, skill: v },
                      }))
                    }
                  />
                  <div className="grid gap-2 md:col-span-2">
                    <div className="text-sm font-medium">口号</div>
                    <Input
                      value={editing.profile.catchphrase}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          profile: {
                            ...p.profile,
                            catchphrase: e.target.value,
                          },
                        }))
                      }
                      placeholder="例如：把光带到舞台上。"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-[#E0E0E0] bg-white">
                <div className="px-4 py-3 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium text-[#1C1C1C]">总选举顺位</div>
                  <div className="text-xs text-[#6B6B6B] mt-0.5">每行填写一届总选举的排名：输入数字 1-19 会自动标注（选拔/UG），20 及以后自动显示为「圈外」。不在榜单可写「加入前」。</div>
                </div>
                <div className="p-4 grid gap-3">
                  {(editing.electionRanks || []).length ? (
                    (editing.electionRanks || []).map((r, idx) => (
                      <div
                        key={`${r.edition || ""}-${r.rank || ""}-${idx}`}
                        className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <Input
                          value={r.edition || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditing((p) => {
                              const next = [...(p.electionRanks || [])];
                              next[idx] = { ...(next[idx] || {}), edition: val };
                              return { ...p, electionRanks: next };
                            });
                          }}
                          placeholder="例如：第一届"
                        />
                        <Input
                          value={r.rank || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditing((p) => {
                              const next = [...(p.electionRanks || [])];
                              next[idx] = { ...(next[idx] || {}), rank: val };
                              return { ...p, electionRanks: next };
                            });
                          }}
                          placeholder="例如：14"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() =>
                            setEditing((p) => {
                              const next = [...(p.electionRanks || [])];
                              next.splice(idx, 1);
                              return { ...p, electionRanks: next };
                            })
                          }
                        >
                          删除
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-[#6B6B6B]">—</div>
                  )}

                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setEditing((p) => ({
                          ...p,
                          electionRanks: [...(p.electionRanks || []), { edition: "", rank: "" }],
                        }))
                      }
                    >
                      新增一条
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border border-[#E0E0E0] bg-white">
                <div className="px-4 py-3 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium text-[#1C1C1C]">历代单曲选拔状况</div>
                  <div className="text-xs text-[#6B6B6B] mt-0.5">这里给你预留了 1st/2nd 两条；你也可以改 key。</div>
                </div>
                <div className="p-4 grid gap-3">
                  {Object.entries(editing.selectionHistory || {}).map(([k, v]) => (
                    <div key={k} className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
                      <Input
                        value={k}
                        onChange={(e) => {
                          const nk = e.target.value;
                          setEditing((p) => {
                            const next = { ...(p.selectionHistory || {}) };
                            delete next[k];
                            next[nk] = v;
                            return { ...p, selectionHistory: next };
                          });
                        }}
                        placeholder="单曲名"
                      />
                      <Input
                        value={v}
                        onChange={(e) => {
                          const nv = e.target.value;
                          setEditing((p) => ({
                            ...p,
                            selectionHistory: {
                              ...(p.selectionHistory || {}),
                              [k]: nv,
                            },
                          }));
                        }}
                        placeholder="例如：A面选拔（2列）"
                      />
                    
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => {
                          setEditing((p) => {
                            const next = { ...(p.selectionHistory || {}) };
                            delete next[k];
                            return { ...p, selectionHistory: next };
                          });
                        }}
                        title="删除这条记录"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
</div>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditing((p) => ({
                        ...p,
                        selectionHistory: {
                          ...(p.selectionHistory || {}),
                          [`New Single ${uid()}`]: "",
                        },
                      }))
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    新增一条
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                  取消
                </Button>
                <Button onClick={saveMember}>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-[#E0E0E0] bg-white p-4 text-sm text-[#6B6B6B]">
              加载中…（editing 为空）
            </div>
          )}
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }) {
  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">{label}</div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs text-[#6B6B6B]">{label}</div>
      <div className="mt-1 text-[#1C1C1C]">{value || "—"}</div>
    </div>
  );
}

function SinglesPage({ data, setData, admin, playQueue, audioQueue, audioIndex, isPlaying, togglePlayPause }) {
  const membersById = useMemo(() => {
    const m = new Map();
    data.members.forEach((x) => m.set(x.id, x));
    return m;
  }, [data.members]);

  const [selectedId, setSelectedId] = useState(null);
  const selected = data.singles.find((s) => s.id === selectedId) || null;
  const [kindFilter, setKindFilter] = useState("全部");

  // ✅ 手机端：点击单曲后自动滚动到详情区域（不影响电脑版）
  const detailAnchorRef = useRef(null);
  useEffect(() => {
    if (!selectedId) return;
    if (typeof window === "undefined") return;
    // 仅在 md 以下（<768px）生效，确保电脑版保持一模一样
    if (window.innerWidth >= 768) return;

    const raf = window.requestAnimationFrame(() => {
      detailAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [selectedId]);

  // ✅ 单曲站位显示：截止到当前单曲"发布顺序(按 release 升序)"的累计选拔次数
  // - 第 1 张单曲：站位成员显示（初）
  // - 第 N 张单曲：显示截至该张单曲为止的累计次数（1 -> 初，2+ -> 数字）
  const cumulativeCounts = useMemo(() => {
    if (!selectedId) return new Map();

    // 1) 先按 release 升序排（如果 release 解析失败，就按原数组顺序兜底）
    const withIndex = (data.singles || []).map((s, i) => ({ s, i }));
    const parsed = (v) => {
      const t = Date.parse(v || "");
      return Number.isFinite(t) ? t : null;
    };
    const hasAnyDate = withIndex.some((x) => parsed(x.s.release) !== null);

    const ordered = hasAnyDate
      ? [...withIndex].sort((a, b) => {
          const ta = parsed(a.s.release);
          const tb = parsed(b.s.release);
          if (ta === null && tb === null) return a.i - b.i;
          if (ta === null) return 1;
          if (tb === null) return -1;
          return ta - tb; // 升序：旧 -> 新
        })
      : withIndex;

    // 2) 累计统计：每张单曲的 asideLineup 里出现一次算"进入一次"
    const counts = new Map();
    const countsBySingleId = new Map(); // singleId -> Map(memberId -> count)

    for (const { s } of ordered) {
      const slots = s?.asideLineup?.slots || [];
      const appeared = new Set(slots.filter(Boolean)); // 同一张单曲里防重复
      for (const mid of appeared) {
        counts.set(mid, (counts.get(mid) || 0) + 1);
      }
      // 存一份快照给该张单曲
      countsBySingleId.set(s.id, new Map(counts));
    }

    return countsBySingleId.get(selectedId) || new Map();
  }, [data.singles, selectedId]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lineupCfg, setLineupCfg] = useState({
    rowsText: "7,4,1",
  });

  const openEdit = (s) => {
    // Auto-generate next single prefix when adding a new single
    const nextPrefix = (() => {
      const maxN = (data.singles || []).reduce((max, sg) => {
        const { prefix } = splitSingleTitle(sg.title);
        const m = (prefix || "").match(/^(\d+)/);
        return m ? Math.max(max, Number(m[1])) : max;
      }, 0);
      const n = maxN + 1;
      const t = n % 100;
      const sfx = t >= 11 && t <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
      return `${n}${sfx} Single · `;
    })();

    const draft =
      s ??
      ({
        id: `s_${uid()}`,
        title: nextPrefix,
        release: "",
        cover: "",
        tags: [],
        singleKind: "常规单曲",
        tracks: [
          { no: 1, title: "(A-side)", isAside: true, audio: "" },
          { no: 2, title: "", isAside: false, audio: "" },
          { no: 3, title: "", isAside: false, audio: "" },
        ],
        asideLineup: {
          selectionCount: 12,
          rows: [7, 4, 1],
          slots: Array(12).fill(null),
        },
        notes: "",
      });

    // 深拷贝，避免编辑时污染原对象
    const copy = JSON.parse(JSON.stringify(draft));
    // 兼容旧数据结构：允许任意 track 数量，但至少保留 1 条（A面）
    const rawTracks = Array.isArray(copy.tracks) ? copy.tracks : [];
    const safeTracks = rawTracks.length > 0 ? rawTracks : [{}];
    copy.tracks = safeTracks.map((t, i) =>
      ensureTrackShape(t, i + 1, i === 0)
    );

    setEditing(copy);
    setLineupCfg({
      rowsText: (copy.asideLineup.rows || [7, 4, 1]).join(","),
    });
    setEditorOpen(true);
  };

  const saveSingle = () => {
    setData((prev) => {
      const nextEditing = editing;
      const exists = prev.singles.some((x) => x.id === editing.id);
      const nextSingles = exists
        ? prev.singles.map((x) =>
            x.id === nextEditing.id ? nextEditing : x
          )
        : [...prev.singles, nextEditing];

      const nextData = { ...prev, singles: nextSingles };
      return withRecomputedSelections(nextData);
    });

    setEditorOpen(false);
  };


  const deleteSingle = (id) => {
    setData((prev) =>
      withRecomputedSelections({
        ...prev,
        singles: prev.singles.filter((s) => s.id !== id),
      })
    );
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="px-4 py-8 mx-auto max-w-7xl">
      <SectionHeader
        right={
          admin ? (
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新增单曲
            </Button>
          ) : null
        }
      />

      {/* Kind filter */}
      {(() => {
        const usedKinds = [...new Set(data.singles.map((s) => s.singleKind || "常规单曲"))];
        const options = ["全部", ...SINGLE_KIND_OPTIONS.filter((k) => usedKinds.includes(k))];
        if (options.length <= 2) return null;
        return (
          <div className="flex flex-wrap gap-2 mb-8">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => setKindFilter(opt)}
                className={
                  "text-[11px] tracking-wider px-3 py-1 border transition-colors " +
                  (kindFilter === opt
                    ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                    : "border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]")
                }
              >
                {opt}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Discography grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-8">
        <AnimatePresence mode="popLayout">
        {data.singles.filter((s) => kindFilter === "全部" || (s.singleKind || "常规单曲") === kindFilter).map((s, idx) => {
          const { prefix, name } = splitSingleTitle(s.title);
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.28, delay: idx * 0.035, ease: [0.25, 0.1, 0.25, 1] }}
              className="cursor-pointer group"
              onClick={() => setSelectedId(s.id)}
            >
              <div className="relative overflow-hidden bg-[#F0F0F0] aspect-square">
                <MediaImage
                  src={s.cover}
                  alt={s.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                {admin ? (
                  <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-7 h-7 flex items-center justify-center bg-white/90 border border-[#E0E0E0] hover:bg-white transition-colors">
                          <Settings className="h-3.5 w-3.5 text-[#1C1C1C]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border-[#E0E0E0] rounded-none shadow-md">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-500" onClick={(e) => { e.stopPropagation(); deleteSingle(s.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
              <div className="mt-3">
                <div className="text-[10px] tracking-[0.15em] text-[#6B6B6B] uppercase">{prefix}</div>
                <div className="text-sm font-medium text-[#1C1C1C] leading-snug mt-0.5">{name || s.title}</div>
                <div className="text-xs text-[#6B6B6B] mt-1 tracking-wider">
                  {s.release ? s.release.replace(/-/g, ".") : "—"}
                </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      {/* Single detail modal */}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <ScrollDialogContent className="max-w-5xl">
          {selected ? (
            <ErrorBoundary>
              <SingleDetail
                single={selected}
                membersById={membersById}
                admin={admin}
                cumulativeCounts={cumulativeCounts}
                noFrame
                playQueue={playQueue}
                audioQueue={audioQueue}
                audioIndex={audioIndex}
                isPlaying={isPlaying}
                togglePlayPause={togglePlayPause}
              />
            </ErrorBoundary>
          ) : null}
        </ScrollDialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollDialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editing?.title ? "编辑单曲" : "新增单曲"}</DialogTitle>
            <DialogDescription className="text-[#6B6B6B]">
              可上传封面、编辑曲目与 A 面曲选拔站位（拖拽公式照），并上传 A 面音源。
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-5">
              <div className="grid gap-3 md:grid-cols-2">
                <LabeledInput
                  label="标题"
                  value={editing.title}
                  onChange={(v) => setEditing((p) => ({ ...p, title: v }))}
                  placeholder="例如：3rd Single · ..."
                />
                <LabeledInput
                  label="发行日期"
                  value={editing.release}
                  onChange={(v) => setEditing((p) => ({ ...p, release: v }))}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              {/* 单曲类型选择器 */}
              <div>
                <div className="text-[10px] tracking-[0.15em] text-[#6B6B6B] uppercase mb-2">单曲类型</div>
                <div className="flex flex-wrap gap-2">
                  {SINGLE_KIND_OPTIONS.map((opt) => {
                    const active = (editing.singleKind || "常规单曲") === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditing((p) => ({ ...p, singleKind: opt }))}
                        className={
                          "text-[11px] tracking-wider px-3 py-1 border transition-colors " +
                          (active
                            ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                            : "border-[#E0E0E0] text-[#1C1C1C] hover:bg-[#F0F0F0]")
                        }
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <ImageUploader
                label="单曲封面"
                value={editing.cover}
                onChange={(url) => setEditing((p) => ({ ...p, cover: url }))}
                hint="建议 1:1"
              />

              <div className="border border-[#E0E0E0] bg-white">
                <div className="px-4 py-3 border-b border-[#E0E0E0] flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[#1C1C1C]">
                    曲目收录（{editing.tracks?.length || 0} tracks）
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center border border-[#E0E0E0] hover:bg-[#F0F0F0] transition-colors"
                      onClick={() => {
                        setEditing((p) => {
                          const prevTracks = Array.isArray(p.tracks) ? p.tracks : [];
                          const next = [...prevTracks, { no: prevTracks.length + 1, title: "", isAside: false, audio: "" }].map(
                            (t, i) => ({
                              ...t,
                              no: i + 1,
                              isAside: i === 0,
                              audio: i === 0 ? (t.audio || "") : "",
                            })
                          );
                          return { ...p, tracks: next };
                        });
                      }}
                      title="增加曲目"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center border border-[#E0E0E0] hover:bg-[#F0F0F0] transition-colors disabled:opacity-40"
                      onClick={() => {
                        setEditing((p) => {
                          const prevTracks = Array.isArray(p.tracks) ? p.tracks : [];
                          if (prevTracks.length <= 1) return p;
                          const trimmed = prevTracks.slice(0, -1);
                          const next = trimmed.map((t, i) => ({
                            ...t,
                            no: i + 1,
                            isAside: i === 0,
                            audio: i === 0 ? (t.audio || "") : "",
                          }));
                          return { ...p, tracks: next };
                        });
                      }}
                      disabled={(editing.tracks?.length || 0) <= 1}
                      title="减少曲目（从末尾删除）"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-4 grid gap-3">
                  {(Array.isArray(editing.tracks) ? editing.tracks : []).map((t, idx) => (
                    <div key={idx} className="grid gap-2 md:grid-cols-[120px_1fr_140px]">
                      <Input value={`Track ${t.no}`} disabled className="bg-[#F0F0F0]" />
                      <Input
                        value={t.title}
                        onChange={(e) => {
                          const title = e.target.value;
                          setEditing((p) => {
                            const next = [...p.tracks];
                            next[idx] = { ...next[idx], title };
                            return { ...p, tracks: next };
                          });
                        }}
                        placeholder={idx === 0 ? "A面曲标题" : "曲目标题"}
                      />
                      <div className="flex items-center gap-2">
                        <Badge variant={t.isAside ? "default" : "secondary"}>
                          {t.isAside ? "A-side" : "B-side"}
                        </Badge>
                        {idx === 0 ? (
                          <div className="text-xs text-[#6B6B6B]">A面支持音源与站位</div>
                        ) : null}
                      </div>

                      <div className="md:col-span-3">
                          <AudioUploader
                            label={`${idx === 0 ? 'A面音源（可选）' : `Track ${t.no} 音源（可选）`}`}
                            value={t.audio || ""}
                            onChange={(audio) => {
                              setEditing((p) => {
                                const next = [...p.tracks];
                                next[idx] = { ...next[idx], audio };
                                return { ...p, tracks: next };
                              });
                            }}
                            hint="支持 mp3 / m4a / wav 等"
                          />
                        </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E0E0E0] bg-white">
                <div className="px-4 py-3 border-b border-[#E0E0E0]">
                  <div className="text-sm font-medium text-[#1C1C1C]">A 面曲选拔站位编辑</div>
                  <div className="text-xs text-[#6B6B6B] mt-0.5">1) 输入排数与每排人数；2) 生成占位框；3) 从下方成员池拖拽公式照到占位框；4) 保存。</div>
                </div>
                <div className="p-4 grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <LabeledInput
                      label="每排人数（用逗号分隔）"
                      value={lineupCfg.rowsText}
                      onChange={(v) => setLineupCfg((p) => ({ ...p, rowsText: v }))}
                      placeholder="例如：5,7 或 4,4,4"
                    />
                    <div className="flex items-end">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                          const rows = lineupCfg.rowsText
                            .split(",")
                            .map((x) => parseInt(x.trim(), 10))
                            .filter((x) => Number.isFinite(x) && x > 0);
                          const total = rows.reduce((a, b) => a + b, 0);
                          const slots = Array(total).fill(null);
                          setEditing((p) => ({
                            ...p,
                            asideLineup: {
                              ...p.asideLineup,
                              rows,
                              slots,
                            },
                          }));
                        }}
                      >
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        生成占位框
                      </Button>
                    </div>
                  </div>

                  <LineupEditor singleDraft={editing} setSingleDraft={setEditing} members={data.members} />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">备注</div>
                <Textarea
                  value={editing.notes}
                  onChange={(e) => setEditing((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="可写单曲风格/设定等"
                  className="min-h-[90px]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                  取消
                </Button>
                <Button onClick={saveSingle}>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </Button>
              </div>
            </div>
          ) : null}
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function SingleDetail({single, membersById, admin, cumulativeCounts, noFrame, playQueue, audioQueue, audioIndex, isPlaying, togglePlayPause}) {
  const [coverZoom, setCoverZoom] = useState(false);
  const useNewPhoto = isSingleNewContext(single);

  const rows = single.asideLineup?.rows || [];
  const slots = single.asideLineup?.slots || [];
  const slotRolesForView = single.asideLineup?.slotRoles || {};

  // 站位展示规则（按你的需求重做）：
  // 1) 不管每排人数是多少，头像/卡片尺寸都固定为"每排 3 人"时的大小，不做缩放；
  // 2) 人数/排数过多时，不拉伸外层卡片，改为站位区域内部滚动查看；
  // 3) 手机端同样保持不变形：必要时支持横向/纵向滚动。
  const maxPerRow = rows.length ? Math.max(...rows.map((n) => Number(n) || 0)) : 0;
  const lineupScale = 1; // 基于"每排 5 人"时的尺寸（不随人数变化缩放）
  const tileW = 96;
  const tileH = 176;
  const imgH = 92;
  const nameFont = 12;
  const badgeFont = 11;
  const rowGap = 18;
  // 人数较多时不缩放：站位区域整体启用横向滚动（避免挤压导致缩放/变形）
  // rows 的含义：越靠后的数字越前排（最后一个是第1排）
  let __idx = 0;
  const rowMetaForView = rows.map((n, rowIdx) => {
    const start = __idx;
    const end = __idx + n;
    __idx = end;
    const rowNumber = rows.length - rowIdx; // rowIdx=0 => 最后排；rowIdx=last => 第1排
    return { n, start, end, rowIdx, rowNumber };
  });

  const tracks = Array.isArray(single.tracks) ? single.tracks : [];
  const hasAnyAudio = tracks.some((t) => !!t?.audio);

  return (
    <div className={noFrame ? "" : "border border-[#E0E0E0] bg-white"}>
      {!noFrame && (
        <div className="px-4 py-3 border-b border-[#E0E0E0]">
          <div className="text-base font-medium text-[#1C1C1C]">{single.title}</div>
          <div className="text-xs text-[#6B6B6B] tracking-wider mt-0.5">
            {single.release ? single.release.replace(/-/g, ".") : "—"}
          </div>
        </div>
      )}
      {noFrame && (
        <div className="mb-4 text-center">
          <div className="text-lg font-medium text-[#1C1C1C]">{single.title}</div>
          <div className="text-xs text-[#6B6B6B] tracking-wider mt-1">
            {single.release ? single.release.replace(/-/g, ".") : "—"}
          </div>
        </div>
      )}
      <div className={`${noFrame ? "pt-0" : "p-4"} grid gap-10`}>
        {/* Centered large cover + badges */}
        <div className="flex flex-col items-center gap-4">
          <button
            className="overflow-hidden bg-[#F0F0F0] w-full max-w-[260px] sm:max-w-[320px]"
            onClick={() => setCoverZoom(true)}
            title="点击放大封面"
          >
            <MediaImage
              src={single.cover}
              alt={single.title}
              className="aspect-square w-full object-cover"
            />
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {(() => { const kb = singleKindBadge(single.singleKind); return kb ? (
              <span className={"text-[10px] tracking-wider border px-2 py-0.5 " + kb.className}>{kb.text}</span>
            ) : null; })()}
            <span className="text-[10px] tracking-wider border border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B] px-2 py-0.5">
              选拔 {single.asideLineup?.selectionCount || 0}人
            </span>
            <span className="text-[10px] tracking-wider border border-[#E0E0E0] bg-[#F0F0F0] text-[#6B6B6B] px-2 py-0.5">
              {single.asideLineup?.rows?.length || 0} 排
            </span>
            {hasAnyAudio ? (
              <span className="text-[10px] tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-800 px-2 py-0.5">♪ 音源</span>
            ) : null}
          </div>
        </div>

        {/* Track list — Nogizaka-style minimal numbered list */}
        <div>
          {/* Section header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Tracklist</div>
          </div>

          {/* Track rows */}
          <div>
            {tracks.map((t) => (
              <div
                key={t.no}
                className="flex items-center gap-4 py-3 border-b border-[#E0E0E0] last:border-b-0"
              >
                {/* Play button or track number */}
                {(() => {
                    const isActiveTrack = audioQueue?.[audioIndex]?.singleId === single.id && audioQueue?.[audioIndex]?.trackNo === t.no;
                    const isThisPlaying = isActiveTrack && isPlaying;
                    return t.audio ? (
                      <button
                        className="w-6 h-6 rounded-full border border-[#1C1C1C] flex items-center justify-center shrink-0 hover:bg-[#1C1C1C] hover:text-white transition-colors text-[#1C1C1C]"
                        onClick={() => {
                          if (isActiveTrack) {
                            togglePlayPause?.();
                          } else {
                            playQueue?.([{
                              singleId: single.id,
                              trackNo: t.no,
                              title: t.title,
                              singleTitle: single.title,
                              coverUrl: resolveMediaUrl(single.cover),
                              audioUrl: resolveMediaUrl(t.audio),
                            }], 0);
                          }
                        }}
                        title={isThisPlaying ? "暂停" : "播放"}
                      >
                        {isThisPlaying ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                      </button>
                    ) : (
                      <span className="w-6 text-center text-sm text-[#AAAAAA] shrink-0">{t.no}.</span>
                    );
                  })()}

                {/* Title */}
                <span className={`text-sm flex-1 min-w-0 ${t.audio ? "text-[#1C1C1C]" : "text-[#6B6B6B]"}`}>
                  {t.title}
                </span>

                {/* A/B-side tag */}
                <span className="text-[10px] tracking-wider text-[#AAAAAA] shrink-0">
                  {t.isAside ? "A-side" : "B-side"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {single.notes ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-px bg-[#1C1C1C]" />
              <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Introduction</div>
            </div>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">{single.notes}</p>
          </div>
        ) : null}

        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#1C1C1C]" />
            <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">Formation</div>
          </div>
          <div className="grid gap-4">
            {/* 站位区域：固定卡片尺寸，不随人数缩放；人数过多时使用横向滚动查看 */}
            <div className="grid gap-3 overflow-x-auto overflow-y-visible pb-2 px-4" style={{ scrollPaddingLeft: 16, scrollPaddingRight: 16 }}>
              {rowMetaForView.map((r, rIdx) => (
                <div
                  key={rIdx}
                  className="flex flex-nowrap justify-center w-full pb-1"
                  style={{ gap: rowGap }}
                >
                  {slots.slice(r.start, r.end).map((mid, i) => {
                    const slotIndex = r.start + i;
                    const m = mid ? membersById.get(mid) : null;
                    const role = slotRolesForView?.[slotIndex] ?? null;
                    const rb = roleBadge(role);
                    const frameCls =
                      role === "center"
                        ? "ring-2 ring-amber-400"
                        : role === "guardian"
                        ? "ring-2 ring-zinc-300"
                        : "";

                    const genTextRaw = m?.generation ? String(m.generation) : "";
                    const genText = genTextRaw ? (genTextRaw.includes("期") ? genTextRaw : `${genTextRaw}期`) : "";

                    const count = m ? (cumulativeCounts?.get(m.id) || 0) : 0;
                    const countText = count <= 0 ? "" : count === 1 ? "（初）" : `（${count}）`;

                    return (
                      <div
                        key={`${rIdx}-${i}`}
                        className={
                          "group relative overflow-hidden bg-white flex-none " +
                          (role === "center" ? "ring-2 ring-amber-400" : role === "guardian" ? "ring-1 ring-zinc-300" : "")
                        }
                        style={{ width: tileW, height: tileH }}
                        title={m ? m.name : "空位"}
                      >
                        {m ? (
                          <div className="grid h-full w-full" style={{ gridTemplateRows: `${imgH}px auto` }}>
                            <div className="overflow-hidden bg-transparent">
                              <MediaImage
                                src={getOfficialPhotoUrl(m, useNewPhoto)}
                                alt={m.name}
                                className={"h-full w-full object-contain object-top " + (!m.isActive ? "grayscale" : "")}
                              />
                            </div>

                            <div className="px-2 pt-1 pb-1 text-center">
                              {genText ? (
                                <div className="mb-0.5 flex justify-center">
                                  <span
                                    className={generationBadgeClass(genText)}
                                    style={{ fontSize: badgeFont, ...generationBadgeStyle(genText) }}
                                  >
                                    {genText}
                                  </span>
                                </div>
                              ) : null}

                              <div
                                className="text-[#1C1C1C]"
                                style={{ fontSize: nameFont, lineHeight: 1.2, wordBreak: "break-word" }}
                              >
                                {!m.isActive ? "OG · " : ""}{m.name}
                                {countText}
                              </div>

                              {rb ? (
                                <div className="mt-1 flex justify-center">
                                  <span
                                    className={"inline-flex items-center border px-2 py-0.5 font-medium " + rb.className}
                                    style={{ fontSize: badgeFont }}
                                  >
                                    {rb.text}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-[#6B6B6B]">空位</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}            </div>
            {admin ? (
              <div className="text-xs text-[#6B6B6B]">
                站位编辑请在「编辑单曲」弹窗里操作。
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={coverZoom} onOpenChange={setCoverZoom}>
        <ScrollDialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>封面放大</DialogTitle>
            <DialogDescription className="text-[#6B6B6B]">
              点击外部或按 ESC 关闭。
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden border border-[#E0E0E0] bg-white">
            <MediaImage src={single.cover} alt={single.title} className="w-full" />
          </div>
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function LineupEditor({ singleDraft, setSingleDraft, members }) {
  // 防御：进入编辑页的首帧 editing 可能还是 null/undefined，避免直接白屏
  if (!singleDraft) {
    return (
      <div className="border border-[#E0E0E0] bg-white p-4 text-sm text-[#6B6B6B]">
        加载中…（singleDraft 为空）
      </div>
    );
  }
  members = Array.isArray(members) ? members : [];
  const lineup =
    singleDraft.asideLineup || { selectionCount: 12, rows: [7, 4, 1], slots: [] };
  const rows = lineup.rows || [];
  const selectionCount = (rows || []).reduce((a, b) => a + b, 0);

  // slotRoles: 对所有位置生效
  const slotRoles = lineup.slotRoles || {}; // { [slotIndex]: "center" | "guardian" }

  const rowMeta = useMemo(() => {
    let idx = 0;
    return rows.map((n, rowIdx) => {
      const start = idx;
      const end = idx + n;
      idx = end;
      // rows 的含义：越靠后的数字越前排（最后一个是第1排）
      const rowNumber = rows.length - rowIdx; // rowIdx=0 => 最后排；rowIdx=last => 第1排
      return { n, start, end, rowIdx, rowNumber };
    });
  }, [rows]);

  const slotRolesForView = singleDraft.asideLineup?.slotRoles || {};
  const getRowNumberBySlotForView = (slotIndex) => {
    for (const r of rowMeta) {
      if (slotIndex >= r.start && slotIndex < r.end) return r.rowNumber;
    }
    return null;
  };
  const roleFrameClassForView = (slotIndex) => {
    const role = slotRolesForView[slotIndex];
    if (role === "center") {
      return "ring-2 ring-yellow-400";
    }
    if (role === "guardian") {
      return "ring-2 ring-zinc-300";
    }
    return "";
  };
  const centerSuffixForView = (slotIndex) => (slotRolesForView[slotIndex] === "center" ? "（center）" : "");

  const getRowNumberBySlot = (slotIndex) => {
    for (const r of rowMeta) {
      if (slotIndex >= r.start && slotIndex < r.end) return r.rowNumber;
    }
    return null;
  };

  const normalizeSlots = (rawSlots) => {
    const nextSlots = Array.isArray(rawSlots) ? [...rawSlots] : [];
    if (nextSlots.length < selectionCount) {
      nextSlots.push(...Array(selectionCount - nextSlots.length).fill(null));
    }
    if (nextSlots.length > selectionCount) nextSlots.length = selectionCount;
    return nextSlots;
  };

  const onSetSlot = (slotIndex, memberId, role) => {
    setSingleDraft((p) => {
      const nextSlots = normalizeSlots(p.asideLineup?.slots);
      nextSlots[slotIndex] = memberId;

      const nextRoles = { ...(p.asideLineup?.slotRoles || {}) };
      // role 对所有位置生效
      if (role === "center" || role === "guardian") nextRoles[slotIndex] = role;
      else delete nextRoles[slotIndex];

      return {
        ...p,
        asideLineup: {
          ...(p.asideLineup || {}),
          rows,
          selectionCount,
          slots: nextSlots,
          slotRoles: nextRoles,
        },
      };
    });
  };

  const clearSlot = (slotIndex) => {
    onSetSlot(slotIndex, null, null);
  };

  const slots = useMemo(() => normalizeSlots(lineup.slots), [lineup.slots, selectionCount]);
  const used = useMemo(() => new Set(slots.filter(Boolean)), [slots]);

  const singleRelease = isoDate(singleDraft?.release);

  // 成员选择池（保持原逻辑）：
  // - 现役成员永远可选
  // - 已毕业成员：仅当单曲 release 早于/等于毕业日（即当时仍是现役）才出现在"现役/当期成员"池
  const activeEligibleMembers = useMemo(() => {
    if (!singleRelease) return members;
    return (members || []).filter((m) => {
      const gd = isoDate(m?.graduationDate);
      if (m?.isActive) return true;
      if (!gd) return true;
      return singleRelease <= gd;
    });
  }, [members, singleRelease]);

  // OG（已毕业）成员池：仅展示"在该单曲 release 时已毕业"的成员
  const ogEligibleMembers = useMemo(() => {
    const sRelease = singleRelease;
    return (members || []).filter((m) => {
      if (m?.isActive) return false;
      const gd = isoDate(m?.graduationDate);
      if (!sRelease) return true;
      if (!gd) return true;
      return sRelease > gd;
    });
  }, [members, singleRelease]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState(null);
  const [pickerRole, setPickerRole] = useState(null); // null | "center" | "guardian"
  const [pickerPool, setPickerPool] = useState("active"); // "active" | "og"

  const openPickerForSlot = (slotIndex) => {
    setPickerSlotIndex(slotIndex);
    const r = (lineup.slotRoles || {})[slotIndex] || null;
    setPickerRole(r === "center" || r === "guardian" ? r : null);
    setPickerPool("active");
    setPickerOpen(true);
  };

  const assignMemberToSlot = (memberId) => {
    if (pickerSlotIndex === null) return;
    onSetSlot(pickerSlotIndex, memberId, pickerRole);
    setPickerOpen(false);
    setPickerSlotIndex(null);
    setPickerRole(null);
  };

  const roleBadge = (slotIndex) => {
    const role = (lineup.slotRoles || {})[slotIndex];
    if (role === "center") {
      return (
        <div className="absolute left-1 top-1 rounded-full bg-yellow-400/95 px-2 py-0.5 text-[10px] font-semibold text-[#1C1C1C] shadow">
          center
        </div>
      );
    }
    if (role === "guardian") {
      return (
        <div className="absolute left-1 top-1 rounded-full bg-zinc-200/95 px-2 py-0.5 text-[10px] font-semibold text-zinc-800 shadow">
          护法
        </div>
      );
    }
    return null;
  };

  const roleFrameClass = (slotIndex) => {
    const role = (lineup.slotRoles || {})[slotIndex];
    if (role === "center") {
      return "ring-2 ring-yellow-400";
    }
    if (role === "guardian") {
      return "ring-2 ring-zinc-300";
    }
    return "";
  };

  return (
    <div className="grid gap-4">
      <div className="border border-[#E0E0E0] bg-[#F7F7F7] p-3 text-xs text-[#6B6B6B]">
        点击站位框选择成员（所有位置可设置 普通 / center / 护法）。
      </div>

      <div className="border border-[#E0E0E0] bg-white p-4">
        <div className="grid gap-3">
          {rowMeta.map((r) => (
            <div key={`${r.start}-${r.end}`} className="flex justify-center gap-3">
              {Array.from({ length: r.n }).map((_, ci) => {
                const slotIndex = r.start + ci;
                const memberId = slots[slotIndex];
                const m = members.find((x) => x.id === memberId) || null;

                return (
                  <div key={slotIndex} className="flex flex-col items-center gap-2">
                    <div
                      className={
                        "relative overflow-hidden border border-dashed cursor-pointer " +
                        (slotRolesForView[slotIndex] === "center"
                          ? "border-amber-400 ring-1 ring-amber-300"
                          : slotRolesForView[slotIndex] === "guardian"
                          ? "border-[#B0B0B0]"
                          : "border-[#D0D0D0]")
                      }
                      style={{ width: 90, height: 140 }}
                      onClick={() => openPickerForSlot(slotIndex)}
                      title={m ? m.name : "空位"}
                    >
                      {roleBadge(slotIndex)}
                      {m ? (
                        <>
                          <MediaImage
                            src={m.avatar}
                            alt={m.name}
                            className={"h-full w-full object-cover bg-[#F0F0F0] " + (!m.isActive ? "grayscale" : "")}
                          />
                          <button
                            type="button"
                            className="absolute right-1 top-1 bg-white/95 border border-[#E0E0E0] px-1.5 py-0.5 text-[10px] text-[#1C1C1C]"
                            onClick={(e) => { e.stopPropagation(); clearSlot(slotIndex); }}
                            title="清空"
                          >
                            清空
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#B0B0B0]">
                          —
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-medium text-[#1C1C1C]">
                      {m ? `${m.name}${!m.isActive ? "（卒业）" : ""}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <ScrollDialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>选择成员</DialogTitle>
            <DialogDescription className="text-[#6B6B6B]">
              点击成员即可填入当前站位{pickerSlotIndex !== null ? `（#${pickerSlotIndex + 1}）` : ""}。
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="text-xs text-[#6B6B6B] mr-1">位置类型：</div>
            {[
              { val: null, label: "普通" },
              { val: "center", label: "center" },
              { val: "guardian", label: "护法" },
            ].map(({ val, label }) => (
              <button
                key={String(val)}
                type="button"
                className={
                  "px-3 py-1 border text-xs tracking-wider " +
                  (pickerRole === val
                    ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                    : "bg-white text-[#1C1C1C] border-[#E0E0E0] hover:bg-[#F0F0F0]")
                }
                onClick={() => setPickerRole(val)}
              >
                {label}
              </button>
            ))}
          </div>

          {(() => {
            const isMemorial = singleDraft.singleKind === "纪念单曲";
            const activeList = members.filter((m) => m.isActive);
            const ogList = members.filter((m) => !m.isActive);
            const renderCard = (m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => assignMemberToSlot(m.id)}
                className={"overflow-hidden ring-0 hover:ring-2 hover:ring-[#1C1C1C] transition-all flex flex-col " + (used.has(m.id) ? "opacity-40" : "")}
                title={m.name}
              >
                <MediaImage
                  src={m.avatar}
                  alt={m.name}
                  className={"aspect-[3/4] w-full object-cover object-top " + (!m.isActive ? "grayscale" : "")}
                />
                <div className="px-2 py-1.5 bg-white w-full">
                  <div className="text-xs font-medium text-[#1C1C1C] truncate">{m.name}</div>
                  <div className="text-[10px] text-[#6B6B6B] truncate">{m.romaji || ""}</div>
                </div>
              </button>
            );
            return (
              <div className="grid gap-6">
                {isMemorial && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-px bg-[#1C1C1C]" />
                    <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">在籍</div>
                  </div>
                )}
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                  {activeList.map(renderCard)}
                </div>
                {isMemorial && ogList.length > 0 && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-px bg-[#1C1C1C]" />
                      <div className="text-[10px] tracking-[0.25em] font-medium text-[#1C1C1C] uppercase">OG</div>
                    </div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                      {ogList.map(renderCard)}
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </ScrollDialogContent>
      </Dialog>
    </div>
  );
}

function FloatingPlayer({ audioQueue, audioIndex, isPlaying, currentTime, duration, onTogglePlayPause, onSeekToIndex, onStop }) {
  const [expanded, setExpanded] = useState(false);
  const item = audioQueue[audioIndex] ?? null;
  if (!item) return null;

  const progress = duration > 0 ? currentTime / duration : 0;
  // SVG arc constants
  const R = 22; // radius of progress circle
  const C = 2 * Math.PI * R; // circumference

  const canPrev = audioIndex > 0;
  const canNext = audioIndex < audioQueue.length - 1;

  return (
    <div className="fixed bottom-6 right-4 z-50">
      <AnimatePresence mode="wait">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white border border-[#E0E0E0] shadow-lg w-[calc(100vw-2rem)] sm:w-72"
          >
            {/* Top row: cover + track info + collapse */}
            <div className="flex items-start gap-3 p-3 border-b border-[#E0E0E0]">
              <div className="w-10 h-10 shrink-0 bg-[#F7F7F7] overflow-hidden">
                {item.coverUrl ? (
                  <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-4 h-4 text-[#AAAAAA]" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#1C1C1C] truncate">{item.title}</div>
                <div className="text-[10px] text-[#6B6B6B] tracking-[0.08em] truncate mt-0.5">{item.singleTitle}</div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="shrink-0 text-[#AAAAAA] hover:text-[#1C1C1C] transition-colors p-0.5"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-[2px] bg-[#E0E0E0]">
              <div
                className="h-full bg-[#1C1C1C] transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {/* Controls */}
            <div className="flex items-center justify-center gap-6 py-3">
              <button
                onClick={() => onSeekToIndex(audioIndex - 1)}
                disabled={!canPrev}
                className={`transition-opacity ${canPrev ? "text-[#1C1C1C] hover:text-[#444]" : "text-[#CCCCCC]"}`}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={onTogglePlayPause}
                className="w-9 h-9 border border-[#1C1C1C] flex items-center justify-center hover:bg-[#1C1C1C] hover:text-white transition-colors text-[#1C1C1C]"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onSeekToIndex(audioIndex + 1)}
                disabled={!canNext}
                className={`transition-opacity ${canNext ? "text-[#1C1C1C] hover:text-[#444]" : "text-[#CCCCCC]"}`}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            {/* Bottom row: counter + stop */}
            <div className="flex items-center justify-between px-3 pb-3">
              <span className="text-[10px] tracking-[0.15em] text-[#AAAAAA]">
                {audioIndex + 1} / {audioQueue.length}
              </span>
              <button
                onClick={onStop}
                className="text-[10px] tracking-[0.15em] text-[#AAAAAA] uppercase hover:text-[#1C1C1C] transition-colors"
              >
                停止
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setExpanded(true)}
            className="w-12 h-12 rounded-full bg-white border border-[#E0E0E0] hover:shadow-md transition-shadow flex items-center justify-center relative overflow-visible"
          >
            {/* SVG progress arc */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90"
              viewBox="0 0 48 48"
              style={{ pointerEvents: "none" }}
            >
              {/* Background circle */}
              <circle cx="24" cy="24" r={R} fill="none" stroke="#E0E0E0" strokeWidth="2" />
              {/* Progress arc */}
              <circle
                cx="24" cy="24" r={R}
                fill="none"
                stroke="#1C1C1C"
                strokeWidth="2"
                strokeDasharray={C}
                strokeDashoffset={C - progress * C}
                strokeLinecap="butt"
              />
            </svg>
            {/* Cover thumbnail */}
            <div className="w-8 h-8 overflow-hidden bg-[#F7F7F7] z-10">
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-3.5 h-3.5 text-[#AAAAAA]" />
                </div>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function XJP56App() {
  const [page, setPage] = useState("home");
  const [admin, setAdmin] = useState(false);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  // ---- Global audio engine ----
  const audioRef = useRef(null);
  const [audioQueue, setAudioQueue] = useState([]);   // { singleId, trackNo, title, singleTitle, coverUrl, audioUrl }[]
  const [audioIndex, setAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Resolve a playlist track ref { singleId, trackNo } into a full QueueItem using current data
  const resolveTrackRef = (ref) => {
    const single = data?.singles?.find((s) => s.id === ref.singleId);
    if (!single) return null;
    const track = single.tracks?.find((t) => t.no === ref.trackNo);
    if (!track?.audio) return null;
    return {
      singleId: single.id,
      trackNo: track.no,
      title: track.title,
      singleTitle: single.title,
      coverUrl: resolveMediaUrl(single.cover),
      audioUrl: resolveMediaUrl(track.audio),
    };
  };

  // Play an array of QueueItems (already resolved) starting at startIndex
  const playQueue = (items, startIndex = 0) => {
    const valid = items.filter(Boolean);
    if (!valid.length) return;
    setAudioQueue(valid);
    setAudioIndex(startIndex);
    setCurrentTime(0);
    setDuration(0);
    // Trigger load+play via effect that watches audioIndex+audioQueue
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setAudioQueue([]);
    setAudioIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const togglePlayPause = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
    } else {
      el.play().catch(() => {});
    }
  };

  const seekToIndex = (idx) => {
    if (idx < 0 || idx >= audioQueue.length) return;
    setAudioIndex(idx);
    setCurrentTime(0);
  };

  const handleTrackEnd = () => {
    if (audioIndex < audioQueue.length - 1) {
      seekToIndex(audioIndex + 1);
    } else {
      // Last track ended — stay in queue but pause
      setIsPlaying(false);
    }
  };

  const handleTrackError = () => {
    // Skip broken track silently
    if (audioIndex < audioQueue.length - 1) {
      seekToIndex(audioIndex + 1);
    } else {
      setIsPlaying(false);
    }
  };

  // When audioIndex or audioQueue changes, update audio src and play
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioQueue.length) return;
    const item = audioQueue[audioIndex];
    if (!item?.audioUrl) return;
    el.src = item.audioUrl;
    el.load();
    el.play().catch(() => {});
  }, [audioIndex, audioQueue]);

  useEffect(() => {
    let cancelled = false;
    apiGetData()
      .then((remote) => {
        if (cancelled) return;
        const base = normalizeAppDataShape(remote);
        const migratedMembers = migrateSelectionHistoryKeys(base.members || [], base.singles || []);
        const normalized = withRecomputedSelections({ ...base, members: migratedMembers });
        setData(normalized);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e || "Failed to load data"));
        setData(withRecomputedSelections({ members: [], singles: [], gallery: [], playlists: [] }));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded || !data) return;
    const t = setTimeout(() => {
      const next = withRecomputedSelections(data);
      apiSaveData(next).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const onReset = () => {
    const empty = withRecomputedSelections({ members: [], singles: [], gallery: [], playlists: [] });
    setData(empty);
    setPage("home");
    apiSaveData(empty).catch(() => {});
  };

  if (!loaded) {
    return (
      <AppShell>
        <div className="py-20 text-center text-[#6B6B6B]">Loading…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto mt-16 max-w-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <div className="font-semibold">后端连接失败</div>
          <div className="mt-2 text-sm break-words">{error}</div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => window.location.reload()}>刷新重试</Button>
          </div>
          <div className="mt-3 text-xs text-red-800">
            请确认后端已启动，且 /data 接口可访问。
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="py-20 text-center text-[#6B6B6B]">No data</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar page={page} setPage={setPage} admin={admin} setAdmin={setAdmin} onReset={onReset} />

      {admin ? (
        <div className="mb-6 border border-[#E0E0E0] bg-[#F7F7F7] px-4 py-3 text-sm text-[#1C1C1C]">
          <span className="font-medium">管理员模式已开启：</span>
          {" "}你可以新增 / 编辑 / 删除成员和单曲；在单曲里拖拽编辑站位与上传音源；以及在相册上传照片。
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {page === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <Hero
              singles={[...data.singles].sort((a, b) => {
                const ta = Date.parse(a.release || "");
                const tb = Date.parse(b.release || "");
                return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
              })}
              members={data.members}
              activeMembersCount={data.members.filter((m) => m.isActive).length}
              totalMembersCount={data.members.length}
              singlesCount={data.singles.length}
              onGo={setPage}
            />
          </motion.div>
        ) : null}

        {page === "members" ? (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <MembersPage data={data} setData={setData} admin={admin} />
          </motion.div>
        ) : null}

        {page === "singles" ? (
          <motion.div
            key="singles"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <SinglesPage
              data={data}
              setData={setData}
              admin={admin}
              playQueue={playQueue}
              audioQueue={audioQueue}
              audioIndex={audioIndex}
              isPlaying={isPlaying}
              togglePlayPause={togglePlayPause}
            />
          </motion.div>
        ) : null}

        {page === "election" ? (
          <motion.div
            key="election"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <ElectionPage data={data} />
          </motion.div>
        ) : null}

        {page === "gallery" ? (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <GalleryPage data={data} setData={setData} admin={admin} />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {/* Global audio engine */}
      <audio
        ref={audioRef}
        onEnded={handleTrackEnd}
        onError={handleTrackError}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />
      {/* Floating Player */}
      {audioQueue.length > 0 && (
        <FloatingPlayer
          audioQueue={audioQueue}
          audioIndex={audioIndex}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlayPause={togglePlayPause}
          onSeekToIndex={seekToIndex}
          onStop={stopAudio}
        />
      )}
    </AppShell>
  );
}
