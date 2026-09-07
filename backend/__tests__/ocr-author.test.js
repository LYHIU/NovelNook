const {test}=require('node:test'),assert=require('node:assert/strict');
const {parse}=require('../public/preview/ocr-parser');
const {parseAuthors,parseAuthorBooks}=require('../jinjiang');
test('截图：组合证据识别晋江，ID跨行，排除霸王票编号',()=>{
 const r=parse({text:'作者：甲\n非v章均\n荣誉墙\n秘密花园\n霸王票N985470\nID\n:9299461',confidence:85});
 assert.equal(r.platform,'jjwxc');assert.equal(r.sourceId,'9299461');assert.equal(r.author,'甲');
 assert.equal(parse({text:'霸王票N985470'}).sourceId,'');
 assert.equal(parse({text:'ID:12345\nID:67890'}).sourceId,'');
});
test('截图：平台证据不足或相互冲突时不默认晋江，书架图不猜单书',()=>{
 assert.equal(parse({text:'作者:甲\n字数:10000\n已收藏'}).platform,'');
 assert.equal(parse({text:'晋江文学城 番茄小说'}).platform,'');
 const r=parse({text:'收藏\n最近阅读\n尚未分类\n新书千字榜'});assert.equal(r.isShelf,true);assert.equal(r.title,'');
});
test('作者搜索去重，作品页解析固定数字调用而不执行脚本',()=>{
 const result=parseAuthors('<a href="/wapauthor/12">甲</a><a href="/wapauthor/12">甲</a><a href="/wapauthor/13">甲乙</a><a href="/next">下一页</a>');
 assert.equal(result.authors.length,2);assert.equal(result.hasMore,true);
 const books=parseAuthorBooks('<title>甲-晋江文学城手机版作者专栏</title><table class="novel"><tr><td><a onclick="jump_book2(123,12)">《作品甲》</a></td></tr><tr><td><a onclick="jump_book2(456,13)">不属于该作者</a></td></tr></table>','12');
 assert.equal(books.author.name,'甲');assert.deepEqual(books.results.map(b=>b.sourceId),['123']);assert.equal(books.results[0].title,'作品甲');
});
