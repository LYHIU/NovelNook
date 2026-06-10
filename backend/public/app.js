/**
 * 私人书架 — Web App 前端
 *
 * 存储：localStorage（key: bookshelf_v2）
 * 后端：同域 /api/search（Express 托管）
 */

// ============================================================
// 状态
// ============================================================

const STORAGE_KEY = "bookshelf_v2";
const STATUS_OPTIONS = ["want", "reading", "done", "paused", "dropped", "reread"];
const STATUS_LABELS = {
  want: "想看", reading: "在看", done: "看完",
  paused: "暂搁", dropped: "弃文", reread: "想二刷",
};

let books = [];
let editingId = null;

// ============================================================
// 初始化
// ============================================================

function loadBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    books = raw ? JSON.parse(raw) : [];
  } catch (e) {
    books = [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

// ============================================================
// 渲染
// ============================================================

function renderBookList() {
  const keyword = ($("#filterKeyword").value || "").trim().toLowerCase();
  const status = $("#filterStatus").value;

  const filtered = books.filter((b) => {
    if (status && b.readingStatus !== status) return false;
    if (!keyword) return true;
    const haystack = [b.title, b.author, b.platform, b.summary, b.notes, ...(b.tags || [])]
      .join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  $("#bookCount").textContent = `共 ${filtered.length} 本`;

  const container = $("#bookList");
  if (!filtered.length) {
    container.innerHTML = '<div class="empty">还没有匹配的书，从右侧添加一本吧 📖</div>';
    return;
  }

  container.innerHTML = filtered.map((b) => {
    const tags = (b.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const summary = b.summary ? `<div class="summary">${esc(b.summary)}</div>` : "";
    const notes = b.notes ? `<div class="notes">${esc(b.notes)}</div>` : "";

    return `
      <div class="book-card" data-id="${b.id}">
        <div class="head">
          <div>
            <div class="title">${esc(b.title || "未命名作品")}</div>
            <div class="meta">${esc(b.author || "未知作者")} · ${esc(b.platform || "未知平台")} · ${esc(b.wordCount || "字数未填")}</div>
          </div>
          <span class="status-tag">${STATUS_LABELS[b.readingStatus] || "未标记"}</span>
        </div>
        ${summary}${notes}
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <div class="actions">
          <button class="btn small ghost edit-btn" data-id="${b.id}">编辑</button>
          <button class="btn small ghost delete-btn" data-id="${b.id}">删除</button>
          ${b.sourceUrl ? `<button class="btn small ghost copy-btn" data-url="${esc(b.sourceUrl)}">复制链接</button>` : ""}
        </div>
      </div>`;
  }).join("");

  // 事件委托
  container.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); editBook(btn.dataset.id); });
  });
  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); deleteBook(btn.dataset.id); });
  });
  container.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.url).then(() => toast("已复制链接"));
    });
  });
  // 点击卡片 = 编辑
  container.querySelectorAll(".book-card").forEach((card) => {
    card.addEventListener("click", () => editBook(card.dataset.id));
  });
}

function resetForm() {
  editingId = null;
  $("#formTitle").textContent = "✏️ 添加书籍";
  $("#saveBtn").textContent = "加入书架";
  ["fTitle", "fAuthor", "fPlatform", "fWordCount", "fStatus", "fSourceId", "fSourceUrl", "fSummary", "fNotes", "fTags"].forEach((id) => {
    if (id === "fPlatform") $("#fPlatform").value = "晋江文学城";
    else $("#" + id).value = "";
  });
  setReadingStatus("reading");
}

function setReadingStatus(v) {
  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.v === v);
  });
}

function getReadingStatus() {
  const active = document.querySelector(".status-btn.active");
  return active ? active.dataset.v : "reading";
}

function fillForm(book) {
  editingId = book.id;
  $("#formTitle").textContent = "✏️ 编辑书籍";
  $("#saveBtn").textContent = "更新到书架";
  $("#fTitle").value = book.title || "";
  $("#fAuthor").value = book.author || "";
  $("#fPlatform").value = book.platform || "";
  $("#fWordCount").value = book.wordCount || "";
  $("#fStatus").value = book.status || "";
  $("#fSourceId").value = book.sourceId || "";
  $("#fSourceUrl").value = book.sourceUrl || "";
  $("#fSummary").value = book.summary || "";
  $("#fNotes").value = book.notes || "";
  $("#fTags").value = (book.tags || []).join(",");
  setReadingStatus(book.readingStatus || "reading");
}

// ============================================================
// CRUD
// ============================================================

