# 公式照多版本功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为每位成员支持多张公式照（第一版、第二版……），在编辑/查看/站位/总选各界面按版本语境正确展示，全面兼容移动端。

**Architecture:** 在 member 数据上新增 `officialPhotos: [{ url, version }]` 数组，保留 `avatar` 字段向后兼容；新增 `getOfficialPhotoUrl(member, isNewContext)` 辅助函数；在 SingleDetail 和 ElectionPage 渲染时按单曲序号/届数决定使用哪个版本的照片；所有改动集中在 `src/App.jsx` 单文件。

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, Framer Motion, shadcn/ui (Dialog)

---

### Task 1: 新增辅助函数

**Files:**
- Modify: `src/App.jsx` — 在 `splitSingleTitle` 函数附近（约第 168 行）之后插入

**Step 1: 在 `splitSingleTitle` 定义之后插入以下三个函数**

找到 `src/App.jsx` 中的 `const buildRowMeta = (rows) => {`（约第 177 行），在它之前插入：

```js
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
```

**Step 2: 验证**

在浏览器 console 中临时测试（无需自动化测试）：
```js
// 打开 app 后在 console 粘贴验证
const m1 = { avatar: "old.jpg", officialPhotos: [{ url: "v1.jpg", version: 1 }, { url: "v2.jpg", version: 2 }] };
console.assert(getOfficialPhotoUrl(m1, false) === "v1.jpg");
console.assert(getOfficialPhotoUrl(m1, true) === "v2.jpg");
const m2 = { avatar: "fallback.jpg", officialPhotos: [] };
console.assert(getOfficialPhotoUrl(m2, true) === "fallback.jpg");
```

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add getOfficialPhotoUrl / isSingleNewContext / isEditionNewContext helpers"
```

---

### Task 2: 数据层 — sanitizeDbPayload 支持 officialPhotos URL 规范化

**Files:**
- Modify: `src/App.jsx` — `sanitizeDbPayload` 函数（约第 689 行）

**Step 1: 找到 `sanitizeDbPayload` 中处理 members 的循环**

找到这段代码：
```js
if (Array.isArray(out.members)) {
  for (const m of out.members) {
    if (m && typeof m === "object" && typeof m.avatar === "string") {
      m.avatar = toRelativeUploadsUrl(m.avatar);
    }
  }
}
```

**Step 2: 在 `m.avatar` 处理后追加 officialPhotos 的处理**

替换为：
```js
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
```

**Step 3: 在新增成员的默认对象中加入 `officialPhotos: []`**

找到约第 1895 行的新建成员默认值对象（`name: "", romaji: "", ...`），在 `avatar: "",` 后面加一行：
```js
officialPhotos: [],
```

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: sanitize officialPhotos URLs and init new member with empty officialPhotos"
```

---

### Task 3: 编辑界面 — OfficialPhotosEditor 组件

**Files:**
- Modify: `src/App.jsx` — 在 `ImageUploader` 函数（约第 1492 行）之后插入新组件

**Step 1: 在 `ImageUploader` 函数之后插入 `OfficialPhotosEditor` 组件**

```jsx
/**
 * 公式照管理组件（用于成员编辑界面）
 * Props:
 *   photos: [{ url, version }]
 *   displayAvatar: string (当前展示照 url)
 *   onChangePhotos: (photos) => void
 *   onChangeAvatar: (url) => void
 */
function OfficialPhotosEditor({ photos, displayAvatar, onChangePhotos, onChangeAvatar }) {
  const safePhotos = Array.isArray(photos) ? photos : [];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    const nextVersion = safePhotos.length > 0 ? Math.max(...safePhotos.map((p) => p.version || 0)) + 1 : 1;
    const newPhoto = { url, version: nextVersion };
    const next = [...safePhotos, newPhoto];
    onChangePhotos(next);
    // 默认将最新上传的设为展示图
    onChangeAvatar(url);
    e.target.value = "";
  };

  const handleDelete = (version) => {
    const next = safePhotos.filter((p) => p.version !== version);
    onChangePhotos(next);
    // 若删除的是当前展示图，自动切到最新版（或清空）
    const deleted = safePhotos.find((p) => p.version === version);
    if (deleted && deleted.url === displayAvatar) {
      const remaining = next;
      onChangeAvatar(remaining.length > 0 ? remaining[remaining.length - 1].url : "");
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

      {/* 已上传照片列表 */}
      {safePhotos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {safePhotos.map((photo) => {
            const isDisplay = photo.url === displayAvatar || (safePhotos.length === 1);
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
                  <img
                    src={resolveMediaUrl(photo.url)}
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
              </div>
            );
          })}
        </div>
      )}

      {/* 上传新照片 */}
      <div className="grid gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={handleUpload}
        />
        <div className="text-xs text-[#6B6B6B]">
          上传后自动设为展示版（第{safePhotos.length + 1}版）。上传到后端并保存 URL。
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 在成员编辑 Dialog 中，替换原来的 `ImageUploader` 调用**

找到约第 2184 行的：
```jsx
<ImageUploader
  label="成员公式照"
  value={editing.avatar}
  onChange={(url) => setEditing((p) => ({ ...p, avatar: url }))}
  hint="建议 1:1"
