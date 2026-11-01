/* Shared data operations: no network requests and no embedded student records. */
(function (root) {
  const fail = message => { throw new Error(message); };
  const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
  const integer = value => Number.isSafeInteger(value);
  function validateState(input) {
    if (!input || !Array.isArray(input.classes) || !input.classes.length) fail('备份中没有有效的班级数据。');
    const classIds = new Set();
    const classes = input.classes.map(c => {
      if (!c || !integer(c.id) || c.id < 1 || classIds.has(c.id) || !text(c.name).trim() || !Array.isArray(c.students)) fail('班级资料格式无效或编号重复。');
      classIds.add(c.id);
      const ids = new Set();
      const students = c.students.map(s => {
        if (!s || !integer(s.id) || s.id < 1 || ids.has(s.id) || !text(s.name).trim() || !integer(s.points) || !integer(s.after)) fail('学员资料或积分格式无效。');
        ids.add(s.id);
        return {id:s.id, name:s.name.trim(), grade:text(s.grade), account:text(s.account), phone:text(s.phone), title:text(s.title,'准备好闪闪发光'), emoji:text(s.emoji,'🧑‍🎓'), color:/^#[0-9a-f]{3,8}$/i.test(s.color) ? s.color : '#eaf0df', points:s.points, after:s.after};
      });
      const lessonProgress = {};
      for (let i=1;i<=12;i++) if(c.lessonProgress?.[i] === true) lessonProgress[i] = true;
      return {id:c.id, name:c.name.trim(), students, lessonProgress};
    });
    if (!Array.isArray(input.logs)) fail('积分记录格式无效。');
    const logs = input.logs.map(l => {
      if (!l || !integer(l.classId) || !integer(l.delta) || !integer(l.time) || !['class','after'].includes(l.type) || typeof l.name !== 'string') fail('积分记录格式无效。');
      return {classId:l.classId, name:l.name, delta:l.delta, type:l.type, reason:text(l.reason), time:l.time,
        ...(integer(l.studentId) ? {studentId:l.studentId} : {}), ...(typeof l.operationId==='string' ? {operationId:l.operationId} : {}),
        ...(l.undone===true ? {undone:true,undoneAt:integer(l.undoneAt)?l.undoneAt:0} : {})};
    });
    const courses = {};
    for (let id=1;id<=12;id++) {
      const item=input.courses?.[id];
      if(item && typeof item==='object') courses[id]={title:text(item.title).trim(),summary:text(item.summary),practice:text(item.practice),homework:text(item.homework)};
    }
    return {classes, logs, courses, selected:classIds.has(input.selected)?input.selected:classes[0].id,
      requestedClassesAdded:input.requestedClassesAdded===true, importedRosters:Array.isArray(input.importedRosters)?input.importedRosters.filter(x=>typeof x==='string'):[]};
  }
  function applyPoints(state, classId, studentIds, amount, type, reason, operationId, time=Date.now()) {
    if (!integer(amount) || amount===0 || Math.abs(amount)>1000) fail('积分必须是 1 到 1000 的整数。');
    if (!['class','after'].includes(type)) fail('请选择有效的积分类别。');
    const c=state.classes.find(c=>c.id===classId);
    const ids=[...new Set(studentIds)];
    if(!c || !ids.length) fail('请先选择学生。');
    const students=ids.map(id=>c.students.find(s=>s.id===id));
    if(students.some(s=>!s)) fail('选中的学生已不存在，请重新选择。');
    for(const s of students) {
      if(!integer(s.points+amount) || (type==='after'&&!integer(s.after+amount))) fail('积分超过可保存范围。');
    }
    for(const s of students) {
      s.points+=amount;
      if(type==='after')s.after+=amount;
      state.logs.push({classId,studentId:s.id,name:s.name,delta:amount,type,reason:reason.trim()||(amount>0?'表现很棒':'成长提醒'),time,operationId});
    }
  }
  function undoPoints(state, operationId, time=Date.now()) {
    const logs=state.logs.filter(l=>l.operationId===operationId&&!l.undone);
    if(!logs.length)fail('这次积分操作已经撤销。');
    const targets=logs.map(l=>({log:l,student:state.classes.find(c=>c.id===l.classId)?.students.find(s=>s.id===l.studentId)}));
    if(targets.some(t=>!t.student))fail('学生资料已变更，无法撤销这次操作。');
    for(const {log:l,student:s} of targets) {
      s.points-=l.delta;if(l.type==='after')s.after-=l.delta;l.undone=true;l.undoneAt=time;
    }
  }
  function readBackup(data) {
    if(!data || data.format!=='classbloom-backup-v1' || !data.state)fail('请选择星光课堂完整备份文件。学员名单请使用「导入学员」。');
    return validateState(data.state);
  }
  const api={validateState,applyPoints,undoPoints,readBackup};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.ClassBloomData=api;
})(globalThis);
