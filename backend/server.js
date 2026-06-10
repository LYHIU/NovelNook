/**
 * 私人书架 — 后端搜索代理
 *
 * 启动：node server.js
 * 默认端口：3000，可通过 PORT 环境变量覆盖
 *
 * 合规说明：
 * - 不缓存平台页面内容
 * - 仅抓取书名/作者/作品ID/链接/简介摘要
 * - 不提供正文、付费内容、目录列表
 * - 请求频率由调用方自行控制
 */

const express = require("express");
const { searchJjwxc } = require("./scraper");

const app = express();
const PORT = process.env.PORT || 3000;

// ----- 中间件 -----

// CORS — 允许小程序开发工具 / web-view 访问
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// 简单请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ----- 路由 -----

/** 健康检查 */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

/**
 * 搜索接口
 *
 * GET /api/search?keyword=小说名&platform=jjwxc
 *
 * 响应：
 * {
 *   success: true,
 *   platform: "jjwxc",
 *   keyword: "小说名",
 *   results: [
 *     {
 *       title: "书的名字",
 *       author: "作者名",
 *       novelid: "1234567",
 *       sourceUrl: "https://www.jjwxc.net/onebook.php?novelid=1234567",
 *       platform: "晋江文学城",
 *       brief: "简介片段..."
 *     }
 *   ]
 * }
 */
app.get("/api/search", async (req, res) => {
  const keyword = (req.query.keyword || "").trim();
  const platform = (req.query.platform || "jjwxc").toLowerCase();

  // 参数校验
  if (!keyword) {
    return res.status(400).json({
      success: false,
      error: "缺少 keyword 参数",
    });
  }

  if (keyword.length > 80) {
    return res.status(400).json({
      success: false,
      error: "关键词过长",
    });
  }

  // 仅实现晋江，其他平台返回提示
  if (platform !== "jjwxc") {
    return res.status(200).json({
      success: true,
      platform,
      keyword,
      results: [],
      message: `平台 "${platform}" 尚未接入在线搜索，请使用官方搜索链接`,
    });
  }

  try {
    const results = await searchJjwxc(keyword);

    console.log(
      `[search] keyword="${keyword}" platform="${platform}" → ${results.length} 条结果`
    );

    return res.json({
      success: true,
      platform,
      keyword,
      results,
    });
  } catch (err) {
    console.error(`[search] 抓取失败:`, err.message);

    // 区分错误类型
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        error: "请求晋江超时，请稍后重试",
      });
    }

    if (err.response && err.response.status === 403) {
      return res.status(502).json({
        success: false,
        error: "晋江拒绝了请求，请稍后重试",
      });
    }

    return res.status(502).json({
      success: false,
      error: "抓取失败，请稍后重试",
    });
  }
});

// ----- 启动 -----
app.listen(PORT, () => {
  console.log(`📚 私人书架后端已启动 → http://localhost:${PORT}`);
  console.log(`   搜索接口：GET /api/search?keyword=书名&platform=jjwxc`);
});
