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
function createRouter({fetchPage=getPage}={}){
 const r=express.Router();r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 r.get('/book/:id',async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({error:'作品 ID 不正确。'});try{res.json({book:parseBook(await fetchPage('https://fanqienovel.com/page/'+req.params.id),req.params.id)});}catch{res.status(502).json({error:'番茄作品资料暂时无法读取，请核对官方作品链接后重试。'});}});
 r.get('/author/:id/books',async(req,res)=>{if(!validId(req.params.id))return res.status(400).json({error:'作者 ID 不正确。'});try{const data=parseAuthorBooks(await fetchPage('https://fanqienovel.com/author-page/'+req.params.id),req.params.id);for(let i=0;i<data.results.length;i+=3){await Promise.all(data.results.slice(i,i+3).map(async b=>{if(!/[\uE000-\uF8FF]/.test(b.title))return;try{b.title=parseBook(await fetchPage(b.sourceUrl),b.sourceId).title;}catch{b.title='作品 '+b.sourceId+'（点击读取书名）';}}));}res.json(data);}catch{res.status(502).json({error:'番茄作者资料暂时无法读取，请核对作者主页链接。'});}});
 for(const mode of ['search','authors'])r.get('/'+mode,async(req,res)=>{
 const keyword=typeof req.query.keyword==='string'?req.query.keyword.trim():'';
 if(!keyword||keyword.length>200)return res.status(400).json({error:'请输入搜索关键词。'});
 try{
 const data=await fetchPage('https://fanqienovel.com/api/author/search/search_book/v1?'+new URLSearchParams({query_word:keyword,page_index:String((Number(req.query.page)||1)-1),page_count:'10',query_type:'0',filter:'127,127,127,127'}));
 if(!data||typeof data!=='object'||data.code!==0)throw Error('SEARCH_UNAVAILABLE');
 const d=data.data||{};
 if(mode==='authors')res.json({authors:(d.search_author_data_list||[]).filter(a=>validId(a.author_id)).map(a=>({id:a.author_id,name:a.author_name||a.name||''})),hasMore:false});
 else res.json({results:(d.search_book_data_list||[]).filter(b=>validId(b.book_id)).map(b=>({sourceId:b.book_id,title:b.book_name,author:b.author||b.author_name||'',platform:'番茄小说'})).filter(b=>!req.query.author||b.author.includes(req.query.author))});
 }catch{res.status(503).json({error:'番茄当前未返回可用的搜索结果。请在番茄官网搜索，再粘贴作品或作者主页链接。'});}
 });
 return r;
}
module.exports={createRouter,parseBook,parseAuthorBooks,state,validId};
