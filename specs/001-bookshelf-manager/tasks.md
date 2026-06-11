# 任务列表：个人书架管理

**输入**: 设计文档 `specs/001-bookshelf-manager/`

**前置条件**: plan.md、spec.md、research.md、data-model.md、contracts/

**测试策略**:

- **自动化测试**（Jest）：单测验证纯函数逻辑正确性（数据 CRUD、URL 解析、标签规范化、API 契约）。每个用户故事先写测试 → 测试 FAIL → 再实现 → 测试 PASS。
- **人工 Review**：自动化测试通过后，人工对照 `quickstart.md` 场景验证功能是否符合预期、交互是否流畅、UI 是否符合去 AI 味标准。人工验证通过后方可合入主分支。
- 两条线都通过才算任务完成。

**组织**: 任务按用户故事分组，每个故事可独立实现和测试。

## 格式说明：`[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 任务描述含精确文件路径

## 路径约定

- **Web App**: `backend/public/`（index.html, app.js, style.css）
- **后端服务**: `backend/`（server.js, scraper.js）
- **微信小程序**: 根目录 `pages/index/`（index.js, index.wxml, index.wxss）+ `app.js`
- **测试代码**:
  - 后端单测: `backend/__tests__/`
  - 前端纯函数单测: `tests/unit/`
  - API 契约测试: `tests/contract/`
  - 集成测试: `tests/integration/`

---

## Phase 1: Setup（项目初始化）

**目的**: 确认项目结构和依赖就绪

- [ ] T001 确认项目目录结构符合 plan.md 的 Source Code 布局，检查 `backend/`、`backend/public/`、`pages/index/` 目录存在
- [ ] T002 安装后端依赖：在 `backend/` 目录执行 `npm install`，确认 express 和 axios 安装成功
- [ ] T003 [P] 确认 `backend/server.js` 可通过 `node server.js` 正常启动，访问 `http://localhost:3000/api/health` 返回 `{"ok":true}`

---

## Phase 2: Foundational（共享基础设施 + 测试框架）

**目的**: 所有用户故事依赖的核心组件和测试基础设施就绪

**⚠️ 关键**: 本阶段完成前，任何用户故事都不能开始

- [ ] T004 验证 Web App 基础框架：`backend/public/index.html` 正确加载 `app.js` 和 `style.css`，双栏布局（左书架列表 + 右搜索编辑）在 Android 尺寸（360dp–414dp）下可用
- [ ] T005 [P] 验证微信小程序基础框架：`app.json` 页面路由正确，`app.js` globalData.storageKey 为 `private_bookshelf_v1`，微信开发者工具中可正常打开
- [ ] T006 [P] 安装测试框架 Jest：在项目根目录执行 `npm init -y && npm install --save-dev jest`，在 `package.json` 添加 `"test": "jest"`。创建测试目录结构：`tests/unit/`、`tests/contract/`、`tests/integration/`、`backend/__tests__/`
- [ ] T007 [P] 抽取核心纯函数为独立模块以便单测：将 `extractJjwxcNovelId(url)` 抽取到 `backend/public/utils.js`；将 `normalizeTags(raw)` 抽取为独立导出函数；确保这些函数零 DOM/Storage 依赖，可被 Jest 直接 import 测试。Web App 中改为 `import { ... } from './utils.js'` 引用
- [ ] T008 [P] 确认本地存储键名约定：Web App 使用 `localStorage` 键 `private_bookshelf_v1`，小程序使用 `wx.setStorageSync` 同键名。在 `backend/public/app.js` 和 `pages/index/index.js` 中统一定义为常量 `STORAGE_KEY`
- [ ] T009 [P] 确认数据模型字段完整：对照 `data-model.md` 中的 Book 实体字段（id, title, author, platform, sourceId, sourceUrl, wordCount, status, summary, notes, tags, readingStatus, updatedAt），检查 `blankForm` 对象在 Web App 和小程序两处定义是否完整

**检查点**: 基础框架 + 测试框架就绪 — 可开始用户故事实现

---

## Phase 3: User Story 1 — 按平台搜索书籍（优先级: P1）🎯 MVP

**目标**: 用户选择平台 → 输入书名（可选作者）→ 获取搜索结果

**独立测试**: 选择"晋江文学城"，输入"造神"，点击搜索，验证返回结构化书目列表

### 单测任务 — User Story 1（先写，确保 FAIL）

