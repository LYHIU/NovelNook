/**
 * 晋江文学城搜索
 *
 * 双通道策略：
 * 1. search_ajax.php  JSON API —— 快速，限 5 条（自动补全接口）
 * 2. Baidu 搜索引擎回退 —— 覆盖面更广，可按作者筛选
 *
 * 合规边界：仅获取公开搜索接口返回的书名/作者/作品ID，
 * 不抓取正文、付费章节、目录列表。用于个人工具场景，请控制频率。
 */

const axios = require("axios");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

// ============================================================
// 通道 1：晋江 search_ajax.php JSON API（自动补全，限 5 条）
// ============================================================

async function searchJjwxc(keyword) {
  const url =
    "https://www.jjwxc.net/search/search_ajax.php" +
    "?action=search" +
    "&keywords=" + encodeURIComponent(keyword) +
    "&type=1" +
    "&version=1" +
    "&getfull=1";

  const resp = await axios.get(url, {
    headers: {
      ...BROWSER_HEADERS,
      Referer: "https://www.jjwxc.net/search.php?kw=" + encodeURIComponent(keyword),
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 15000,
  });

  const body = resp.data;
  if (body.status !== 200 || !Array.isArray(body.data) || body.data.length === 0) {
    return [];
  }

  return body.data.map((item) => ({
    title: item.novelname || "",
    author: item.authorname || "",
    authorId: String(item.authorid || ""),
    novelid: String(item.novelid || ""),
    sourceUrl: item.novelid
      ? `https://www.jjwxc.net/onebook.php?novelid=${item.novelid}`
      : "",
    platform: "晋江文学城",
    brief: item.intro || item.label || "",
  }));
}

// ============================================================
// 通道 2：Baidu 搜索引擎回退（覆盖面更广，支持作者筛选）
// ============================================================

/**
 * 通过 Baidu 搜索 jjwxc.net，提取匹配的 novelid
 *
 * @param {string} keyword  - 书名关键词
 * @param {string} [author] - 可选，作者名用于缩小范围
 * @returns {Promise<Array>}
 */
async function searchJjwxcViaBaidu(keyword, author) {
  const q = author
    ? `${keyword} ${author} site:jjwxc.net`
    : `${keyword} site:jjwxc.net`;

  const url = "https://www.baidu.com/s?wd=" + encodeURIComponent(q);

  const resp = await axios.get(url, {
    headers: {
      ...BROWSER_HEADERS,
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 15000,
  });

  const html = resp.data;

  // 从 Baidu 结果中提取所有 novelid
  const novelIdRegex = /onebook\.php\?novelid=(\d+)/gi;
  const seen = new Set();
  const results = [];

  for (const match of html.matchAll(novelIdRegex)) {
    const novelid = match[1];
    if (seen.has(novelid)) continue;
    seen.add(novelid);

    // 尝试从 snippet 中提取书名
    const title = extractTitleFromSnippet(html, novelid, keyword);

    results.push({
      title: title || keyword,
      author: author || "",
      authorId: "",
      novelid,
      sourceUrl: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
      platform: "晋江文学城",
      brief: `来自搜索引擎匹配（Baidu）`,
    });
  }

  return results;
}

/**
 * 从 Baidu 搜索片段中提取书名
 * 片段格式示例："《造神》星海浮萍_晋江文学城..."
 */
function extractTitleFromSnippet(html, novelid, fallbackKeyword) {
  // 在包含此 novelid 的上下文附近搜索书名
  const idx = html.indexOf(novelid);
  if (idx === -1) return fallbackKeyword;

  const context = html.substring(Math.max(0, idx - 500), idx + 200);

  // 常见模式：书名号中的文本
  const titleMatch = context.match(/《([^》]+)》/);
  if (titleMatch) return titleMatch[1].trim();

  // 回退：URL 前的描述文本
  const descMatch = context.match(/>([^<]{2,40})<\/a>[\s\S]{0,50}onebook\.php\?novelid=\d+/i);
  if (descMatch) return descMatch[1].trim();

  return fallbackKeyword;
}

module.exports = { searchJjwxc, searchJjwxcViaBaidu };
