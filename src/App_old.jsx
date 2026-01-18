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
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

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

// ---------- Local Storage ----------
const STORAGE_KEY = "xjp56_app_v2_audio";

function loadData() {
  const fallback = { members: seedMembers, singles: seedSingles, posts: seedPosts };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // 兼容旧 key（如果你之前跑过 v1）
    const old = localStorage.getItem("xjp56_app_v1");
    const migrated = old ? migrateData(old) : null;
    return migrated ?? fallback;
  }
  const migrated = migrateData(raw);
  return migrated ?? fallback;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------- Components ----------
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
            数据保存在浏览器 localStorage（刷新后仍在）。音频较大时建议后续升级
            IndexedDB。
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

function Hero({ membersCount, singlesCount, postsCount, onGo }) {
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
              <Stat label="成员" value={membersCount} />
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
              src={value}
              alt="preview"
              className="h-[140px] w-[140px] object-cover"
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
              const dataUrl = await readFileAsDataURL(file);
              onChange(dataUrl);
            }}
          />
          <div className="text-xs text-zinc-600">
            上传后会转成 dataURL 保存在 localStorage（用于 demo）。
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
            const dataUrl = await readFileAsDataURL(file);
            onChange(dataUrl);
            e.target.value = "";
          }}
        />
        <div className="text-xs text-zinc-600">
          {value ? "已上传音源（可播放）。" : "未上传音源。"}
          {" "}
          （提示：音频较大时 localStorage 可能容量不足）
        </div>
        {value ? <audio className="w-full" controls src={value} /> : null}
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

  const members = data.members;

  const openEdit = (m) => {
    setEditing(
      m ?? {
        id: `m_${uid()}`,
        name: "",
        origin: "",
        generation: "",
        avatar: "",
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
    setData((prev) => {
      const exists = prev.members.some((x) => x.id === editing.id);
      const nextMembers = exists
        ? prev.members.map((x) => (x.id === editing.id ? editing : x))
        : [editing, ...prev.members];
      return { ...prev, members: nextMembers };
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
          slots: s.asideLineup.slots.map((mid) => (mid === id ? null : mid)),
        },
      }));
      return { ...prev, members: nextMembers, singles: nextSingles };
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((m) => (
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
                    src={m.avatar}
                    alt={m.name}
                    className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                </button>
                <div className="absolute left-3 top-3 flex gap-2">
                  <Badge
                    className="bg-black/5 text-zinc-900"
                    variant="secondary"
                  >
                    {m.generation}
                  </Badge>
                </div>
              </div>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold leading-tight">
                      {m.name}
                    </div>
                    <div className="mt-1 text-sm text-zinc-600">{m.origin}</div>
                  </div>
                  {admin ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70">
                <img
                  src={selected.avatar}
                  alt={selected.name}
                  className="h-[380px] w-full object-cover"
                />
              </div>
              <div className="grid gap-4">
                <DialogHeader>
                  <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
                  <DialogDescription className="text-zinc-600">
                    {selected.origin} · {selected.generation}
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

                <Card className="border-zinc-200/70 bg-white/70">
                  <CardHeader>
                    <CardTitle className="text-base">历代单曲选拔状况</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    {Object.entries(selected.selectionHistory || {}).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2"
                      >
                        <div className="text-zinc-700">{k}</div>
                        <div className="text-zinc-900">{v || "—"}</div>
                      </div>
                    ))}
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
              <div className="grid gap-3 md:grid-cols-2">
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
                  <CardTitle className="text-base">历代单曲选拔状况</CardTitle>
                  <CardDescription className="text-zinc-600">
                    这里给你预留了 1st/2nd 两条；你也可以改 key。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {Object.entries(editing.selectionHistory || {}).map(([k, v]) => (
                    <div key={k} className="grid gap-2 md:grid-cols-[160px_1fr]">
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
          ) : null}
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

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [lineupCfg, setLineupCfg] = useState({
    selectionCount: 12,
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
    // 兼容旧数据结构
    copy.tracks = [
      ensureTrackShape(copy.tracks?.[0], 1, true),
      ensureTrackShape(copy.tracks?.[1], 2, false),
      ensureTrackShape(copy.tracks?.[2], 3, false),
    ];

    setEditing(copy);
    setLineupCfg({
      selectionCount: copy.asideLineup.selectionCount || 12,
      rowsText: (copy.asideLineup.rows || [5, 7]).join(","),
    });
    setEditorOpen(true);
  };

  const saveSingle = () => {
    setData((prev) => {
      const exists = prev.singles.some((x) => x.id === editing.id);
      const nextSingles = exists
        ? prev.singles.map((x) => (x.id === editing.id ? editing : x))
        : [editing, ...prev.singles];
      return { ...prev, singles: nextSingles };
    });
    setEditorOpen(false);
  };

  const deleteSingle = (id) => {
    setData((prev) => ({
      ...prev,
      singles: prev.singles.filter((s) => s.id !== id),
    }));
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

      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
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
                    src={s.cover}
                    alt={s.title}
                    className="h-[160px] w-full object-cover md:w-[160px]"
                  />
                </button>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <div className="text-lg font-semibold leading-tight">{s.title}</div>
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
                        <Button size="icon" variant="secondary">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

        <div className="md:sticky md:top-[96px] md:self-start">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
              >
                <SingleDetail single={selected} membersById={membersById} admin={admin} />
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
                <CardHeader>
                  <CardTitle className="text-base">曲目收录（3 tracks）</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {editing.tracks.map((t, idx) => (
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

                      {idx === 0 ? (
                        <div className="md:col-span-3">
                          <AudioUploader
                            label="A面音源（可选）"
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
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-zinc-200/70 bg-white/70">
                <CardHeader>
                  <CardTitle className="text-base">A 面曲选拔站位编辑</CardTitle>
                  <CardDescription className="text-zinc-600">
                    1) 输入选拔人数 + 排数与每排人数；2) 生成占位框；3) 从下方成员池拖拽公式照到占位框；4) 保存。
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <LabeledInput
                      label="选拔人数"
                      value={String(lineupCfg.selectionCount)}
                      onChange={(v) =>
                        setLineupCfg((p) => ({
                          ...p,
                          selectionCount: clamp(parseInt(v || "0", 10) || 0, 1, 48),
                        }))
                      }
                      placeholder="例如：12"
                    />
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
                          const selectionCount = clamp(lineupCfg.selectionCount, 1, 48);
                          const slots = Array(selectionCount).fill(null);
                          setEditing((p) => ({
                            ...p,
                            asideLineup: {
                              selectionCount,
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

function SingleDetail({ single, membersById, admin }) {
  const [coverZoom, setCoverZoom] = useState(false);
  const audioRef = useRef(null);

  const rows = single.asideLineup?.rows || [];
  const slots = single.asideLineup?.slots || [];

  // Build row-major slices according to rows, but capped by slots length
  let idx = 0;
  const rowSlices = rows.map((n) => {
    const slice = slots.slice(idx, idx + n);
    idx += n;
    return slice;
  });

  const asideTrack = single.tracks?.find((t) => t.isAside) || single.tracks?.[0];
  const hasAudio = !!asideTrack?.audio;

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
            className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70"
            onClick={() => setCoverZoom(true)}
            title="点击放大封面"
          >
            <img
              src={single.cover}
              alt={single.title}
              className="h-[220px] w-full object-cover"
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
                {hasAudio ? "A面可播放" : "A面未上传音源"}
              </Badge>
            </div>

            <Card className="border-zinc-200/70 bg-white/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">曲目收录</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {single.tracks.map((t) => (
                  <div
                    key={t.no}
                    className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/70 bg-white/70 px-3 py-2"
                  >
                    <div className="text-sm">
                      <span className="text-zinc-600">Track {t.no}</span>
                      <span className="mx-2">·</span>
                      <span className="font-medium">{t.title}</span>
                    </div>

                    {t.isAside ? (
                      hasAudio ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (!audioRef.current) return;
                            audioRef.current.play();
                          }}
                          title="播放A面音源"
                        >
                          <Music className="mr-2 h-4 w-4" />
                          播放
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="bg-black/5">
                          未上传音源
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="bg-black/5">
                        B-side
                      </Badge>
                    )}
                  </div>
                ))}

                {hasAudio ? (
                  <div className="mt-2 rounded-2xl border border-zinc-200/70 bg-white/70 p-3">
                    <audio
                      ref={audioRef}
                      src={asideTrack.audio}
                      controls
                      className="w-full"
                    />
                    <div className="mt-2 text-xs text-zinc-600">
                      音源为本地上传并以 dataURL 保存（demo）。
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
            <div className="grid gap-3">
              {rowSlices.map((slice, rIdx) => (
                <div key={rIdx} className="flex flex-wrap justify-center gap-3">
                  {slice.map((mid, i) => {
                    const m = mid ? membersById.get(mid) : null;
                    return (
                      <div
                        key={`${rIdx}-${i}`}
                        className="group relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70"
                        style={{ width: 84, height: 84 }}
                        title={m ? m.name : "空位"}
                      >
                        {m ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-zinc-600">
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70">
            <img src={single.cover} alt={single.title} className="w-full" />
          </div>
        </ScrollDialogContent>
      </Dialog>
    </Card>
  );
}

function LineupEditor({ singleDraft, setSingleDraft, members }) {
  const lineup =
    singleDraft.asideLineup || { selectionCount: 12, rows: [5, 7], slots: [] };
  const rows = lineup.rows || [];
  const selectionCount = lineup.selectionCount || 0;

  // Ensure slots length
  const slots = useMemo(() => {
    const base = Array.isArray(lineup.slots) ? [...lineup.slots] : [];
    if (base.length < selectionCount) {
      base.push(...Array(selectionCount - base.length).fill(null));
    }
    if (base.length > selectionCount) {
      base.length = selectionCount;
    }
    return base;
  }, [lineup.slots, selectionCount]);

  useEffect(() => {
    if ((lineup.slots?.length || 0) !== slots.length) {
      setSingleDraft((p) => ({
        ...p,
        asideLineup: { ...p.asideLineup, slots },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout slices
  let idx = 0;
  const rowMeta = rows.map((n) => {
    const start = idx;
    const end = idx + n;
    idx = end;
    return { n, start, end };
  });

  const onDropToSlot = (slotIndex, memberId) => {
    setSingleDraft((p) => {
      const nextSlots = [
        ...(p.asideLineup?.slots || Array(selectionCount).fill(null)),
      ];
      // 保持 slots 长度
      if (nextSlots.length < selectionCount) {
        nextSlots.push(...Array(selectionCount - nextSlots.length).fill(null));
      }
      if (nextSlots.length > selectionCount) nextSlots.length = selectionCount;

      nextSlots[slotIndex] = memberId;
      return {
        ...p,
        asideLineup: {
          ...(p.asideLineup || {}),
          selectionCount,
          rows,
          slots: nextSlots,
        },
      };
    });
  };

  const clearSlot = (slotIndex) => {
    setSingleDraft((p) => {
      const nextSlots = [...(p.asideLineup?.slots || [])];
      nextSlots[slotIndex] = null;
      return { ...p, asideLineup: { ...p.asideLineup, slots: nextSlots } };
    });
  };

  const used = new Set(slots.filter(Boolean));

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">站位占位框</div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Move className="h-4 w-4" />
            拖动下方成员到空位 / 点击头像右上角可清空
          </div>
        </div>

        <div className="grid gap-3">
          {rowMeta.map((r, rIdx) => {
            const slice = slots.slice(r.start, r.end);
            return (
              <div key={rIdx} className="flex flex-wrap justify-center gap-3">
                {Array.from({ length: r.n }).map((_, i) => {
                  const slotIndex = r.start + i;
                  const mid = slice[i] ?? null;
                  const m = mid ? members.find((x) => x.id === mid) : null;
                  return (
                    <div
                      key={slotIndex}
                      className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-300/80 bg-white/70"
                      style={{ width: 90, height: 90 }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const memberId = e.dataTransfer.getData("text/memberId");
                        if (memberId) onDropToSlot(slotIndex, memberId);
                      }}
                      title={m ? m.name : "拖拽成员到此"}
                    >
                      {m ? (
                        <>
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="h-full w-full object-cover"
                          />
                          <button
                            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-zinc-800 hover:bg-white"
                            onClick={() => clearSlot(slotIndex)}
                            title="清空"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="grid h-full w-full place-items-center text-xs text-zinc-600">
                          空位
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-zinc-600">
          备注：行布局只负责“排开效果”；slots 最终保存的是站位顺序（按行从左到右、从上到下）。
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/70 bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">成员池（拖拽公式照）</div>
          <div className="text-xs text-zinc-600">
            已使用：{used.size} / {selectionCount}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {members.map((m) => (
            <div
              key={m.id}
              className={
                "relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70 " +
                (used.has(m.id) ? "opacity-60" : "")
              }
              style={{ width: 78, height: 78 }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/memberId", m.id);
              }}
              title={m.name}
            >
              <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-1 py-0.5 text-[10px] text-zinc-900">
                {m.name}
              </div>
            </div>
          ))}
        </div>
      </div>
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
    const url = await readFileAsDataURL(file);
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
                    src={p.cover}
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
                        <Button size="icon" variant="secondary">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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

        <div className="md:sticky md:top-[96px] md:self-start">
          {selected ? (
            <Card className="border-zinc-200/70 bg-white/70">
              <CardHeader>
                <CardTitle className="text-xl">{selected.title}</CardTitle>
                <CardDescription className="text-zinc-700">{selected.date}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white/70">
                  <img
                    src={selected.cover}
                    alt={selected.title}
                    className="w-full object-cover"
                  />
                </div>
                <div
                  className="prose prose-invert max-w-none prose-p:text-zinc-800 prose-li:text-zinc-800 prose-strong:text-zinc-900"
                  dangerouslySetInnerHTML={{ __html: selected.content }}
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
  const [data, setData] = useState(() => {
    if (typeof window === "undefined") {
      return { members: seedMembers, singles: seedSingles, posts: seedPosts };
    }
    return loadData();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveData(data);
  }, [data]);

  const onReset = () => {
    setData({ members: seedMembers, singles: seedSingles, posts: seedPosts });
    setPage("home");
  };

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
              membersCount={data.members.length}
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
