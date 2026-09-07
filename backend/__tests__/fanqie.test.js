const test=require('node:test'),assert=require('node:assert/strict');
const {parseBook,parseAuthorBooks,validId,state,createRouter}=require('../fanqie');
const html=d=>'<script>window.__INITIAL_STATE__='+JSON.stringify(d)+';\n</script><span class="info-label-yellow">已完结</span>';
test('番茄长 ID 与正文隔离，精确字数来自原始字段',()=>{
 const b=parseBook(html({page:{bookId:'7218822722090961958',bookName:'测试',author:'甲',wordNumber:306964,abstract:'简介',chapterList:[{text:'不应返回'}]}}),'7218822722090961958');
 assert.equal(b.sourceId,'7218822722090961958');assert.equal(b.wordCount,306964);assert.equal(b.chapterList,undefined);assert.equal(validId('https://evil.test'),false);
 assert.throws(()=>parseBook(html({page:{bookName:'错书',bookId:'2'}}),'1'));
});
test('番茄状态仅解析数据，不执行脚本',()=>{
 assert.throws(()=>state('<script>window.__INITIAL_STATE__=process.exit();\n</script>'));
 const b=parseAuthorBooks(html({author:{serverRendered:true,name:'甲',bookListRes:{book_list:[{book_id:'7218822722090961958',book_name:'书'}],total_count:1}}}),'123');
 assert.equal(b.results[0].sourceId,'7218822722090961958');
});
test('番茄搜索空响应是服务不可用，不是假空结果',async()=>{
 const app=require('express')();let called=0;app.use(createRouter({fetchPage:async()=>{called++;return '';}}));const server=app.listen(0);
 try{const base='http://localhost:'+server.address().port;assert.equal((await fetch(base+'/search?keyword=test')).status,503);assert.equal((await fetch(base+'/book/abc')).status,400);assert.equal(called,1);}finally{server.close();}
});
test('番茄截图保留长 ID 和平台冲突确认',()=>{
 const parse=require('../public/preview/ocr-parser').parse;
 const r=parse({text:'番茄小说\n作品ID:7218822722090961958\n作者：童童'});assert.equal(r.platform,'fanqie');assert.equal(r.sourceId,'7218822722090961958');
 assert.equal(parse({text:'番茄小说 晋江文学城'}).platform,'');
});
