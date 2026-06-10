const app = getApp();

const blankForm = {
  id: "",
  title: "",
  author: "",
  platform: "晋江文学城",
  wordCount: "",
  status: "",
  sourceId: "",
  sourceUrl: "",
  summary: "",
  notes: "",
  tagsText: "",
  tags: [],
  readingStatus: "want"
};

const statusOptions = [
  { value: "want", label: "想看" },
  { value: "reading", label: "在看" },
  { value: "done", label: "看完" },
  { value: "paused", label: "暂搁" },
  { value: "dropped", label: "弃文" },
  { value: "reread", label: "想二刷" }
];

const platformOptions = [
  {
    name: "晋江文学城",
    searchUrl: (keyword) => `https://www.jjwxc.net/search.php?kw=${encodeURIComponent(keyword)}`
  },
  {
    name: "长佩文学",
    searchUrl: (keyword) => `https://www.gongzicp.com/search?keyword=${encodeURIComponent(keyword)}`
  },
  {
    name: "番茄小说",
    searchUrl: (keyword) => `https://fanqienovel.com/search?keyword=${encodeURIComponent(keyword)}`
  },
  {
    name: "起点中文网",
    searchUrl: (keyword) => `https://www.qidian.com/search?kw=${encodeURIComponent(keyword)}`
  }
];

