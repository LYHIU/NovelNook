const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseBook,parseSearch,encodeKeyword,createRouter}=require('../jinjiang');
test('作品字段隔离、文案纯文本换行和缺失字段',()=>{
 const b=parseBook('<h1 itemprop="name"><span itemprop="articleSection">测试书</span></h1><span itemprop="author">甲</span><span itemprop="wordCount">125,396字</span><span itemprop="updataStatus">连载</span><div id="novelintro">第一行<br>第二行<script>bad()</script>&lt;文字&gt;</div><table itemprop="chapter"><tr><td>不导入目录</td></tr></table>','123');
 assert.equal(b.title,'测试书');assert.equal(b.wordCount,125396);assert.equal(b.serialStatus,'连载');assert.equal(b.summary,'第一行\n第二行<文字>');assert.equal(b.coverUrl,'');
 assert.equal(parseBook('<h1 itemprop="name">缺资料的书</h1>','2').wordCount,null);assert.throws(()=>parseBook('<h1>验证页面</h1>','2'));
});
test('搜索解码标题、去重、按作者过滤及正确 GB 编码',()=>{
 const html='<div><a href="/book2/123"><span>测试</span>书</a> - <a href="/wapauthor/9">甲</a></div><div><a href="/book2/123">重复</a></div><a href="/book2/x">异常</a>';
 assert.equal(parseSearch(html).length,1);assert.equal(parseSearch(html)[0].title,'测试书');assert.equal(parseSearch(html,'乙').length,0);
 assert.equal(encodeKeyword('中文'),'%d6%d0%ce%c4');
});
test('接口拒绝非数字 ID，不把任意地址转发上游',async t=>{
 const express=require('express'),app=express();let calls=0;
 app.use('/api/jinjiang',createRouter({getPage:async()=>{calls++;return '';}}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;const res=await fetch(base+'/api/jinjiang/book/not-a-number');assert.equal(res.status,400);assert.equal(calls,0);
});
