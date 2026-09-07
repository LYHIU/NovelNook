const KEY='reading_archive_design_preview_v1';
const STATES=['想看','在看','看完','暂搁','弃文','想二刷'];
const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let books=[],filter='',query='',storageBroken=false;
let platform='jinjiang';
const platformName=()=>platform==='fanqie'?'番茄小说':'晋江文学城';
let lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};
try{const raw=localStorage.getItem(KEY);if(raw){books=JSON.parse(raw);if(!Array.isArray(books)||books.some(b=>!b.id||typeof b.title!=='string'||!Array.isArray(b.entries)))throw Error();}}catch{storageBroken=true;}
function persist(){if(storageBroken){toast('本地数据无法读取，已阻止覆盖。');return false;}try{localStorage.setItem(KEY,JSON.stringify(books));return true;}catch{toast('保存失败，请先导出备份。');return false;}}
function change(update){const copy=JSON.stringify(books);update();if(persist())return true;books=JSON.parse(copy);return false;}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4000);}
function date(t){return new Date(t).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'});}
function shell(html){cancelScreenshotOcr();document.querySelector('dialog')?.remove();$('#main').innerHTML=html;window.scrollTo(0,0);fixImages();}
function safeUrl(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function cover(b,large=false){const url=safeUrl(b.coverUrl);return '<span class="cover '+(large?'large':'')+'"><span>'+escapeHtml(b.title.slice(0,12))+'</span>'+(url?'<img src="'+escapeHtml(url)+'" alt="'+escapeHtml(b.title)+'封面" referrerpolicy="no-referrer">':'')+'</span>';}
function fixImages(){document.querySelectorAll('.cover img').forEach(img=>{img.onerror=()=>img.remove();});}
function count(b){return typeof b.wordCount==='number'?b.wordCount.toLocaleString('zh-CN')+' 字':b.wordCount?String(b.wordCount):'字数未提供';}
function sourceLink(b){const u=safeUrl(b.sourceUrl);return u?'<a href="'+escapeHtml(u)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(b.platform||'作品')+'原页 ↗</a>':'';}
function shelf(){
 shell('<div class="page-title"><h1>我的书架</h1><button class="primary" id="addBook">＋ 添加书籍</button></div><div class="shelf-tools"><input id="search" aria-label="搜索我的书架" placeholder="搜索书名、作者或笔记" value="'+escapeHtml(query)+'"><select id="filter" aria-label="筛选阅读状态"><option value="">全部状态</option>'+STATES.map(s=>'<option '+(filter===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div><div id="list"></div>');
 $('#addBook').onclick=add;$('#search').oninput=e=>{query=e.target.value;list();};$('#filter').onchange=e=>{filter=e.target.value;list();};list();
}
function list(){
 const visible=books.filter(b=>(!filter||b.status===filter)&&[b.title,b.author,b.overview,...b.entries.map(n=>n.text)].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>b.updatedAt-a.updatedAt);
 $('#list').innerHTML='<p class="muted shelf-count">'+visible.length+' 本</p>'+visible.map(b=>'<button class="book" data-book="'+escapeHtml(b.id)+'">'+cover(b)+'<span class="book-body"><span class="book-line"><strong>'+escapeHtml(b.title)+'</strong><span class="status">'+escapeHtml(b.status)+'</span></span><span class="muted">'+escapeHtml(b.author||'作者未填')+' · '+escapeHtml(b.platform)+'</span><span class="excerpt">'+escapeHtml(b.overview||b.entries.at(-1)?.text||'还没有阅读记录')+'</span></span></button>').join('')+(!visible.length?'<div class="empty"><p>'+(books.length?'没有匹配的书':'先找到一本书，把资料和阅读感受收在这里。')+'</p>'+(!books.length?'<button id="firstBook">去找书</button>':'')+'</div>':'');
 document.querySelectorAll('[data-book]').forEach(el=>el.onclick=()=>detail(el.dataset.book));if($('#firstBook'))$('#firstBook').onclick=add;fixImages();
}
function modal(title,html,onSave){
 const d=document.createElement('dialog');d.innerHTML='<form><div class="page-title"><h2>'+escapeHtml(title)+'</h2><button type="button" class="text-button" data-cancel>取消</button></div>'+html+'<div class="actions"><button class="primary" type="submit">保存</button></div></form>';document.body.append(d);
 d.querySelector('[data-cancel]').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('form').onsubmit=e=>{e.preventDefault();if(onSave(d)!==false)d.close();};d.showModal();return d;
}
function detail(id){
 const b=books.find(b=>b.id===id);if(!b)return shelf();
 shell('<div class="detail-toolbar"><button class="back" id="back">← 书架</button><button class="text-button delete-book" id="deleteBook">删除书籍</button></div><div class="book-heading">'+cover(b,true)+'<div><h1>'+escapeHtml(b.title)+'</h1><p>'+escapeHtml(b.author||'作者未填')+'</p><p class="muted">'+escapeHtml(b.platform)+' · '+escapeHtml(b.serialStatus||'连载状态未提供')+'</p><p class="muted">'+escapeHtml(count(b))+'</p>'+sourceLink(b)+'</div></div><details class="synopsis"><summary>作品文案</summary><p class="prose">'+escapeHtml(b.summary||'还没有文案，可重新搜索这本书导入资料。')+'</p></details><div class="reading-bar"><label for="state">我的阅读状态</label><select id="state">'+STATES.map(s=>'<option '+(b.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select><button id="write" class="primary">＋ 记一笔</button></div><section class="overview"><div class="section-head"><h2>阅读总览 <small class="tag">'+(b.overview?(b.overviewRevision===b.revision?'':'待更新'):'')+'</small></h2><div><button class="text-button" id="editOverview">编辑</button><button class="text-button" id="ai">AI 整理</button></div></div><p class="prose" id="overview">'+escapeHtml(b.overview||'暂未整理总览')+'</p></section><section><div class="section-head"><h2>笔记 <small>'+b.entries.length+'</small></h2></div>'+b.entries.slice().reverse().map(n=>'<article class="note"><div class="section-head"><time>'+date(n.createdAt)+(n.progress?' · '+escapeHtml(n.progress):'')+'</time><button class="text-button" data-edit="'+escapeHtml(n.id)+'">编辑</button></div><p class="prose">'+escapeHtml(n.text)+'</p></article>').join('')+(!b.entries.length?'<p class="muted">读到哪里，为什么喜欢或放下，都可以记一笔。</p>':'')+'</section>');
 $('#deleteBook').onclick=()=>{
 const dialog=modal('删除书籍','<p>确定删除《'+escapeHtml(b.title)+'》？</p><p class="muted">同时删除这本书的 '+b.entries.length+' 条笔记和阅读总览，其他书不受影响。</p>',()=>{
  if(!change(()=>{books=books.filter(item=>item.id!==b.id);}))return false;
  shelf();toast('已删除书籍');
 });
 const confirmButton=dialog.querySelector('[type="submit"]');confirmButton.textContent='确认删除';confirmButton.classList.add('danger');
 };
 $('#back').onclick=shelf;$('#state').onchange=e=>{const status=e.target.value;if(change(()=>{b.status=status;b.revision++;b.updatedAt=Date.now();}))detail(id);};
 $('#write').onclick=()=>writeNote(b);$('#editOverview').onclick=()=>modal('编辑总览','<textarea name="overview" aria-label="阅读总览" rows="6">'+escapeHtml(b.overview||'')+'</textarea>',d=>{if(!change(()=>{b.overview=d.querySelector('textarea').value.trim();b.overviewRevision=b.revision;}))return false;detail(id);});
 $('#ai').onclick=()=>requestOverview(b);document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=()=>writeNote(b,el.dataset.edit));
}
function writeNote(b,id){
 const n=b.entries.find(n=>n.id===id);
 modal(n?'编辑笔记':'记一笔','<input name="progress" aria-label="阅读进度" placeholder="读到哪里（可选）" value="'+escapeHtml(n?.progress||'')+'"><textarea name="text" aria-label="笔记内容" placeholder="这次想记住什么？" required rows="7">'+escapeHtml(n?.text||'')+'</textarea>',d=>{
 const text=d.querySelector('[name=text]').value.trim(),progress=d.querySelector('[name=progress]').value.trim();if(!text){toast('先写一点内容');return false;}
 if(!change(()=>{const now=Date.now();if(n){n.text=text;n.progress=progress;n.updatedAt=now;}else b.entries.push({id:crypto.randomUUID(),createdAt:now,updatedAt:now,text,progress});b.revision++;b.updatedAt=now;}))return false;detail(b.id);
 });
}
function extractId(text){
 const t=text.trim();if(platform==='fanqie'){if(/^[1-9]\d{0,19}$/.test(t))return t;try{const u=new URL(t);return u.hostname==='fanqienovel.com'?u.pathname.match(/^\/page\/([1-9]\d{0,19})\/?$/)?.[1]||'':'';}catch{return '';}}if(/^[1-9]\d{0,11}$/.test(t))return t;
 try{const u=new URL(t);if(u.hostname!=='jjwxc.net'&&!u.hostname.endsWith('.jjwxc.net'))return '';const id=u.searchParams.get('novelid')||u.pathname.match(/^\/book2\/(\d+)\/?$/)?.[1];return /^[1-9]\d{0,11}$/.test(id||'')?id:'';}catch{return '';}
}
function extractAuthorId(t){if(platform!=='fanqie')return '';if(/^[1-9]\d{0,19}$/.test(t))return t;try{const u=new URL(t);return u.hostname==='fanqienovel.com'?u.pathname.match(/^\/author-page\/([1-9]\d{0,19})\/?$/)?.[1]||'':'';}catch{return '';}}
async function api(url){const response=await fetch(url,{signal:AbortSignal.timeout(60000)});const data=await response.json();if(!response.ok)throw Error(data.error||'暂时无法读取，请重试。');return data;}
function add(){
 const authorMode=lookup.mode==='author';
 shell('<button class="back" id="back">← 书架</button><div class="page-title"><h1>添加书籍</h1><button id="screenshotImport" class="text-button">截图导入</button></div><form id="lookup"><div class="search-line"><select id="platformSelect" aria-label="搜索平台"><option value="jinjiang" '+(platform==='jinjiang'?'selected':'')+'>晋江</option><option value="fanqie" '+(platform==='fanqie'?'selected':'')+'>番茄</option></select><select id="searchMode" aria-label="搜索方式"><option value="book" '+(!authorMode?'selected':'')+'>书名</option><option value="author" '+(authorMode?'selected':'')+'>作者</option></select><input id="keyword" aria-label="搜索关键词" required maxlength="200" placeholder="'+(authorMode?'输入作者名':'书名、作品链接或 ID')+'" value="'+escapeHtml(lookup.keyword)+'"><button class="primary">搜索</button></div>'+(!authorMode?'<details class="author-option" '+(lookup.author?'open':'')+'><summary>按作者缩小范围</summary><input id="author" aria-label="作者筛选" placeholder="作者名（可选）" value="'+escapeHtml(lookup.author)+'"></details>':'')+'</form><div id="results" aria-live="polite"></div><div class="manual-link"><button class="text-button" id="manual">没有找到？手动录入</button></div>');
 $('#back').onclick=shelf;$('#manual').onclick=manual;$('#screenshotImport').onclick=screenshotImport;
 $('#platformSelect').onchange=e=>{platform=e.target.value;lookup={keyword:'',author:'',results:null,mode:'book',authors:[],authorPage:1};add();};
 $('#searchMode').onchange=e=>{lookup.mode=e.target.value;lookup.keyword='';lookup.results=null;lookup.authors=[];lookup.hasMore=false;lookup.returnTo=null;add();};
 $('#lookup').onsubmit=async e=>{
 e.preventDefault();lookup.keyword=$('#keyword').value.trim();lookup.author=$('#author')?.value.trim()||'';if(!lookup.keyword)return;lookup.returnTo=null;
 if(lookup.mode==='author'){const aid=extractAuthorId(lookup.keyword);if(aid)return inspectAuthor(aid);lookup.authors=[];lookup.authorPage=1;return findAuthors();}
 const id=extractId(lookup.keyword);if(id)return inspectBook(id);
 const target=$('#results'),button=$('#lookup button');button.disabled=true;target.innerHTML='<p class="muted">正在查找…</p>';
 try{const data=await api('/api/'+platform+'/search?'+new URLSearchParams({keyword:lookup.keyword,author:lookup.author}));if(!target.isConnected)return;lookup.results=data.results;renderResults();}
 catch(err){if(target.isConnected)target.innerHTML='<p class="error">'+escapeHtml(err.name==='TimeoutError'?'搜索超时，请重试。':err.message)+'</p>';}
 finally{if(button.isConnected)button.disabled=false;}
 };if(platform==='fanqie')$('#results').insertAdjacentHTML('beforebegin','<p class="muted">可粘贴作品或作者主页链接。<a target="_blank" rel="noopener noreferrer" href="https://fanqienovel.com/search/'+encodeURIComponent(lookup.keyword)+'">打开番茄搜索 ↗</a></p>');if(authorMode){if(lookup.authors?.length)renderAuthors();}else if(lookup.results)renderResults();
}
async function findAuthors(){
 const target=$('#results'),button=$('#lookup button');button.disabled=true;target.innerHTML='<p class="muted">正在查找作者…</p>';
 try{const data=await api('/api/'+platform+'/authors?'+new URLSearchParams({keyword:lookup.keyword,page:lookup.authorPage||1}));if(!target.isConnected)return;
 const seen=new Map((lookup.authors||[]).map(a=>[a.id,a]));data.authors.forEach(a=>seen.set(a.id,a));lookup.authors=[...seen.values()];lookup.hasMore=data.hasMore;renderAuthors();
 }catch(err){if(target.isConnected){target.innerHTML='<p class="error">'+escapeHtml(err.message)+'</p><button id="retryAuthors">重试</button>';$('#retryAuthors').onclick=findAuthors;}}
 finally{if(button.isConnected)button.disabled=false;}
}
function renderAuthors(){
 $('#results').innerHTML=(lookup.authors?.length?'<p class="muted shelf-count">选择作者，查看其公开作品</p>'+lookup.authors.map(a=>'<button class="result" data-author="'+escapeHtml(a.id)+'"><strong>'+escapeHtml(a.name)+'</strong><span class="muted">作品 ›</span></button>').join(''):'<p class="muted">没有找到作者，可尝试输入完整笔名。</p>')+(lookup.hasMore?'<button id="moreAuthors">继续查找作者</button>':'');
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
 target.innerHTML='<div class="book-heading">'+cover(b,true)+'<div><h1>'+escapeHtml(b.title)+'</h1><p>'+escapeHtml(b.author||'作者未提供')+'</p><p class="muted">'+escapeHtml(b.serialStatus||'连载状态未提供')+' · '+escapeHtml(count(b))+'</p><p class="muted">'+escapeHtml(b.genre||'')+'</p>'+sourceLink(b)+'</div></div><div class="import-action"><button class="primary" id="import">'+(existing?'更新书籍资料':'加入书架')+'</button><span class="muted">'+(existing?'保留已有笔记和阅读状态':'资料来自原站作品页')+'</span></div><section class="synopsis"><h2>文案</h2><p class="prose">'+escapeHtml(b.summary||'原页未提供可读取文案')+'</p></section>';
 $('#import').onclick=()=>{let selected=existing;
 if(change(()=>{if(existing){for(const key of ['title','author','sourceUrl','summary','wordCount','serialStatus','genre','coverUrl','fetchedAt'])if(b[key]!==''&&b[key]!=null)existing[key]=b[key];}
 else{selected={...b,id:crypto.randomUUID(),status:'想看',entries:[],overview:'',revision:0,overviewRevision:0,updatedAt:Date.now()};books.unshift(selected);}})){detail(selected.id);toast(existing?'资料已更新，笔记保留':'已加入书架');}};
 if(b.authorId&&platform==='fanqie'){const authorButton=document.createElement('button');authorButton.className='text-button';authorButton.textContent='查看作者其他作品';authorButton.onclick=()=>inspectAuthor(b.authorId);target.querySelector('.book-heading>div').append(authorButton);}fixImages();
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
 shell('<h1>设置</h1><section class="settings-row"><div><h2>本地备份</h2><p class="muted">'+books.length+' 本书，包含资料和阅读记录</p></div><button id="export">导出</button></section><section class="settings-row"><div><h2>AI 总览</h2><p class="muted">DeepSeek V4 Flash · 点击整理时发送本书笔记</p></div></section><p class="muted">当前为 Web 开发预览；原版本书架数据未迁移。</p>');
 $('#export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,books},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='reading-archive.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
}
$('#home').onclick=e=>{e.preventDefault();shelf();};$('#shelfNav').onclick=shelf;$('#addNav').onclick=add;$('#settingsNav').onclick=settings;shelf();if(storageBroken)toast('本地数据无法读取，已阻止覆盖。');
