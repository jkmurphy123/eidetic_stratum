import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {requestEdition} from '../scripts/daily-model.mjs';
async function serve(t,handler) {
 const server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 return `http://127.0.0.1:${server.address().port}/v1/chat/completions`;
}
const context={prompt:'Write fiction.',date:'2026-09-25',categories:[{slug:'field-reports',label:'Field Reports'}],recent:[],terms:[],continuity:{version:1,facts:['Alderwick exists.']},version:1};

test('adapter sends bounded prompt to local OpenAI-compatible endpoint and returns content', async t=>{
 const endpoint=await serve(t,async (req,res)=>{
  assert.equal(req.method,'POST');
  assert.equal(req.headers.authorization,'Bearer test-key');
  const buffers=[];for await(const chunk of req) buffers.push(chunk);
  const payload=JSON.parse(Buffer.concat(buffers).toString());
  assert.equal(payload.model,'fixture-model');
  assert.equal(payload.messages[0].role,'system');
  assert.match(payload.messages[1].content,/Alderwick exists/);
  res.setHeader('content-type','application/json');
  res.end(JSON.stringify({choices:[{message:{content:'{"stories":[],"new_terms":[]}'}}]}));
 });
 const output=await requestEdition(context,{endpoint,model:'fixture-model',key:'test-key'});
 assert.equal(output,'{"stories":[],"new_terms":[]}');
});

test('adapter refuses insecure remote URLs, credentials in URL and missing config', async()=>{
 await assert.rejects(requestEdition(context,{endpoint:'http://example.com/v1/chat/completions',model:'x'}),/HTTPS|local/i);
 await assert.rejects(requestEdition(context,{endpoint:'https://user:password@example.com/',model:'x'}),/credential|URL/i);
 await assert.rejects(requestEdition(context,{endpoint:'http://127.0.0.1:1/',model:''}),/model/i);
});

test('adapter errors redact provider body and never echo key',async t=>{
 const endpoint=await serve(t,(_req,res)=>{res.statusCode=503;res.end('test-key secret-provider-message')});
 await assert.rejects(requestEdition(context,{endpoint,model:'fixture-model',key:'test-key'}),e=>{
  assert.match(e.message,/503/);assert.doesNotMatch(e.message,/test-key|secret-provider-message/);return true;
 });
});

test('adapter rejects invalid response shape without returning provider content',async t=>{
 const endpoint=await serve(t,(_req,res)=>res.end(JSON.stringify({choices:[{message:{content:123}}],key:'secret-provider-message'})));
 await assert.rejects(requestEdition(context,{endpoint,model:'fixture-model'}),/response shape/i);
});
