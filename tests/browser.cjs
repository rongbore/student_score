// Run with an available Playwright installation and Chromium; no real student data.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const allowed=new Set(['index.html','style.css','data.js','roster.js','app.js']);
(async()=>{
 const server=createServer((q,r)=>{const name=q.url==='/'?'index.html':q.url.slice(1);if(!allowed.has(name)){r.writeHead(404);r.end();return;}r.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');r.end(readFileSync(path.join(__dirname,'..',name)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);
  assert.equal(await page.locator('#class-select option').count(),4);
  async function add(name,account){await page.locator('#add-student').click();await page.locator('[name="name"]').fill(name);await page.locator('[name="account"]').fill(account);await page.locator('[name="grade"]').fill('7.10');await page.locator('.submit').click();}
  await add('测试学生甲','demo01');await add('测试学生乙','demo02');assert.equal(await page.locator('.student-card').count(),2);
  await add('重复账号','DEMO01');assert.equal(await page.locator('#modal-error').isVisible(),true);assert.equal(await page.locator('.student-card').count(),2);await page.locator('#close-modal').click();
  await page.locator('#select-all').check();await page.locator('#bulk-reward').click();await page.locator('[name="points"]').fill('5');await page.locator('[name="type"]').selectOption('after');await page.locator('.submit').click();
  assert.match(await page.locator('#stat-total').textContent(),/10/);assert.match(await page.locator('#stat-after').textContent(),/10/);
  await page.locator('[data-view="activity"]').click();assert.equal(await page.locator('.log-row').count(),2);await page.locator('[data-undo]').first().click();await page.locator('.submit').click();assert.equal(await page.locator('.undone').count(),2);assert.match(await page.locator('#stat-total').textContent(),/^0/);
  await page.locator('[data-view="classroom"]').click();await page.locator('.minus').first().click();await page.locator('[name="points"]').fill('3');await page.locator('[name="type"]').selectOption('after');await page.locator('.submit').click();assert.match(await page.locator('.after-score').first().textContent(),/-3/);assert.doesNotMatch(await page.locator('.after-score').first().textContent(),/＋-3/);
  await page.locator('[data-view="courses"]').click();await page.locator('#edit-lesson').click();await page.locator('[name="title"]').fill('测试课程');await page.locator('[name="summary"]').fill('知识点\n第二行');await page.locator('[name="practice"]').fill('<img src=x onerror=alert(1)>');await page.locator('[name="homework"]').fill('print("练习")');await page.locator('.submit').click();assert.equal(await page.locator('.lesson-block img').count(),0);assert.match(await page.locator('.has-content').nth(1).textContent(),/<img/);
  await page.locator('#lesson-taught').check();await page.locator('#class-select').selectOption({label:'滨州实验1班'});assert.equal(await page.locator('#lesson-taught').isChecked(),false);await page.locator('#class-select').selectOption({label:'莲华实验班'});assert.equal(await page.locator('#lesson-taught').isChecked(),true);
  await page.locator('#rename-class').click();await page.locator('[name="name"]').fill('测试授课班');await page.locator('.submit').click();await page.reload();assert.equal(await page.locator('#class-select option').count(),4);assert.equal(await page.locator('#class-select option:checked').textContent(),'测试授课班');
  const downloadPromise=page.waitForEvent('download');await page.locator('#export-backup').click();const download=await downloadPromise;const backup=JSON.parse(readFileSync(await download.path(),'utf8'));assert.equal(backup.state.classes[0].students[0].grade,'7.10');assert.equal(backup.state.courses[1].title,'测试课程');assert.equal(backup.state.logs.length,3);
  await page.locator('#backup-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{')});assert.match(await page.locator('#toast').textContent(),/不是有效/);
  await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.locator('#close-modal').click();assert.equal(await page.locator('#class-select option').count(),4);
  await page.locator('[data-view="classroom"]').click();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('QuotaExceededError');};});await add('不应保存','demo03');assert.equal(await page.locator('#modal-error').isVisible(),true);assert.equal(await page.locator('.student-card').count(),2);await page.reload();assert.equal(await page.locator('.student-card').count(),2);
  await page.evaluate(()=>localStorage.setItem('classbloom-v1','{broken'));await page.reload();assert.equal(await page.locator('#storage-warning').isVisible(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('classbloom-v1')),'{broken');
  await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.locator('.submit').click();assert.equal(await page.locator('#storage-warning').isVisible(),false);assert.equal(await page.locator('.student-card').count(),2);
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.locator('[data-view="courses"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);console.log('PASS: profile validation, batch scoring, batch undo, negative scores, safe course editing, class progress, rename persistence, backup/restore, cancellation, storage failure, corrupt-data recovery, mobile layout.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
