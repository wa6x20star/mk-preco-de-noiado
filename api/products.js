const m=require('../lib/mk.cjs');
module.exports=m.handler(async(req,res)=>{
 if(!['POST','PATCH','DELETE'].includes(req.method))throw new m.HttpError(405,'Método não permitido.');
 m.origin(req);const c=m.config();const {token}=await m.authorize(req,res,c);const input=await m.body(req);
 let existing;
 if(req.method!=='POST'){
  if(!m.uuid(input.id))throw new m.HttpError(400,'Produto inválido.');
  const rows=m.must(await m.upstream(c,`/rest/v1/mk_products?id=eq.${input.id}&select=*`,{token}));existing=rows?.[0];if(!existing)throw new m.HttpError(404,'Produto não encontrado.');
 }
 if(req.method==='DELETE'){
  m.must(await m.upstream(c,`/rest/v1/mk_products?id=eq.${input.id}`,{method:'DELETE',token}));
  await m.removePhoto(c,token,existing.photo_path);return m.json(res,200,{ok:true});
 }
 const record=m.productInput(input);let newPath;
 if(req.method==='POST'&&!input.photo)throw new m.HttpError(400,'Adicione a foto do produto.');
 try{
  if(input.photo){newPath=await m.upload(c,token,input.photo);record.photo_path=newPath}
  const path=req.method==='POST'?'/rest/v1/mk_products':`/rest/v1/mk_products?id=eq.${input.id}`;
  const rows=m.must(await m.upstream(c,path,{method:req.method,token,data:record,headers:{Prefer:'return=representation'}}));
  if(!rows?.[0])throw new m.HttpError(403,'Não foi possível salvar o produto.');
  if(newPath&&existing)await m.removePhoto(c,token,existing.photo_path);
  m.json(res,req.method==='POST'?201:200,{product:m.serialize(c,rows[0])});
 }catch(e){if(newPath)await m.removePhoto(c,token,newPath);throw e}
});
