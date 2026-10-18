// One-time upgrade of the original public storefront to a read-only catalog.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace(/<button class="manage" id="manageBtn"[\s\S]*?<\/button>/,'');
html=html.replace(/<button class="text-button" id="settingsBtn">[\s\S]*?<\/button>/,'<a class="text-button" href="/admin">Área da MK ↗</a>');
html=html.replace(/<dialog id="manageDialog">[\s\S]*?<\/dialog>\s*/,'').replace(/<dialog id="settingsDialog">[\s\S]*?<\/dialog>\s*/,'');
html=html.replace('<div class="demo-note">','<div class="demo-note" id="catalogStatus" role="status">');
html=html.replace('CONCEITO INDEPENDENTE • VERSÃO DE DEMONSTRAÇÃO','MK • PREÇO DE NOIADO');
fs.writeFileSync(path.join(root,'index.html'),html);
let js=fs.readFileSync(path.join(root,'app.js'),'utf8');
js=js.replace("let products=read('mk-products-v1',initial)","let products=initial.map(p=>({...p}))");
js=js.replace('const money=n=>',"let catalogLive=false,storePhone='';\nconst money=n=>");
js=js.replace(/function safePhoto\(s\)\{[^\n]+/,`function safePhoto(s){try{const u=new URL(s);if(u.protocol==='https:'&&(u.hostname==='images.unsplash.com'||u.hostname.endsWith('.supabase.co')&&u.pathname.startsWith('/storage/v1/object/public/mk-products/')))return escape(u.href)}catch{}return images.headphone}`);
js=js.split('\n').filter(line=>!['function save(','function renderManager(','$(\'#manageList\')','async function photoData(','$(\'#productForm\')','$(\'#settingsForm\')'].some(prefix=>line.startsWith(prefix))).join('\n');
js=js.replace(/;\$\('#manageBtn'\)[^\n]+/,';');
js=js.replace("const phone=String(read('mk-phone-v1','')).replace(/\\D/g,'')","const phone=storePhone");
js=js.replace('Vitrine demonstrativa. Confirme disponibilidade e condições com a vendedora.','Confirme disponibilidade e condições com a MK antes de comprar.');
js=js.replace(" — foto ilustrativa ou cadastrada",'');
js=js.replace(/;render\(\);if\(location.hash.startsWith\('#produto='\)\)\{[^\n]+/,';render();loadCatalog();');
js+=`\nasync function loadCatalog(){
 try{
  const res=await fetch('/api/catalog',{cache:'no-store'});let data;try{data=await res.json()}catch{throw Error('O catálogo está temporariamente indisponível.')}
  if(!res.ok){if(data.code==='CONFIG_REQUIRED'){document.querySelector('#catalogStatus').textContent='Vitrine de demonstração — itens e preços ilustrativos. Catálogo real em preparação.';return}throw Error(data.error||'Catálogo indisponível.')}
  if(!Array.isArray(data.products))throw Error('Catálogo indisponível.');
  products=data.products;catalogLive=true;storePhone=String(data.phone||'');document.querySelector('#catalogStatus').textContent='Produtos cadastrados pela MK. Consulte a disponibilidade.';render();
 }catch(e){products=[];render();document.querySelector('#catalogStatus').textContent='Não foi possível carregar os produtos. Recarregue a página para tentar novamente.'}
 finally{if(location.hash.startsWith('#produto=')){try{detail(decodeURIComponent(location.hash.slice(9)))}catch{}}}
}\n`;
fs.writeFileSync(path.join(root,'app.js'),js);
console.log('Public demo writes removed. Catalog API connected.');
