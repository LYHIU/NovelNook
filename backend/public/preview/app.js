const KEY='reading_archive_design_preview_v1';
const STATES=ArchiveUI.states;
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let books=[],filter='',query='',sortOrder='updated',storageBroken=false;
let platform='jinjiang';
const platformName=()=>({fanqie:'番茄小说',changpei:'长佩文学',jinjiang:'晋江文学城'}[platform]);
let lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};
try{const raw=localStorage.getItem(KEY);if(raw){books=JSON.parse(raw);if(!Array.isArray(books)||books.some(b=>!b.id||typeof b.title!=='string'||!Array.isArray(b.entries)))throw Error();}}catch{storageBroken=true;}
function persist(){if(storageBroken){toast('本地数据无法读取，已阻止覆盖。');return false;}try{localStorage.setItem(KEY,JSON.stringify(books));return true;}catch{toast('保存失败，请先导出备份。');return false;}}
function change(update){const copy=JSON.stringify(books);update();if(persist())return true;books=JSON.parse(copy);return false;}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4000);}
function date(t){return new Date(t).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});}
function shell(html){cancelScreenshotOcr();document.querySelector('dialog')?.remove();$('#main').innerHTML=html;window.scrollTo(0,0);fixImages();const active=html.includes('id="export"')?'settingsNav':/id="lookup"|id="ocrBack"|id="inspection"|id="authorWorks"/.test(html)?'addNav':'shelfNav';document.querySelectorAll('nav button').forEach(el=>el.setAttribute('aria-current',el.id===active?'page':'false'));}
function safeUrl(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function cover(b,large=false){const url=safeUrl(b.coverUrl);return '<span class="cover '+(large?'large':'')+'"><span>'+escapeHtml(b.title.slice(0,12))+'</span>'+(url?'<img src="'+escapeHtml(url)+'" alt="'+escapeHtml(b.title)+'封面" referrerpolicy="no-referrer">':'')+'</span>';}
function fixImages(){document.querySelectorAll('.cover img').forEach(img=>{img.onerror=()=>img.remove();});}
function count(b){return ArchiveUI.wordCount(b.wordCount);}
function startAdd(){lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};add();}
function chips(values,current,attribute){return values.map(value=>'<button type="button" class="chip '+(STATES.includes(value)?'state-'+ArchiveUI.stateCode(value):'')+'" '+attribute+'="'+escapeHtml(value)+'" aria-pressed="'+(value===current)+'">'+escapeHtml(value||'全部')+'</button>').join('');}
function bookHeading(b){const words=escapeHtml(count(b)).replace(/（([^）]+)）/,'<span class="word-count-exact">（$1）</span>');return '<div class="book-heading">'+cover(b,true)+'<div><h1>'+escapeHtml(b.title)+'</h1><p class="book-author">'+escapeHtml(b.author||'作者未填')+'</p><p class="book-source"><span>'+escapeHtml(b.platform)+'</span><span>'+escapeHtml(b.serialStatus||'连载状态未提供')+'</span></p></div><div class="book-heading-footer"><p class="book-metrics"><span>字数</span><strong>'+words+'</strong></p>'+sourceLink(b)+'</div></div>';}

function sourceLink(b){const u=safeUrl(ArchiveUI.sourceUrl(b));return u?'<a class="source-link" href="'+escapeHtml(u)+'" target="_blank" rel="noopener noreferrer">查看原文 ↗</a>':'';}

