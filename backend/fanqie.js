const express=require('express'),axios=require('axios'),cheerio=require('cheerio');
const validId=id=>typeof id==='string'&&/^[1-9]\d{0,19}$/.test(id);
async function getPage(url){return (await axios.get(url,{timeout:12000,maxContentLength:4000000,maxRedirects:0,headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html,application/json'}})).data;}
function state(html){
 const $=cheerio.load(html),script=$('script').toArray().map(e=>$(e).text()).find(t=>t.includes('window.__INITIAL_STATE__='));
 if(!script)throw Error('资料格式已变化');
 const start=script.indexOf('window.__INITIAL_STATE__=')+25;
 const raw=script.slice(start).split(/;\s*\n/)[0];
 return JSON.parse(raw.replace(/"(?:[^"\\]|\\.)*"|\bundefined\b/g,m=>m==='undefined'?'null':m));
}
function parseBook(html,id){
 const $=cheerio.load(html),p=state(html).page;
 if(!p?.bookName||String(p.bookId)!==id)throw Error('未找到作品');
 return {sourceId:id,platform:'番茄小说',platformCode:'fanqie',title:p.bookName,author:p.author||'',authorId:String(p.authorId||''),summary:p.abstract||'',wordCount:Number.isSafeInteger(p.wordNumber)?p.wordNumber:$('.info-count-word').text().trim(),serialStatus:$('.info-label-yellow').text().trim(),genre:$('.info-label-grey').text().trim(),coverUrl:p.thumbUri||'',sourceUrl:'https://fanqienovel.com/page/'+id,fetchedAt:Date.now()};
}
function parseAuthorBooks(html,id){
 const p=state(html).author;
 if(!p?.serverRendered)throw Error('未找到作者');
 return {author:{id,name:p.name||''},results:(p.bookListRes?.book_list||[]).filter(b=>validId(b.book_id)).map(b=>({sourceId:b.book_id,title:b.book_name,author:p.name,platform:'番茄小说',sourceUrl:'https://fanqienovel.com/page/'+b.book_id})),total:p.bookListRes?.total_count};
}
function searchUrl(keyword,page=1){return 'https://fanqienovel.com/api/author/search/search_book/v1?'+new URLSearchParams({query_word:keyword,page_index:String(page-1),page_count:'10',query_type:'0',filter:'127,127,127,127'});}
function parseSearchResponse(response,mode='search',author=''){
 const raw=typeof response==='string'&&response.trim()?JSON.parse(response):response;
 if(!raw||typeof raw!=='object'||raw.code!==0||!raw.data)throw Error('番茄搜索暂时需要官网验证，可使用作品链接或截图确认录入。');
 const d=raw.data;if(mode==='authors'){
  if(!Array.isArray(d.search_author_data_list))throw Error('番茄未返回可用的作者搜索结果。');
  return {authors:d.search_author_data_list.filter(a=>validId(a.author_id)).map(a=>({id:a.author_id,name:a.author_name||a.name||''})),hasMore:false};
 }
 if(!Array.isArray(d.search_book_data_list))throw Error('番茄未返回可用的书籍搜索结果。');
 return {results:d.search_book_data_list.filter(b=>validId(b.book_id)&&b.book_name).map(b=>({sourceId:b.book_id,title:b.book_name,author:b.author||b.author_name||'',platform:'番茄小说'})).filter(b=>!author||b.author.includes(author))};
}
function createRouter({fetchPage=getPage}={}){
 const r=express.Router();r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 r.get('/book/:id',async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({error:'作品 ID 不正确。'});try{res.json({book:parseBook(await fetchPage('https://fanqienovel.com/page/'+req.params.id),req.params.id)});}catch{res.status(502).json({error:'番茄作品资料暂时无法读取，请核对官方作品链接后重试。'});}});
 r.get('/author/:id/books',async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({error:'作者 ID 不正确。'});try{const data=parseAuthorBooks(await fetchPage('https://fanqienovel.com/author-page/'+req.params.id),req.params.id);for(let i=0;i<data.results.length;i+=3){await Promise.all(data.results.slice(i,i+3).map(async b=>{if(!/[\uE000-\uF8FF]/.test(b.title))return;try{b.title=parseBook(await fetchPage(b.sourceUrl),b.sourceId).title;}catch{b.title='作品 '+b.sourceId+'（点击读取书名）';}}));}res.json(data);}catch{res.status(502).json({error:'番茄作者资料暂时无法读取，请核对作者主页链接。'});}});
 for(const mode of ['search','authors'])r.get('/'+mode,async(req,res)=>{
 const keyword=typeof req.query.keyword==='string'?req.query.keyword.trim():'';
 if(!keyword||keyword.length>200)return res.status(400).json({error:'请输入搜索关键词。'});
 try{
 const n=Number(req.query.page||1);if(!Number.isInteger(n)||n<1||n>100)return res.status(400).json({error:'页码不正确。'});
 const data=await fetchPage(searchUrl(keyword,n));res.json(parseSearchResponse(data,mode,typeof req.query.author==='string'?req.query.author:''));
 }catch{res.status(503).json({error:'番茄搜索暂时需要官网验证。可粘贴作品链接，或使用截图确认录入。'});}
 });
 return r;
}
module.exports={createRouter,parseBook,parseAuthorBooks,state,validId,searchUrl,parseSearchResponse};
