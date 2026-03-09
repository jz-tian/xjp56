# 公式照多版本功能设计文档

**日期**: 2026-03-09
**状态**: 已批准

---

## 需求概述

为每位成员支持多张公式照（第一版、第二版……不限数量）。
- 编辑界面：上传/删除/设置展示图
- 查看界面：点击公式照查看历史版本 gallery
- 单曲站位图：第27单起用最新版，之前用第一版
- 总选列表头像：第5届起用最新版，之前用第一版
- 全面兼容移动端（iPhone 15 Pro / Pro Max）

---

## 数据结构

### Member 新增字段

```js
member = {
  // 原有字段（保留，向后兼容）
  avatar: "url",  // 当前展示照快捷引用（= 用户选定的展示版）

  // 新增字段
  officialPhotos: [
    { url: "...", version: 1 },   // 第一版
    { url: "...", version: 2 },   // 第二版（可选）
    // ...更多版本
  ]
}
```

- `officialPhotos` 为空时，全部逻辑回退到 `avatar`（兼容旧数据）
- `version` 字段为递增整数，仅用于显示标签（"第N版"），不参与排序逻辑
- 顺序即版本顺序：`[0]` 为第一版，`[length-1]` 为最新版

---

## 核心辅助函数

```js
// 根据语境返回应展示的公式照 URL
function getOfficialPhotoUrl(member, isNewContext) {
  const photos = member?.officialPhotos;
  if (!Array.isArray(photos) || photos.length === 0) {
    return member?.avatar ?? "";
  }
  if (isNewContext && photos.length >= 2) {
    return photos[photos.length - 1].url;
  }
  return photos[0].url;
}

// 判断单曲是否属于"新语境"（27单起）
function isSingleNewContext(single, allSingles) {
  // 用 release 日期排序后的索引，或解析 title prefix 中的数字
  const prefix = splitSingleTitle(single.title).prefix;  // "27th Single" etc.
  const num = parseInt((prefix || "").match(/\d+/)?.[0], 10);
  return Number.isFinite(num) && num >= 27;
}

// 判断总选届数是否属于"新语境"（5届起）
function isEditionNewContext(editionStr) {
  const num = parseEditionNum(editionStr);
  return Number.isFinite(num) && num >= 5;
}
```

---

## 界面改动

### 1. 成员编辑界面（MembersPage 中的编辑 Dialog）

**公式照区块**（替换原 `ImageUploader`）：

- 横向排列已上传的公式照缩略图（3:4 比例，固定宽度 ~90px）
- 每张图覆盖层：版本标签（"第一版"等）+ "设为展示" + "删除" 按钮
- 当前展示版在缩略图上显示细线高亮（`ring-2 ring-[#1C1C1C]`）
- 右侧/底部：上传新照片按钮（触发 `ImageUploader` 逻辑）
- 上传成功后：追加到 `officialPhotos`，version = 当前最大 version + 1，同时更新 `avatar` 为新 URL
- 设为展示：仅更新 `avatar`，不改变 `officialPhotos` 顺序
- 删除：从 `officialPhotos` 移除；若删除的是当前展示版，自动将 `avatar` 设为最新版或第一版

### 2. 成员详情查看界面（MemberDetailContent）

**公式照点击行为**：
- 点击成员公式照 → 弹出 `OfficialPhotosGalleryDialog`（用 Dialog 组件）
- 弹窗内容：动态 gallery + 版本标签

**OfficialPhotosGalleryDialog 动态布局**：

| 照片数 | 桌面端 | 移动端 |
|--------|--------|--------|
| 1 张 | 居中单图 max-w-[200px] | 居中 max-w-[160px] |
| 2 张 | 两列 flex gap-6 | 两列 flex gap-3 |
| 3 张 | 三列 grid-cols-3 | 两列 grid-cols-2（第3张居中） |
| 4+ 张 | grid-cols-3 wrap | grid-cols-2 wrap |

每张图：3:4 比例，`object-cover object-top`，无圆角
图下方：`text-[10px] tracking-[0.25em]`"第N版"
当前展示版：图下方加细线 `w-full h-px bg-[#1C1C1C]`
弹窗标题：`OFFICIAL PHOTOS`（按设计系统 section header pattern）
使用 `ScrollDialogContent`，`max-w-2xl`

### 3. 单曲详情 FORMATION（SingleDetail）

- 站位图中每个成员头像改为：`getOfficialPhotoUrl(m, isSingleNewContext(single))`
- 仅影响 display 层（SingleDetail 中的 formation view），不影响 LineupEditor

### 4. 总选页（ElectionPage）

- 成员行头像：`getOfficialPhotoUrl(member, isEditionNewContext(activeEdition))`
- 点击成员行打开 MemberDetailContent 弹窗，公式照点击同样触发 gallery（但弹窗内不需要特殊处理）

### 5. LineupEditor（站位编辑器，管理模式）

- 继续使用 `member.avatar`（管理员只需识别成员身份，不需要版本区分）

---

## 数据迁移/兼容性

- 现有成员：`officialPhotos` 为 undefined/空 → 所有地方回退用 `avatar`
- 保存时：`toRelativeUploadsUrl` 也应对 `officialPhotos` 中的每个 url 做处理
- 加载时（`toRelativeUploadsUrl` 转换逻辑）：遍历 `officialPhotos` 数组做 url 规范化

---

## 移动端适配要求

- 编辑界面公式照区块：横向 scroll 或自动 wrap，缩略图不小于 70px 宽
- Gallery 弹窗：使用 `ScrollDialogContent`，图片不超出视口宽度
- 所有按钮/操作区：touch target ≥ 44px
- 版本标签文字使用 `text-[10px]`，不会溢出

---

## 不在本次范围内

- LineupEditor 中按单曲序号自动切换公式照版本
- 公式照版本自定义标签（固定用"第N版"）
- 公式照版本与特定单曲/届数的精细绑定（只做全局新旧切换）
