const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const express = require('express');
const HEADERS = {'User-Agent':'NovelNook/0.1 (personal bookshelf metadata)','Accept':'text/html'};
function encodeKeyword(value) {return [...iconv.encode(value,'gb18030')].map(b=>'%'+b.toString(16).padStart(2,'0')).join('');}
async function page(url) {
 const r=await axios.get(url,{headers:HEADERS,responseType:'arraybuffer',timeout:12000,maxContentLength:2000000,maxRedirects:2});
 const buffer=Buffer.from(r.data);
 const encoding=buffer.toString('latin1').match(/charset\s*=\s*["']?([\w-]+)/i)?.[1]||'gb18030';
 return iconv.decode(buffer,encoding);
}
function cleanText($,element) {
 const clone=element.clone();clone.find('script,style,noscript').remove();
 clone.find('br').replaceWith('\n');clone.find('p').each((_i,e)=>$(e).append('\n'));
 return clone.text().replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function parseSearch(html,author='') {
 const $=cheerio.load(html),seen=new Set(),results=[];
 $('a[href^="/book2/"]').each((_i,e)=>{
  const a=$(e),id=a.attr('href').match(/^\/book2\/(\d+)(?:[/?#]|$)/)?.[1];
  if(!id||seen.has(id)||results.length>=30)return;
  const title=a.text().trim(),name=a.parent().find('a[href^="/wapauthor/"]').first().text().trim();
  if(!title||(author&&!name.includes(author)))return;
  seen.add(id);results.push({sourceId:id,title,author:name,platform:'晋江文学城',sourceUrl:'https://www.jjwxc.net/onebook.php?novelid='+id});
 });
 return results;
}
function parseBook(html,id) {
 const $=cheerio.load(html);
 const title=$('[itemprop="articleSection"]').first().text().trim()||$('h1[itemprop="name"]').first().text().trim();
 if(!title)throw Error('BOOK_NOT_FOUND');
 const author=$('[itemprop="author"]').first().text().trim()||$('meta[name="Author"]').attr('content')||'';
 const summary=cleanText($,$('#novelintro').first());
 const count=$('[itemprop="wordCount"]').first().text().replace(/[,\s]/g,'').match(/(\d+)/)?.[1];
 const cover=$('img[itemprop="image"]').first().attr('src')||'';
 let coverUrl='';try{if(!cover)throw Error('NO_COVER');const u=new URL(cover,'https://www.jjwxc.net');if(['http:','https:'].includes(u.protocol)){u.protocol='https:';coverUrl=u.href;}}catch{}
 return {sourceId:id,title,author,platform:'晋江文学城',summary,wordCount:count?Number(count):null,
  serialStatus:$('[itemprop="updataStatus"]').first().text().trim(),
  genre:cleanText($,$('[itemprop="genre"]').first()),coverUrl,
  sourceUrl:'https://www.jjwxc.net/onebook.php?novelid='+id,fetchedAt:Date.now()};
}

function parseAuthors(html) {
 const $=cheerio.load(html),authors=new Map();
 $('a[href^="/wapauthor/"]').each((_i,e)=>{
  const id=$(e).attr('href').match(/^\/wapauthor\/(\d+)\/?$/)?.[1],name=$(e).text().trim();
  if(id&&name&&!authors.has(id))authors.set(id,{id,name});
 });
 return {authors:[...authors.values()],hasMore:$('a').toArray().some(e=>/^(下一页|下页)$/.test($(e).text().trim()))};
}
function parseAuthorBooks(html,id) {
 const $=cheerio.load(html),name=$('title').text().split(/[-－]晋江/)[0].trim(),seen=new Set(),results=[];
 $('table.novel a').each((_i,e)=>{
  const a=$(e),call=a.attr('onclick')||'',match=call.match(/^jump_book2\((\d+),\s*(\d+)\)/);
  const sourceId=match&&match[2]===id?match[1]:a.attr('href')?.match(/^\/book2\/(\d+)\/?$/)?.[1];
  const title=a.text().trim().replace(/^《|》$/g,'');
  if(!sourceId||!title||seen.has(sourceId))return;
  seen.add(sourceId);results.push({sourceId,title,author:name,platform:'晋江文学城',sourceUrl:'https://www.jjwxc.net/onebook.php?novelid='+sourceId});
 });
 return {author:{id,name},results};
}

function createRouter({getPage=page}={}) {
 const r=express.Router();r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});

 r.get('/authors',async(req,res)=>{
  const keyword=typeof req.query.keyword==='string'?req.query.keyword.trim():'',n=Number(req.query.page||1);
  if(!keyword||keyword.length>100||!Number.isInteger(n)||n<1||n>100)return res.status(400).json({error:'请输入作者名，页码需在1至100之间。'});
  try{const url='https://m.jjwxc.net/search'+(n===1?'':'/index/page/'+n)+'?kw='+encodeKeyword(keyword)+'&t=2';
   res.json({...parseAuthors(await getPage(url)),page:n});}
  catch{res.status(502).json({error:'作者搜索暂时不可用，请重试。'});}
 });
 r.get('/author/:id/books',async(req,res)=>{
  if(!/^[1-9]\d{0,11}$/.test(req.params.id))return res.status(400).json({error:'作者 ID 不正确。'});
  try{res.json(parseAuthorBooks(await getPage('https://m.jjwxc.net/wapauthor/'+req.params.id),req.params.id));}
  catch{res.status(502).json({error:'作者作品暂时读取失败，请重试。'});}
 });

 r.get('/search',async(req,res)=>{
  const keyword=typeof req.query.keyword==='string'?req.query.keyword.trim():'';
  const author=typeof req.query.author==='string'?req.query.author.trim():'';
  if(!keyword||keyword.length>200||author.length>100)return res.status(400).json({error:'请输入200字以内的书名。'});
  try{const results=parseSearch(await getPage('https://m.jjwxc.net/search?kw='+encodeKeyword(keyword)+'&t=1'),author);res.json({results});}
  catch(e){res.status(e.code==='ECONNABORTED'?504:502).json({error:'晋江搜索暂时不可用，请稍后再试，或粘贴作品链接。'});}
 });
 r.get('/book/:id',async(req,res)=>{
  const id=req.params.id;if(!/^[1-9]\d{0,11}$/.test(id))return res.status(400).json({error:'作品 ID 不正确。'});
  try{res.json({book:parseBook(await getPage('https://www.jjwxc.net/onebook.php?novelid='+id),id)});}
  catch(e){res.status(e.message==='BOOK_NOT_FOUND'?404:e.code==='ECONNABORTED'?504:502).json({error:e.message==='BOOK_NOT_FOUND'?'未找到可读取的作品资料，请核对链接。':'晋江资料暂时读取失败，请稍后重试。'});}
 });
 return r;
}
module.exports={createRouter,parseBook,parseSearch,encodeKeyword,parseAuthors,parseAuthorBooks};