- [ ] T010 [P] [US1] 编写 `extractJjwxcNovelId()` 单测：在 `tests/unit/url-parser.test.js` 中覆盖各 URL 格式（`onebook.php?novelid=`、路径格式 `/onebook.php/1234567`、纯数字 ID、带引号/空格的脏输入、无效链接返回空字符串）。运行 `npx jest tests/unit/url-parser.test.js` 确认 FAIL（函数尚未抽取到 utils.js）
- [ ] T011 [P] [US1] 编写 `backend/__tests__/scraper.test.js` 单测：测试 `searchJjwxc()` 正常返回结构化结果（title/author/novelid/sourceUrl 字段）、空关键词返回空数组、网络异常处理。运行确认 FAIL
- [ ] T012 [P] [US1] 编写 `tests/contract/api-search.test.js` 契约测试：测试 `GET /api/search?keyword=造神` 返回 200 + `{success, results[]}` 结构、缺少 keyword 返回 400、超时返回 504。运行确认 FAIL

### 实现任务 — User Story 1

- [ ] T013 [P] [US1] 实现平台选择器 UI：在 `backend/public/index.html` 中添加 `<select id="searchPlatform">` 元素，选项为晋江文学城/长佩文学/番茄小说/起点中文网；在 `backend/public/app.js` 中绑定 `platformOptions` 数组及各平台 `searchUrl` 生成函数
- [ ] T014 [P] [US1] 实现平台选择器 UI（小程序）：在 `pages/index/index.wxml` 中使用 `<picker mode="selector">` 绑定 `platformNames` 数组，`pages/index/index.js` 中定义 `platformOptions` 和 `onPlatformChange` 事件
- [ ] T015 [US1] 实现搜索输入 UI 与事件绑定：Web App 中为 `#searchKeyword` 和 `#searchAuthor` 绑定 input/keypress 事件；小程序中 `bookSearchKeyword` 和 `bookAuthorFilter` 绑定 `bindinput` 和 `bindconfirm`
- [ ] T016 [US1] 实现后端搜索 API 调用：在 `backend/public/app.js` 中实现 `searchOnline()` 函数，调用 `/api/search?keyword=xxx&platform=jjwxc&author=xxx`，处理 loading / 成功 / 超时 / 错误四种状态；小程序 `pages/index/index.js` 中实现 `searchOnlineBook()` 函数对应 `wx.request` 调用
- [ ] T017 [US1] 实现本地书架优先检索：搜索时先用关键词筛选 `this.data.books`（匹配 title + author + platform），命中直接展示；未命中再触发在线检索。Web App 和小程序分别实现
- [ ] T018 [US1] 实现搜索结果展示：Web App 中渲染 `#searchResults` 区域，每条结果展示书名、作者、平台、链接、简介摘要；小程序中对应 `searchResults` / `onlineResults` 的 wxml 渲染
- [ ] T019 [US1] 实现非晋江平台官方搜索链接：平台非晋江时，不调用后端 API，直接生成平台官方搜索 URL（如 `https://www.gongzicp.com/search?keyword=xxx`），展示"复制官方搜索链接"按钮
- [ ] T020 [US1] 实现空输入保护与空结果提示：关键词为空时 toast 提示"请输入小说名"；搜索结果为空时展示引导文案

### 测试验证 — User Story 1

- [ ] T021 [US1] 运行 `npx jest tests/unit/url-parser.test.js tests/contract/api-search.test.js backend/__tests__/scraper.test.js`，确认全部 PASS
- [ ] T022 [US1] 人工验证：按 quickstart.md 场景 1–4 逐条验证（正常搜索、按作者筛选、非晋江平台、空输入保护）

**检查点**: US1 单测全绿 + 人工验证通过 — 搜索能力可交付

---

## Phase 4: User Story 2 — 加入书架 + 导出/导入（优先级: P2）

**目标**: 搜索结果一键加入书架、手动录入、链接解析导入、书架列表展示、JSON 导出/导入

**独立测试**: 从搜索结果加入一本书 → 书架列表可见 → 导出 JSON → 清空 → 导入恢复

### 单测任务 — User Story 2（先写，确保 FAIL）

