# NovelNook — Personal Web Novel Bookshelf

A mobile-first personal bookshelf manager for web novel readers. Track your reading
journey across multiple platforms (晋江, 长佩, 番茄, 起点) without scraping protected
content — your data stays local, your reading stays private.

## What It Does

- Search your personal bookshelf, or look up titles via the backend proxy
- Import book info by pasting a Jinjiang (晋江) link — auto-extracts the novel ID
- Manually add books with title, author, platform, word count, status, and notes
- Track 6 reading states: want to read, reading, finished, paused, dropped, re-read
- Write private notes and tags (e.g., tropes, deal-breakers, where you left off)
- Copy the original platform link to jump back to the official site
- Baidu fallback channel when Jinjiang's built-in search returns no match

## Two Ways to Use

### 1. Web App (recommended for Android / desktop)

```bash
cd backend
npm install
node server.js
```

Open **http://localhost:3000** in any browser. The web app is a single-page
application with a two-panel layout: bookshelf list + search on the left,
online lookup + edit form on the right. All data is stored in `localStorage`.

### 2. WeChat Mini Program

Open the project root in [WeChat DevTools](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html).
In DevTools settings, enable **"Do not verify valid domain names"** so the
backend API calls work during development. The mini program uses `wx.setStorageSync`
for local persistence.

> The mini program uses appid `wx9f47290ec4264fe8`. Replace with your own
> before publishing.

## Backend API

```
GET /api/search?keyword=小说名&platform=jjwxc&author=作者名
```

| Param      | Required | Description                           |
|------------|----------|---------------------------------------|
| `keyword`  | Yes      | Book title to search for              |
| `platform` | No       | Target platform (currently only `jjwxc`) |
| `author`   | No       | Optional author filter                |

Response:

```json
{
  "success": true,
  "platform": "jjwxc",
  "keyword": "小说名",
  "source": "ajax",
  "results": [
    {
      "title": "书名",
      "author": "作者",
      "novelid": "1234567",
      "sourceUrl": "https://www.jjwxc.net/onebook.php?novelid=1234567",
      "platform": "晋江文学城",
      "brief": "简介片段…"
    }
  ]
}
```

The backend uses a **dual-channel strategy**:
1. Jinjiang's `search_ajax.php` JSON API — fast, returns up to 5 results
2. Baidu search fallback — broader coverage, supports author filtering

## Compliance Boundaries

- ❌ No scraping of chapter content, paid chapters, or table of contents
- ❌ No long-term caching of platform covers, synopses, or protected text
- ❌ No impersonating an official platform client or aggregator
- ✅ Public bibliographic metadata only (title, author, novel ID, link)
- ✅ Search links direct users back to the official platform
- ✅ All user notes and bookshelf data stored locally

## Project Structure

```
.
├── app.js / app.json / app.wxss    # WeChat Mini Program entry
├── pages/index/                    # Mini program main page
├── backend/
│   ├── server.js                   # Express search proxy
│   ├── scraper.js                  # Jinjiang search (AJAX + Baidu fallback)
│   ├── public/
│   │   ├── index.html              # Web app shell
│   │   ├── app.js                  # Web app logic (localStorage)
│   │   └── style.css               # Web app styles
│   └── package.json
└── .specify/                       # Spec-Kit governance docs
```

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Web App  | Vanilla HTML/CSS/JS         |
| Mini App | WeChat Mini Program (WXML/WXSS/JS) |
| Backend  | Node.js + Express + Axios   |
| Storage  | localStorage / wx.Storage (zero server-side persistence) |

## License

MIT