function editBook(id) {
  const book = books.find((b) => b.id === id);
  if (!book) return;
  fillForm(book);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteBook(id) {
  if (!confirm("删除这条记录？（仅删除本地数据）")) return;
  books = books.filter((b) => b.id !== id);
  saveBooks();
  renderBookList();
  if (editingId === id) resetForm();
  toast("已删除");
}

function saveBook() {
  const title = $("#fTitle").value.trim();
  if (!title) { toast("请填写小说名称"); return; }

  const tagsText = $("#fTags").value.trim();
  const tags = tagsText ? tagsText.split(/[,，、\s]+/).filter(Boolean).slice(0, 12) : [];

  const now = Date.now();
  const book = {
    id: editingId || String(now),
    title,
    author: $("#fAuthor").value.trim(),
    platform: $("#fPlatform").value.trim(),
    wordCount: $("#fWordCount").value.trim(),
    status: $("#fStatus").value.trim(),
    sourceId: $("#fSourceId").value.trim(),
    sourceUrl: $("#fSourceUrl").value.trim(),
    summary: $("#fSummary").value.trim(),
    notes: $("#fNotes").value.trim(),
    tags,
    readingStatus: getReadingStatus(),
    updatedAt: now,
  };

  const idx = books.findIndex((b) => b.id === book.id);
  if (idx >= 0) books[idx] = book;
  else books.unshift(book);

  saveBooks();
  renderBookList();
  resetForm();
  toast(editingId ? "已更新" : "已加入书架");
  editingId = null;
}

// ============================================================
// 在线搜索
// ============================================================

async function searchOnline() {
  const keyword = $("#searchKeyword").value.trim();
  if (!keyword) { toast("请输入小说名"); return; }

  const author = $("#searchAuthor").value.trim();
  const statusEl = $("#searchStatus");
  const resultsEl = $("#searchResults");
  const btn = $("#searchOnlineBtn");

  statusEl.textContent = "搜索中…";
  resultsEl.innerHTML = "";
  btn.disabled = true;

  try {
    const params = new URLSearchParams({ keyword, platform: "jjwxc" });
    if (author) params.set("author", author);

    const resp = await fetch(`/api/search?${params}`);
    const data = await resp.json();

    if (!data.success || !data.results.length) {
      statusEl.textContent = data.error || "未找到匹配结果";
      return;
    }

    const sourceLabel = data.source === "baidu" ? "（Baidu 引擎）" : "";
    statusEl.textContent = `找到 ${data.results.length} 条${sourceLabel}`;

    resultsEl.innerHTML = data.results.map((r, i) => `
      <div class="search-result-item">
        <div class="title">${esc(r.title || "未命名")}</div>
        <div class="meta">${esc(r.author || "未知作者")} · ${esc(r.platform || "晋江文学城")} · ID: ${esc(r.novelid)}</div>
        <div class="link">${esc(r.sourceUrl)}</div>
        ${r.brief ? `<div class="meta">${esc(r.brief)}</div>` : ""}
        <div class="actions">
          <button class="btn small primary fill-form-btn" data-idx="${i}">填入表单</button>
          <button class="btn small ghost import-btn" data-idx="${i}">直接加入书架</button>
        </div>
      </div>
    `).join("");

    // 事件：填入表单
    resultsEl.querySelectorAll(".fill-form-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = data.results[btn.dataset.idx];
        resetForm();
        $("#fTitle").value = r.title || "";
        $("#fAuthor").value = r.author || "";
        $("#fPlatform").value = r.platform || "晋江文学城";
        $("#fSourceId").value = r.novelid || "";
        $("#fSourceUrl").value = r.sourceUrl || "";
        $("#fSummary").value = r.brief || "";
        toast("已填入表单");
      });
    });

    // 事件：直接加入书架
    resultsEl.querySelectorAll(".import-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const r = data.results[btn.dataset.idx];
        const now = Date.now();
        books.unshift({
          id: String(now),
          title: r.title || "",
          author: r.author || "",
          platform: r.platform || "晋江文学城",
          sourceId: r.novelid || "",
          sourceUrl: r.sourceUrl || "",
          summary: r.brief || "",
          wordCount: "",
          status: "",
          notes: "",
          tags: [],
          readingStatus: "want",
          updatedAt: now,
        });
        saveBooks();
        renderBookList();
        toast(`已加入书架: ${r.title}`);
      });
    });
  } catch (e) {
    statusEl.textContent = "网络错误，请确认后端已启动 (localhost:3000)";
    console.error(e);
  } finally {
    btn.disabled = false;
  }
}

// ============================================================
// 工具函数
// ============================================================

function $(sel) { return document.querySelector(sel); }
function esc(s) {
  const div = document.createElement("div");
  div.textContent = s || "";
  return div.innerHTML;
}
function toast(msg) {
  // 简单实现：在 header 下方短暂显示
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText = "position:fixed;top:12px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 20px;border-radius:20px;font-size:0.9rem;z-index:9999;transition:opacity 0.3s;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._tid);
  el._tid = setTimeout(() => { el.style.opacity = "0"; }, 1800);
}

// ============================================================
// 启动
// ============================================================

function init() {
  loadBooks();
  renderBookList();
  resetForm();

  // 事件绑定
  $("#filterKeyword").addEventListener("input", renderBookList);
  $("#filterStatus").addEventListener("change", renderBookList);
  $("#saveBtn").addEventListener("click", saveBook);
  $("#cancelBtn").addEventListener("click", resetForm);
  $("#searchOnlineBtn").addEventListener("click", searchOnline);
  $("#searchKeyword").addEventListener("keydown", (e) => { if (e.key === "Enter") searchOnline(); });

  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.addEventListener("click", () => setReadingStatus(btn.dataset.v));
  });
}

document.addEventListener("DOMContentLoaded", init);
