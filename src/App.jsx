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
  Newspaper,
  Settings,
  Sparkles,
  Save,
  Trash2,
  Pencil,
  LayoutGrid,
  Move,
  Image as ImageIcon,
  Music,
} from "lucide-react";

/**
 * XJP56 Modern Showcase App
 * - 成员展示 + 详情弹窗
 * - 单曲展示 + 封面放大 + 曲目列表 + A面曲选拔站位
 * - Blog 新闻展示 + 编辑器 + 图片上传
 * - 管理员模式：新增/编辑/删除成员、单曲、新闻；上传图片；编辑站位（拖拽排位）
 *
 * 新增：真实音频上传 + 播放
 * - A面曲支持上传音源（audio/*）并在单曲详情中播放
 * - 为了 demo 简化，音频同样以 dataURL 方式保存在 localStorage
 *   注意：音频文件可能较大，localStorage 容量有限（建议后续升级 IndexedDB / 后端存储）。
 */

// ---------- Utils ----------
const uid = () => Math.random().toString(36).slice(2, 10);


// --- 总选举顺位展示：把“十四位/14位/14/圈外/加入前”等统一格式化 ---
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

function getElectionBadge(raw) {
  const v = (raw ?? "").toString().trim();
  if (!v) return { text: "—", className: "bg-zinc-50 text-zinc-600 border-zinc-200" };
  if (v === "加入前") return { text: "加入前", className: "bg-zinc-100 text-zinc-700 border-zinc-200" };
  if (v === "圈外") return { text: "圈外", className: "bg-zinc-50 text-zinc-600 border-zinc-200" };

  // 允许输入：14位 / 14 / 十四位 / 十四
  const numFromDigits = v.match(/\d+/);
  const n = numFromDigits ? parseInt(numFromDigits[0], 10) : chineseToInt(v);

  if (!Number.isFinite(n)) {
    return { text: v, className: "bg-zinc-50 text-zinc-700 border-zinc-200" };
  }

  // 规则：1-12 选拔，13-19 UG，20+ 圈外
  if (n >= 20) return { text: "圈外", className: "bg-zinc-50 text-zinc-600 border-zinc-200" };

  const group = n >= 13 ? "UG" : "选拔";
  const text = `${n}位（${group}）`;

  // 配色：1 金，2 银，3-7 粉，8-12 选拔底色，13-19 UG 底色
  let className = "bg-sky-100 text-sky-900 border-sky-200";
  if (n === 1) className = "bg-amber-200 text-amber-900 border-amber-300";
  else if (n === 2) className = "bg-zinc-200 text-zinc-900 border-zinc-300";
  else if (n >= 3 && n <= 7) className = "bg-pink-200 text-pink-900 border-pink-300";
  else if (n <= 12) className = "bg-sky-100 text-sky-900 border-sky-200";
  else className = "bg-purple-100 text-purple-900 border-purple-200";

  return { text, className };
}


const splitSingleTitle = (fullTitle) => {
  // Expect formats like: "1st Single · Neon Bloom"
  const t = (fullTitle ?? "").toString().trim();
  if (!t) return { prefix: "", name: "" };
  const parts = t.split("·").map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return { prefix: "", name: t };
  return { prefix: parts[0], name: parts.slice(1).join(" · ") };
};

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
      // 约定：rows 数组从“后排”到“前排”，所以越靠后的 rowIndexFromBack 越前排
      const rowFromFront = totalRows - r.rowIndexFromBack + 1;
      return rowFromFront;
    }
  }
  return 1;
};

// rows 数组按“后排 -> 前排”顺序存储：例如 [5,5,1] 代表 3 排，其中最后的 1 是“第 1 排（最前）”。
// 这里返回“从后往前数”的排数：1 表示最后排（最靠后），rows.length 表示最前排。
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
  if (kind === "A面选拔") return { text: "A面选拔", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  if (kind === "B面") return { text: "B面", className: "bg-sky-50 text-sky-800 border-sky-200" };
  return { text: "未入选", className: "bg-zinc-50 text-zinc-700 border-zinc-200" };
};

const roleBadge = (role) => {
  if (role === "center") return { text: "CENTER", className: "bg-amber-200 text-amber-900 border-amber-300" };
  if (role === "guardian") return { text: "护法", className: "bg-zinc-200 text-zinc-900 border-zinc-300" };
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
  // return Tailwind-like class strings for default generations; for 3期/5期 we return empty so styles handle colors.
  const g = String(gen || "");
  if (g.startsWith("1")) return "bg-pink-100 text-pink-900";
  if (g.startsWith("2")) return "bg-green-100 text-green-900";
  if (g.startsWith("3")) return ""; // styled via generationBadgeStyle
  if (g.startsWith("4")) return "bg-yellow-100 text-yellow-900";
  if (g.startsWith("5")) return ""; // styled via generationBadgeStyle
  return "bg-black/5 text-zinc-900";
}

