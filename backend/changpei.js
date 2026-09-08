const express=require('express'),axios=require('axios'),cheerio=require('cheerio');
const validId=id=>typeof id==='string'&&/^[1-9]\d{0,11}$/.test(id);
const ORIGIN='https://www.gongzicp.com';
function data(response){
 const value=typeof response==='string'?JSON.parse(response):response;
 if(value?.code!==200||!value.data||typeof value.data!=='object')throw Error('长佩暂时无法返回资料，请稍后重试。');
 return value.data;
}
function plain(html){const $=cheerio.load(String(html||''));$('script,style').remove();$('br').replaceWith('\n');$('p').append('\n');return $.text().replace(/\n{3,}/g,'\n\n').trim();}
function parseBook(response,id){
 const b=data(response);if(String(b.novel_id)!==id||!b.novel_name)throw Error('未找到这本长佩作品。');
 const n=Number(b.novel_wordnumber);
 return {sourceId:id,platform:'长佩文学',platformCode:'changpei',title:b.novel_name,author:b.author_nickname||b.novel_author||'',authorId:String(b.author_id||''),summary:plain(b.novel_info||b.novel_desc),wordCount:b.novel_wordnumber!=null&&Number.isSafeInteger(n)&&n>=0?n:null,serialStatus:typeof b.novel_process==='string'?b.novel_process:'',genre:b.type_names||'',coverUrl:b.novel_cover||'',sourceUrl:ORIGIN+'/novel-'+id+'.html',fetchedAt:Date.now()};
}
function parseSearch(response,author=''){
 const d=data(response);if(!Array.isArray(d.list))throw Error('长佩搜索格式已变化。');
 return d.list.filter(b=>validId(String(b.novel_id))&&b.novel_name&&(!author||String(b.novel_author||b.author_nickname||'').includes(author))).slice(0,30).map(b=>({sourceId:String(b.novel_id),title:b.novel_name,author:b.novel_author||b.author_nickname||'',platform:'长佩文学',sourceUrl:ORIGIN+'/novel-'+b.novel_id+'.html'}));
}
function parseAuthors(response){
 const d=data(response);if(!Array.isArray(d.list))throw Error('长佩作者搜索格式已变化。');
 return {authors:d.list.filter(a=>validId(String(a.user_id))).map(a=>({id:String(a.user_id),name:a.user_nickname||'作者',externalUrl:ORIGIN+'/zone/user-'+a.user_id+'.html'})),hasMore:d.list.length>=10};
}
function parseAuthorBooks(response,id){const results=parseSearch(response);return {author:{id,name:results[0]?.author||'作者作品'},results,sourceUrl:ORIGIN+'/zone/author-'+id+'.html',message:'展示官网当前页公开作品'};}
function endpoint(action,{id,keyword='',page=1}={}){
 if(action==='book'||action==='author'){if(!validId(id))throw Error('作品或作者 ID 不正确。');return ORIGIN+'/webapi/'+(action==='book'?'novel/novelInfo?id='+id:'zone/userGetNovelList?aid='+id+'&type=author&page=1');}
 if(!['search','authors'].includes(action))throw Error('不支持的长佩操作。');
 if(!keyword.trim()||keyword.length>200||!Number.isInteger(Number(page))||Number(page)<1||Number(page)>100)throw Error('请输入搜索词，页码需在1至100之间。');
 return ORIGIN+'/webapi/search/'+(action==='authors'?'users':'novels')+'?'+new URLSearchParams({k:keyword,page:String(page)});
}
async function getPage(url){return (await axios.get(url,{timeout:15000,maxContentLength:2000000,maxRedirects:0,headers:{Accept:'application/json'}})).data;}
function createRouter({fetchPage=getPage}={}){
 const router=express.Router();router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 for(const [route,action] of [['/search','search'],['/authors','authors'],['/book/:id','book'],['/author/:id/books','author']])router.get(route,async(req,res)=>{
  let url;try{url=endpoint(action,{id:req.params.id,keyword:typeof req.query.keyword==='string'?req.query.keyword:'',page:Number(req.query.page||1)});}catch(e){return res.status(400).json({error:e.message});}
  try{const raw=await fetchPage(url);res.json(action==='book'?{book:parseBook(raw,req.params.id)}:action==='authors'?parseAuthors(raw):action==='author'?parseAuthorBooks(raw,req.params.id):{results:parseSearch(raw,typeof req.query.author==='string'?req.query.author:'')});}
  catch{res.status(502).json({error:'长佩资料暂时读取失败，请稍后重试，或使用截图确认录入。'});}
 });return router;
}
module.exports={createRouter,parseBook,parseSearch,parseAuthors,parseAuthorBooks,endpoint,validId};
