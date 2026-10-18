const m=require('../lib/mk.cjs');
module.exports=m.handler(async(req,res)=>{
 const c=m.config();
 if(req.method==='GET'){const {user}=await m.authorize(req,res,c);return m.json(res,200,{user:{email:user.email}})}
 if(!['POST','DELETE'].includes(req.method))throw new m.HttpError(405,'Método não permitido.');
 m.origin(req);
 if(req.method==='DELETE'){
  const token=m.cookies(req)['__Secure-mk-access'];
  if(token){try{await m.upstream(c,'/auth/v1/logout?scope=local',{method:'POST',token})}catch{}}
  m.clearCookies(res);return m.json(res,200,{ok:true});
 }
 const input=await m.body(req);
 if(typeof input.email!=='string'||input.email.length>254||typeof input.password!=='string'||input.password.length<1||input.password.length>256)throw new m.HttpError(400,'Informe e-mail e senha.');
 const r=await m.upstream(c,'/auth/v1/token?grant_type=password',{method:'POST',data:{email:input.email.trim(),password:input.password}});
 if(!r.ok){m.clearCookies(res);throw new m.HttpError(r.status===429?429:401,r.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Não foi possível entrar. Confira suas credenciais.')}
 if(r.data.user?.id!==c.admin){m.clearCookies(res);await m.upstream(c,'/auth/v1/logout?scope=local',{method:'POST',token:r.data.access_token});throw new m.HttpError(403,'Esta conta não tem acesso à área da MK.')}
 const allowed=m.must(await m.upstream(c,`/rest/v1/mk_admins?user_id=eq.${c.admin}&select=user_id`,{token:r.data.access_token}));
 if(!Array.isArray(allowed)||allowed.length!==1){m.clearCookies(res);throw new m.HttpError(403,'Acesso administrativo não autorizado.')}
 m.sessionCookies(res,r.data);m.json(res,200,{user:{email:r.data.user.email}});
});
