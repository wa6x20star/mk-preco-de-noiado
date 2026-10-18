const m=require('../lib/mk.cjs');
module.exports=m.handler(async(req,res)=>{
 if(req.method!=='GET')throw new m.HttpError(405,'Método não permitido.');
 const c=m.config();
 // Fetch all pages in batches, rather than silently truncating at Supabase's row limit.
 const rows=[];let offset=0;
 while(true){const batch=m.must(await m.upstream(c,`/rest/v1/mk_products?select=*&order=created_at.desc,id.desc&limit=500&offset=${offset}`));if(!Array.isArray(batch))throw new m.HttpError(502,'Catálogo indisponível.');rows.push(...batch);if(batch.length<500)break;offset+=500;if(offset>=10000)throw new m.HttpError(503,'O catálogo precisa de paginação adicional.');}
 const settings=m.must(await m.upstream(c,'/rest/v1/mk_settings?id=eq.1&select=phone'));
 m.json(res,200,{products:rows.map(p=>m.serialize(c,p)),phone:settings?.[0]?.phone||''});
});
