// Netlify adapter: reuse the reviewed MK handlers and their authorization rules.
// Only this function is deployed by Netlify; api/ and lib/ are bundled dependencies.
import session from '../../api/session.js';
import catalog from '../../api/catalog.js';
import products from '../../api/products.js';
import settings from '../../api/settings.js';

const routes=new Map([
 ['/api/session',session],
 ['/api/catalog',catalog],
 ['/api/products',products],
 ['/api/settings',settings],
]);
const maxBody=3*1024*1024;

function errorResponse(status,error){
 return Response.json({error,code:'REQUEST_FAILED'},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

async function readBody(request){
 if(Number(request.headers.get('content-length'))>maxBody){
  const error=Error('A foto é muito grande.');error.status=413;throw error;
 }
 if(!request.body)return '';
 const reader=request.body.getReader(),chunks=[];let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>maxBody){await reader.cancel();const error=Error('A foto é muito grande.');error.status=413;throw error;}
   chunks.push(Buffer.from(value));
  }
 }finally{reader.releaseLock()}
 return Buffer.concat(chunks).toString('utf8');
}

export default async function mkApi(request){
 const url=new URL(request.url),handler=routes.get(url.pathname);
 if(!handler)return errorResponse(404,'Rota não encontrada.');
 try{
  const headers=Object.fromEntries(request.headers.entries());
  // The external request URL is authoritative for same-origin validation.
  // Do not trust a caller-supplied Host or X-Forwarded-Host header.
  headers.host=url.host;
  const req={method:request.method,headers,body:await readBody(request)};
  const responseHeaders=new Map();let output='',ended=false;
  const res={
   statusCode:200,
   setHeader(name,value){responseHeaders.set(name.toLowerCase(),value)},
   end(body=''){output=String(body);ended=true},
  };
  await handler(req,res);
  if(!ended)return errorResponse(500,'Não foi possível concluir a operação.');
  const outgoing=new Headers();
  for(const [name,value] of responseHeaders){
   // Preserve separate Set-Cookie headers for the access AND refresh cookie.
   if(Array.isArray(value))for(const entry of value)outgoing.append(name,String(entry));
   else outgoing.set(name,String(value));
  }
  return new Response(request.method==='HEAD'?null:output,{status:res.statusCode,headers:outgoing});
 }catch(error){
  if(!error.status)console.error('MK Netlify adapter failure',error.name);
  return errorResponse(error.status||500,error.status?error.message:'Não foi possível concluir a operação.');
 }
}

// Native Netlify paths keep the storefront URLs unchanged, including cookie scope.
export const config={path:['/api/session','/api/catalog','/api/products','/api/settings']};
