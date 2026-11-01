const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const {validateState,applyPoints,undoPoints,readBackup}=require('../data.js');
const base=()=>({classes:[{id:1,name:'测试一班',students:[{id:1,name:'甲',account:'test01',grade:'7.10',phone:'',points:10,after:2},{id:2,name:'乙',account:'test02',points:0,after:0}]},{id:2,name:'测试二班',students:[]}],logs:[],selected:1});
test('batch after-class scores change totals once and undo keeps audit history',()=>{
 const s=base();applyPoints(s,1,[1,2,2],5,'after','练习完成','batch-1',1);
 assert.deepEqual(s.classes[0].students.map(s=>[s.points,s.after]),[[15,7],[5,5]]);assert.equal(s.logs.length,2);
 applyPoints(s,1,[1],3,'class','积极发言','later',2);undoPoints(s,'batch-1',3);
 assert.deepEqual(s.classes[0].students.map(s=>[s.points,s.after]),[[13,2],[0,0]]);assert.equal(s.logs.filter(l=>l.undone).length,2);
 assert.throws(()=>undoPoints(s,'batch-1'));assert.equal(s.classes[0].students[0].points,13);
});
test('invalid amount or missing batch target is rejected before any changes',()=>{
 for(const amount of [0,NaN,Infinity,1.5,1001]){const s=base();assert.throws(()=>applyPoints(s,1,[1],amount,'class','','x'));assert.deepEqual(s,base());}
 const s=base();assert.throws(()=>applyPoints(s,1,[1,999],1,'class','','x'));assert.deepEqual(s,base());
});
test('deduction allows negative totals and is reversible',()=>{
 const s=base();applyPoints(s,1,[2],-8,'after','','negative');assert.equal(s.classes[0].students[1].points,-8);assert.equal(s.classes[0].students[1].after,-8);undoPoints(s,'negative');assert.equal(s.classes[0].students[1].after,0);
});
test('backup preserves textual grades, course content and per-class progress',()=>{
 const s=base();s.courses={1:{title:'测试课程',summary:'知识点\n第二行',practice:'print(1)',homework:'练习'}};s.classes[0].lessonProgress={1:true};
 const restored=readBackup(JSON.parse(JSON.stringify({format:'classbloom-backup-v1',state:s})));
 assert.equal(restored.classes[0].students[0].grade,'7.10');assert.equal(restored.courses[1].practice,'print(1)');assert.equal(restored.classes[0].lessonProgress[1],true);assert.deepEqual(restored.classes[1].lessonProgress,{});
});
test('corrupt backup is rejected and unsafe visual properties are normalized',()=>{
 assert.throws(()=>readBackup({format:'classbloom-roster-v1',classes:[]}));assert.throws(()=>validateState({classes:[],logs:[]}));
 const s=base();s.classes[0].students[0].points='10';assert.throws(()=>validateState(s));s.classes[0].students[0].points=10;s.classes[0].students[0].color='red;position:fixed';assert.equal(validateState(s).classes[0].students[0].color,'#eaf0df');
});
test('roster re-import matches accounts case-insensitively and preserves points',()=>{
 const scope={structuredClone};vm.createContext(scope);vm.runInContext(fs.readFileSync(require.resolve('../roster.js'),'utf8'),scope);
 const s=base();const roster={format:'classbloom-roster-v1',classes:[{name:'测试一班',students:[{name:'甲更新',account:'TEST01',grade:'7.11',phone:''}]}]};
 const merged=scope.mergeStudentRoster(s,roster);assert.equal(merged.added,0);assert.equal(merged.updated,1);assert.equal(merged.state.classes[0].students[0].points,10);assert.equal(s.classes[0].students[0].grade,'7.10');
 roster.classes[0].students.push({...roster.classes[0].students[0],account:'test01'});assert.throws(()=>scope.mergeStudentRoster(s,roster));
});
test('published roster has 160 distinct accounts and only approved student fields',()=>{
 const roster=require('../students.json');assert.equal(roster.format,'classbloom-roster-v1');assert.deepEqual(roster.classes.map(c=>c.students.length),[26,40,41,53]);
 const students=roster.classes.flatMap(c=>c.students);assert.equal(new Set(students.map(s=>s.account.toLowerCase())).size,160);
 for(const s of students){assert.deepEqual(Object.keys(s).sort(),['account','grade','name']);assert.equal(typeof s.grade,'string');}
});
