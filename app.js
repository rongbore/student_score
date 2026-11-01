const KEY = 'classbloom-v1';
const requiredClasses = ['莲华实验班','滨州实验1班','滨州实验2班','滨州一中班'];
const initial = {classes:requiredClasses.map((name,i)=>({id:i+1,name,students:[]})),logs:[],courses:{},selected:1,requestedClassesAdded:true};
const {validateState,applyPoints,undoPoints,readBackup} = ClassBloomData;
let state=structuredClone(initial), damagedRaw=null, storageIssue='';
try {
  const raw=localStorage.getItem(KEY);
  if(raw) {
    try { state=validateState(JSON.parse(raw)); }
    catch(error) { damagedRaw=raw;storageIssue='已保存的数据无法读取，原数据未被覆盖。请先下载原始数据，或恢复完整备份。'; }
  }
} catch { storageIssue='浏览器暂时无法访问本地存储。请允许网站保存数据，或使用备份功能。'; }
const legacyText={"Oliver Chen": "陈子轩", "Emma Wilson": "林可欣", "Noah Williams": "张宇航", "Sophia Lee": "李诗涵", "Liam Johnson": "刘浩然", "Ava Thompson": "周语桐", "Ethan Davis": "王奕辰", "Isabella Wang": "赵欣然", "Curious explorer": "好奇心小探险家", "Kindness champion": "友善小天使", "Creative thinker": "创意小达人", "Little ray of sunshine": "班级小太阳", "Brave little learner": "勇敢学习小先锋", "Brilliant bookworm": "阅读小能手", "Teamwork superstar": "合作小明星", "Big dreamer": "梦想小种子", "Class 3A · Sunflowers": "三年级一班 · 向日葵班", "Class 3B · Daisies": "三年级二班 · 小雏菊班", "Class 4A · Explorers": "四年级一班 · 探索班", "Ready to shine": "准备好闪闪发光", "Great effort": "表现很棒", "Learning moment": "成长提醒"};
for(const c of state.classes) {
  c.name=legacyText[c.name]||c.name;
  for(const s of c.students){s.name=legacyText[s.name]||s.name;s.title=legacyText[s.title]||s.title;}
}
for(const l of state.logs){l.name=legacyText[l.name]||l.name;l.reason=legacyText[l.reason]||l.reason;}
if(!state.classes.some(c=>c.name==='莲华实验班')) {
  const old=state.classes.find(c=>c.name==='莲花实验班');if(old)old.name='莲华实验班';
}
if(!state.requestedClassesAdded) {
  for(const name of requiredClasses)if(!state.classes.some(c=>c.name===name))state.classes.push({id:Math.max(0,...state.classes.map(c=>c.id))+1,name,students:[]});
  state.requestedClassesAdded=true;
}
let view='classroom',filter='all',selectedLesson=1,modalAction=null;
const selectedStudents=new Set();
const curriculum=Array.from({length:12},(_,i)=>({id:i+1,title:i===0?'编程环境入门':i===11?'认识 while 循环':'课程标题待导入'}));
const $=selector=>document.querySelector(selector);
const current=()=>state.classes.find(c=>c.id===state.selected)||state.classes[0];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed=value=>`${value>0?'＋':''}${value}`;
const nextId=items=>Math.max(Date.now(),...items.map(x=>x.id+1));
function toast(message) {
  $('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4000);
}
function persist(next,{recover=false}={}) {
  if(damagedRaw&&!recover)throw new Error('请先恢复完整备份或处理原始数据，再修改课堂。');
  const clean=validateState(next);
  try { localStorage.setItem(KEY,JSON.stringify(clean)); }
  catch { throw new Error('保存失败，未修改数据。请检查浏览器存储空间或导出备份。'); }
  state=clean;damagedRaw=null;storageIssue='';
}
function save(){persist(state);}
function mutate(action,message) {
  const next=structuredClone(state);action(next);persist(next);render();if(message)toast(message);
}
function run(action){try{action();}catch(error){render();toast(error.message);}}
function visibleStudents() {
  const query=$('#search').value.trim().toLocaleLowerCase('zh-CN');
  return current().students.filter(s=>[s.name,s.account||'',s.grade||''].some(v=>v.toLocaleLowerCase('zh-CN').includes(query))&&(filter!=='stars'||s.points>=140)).sort((a,b)=>{
    if($('#sort').value==='points')return b.points-a.points||a.id-b.id;
    if($('#sort').value==='lowest')return a.points-b.points||a.id-b.id;
    if($('#sort').value==='name')return a.name.localeCompare(b.name,'zh-CN');
    return a.id-b.id;
  });
}
function render() {
  const c=current();
  for(const id of selectedStudents)if(!c.students.some(s=>s.id===id))selectedStudents.delete(id);
  $('#class-select').innerHTML=state.classes.map(x=>`<option value="${x.id}" ${x.id===c.id?'selected':''}>${esc(x.name)}</option>`).join('');
  $('.nav b').textContent=state.classes.length;
  $('#stat-students').innerHTML=`${c.students.length} <small>人</small>`;
  $('#stat-total').innerHTML=`${c.students.reduce((n,s)=>n+s.points,0).toLocaleString('zh-CN')} <small>分</small>`;
  $('#stat-after').innerHTML=`${c.students.reduce((n,s)=>n+s.after,0).toLocaleString('zh-CN')} <small>分</small>`;
  $('#count').textContent=c.students.length;
  document.querySelectorAll('.nav').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  const titles={classroom:['班级小明星 ✦','每个人都有闪光点，汇成我们的精彩班级。'],leaderboard:['成长小明星 · 积分排名 ♕','每一份努力都算数，每一步成长都值得庆祝。'],activity:['点滴进步 · 积分记录 ◷','记录每一次鼓励，也记录每一次成长提醒。'],courses:['编程成长之旅 · 12 次课程 ▤','从编程环境入门，到认识 while 循环。']};
  $('#section-title').textContent=titles[view][0];$('#section-subtitle').textContent=titles[view][1];
  $('#student-grid').hidden=view!=='classroom';$('#student-grid').style.display=view==='classroom'?'grid':'none';
  $('#ranking').hidden=view!=='leaderboard';$('#activity').hidden=view!=='activity';$('#courses').hidden=view!=='courses';
  $('.toolbar').hidden=view!=='classroom';$('.toolbar').style.display=view==='classroom'?'flex':'none';
  $('#bulk-bar').hidden=view!=='classroom'||!c.students.length;
  const ranked=[...c.students].sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'zh-CN'));
  const rankOf=s=>1+ranked.filter(x=>x.points>s.points).length;
  $('#student-grid').innerHTML=visibleStudents().map(s=>{
    const rank=rankOf(s);
    return `<article class="student-card ${selectedStudents.has(s.id)?'is-selected':''}"><label class="student-select"><input type="checkbox" data-select="${s.id}" aria-label="选择 ${esc(s.name)}" ${selectedStudents.has(s.id)?'checked':''}></label><button class="card-menu" data-edit="${s.id}" aria-label="编辑学生 ${esc(s.name)}">•••</button>${rank<=3&&s.points>0?`<span class="rank-badge">${['🥇','🥈','🥉'][rank-1]} 第${rank}名</span>`:''}<div class="card-top"><div class="student-avatar" style="background:${esc(s.color)}">${esc(s.emoji)}</div><h3>${esc(s.name)}</h3><div class="descriptor">${esc(s.title)}</div><div class="student-meta"><span>${s.grade?esc(s.grade):'年级待补充'}</span>${s.account?`<span class="student-account">${esc(s.account)}</span>`:''}</div><div class="score">${s.points}<span>当前总积分</span></div><div class="after-score">课后积分 <b>${signed(s.after)}</b></div></div><div class="card-actions"><button class="minus" data-score="${s.id}" data-delta="-1">− 扣分</button><button class="plus" data-score="${s.id}" data-delta="1">＋ 加分</button></div></article>`;
  }).join('')||`<div class="empty">🌱 ${c.students.length?'没有找到匹配的学生，试试其他姓名、账号或年级。':'班级还没有学生，点击「添加学生」或「导入学员」开始吧。'}</div>`;
  $('#ranking').innerHTML=ranked.map(s=>{const rank=rankOf(s);return `<div class="rank-row"><span>${rank<=3&&s.points>0?['🥇','🥈','🥉'][rank-1]:'第'+rank+'名'}</span><div class="student-avatar" style="background:${esc(s.color)}">${esc(s.emoji)}</div><span>${esc(s.name)}<small class="ranking-account">${esc(s.grade)} ${esc(s.account)}</small></span><b>${s.points} 分</b></div>`;}).join('')||'<div class="empty">添加学生后，就能查看班级积分排名啦。</div>';
  $('#activity').innerHTML=cLogs().map(l=>`<div class="log-row ${l.delta<0?'negative':''} ${l.undone?'undone':''}"><span>${l.delta>0?'✦':'−'}</span><div class="log-info">${esc(l.name)}<br><small>${esc(l.reason)} · ${l.type==='after'?'课后积分':'课堂积分'}</small><small>${new Date(l.time).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})}</small></div><strong>${signed(l.delta)}</strong>${l.undone?'<span class="undo-status">已撤销</span>':l.operationId?`<button class="undo-button" data-undo="${esc(l.operationId)}">撤销${state.logs.filter(x=>x.operationId===l.operationId).length>1?'本批次':''}</button>`:'<span class="undo-status">历史记录</span>'}</div>`).join('')||'<div class="empty">✨ 每一次加减分都会记录在这里。新操作可在这里撤销。</div>';
  if(view==='courses')renderCourses();
  renderSelection();renderStorageWarning();
}
function cLogs(){return state.logs.filter(l=>l.classId===current().id).slice().reverse();}
function renderSelection() {
  const visible=visibleStudents();const selectedVisible=visible.filter(s=>selectedStudents.has(s.id)).length;
  $('#selection-count').textContent=`已选 ${selectedStudents.size} 人`;
  $('#select-all').checked=!!visible.length&&selectedVisible===visible.length;
  $('#select-all').indeterminate=selectedVisible>0&&selectedVisible<visible.length;
  $('#select-all').disabled=!visible.length;
  $('#bulk-reward').disabled=$('#bulk-deduct').disabled=!selectedStudents.size;
  $('#clear-selection').disabled=!selectedStudents.size;
}
function renderStorageWarning() {
  const warning=$('#storage-warning');warning.hidden=!storageIssue;
  warning.innerHTML=storageIssue?`<span>${esc(storageIssue)}</span>${damagedRaw?'<button id="download-damaged">下载原始数据</button><button id="reset-damaged">重新开始</button>':''}`:'';
  if(damagedRaw){$('#download-damaged').onclick=()=>download('星光课堂-原始数据.txt',damagedRaw,'text/plain');$('#reset-damaged').onclick=()=>openModal('重新开始前，请保留原始数据','<p class="modal-description">这会用空班级替换无法读取的数据。建议先下载原始数据，以便后续找回。</p>',()=>{download('星光课堂-原始数据.txt',damagedRaw,'text/plain');persist(initial,{recover:true});render();toast('已建立空白课堂，原始数据已下载。');},'下载原数据并重新开始');}
}
function openModal(title,fields,action,submitLabel='保存 ✦') {
  $('#modal-title').textContent=title;$('#modal-fields').innerHTML=fields;modalAction=action;
  $('#modal-error').hidden=true;$('.submit').textContent=submitLabel;$('#modal').showModal();
}
$('#close-modal').onclick=()=>$('#modal').close();
$('#modal').onclick=e=>{if(e.target===$('#modal'))$('#modal').close();};
$('#modal-form').onsubmit=e=>{
  e.preventDefault();
  try{modalAction(new FormData(e.target));$('#modal').close();}
  catch(error){$('#modal-error').textContent=error.message;$('#modal-error').hidden=false;}
};
function studentInfoFields(s={}) {
  return `<label>年级（如 7.10）<input name="grade" maxlength="20" value="${esc(s.grade)}" placeholder="未提供可留空"></label><label>学习账号<input name="account" maxlength="80" value="${esc(s.account)}" autocomplete="off"></label><label>联系手机号<input name="phone" type="tel" maxlength="30" value="${esc(s.phone)}" autocomplete="off" placeholder="未提供可留空"></label>`;
}
function readStudentInfo(form,exceptId) {
  const info={name:form.get('name').trim(),grade:form.get('grade').trim(),account:form.get('account').trim(),phone:form.get('phone').trim()};
  if(!info.name)throw new Error('请填写学生姓名，不能只输入空格。');
  if(info.account&&state.classes.some(c=>c.students.some(s=>!(c.id===current().id&&s.id===exceptId)&&s.account?.toLowerCase()===info.account.toLowerCase())))throw new Error('这个学习账号已被使用，请核对后保存。');
  if(info.phone&&!/^\+?[\d\s()-]{6,30}$/.test(info.phone))throw new Error('请填写有效的联系手机号，或留空。');
  return info;
}
$('#add-student').onclick=()=>openModal('欢迎新同学 ✨',`<label>学生姓名<input name="name" required maxlength="40" placeholder="例如：张小雨"></label>${studentInfoFields()}<label>选择头像<select name="emoji">${['👧🏻','👦🏻','👧🏼','👦🏽','👧🏽','👦🏾','🧑‍🎓','👧🏾'].map(x=>`<option>${x}</option>`).join('')}</select></label>`,f=>{
  const info=readStudentInfo(f);mutate(next=>next.classes.find(c=>c.id===current().id).students.push({id:nextId(next.classes.flatMap(c=>c.students)),...info,emoji:f.get('emoji'),title:'准备好闪闪发光',color:'#eaf0df',points:0,after:0}),'新同学加入班级啦！🌱');
});
function checkClassName(value,exceptId) {
  const name=value.trim();if(!name)throw new Error('请填写班级名称。');
  if(state.classes.some(c=>c.id!==exceptId&&c.name===name))throw new Error('已经有同名班级，请使用其他名称。');return name;
}
$('#new-class').onclick=()=>openModal('创建一个新班级 🌻','<label>班级名称<input name="name" required maxlength="45" placeholder="例如：五年级一班 · 阳光班"></label>',f=>{
  const name=checkClassName(f.get('name'));mutate(next=>{const id=nextId(next.classes);next.classes.push({id,name,students:[],lessonProgress:{}});next.selected=id;},'新班级创建成功！');selectedStudents.clear();render();
});
$('#rename-class').onclick=()=>openModal('修改班级名称',`<label>班级名称<input name="name" required maxlength="45" value="${esc(current().name)}"></label>`,f=>{const name=checkClassName(f.get('name'),current().id);mutate(next=>{next.classes.find(c=>c.id===current().id).name=name;},'班级名称已更新');});
function openScore(studentIds,sign) {
  const names=current().students.filter(s=>studentIds.includes(s.id)).map(s=>s.name);
  if(!names.length)return;
  openModal(sign>0?'为进步加分 ✦':'成长小提醒 🌱',`<p class="modal-description">${names.length>1?`已选择 ${names.length} 名学生，每人将获得相同的积分变动。`:esc(names[0])}</p><label>每人积分数量<input name="points" type="number" min="1" max="1000" step="1" value="1" required></label><label>积分类别<select name="type"><option value="class">课堂积分</option><option value="after">课后积分</option></select></label><label>加减分原因<input name="reason" maxlength="100" placeholder="${sign>0?'例如：课堂积极发言':'例如：需要更专心一些'}"></label>`,f=>{
    const amount=sign*Number(f.get('points'));const operationId=crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
    mutate(next=>applyPoints(next,current().id,studentIds,amount,f.get('type'),f.get('reason'),operationId),`已为 ${names.length} 人${sign>0?'加':'扣'} ${Math.abs(amount)} 分`);
  },sign>0?'确认加分 ✦':'确认扣分');
}
$('#student-grid').onchange=e=>{
  if(!e.target.matches('[data-select]'))return;
  const id=Number(e.target.dataset.select);if(e.target.checked)selectedStudents.add(id);else selectedStudents.delete(id);
  e.target.closest('.student-card').classList.toggle('is-selected',e.target.checked);renderSelection();
};
$('#student-grid').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.score)openScore([Number(b.dataset.score)],Number(b.dataset.delta));
  if(b.dataset.edit){
    const s=current().students.find(s=>s.id===Number(b.dataset.edit));
    openModal('编辑学生信息',`<label>学生姓名<input name="name" required maxlength="40" value="${esc(s.name)}"></label>${studentInfoFields(s)}<label>学生闪光点<input name="title" maxlength="45" value="${esc(s.title)}"></label>`,f=>{
      const info=readStudentInfo(f,s.id);mutate(next=>Object.assign(next.classes.find(c=>c.id===current().id).students.find(x=>x.id===s.id),info,{title:f.get('title').trim()}),'学生信息已更新');
    });
  }
};
$('#select-all').onchange=e=>{for(const s of visibleStudents()){if(e.target.checked)selectedStudents.add(s.id);else selectedStudents.delete(s.id);}render();};
$('#clear-selection').onclick=()=>{selectedStudents.clear();render();};
$('#bulk-reward').onclick=()=>openScore([...selectedStudents],1);
$('#bulk-deduct').onclick=()=>openScore([...selectedStudents],-1);
$('#activity').onclick=e=>{
  const b=e.target.closest('[data-undo]');if(!b)return;
  const operationId=b.dataset.undo;const logs=state.logs.filter(l=>l.operationId===operationId&&!l.undone);
  openModal('撤销这次积分操作？',`<p class="modal-description">将恢复 ${logs.length} 名学生在这次操作中变动的积分。原记录会保留并标注「已撤销」，其他积分操作不受影响。</p>`,()=>mutate(next=>undoPoints(next,operationId),'积分操作已撤销'),'确认撤销');
};
$('#class-select').onchange=e=>run(()=>{const id=Number(e.target.value);mutate(next=>{next.selected=id;});selectedStudents.clear();render();});
$('#search').oninput=()=>{selectedStudents.clear();render();};$('#sort').onchange=render;
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;selectedStudents.clear();document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));render();});
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{view=b.dataset.view;document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));$('#crumb').textContent=b.querySelector('span').textContent;render();});
$('#help').onclick=()=>openModal('欢迎来到星光课堂 🌱','<p class="modal-description">添加学生或导入名单后，即可记录课堂、课后积分。课后积分已包含在总积分中；140 分以上的学生会出现在「积分小明星」。<br><br>勾选学生可批量加减分，新操作可在「积分记录」中撤销。同分学生并列排名。<br><br>「编程课程」可填写教师整理的课程内容，并分别记录各班已授课程。<br><br>数据保存在当前浏览器中。使用右上角「备份」下载完整数据，在另一台设备用「恢复」导入。</p>',()=>{},'知道啦');
function download(name,content,type='application/json') {
  const url=URL.createObjectURL(new Blob([content],{type:`${type};charset=utf-8`}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function backup() {download(`星光课堂-完整备份-${new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}.json`,JSON.stringify({format:'classbloom-backup-v1',exportedAt:new Date().toISOString(),state},null,2));}
$('#export-backup').onclick=()=>{backup();toast('完整备份已下载，请妥善保存。');};
$('#restore-backup').onclick=()=>$('#backup-file').click();
$('#backup-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try {
    const restored=readBackup(JSON.parse(await file.text()));
    const count=restored.classes.reduce((n,c)=>n+c.students.length,0);
    openModal('恢复完整备份',`<p class="modal-description">备份包含 <strong>${restored.classes.length} 个班级、${count} 名学生、${restored.logs.length} 条积分记录</strong>。<br><br>确认后将替换当前数据。系统会先下载当前数据的备份，课程内容和各班授课进度也会一并恢复。</p>`,()=>{
      if(damagedRaw)download('星光课堂-原始数据.txt',damagedRaw,'text/plain');else backup();persist(restored,{recover:true});selectedStudents.clear();$('#search').value='';render();toast('备份已恢复，原数据已下载备份。');
    },'备份当前数据并恢复');
  }catch(error){toast(error instanceof SyntaxError?'备份文件不是有效的 JSON，当前数据未变动。':error.message);}
  finally{e.target.value='';}
};
$('#import-roster').onclick=()=>$('#roster-file').click();
$('#roster-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{const result=mergeStudentRoster(state,JSON.parse(await file.text()));persist(result.state);render();toast(`导入成功：新增 ${result.added} 人，更新 ${result.updated} 人`);}
  catch(error){toast(error instanceof SyntaxError?'名单文件不是有效的 JSON，未导入任何数据。':error.message);}
  finally{e.target.value='';}
};
function courseData(id){return {...curriculum.find(l=>l.id===id),...state.courses?.[id]};}
const courseSections=[['📖','知识点总结','summary','梳理本课核心概念与学习重点。'],['✏️','随堂练习','practice','在课堂中动手实践，巩固所学知识。'],['🏡','课后练习','homework','课后独立练习，让知识更扎实。']];
function renderCourses() {
  const lesson=courseData(selectedLesson);const edited=Object.values(state.courses||{}).filter(l=>l.summary||l.practice||l.homework).length;
  $('#courses').innerHTML=`<div class="course-notice"><span>🌱</span><div><strong>${edited?`已整理 ${edited} / 12 次课程`:'课程内容待导入'}</strong><p>原课程网站内容尚未导入。你可以先填写教师整理的知识点和练习，内容自动保存在本地。</p></div><a href="https://www.xinyoudui.com/courses/3430/all/#/pages/23717" target="_blank" rel="noopener noreferrer">打开原课程 ↗</a></div><div class="course-layout"><nav class="lesson-list" aria-label="课程目录">${curriculum.map(l=>{const data=courseData(l.id);return `<button class="lesson-item ${l.id===selectedLesson?'selected':''}" data-lesson="${l.id}" aria-pressed="${l.id===selectedLesson}"><span class="lesson-number">${String(l.id).padStart(2,'0')}</span><span>${esc(data.title)}<small>${current().lessonProgress?.[l.id]?'✓ 本班已授课':data.summary||data.practice||data.homework?'教师已整理':'内容待补充'}</small></span><span class="lesson-arrow">›</span></button>`;}).join('')}</nav><article class="lesson-detail"><div class="lesson-header"><span class="lesson-kicker">第 ${String(lesson.id).padStart(2,'0')} 课 · 编程启蒙</span><h3>${esc(lesson.title)}</h3><p>适用班级：${esc(current().name)}</p><div class="lesson-actions"><label><input type="checkbox" id="lesson-taught" ${current().lessonProgress?.[lesson.id]?'checked':''}> 本班已授课</label><button class="secondary" id="edit-lesson">✎ 编辑本课内容</button></div></div><div class="lesson-sections">${courseSections.map(([icon,title,key,hint])=>`<section class="lesson-block"><div class="lesson-block-heading"><span>${icon}</span><div><h4>${title}</h4><p>${hint}</p></div><span class="pending-badge">${lesson[key]?'教师整理':'待补充'}</span></div><div class="lesson-pending ${lesson[key]?'has-content':''}">${lesson[key]?esc(lesson[key]):'尚未填写内容。点击「编辑本课内容」添加教师整理的知识点或练习。'}</div></section>`).join('')}</div><div class="lesson-pagination"><button data-lesson="${lesson.id-1}" ${lesson.id===1?'disabled':''}>← 上一课</button><span>${lesson.id} / 12</span><button data-lesson="${lesson.id+1}" ${lesson.id===12?'disabled':''}>下一课 →</button></div></article></div>`;
}
$('#courses').onclick=e=>{
  const b=e.target.closest('[data-lesson]');if(b&&!b.disabled){const id=Number(b.dataset.lesson);if(id>=1&&id<=12){selectedLesson=id;renderCourses();}}
  if(e.target.closest('#edit-lesson')){
    const l=courseData(selectedLesson);
    openModal('整理第 '+selectedLesson+' 课',`<p class="modal-description">课程内容供所有班级使用，授课进度按班级分别保存。</p><label>课程标题<input name="title" required maxlength="80" value="${esc(l.title)}"></label>${courseSections.map(([,title,key])=>`<label>${title}<textarea name="${key}" rows="5" maxlength="20000" placeholder="支持分行输入和代码示例">${esc(l[key])}</textarea></label>`).join('')}`,f=>{
      if(!f.get('title').trim())throw new Error('请填写课程标题。');
      mutate(next=>{next.courses??={};next.courses[selectedLesson]=Object.fromEntries(['title','summary','practice','homework'].map(key=>[key,f.get(key).trim()]));},'课程内容已保存');
    });
  }
};
$('#courses').onchange=e=>{if(e.target.id==='lesson-taught')run(()=>{const taught=e.target.checked;mutate(next=>{const c=next.classes.find(c=>c.id===current().id);c.lessonProgress??={};c.lessonProgress[selectedLesson]=taught;},taught?'已标记本班完成授课':'已取消授课标记');});};
$('#date').textContent=new Date().toLocaleDateString('zh-CN',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Shanghai'});
render();
