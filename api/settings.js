const m=require('../lib/mk.cjs');
module.exports=m.handler(async(req,res)=>{
 if(req.method!=='PATCH')throw new m.HttpError(405,'Método não permitido.');
 m.origin(req);const c=m.config();const {token}=await m.authorize(req,res,c);const input=await m.body(req);
 if(typeof input.phone!=='string'||input.phone!==''&&!/^55\d{10,11}$/.test(input.phone))throw new m.HttpError(400,'Informe 55 + DDD + número.');
 const rows=m.must(await m.upstream(c,'/rest/v1/mk_settings?id=eq.1',{method:'PATCH',token,data:{phone:input.phone},headers:{Prefer:'return=representation'}}));
 if(!rows?.[0])throw new m.HttpError(403,'Não foi possível salvar o contato.');
 m.json(res,200,{ok:true});
});