- [ ] T023 [P] [US2] 编写书架 CRUD 单测：在 `tests/unit/book-crud.test.js` 中测试 `addBook()` 去重逻辑（同 novelid 更新而非新增）、`saveBooks()` / `loadBooks()` 序列化往返一致性、删除后数组变化、空书架处理。运行确认 FAIL
- [ ] T024 [P] [US2] 编写 JSON 导出单测：在 `tests/unit/book-crud.test.js` 中追加 `exportBooks()` 测试——验证导出 JSON 结构含全部 Book 字段、特殊字符（emoji/换行）正确转义、空书架导出 `[]`。运行确认 FAIL
- [ ] T025 [P] [US2] 编写 JSON 导入单测：在 `tests/unit/book-crud.test.js` 中追加 `importBooks()` 测试——正常 JSON 合并、损坏 JSON 抛错不破坏原数据、novelid 去重、无 novelid 的条目按 title+author 匹配。运行确认 FAIL

### 实现任务 — User Story 2

- [ ] T026 [P] [US2] 实现书架数据 CRUD 核心函数：在 `backend/public/app.js` 中实现 `loadBooks()`（从 localStorage 读取并反序列化）、`saveBooks(books)`（序列化写入）、`addBook(book)`（按 novelid 去重后插入/更新）；小程序 `pages/index/index.js` 中对应 `loadBooks()` / `persistBooks()` 函数
- [ ] T027 [US2] 实现书架列表 UI 渲染：Web App 中渲染 `#bookList` 区域，每本书展示书名、作者、平台、阅读状态标签、标签列表、操作按钮（编辑/删除/复制链接）；小程序 `pages/index/index.wxml` 中对应 `book-card` 模板。空书架时展示引导文案
- [ ] T028 [US2] 实现"加入书架"按钮：搜索结果每条添加"加入书架"/"直接加入书架"按钮，点击后构造 Book 对象（自动带入 title/author/platform/novelid/sourceUrl）→ 调用 `addBook()` → toast 提示
- [ ] T029 [US2] 实现手动录入表单：Web App 中 `#fTitle` / `#fAuthor` / `#fPlatform` / `#fWordCount` / `#fStatus` / `#fSourceId` / `#fSourceUrl` / `#fSummary` 输入框；小程序对应 `form` 数据绑定。书名必填校验
- [ ] T030 [US2] 实现编辑已有书籍：点击书架中某书的"编辑"按钮 → 填充表单 → 修改字段 → 保存时更新而非新增。通过 `editingId` 状态区分新增/编辑模式
- [ ] T031 [US2] 实现链接解析导入：粘贴晋江链接（含 novelid 参数或路径）→ 调用 `extractJjwxcNovelId()`（从 `utils.js` 引入）→ 自动填入表单 platform/sourceId/sourceUrl 字段。提示"已解析"
- [ ] T032 [US2] 实现 JSON 导出功能（FR-016）：Web App 中使用 `Blob` + `<a download>` 生成 `novelnook-export.json` 文件；小程序中使用 `wx.setClipboardData` 复制 JSON 字符串并提示用户在浏览器中粘贴保存。导出内容含全部 Book 对象数组
- [ ] T033 [US2] 实现 JSON 导入功能（FR-017）：Web App 中添加 `<input type="file" accept=".json">` → 读取文件 → 解析 JSON → 按 novelid 去重合并到现有书架 → toast 提示导入数量。小程序中使用 `wx.chooseMessageFile` 选择 JSON 文件导入。JSON 格式不正确时提示错误，不破坏现有数据
- [ ] T034 [US2] 实现删除确认：点击"删除"弹出确认对话框（`confirm()` 或 `wx.showModal`），确认后从数组移除并 `saveBooks()`。提示"只会删除本地书架里的私人记录"

### 测试验证 — User Story 2

- [ ] T035 [US2] 运行 `npx jest tests/unit/book-crud.test.js`，确认全部 PASS
- [ ] T036 [US2] 人工验证：按 quickstart.md 场景 5–8 逐条验证（一键加入、手动录入、链接导入、导出→清空→导入恢复、删除确认）

**检查点**: US2 单测全绿 + 人工验证通过 — 书架管理 + 数据可移植闭环可交付

---

## Phase 5: User Story 3 — 标记阅读状态与个人笔记（优先级: P3）

**目标**: 设置 6 种阅读状态、撰写私人笔记、添加个性化标签、按状态/关键词筛选

**独立测试**: 选中一本书 → 设状态为"看完"→ 写笔记 → 加标签 → 保存 → 刷新确认保留 → 用筛选器过滤

### 单测任务 — User Story 3（先写，确保 FAIL）

- [ ] T037 [P] [US3] 编写 `normalizeTags()` 单测：在 `tests/unit/tag-normalizer.test.js` 中测试逗号/顿号/空格分隔解析、前后空格 trim、空字符串返回 `[]`、超过 12 个截断、去重。运行确认 FAIL
- [ ] T038 [P] [US3] 编写筛选逻辑单测：在 `tests/unit/book-crud.test.js` 中追加 `applyFilters()` 测试——按关键词匹配 title/author/tags、按阅读状态过滤、组合筛选、空关键词返回全部。运行确认 FAIL