function shelf(){
 shell('<div class="page-title"><div><h1>我的书架<span class="title-dot">。</span></h1><p class="page-caption">每一本，都有你的阅读痕迹</p></div><button class="primary" id="addBook">'+ArchiveUI.icon('plus')+'添加书籍</button></div><div class="shelf-tools"><label class="search-field">'+ArchiveUI.icon('search')+'<input id="search" type="search" aria-label="搜索我的书架" placeholder="搜索书名、作者、笔记" value="'+escapeHtml(query)+'"><button type="button" id="clearShelfSearch" class="icon-button" aria-label="清空书架搜索">'+ArchiveUI.icon('close')+'</button></label></div><div class="filter-chips" role="group" aria-label="筛选阅读状态">'+chips(['',...STATES],filter,'data-filter')+'</div><div class="sort-row"><span>排序</span><div class="sort-options" role="group" aria-label="书架排序">'+[['updated','最近记录'],['title','书名'],['words','字数'],['status','阅读状态']].map(([value,label])=>'<button data-sort="'+value+'" aria-pressed="'+(sortOrder===value)+'">'+label+'</button>').join('')+'</div></div><div id="list"></div>');
 $('#addBook').onclick=startAdd;$('#search').oninput=e=>{query=e.target.value;list();};$('#clearShelfSearch').onclick=()=>{query='';$('#search').value='';$('#search').focus();list();};
 document.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{filter=el.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.filter===filter));list();});
 document.querySelectorAll('[data-sort]').forEach(el=>el.onclick=()=>{sortOrder=el.dataset.sort;document.querySelectorAll('[data-sort]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.sort===sortOrder));list();});list();
}
function list(){
 const visible=ArchiveUI.sortBooks(books.filter(b=>(!filter||b.status===filter)&&[b.title,b.author,b.overview,...b.entries.map(n=>n.text)].join(' ').toLowerCase().includes(query.trim().toLowerCase())),sortOrder);
 $('#list').innerHTML='<p class="shelf-count" role="status">'+(query.trim()?'找到 ':'共 ')+'<strong>'+visible.length+'</strong> 本书</p>'+visible.map(b=>'<button class="book" data-book="'+escapeHtml(b.id)+'">'+cover(b)+'<span class="book-body"><span class="book-line"><strong>'+ArchiveUI.highlight(b.title,query)+'</strong></span><span class="book-meta"><span>'+ArchiveUI.highlight(b.author||'作者未填',query)+'</span><span class="platform-label">'+escapeHtml(b.platform)+'</span></span><span class="status state-'+ArchiveUI.stateCode(b.status)+'">'+escapeHtml(b.status)+'</span><span class="excerpt">'+ArchiveUI.highlight(ArchiveUI.excerpt(b,query),query)+'</span></span><span class="book-arrow" aria-hidden="true">›</span></button>').join('')+(!visible.length?'<div class="empty">'+ArchiveUI.icon('book')+'<h2>'+(books.length?'没有找到这本书':'故事，从第一本开始')+'</h2><p>'+(books.length?'试试其他关键词，或切换阅读状态。':'找到喜欢的作品，收藏资料，记下自己的感受。')+'</p>'+(!books.length?'<button id="firstBook" class="primary">添加第一本书</button>':'')+'</div>':'');
 $('#clearShelfSearch').hidden=!query;document.querySelectorAll('[data-book]').forEach(el=>el.onclick=()=>detail(el.dataset.book));if($('#firstBook'))$('#firstBook').onclick=startAdd;fixImages();
}

function modal(title,html,onSave){
 const d=document.createElement('dialog');d.innerHTML='<form><div class="page-title"><h2>'+escapeHtml(title)+'</h2><button type="button" class="text-button" data-cancel>取消</button></div>'+html+'<div class="actions"><button class="primary" type="submit">保存</button></div></form>';document.body.append(d);
 d.querySelector('[data-cancel]').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('form').onsubmit=e=>{e.preventDefault();if(onSave(d)!==false)d.close();};d.showModal();return d;
}
function detail(id){
 const b=books.find(b=>b.id===id);if(!b)return shelf();
 shell('<div class="detail-toolbar"><button class="back" id="back">'+ArchiveUI.icon('back')+'书架</button><button class="text-button" id="refreshBook">'+ArchiveUI.icon('refresh')+'刷新资料</button></div>'+bookHeading(b)+'<details class="synopsis"><summary>作品文案</summary><p class="prose">'+escapeHtml(b.summary||'还没有文案，可刷新这本书的资料。')+'</p></details><section class="reading-section"><div class="section-head"><h2>阅读状态</h2><button id="write" class="primary">'+ArchiveUI.icon('pen')+'记一笔</button></div><div class="reading-states" role="group" aria-label="我的阅读状态">'+chips(STATES,b.status,'data-state')+'</div></section><section class="overview"><div class="section-head"><h2>阅读总览 <small class="tag">'+(b.overview?(b.overviewRevision===b.revision?'':'待更新'):'')+'</small></h2><div><button class="text-button" id="editOverview">编辑</button><button class="text-button" id="ai">'+ArchiveUI.icon('spark')+'AI 整理</button></div></div><p class="prose" id="overview">'+escapeHtml(b.overview||'读过的感受，慢慢整理成自己的判断。')+'</p></section><section class="notes-section"><div class="section-head"><h2>阅读笔记 <small>'+b.entries.length+' 条</small></h2></div>'+b.entries.slice().reverse().map(n=>'<article class="note"><div class="section-head"><time>'+date(n.createdAt)+(n.progress?' <span class="note-progress">'+escapeHtml(n.progress)+'</span>':'')+'</time><button class="text-button" data-edit="'+escapeHtml(n.id)+'">编辑</button></div><p class="prose">'+escapeHtml(n.text)+'</p></article>').join('')+(!b.entries.length?'<p class="muted">读到哪里，为什么喜欢或放下，都可以记一笔。</p>':'')+'</section><button class="text-button delete-book" id="deleteBook">删除这本书</button>');
 $('#refreshBook').disabled=!b.sourceId||!ArchiveUI.provider(b);$('#refreshBook').title=b.sourceId?'更新连载状态、字数和文案':'手动录入的书需要先关联原站作品';$('#refreshBook').onclick=()=>refreshBook(b);

 $('#deleteBook').onclick=()=>{
 const dialog=modal('删除书籍','<p>确定删除《'+escapeHtml(b.title)+'》？</p><p class="muted">同时删除这本书的 '+b.entries.length+' 条笔记和阅读总览，其他书不受影响。</p>',()=>{
  if(!change(()=>{books=books.filter(item=>item.id!==b.id);}))return false;
  shelf();toast('已删除书籍');
 });
 const confirmButton=dialog.querySelector('[type="submit"]');confirmButton.textContent='确认删除';confirmButton.classList.add('danger');
 };
 $('#back').onclick=shelf;document.querySelectorAll('[data-state]').forEach(el=>el.onclick=()=>{if(b.status===el.dataset.state)return;if(change(()=>{b.status=el.dataset.state;b.revision++;b.updatedAt=Date.now();}))detail(id);});
 $('#write').onclick=()=>writeNote(b);$('#editOverview').onclick=()=>modal('编辑总览','<textarea name="overview" aria-label="阅读总览" rows="6">'+escapeHtml(b.overview||'')+'</textarea>',d=>{if(!change(()=>{b.overview=d.querySelector('textarea').value.trim();b.overviewRevision=b.revision;}))return false;detail(id);});
 $('#ai').onclick=()=>requestOverview(b);document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>writeNote(b,el.dataset.edit));
}
async function refreshBook(b){
 const button=$('#refreshBook');button.disabled=true;button.textContent='正在刷新…';
 try{const {book}=await api('/api/'+ArchiveUI.provider(b)+'/book/'+encodeURIComponent(b.sourceId));
  const current=books.find(x=>x.id===b.id);if(!current)return;
  if(!change(()=>ArchiveUI.mergeMetadata(current,book)))return;
  if(button.isConnected)detail(current.id);toast('已刷新连载状态、字数和文案');
 }catch(err){toast('刷新失败：'+err.message);}finally{if(button.isConnected){button.disabled=false;button.innerHTML=ArchiveUI.icon('refresh')+'刷新资料';}}
}
function writeNote(b,id){
 const n=b.entries.find(n=>n.id===id);
 modal(n?'编辑笔记':'记一笔','<input name="progress" aria-label="阅读进度" placeholder="读到哪里（可选）" value="'+escapeHtml(n?.progress||'')+'"><textarea name="text" aria-label="笔记内容" placeholder="这次想记住什么？" required rows="7">'+escapeHtml(n?.text||'')+'</textarea>',d=>{
 const text=d.querySelector('[name=text]').value.trim(),progress=d.querySelector('[name=progress]').value.trim();if(!text){toast('先写一点内容');return false;}
 if(!change(()=>{const now=Date.now();if(n){n.text=text;n.progress=progress;n.updatedAt=now;}else b.entries.push({id:crypto.randomUUID(),createdAt:now,updatedAt:now,text,progress});b.revision++;b.updatedAt=now;}))return false;detail(b.id);
 });
}
function extractId(text){
 const t=text.trim();if(platform==='changpei'){if(/^[1-9]\d{0,11}$/.test(t))return t;try{const u=new URL(t);if(!['gongzicp.com','www.gongzicp.com','m.gongzicp.com'].includes(u.hostname))return '';return u.pathname.match(/(?:novel-|\/novel\/index\/id\/)([1-9]\d{0,11})(?:\.html|\/|$)/)?.[1]||(/\/novel\.html$/.test(u.pathname)&&/^[1-9]\d{0,11}$/.test(u.searchParams.get('id')||'')?u.searchParams.get('id'):'');}catch{return '';}}if(platform==='fanqie'){if(/^[1-9]\d{0,19}$/.test(t))return t;try{const u=new URL(t);return u.hostname==='fanqienovel.com'?u.pathname.match(/^\/page\/([1-9]\d{0,19})\/?$/)?.[1]||'':'';}catch{return '';}}if(/^[1-9]\d{0,11}$/.test(t))return t;
 try{const u=new URL(t);if(u.hostname!=='jjwxc.net'&&!u.hostname.endsWith('.jjwxc.net'))return '';const id=u.searchParams.get('novelid')||u.pathname.match(/^\/book2\/(\d+)\/?$/)?.[1];return /^[1-9]\d{0,11}$/.test(id||'')?id:'';}catch{return '';}
}
function extractAuthorId(t){if(platform!=='fanqie')return '';if(/^[1-9]\d{0,19}$/.test(t))return t;try{const u=new URL(t);return u.hostname==='fanqienovel.com'?u.pathname.match(/^\/author-page\/([1-9]\d{0,19})\/?$/)?.[1]||'':'';}catch{return '';}}
async function api(url){const response=await fetch(url,{signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok)throw Error(data.error||'暂时无法读取，请重试。');return data;}
function add(){
 const authorMode=lookup.mode==='author';
 shell('<button class="back" id="back">'+ArchiveUI.icon('back')+'书架</button><div class="page-title"><div><h1>收藏新故事<span class="title-dot">。</span></h1><p class="page-caption">找到作品，留下你的阅读感受</p></div></div><form id="lookup"><label class="field-label">选择平台</label><div class="platform-options" role="group" aria-label="搜索平台">'+[['jinjiang','晋江','原创文学'],['fanqie','番茄','免费小说'],['changpei','长佩','好故事']].map(([value,label,caption])=>'<button type="button" data-platform="'+value+'" aria-pressed="'+(platform===value)+'"><span class="platform-symbol">'+label.slice(0,1)+'</span><span><strong>'+label+'</strong><small>'+caption+'</small></span></button>').join('')+'</div><div class="mode-options" role="group" aria-label="搜索方式"><button type="button" data-mode="book" aria-pressed="'+!authorMode+'">书名 / 链接</button><button type="button" data-mode="author" aria-pressed="'+authorMode+'">作者</button></div><label class="field-label" for="keyword">'+(authorMode?'作者名或作者主页':'书名、作品链接或 ID')+'</label><div class="search-line"><label class="search-field">'+ArchiveUI.icon('search')+'<input id="keyword" aria-label="搜索关键词" required maxlength="200" placeholder="'+(authorMode?'输入作者名':'输入书名或粘贴链接')+'" value="'+escapeHtml(lookup.keyword)+'"><button type="button" id="clearKeyword" class="icon-button" aria-label="清空搜索关键词">'+ArchiveUI.icon('close')+'</button></label><button id="lookupSubmit" class="primary" type="submit">搜索</button></div>'+(!authorMode?'<details class="author-option" '+(lookup.author?'open':'')+'><summary>同名作品？按作者筛选</summary><input id="author" aria-label="作者筛选" placeholder="作者名（可选）" value="'+escapeHtml(lookup.author)+'"></details>':'')+'</form><div id="results" aria-live="polite"></div><button id="screenshotImport" class="import-card">'+ArchiveUI.icon('scan')+'<span><strong>从截图收藏</strong><small>识别书名与作者，确认后加入书架</small></span>'+ArchiveUI.icon('arrow')+'</button><div class="manual-link"><button class="text-button" id="manual">手动录入书籍</button></div>');
 $('#back').onclick=shelf;$('#manual').onclick=manual;$('#screenshotImport').onclick=screenshotImport;
 $('#clearKeyword').hidden=!$('#keyword').value;$('#keyword').oninput=()=>{$('#clearKeyword').hidden=!$('#keyword').value;};$('#keyword').onfocus=()=>{$('#keyword').select();};$('#clearKeyword').onclick=()=>{$('#keyword').value='';lookup.keyword='';$('#clearKeyword').hidden=true;$('#keyword').focus();};
 document.querySelectorAll('[data-platform]').forEach(el=>el.onclick=()=>{platform=el.dataset.platform;lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};add();});
 document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{lookup={keyword:'',author:'',results:null,mode:el.dataset.mode,authors:[],authorPage:1};add();});
 $('#lookup').onsubmit=async e=>{
 e.preventDefault();lookup.keyword=$('#keyword').value.trim();lookup.author=$('#author')?.value.trim()||'';if(!lookup.keyword)return;lookup.returnTo=null;const official=$('#fanqieWeb');if(official)official.href='https://fanqienovel.com/search/'+encodeURIComponent(lookup.keyword);
 if(lookup.mode==='author'){const aid=extractAuthorId(lookup.keyword);if(aid)return inspectAuthor(aid);lookup.authors=[];lookup.authorPage=1;return findAuthors();}
 const id=extractId(lookup.keyword);if(id)return inspectBook(id);
 const target=$('#results'),button=$('#lookupSubmit');button.disabled=true;target.innerHTML='<p class="muted">正在查找…</p>';
 try{const data=await api('/api/'+platform+'/search?'+new URLSearchParams({keyword:lookup.keyword,author:lookup.author}));if(!target.isConnected)return;lookup.results=data.results;lookup.message=data.message||'';renderResults();}
 catch(err){if(target.isConnected)target.innerHTML='<p class="error">'+escapeHtml(err.name==='TimeoutError'?'搜索超时，请重试。':err.message)+'</p>';}
 finally{if(button.isConnected)button.disabled=false;}
 };if(platform==='fanqie')$('#results').insertAdjacentHTML('beforebegin','<p class="muted">官网搜索受限时，可用链接或截图收藏。<a target="_blank" rel="noopener noreferrer" id="fanqieWeb" href="https://fanqienovel.com/search/'+encodeURIComponent(lookup.keyword)+'">打开番茄搜索 ↗</a></p>');if(authorMode){if(lookup.authors?.length)renderAuthors();}else if(lookup.results)renderResults();
}
async function findAuthors(){
 const target=$('#results'),button=$('#lookupSubmit');button.disabled=true;target.innerHTML='<p class="muted">正在查找作者…</p>';
 try{const data=await api('/api/'+platform+'/authors?'+new URLSearchParams({keyword:lookup.keyword,page:lookup.authorPage||1}));if(!target.isConnected)return;
 const seen=new Map((lookup.authors||[]).map(a=>[a.id,a]));data.authors.forEach(a=>seen.set(a.id,a));lookup.authors=[...seen.values()];lookup.hasMore=data.hasMore;renderAuthors();
 }catch(err){if(target.isConnected){target.innerHTML='<p class="error">'+escapeHtml(err.message)+'</p><button id="retryAuthors">重试</button>';$('#retryAuthors').onclick=findAuthors;}}
 finally{if(button.isConnected)button.disabled=false;}
}
function renderAuthors(){
 $('#results').innerHTML=(lookup.authors?.length?'<p class="muted shelf-count">选择作者，查看作品或打开官网主页</p>'+lookup.authors.map(a=>a.externalUrl?'<a class="result" href="'+escapeHtml(safeUrl(a.externalUrl))+'" target="_blank" rel="noopener noreferrer"><strong>'+escapeHtml(a.name)+'</strong><span class="muted">官网主页 ↗</span></a>':'<button class="result" data-author="'+escapeHtml(a.id)+'"><strong>'+escapeHtml(a.name)+'</strong><span class="muted">作品 ›</span></button>').join(''):'<p class="muted">没有找到作者，可尝试输入完整笔名。</p>')+(lookup.hasMore?'<button id="moreAuthors">继续查找作者</button>':'');
 document.querySelectorAll('[data-author]').forEach(el=>el.onclick=()=>inspectAuthor(el.dataset.author));
 if($('#moreAuthors'))$('#moreAuthors').onclick=()=>{lookup.authorPage=(lookup.authorPage||1)+1;findAuthors();};
}
async function inspectAuthor(id){
 shell('<button class="back" id="back">← 作者搜索</button><div id="authorWorks"><p class="muted">正在读取作者作品…</p></div>');$('#back').onclick=add;const target=$('#authorWorks');
 try{const data=await api('/api/'+platform+'/author/'+encodeURIComponent(id)+'/books');if(!target.isConnected)return;
 target.innerHTML='<h1>'+escapeHtml(data.author.name||'作者作品')+'</h1><p class="muted">'+data.results.length+' 本公开作品</p>'+data.results.map(b=>'<button class="result" data-work="'+escapeHtml(b.sourceId)+'"><strong>'+escapeHtml(b.title)+'</strong><span class="muted">查看 ›</span></button>').join('')+(!data.results.length?'<p class="muted">原站当前没有可读取的公开作品。</p>':'')+(data.total>data.results.length?'<p class="muted">原站本页展示 '+data.results.length+' 本，共 '+data.total+' 本。<a target="_blank" rel="noopener" href="https://fanqienovel.com/author-page/'+encodeURIComponent(id)+'">查看完整主页</a></p>':'');
 document.querySelectorAll('[data-work]').forEach(el=>el.onclick=()=>{lookup.returnTo=()=>inspectAuthor(id);inspectBook(el.dataset.work);});
 }catch(err){if(target.isConnected){target.innerHTML='<p class="error">'+escapeHtml(err.message)+'</p><button id="retryWorks">重试</button>';$('#retryWorks').onclick=()=>inspectAuthor(id);}}
}
function renderResults(){
 $('#results').innerHTML=lookup.results.length?'<p class="muted shelf-count">选择作品，查看完整资料</p>'+lookup.results.map(b=>'<button class="result" data-result="'+b.sourceId+'"><span><strong>'+escapeHtml(b.title)+'</strong><span class="muted">'+escapeHtml(b.author||'作者未提供')+'</span></span><span class="muted">查看 ›</span></button>').join(''):'<div class="empty"><p>没有找到匹配作品。</p><p class="muted">可以尝试缩短书名，或粘贴作品链接。</p></div>';
 document.querySelectorAll('[data-result]').forEach(el=>el.onclick=()=>inspectBook(el.dataset.result));
}
async function inspectBook(id){
 shell('<button class="back" id="back">← 搜索结果</button><div id="inspection"><p class="muted">正在读取作品资料…</p></div>');$('#back').onclick=lookup.returnTo||add;const target=$('#inspection');
 try{const {book:b}=await api('/api/'+platform+'/book/'+encodeURIComponent(id));if(!target.isConnected)return;
 const existing=books.find(x=>x.platform===b.platform&&String(x.sourceId)===b.sourceId);
 target.innerHTML=bookHeading(b)+'<div class="import-action"><button class="primary" id="import">'+(existing?'更新书籍资料':'加入书架')+'</button><span class="muted">'+(existing?'保留已有笔记和阅读状态':'资料来自原站作品页')+'</span></div><section class="synopsis"><h2>文案</h2><p class="prose">'+escapeHtml(b.summary||'原页未提供可读取文案')+'</p></section>';
 $('#import').onclick=()=>{let selected=existing;
 if(change(()=>{if(existing){ArchiveUI.mergeMetadata(existing,b);}
 else{selected={...b,id:crypto.randomUUID(),status:'想看',entries:[],overview:'',revision:0,overviewRevision:0,updatedAt:Date.now()};books.unshift(selected);}})){lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};detail(selected.id);toast(existing?'资料已更新，笔记保留':'已加入书架');}};
 if(b.authorId&&['fanqie','changpei'].includes(platform)){const authorButton=document.createElement('button');authorButton.className='text-button';authorButton.textContent='查看作者其他作品';authorButton.onclick=()=>inspectAuthor(b.authorId);target.querySelector('.book-heading>div').append(authorButton);}fixImages();
 }catch(err){if(target.isConnected)target.innerHTML='<p class="error">'+escapeHtml(err.name==='TimeoutError'?'读取超时，请重试。':err.message)+'</p><button id="retry">重试</button>';if($('#retry'))$('#retry').onclick=()=>inspectBook(id);}
}
function manual(){
 modal('手动录入','<input name="title" aria-label="书名" placeholder="书名" required><input name="author" aria-label="作者" placeholder="作者（可选）">',d=>{
 const title=d.querySelector('[name=title]').value.trim();if(!title)return false;
 const b={id:crypto.randomUUID(),title,author:d.querySelector('[name=author]').value.trim(),platform:platformName(),status:'想看',entries:[],overview:'',revision:0,overviewRevision:0,updatedAt:Date.now()};
 const same=books.find(x=>x.title===title&&x.author===b.author&&x.platform===b.platform);
 if(same){detail(same.id);toast('已打开已有记录');return;}
 if(!change(()=>books.unshift(b)))return false;detail(b.id);
 });
}
function settings(){
 shell('<h1>设置</h1><section class="settings-row"><div><h2>本地备份</h2><p class="muted">'+books.length+' 本书，包含资料和阅读记录</p></div><button id="export">导出</button></section><section class="settings-row"><div><h2>AI 总览</h2><p class="muted">DeepSeek · 点击整理时发送本书笔记</p><p id="aiConfigStatus" role="status" class="config-status">正在检查配置…</p></div></section><p class="muted">当前为 Web 开发预览；原版本书架数据未迁移。</p>');
 api('/api/ai/status').then(data=>{const el=$('#aiConfigStatus');if(el){el.textContent=data.configured?'密钥已配置 · 尚未验证有效性':'尚未配置密钥';el.classList.toggle('configured',!!data.configured);}}).catch(()=>{const el=$('#aiConfigStatus');if(el)el.textContent='暂时无法检查配置，请重试';});
 $('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,books},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='reading-archive.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
[['shelfNav','book','书架'],['addNav','plus','添加'],['settingsNav','settings','设置']].forEach(([id,icon,label])=>{$('#'+id).innerHTML=ArchiveUI.icon(icon)+'<span>'+label+'</span>';});
$('#home').onclick=e=>{e.preventDefault();shelf();};$('#shelfNav').onclick=shelf;$('#addNav').onclick=startAdd;$('#settingsNav').onclick=settings;shelf();if(storageBroken)toast('本地数据无法读取，已阻止覆盖。');