function generationBadgeStyle(gen = "") {
  const g = String(gen || "");
  if (g.startsWith("3")) return { backgroundColor: "#DDE8FF", color: "#154ECF", padding: '0.125rem 0.75rem', borderRadius: '9999px', fontWeight: 600 };
  if (g.startsWith("5")) return { backgroundColor: "#C9F3FF", color: "#00303A", padding: '0.125rem 0.75rem', borderRadius: '9999px', fontWeight: 600 };
  return undefined;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function safeParse(json, fallback) {
  try {
    const v = JSON.parse(json);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function ensureTrackShape(track, no, isAside) {
  return {
    no,
    title: track?.title ?? "",
    isAside,
    audio: typeof track?.audio === "string" ? track.audio : "",
  };
}

function migrateData(raw) {
  const data = safeParse(raw, null);
  if (!data || !data.members || !data.singles || !data.posts) return null;

  const singles = (data.singles || []).map((s) => {
    const tracks = Array.isArray(s.tracks) ? s.tracks : [];
    const t1 = ensureTrackShape(tracks[0], 1, true);
    const t2 = ensureTrackShape(tracks[1], 2, false);
    const t3 = ensureTrackShape(tracks[2], 3, false);

    return {
      ...s,
      tracks: [t1, t2, t3],
      asideLineup: {
        selectionCount: s.asideLineup?.selectionCount ?? 12,
        rows: Array.isArray(s.asideLineup?.rows) ? s.asideLineup.rows : [5, 7],
        slots: Array.isArray(s.asideLineup?.slots)
          ? s.asideLineup.slots
          : Array((s.asideLineup?.selectionCount ?? 12) || 12).fill(null),
      },
    };
  });

  return {
    members: data.members,
    singles,
    posts: data.posts,
  };
}

// ---------- Seed Data ----------
const seedMembers = [
  {
    id: "m_akari",
    name: "星野 明里",
    origin: "东京 · 练马",
    generation: "1期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Akari&font=montserrat",
    profile: {
      height: "160cm",
      birthday: "2004-03-12",
      blood: "A",
      hobby: "摄影 / 甜点",
      skill: "舞蹈",
      catchphrase: "把光带到舞台上。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（center）",
      "2nd Single": "A面选拔（1列）",
    },
  },
  {
    id: "m_yuna",
    name: "白石 由奈",
    origin: "大阪 · 吹田",
    generation: "1期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Yuna&font=montserrat",
    profile: {
      height: "158cm",
      birthday: "2005-10-02",
      blood: "O",
      hobby: "钢琴 / 旅行",
      skill: "高音",
      catchphrase: "微笑是最强的魔法。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（2列）",
      "2nd Single": "A面选拔（2列）",
    },
  },
  {
    id: "m_rin",
    name: "西园 凛",
    origin: "名古屋 · 千种",
    generation: "1期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Rin&font=montserrat",
    profile: {
      height: "163cm",
      birthday: "2003-07-19",
      blood: "B",
      hobby: "漫画 / 猫咖",
      skill: "表情管理",
      catchphrase: "今天也要帅气可爱。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（1列）",
      "2nd Single": "未选拔",
    },
  },
  {
    id: "m_saki",
    name: "夏目 纱希",
    origin: "福冈 · 博多",
    generation: "2期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Saki&font=montserrat",
    profile: {
      height: "156cm",
      birthday: "2006-01-28",
      blood: "AB",
      hobby: "料理 / 露营",
      skill: "MC",
      catchphrase: "把温柔变成节拍。",
    },
    selectionHistory: {
      "1st Single": "未选拔",
      "2nd Single": "A面选拔（3列）",
    },
  },
  {
    id: "m_mika",
    name: "橘 美香",
    origin: "札幌 · 中央",
    generation: "2期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Mika&font=montserrat",
    profile: {
      height: "165cm",
      birthday: "2004-11-11",
      blood: "A",
      hobby: "滑雪 / 美妆",
      skill: "镜头感",
      catchphrase: "冷空气也挡不住热舞台。",
    },
    selectionHistory: {
      "1st Single": "未选拔",
      "2nd Single": "A面选拔（2列）",
    },
  },
  {
    id: "m_mayu",
    name: "小鸟游 真优",
    origin: "京都 · 伏见",
    generation: "2期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Mayu&font=montserrat",
    profile: {
      height: "159cm",
      birthday: "2005-05-09",
      blood: "O",
      hobby: "和服 / 茶道",
      skill: "柔软度",
      catchphrase: "一步一景，一笑一生。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（3列）",
      "2nd Single": "A面选拔（3列）",
    },
  },
  {
    id: "m_nana",
    name: "藤森 菜奈",
    origin: "横滨 · 港北",
    generation: "3期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Nana&font=montserrat",
    profile: {
      height: "162cm",
      birthday: "2006-08-21",
      blood: "B",
      hobby: "街拍 / 手账",
      skill: "Rap",
      catchphrase: "节拍里也有浪漫。",
    },
    selectionHistory: {
      "1st Single": "未选拔",
      "2nd Single": "未选拔",
    },
  },
  {
    id: "m_hina",
    name: "早川 雏",
    origin: "广岛 · 中区",
    generation: "3期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Hina&font=montserrat",
    profile: {
      height: "154cm",
      birthday: "2007-02-14",
      blood: "A",
      hobby: "绘画 / 甜品店巡礼",
      skill: "可爱担当",
      catchphrase: "把心跳画成星星。",
    },
    selectionHistory: {
      "1st Single": "未选拔",
      "2nd Single": "A面选拔（3列）",
    },
  },
  {
    id: "m_reina",
    name: "月岛 玲奈",
    origin: "神户 · 灘",
    generation: "3期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Reina&font=montserrat",
    profile: {
      height: "167cm",
      birthday: "2003-12-03",
      blood: "AB",
      hobby: "爵士乐 / 跑步",
      skill: "气场",
      catchphrase: "在舞台上，月光也要让路。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（1列）",
      "2nd Single": "A面选拔（1列）",
    },
  },
  {
    id: "m_ayame",
    name: "神崎 菖蒲",
    origin: "仙台 · 青叶",
    generation: "3期",
    isActive: true,
        avatar: "https://placehold.co/800x800/png?text=Ayame&font=montserrat",
    profile: {
      height: "161cm",
      birthday: "2006-09-30",
      blood: "O",
      hobby: "运动 / 电影",
      skill: "稳定唱功",
      catchphrase: "认真才是最酷的。",
    },
    selectionHistory: {
      "1st Single": "A面选拔（2列）",
      "2nd Single": "未选拔",
    },
  },
];

const seedSingles = [
  {
    id: "s1",
    title: "1st Single · Neon Bloom",
    release: "2025-09-01",
    cover:
      "https://placehold.co/1200x1200/png?text=Neon%20Bloom&font=montserrat",
    tracks: [
      { no: 1, title: "Neon Bloom (A-side)", isAside: true, audio: "" },
      { no: 2, title: "City Pulse", isAside: false, audio: "" },
      { no: 3, title: "Midnight Letter", isAside: false, audio: "" },
    ],
    asideLineup: {
      selectionCount: 12,
      rows: [5, 7],
      // slots holds member IDs in order (row-major)
      slots: [
        "m_akari",
        "m_reina",
        "m_yuna",
        "m_rin",
        "m_ayame",
        "m_mayu",
        "m_mika",
        "m_saki",
        "m_hina",
        "m_nana",
        null,
        null,
      ],
    },
    notes:
      "XJP56 出道单曲：霓虹与花朵的碰撞，带一点复古合成器的气味。",
  },
  {
    id: "s2",
    title: "2nd Single · Aurora Steps",
    release: "2026-01-10",
    cover:
      "https://placehold.co/1200x1200/png?text=Aurora%20Steps&font=montserrat",
    tracks: [
      { no: 1, title: "Aurora Steps (A-side)", isAside: true, audio: "" },
      { no: 2, title: "Snowdrift Waltz", isAside: false, audio: "" },
      { no: 3, title: "Afterglow", isAside: false, audio: "" },
    ],
    asideLineup: {
      selectionCount: 12,
      rows: [4, 4, 4],
      slots: [
        "m_reina",
        "m_akari",
        "m_yuna",
        "m_mika",
        "m_mayu",
        "m_rin",
        "m_ayame",
        "m_saki",
        "m_hina",
        "m_nana",
        null,
        null,
      ],
    },
    notes:
      "第二张单曲更偏大气合唱与层次堆叠；站位采用三排均衡阵型。",
  },
];

const seedPosts = [
  {
    id: "p1",
    title: "XJP56 首次公开演出：Neon Bloom Live",
    date: "2026-01-05",
    cover: "https://placehold.co/1600x900/png?text=Live&font=montserrat",
    content:
      "<p>我们在冬日的灯光里完成了第一次公开演出。感谢每一位到场的你。</p><ul><li>新编曲首次披露</li><li>成员MC环节</li><li>现场限定周边</li></ul><p>下一站见！</p>",
  },
  {
    id: "p2",
    title: "2nd Single《Aurora Steps》封面&曲目公开",
    date: "2026-01-09",
    cover: "https://placehold.co/1600x900/png?text=Aurora&font=montserrat",
    content:
      "<p>《Aurora Steps》以<strong>极光</strong>为主题：层层推进的节奏、明亮的和声与冷色系的舞台感。</p><p>曲目收录：Track1~3 全部公开，A面曲舞台即将上线。</p>",
  },
];

// ---------- Backend API ----------
// 不再使用 localStorage：数据与图片都走后端。
// 约定：
// - GET  {API_BASE}/data   -> { members, singles, posts }
// - POST {API_BASE}/data  -> 覆盖保存
// - POST {API_BASE}/upload (form-data: image) -> { url }
// ✅ 使用相对路径，避免 ngrok/手机端访问时写死 localhost
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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

// ✅ 用于 Blog 富文本：把 <img src="/uploads/..."> 转为指向后端域名
function resolveHtmlMedia(html) {
  if (!html || typeof html !== "string") return html;
  if (!API_BASE) return html;
  return html.replace(/(src|href)=("|')\/uploads\//g, `$1=$2${API_BASE}/uploads/`);
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
      if (m && typeof m === "object" && typeof m.avatar === "string") {
        m.avatar = toRelativeUploadsUrl(m.avatar);
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
  if (Array.isArray(out.posts)) {
    for (const p of out.posts) {
      if (p && typeof p === "object" && typeof p.cover === "string") {
        p.cover = toRelativeUploadsUrl(p.cover);
      }
    }
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

function isEmptyRemoteData(remote) {
  // 当后端是新库/空库时：{members:[], singles:[], posts:[]}
  // 我们希望自动灌入 seed，避免页面空空如也不好测试。
  if (!remote || typeof remote !== "object") return true;
  const m = Array.isArray(remote.members) ? remote.members.length : 0;
  const s = Array.isArray(remote.singles) ? remote.singles.length : 0;
  const p = Array.isArray(remote.posts) ? remote.posts.length : 0;
  return m + s + p === 0;
}


function withRecomputedSelections(data) {
  const singles = Array.isArray(data?.singles) ? data.singles : [];
  const members = Array.isArray(data?.members) ? data.members : [];

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
      // 毕业之后发行的单曲：不生成任何记录
      if (gradLimit && sRelease && sRelease > gradLimit) {
        continue;
      }

      const manual = (prev?.[sid] ?? "").toString().trim();
      // 允许在成员编辑里“手动标记为加入前”，此时不受站位影响
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
        // 没出现在站位里：统一视为“落选”
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
// 兼容旧数据：早期 selectionHistory 可能以“标题/描述”作为 key。
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
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 text-zinc-900">
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute top-40 left-10 h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute top-52 right-10 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16">{children}</div>

      <footer className="relative border-t border-zinc-200/70 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-sm text-zinc-700">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>XJP56 Showcase App</span>
            <Badge className="ml-2" variant="secondary">
              Local Demo
            </Badge>
          </div>
          <div className="text-zinc-600">
            数据将通过后端 API 保存（不再使用 localStorage）。音频较大时建议后续升级
            后端存储 / 对象存储。
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopBar({ page, setPage, admin, setAdmin, onReset }) {
  const tabs = [
    { key: "home", label: "主页", icon: Sparkles },
    { key: "members", label: "成员", icon: Users },
    { key: "singles", label: "单曲", icon: Disc3 },
    { key: "blog", label: "Blog", icon: Newspaper },
  ];

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-8 border-b border-zinc-200/70 bg-white/70 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button
          className="flex items-center gap-2 rounded-2xl px-3 py-2 hover:bg-white/70"
          onClick={() => setPage("home")}
        >
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black/5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-base font-semibold leading-tight">XJP56</div>
            <div className="flex items-center gap-2">
            <div className="text-xs text-zinc-600">Modern Showcase</div>
            {admin ? (
              <Badge className="rounded-full bg-indigo-600 text-white" variant="secondary">
                ADMIN
              </Badge>
            ) : null}
          </div>
          </div>
        </button>

        <div className="hidden items-center gap-1 rounded-2xl border border-zinc-200/70 bg-white/70 p-1 md:flex">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = page === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setPage(t.key)}
                className={
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition " +
                  (active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-800 hover:bg-black/5")
                }
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={admin ? "default" : "secondary"}>
                <Settings className="mr-2 h-4 w-4" />
                {admin ? "管理员模式" : "浏览模式"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60
    bg-white
    text-zinc-900
    border border-zinc-200
    shadow-lg">
              <DropdownMenuLabel>控制台</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setAdmin((v) => !v);
                }}
              >
                {admin ? "退出管理员" : "进入管理员"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  onReset();
                }}
              >
                重置为示例数据
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" className="md:hidden">
                <LayoutGrid className="mr-2 h-4 w-4" />
                菜单
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[360px] max-w-[90vw] max-h-[90vh] overflow-y-auto bg-white text-zinc-900">
              <SheetHeader>
                <SheetTitle className="text-zinc-900">导航</SheetTitle>
                <SheetDescription className="text-zinc-600">
                  快速切换页面
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 grid gap-2">
                {tabs.map((t) => {
                  const Icon = t.icon;
                  const active = page === t.key;
                  return (
                    <Button
                      key={t.key}
                      variant={active ? "default" : "secondary"}
                      className="justify-start"
                      onClick={() => setPage(t.key)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {t.label}
                    </Button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

function Hero({ activeMembersCount, totalMembersCount, singlesCount, postsCount, onGo }) {
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <motion.div
        className="md:col-span-7"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-zinc-200/70 bg-white/70">
          <CardHeader>
            <CardTitle className="text-3xl md:text-4xl">
              XJP56 官方主页（Demo）
            </CardTitle>
            <CardDescription className="text-zinc-700">
              现代、大气、时尚的组合展示：成员 · 单曲 · Blog，以及完整的管理员编辑与站位拖拽。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="成员（在籍 / 历代）" value={`${activeMembersCount} / ${totalMembersCount}`} />
              <Stat label="单曲" value={singlesCount} />
              <Stat label="新闻" value={postsCount} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onGo("members")}>
                <Users className="mr-2 h-4 w-4" />
                看成员
              </Button>
              <Button variant="secondary" onClick={() => onGo("singles")}>
                <Disc3 className="mr-2 h-4 w-4" />
                看单曲
              </Button>
              <Button variant="secondary" onClick={() => onGo("blog")}>
                <Newspaper className="mr-2 h-4 w-4" />
                看新闻
              </Button>
            </div>
            <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-sm text-zinc-700">
              提示：进入「管理员模式」后，在各页面都能新增/编辑/删除数据；单曲页面支持「输入排数与每排人数→生成占位框→拖动成员公式照排站位→保存」。
              <br />
              新增：A面支持上传音频并在详情页播放。
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="md:col-span-5"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
      >
        <Card className="border-zinc-200/70 bg-white/70">
          <CardHeader>
            <CardTitle>快速预览</CardTitle>
            <CardDescription className="text-zinc-700">
              视觉主色随内容变化的“极简豪华”风格。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <PreviewTile
                title="成员展示"
                desc="点击头像放大 + 右侧详情卡"
                icon={<Users className="h-4 w-4" />}
              />
              <PreviewTile
                title="单曲展示"
                desc="封面放大 + 选拔站位 + 拖拽编辑 + A面音源"
                icon={<Disc3 className="h-4 w-4" />}
              />
              <PreviewTile
                title="Blog"
                desc="新闻列表 + 详情页 + 编辑器/图片"
                icon={<Newspaper className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4">
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function PreviewTile({ title, desc, icon }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black/5">
        {icon}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-zinc-600">{desc}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div className="text-2xl font-semibold">{title}</div>
        {subtitle ? <div className="mt-1 text-zinc-600">{subtitle}</div> : null}
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
        {hint ? <div className="text-xs text-zinc-600">{hint}</div> : null}
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70">
          {value ? (
            <img
              src={resolveMediaUrl(value)}
              alt="preview"
              className="h-[140px] w-[140px] object-cover bg-zinc-100"
            />
          ) : (
            <div className="grid h-[140px] w-[140px] place-items-center text-zinc-600">
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
          <div className="text-xs text-zinc-600">
            上传后会上传到后端并自动压缩（前端只保存 URL）。
          </div>
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
        {hint ? <div className="text-xs text-zinc-600">{hint}</div> : null}
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
        <div className="text-xs text-zinc-600">
          {value ? "已上传音源（可播放）。" : "未上传音源。"}
          {" "}
          （音频将上传到服务器）
        </div>
        {value ? <audio className="w-full" controls src={resolveMediaUrl(value)} /> : null}
      </div>
    </div>
  );
}


// DialogContent wrapper: fixed height + inner scroll (prevents dialogs being cut off)
function ScrollDialogContent({ className = "", children, ...props }) {
  const base =
    "top-[5vh] translate-y-0 w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden p-0 " +
    "border-zinc-200/70 bg-white text-zinc-900 shadow-xl";
  return (
    <DialogContent {...props} className={`${base} ${className}`}>
      <div className="max-h-[90vh] overflow-y-auto p-6">{children}</div>
    </DialogContent>
  );
}


function MembersPage({ data, setData, admin }) {
  const [selected, setSelected] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive
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
    // 切换到毕业（isActive === false）时，必须填写毕业日期与毕业曲（可以写“无”）
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
        alert("请填写毕业曲的 title（填写“无”表示没有毕业曲且在成员界面不显示）");
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
    <div>
      <SectionHeader
        title="成员展示"
        subtitle="点击成员大头照：放大查看基础信息与历代单曲选拔状况。"
        right={
          admin ? (
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新增成员
            </Button>
          ) : null
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="text-sm text-zinc-600 mr-2">筛选：</div>
        <Button
          variant={statusFilter === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("all")}
        >
          全部
        </Button>
        <Button
          variant={statusFilter === "active" ? "default" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("active")}
        >
          在籍
        </Button>
        <Button
          variant={statusFilter === "inactive" ? "default" : "secondary"}
          size="sm"
          onClick={() => setStatusFilter("inactive")}
        >
          毕业
        </Button>

        <div className="mx-2 h-4 w-px bg-zinc-200/70" />
        <div className="text-sm text-zinc-600 mr-1">期数：</div>
        <Button
          variant={genFilter === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => setGenFilter("all")}
        >
          全部期
        </Button>
        {generations.map((g) => (
          <Button
            key={g}
            variant={genFilter === g ? "default" : "secondary"}
            size="sm"
            onClick={() => setGenFilter(g)}
          >
            {g}
          </Button>
        ))}

        <div className="ml-auto text-xs text-zinc-500">
          共 {filteredMembers.length} 人
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filteredMembers.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="group overflow-hidden border-zinc-200/70 bg-white/70">
              <div className="relative">
                <button className="block w-full" onClick={() => setSelected(m)}>
                  <img
                    src={resolveMediaUrl(m.avatar)}
                    alt={m.name}
                    className={"aspect-[3/4] w-full object-cover bg-zinc-100 transition duration-300 group-hover:scale-[1.02] " + (!m.isActive ? "grayscale" : "") }
                  />
                </button>
                <div className="absolute left-2 top-2 flex gap-2">
                  <Badge
                    className={generationBadgeClass(m.generation)} style={generationBadgeStyle(m.generation)}
                    variant="secondary"
                  >
                    {m.generation}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold leading-tight">{m.name}{!m.isActive ? "（卒）" : ""}</div>
                    <div className="mt-0.5 text-xs text-zinc-600">{m.romaji || ""}</div>
                  </div>
                  {admin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>


                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white opacity-100">
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => deleteMember(m.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog
        open={!!selected}
        onOpenChange={(v) => (!v ? setSelected(null) : null)}
      >
        <ScrollDialogContent className="max-w-4xl border-zinc-200/70 bg-white text-zinc-900">
          {selected ? (
            <div className="grid gap-6 md:grid-cols-2 items-start">
              <div className="grid gap-3">
                {/* 需求：移除照片与“总选举顺位”之间的大块空白，让布局更紧凑（不改其他结构） */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white aspect-[3/4]">
                  <img
                    src={resolveMediaUrl(selected.avatar)}
                    alt={selected.name}
                    className={"h-full w-full object-cover bg-zinc-100 " + (!selected.isActive ? "grayscale" : "") }
                  />
                </div>

                <Card className="border-zinc-200/70 bg-white/70">
                  <CardHeader>
                    <CardTitle className="text-base">总选举顺位</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    {(selected.electionRanks || []).length ? (
                      (selected.electionRanks || []).map((r, idx) => (
                        <div
                          key={`${r.edition || ""}-${r.rank || ""}-${idx}`}
                          className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2"
                        >
                          <div className="text-zinc-700">{r.edition || "—"}</div>
                          {(() => {
                            const b = getElectionBadge(r.rank);
                            return (
                              <span
                                className={
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium " +
                                  b.className
                                }
                              >
                                {b.text}
                              </span>
                            );
                          })()}
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-600">—</div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-4">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    <div className="flex items-baseline gap-3">
                      <div>{selected.name}</div>
                      {selected.romaji ? <div className="text-sm text-zinc-600">{selected.romaji}</div> : null}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-zinc-600">
                    {selected.origin} · {selected.generation}
                    {!selected.isActive && selected.graduationDate ? (
                      <span className="ml-2">· 毕业：{isoDate(selected.graduationDate)}</span>
                    ) : null}
                    {/* 毕业曲：有且不为 "无" 时显示 */}
                    {!selected.isActive && (selected.graduationSongTitle || "").trim() && (selected.graduationSongTitle || "").trim() !== "无" ? (
                      <span className="ml-2">· 毕业曲：{selected.graduationSongTitle}</span>
                    ) : null}
                  </DialogDescription>
                </DialogHeader>

                <Card className="border-zinc-200/70 bg-white/70">
                  <CardHeader>
                    <CardTitle className="text-base">基础信息</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <Info label="身高" value={selected.profile.height} />
                    <Info label="生日" value={selected.profile.birthday} />
                    <Info label="血型" value={selected.profile.blood} />
                    <Info label="爱好" value={selected.profile.hobby} />
                    <Info label="特长" value={selected.profile.skill} />
                    <div className="col-span-2">
                      <div className="text-xs text-zinc-600">口号</div>
                      <div className="mt-1">{selected.profile.catchphrase}</div>
                    </div>
                  </CardContent>
                </Card>

                

                {selected.generation && String(selected.generation).startsWith("5") && Array.isArray(selected.admireSenior) && selected.admireSenior.length ? (
                  <Card className="border-zinc-200/70 bg-white/70">
                    <CardHeader>
                      <CardTitle className="text-base">憧憬的前辈</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-1 text-sm">
                      {selected.admireSenior.map((id) => {
                        const mm = (data.members || []).find((x) => x.id === id);
                        return mm ? <div key={id}>{mm.name}</div> : null;
                      })}
                    </CardContent>
                  </Card>
                ) : null}
<Card className="border-zinc-200/70 bg-white/70">
                  <CardHeader>
                    <CardTitle className="text-base">历代单曲选拔状况</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                  {(() => {
                    const raw = selected?.selectionHistory || {};
                    const gradLast = (!selected?.isActive && selected?.graduationDate)
                      ? getLastSingleBeforeGrad(selected, data?.singles || [])
                      : { lastSingleId: null, lastRelease: "" };
                    const lastSingleIdBeforeGrad = gradLast.lastSingleId;
                    const entries = Object.entries(raw).map(([k, v]) => {
                      if (v && typeof v === "object") {
                        return {
                          k,
                          label: v.label ?? k,
                          value: v.value ?? "",
                        };
                      }
                      return { k, label: k, value: String(v ?? "") };
                    });
                    if (entries.length === 0) {
                      return (
                        <div className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-3 text-zinc-500">
                          —
                        </div>
                      );
                    }

                    return entries.map(({ k, label, value }) => {
                      // selectionHistory 的 key 通常是 single.id（例如 s1/s2）。
                      // 为避免显示成 “s1”，优先用 singles 里真实的 title。
                      const singleObj = (data?.singles || []).find((s) => s.id === k);
                      // label 可能是旧版本写入的显示标题；如果 singleObj 存在就用它。
                      let title = (singleObj?.title ?? label ?? "").toString();
                      // If old data had something like "1st Single · 1st Single · X", keep only the last 2 segments
                      const parts = title.split("·").map((s) => s.trim()).filter(Boolean);
                      if (parts.length >= 3) title = parts.slice(parts.length - 2).join(" · ");

                      const { prefix, name } = splitSingleTitle(title);

                      // value format examples: "A面选拔（第1排 center）" / "B面（第2排 护法）" / "未入选"
                      const pickType = value.includes("加入前")
                        ? "加入前"
                        : value.includes("A面")
                        ? "A面选拔"
                        : value.includes("B面")
                        ? "B面"
                        : value.includes("落选") || value.includes("未入选")
                        ? "落选"
                        : "";
                      const typeTagClass = pickType === "A面选拔"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : pickType === "B面"
                        ? "border-sky-200 bg-sky-50 text-sky-800"
                        : pickType === "加入前"
                        ? "border-violet-200 bg-violet-50 text-violet-800"
                        : pickType === "落选"
                        ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                        : "border-zinc-200 bg-white text-zinc-700";

                      const rowM = value.match(/第(\d+)排/);
                      const rowText = rowM ? `第${rowM[1]}排` : "";
                      const role = value.includes("center") ? "center" : value.includes("护法") || value.includes("guardian") ? "guardian" : null;

                      return (
                        <div key={k} className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <div className="text-sm font-medium text-zinc-900">
                              {prefix ? `${prefix}: ${name}` : name}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {!selected?.isActive && lastSingleIdBeforeGrad && k === lastSingleIdBeforeGrad ? (
                                <span className="inline-flex items-center rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-0.5 text-fuchsia-800">
                                  毕业前最后一单
                                </span>
                              ) : null}
                              {pickType ? (
                                <span className={"inline-flex items-center rounded-full border px-2 py-0.5 " + typeTagClass}>
                                  {pickType}
                                </span>
                              ) : null}

                              {rowText ? (
                                <span className="inline-flex items-center rounded-full border border-zinc-200 px-2 py-0.5 text-zinc-700">
                                  {rowText}
                                </span>
                              ) : null}

                              {role === "center" ? (
                                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                                  CENTER
                                </span>
                              ) : role === "guardian" ? (
                                <span className="inline-flex items-center rounded-full border border-zinc-300 bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-900">
                                  护法
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </ScrollDialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollDialogContent className="max-w-3xl border-zinc-200/70 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>{editing?.name ? "编辑成员" : "新增成员"}</DialogTitle>
            <DialogDescription className="text-zinc-600">
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
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white/70 px-3 py-2">
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
                    <div className="text-sm text-zinc-700">在籍</div>
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
                    <div className="text-sm font-medium">毕业曲（填“无”表示不显示）</div>
                    <Input
                      value={editing.graduationSongTitle || ""}
                      onChange={(e) => setEditing((p) => ({ ...p, graduationSongTitle: e.target.value }))}
                      placeholder="例如：Farewell Song / 无"
                    />
                    <div className="text-xs text-zinc-600">把成员从在籍改为毕业时必须填写。</div>
                  </div>
                ) : null}
              </div>

              <ImageUploader
                label="成员公式照"
                value={editing.avatar}
                onChange={(url) => setEditing((p) => ({ ...p, avatar: url }))}
                hint="建议 1:1"
              />

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">基础信息</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
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
                </CardContent>
              </Card>

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">总选举顺位</CardTitle>
                  <CardDescription className="text-zinc-600">
                    每行填写一届总选举的排名：输入数字 1-19 会自动标注（选拔/UG），20 及以后自动显示为「圈外」。不在榜单可写「加入前」。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
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
                    <div className="text-sm text-zinc-600">—</div>
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
                </CardContent>
              </Card>

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">历代单曲选拔状况</CardTitle>
                  <CardDescription className="text-zinc-600">
                    这里给你预留了 1st/2nd 两条；你也可以改 key。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
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
                </CardContent>
              </Card>

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
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
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
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-1 text-zinc-900">{value || "—"}</div>
    </div>
  );
}

function SinglesPage({ data, setData, admin }) {
  const membersById = useMemo(() => {
    const m = new Map();
    data.members.forEach((x) => m.set(x.id, x));
    return m;
  }, [data.members]);

  const [selectedId, setSelectedId] = useState(null);
  const selected = data.singles.find((s) => s.id === selectedId) || null;

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

  // ✅ 单曲站位显示：截止到当前单曲“发布顺序(按 release 升序)”的累计选拔次数
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

    // 2) 累计统计：每张单曲的 asideLineup 里出现一次算“进入一次”
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
    rowsText: "5,7",
  });

  const openEdit = (s) => {
    const draft =
      s ??
      ({
        id: `s_${uid()}`,
        title: "",
        release: "",
        cover: "",
        tracks: [
          { no: 1, title: "(A-side)", isAside: true, audio: "" },
          { no: 2, title: "", isAside: false, audio: "" },
          { no: 3, title: "", isAside: false, audio: "" },
        ],
        asideLineup: {
          selectionCount: 12,
          rows: [5, 7],
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
      rowsText: (copy.asideLineup.rows || [5, 7]).join(","),
    });
    setEditorOpen(true);
  };

  const saveSingle = () => {
    setData((prev) => {
      const exists = prev.singles.some((x) => x.id === editing.id);
      const nextSingles = exists
        ? prev.singles.map((x) =>
            x.id === editing.id ? editing : x
          )
        : [...prev.singles, editing];

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
    <div>
      <SectionHeader
        title="单曲展示"
        subtitle="主界面展示每首单曲封面与标题；点入后可看曲目收录、A面选拔站位；管理员可编辑封面/曲目信息/站位/音源。"
        right={
          admin ? (
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新增单曲
            </Button>
          ) : null
        }
      />

      {/*
        需求：当站位每排人数较少（如 5 人）时，右侧内容宽度变小会导致两列随内容伸缩，
        进而让左侧单曲卡片看起来被拉长。
        仅将两列改为 minmax(0, …) 固定分配，避免被内容挤压/拉伸。
      */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] ">
        <div className="grid gap-4">
          {data.singles.map((s) => (
            <Card
              key={s.id}
              className={
                "overflow-hidden border-zinc-200/70 bg-white/70 transition " +
                (selectedId === s.id ? "ring-2 ring-zinc-300/70" : "")
              }
            >
              <div className="grid md:grid-cols-[160px_1fr]">
                <button className="block w-full" onClick={() => setSelectedId(s.id)}>
                  <img
                    src={resolveMediaUrl(s.cover)}
                    alt={s.title}
                    // 手机端：封面完整显示不裁切；电脑版保持原样
                    className="w-full object-contain bg-zinc-100 md:h-[160px] md:w-[160px] md:object-cover"
                  />
                </button>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <div className="text-base font-semibold leading-tight">{s.title}</div>
                    <div className="mt-1 text-sm text-zinc-600">
                      Release: {s.release || "—"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-black/5">
                        {s.tracks?.length || 0} Tracks
                      </Badge>
                      <Badge variant="secondary" className="bg-black/5">
                        A面选拔：{s.asideLineup?.selectionCount || 0}
                      </Badge>
                      <Badge variant="secondary" className="bg-black/5">
                        {s.tracks?.[0]?.audio ? "A面有音源" : "A面无音源"}
                      </Badge>
                    </div>
                  </div>

                  {admin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white opacity-100">
                        <DropdownMenuItem onClick={() => openEdit(s)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => deleteSingle(s.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="md:sticky md:top-[96px] md:self-start md:max-h-[calc(100vh-96px)] md:overflow-y-auto md:min-h-0">
          {/* 手机端自动滚动锚点（md 以上不受影响） */}
          <div ref={detailAnchorRef} />
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <ErrorBoundary><SingleDetail single={selected} membersById={membersById} admin={admin} cumulativeCounts={cumulativeCounts} /></ErrorBoundary>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="border-zinc-200/70 bg-white/70">
                  <CardHeader>
                    <CardTitle>选择一首单曲</CardTitle>
                    <CardDescription className="text-zinc-600">
                      点击左侧列表中的封面进入详情页。
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollDialogContent className="max-w-5xl border-zinc-200/70 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>{editing?.title ? "编辑单曲" : "新增单曲"}</DialogTitle>
            <DialogDescription className="text-zinc-600">
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

              <ImageUploader
                label="单曲封面"
                value={editing.cover}
                onChange={(url) => setEditing((p) => ({ ...p, cover: url }))}
                hint="建议 1:1"
              />

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    曲目收录（{editing.tracks?.length || 0} tracks）
                  </CardTitle>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
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
                      <Plus className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing((p) => {
                          const prevTracks = Array.isArray(p.tracks) ? p.tracks : [];
                          if (prevTracks.length <= 1) return p; // 至少保留 A面
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
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {(Array.isArray(editing.tracks) ? editing.tracks : []).map((t, idx) => (
                    <div key={idx} className="grid gap-2 md:grid-cols-[120px_1fr_140px]">
                      <Input value={`Track ${t.no}`} disabled className="bg-white/70" />
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
                          <div className="text-xs text-zinc-600">A面支持音源与站位</div>
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
                </CardContent>
              </Card>

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">A 面曲选拔站位编辑</CardTitle>
                  <CardDescription className="text-zinc-600">
                    1) 输入排数与每排人数；2) 生成占位框；3) 从下方成员池拖拽公式照到占位框；4) 保存。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
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
                </CardContent>
              </Card>

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

function SingleDetail({single, membersById, admin, cumulativeCounts}) {
  const [coverZoom, setCoverZoom] = useState(false);
  const audioRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null); // { no, title, audio }

  const rows = single.asideLineup?.rows || [];
  const slots = single.asideLineup?.slots || [];
  const slotRolesForView = single.asideLineup?.slotRoles || {};

  // 站位展示规则（按你的需求重做）：
  // 1) 不管每排人数是多少，头像/卡片尺寸都固定为“每排 3 人”时的大小，不做缩放；
  // 2) 人数/排数过多时，不拉伸外层卡片，改为站位区域内部滚动查看；
  // 3) 手机端同样保持不变形：必要时支持横向/纵向滚动。
  const maxPerRow = rows.length ? Math.max(...rows.map((n) => Number(n) || 0)) : 0;
  const lineupScale = 1; // 基于“每排 5 人”时的尺寸（不随人数变化缩放）
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
  const asideTrack = tracks.find((t) => t.isAside) || tracks[0];
  const hasAnyAudio = tracks.some((t) => !!t?.audio);
  const hasAsideAudio = !!asideTrack?.audio;

  // 切换单曲时，默认选中“有音源的优先轨道”（优先 A 面）
  useEffect(() => {
    const preferred = (hasAsideAudio ? asideTrack : null) || tracks.find((t) => !!t?.audio) || null;
    setCurrentTrack(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single?.id]);

  // 当切换到某个音源时，自动播放
  useEffect(() => {
    if (!currentTrack?.audio) return;
    const el = audioRef.current;
    if (!el) return;
    // 让浏览器有机会先更新 src
    const t = setTimeout(() => {
      try { el.load(); } catch (e) {}
    }, 0);
    return () => clearTimeout(t);
  }, [currentTrack?.audio]);

  return (
    <Card className="border-zinc-200/70 bg-white/70">
      <CardHeader>
        <CardTitle className="text-xl">{single.title}</CardTitle>
        <CardDescription className="text-zinc-700">
          Release: {single.release || "—"}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <button
            className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white"
            onClick={() => setCoverZoom(true)}
            title="点击放大封面"
          >
            <img
              src={resolveMediaUrl(single.cover)}
              alt={single.title}
              className="aspect-square w-full object-contain bg-white"
            />
          </button>
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-black/5">
                A面选拔：{single.asideLineup?.selectionCount || 0}
              </Badge>
              <Badge variant="secondary" className="bg-black/5">
                站位排数：{single.asideLineup?.rows?.length || 0}
              </Badge>
              <Badge variant="secondary" className="bg-black/5">
                {hasAnyAudio ? "已上传音源" : "未上传音源"}
              </Badge>
            </div>

            <Card className="border-zinc-200/70 bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">曲目收录</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {tracks.map((t) => (
                  <div
                    key={t.no}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="text-zinc-600">Track {t.no}</span>
                      <span className="mx-2">·</span>
                      <span className="font-medium">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-black/5">
                        {t.isAside ? "A-side" : "B-side"}
                      </Badge>

                      {t.audio ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setCurrentTrack({ no: t.no, title: t.title, audio: t.audio });
                            // 如果当前已经选中该曲，直接触发播放
                            if (currentTrack?.no === t.no) {
                              audioRef.current?.play().catch(() => {});
                            }
                          }}
                          title={`播放 Track ${t.no}`}
                        >
                          <Music className="mr-2 h-4 w-4" />
                          播放
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-black/5">
                          未上传音源
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {currentTrack?.audio ? (
                  <div className="mt-2 rounded-2xl border border-zinc-200/70 bg-white/70 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-medium text-zinc-900">
                        正在播放：Track {currentTrack.no} · {currentTrack.title}
                      </div>
                      <Badge variant="secondary" className="bg-black/5">
                        {tracks.find((t) => t.no === currentTrack.no)?.isAside ? "A-side" : "B-side"}
                      </Badge>
                    </div>
                    <audio
                      ref={audioRef}
                      src={resolveMediaUrl(currentTrack.audio)}
                      controls
                      className="w-full"
                    />
                    <div className="mt-2 text-xs text-zinc-600">
                      音源为本地上传并保存为服务器文件 URL。
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {single.notes ? (
              <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-sm text-zinc-700">
                {single.notes}
              </div>
            ) : null}
          </div>
        </div>

        <Card className="border-zinc-200/70 bg-white/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">A 面曲选拔站位</CardTitle>
            <CardDescription className="text-zinc-600">
              以成员公式照排开（示例站位）。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
                          "group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 flex-none " +
                          frameCls
                        }
                        style={{ width: tileW, height: tileH }}
                        title={m ? m.name : "空位"}
                      >
                        {m ? (
                          <div className="grid h-full w-full" style={{ gridTemplateRows: `${imgH}px auto` }}>
                            <div className="overflow-hidden rounded-xl bg-white">
                              <img
                                src={resolveMediaUrl(m.avatar)}
                                alt={m.name}
                                className={"h-full w-full object-contain bg-white " + (!m.isActive ? "grayscale" : "")}
                              />
                            </div>

                            <div className="px-2 pt-2 pb-2 text-center">
                              {genText ? (
                                <div className="mb-1 flex justify-center">
                                  <span
                                    className={
                                      "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold " +
                                      generationBadgeClass(genText)
                                    }
                                    style={{ fontSize: badgeFont, ...generationBadgeStyle(genText) }}
                                  >
                                    {genText}
                                  </span>
                                </div>
                              ) : null}

                              <div
                                className="text-zinc-900"
                                style={{ fontSize: nameFont, lineHeight: 1.2, wordBreak: "break-word" }}
                              >
                                {m.name}
                                {countText}
                              </div>

                              {rb ? (
                                <div className="mt-2 flex justify-center">
                                  <span
                                    className={
                                      "inline-flex items-center rounded-full border px-3 py-1 font-semibold " +
                                      rb.className
                                    }
                                    style={{ fontSize: badgeFont }}
                                  >
                                    {rb.text}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-zinc-500">空位</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}            </div>
            {admin ? (
              <div className="text-xs text-zinc-600">
                站位编辑请在「编辑单曲」弹窗里操作。
              </div>
            ) : null}
          </CardContent>
        </Card>
      </CardContent>

      <Dialog open={coverZoom} onOpenChange={setCoverZoom}>
        <ScrollDialogContent className="max-w-4xl border-zinc-200/70 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>封面放大</DialogTitle>
            <DialogDescription className="text-zinc-600">
              点击外部或按 ESC 关闭。
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
            <img src={resolveMediaUrl(single.cover)} alt={single.title} className="w-full" />
          </div>
        </ScrollDialogContent>
      </Dialog>
    </Card>
  );
}

function LineupEditor({ singleDraft, setSingleDraft, members }) {
  // 防御：进入编辑页的首帧 editing 可能还是 null/undefined，避免直接白屏
  if (!singleDraft) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        加载中…（singleDraft 为空）
      </div>
    );
  }
  members = Array.isArray(members) ? members : [];
  const lineup =
    singleDraft.asideLineup || { selectionCount: 12, rows: [5, 7], slots: [] };
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

  // Graduated members should not appear in the picker for singles released after their graduation.
  const singleRelease = isoDate(singleDraft?.release);
  const pickerMembers = useMemo(() => {
    if (!singleRelease) return members;
    return (members || []).filter((m) => {
      const gd = isoDate(m?.graduationDate);
      if (!gd) return true;
      if (m?.isActive) return true;
      return singleRelease <= gd;
    });
  }, [members, singleRelease]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlotIndex, setPickerSlotIndex] = useState(null);
  const [pickerRole, setPickerRole] = useState(null); // null | "center" | "guardian"

  const openPickerForSlot = (slotIndex) => {
    setPickerSlotIndex(slotIndex);
    const r = (lineup.slotRoles || {})[slotIndex] || null;
    setPickerRole(r === "center" || r === "guardian" ? r : null);
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
        <div className="absolute left-1 top-1 rounded-full bg-yellow-400/95 px-2 py-0.5 text-[10px] font-semibold text-zinc-900 shadow">
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
      <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-xs text-zinc-600">
        点击站位框选择成员（所有位置可设置 普通 / center / 护法）。
      </div>

      <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4">
        <div className="grid gap-3">
          {/* 展示顺序：最上面=第1排（rows 最后一项），最下面=最后排 */}
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
                        "relative overflow-hidden rounded-2xl border border-dashed border-zinc-300/80 bg-white/70 " +
                        roleFrameClass(slotIndex)
                      }
                      style={{ width: 90, height: 140 }}
                      onClick={() => openPickerForSlot(slotIndex)}
                      title={m ? m.name : "空位"}
                    >
                      {roleBadge(slotIndex)}
                      {m ? (
                        <>
                          <img
                            src={resolveMediaUrl(m.avatar)}
                            alt={m.name}
                            className={
                              "h-full w-full object-cover bg-zinc-100 " +
                              (!m.isActive ? "grayscale" : "")
                            }
                          />
                          <button
                            type="button"
                            className="absolute right-1 top-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] text-zinc-700 shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearSlot(slotIndex);
                            }}
                            title="清空"
                          >
                            清空
                          </button>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                          —
                        </div>
                      )}
                    </div>

                    <div className="text-xs font-medium text-zinc-800">
                      {m ? `${m.name}${!m.isActive ? "（卒業）" : ""}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-5xl border-zinc-200/70 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>选择成员</DialogTitle>
            <DialogDescription className="text-zinc-600">
              点击成员即可填入当前站位{pickerSlotIndex !== null ? `（#${pickerSlotIndex + 1}）` : ""}。
            </DialogDescription>
          </DialogHeader>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="text-xs text-zinc-600 mr-1">位置类型：</div>
            <button
              type="button"
              className={
                "px-3 py-1 rounded-md border text-sm " +
                (pickerRole === null ? "bg-zinc-100 border-zinc-300" : "bg-white border-zinc-200")
              }
              onClick={() => setPickerRole(null)}
            >
              普通
            </button>
            <button
              type="button"
              className={
                "px-3 py-1 rounded-md border text-sm " +
                (pickerRole === "center" ? "bg-yellow-100 border-yellow-300" : "bg-white border-zinc-200")
              }
              onClick={() => setPickerRole("center")}
            >
              center
            </button>
            <button
              type="button"
              className={
                "px-3 py-1 rounded-md border text-sm " +
                (pickerRole === "guardian" ? "bg-zinc-100 border-zinc-300" : "bg-white border-zinc-200")
              }
              onClick={() => setPickerRole("guardian")}
            >
              护法
            </button>
          </div>

          <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-auto p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {pickerMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => assignMemberToSlot(m.id)}
                className={
                  "group overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md flex flex-col " +
                  (used.has(m.id) ? "opacity-70" : "")
                }
                title={m.name}
              >
                <div className="aspect-[3/4] w-full bg-zinc-100 rounded-xl overflow-hidden">
                  <img
                    src={resolveMediaUrl(m.avatar)}
                    alt={m.name}
                    className={"h-full w-full object-cover " + (!m.isActive ? "grayscale" : "")}
                  />
                </div>
                <div className="px-2 py-2">
                  <div className="text-xs font-medium text-zinc-900">
                    {m.name}{!m.isActive ? "（卒業）" : ""}
                  </div>
                  <div className="text-[10px] text-zinc-600">{m.romaji || ""}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function BlogPage({ data, setData, admin }) {
  const [selectedId, setSelectedId] = useState(data.posts[0]?.id || null);
  const selected = data.posts.find((p) => p.id === selectedId) || null;

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const editorRef = useRef(null);

  const openEdit = (p) => {
    setEditing(
      p ?? {
        id: `p_${uid()}`,
        title: "",
        date: new Date().toISOString().slice(0, 10),
        cover: "",
        content: "<p>在这里写新闻内容……</p>",
      }
    );
    setEditorOpen(true);
  };

  const savePost = () => {
    const html = editorRef.current?.innerHTML ?? editing.content;
    const nextEditing = { ...editing, content: html };
    setData((prev) => {
      const exists = prev.posts.some((x) => x.id === nextEditing.id);
      const nextPosts = exists
        ? prev.posts.map((x) => (x.id === nextEditing.id ? nextEditing : x))
        : [nextEditing, ...prev.posts];
      return { ...prev, posts: nextPosts };
    });
    setEditorOpen(false);
    setSelectedId(nextEditing.id);
  };

  const deletePost = (id) => {
    setData((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== id) }));
    if (selectedId === id) {
      const rest = data.posts.filter((p) => p.id !== id);
      setSelectedId(rest[0]?.id || null);
    }
  };

  const insertImage = async (file) => {
    const url = await uploadImage(file);
    if (!editorRef.current) return;
    const img = document.createElement("img");
    img.src = url;
    img.alt = "uploaded";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "16px";
    img.style.margin = "12px 0";

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.insertNode(img);
      range.collapse(false);
    } else {
      editorRef.current.appendChild(img);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Blog / 新闻"
        subtitle="新闻标题列表 → 点开看详情；管理员可写新闻并上传图片。"
        right={
          admin ? (
            <Button onClick={() => openEdit(null)}>
              <Plus className="mr-2 h-4 w-4" />
              新增新闻
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="grid gap-4">
          {data.posts.map((p) => (
            <Card
              key={p.id}
              className={
                "overflow-hidden border-zinc-200/70 bg-white/70 transition " +
                (selectedId === p.id ? "ring-2 ring-zinc-300/70" : "")
              }
            >
              <div className="grid md:grid-cols-[160px_1fr]">
                <button className="block" onClick={() => setSelectedId(p.id)}>
                  <img
                    src={resolveMediaUrl(p.cover)}
                    alt={p.title}
                    className="h-[140px] w-full object-cover md:h-[160px] md:w-[160px]"
                  />
                </button>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <div className="text-base font-semibold leading-tight">{p.title}</div>
                    <div className="mt-2 text-sm text-zinc-600">{p.date}</div>
                  </div>
                  {admin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white opacity-100">
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-500"
                          onClick={() => deletePost(p.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="md:sticky md:top-[96px] md:self-start md:max-h-[calc(100vh-96px)] md:overflow-y-auto md:min-h-0">
          {selected ? (
            <Card className="border-zinc-200/70 bg-white/70">
              <CardHeader>
                <CardTitle className="text-xl">{selected.title}</CardTitle>
                <CardDescription className="text-zinc-700">{selected.date}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
                  <img
                    src={resolveMediaUrl(selected.cover)}
                    alt={selected.title}
                    className="w-full object-cover"
                  />
                </div>
                <div
                  className="prose prose-invert max-w-none prose-p:text-zinc-800 prose-li:text-zinc-800 prose-strong:text-zinc-900"
                  dangerouslySetInnerHTML={{ __html: resolveHtmlMedia(selected.content) }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-zinc-200/70 bg-white/70">
              <CardHeader>
                <CardTitle>暂无新闻</CardTitle>
                <CardDescription className="text-zinc-600">你可以在管理员模式下新增。</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <ScrollDialogContent className="max-w-5xl border-zinc-200/70 bg-white text-zinc-900">
          <DialogHeader>
            <DialogTitle>{editing?.title ? "编辑新闻" : "新增新闻"}</DialogTitle>
            <DialogDescription className="text-zinc-600">
              简易 Blog 编辑器（contenteditable）：支持粘贴文本、加粗、列表；可上传图片插入到光标处。
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <LabeledInput
                  label="标题"
                  value={editing.title}
                  onChange={(v) => setEditing((p) => ({ ...p, title: v }))}
                  placeholder="例如：..."
                />
                <LabeledInput
                  label="日期"
                  value={editing.date}
                  onChange={(v) => setEditing((p) => ({ ...p, date: v }))}
                  placeholder="YYYY-MM-DD"
                />
              </div>

              <ImageUploader
                label="新闻封面"
                value={editing.cover}
                onChange={(url) => setEditing((p) => ({ ...p, cover: url }))}
                hint="建议 16:9"
              />

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => document.execCommand("bold")}>
                  加粗
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.execCommand("insertUnorderedList")}
                >
                  无序列表
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.execCommand("insertOrderedList")}
                >
                  有序列表
                </Button>
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      await insertImage(file);
                      e.target.value = "";
                    }}
                    className="h-9 w-[220px]"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">正文</div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[240px] rounded-2xl border border-zinc-200/70 bg-white/70 p-4 text-zinc-900 outline-none"
                  dangerouslySetInnerHTML={{ __html: editing.content }}
                />
                <div className="text-xs text-zinc-600">
                  小提示：可以直接复制粘贴外部文本/图片（不同浏览器表现略有差异）。
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditorOpen(false)}>
                  取消
                </Button>
                <Button onClick={savePost}>
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

export default function XJP56App() {
  const [page, setPage] = useState("home");
  const [admin, setAdmin] = useState(false);
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGetData()
      .then((remote) => {
        if (cancelled) return;
        const base = remote || { members: [], singles: [], posts: [] };
        const migratedMembers = migrateSelectionHistoryKeys(base.members || [], base.singles || []);
        const normalized = withRecomputedSelections({ ...base, members: migratedMembers });
        setData(normalized);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e?.message || e || "Failed to load data"));
        setData(withRecomputedSelections({ members: [], singles: [], posts: [] }));
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
    const empty = withRecomputedSelections({ members: [], singles: [], posts: [] });
    setData(empty);
    setPage("home");
    apiSaveData(empty).catch(() => {});
  };

  if (!loaded) {
    return (
      <AppShell>
        <div className="py-20 text-center text-zinc-600">Loading…</div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
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
        <div className="py-20 text-center text-zinc-600">No data</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar page={page} setPage={setPage} admin={admin} setAdmin={setAdmin} onReset={onReset} />

      {admin ? (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <span className="font-semibold">管理员模式已开启：</span>
          你可以新增 / 编辑 / 删除成员、单曲和新闻；并在单曲里拖拽编辑站位与上传音源。
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
              activeMembersCount={data.members.filter((m) => m.isActive).length}
              totalMembersCount={data.members.length}
              singlesCount={data.singles.length}
              postsCount={data.posts.length}
              onGo={setPage}
            />

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <QuickCard
                title="成员"
                desc="点击头像看详情；管理员可新增/编辑/删除。"
                icon={<Users className="h-4 w-4" />}
                actionLabel="进入成员页"
                onAction={() => setPage("members")}
              />
              <QuickCard
                title="单曲"
                desc="封面放大、曲目收录、A面站位；管理员可拖拽排位并上传音源。"
                icon={<Disc3 className="h-4 w-4" />}
                actionLabel="进入单曲页"
                onAction={() => setPage("singles")}
              />
              <QuickCard
                title="Blog"
                desc="新闻列表与详情；管理员有编辑器与图片上传。"
                icon={<Newspaper className="h-4 w-4" />}
                actionLabel="进入 Blog"
                onAction={() => setPage("blog")}
              />
            </div>

            <div className="mt-8">
              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">测试清单</CardTitle>
                  <CardDescription className="text-zinc-600">
                    你可以按下面步骤验证需求是否全部满足。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm text-zinc-800">
                    <ChecklistItem>
                      成员页：逐个展示头像与姓名；点击头像弹窗放大；右侧显示姓名/出身/期数/选拔状况。
                    </ChecklistItem>
                    <ChecklistItem>
                      成员页（管理员）：新增/编辑/删除成员；上传照片；编辑基础信息与选拔记录。
                    </ChecklistItem>
                    <ChecklistItem>
                      单曲页：列表展示封面与 title；点入详情封面可放大；显示 Track1~3。
                    </ChecklistItem>
                    <ChecklistItem>
                      单曲详情：A面支持音频播放（上传后出现播放器）；展示 A 面选拔站位（按排数排开）。
                    </ChecklistItem>
                    <ChecklistItem>
                      单曲编辑：输入选拔人数 + 排数/每排人数 → 生成占位框；从成员池拖拽头像到占位框；保存后站位永久保存。
                    </ChecklistItem>
                    <ChecklistItem>
                      Blog：新闻列表 + 详情；管理员可新增/编辑/删除；编辑器支持插图。
                    </ChecklistItem>
                  </div>
                </CardContent>
              </Card>
            </div>
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
            <SinglesPage data={data} setData={setData} admin={admin} />
          </motion.div>
        ) : null}

        {page === "blog" ? (
          <motion.div
            key="blog"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
          >
            <BlogPage data={data} setData={setData} admin={admin} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

function QuickCard({ title, desc, icon, actionLabel, onAction }) {
  return (
    <Card className="border-zinc-200/70 bg-white/70">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-zinc-700">{desc}</CardDescription>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black/5">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={onAction} className="w-full">
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ children }) {
  return (
    <div className="flex gap-2">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-white/70" />
      <div>{children}</div>
    </div>
  );
}
