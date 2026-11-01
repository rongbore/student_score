// Create a private, standalone HTML app without adding roster data to the repository.
const fs=require('node:fs');
const path=require('node:path');
const {mergeStudentRoster}=require('../roster.js');
const {validateState}=require('../data.js');
const [rosterFile,outputFile]=process.argv.slice(2);
if(!rosterFile||!outputFile){console.error('用法：node scripts/build-local.cjs <名单.json> <输出.html>');process.exit(1);}
const root=path.resolve(__dirname,'..');
const output=path.resolve(outputFile);
if(output===root||output.startsWith(root+path.sep))throw new Error('请将包含名单的本地版保存到仓库目录之外。');
const roster=JSON.parse(fs.readFileSync(rosterFile,'utf8'));
validateState(mergeStudentRoster({classes:[{id:1,name:'本地班级',students:[]}],logs:[],selected:1},roster).state);
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(root,'style.css'),'utf8')+'</style>');
for(const name of ['data.js','roster.js','app.js'])html=html.replace(`<script src="${name}"></script>`,()=>'<script>'+(name==='app.js'?'globalThis.CLASSBLOOM_SKIP_PUBLIC_ROSTER=true;\n':'')+fs.readFileSync(path.join(root,name),'utf8')+'</script>');
const data=JSON.stringify(roster).replace(/</g,'\\u003c');
const importId='private-roster-'+require('node:crypto').createHash('sha256').update(JSON.stringify(roster)).digest('hex').slice(0,16);
const bootstrap=`<script>
if(!damagedRaw&&!state.importedRosters?.includes('${importId}')){
  try {
    const result=mergeStudentRoster(state,${data});
    result.state.importedRosters=[...(result.state.importedRosters||[]),'${importId}'];
    const firstName=${JSON.stringify(roster.classes[0].name).replace(/</g,'\\u003c')};
    const first=result.state.classes.find(c=>c.name===firstName||(firstName==='莲花实验班'&&c.name==='莲华实验班'));
    if(first)result.state.selected=first.id;
    persist(result.state);render();
  }catch(error){toast(error.message)}
}
</script>`;
html=html.replace('</body>',()=>bootstrap+'</body>');
fs.writeFileSync(output,html,{mode:0o600});
console.log('本地版已生成。名单仅保存在指定的本地文件中。');