### 实现任务 — User Story 3

- [ ] T039 [P] [US3] 实现阅读状态选择器 UI：Web App 中 `.reading-status-bar` 区域渲染 6 个状态按钮（想看/在看/看完/暂搁/弃文/想二刷），`status-btn.active` 高亮当前选中；小程序中 `status-tabs` 使用 grid 布局
- [ ] T040 [US3] 实现阅读状态数据绑定与切换：点击状态按钮更新 `book.readingStatus` 字段，保存时持久化。每个状态按钮绑定 `data-v` 属性（want/reading/done/paused/dropped/reread）
- [ ] T041 [US3] 实现私人笔记编辑：Web App 中 `<textarea id="fNotes">` 绑定笔记内容，maxlength=1000；小程序中 `memo large` textarea 绑定 `form.notes`。保存后笔记完整保留
- [ ] T042 [US3] 实现标签输入与解析：单个 input 输入逗号分隔标签（如"群像, 强剧情"），通过 `normalizeTags()`（从 `utils.js` 引入）解析为数组。保存后以 `.tag` 样式独立展示
- [ ] T043 [US3] 实现书架筛选功能：关键词搜索框（`#filterKeyword`）+ 状态下拉（`#filterStatus`），筛选逻辑 `applyFilters()`：匹配 title/author/platform/summary/notes/tags 的关键词 + 阅读状态过滤。搜索结果数量实时更新（"共 N 本"）
- [ ] T044 [US3] 实现复制原站链接：书架列表中每本书的"复制原站链接"按钮 → 调用 `navigator.clipboard.writeText()` 或 `wx.setClipboardData()` → toast "已复制"

### 测试验证 — User Story 3

- [ ] T045 [US3] 运行 `npx jest tests/unit/tag-normalizer.test.js` 和筛选逻辑测试，确认全部 PASS
- [ ] T046 [US3] 人工验证：按 quickstart.md 场景 9–12 逐条验证（状态切换、笔记持久化、标签展示、筛选过滤）

**检查点**: US3 单测全绿 + 人工验证通过 — 完整阅读日记可交付

---

## Phase 6: Polish & Cross-Cutting Concerns

**目的**: 跨用户故事的改进和收尾。人工 review 为主。

- [ ] T047 [P] 实现离线检测与降级（FR-018）：Web App 中使用 `navigator.onLine` + `window.addEventListener('online'/'offline')` 监听网络状态；小程序中通过 `wx.onNetworkStatusChange`。离线时：书架浏览/筛选/编辑笔记正常工作；在线搜索按钮置灰并提示"当前无网络"
- [ ] T048 [P] 实现网络请求错误处理统一逻辑：后端不可达（fetch/request fail）→ 展示友好提示（"搜索服务未启动，请检查网络或稍后重试"），不白屏。超时设置 20s。不自动重试
- [ ] T049 [P] UI 去 AI 味调整 — 配色与质感：将 Web App `style.css` 和 小程序 `index.wxss` 中的纯功能色替换为有温度的配色方案（纸白背景 `#fffdf8`、墨绿主色 `#315d6b`、暖灰文字 `#51483d`、米色卡片边 `#e2d8c8`）。避免纯黑 `#000` 和荧光蓝等 AI 模板常见色
- [ ] T050 [P] UI 去 AI 味调整 — 排版与细节：增加自然的不对称留白（卡片间距 18rpx–24rpx 非均匀）、书签/批注隐喻图标（📖📝🏷️）、适度的 `border-radius: 6rpx–8rpx`（非全圆角）、字体层级区分（书名 31rpx bold / 元数据 23rpx）。参照 `style.css` 现有设计基线持续优化
- [ ] T051 [P] 微信小程序 UI 与 Web App 对齐：确保 `pages/index/index.wxss` 中的配色、间距、字体层级与 `backend/public/style.css` 一致。同步 FR-016/FR-017/FR-018 新增功能到小程序
- [ ] T052 [P] 编写集成测试：在 `tests/integration/search-flow.test.js` 中模拟完整搜索→加入书架流程（mock 后端 API + localStorage），验证端到端数据流
- [ ] T053 运行全部单测：`npx jest` 确认所有测试文件 PASS，输出覆盖率报告
- [ ] T054 端到端人工验证：按 `quickstart.md` 中的全部 14 个验证场景逐条执行（Web App + 小程序各一遍），确保全部通过
- [ ] T055 更新 `README.md` 反映完成后实际功能状态

