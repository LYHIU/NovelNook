/**
 * 晋江文学城搜索 —— JSON API 版
 *
 * 晋江搜索页实际通过 AJAX JSON 接口加载结果，不依赖 HTML 解析。
 * API: /search/search_ajax.php?action=search&keywords=...&type=1&version=1&getfull=1
 *
 * 合规边界：仅获取搜索 API 公开返回的书名/作者/作品ID，
 * 不抓取正文、付费章节、目录列表。用于个人工具场景，请控制频率。
 */

const axios = require("axios");

/**
 * 搜索晋江文学城
 * @param {string} keyword - 书名关键词
 * @returns {Promise<Array>} 结构化结果数组
 */
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
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer:
        "https://www.jjwxc.net/search.php?kw=" + encodeURIComponent(keyword),
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    },
    timeout: 15000,
  });

  const body = resp.data;

  // status 非 200 或 data 为空
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

module.exports = { searchJjwxc };
