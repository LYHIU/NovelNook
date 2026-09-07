(function(root){
 function parse(data){
  const text=String(data.text||''),compact=text.replace(/[ \t\u3000]/g,''),flat=compact.replace(/\n/g,'');
  const foreign=/番茄小说|fanqienovel\.com/i.test(flat);
  const direct=/晋江文学城|晋江小说|jjwxc\.net/i.test(flat);
  const clues=['非v章均','霸王票','灌溉','营养液','荣誉墙','秘密花园','作品积分'].filter(s=>flat.toLowerCase().includes(s.toLowerCase()));
  const platform=!foreign&&(direct||clues.length>=3)?'jjwxc':foreign&&!direct?'fanqie':'';
  const author=compact.match(/(?:作者)[：:·.]\s*([^\n]+)/)?.[1]?.replace(/作者专栏.*$/,'').trim()||'';
  const ids=[...compact.matchAll(/^(?:作品|书籍)?(?:ID|Id|id)[：:]?\s*(?:\n\s*)?[：:]?\s*([1-9]\d{3,19})(?!\d)/gmi)].map(m=>m[1]);
  const sourceId=new Set(ids).size===1?ids[0]:'';
  const isShelf=/最近阅读|尚未分类|新书千字榜/.test(flat)&&!author&&!sourceId;
  const lines=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>p.lines||[]));
  const authorLine=lines.find(l=>/作者[：:·.]/.test(l.text.replace(/\s/g,'')));
  let title='';
  if(!isShelf&&authorLine){
   const candidates=lines.filter(l=>l.bbox?.y1<=authorLine.bbox.y0&&l.bbox?.y0>0)
    .map(l=>l.text.replace(/\s/g,'').replace(/^[<〈‹←]+|[>›…·]+$/g,''))
    .filter(t=>/[\u4e00-\u9fff]{2}/.test(t)&&t.length>=4&&t.length<=120&&!/作者|收藏|字数|返回|MB\/|%|晋江文学城|新书千字榜/.test(t));
   title=candidates.sort((a,b)=>b.length-a.length)[0]||'';
  }
  return {platform,title,author,sourceId,confidence:Number(data.confidence)||0,isShelf,evidence:direct?'平台名称或域名':clues.join('、'),text};
 }
 const api={parse};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ScreenshotParser=api;
})(typeof window!=='undefined'?window:globalThis);