/>
```

替换为：
```jsx
<OfficialPhotosEditor
  photos={editing.officialPhotos || []}
  displayAvatar={editing.avatar}
  onChangePhotos={(photos) => setEditing((p) => ({ ...p, officialPhotos: photos }))}
  onChangeAvatar={(url) => setEditing((p) => ({ ...p, avatar: url }))}
/>
```

**Step 3: 手动验证**

- 打开 localhost，进入管理模式
- 编辑任意成员，确认"公式照"区块显示为新组件
- 上传一张图，确认出现缩略图和"展示中"标签
- 上传第二张图，确认两张都显示，新图标注"展示中"
- 点击旧图的"展示"，确认标签切换
- 点击"删除"，确认照片移除且展示图正确切换

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: OfficialPhotosEditor component for member edit dialog"
```

---

### Task 4: 查看界面 — OfficialPhotosGalleryDialog 组件 + 点击触发

**Files:**
- Modify: `src/App.jsx` — 新增组件 + 修改 `MemberDetailContent`

**Step 1: 在 `OfficialPhotosEditor` 之后插入 `OfficialPhotosGalleryDialog`**

```jsx
/**
 * 公式照历史查看弹窗（成员详情点击公式照触发）
 * Props:
 *   open: bool
 *   onClose: () => void
 *   photos: [{ url, version }]   // officialPhotos 或 fallback
 *   displayAvatar: string        // 当前展示版 url（用于标注）
 *   memberName: string
 */
function OfficialPhotosGalleryDialog({ open, onClose, photos, displayAvatar, memberName }) {
  const safePhotos = Array.isArray(photos) && photos.length > 0
    ? photos
    : displayAvatar ? [{ url: displayAvatar, version: 1 }] : [];

  const count = safePhotos.length;

  // 动态 grid class 根据照片数量
  const gridClass = count === 1
    ? "flex justify-center"
    : count === 2
    ? "flex justify-center gap-6 sm:gap-10"
    : "grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <ScrollDialogContent className="max-w-2xl">
        {/* Header */}
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
              const imgMaxW = count === 1 ? "max-w-[200px] sm:max-w-[240px]" : count === 2 ? "max-w-[160px] sm:max-w-[200px]" : "";
              return (
                <div key={photo.version} className={`flex flex-col items-center gap-2 ${count === 1 ? imgMaxW : "w-full"}`}>
                  <div className={"overflow-hidden bg-[#F0F0F0] w-full " + (count === 1 ? imgMaxW : "")}>
                    <img
                      src={resolveMediaUrl(photo.url)}
                      alt={versionLabel}
                      className="aspect-[3/4] w-full object-cover object-top"
                    />
                  </div>
                  <div className="text-center">
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

        {/* 说明 */}
        {safePhotos.length > 1 && (
          <div className="mt-6 text-[10px] text-[#AAAAAA] tracking-wider text-center">
            下划线标注为当前展示版
          </div>
        )}
      </ScrollDialogContent>
    </Dialog>
  );
}
```

**Step 2: 修改 `MemberDetailContent` 中的公式照部分，使其可点击**

找到 `MemberDetailContent` 中的（约第 1597 行）：
```jsx
{/* Centered portrait photo */}
<div className="flex justify-center">
  <div className={"overflow-hidden bg-[#F0F0F0] w-full max-w-[200px] sm:max-w-[240px]" + (!member.isActive ? " grayscale opacity-80" : "")}>
    <img
      src={resolveMediaUrl(member.avatar)}
      alt={member.name}
      className="aspect-[3/4] w-full object-cover object-top"
    />
  </div>
</div>
```

