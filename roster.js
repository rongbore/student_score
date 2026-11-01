// Roster data stays in the user's browser; this module contains no student records.
function mergeStudentRoster(existing, roster) {
  if (!roster || roster.format !== 'classbloom-roster-v1' || !Array.isArray(roster.classes) || !roster.classes.length) {
    throw new Error('请选择星光课堂学员名单 JSON 文件。');
  }
  const next = structuredClone(existing);
  const normalizeClass = name => name === '莲花实验班' ? '莲华实验班' : name;
  const seen = new Set();
  let added = 0, updated = 0;
  let nextId = Math.max(0, ...next.classes.flatMap(c => c.students.map(s => Number(s.id) || 0)));
  for (const entry of roster.classes) {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim() || !Array.isArray(entry.students)) throw new Error('班级格式不正确，未导入任何数据。');
    const className = normalizeClass(entry.name.trim());
    let target = next.classes.find(c => normalizeClass(c.name) === className);
    if (!target) {
      target = {id: Math.max(0, ...next.classes.map(c => Number(c.id) || 0)) + 1, name: className, students: []};
      next.classes.push(target);
    }
    target.name = className;
    for (const row of entry.students) {
      if (!row || typeof row.name !== 'string' || !row.name.trim() || typeof row.account !== 'string' || !row.account.trim()) throw new Error('学员姓名和账号不能为空，未导入任何数据。');
      for (const key of ['grade', 'phone']) if (row[key] != null && typeof row[key] !== 'string') throw new Error('年级和手机号必须为文本，未导入任何数据。');
      const info = {name: row.name.trim(), account: row.account.trim(), grade: (row.grade || '').trim(), phone: (row.phone || '').trim()};
      if (seen.has(info.account.toLowerCase())) throw new Error('名单包含重复账号，请核对后重试。');
      seen.add(info.account.toLowerCase());
      const elsewhere = next.classes.find(c => c !== target && c.students.some(s => s.account?.toLowerCase() === info.account.toLowerCase()));
      if (elsewhere) throw new Error('某个账号已在其他班级中，未导入任何数据，请先核对班级。');
      let student = target.students.find(s => s.account?.toLowerCase() === info.account.toLowerCase());
      if (!student) {
        const matches = target.students.filter(s => !s.account && s.name === info.name);
        if (matches.length === 1) student = matches[0];
        else if (matches.length > 1) throw new Error('班级中存在多名同名且无账号的学员，请先补全账号。');
      }
      if (student) {
        student.name = info.name;
        student.account = info.account;
        if (info.grade) student.grade = info.grade;
        if (info.phone) student.phone = info.phone;
        updated++;
      } else {
        target.students.push({id: ++nextId, ...info, emoji: '🧑‍🎓', title: '准备好闪闪发光', color: ['#eaf0df','#f8e8da','#e9e7f4','#e2eef0'][added % 4], points: 0, after: 0});
        added++;
      }
    }
  }
  return {state: next, added, updated};
}

if (typeof module !== 'undefined' && module.exports) module.exports = {mergeStudentRoster};