---

## 依赖关系与执行顺序

### Phase 依赖

- **Setup (Phase 1)**: 无依赖 — 可立即开始
- **Foundational (Phase 2)**: 依赖 Phase 1 完成 — **阻塞所有用户故事**
- **User Story 1 (Phase 3)**: 依赖 Phase 2 完成 — 无其他故事依赖
- **User Story 2 (Phase 4)**: 依赖 Phase 2 完成 — 可独立于 US1（手动录入功能），但搜索→加入书架流程自然依赖 US1
- **User Story 3 (Phase 5)**: 依赖 Phase 2 完成 — 需要 US2 的书架数据才能验证标记/笔记
- **Polish (Phase 6)**: 依赖所有用户故事完成

### 故事内测试先行依赖

```
单测编写（FAIL） → 功能实现 → 单测通过（PASS） → 人工验证
```

每个 Phase 内的"单测任务"必须在"实现任务"之前完成编写，确保 TDD 节奏。

### 并行机会

- T001–T003: Phase 1 任务可部分并行
- T004–T009: Phase 2 全部可并行（不同文件/不同关注点）
- T010–T012: US1 单测全部可并行（不同测试文件）
- T013 与 T014: Web App 和 小程序 UI 可并行
- T023–T025: US2 单测全部可并行
- T037–T038: US3 单测可并行
- T047–T052: Phase 6 全部可并行（离线/错误处理/去AI味/集成测试 互不干扰）

---

## 并行执行示例

### Phase 2 Foundational（全部并行）

```bash
Task: "T004 验证 Web App 基础框架"
Task: "T005 [P] 验证微信小程序基础框架"
Task: "T006 [P] 安装测试框架 Jest"
Task: "T007 [P] 抽取核心纯函数 utils.js"
Task: "T008 [P] 确认存储键名约定"
Task: "T009 [P] 确认数据模型字段完整"
```

### User Story 1 单测（全部并行）

```bash
Task: "T010 [P] [US1] url-parser.test.js"
Task: "T011 [P] [US1] scraper.test.js"
Task: "T012 [P] [US1] api-search.test.js (契约)"
```

### Phase 6 Polish（全部并行）

```bash
Task: "T047 [P] 离线检测与降级"
Task: "T048 [P] 网络请求错误处理"
Task: "T049 [P] UI 去 AI 味 — 配色"
Task: "T050 [P] UI 去 AI 味 — 排版"
Task: "T051 [P] 小程序 UI 对齐"
Task: "T052 [P] 集成测试"
```

---

## 实现策略

### MVP 优先（仅 User Story 1）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键 — 阻塞所有故事）
3. 完成 Phase 3: US1（先写 T010–T012 单测确认 FAIL → 实现 T013–T020 → 单测 PASS T021 → 人工验证 T022）
4. **停止并验证**: 搜索能力独立可用
5. 如就绪可演示/部署

### 增量交付

1. Setup + Foundational → 基础就绪
2. 加 US1 → 单测 + 人工验证 → 搜索能力可交付（MVP！）
3. 加 US2 → 单测 + 人工验证 → 书架管理 + 导入导出可交付
4. 加 US3 → 单测 + 人工验证 → 完整阅读日记可交付
5. 加 Phase 6 → 全部单测 + 端到端人工验证 → 最终版本

### Agent 并行策略

参照宪法"Agent 并行开发模式"：

1. 共同完成 Phase 1 + Phase 2（Setup + Foundational）
2. Foundational 完成后，三个 agent 分头并行：
   - **Agent A**: User Story 1（Phase 3：T010–T022）
   - **Agent B**: User Story 2（Phase 4：T023–T036）
   - **Agent C**: User Story 3（Phase 5：T037–T046）
3. 各 agent 产出经单测验证 + 人工 review 后合入 master

---

## 备注

- [P] 任务 = 不同文件、无依赖 = 可并行
- [US1]/[US2]/[US3] 标签用于可追溯性
- 每个用户故事内：**单测 → 实现 → 验证** 严格顺序
- 自动化单测验证逻辑正确性，人工 review 验证体验符合预期
- 每个任务或逻辑组完成后提交
- 在任何检查点停止以独立验证故事
- 项目多数功能已有实现，任务侧重：抽取可测纯函数 + 编写单测 + 实现新需求（导出/导入/离线）
