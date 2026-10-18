const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'public'),{recursive:true});
for(const file of ['index.html','style.css','app.js','admin.html','admin.css','admin.js']){
 fs.copyFileSync(path.join(root,file),path.join(root,'public',file));
}
console.log('MK: six static assets prepared; API functions remain server-side.');
