# API 契约：后端搜索代理

**日期**: 2026-06-11 | **关联**: [plan.md](../plan.md)

## 基础信息

- **协议**: HTTP/1.1
- **格式**: JSON
- **编码**: UTF-8
- **CORS**: 允许所有来源（开发阶段），生产环境应限制
- **默认端口**: 3000（可通过 `PORT` 环境变量覆盖）

## 端点

### GET /api/search

按书名关键词搜索晋江文学城作品。

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | ✅ | 书名关键词，最长 80 字符 |
| `platform` | string | ❌ | 平台标识，默认 `jjwxc`，当前仅支持 `jjwxc` |
| `author` | string | ❌ | 作者名筛选，可选 |

**成功响应** (200):

```json
{
  "success": true,
  "platform": "jjwxc",
  "keyword": "造神",
  "source": "ajax",
  "results": [
    {
      "title": "造神",
      "author": "星海浮萍",
      "novelid": "1234567",
      "sourceUrl": "https://www.jjwxc.net/onebook.php?novelid=1234567",
      "platform": "晋江文学城",
      "brief": "简介片段..."
    }
  ]
}
```

- `source`: `"ajax"` 表示来自晋江 search_ajax.php 直接结果，`"baidu"` 表示来自 Baidu 搜索引擎回退
- `results`: 可能为空数组 `[]`

**客户端错误** (400):

```json
{
  "success": false,
  "error": "缺少 keyword 参数"
}
```

**上游超时** (504):

```json
{
  "success": false,
  "error": "请求晋江超时，请稍后重试"
}
```

**上游拒绝** (502):

```json
{
  "success": false,
  "error": "晋江拒绝了请求，请稍后重试"
}
```

### GET /api/health

健康检查。

**响应** (200):

```json
{
  "ok": true,
  "timestamp": 1718102400000
}
```

## 前端调用约定

- 超时设置: 20 秒
- 失败重试: 不自动重试（用户手动点击重试）
- 离线行为: 请求前检查 `navigator.onLine`，false 时直接提示无需尝试请求
- 错误展示: 将 `error` 字段原文展示给用户，不暴露技术细节