Page({
  data: {
    importUrl: "",
    parsedImport: {
      sourceId: "",
      sourceUrl: ""
    },
    bookSearchKeyword: "",
    platformIndex: 0,
    platformNames: platformOptions.map((item) => item.name),
    officialSearchLink: "",
    searchResults: [],
    form: { ...blankForm },
    books: [],
    filteredBooks: [],
    keyword: "",
    filterIndex: 0,
    filterLabels: ["全部", ...statusOptions.map((item) => item.label)],
    statusOptions,
    statusMap: statusOptions.reduce((map, item) => {
      map[item.value] = item.label;
      return map;
    }, {}),
    editingId: ""
  },

  onLoad() {
    this.loadBooks();
  },

  loadBooks() {
    const books = (wx.getStorageSync(app.globalData.storageKey) || []).map((book) => ({
      ...book,
      tags: Array.isArray(book.tags) ? book.tags : []
    }));
    this.setData({ books }, () => this.applyFilters());
  },

  persistBooks(books) {
    wx.setStorageSync(app.globalData.storageKey, books);
    this.setData({ books }, () => this.applyFilters());
  },

  onPlatformChange(event) {
    this.setData({
      platformIndex: Number(event.detail.value),
      officialSearchLink: "",
      searchResults: []
    });
  },

  onBookSearchInput(event) {
    this.setData({ bookSearchKeyword: event.detail.value });
  },

  onImportUrlInput(event) {
    this.setData({
      importUrl: event.detail.value,
      parsedImport: {
        sourceId: "",
        sourceUrl: ""
      }
    });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value }, () => this.applyFilters());
  },

  onFilterChange(event) {
    this.setData({ filterIndex: Number(event.detail.value) }, () => this.applyFilters());
  },

  onFormInput(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.detail.value;
    this.setData({
      form: {
        ...this.data.form,
        [key]: value
      }
    });
  },

  setReadingStatus(event) {
    this.setData({
      form: {
        ...this.data.form,
        readingStatus: event.currentTarget.dataset.value
      }
    });
  },

  searchPlatformBooks() {
    const keyword = this.data.bookSearchKeyword.trim();

    if (!keyword) {
      wx.showToast({ title: "请输入小说名", icon: "none" });
      return;
    }

    const platform = platformOptions[this.data.platformIndex];
    const normalizedKeyword = keyword.toLowerCase();
    const localResults = this.data.books
      .filter((book) => {
        const title = (book.title || "").toLowerCase();
        const author = (book.author || "").toLowerCase();
        const bookPlatform = book.platform || "";
        return bookPlatform === platform.name && (title.includes(normalizedKeyword) || author.includes(normalizedKeyword));
      })
      .map((book) => ({
        ...book,
        displayStatus: this.data.statusMap[book.readingStatus] || book.readingStatus || "未标记"
      }));

    this.setData({
      searchResults: localResults,
      officialSearchLink: platform.searchUrl(keyword)
    });
  },

  useSearchAsDraft() {
    const keyword = this.data.bookSearchKeyword.trim();
    const platform = platformOptions[this.data.platformIndex];

    if (!keyword) {
      wx.showToast({ title: "请输入小说名", icon: "none" });
      return;
    }

    this.setData({
      form: {
        ...this.data.form,
        title: keyword,
        platform: platform.name,
        sourceUrl: this.data.officialSearchLink || platform.searchUrl(keyword)
      }
    });
    wx.showToast({ title: "已填入表单", icon: "success" });
  },

  copyOfficialSearchLink() {
    const keyword = this.data.bookSearchKeyword.trim();

    if (!keyword) {
      wx.showToast({ title: "请输入小说名", icon: "none" });
      return;
    }

    const platform = platformOptions[this.data.platformIndex];
    const officialSearchLink = this.data.officialSearchLink || platform.searchUrl(keyword);
    this.setData({ officialSearchLink });
    wx.setClipboardData({ data: officialSearchLink });
  },

  parseJjwxcLink() {
    const rawUrl = this.data.importUrl.trim();
    const sourceId = this.extractJjwxcNovelId(rawUrl);

    if (!sourceId) {
      wx.showToast({ title: "未识别作品 ID", icon: "none" });
      return;
    }

    const sourceUrl = `https://www.jjwxc.net/onebook.php?novelid=${sourceId}`;
    this.setData({
      parsedImport: {
        sourceId,
        sourceUrl
      },
      form: {
        ...this.data.form,
        platform: "晋江文学城",
        sourceId,
        sourceUrl
      }
    });
    wx.showToast({ title: "已解析", icon: "success" });
  },

  extractJjwxcNovelId(url) {
    const normalizedUrl = decodeURIComponent(String(url || ""))
      .replace(/[“”‘’`]/g, "")
      .replace(/\s+/g, "");

    const patterns = [
      /[?&]novelid=(\d+)/i,
      /onebook\.php\/?(\d+)/i,
      /novelid[=/](\d+)/i,
      /^(\d{4,})$/
    ];

    for (const pattern of patterns) {
      const match = normalizedUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return "";
  },

  saveBook() {
    const form = this.data.form;

    if (!form.title.trim()) {
      wx.showToast({ title: "请填写小说名称", icon: "none" });
      return;
    }

    const now = Date.now();
    const nextBook = {
      ...form,
      id: form.id || String(now),
      title: form.title.trim(),
      author: form.author.trim(),
      platform: form.platform.trim(),
      wordCount: form.wordCount.trim(),
      status: form.status.trim(),
      sourceId: form.sourceId.trim(),
      sourceUrl: form.sourceUrl.trim(),
      summary: form.summary.trim(),
      notes: form.notes.trim(),
      tags: this.normalizeTags(form.tagsText),
      updatedAt: now
    };

    const exists = this.data.books.some((book) => book.id === nextBook.id);
    const books = exists
      ? this.data.books.map((book) => (book.id === nextBook.id ? nextBook : book))
      : [nextBook, ...this.data.books];

    this.persistBooks(books);
    this.resetForm();
    wx.showToast({ title: exists ? "已更新" : "已加入", icon: "success" });
  },

  normalizeTags(rawTags) {
    if (Array.isArray(rawTags)) {
      rawTags = rawTags.join(",");
    }

    return String(rawTags || "")
      .split(/[,，、\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  },

  editBook(event) {
    const id = event.currentTarget.dataset.id;
    const book = this.data.books.find((item) => item.id === id);

    if (!book) {
      return;
    }

    this.setData({
      editingId: id,
      importUrl: book.sourceUrl || "",
      form: {
        ...blankForm,
        ...book,
        tagsText: (book.tags || []).join(",")
      }
    });
  },

  deleteBook(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除记录",
      content: "只会删除本地书架里的私人记录。",
      confirmColor: "#8f2d2d",
      success: (res) => {
        if (res.confirm) {
          this.persistBooks(this.data.books.filter((book) => book.id !== id));
        }
      }
    });
  },

  copySourceUrl(event) {
    const url = event.currentTarget.dataset.url;

    if (!url) {
      wx.showToast({ title: "没有原站链接", icon: "none" });
      return;
    }

    wx.setClipboardData({ data: url });
  },

  resetForm() {
    this.setData({
      importUrl: "",
      parsedImport: {
        sourceId: "",
        sourceUrl: ""
      },
      editingId: "",
      form: { ...blankForm }
    });
  },

  applyFilters() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const selectedStatus = this.data.filterIndex === 0 ? "" : statusOptions[this.data.filterIndex - 1].value;

    const filteredBooks = this.data.books.filter((book) => {
      const matchesStatus = !selectedStatus || book.readingStatus === selectedStatus;
      const haystack = [
        book.title,
        book.author,
        book.platform,
        book.summary,
        book.notes,
        ...(book.tags || [])
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!keyword || haystack.includes(keyword));
    }).map((book) => ({
      ...book,
      displayStatus: this.data.statusMap[book.readingStatus] || book.readingStatus || "未标记"
    }));

    this.setData({ filteredBooks });
  }
});
