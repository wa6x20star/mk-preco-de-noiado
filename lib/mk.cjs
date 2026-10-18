'use strict';
const {randomUUID}=require('node:crypto');
const MAX_BODY=3*1024*1024;
class HttpError extends Error{constructor(status,message,code){super(message);this.status=status;this.code=code}}
function config(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY,admin=process.env.MK_ADMIN_USER_ID;
 if(!url||!key||!admin||!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)||!uuid(admin))throw new HttpError(503,'A área interna ainda está sendo configurada.','CONFIG_REQUIRED');
 if(key.startsWith('sb_secret_'))throw new HttpError(503,'Chave de configuração inválida.','CONFIG_REQUIRED');
 try{if(key.startsWith('eyJ')&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role!=='anon')throw new Error()}catch{throw new HttpError(503,'Use uma chave pública do projeto.','CONFIG_REQUIRED')}
 return {url:url.replace(/\/$/,''),key,admin};
}
function uuid(id){return typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data))}
function origin(req){
 let expected;try{expected=new URL('https://'+req.headers.host).origin}catch{throw new HttpError(403,'Origem inválida.')}
 if(req.headers.origin!==expected||req.headers['sec-fetch-site']==='cross-site')throw new HttpError(403,'Ação permitida apenas no site da MK.');
 if(!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw new HttpError(415,'Envie os dados em JSON.');
}
async function body(req){
 if(Number(req.headers['content-length'])>MAX_BODY)throw new HttpError(413,'A foto é muito grande.');
 let raw=req.body;
 if(raw===undefined){let length=0;const chunks=[];for await(const chunk of req){length+=Buffer.byteLength(chunk);if(length>MAX_BODY)throw new HttpError(413,'A foto é muito grande.');chunks.push(Buffer.from(chunk))}raw=Buffer.concat(chunks).toString('utf8')}
 if(typeof raw==='object'&&!Buffer.isBuffer(raw)){if(Buffer.byteLength(JSON.stringify(raw))>MAX_BODY)throw new HttpError(413,'A foto é muito grande.');return raw}
 try{const text=Buffer.isBuffer(raw)?raw.toString('utf8'):raw;if(Buffer.byteLength(text||'')>MAX_BODY)throw new HttpError(413,'A foto é muito grande.');return JSON.parse(text||'{}')}catch(e){if(e.status)throw e;throw new HttpError(400,'Dados inválidos.')}
}
async function upstream(c,path,{token,method='GET',data,bytes,headers={}}={}){
 const h={apikey:c.key,...headers};if(token)h.Authorization='Bearer '+token;
 if(data!==undefined)h['Content-Type']='application/json';
 let r;try{r=await fetch(c.url+path,{method,headers:h,body:bytes??(data===undefined?undefined:JSON.stringify(data)),signal:AbortSignal.timeout(15000)})}catch{throw new HttpError(502,'Não foi possível acessar o catálogo. Tente novamente.')}
 let result;try{result=await r.json()}catch{result=null}
 return {ok:r.ok,status:r.status,data:result};
}
function must(r,message='Não foi possível concluir a operação.'){if(!r.ok)throw new HttpError(r.status===401?401:r.status===403?403:502,message);return r.data}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(s=>{const i=s.indexOf('=');return i<0?[]:[s.slice(0,i).trim(),s.slice(i+1)]}).filter(a=>a.length===2))}
function sessionCookies(res,data){
 if(!data?.access_token||!data?.refresh_token||!Number.isFinite(data.expires_in))throw new HttpError(502,'Resposta de sessão inválida.');
 const flags='; Path=/api; HttpOnly; Secure; SameSite=Strict';
 res.setHeader('Set-Cookie',[`__Secure-mk-access=${encodeURIComponent(data.access_token)}; Max-Age=${Math.min(data.expires_in,3600)}${flags}`,`__Secure-mk-refresh=${encodeURIComponent(data.refresh_token)}; Max-Age=604800${flags}`]);
}
function clearCookies(res){res.setHeader('Set-Cookie',['__Secure-mk-access','__Secure-mk-refresh'].map(name=>`${name}=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Strict`))}
async function authorize(req,res,c){
 const jar=cookies(req);let token=jar['__Secure-mk-access'];
 let verified=token?await upstream(c,'/auth/v1/user',{token}):null;
 if((!verified||verified.status===401||verified.status===403)&&jar['__Secure-mk-refresh']){
  // Do not rotate refresh cookies on cross-site requests.
  if(req.headers['sec-fetch-site']==='cross-site'){clearCookies(res);throw new HttpError(401,'Entre novamente na área interna.')}
  const refreshed=await upstream(c,'/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:jar['__Secure-mk-refresh']}});
  if(refreshed.ok){token=refreshed.data.access_token;sessionCookies(res,refreshed.data);verified=await upstream(c,'/auth/v1/user',{token})}
 }
 if(!verified?.ok){if(verified&&verified.status>=500)throw new HttpError(502,'Não foi possível validar a sessão.');clearCookies(res);throw new HttpError(401,'Entre na área interna para continuar.')}
 if(verified.data.id!==c.admin){clearCookies(res);throw new HttpError(403,'Esta conta não tem acesso à área da MK.')}
 // The allowlist is also checked in the database on every operation, so removing access takes effect immediately.
 const allowed=must(await upstream(c,`/rest/v1/mk_admins?user_id=eq.${c.admin}&select=user_id`,{token}));
 if(!Array.isArray(allowed)||allowed.length!==1){clearCookies(res);throw new HttpError(403,'Acesso administrativo não autorizado.')}
 return {token,user:verified.data};
}
function serialize(c,p){return {id:p.id,name:p.name,price:Number(p.price),category:p.category,condition:p.condition,description:p.description,unique:p.unique_item,sold:p.sold,photo:c.url+'/storage/v1/object/public/mk-products/'+p.photo_path,created_at:p.created_at}}
function productInput(input){
 const name=typeof input.name==='string'?input.name.trim():'';
 if(!name||name.length>80||typeof input.price!=='number'||!Number.isFinite(input.price)||input.price<=0||input.price>999999||Math.abs(input.price*100-Math.round(input.price*100))>.000001)throw new HttpError(400,'Informe nome e preço válidos (até duas casas decimais).');
 if(!['Eletrônicos','Moda','Casa'].includes(input.category)||!['Novo','Seminovo','Usado'].includes(input.condition))throw new HttpError(400,'Categoria ou condição inválida.');
 if(typeof input.description!=='string'||input.description.length>500||typeof input.sold!=='boolean'||typeof input.unique!=='boolean')throw new HttpError(400,'Confira descrição e status.');
 return {name,price:input.price,category:input.category,condition:input.condition,description:input.description.trim(),sold:input.sold,unique_item:input.unique};
}
function imageBytes(photo){
 if(typeof photo!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(photo))throw new HttpError(400,'Envie uma foto em formato JPEG.');
 const bytes=Buffer.from(photo.slice(photo.indexOf(',')+1),'base64');
 if(bytes.length>2*1024*1024)throw new HttpError(413,'A foto deve ter até 2 MB.');
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw new HttpError(400,'Arquivo de imagem inválido.');
 return bytes;
}
async function upload(c,token,photo){const bytes=imageBytes(photo);const path=c.admin+'/'+randomUUID()+'.jpg';must(await upstream(c,'/storage/v1/object/mk-products/'+path,{method:'POST',token,bytes,headers:{'Content-Type':'image/jpeg','x-upsert':'false'}}),'Não foi possível enviar a foto.');return path}
async function removePhoto(c,token,path){if(!path?.startsWith(c.admin+'/'))return;try{const r=await upstream(c,'/storage/v1/object/mk-products',{method:'DELETE',token,data:{prefixes:[path]}});if(!r.ok)console.error('MK photo cleanup failed',r.status)}catch{console.error('MK photo cleanup unavailable')}}
function handler(fn){return async(req,res)=>{try{await fn(req,res)}catch(e){if(!e.status)console.error('MK request failed',e.name);json(res,e.status||500,{error:e.status?e.message:'Não foi possível concluir a operação.',code:e.code||'REQUEST_FAILED'})}}}
module.exports={HttpError,config,uuid,json,origin,body,upstream,must,cookies,sessionCookies,clearCookies,authorize,serialize,productInput,imageBytes,upload,removePhoto,handler};
