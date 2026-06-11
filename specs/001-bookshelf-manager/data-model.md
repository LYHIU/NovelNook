# 数据模型：个人书架管理

**日期**: 2026-06-11 | **关联**: [spec.md](./spec.md) · [plan.md](./plan.md)

## 实体定义

### Book（书籍）

书架中的一条书籍记录。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识，生成规则：已有 novelid 时用 `novelid`，否则用 `Date.now().toString()` |
| `title` | string | ✅ | 书名，trim 后存储，最长 200 字符 |
| `author` | string | ❌ | 作者名，trim 后存储 |
| `platform` | string | ❌ | 所属平台，枚举值之一：`晋江文学城` / `长佩文学` / `番茄小说` / `起点中文网` |
| `sourceId` | string | ❌ | 平台侧作品 ID（如晋江 novelid），用于去重和链接生成 |
| `sourceUrl` | string | ❌ | 原站作品页链接，最长 500 字符 |
| `wordCount` | string | ❌ | 字数描述，如 `32.5万`，自由文本 |
| `status` | string | ❌ | 连载状态，如 `连载` / `完结`，自由文本 |
| `summary` | string | ❌ | 简介摘要，用户手动记录，最长 300 字符 |
| `notes` | string | ❌ | 私人备注，最长 1000 字符 |
| `tags` | string[] | ❌ | 标签列表，最多 12 个，每个最长 20 字符 |
| `readingStatus` | enum | ✅ | 阅读状态：`want` / `reading` / `done` / `paused` / `dropped` / `reread` |
| `updatedAt` | number | ✅ | 最后更新时间戳（毫秒） |

### Bookshelf（书架）

书架是 Book 的集合，不单独建模。数据以 `Book[]` 数组形式存储在 `localStorage` 键 `private_bookshelf_v1` 下。

### SearchQuery（搜索请求）

搜索参数，不持久化。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | ✅ | 书名关键词，最长 80 字符 |
| `platform` | string | ✅ | 目标平台标识，当前支持 `jjwxc` |
| `author` | string | ❌ | 可选的作者筛选 |

### SearchResult（搜索结果）

在线搜索响应中的单条结果，不持久化。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 书名 |
| `author` | string | 作者 |
| `novelid` | string | 作品 ID |
| `sourceUrl` | string | 原站链接 |
| `platform` | string | 平台名称 |
| `brief` | string | 简介片段 |

## 阅读状态流转

```text
         ┌─────────┐
         │  want   │  想看
         │ (默认)  │
         └────┬────┘
              │ 开始阅读
              ▼
         ┌─────────┐
    ┌───▶│ reading │  在看
    │    └────┬────┘
    │         │
    │    ┌────┼────┐
    │    ▼    ▼    ▼
    │ ┌────┐┌────┐┌──────┐
    │ │done││paus││dropp │  看完/暂搁/弃文
    │ │看完││暂搁││ 弃文 │
    │ └──┬─┘└──┬─┘└──────┘
    │    │     │
    │    │     └──────────┐
    │    ▼                ▼
    │ ┌────────┐    ┌─────────┐
    │ │reread  │◀───│ reading │  二刷/重新捡起
    │ │ 想二刷 │    │  (回看) │
    │ └───┬────┘    └─────────┘
    └─────┘
```

所有状态转换都是用户手动触发，无自动流转。

## 数据版本兼容

存储键名 `private_bookshelf_v1`。后续数据模型变更时递增版本号（`v2`、`v3`），并在应用启动时执行迁移逻辑，将旧版本数据转换为新格式。
