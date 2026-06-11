# 实现计划：个人书架管理

**分支**: `001-bookshelf-manager` | **日期**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**输入**: 功能规格说明书 `specs/001-bookshelf-manager/spec.md`

## 摘要

构建移动端优先的个人网文书架管理应用。用户选择小说平台 → 输入书名+作者检索书目 → 一键加入书架 → 标记阅读状态和撰写私人笔记。数据完全本地存储，支持 JSON 导出/导入。Web App（浏览器直接使用）作为主力前端，微信小程序作为补充渠道，共享同一 Express 后端搜索代理。

## 技术上下文

**语言/版本**: JavaScript ES6+（前后端统一）
**主要依赖**: Express 4.x、Axios 1.x（后端）；无框架原生 JS（Web App）；微信原生框架（小程序）
**存储**: localStorage（Web App）、wx.Storage（小程序）—— 键名 `private_bookshelf_v1`
**测试**: 人工验证（Android 手机浏览器 + 微信开发者工具）
**目标平台**: Android 移动浏览器（360dp–414dp 宽度） + 微信小程序
**项目类型**: 移动 Web App + 小程序（双前端），Express 后端搜索代理
**性能目标**: 书架筛选响应 <100ms；在线搜索 <10s 返回结果或提示；应用冷启动 <2s
**约束**: 离线核心功能可用；不依赖服务端数据持久化；后端仅做搜索代理不存用户数据
**规模/范围**: 单用户、~100–500 本书、本地存储 <1MB

## 宪法检查

*门禁：必须在 Phase 0 研究前通过。Phase 1 设计后重新检查。*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. 用户至上 | 主流程 ≤3 步、中文白话文案、去 AI 味设计、移动端优先 ≤414dp | ✅ |
| II. 独立可测 | P1(搜索)/P2(书架)/P3(笔记) 各自独立可测、渐进交付 | ✅ |
| III. 合规优先 | 仅抓取公开书目元数据、不碰正文/付费/目录、合规自评通过 | ✅ |
| IV. 数据本地化 | localStorage 为主、JSON 导出/导入闭环、搜索代理不存用户数据 | ✅ |
| V. 平台尊重 | 标注来源平台、频率节制、优先官方 API（search_ajax.php） | ✅ |
| 文档语言 | 文档/注释中文、提交信息中文描述 | ✅ |

**门禁结果**: 全部通过，无违规项，无需在 Complexity Tracking 中记录。

## 项目结构

### 文档（本功能）

```text
specs/001-bookshelf-manager/
├── spec.md              # 功能规格说明书
├── plan.md              # 本文件（实现计划）
├── research.md          # Phase 0 研究输出
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 快速验证指南
├── contracts/           # Phase 1 接口契约
└── tasks.md             # Phase 2 任务列表（/speckit-tasks 生成）
```

### 源代码（仓库根目录）

```text
# Web App — 浏览器直接打开 localhost:3000 使用
backend/
├── server.js              # Express 服务入口 + /api/search + 静态托管 public/
├── scraper.js             # 晋江搜索：AJAX 通道 + Baidu 回退通道
├── package.json           # express, axios
└── public/
    ├── index.html         # Web App 主体（左书架列表 + 右搜索编辑）
    ├── app.js             # Web App 逻辑（localStorage CRUD + API 调用）
    └── style.css          # 移动端优先样式（≤414dp + 响应式断点）

# 微信小程序 — 微信开发者工具打开根目录即可预览
app.js                     # 小程序入口 globalData
app.json                   # 页面路由 + 窗口配置
app.wxss                   # 全局样式
pages/index/
├── index.js               # 主页面逻辑（wx.Storage CRUD + wx.request）
├── index.wxml             # 主页面模板
├── index.wxss             # 主页面样式
└── index.json             # 页面配置
```

**结构决策**: 保持现有双前端 + 共享后端架构。Web App 作为主力开发目标（可直接在 Android 浏览器使用），小程序作为补充渠道。两者共享相同的功能逻辑和数据模型，仅在存储 API（localStorage vs wx.Storage）和 UI 框架（DOM vs WXML）上有差异。

## 复杂度追踪

> 无宪法违规项，无需记录。
