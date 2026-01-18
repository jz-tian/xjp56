import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import sharp from "sharp";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ 兼容两种目录结构：
// 1) ./data/db.json
// 2) ./db.json
const DB_PATH_PRIMARY = "./data/db.json";
const DB_PATH_FALLBACK = "./db.json";

function getDbPath() {
  if (fs.existsSync(DB_PATH_PRIMARY)) return DB_PATH_PRIMARY;
  if (fs.existsSync(DB_PATH_FALLBACK)) return DB_PATH_FALLBACK;

  // 都不存在：默认创建 ./data/db.json
  if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(
    DB_PATH_PRIMARY,
    JSON.stringify({ members: [], singles: [], posts: [] }, null, 2)
  );
  return DB_PATH_PRIMARY;
}

const readDB = () => JSON.parse(fs.readFileSync(getDbPath(), "utf-8"));

/* =========================
   路径清洗：把任何绝对地址统一写回相对路径（/uploads/...）
   - 解决 ngrok/手机端无法访问 localhost 绝对路径的问题
========================= */
function toRelativeUploadsUrl(v) {
  if (!v) return v;
  if (typeof v !== "string") return v;
  // 已经是相对路径
  if (v.startsWith("/uploads/")) return v;
  // 兼容形如 http(s)://xxx/uploads/...
  const m = v.match(/https?:\/\/[^/]+(\/uploads\/.*)$/i);
  if (m && m[1]) return m[1];
  // 兼容形如 http(s)://xxx:3001/uploads/...
  const m2 = v.match(/https?:\/\/[^/]+:(\d+)(\/uploads\/.*)$/i);
  if (m2 && m2[2]) return m2[2];
  return v;
}

function sanitizeDbPayload(db) {
  if (!db || typeof db !== "object") return db;

  // 深拷贝避免意外引用
  const out = JSON.parse(JSON.stringify(db));

  if (Array.isArray(out.members)) {
    for (const m of out.members) {
      if (m && typeof m === "object") {
        if (typeof m.avatar === "string") m.avatar = toRelativeUploadsUrl(m.avatar);
      }
    }
  }

  if (Array.isArray(out.singles)) {
    for (const s of out.singles) {
      if (s && typeof s === "object") {
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

const writeDB = (data) => {
  const cleaned = sanitizeDbPayload(data);
  fs.writeFileSync(getDbPath(), JSON.stringify(cleaned, null, 2));
};

/* =========================
   图片上传（内存 -> sharp 压缩 -> 写文件）
========================= */
const uploadImageMulter = multer({ storage: multer.memoryStorage() });

app.post("/upload", uploadImageMulter.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });

    const filename = `${Date.now()}.jpg`;
    const filepath = path.join("uploads", filename);

    // 确保 uploads 存在
    if (!fs.existsSync("uploads")) fs.mkdirSync("uploads", { recursive: true });

    await sharp(req.file.buffer)
      .resize({ width: 1024 })
      .jpeg({ quality: 80 })
      .toFile(filepath);

    res.json({ url: `/uploads/${filename}` });
  } catch (e) {
    res.status(500).json({ error: "upload failed" });
  }
});

/* =========================
   音频上传（直接落盘，不压缩）
========================= */
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/audio";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp3";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const uploadAudioMulter = multer({ storage: audioStorage });

app.post("/upload-audio", uploadAudioMulter.single("audio"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no file" });
    const url = `/uploads/audio/${req.file.filename}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: "upload-audio failed" });
  }
});

/* =========================
   数据读写
========================= */
app.get("/data", (req, res) => {
  // 输出时也做一次清洗，避免历史脏数据影响前端显示
  res.json(sanitizeDbPayload(readDB()));
});

app.post("/data", (req, res) => {
  writeDB(req.body);
  res.json({ ok: true });
});

/* ✅ 最后再 listen */
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});