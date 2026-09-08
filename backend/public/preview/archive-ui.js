(function(root){
 const states=['想看','刚开始看','在看','看完','暂搁','弃文','想二刷'];
 const stateCodes=['want','starting','reading','finished','paused','dropped','reread'];
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function stateCode(value){return stateCodes[states.indexOf(value)]||'want';}
 function wordCount(value){
  const n=typeof value==='number'?value:/^\d[\d,，]*$/.test(String(value||''))?Number(String(value).replace(/[,，]/g,'')):NaN;
  if(!Number.isSafeInteger(n)||n<0)return value?String(value):'字数未提供';
  return n>=10000?`${Math.round(n/1000)/10}万（${n.toLocaleString('en-US')}）`:`${n.toLocaleString('en-US')} 字`;
 }
 function highlight(value,query){
  const text=String(value??''),needle=String(query||'').trim();if(!needle)return escape(text);
  let start=0,result='',at;const lower=text.toLocaleLowerCase(),search=needle.toLocaleLowerCase();
  while((at=lower.indexOf(search,start))!==-1){result+=escape(text.slice(start,at))+'<mark>'+escape(text.slice(at,at+needle.length))+'</mark>';start=at+needle.length;}
  return result+escape(text.slice(start));
 }
 function excerpt(book,query){
  const texts=[book.overview,...(book.entries||[]).slice().reverse().map(n=>n.text)].filter(Boolean),q=String(query||'').trim().toLocaleLowerCase();
  const match=q&&texts.find(t=>t.toLocaleLowerCase().includes(q));const text=match||texts[0]||'还没有阅读记录';
  const at=match?text.toLocaleLowerCase().indexOf(q):-1;return at>30?'…'+text.slice(at-24,at+120):text;
 }
 function sortBooks(books,order){
  const updated=(a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0);
  const comparators={updated,title:(a,b)=>a.title.localeCompare(b.title,'zh-CN'),words:(a,b)=>(Number(b.wordCount)||0)-(Number(a.wordCount)||0),status:(a,b)=>states.indexOf(a.status)-states.indexOf(b.status)};
  return [...books].sort((a,b)=>(comparators[order]||updated)(a,b)||updated(a,b));
 }
 function provider(book){return book.platformCode||({'番茄小说':'fanqie','番茄':'fanqie','长佩文学':'changpei','长佩':'changpei','晋江文学城':'jinjiang','晋江':'jinjiang'}[book.platform])||'';}
 function sourceUrl(book){
  try{const u=new URL(book.sourceUrl);if(['https:','http:'].includes(u.protocol))return u.href;}catch{}
  const id=String(book.sourceId||'');if(!/^[1-9]\d*$/.test(id))return '';
  const prefixes={jinjiang:'https://www.jjwxc.net/onebook.php?novelid=',fanqie:'https://fanqienovel.com/page/',changpei:'https://www.gongzicp.com/novel-'};
  const code=provider(book);return prefixes[code]?prefixes[code]+id+(code==='changpei'?'.html':''):'';
 }
 function mergeMetadata(target,source){
  if(String(target.sourceId)!==String(source.sourceId)||provider(target)!==provider(source))throw Error('原站返回的作品与当前书籍不一致。');
  for(const key of ['title','author','sourceUrl','summary','wordCount','serialStatus','genre','coverUrl','fetchedAt'])if(source[key]!==''&&source[key]!=null)target[key]=source[key];
 }
 const paths={book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3V4Z',plus:'M12 5v14M5 12h14',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',back:'M15 5l-7 7 7 7',refresh:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',scan:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M6 12h12',pen:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-9 11 5 5',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',arrow:'M5 12h14m-6-6 6 6-6 6',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z'};
 function icon(name){return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[name]||paths.book)+'"/></svg>';}
 const api={states,stateCode,wordCount,highlight,excerpt,sortBooks,provider,sourceUrl,mergeMetadata,icon};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArchiveUI=api;
})(typeof window!=='undefined'?window:globalThis);
