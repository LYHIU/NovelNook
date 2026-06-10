/**
 * 晋江文学城搜索页爬虫
 *
 * 职责：请求晋江搜索页 → 解析 HTML → 返回结构化候选结果
 * 合规边界：仅抓取搜索页公开展示的书名/作者/作品ID/链接/简介摘要，
 * 不抓取正文、付费章节、目录列表。用于个人工具场景，请控制频率。
 */

const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

/**
 * 从 URL 中提取 novelid
 * 支持的格式：
 *   onebook.php?novelid=1234567
 *   novelid=1234567
 *   onebook.php/1234567
 */
function extractNovelId(href) {
  const patterns = [
    /[?&]novelid=(\d+)/i,
    /onebook\.php\/(\d+)/i,
    /novelid[=/](\d+)/i,
  ];
  for (const p of patterns) {
    const m = (href || "").match(p);
    if (m) return m[1];
  }
  return "";
}

/**
 * 从文本中提取作者名
 * 常见格式："作者：xxx"、"作者: xxx"、"作者： xxx"
 */
function extractAuthor(text) {
  const m = (text || "").match(/作者[：:\s]*([^\s\n]+)/);
  return m ? m[1].trim() : "";
}

/**
 * 清洗文本中常见元数据标签，得到简介片段
 */
function cleanBrief(text) {
  return (text || "")
    .replace(/作者[：:]\s*\S+/g, "")
    .replace(/进度[：:]\s*\S+/g, "")
    .replace(/字数[：:]\s*\S+/g, "")
    .replace(/风格[：:]\s*\S+/g, "")
    .replace(/视角[：:]\s*\S+/g, "")
    .replace(/搜索关键字[：:]\s*\S+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/**
 * 搜索晋江文学城
 * @param {string} keyword - 书名关键词
 * @returns {Promise<Array>} 结构化结果数组
 */
async function searchJjwxc(keyword) {
  const url = `https://www.jjwxc.net/search.php?kw=${encodeURIComponent(keyword)}`;

  const resp = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    timeout: 15000,
    // 不自动跟随重定向，便于调试
    maxRedirects: 5,
    validateStatus: (s) => s < 400,
  });

  // 晋江页面通常为 GBK 编码
  const html = iconv.decode(Buffer.from(resp.data), "gbk");
  const $ = cheerio.load(html);

  const results = [];

  // 策略：找到页面中所有包含 novelid= 的 <a> 标签
  $('a[href*="novelid="]').each((_i, el) => {
    const $el = $(el);
    const href = $el.attr("href") || "";
    const novelid = extractNovelId(href);
    const title = ($el.text() || "").replace(/\s+/g, " ").trim();

    // 过滤无效 / 非作品链接
    if (!novelid || !title) return;
    if (title.length > 80) return; // 极可能是噪声

    // 向上找最近的容器（tr / li / .item / div），用于提取作者和简介
    const $container = $el.closest("tr, li, div.item, div.book, div");
    const containerText = $container.text() || "";

    const author = extractAuthor(containerText);
    const brief = cleanBrief(containerText.replace(title, ""));

    results.push({
      title,
      author,
      novelid,
      sourceUrl: `https://www.jjwxc.net/onebook.php?novelid=${novelid}`,
      platform: "晋江文学城",
      brief,
    });
  });

  // 按 novelid 去重
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.novelid)) return false;
    seen.add(r.novelid);
    return true;
  });
}

module.exports = { searchJjwxc };
