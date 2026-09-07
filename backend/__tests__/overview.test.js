const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createRouter}=require('../overview');
const sample={title:'测试书',status:'在看',entries:[{createdAt:2,text:'重新读后喜欢冲突',progress:'20章'},{createdAt:1,text:'曾因节奏慢弃文'}]};
async function fixture(t,post){const app=express();app.use('/api/ai',createRouter({getKey:()=> 'test-key',post}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));return 'http://127.0.0.1:'+server.address().port+'/api/ai';}
test('只发送允许的本书字段，按记录日期排序，正确配置模型',async t=>{
 let sent;const base=await fixture(t,async(url,body,opts)=>{sent={url,body,opts};return {data:{choices:[{finish_reason:'stop',message:{content:'重新阅读后更喜欢冲突。'}}]}};});
 const res=await fetch(base+'/overview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sample,key:'不要发送',overview:'旧总览',otherBook:'另一本书'})});
 assert.equal(res.status,200);assert.equal((await res.json()).overview,'重新阅读后更喜欢冲突。');
 assert.equal(sent.body.model,'deepseek-v4-flash');assert.equal(sent.body.thinking.type,'disabled');assert.equal(sent.opts.timeout,45000);
 const payload=JSON.parse(sent.body.messages[1].content);assert.deepEqual(Object.keys(payload),['title','status','entries']);assert.equal(payload.entries[0].text,'曾因节奏慢弃文');
});
test('跨站、无笔记和格式错误均不调用提供商',async t=>{
 let calls=0;const base=await fixture(t,async()=>{calls++;});
 let res=await fetch(base+'/overview',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:JSON.stringify(sample)});assert.equal(res.status,403);
 res=await fetch(base+'/overview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sample,entries:[]})});assert.equal(res.status,400);
 res=await fetch(base+'/overview',{method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'});assert.equal(res.status,400);assert.equal(calls,0);
});
test('上游超时与截断响应不当作总览返回，错误不透出密钥',async t=>{
 let attempt=0;const base=await fixture(t,async()=>{if(!attempt++){const e=Error('private test-key');e.code='ETIMEDOUT';throw e;}return {data:{choices:[{finish_reason:'length',message:{content:'未完成'}}]}};});
 const request=()=>fetch(base+'/overview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sample)});
 let res=await request();assert.equal(res.status,504);assert.ok(!(await res.text()).includes('test-key'));
 res=await request();assert.equal(res.status,502);assert.ok(!(await res.json()).overview);
});