替换为（在 `MemberDetailContent` 函数体顶部加 state，图片改为 button）：

首先在 `MemberDetailContent` 函数开头（`if (!member) return null;` 之后）加状态：
```jsx
const [galleryOpen, setGalleryOpen] = useState(false);
const officialPhotos = Array.isArray(member.officialPhotos) ? member.officialPhotos : [];
const hasMultiplePhotos = officialPhotos.length > 1;
```

然后替换图片区块：
```jsx
{/* Centered portrait photo */}
<div className="flex flex-col items-center gap-2">
  <button
    className={"overflow-hidden bg-[#F0F0F0] w-full max-w-[200px] sm:max-w-[240px] " +
      (hasMultiplePhotos ? "cursor-pointer hover:opacity-90 transition-opacity" : "cursor-default") +
      (!member.isActive ? " grayscale opacity-80" : "")}
    onClick={() => hasMultiplePhotos && setGalleryOpen(true)}
    title={hasMultiplePhotos ? "点击查看全部公式照" : undefined}
    type="button"
  >
    <img
      src={resolveMediaUrl(member.avatar)}
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
  {officialPhotos.length > 0 && (
    <div className="text-[10px] tracking-[0.15em] text-[#AAAAAA]">
      {`第${officialPhotos.findIndex(p => p.url === member.avatar) + 1 || officialPhotos.length}版`}
    </div>
  )}
</div>

<OfficialPhotosGalleryDialog
  open={galleryOpen}
  onClose={() => setGalleryOpen(false)}
  photos={officialPhotos}
  displayAvatar={member.avatar}
  memberName={member.name}
/>
```

**Step 3: 手动验证**

- 以有多张公式照的成员为例，打开成员详情弹窗
- 确认公式照下方显示"查看全部公式照 (N)"
- 点击照片或按钮，Gallery 弹窗打开
- 确认各版本照片排列正确、版本标签正确、当前展示版有下划线
- 测试只有一张公式照的成员：无点击提示，不可点击
- 测试手机端布局（Chrome DevTools 模拟）

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: OfficialPhotosGalleryDialog + clickable portrait in MemberDetailContent"
```

---

### Task 5: SingleDetail FORMATION — 按单曲序号选择公式照版本

**Files:**
- Modify: `src/App.jsx` — `SingleDetail` 组件内（约第 3166 行）

**Step 1: 找到 SingleDetail 中 FORMATION 渲染处的头像 img 标签**

找到（约第 3165 行）：
```jsx
<img
  src={resolveMediaUrl(m.avatar)}
  alt={m.name}
  className={"h-full w-full object-contain bg-[#F0F0F0] " + (!m.isActive ? "grayscale" : "")}
/>
```

**Step 2: 替换为版本感知的渲染**

在 `SingleDetail` 函数体顶部（`const [coverZoom, setCoverZoom] = useState(false);` 之后）加一行：
```jsx
const useNewPhoto = isSingleNewContext(single);
```

然后将 img 的 src 替换为：
```jsx
src={resolveMediaUrl(getOfficialPhotoUrl(m, useNewPhoto))}
```

最终 img 标签变为：
```jsx
<img
  src={resolveMediaUrl(getOfficialPhotoUrl(m, useNewPhoto))}
  alt={m.name}
  className={"h-full w-full object-contain bg-[#F0F0F0] " + (!m.isActive ? "grayscale" : "")}
/>
```

**Step 3: 手动验证**

- 打开第 26 单（或更早的单曲）的详情，确认站位图用第一版公式照（对于已上传两版的成员）
- 打开第 27 单（目前可能还没有，可手动将某张单曲 title 改为 "27th Single · ..."）的详情，确认站位图用最新版
- 无多版公式照的成员不受影响（回退到 avatar）

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: SingleDetail formation uses getOfficialPhotoUrl by single context"
```

---

### Task 6: ElectionPage — 按届数选择公式照版本

**Files:**
- Modify: `src/App.jsx` — `ElectionPage` 组件（约第 1410 行）

**Step 1: 找到 ElectionPage 中成员头像渲染**

找到（约第 1411 行）：
```jsx
{member.avatar ? (
  <img
    src={resolveMediaUrl(member.avatar)}
    alt={member.name}
    className="w-full h-full object-cover object-top"
  />
) : (
  <div className="w-full h-full bg-[#E0E0E0]" />
)}
```

