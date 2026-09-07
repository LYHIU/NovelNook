const overviewRequests=new Set();
async function requestOverview(book){
 if(!book.entries.length)return toast('先记一笔，再整理总览。');
 if(overviewRequests.has(book.id))return toast('正在整理，请稍等。');
 const button=document.getElementById('ai'),panel=button.closest('section'),revision=book.revision;
 const payload={title:book.title,status:book.status,entries:book.entries.map(n=>({text:n.text,progress:n.progress||'',createdAt:n.createdAt}))};
 overviewRequests.add(book.id);button.disabled=true;button.textContent='整理中…';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),50000);
 try{
 const response=await fetch('/api/ai/overview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
 const result=await response.json();if(!response.ok)throw Error(result.error||'生成失败，请重试。');
 if(typeof result.overview!=='string'||!result.overview.trim())throw Error('AI 返回内容为空。');
 if(!panel.isConnected)return toast('页面已切换，未修改原总览。');
 modal('AI 总览草稿','<textarea aria-label="AI 总览草稿" rows="6">'+escapeHtml(result.overview)+'</textarea>',d=>{
 const overview=d.querySelector('textarea').value.trim();if(!overview)return false;
 if(!change(()=>{book.overview=overview;book.overviewRevision=revision;book.overviewSource='deepseek-v4-flash';}))return false;
 detail(book.id);toast(book.revision===revision?'总览已保存':'期间笔记有变化，总览仍需更新。');
 });
 }catch(e){toast(e.name==='AbortError'?'整理超时，原总览未改变。':e.message);}
 finally{clearTimeout(timer);overviewRequests.delete(book.id);if(button.isConnected){button.disabled=false;button.textContent='AI 整理';}}
}
