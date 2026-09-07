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
  const s=document.createElement('script');s.src='/vendor/ocr/tesseract.min.js';
  s.onload=()=>resolve();s.onerror=()=>{s.remove();loadOcrLibrary.pending=null;reject(Error('OCR 引擎加载失败，请检查本地服务后重试。'));};document.head.append(s);
 });return loadOcrLibrary.pending;
}
function screenshotImport(){
 shell('<button class="back" id="ocrBack">← 添加书籍</button><h1>截图导入</h1><p class="muted">选择单本作品详情截图，尽量保留书名、作者、平台标识和作品 ID。图片仅在本机识别。</p><input id="screenshotFile" type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择作品截图"><div id="ocrArea" aria-live="polite"></div>');
 $('#ocrBack').onclick=add;
 $('#screenshotFile').onchange=e=>{const file=e.target.files[0];if(file)recognizeScreenshot(file);};
}
async function recognizeScreenshot(file){
 cancelScreenshotOcr();const area=$('#ocrArea');area.innerHTML='';
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){area.innerHTML='<p class="error">请选择15MB以内的 PNG、JPG 或 WebP 图片。</p>';return;}
 const job={cancelled:false};screenshotJob=job;
 let worker;
 try{
  const bitmap=await createImageBitmap(file);
  if(job.cancelled){bitmap.close();return;}
  if(bitmap.width*bitmap.height>12000000||bitmap.width<200||bitmap.height<200){bitmap.close();throw Error('请使用清晰的截图，尺寸需大于200像素且不超过1200万像素。');}
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
  job.url=URL.createObjectURL(file);
  area.innerHTML='<img class="ocr-preview" alt="待识别截图"><p id="ocrProgress" class="muted">准备识别…</p><button id="cancelOcr" class="text-button">取消识别</button>';
  area.querySelector('img').src=job.url;
  const status=area.querySelector('#ocrProgress');
  $('#cancelOcr').onclick=()=>{cancelScreenshotOcr();area.innerHTML='<p class="muted">已取消，可重新选择截图。</p>';};
  job.timer=setTimeout(()=>{if(!job.cancelled){cancelScreenshotOcr();if(area.isConnected)area.innerHTML='<p class="error">识别超时，请裁去无关区域后重试，或手动输入书名。</p>';}},90000);
  await loadOcrLibrary();if(job.cancelled)return;
  worker=await Tesseract.createWorker(['chi_sim','eng'],1,{workerPath:'/vendor/ocr/worker.min.js',corePath:'/vendor/ocr-core',langPath:'/vendor/ocr-data',workerBlobURL:false,logger:m=>{
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
 area.innerHTML='<form id="ocrConfirm"><h2>确认识别结果</h2><p class="muted">'+(result.isShelf?'这是一张书架截图，目前只支持单本详情识别。请换图，或手动填写一本书。':result.confidence<65?'图片文字不够清晰，请核对或补填字段。':'请核对后继续，书籍资料将从原站读取。')+'</p><label>平台<select name="platform" aria-label="识别平台" required><option value="">无法确定，请选择</option><option value="jjwxc" '+(result.platform==='jjwxc'?'selected':'')+'>晋江文学城</option><option value="fanqie" '+(result.platform==='fanqie'?'selected':'')+'>番茄小说</option><option value="other">其他平台（暂未接入）</option></select></label><label>书名<input name="title" aria-label="识别书名" value="'+escapeHtml(result.title)+'"></label><label>作者<input name="author" aria-label="识别作者" value="'+escapeHtml(result.author)+'"></label><label>作品 ID<input name="sourceId" aria-label="识别作品 ID" inputmode="numeric" value="'+escapeHtml(result.sourceId)+'"></label><p class="muted">看不清的 ID 请留空，按书名搜索。不会直接根据截图加入书架。</p><details><summary>查看识别文字</summary><pre class="ocr-text">'+escapeHtml(result.text)+'</pre></details><div class="actions"><button class="primary">确认，读取书籍资料</button></div></form>';
 $('#ocrConfirm').onsubmit=e=>{
  e.preventDefault();const f=e.target,recognizedPlatform=f.elements.platform.value,title=f.elements.title.value.trim(),author=f.elements.author.value.trim(),id=f.elements.sourceId.value.trim();
  if(!['jjwxc','fanqie'].includes(recognizedPlatform))return toast('请选择晋江或番茄。');
  platform=recognizedPlatform==='fanqie'?'fanqie':'jinjiang';lookup.returnTo=null;
  if(id&&!(platform==='fanqie'?/^[1-9]\d{0,19}$/:/^[1-9]\d{0,11}$/).test(id))return toast('作品 ID 应为数字；不确定时请清空。');
  if(id)return inspectBook(id);
  if(!title)return toast('未识别到作品 ID，请填写书名后搜索。');
  lookup={keyword:title,author,results:null,mode:'book',authors:[],authorPage:1};
  add();$('#lookup').requestSubmit();
 };
}
