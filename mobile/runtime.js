import {CapacitorHttp,Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
import {App} from '@capacitor/app';
import iconv from 'iconv-lite';
import * as jj from './generated/jinjiang.cjs';
import * as fq from './generated/fanqie.cjs';
import * as cp from './generated/changpei.cjs';
import prompt from './generated/prompt.cjs';
const originalFetch=window.fetch.bind(window);
async function page(url,gb=false){const r=await CapacitorHttp.get({url,responseType:'arraybuffer',connectTimeout:12000,readTimeout:15000,headers:{Accept:'text/html'}});if(r.status!==200)throw Error('原站暂时无法访问，请稍后重试。');const bytes=Buffer.from(r.data,'base64');return iconv.decode(bytes,gb?'gb18030':'utf8');}
async function api(url,options){
 const u=new URL(url,location.origin),parts=u.pathname.split('/').filter(Boolean),provider=parts[1],action=parts[2],id=parts[3],q=u.searchParams;
 if(provider==='ai'){
 const key=(await Preferences.get({key:'deepseek_key'})).value;
 if(action==='status')return {configured:!!key,model:'deepseek-v4-flash'};
 if(!key)throw Error('请先到设置填写 DeepSeek API Key。');
 const book=JSON.parse(options.body);const payload={title:book.title,status:book.status,entries:book.entries.map(n=>({date:new Date(n.createdAt).toISOString(),progress:n.progress||'',text:n.text})).sort((a,b)=>a.date.localeCompare(b.date))};
 const r=await CapacitorHttp.post({url:'https://api.deepseek.com/chat/completions',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},connectTimeout:12000,readTimeout:45000,data:{model:'deepseek-v4-flash',thinking:{type:'disabled'},stream:false,max_tokens:700,temperature:0,messages:[{role:'system',content:prompt},{role:'user',content:JSON.stringify(payload)}]}});
 const choice=r.data?.choices?.[0];if(r.status!==200||choice?.finish_reason!=='stop'||!choice.message?.content)throw Error('AI 未返回完整结果，请检查密钥、余额或网络后重试。');return {overview:choice.message.content};
 }
 if(!['jinjiang','fanqie','changpei'].includes(provider))throw Error('平台未接入');
 if(['book','author'].includes(action)&&!/^[1-9]\d{0,19}$/.test(id||''))throw Error('ID 不正确');
 if(provider==='changpei'){
 const raw=await page(cp.endpoint(action,{id,keyword:q.get('keyword')||'',page:Number(q.get('page')||1)}));
 return action==='book'?{book:cp.parseBook(raw,id)}:action==='author'?cp.parseAuthorBooks(raw,id):action==='authors'?cp.parseAuthors(raw):{results:cp.parseSearch(raw,q.get('author')||'')};
 }
 if(provider==='jinjiang'){
 if(action==='book')return {book:jj.parseBook(await page('https://www.jjwxc.net/onebook.php?novelid='+id,true),id)};
 if(action==='author')return jj.parseAuthorBooks(await page('https://m.jjwxc.net/wapauthor/'+id,true),id);
 const n=Number(q.get('page')||1);const html=await page('https://m.jjwxc.net/search'+(n===1?'':'/index/page/'+n)+'?kw='+jj.encodeKeyword(q.get('keyword')||'')+'&t='+(action==='authors'?2:1),true);
 return action==='authors'?{...jj.parseAuthors(html),page:n}:{results:jj.parseSearch(html,q.get('author')||'')};
 }
 if(action==='book')return {book:fq.parseBook(await page('https://fanqienovel.com/page/'+id),id)};
 if(action==='author'){
 const data=fq.parseAuthorBooks(await page('https://fanqienovel.com/author-page/'+id),id);
 for(let i=0;i<data.results.length;i+=3)await Promise.all(data.results.slice(i,i+3).map(async b=>{if(/[\uE000-\uF8FF]/.test(b.title)){try{b.title=fq.parseBook(await page(b.sourceUrl),b.sourceId).title;}catch{b.title='作品 '+b.sourceId+'（点击读取）';}}}));return data;
 }
 if(['search','authors'].includes(action))return fq.parseSearchResponse(await page(fq.searchUrl(q.get('keyword')||'',Number(q.get('page')||1))),action,q.get('author')||'');
 throw Error('不支持的平台操作。');
}
window.fetch=async(input,options={})=>{
 const url=typeof input==='string'?input:input.url;if(!new URL(url,location.origin).pathname.startsWith('/api/'))return originalFetch(input,options);
 try{if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');const result=await api(url,options);if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});}catch(e){if(e.name==='AbortError')throw e;return new Response(JSON.stringify({error:e.message}),{status:502,headers:{'Content-Type':'application/json'}});}
};
window.Mobile={
 async exportBackup(data){const path='reading-archive-'+Date.now()+'.json';await Filesystem.writeFile({path,data:JSON.stringify(data,null,2),directory:Directory.Cache,encoding:Encoding.UTF8});const file=await Filesystem.getUri({path,directory:Directory.Cache});await Share.share({title:'页间书架备份',url:file.uri});},
 settingsExtras(){
 const main=document.querySelector('#main');const box=document.createElement('section');box.className='settings-row';box.innerHTML='<div><h2>DeepSeek 密钥</h2><p class="muted">仅保存在本机，不写入书架备份</p><p class="config-status" role="status" id="mobileKeyStatus">正在检查…</p></div><button id="mobileKey">配置</button>';main.append(box);
 const updateStatus=async()=>{try{const {value}=await Preferences.get({key:'deepseek_key'});if(!box.isConnected)return;const label=box.querySelector('#mobileKeyStatus');label.textContent=value?'已保存 · 尚未验证有效性':'尚未配置';label.classList.toggle('configured',!!value);box.querySelector('#mobileKey').textContent=value?'更换密钥':'配置密钥';const summary=main.querySelector('#aiConfigStatus');if(summary){summary.textContent=value?'密钥已配置':'尚未配置密钥';summary.classList.toggle('configured',!!value);}}catch{box.querySelector('#mobileKeyStatus').textContent='读取失败，请重试';}};
 updateStatus();
 box.querySelector('button').onclick=()=>{const d=document.createElement('dialog');d.innerHTML='<form><h2>DeepSeek API Key</h2><label class="field-label" for="newApiKey">新密钥</label><input id="newApiKey" type="password" name="key" autocomplete="off" placeholder="粘贴以 sk- 开头的密钥"><p class="muted">保存后会显示配置状态。留空不会清除已有密钥。</p><p class="error" role="alert" hidden></p><div class="actions"><button class="primary" type="submit">保存密钥</button><button type="button" data-cancel>取消</button><button class="text-button delete-book" type="button" data-clear>移除密钥</button></div></form>';document.body.append(d);d.querySelector('[data-cancel]').onclick=()=>d.close();d.onclose=()=>d.remove();
 const save=async value=>{const button=d.querySelector('[type=submit]'),error=d.querySelector('[role=alert]');button.disabled=true;try{await Preferences.set({key:'deepseek_key',value});d.close();await updateStatus();window.toast?.(value?'密钥已保存':'密钥已移除');}catch{error.hidden=false;error.textContent='保存失败，请重试。';}finally{button.disabled=false;}};
 d.querySelector('[data-clear]').onclick=()=>{if(confirm('移除本机保存的 DeepSeek 密钥？'))save('');};
 d.querySelector('form').onsubmit=e=>{e.preventDefault();const value=d.querySelector('input').value.trim();if(!value||!/^sk-[A-Za-z0-9_-]+$/.test(value)){const error=d.querySelector('[role=alert]');error.hidden=false;error.textContent='请粘贴以 sk- 开头的有效格式密钥。';return;}save(value);};d.showModal();};
 const restore=document.createElement('section');restore.className='settings-row';restore.innerHTML='<div><h2>导入备份</h2><p class="muted">合并新书；已有书籍保留手机记录</p></div><input type="file" accept=".json,application/json" aria-label="导入书架备份" style="max-width:155px">';main.append(restore);
 restore.querySelector('input').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10*1024*1024)throw Error('备份超过10MB');const data=JSON.parse(await file.text());if(data.version!==1||!Array.isArray(data.books)||data.books.some(b=>!b.id||typeof b.title!=='string'||!Array.isArray(b.entries)||b.entries.some(n=>typeof n.text!=='string')))throw Error('备份格式不正确');const key='reading_archive_design_preview_v1',current=JSON.parse(localStorage.getItem(key)||'[]');let added=0;for(const b of data.books){if(!current.some(x=>x.id===b.id||(x.platform===b.platform&&(b.sourceId?x.sourceId===b.sourceId:x.title===b.title&&x.author===b.author)))){current.push(b);added++;}}localStorage.setItem(key,JSON.stringify(current));alert('已导入 '+added+' 本新书');location.reload();}catch(err){alert('导入失败：'+err.message);}};
 }
};
if(Capacitor.isNativePlatform())App.addListener('backButton',()=>{const dialog=document.querySelector('dialog[open]');if(dialog)dialog.close();else if(document.querySelector('#back'))document.querySelector('#back').click();else if(document.querySelector('#ocrBack'))document.querySelector('#ocrBack').click();else App.minimizeApp();});