**Step 2: 替换为版本感知渲染**

在 ElectionPage 中，`activeEdition` 已经有了。在成员列表渲染的函数体里，找到 `ranked` useMemo 结果的 `.map()` 之前，确认 `activeEdition` 在 scope 内。

将头像的 img 替换为：
```jsx
{member.avatar || (member.officialPhotos?.length > 0) ? (
  <img
    src={resolveMediaUrl(getOfficialPhotoUrl(member, isEditionNewContext(activeEdition)))}
    alt={member.name}
    className="w-full h-full object-cover object-top"
  />
) : (
  <div className="w-full h-full bg-[#E0E0E0]" />
)}
```

**Step 3: 手动验证**

- 切换到第4届总选举，确认头像用第一版公式照（若成员有两版）
- 切换到第5届（如已有数据），确认用最新版
- 未设置 officialPhotos 的成员不受影响

**Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: ElectionPage member avatars use getOfficialPhotoUrl by edition context"
```

---

### Task 7: 移动端适配检查与修复

**Files:**
- Modify: `src/App.jsx` — 针对上面所有新增 UI 组件做移动端微调

**Step 1: 检查 OfficialPhotosEditor 在窄屏的表现**

在 Chrome DevTools 切换到 iPhone 15 Pro (393px 宽）：
- 确认公式照缩略图（80px 宽）在 `flex-wrap` 时不溢出
- 确认"展示"/"删除"按钮文字可见
- 如有溢出：在 `flex flex-wrap gap-3` 外层加 `overflow-x-auto` 保底

**Step 2: 检查 OfficialPhotosGalleryDialog 在窄屏的表现**

- 1张：居中，宽度自适应 ✓
- 2张：flex gap-6 → 在 393px 时两列各约 160px，可行
  - 如太挤：改 gap-4，缩略图 max-w 限制
- 3张+：grid-cols-2 在移动端（非 sm）应为 2 列，符合设计

验证 3张照片弹窗：确认第3张不孤立地占满一行（grid-cols-2 时第3张自动从左开始）

**Step 3: 检查版本标签文字不溢出**

所有版本标签使用 `text-[10px] tracking-[0.25em]`，在窄缩略图（80px）内不换行 —— 最长文字"第三版"为3汉字+单位，约 36px，正常。

**Step 4: 如果 Gallery 弹窗在 3+ 张时第 3 张想居中显示**

对 `count % 3 !== 0` 的最后一行（仅 grid-cols-3 时）可加特殊处理，但实际上 grid 自动 wrap 足够美观，不需要特殊处理（YAGNI）。

**Step 5: Commit（若有修改）**

```bash
git add src/App.jsx
git commit -m "fix: mobile layout tweaks for OfficialPhotosEditor and GalleryDialog"
```

若无需修改则跳过此步。

---

### Task 8: 最终验证 checklist

逐项手动核查：

**编辑功能**
- [ ] 编辑成员 → 上传第一张公式照 → 缩略图出现，标注"展示中"，avatar 更新
- [ ] 再上传第二张 → 两张都显示，新图标注"展示中"
- [ ] 点旧图"展示" → 标注切换
- [ ] 删除当前展示图 → 自动切到另一张
- [ ] 删除唯一照片 → 照片区为空
- [ ] 保存成员 → 重新打开编辑确认数据持久化

**查看功能**
- [ ] 成员详情 → 只有1张公式照：无点击提示，不显示"查看全部"
- [ ] 成员详情 → 有2张：显示"查看全部公式照 (2)"，点击弹出 gallery
- [ ] Gallery 弹窗：1张居中、2张并排、3张两列（sm+ 三列）
- [ ] 当前展示版图片下方有下划线
- [ ] 弹窗在 iPhone 15 Pro 宽度下无溢出

**单曲站位**
- [ ] 26单（或之前）FORMATION：用第一版公式照
- [ ] 27单（之后）FORMATION：有多版的成员用最新版
- [ ] 只有一版的成员在两种语境下都正常显示

**总选**
- [ ] 第4届成员列表：用第一版公式照
- [ ] 第5届成员列表：有多版的成员用最新版
- [ ] 无 officialPhotos 字段的旧成员数据正常回退到 avatar

**Step: 最终 Commit（如有遗漏修复）**

```bash
git add src/App.jsx
git commit -m "fix: final adjustments after verification checklist"
```
