let screenshotJob=null;
function cancelScreenshotOcr(){
 const job=screenshotJob;if(!job)return;screenshotJob=null;job.cancelled=true;
 clearTimeout(job.timer);if(job.worker)job.worker.terminate().catch(()=>{});
 if(job.url)URL.revokeObjectURL(job.url);
}
function loadOcrLibrary(){
 if(window.Tesseract)return Promise.resolve();
 if(loadOcrLibrary.pending)return loadOcrLibrary.pending;
 loadOcrLibrary.pending=new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.src=new URL('/vendor/ocr/tesseract.min.js',location.href).href;
  s.onload=()=>resolve();s.onerror=()=>{s.remove();loadOcrLibrary.pending=null;reject(Error('识别资源加载失败，请重新打开应用或尝试手动录入。'));};document.head.append(s);
 });return loadOcrLibrary.pending;
}
function screenshotImport(){
 shell('<button class="back" id="ocrBack">← 添加书籍</button><h1>截图导入</h1><p class="muted">选择单本作品详情截图，尽量保留书名、作者、平台标识和作品 ID。图片仅在本机识别。</p><input id="screenshotFile" type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择作品截图"><div id="ocrArea" aria-live="polite"></div>');
 $('#ocrBack').onclick=add;
 $('#screenshotFile').onchange=e=>{const file=e.target.files[0];if(file)recognizeScreenshot(file);};
}
async function recognizeScreenshot(file){
 cancelScreenshotOcr();const area=$('#ocrArea');area.innerHTML='';
 if(!( ['image/png','image/jpeg','image/webp'].includes(file.type)||(!file.type&&/\.(png|jpe?g|webp)$/i.test(file.name)))||file.size>15*1024*1024){area.innerHTML='<p class="error">请选择15MB以内的 PNG、JPG 或 WebP 图片。</p>';return;}
 const job={cancelled:false};screenshotJob=job;
 let worker;
 try{
  const imageUrl=URL.createObjectURL(file),bitmap=new Image();
  try{await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(Error('图片无法读取，请使用 PNG、JPG 或 WebP 截图。'));bitmap.src=imageUrl;});}finally{URL.revokeObjectURL(imageUrl);}
  if(job.cancelled)return;
  if(bitmap.width*bitmap.height>12000000||bitmap.width<200||bitmap.height<200)throw Error('请使用清晰的截图，尺寸需大于200像素且不超过1200万像素。');
  const scale=Math.min(1,2000/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  job.url=URL.createObjectURL(file);
  area.innerHTML='<img class="ocr-preview" alt="待识别截图"><p id="ocrProgress" class="muted">准备识别…</p><button id="cancelOcr" class="text-button">取消识别</button>';
  area.querySelector('img').src=job.url;
  const status=area.querySelector('#ocrProgress');
  $('#cancelOcr').onclick=()=>{cancelScreenshotOcr();area.innerHTML='<p class="muted">已取消，可重新选择截图。</p>';};
  job.timer=setTimeout(()=>{if(!job.cancelled){cancelScreenshotOcr();if(area.isConnected)area.innerHTML='<p class="error">识别超时，请裁去无关区域后重试，或手动输入书名。</p>';}},120000);
  await loadOcrLibrary();if(job.cancelled)return;
  worker=await Tesseract.createWorker(['chi_sim','eng'],1,{workerPath:new URL('/vendor/ocr/worker.min.js',location.href).href,corePath:new URL('/vendor/ocr-core/',location.href).href,langPath:new URL('/vendor/ocr-data/',location.href).href,gzip:window.OCR_ASSET_GZIP!==false,workerBlobURL:true,logger:m=>{
   if(job.cancelled||!status.isConnected)return;status.textContent=m.status==='recognizing text'?'正在识别文字 '+Math.round(m.progress*100)+'%':'正在加载本地识别资源…';
  }});
  job.worker=worker;if(job.cancelled){await worker.terminate();return;}
  await worker.setParameters({tessedit_pageseg_mode:'11'});
  const {data}=await worker.recognize(canvas,{}, {text:true,blocks:true});
  if(job.cancelled||!area.isConnected)return;
  clearTimeout(job.timer);showScreenshotFields(ScreenshotParser.parse(data),area);
 }catch(e){if(!job.cancelled&&area.isConnected){area.innerHTML='<p class="error">'+escapeHtml(e.message||'图片识别失败，请更换截图。')+'</p><button class="text-button" id="ocrManual">改用书名搜索</button>';$('#ocrManual').onclick=add;}}
 finally{if(worker)await worker.terminate().catch(()=>{});if(job.worker===worker)job.worker=null;clearTimeout(job.timer);}
}
function showScreenshotFields(result,area){
 area.innerHTML='<form id="ocrConfirm"><h2>确认识别结果</h2><p class="muted">'+(result.isShelf?'这是一张书架截图，目前只支持单本详情识别。请换图，或手动填写一本书。':result.confidence<65?'图片文字不够清晰，请核对或补填字段。':'请核对后联网读取资料，或确认截图信息后直接录入。')+'</p><label>平台<select name="platform" aria-label="识别平台" required><option value="">无法确定，请选择</option><option value="jjwxc" '+(result.platform==='jjwxc'?'selected':'')+'>晋江文学城</option><option value="fanqie" '+(result.platform==='fanqie'?'selected':'')+'>番茄小说</option><option value="changpei" '+(result.platform==='changpei'?'selected':'')+'>长佩文学</option></select></label><label>书名<input name="title" aria-label="识别书名" value="'+escapeHtml(result.title)+'"></label><label>作者<input name="author" aria-label="识别作者" value="'+escapeHtml(result.author)+'"></label><label>作品 ID<input name="sourceId" aria-label="识别作品 ID" inputmode="numeric" value="'+escapeHtml(result.sourceId)+'"></label><p class="muted">看不清的 ID 请留空。可联网核对，也可按已确认的截图信息录入。</p><label>字数<input name="wordCount" aria-label="识别字数" value="'+escapeHtml(result.wordCount??'')+'" placeholder="如 240170；约数可填 24万"></label><label>连载状态<input name="serialStatus" aria-label="识别连载状态" value="'+escapeHtml(result.serialStatus||'')+'" placeholder="连载 / 完结（可选）"></label><details><summary>查看识别文字</summary><pre class="ocr-text">'+escapeHtml(result.text)+'</pre></details><div class="actions"><button class="primary" type="submit" name="action" value="online">联网核对资料</button><button type="submit" name="action" value="local">按截图信息录入</button></div></form>';
 $('#ocrConfirm').onsubmit=e=>{
  e.preventDefault();const f=e.target,recognizedPlatform=f.elements.platform.value,title=f.elements.title.value.trim(),author=f.elements.author.value.trim(),id=f.elements.sourceId.value.trim();
  if(!['jjwxc','fanqie','changpei'].includes(recognizedPlatform))return toast('请先选择平台。');
  platform=recognizedPlatform==='jjwxc'?'jinjiang':recognizedPlatform;lookup.returnTo=null;
  if(id&&!(platform==='fanqie'?/^[1-9]\d{0,19}$/:/^[1-9]\d{0,11}$/).test(id))return toast('作品 ID 应为数字；不确定时请清空。');
  if(e.submitter?.value==='local'){
   if(!title)return toast('请先填写书名。');
   const wordText=f.elements.wordCount.value.trim(),wordCount=/^\d[\d,，]*$/.test(wordText)?Number(wordText.replace(/[,，]/g,'')):wordText;
   if(typeof wordCount==='number'&&!Number.isSafeInteger(wordCount))return toast('字数过大，请核对。');
   const existing=books.find(b=>b.platform===platformName()&&(id?String(b.sourceId)===id:!b.sourceId&&b.title===title&&b.author===author));
   if(existing){detail(existing.id);toast('已打开已有记录，未覆盖资料或笔记');return;}
   const sourceUrl=id?(platform==='fanqie'?'https://fanqienovel.com/page/'+id:platform==='changpei'?'https://www.gongzicp.com/novel-'+id+'.html':'https://www.jjwxc.net/onebook.php?novelid='+id):'';
   const b={id:crypto.randomUUID(),title,author,platform:platformName(),platformCode:platform,sourceId:id,sourceUrl,wordCount:wordCount||null,serialStatus:f.elements.serialStatus.value.trim(),status:'想看',entries:[],overview:'',revision:0,overviewRevision:0,updatedAt:Date.now()};
   if(change(()=>books.unshift(b))){detail(b.id);toast('已按确认的截图信息加入书架');}return;
  }
  if(id)return inspectBook(id);
  if(!title)return toast('未识别到作品 ID，请填写书名后搜索。');
  lookup={keyword:title,author,results:null,mode:'book',authors:[],authorPage:1};
  add();$('#lookup').requestSubmit();
 };
}
