import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {firefox,chromium} from 'playwright';

// Test the built files under production CSP; BASE_URL can target the deployed site.
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf','.xml':'application/xml'};
const dist=path.resolve('dist');
let server;
if(!process.env.BASE_URL){
 server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
  const redirect=config.redirects.find(r=>r.source===pathname);
  if(redirect){res.writeHead(308,{Location:redirect.destination});res.end();return;}
  let file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(dist+path.sep)){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(file)){file=path.join(dist,'404.html');res.statusCode=404;}
  for(const rule of config.headers)if(new RegExp('^'+rule.source+'$').test(pathname))for(const h of rule.headers)res.setHeader(h.key,h.value);
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
}
const base=process.env.BASE_URL||`http://127.0.0.1:${server.address().port}`;
const browser=await (process.env.BROWSER==='chromium'?chromium:firefox).launch();
const routes=['/','/work/flex-v2/','/work/mass-spec/','/work/lungscope/','/work/ecg/','/work/arch-support/','/work/jobhub/','/research/','/evidence/','/privacy/','/terms/','/colophon/'];
try{
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:1000}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{localStorage.setItem('analytics-consent','declined');window.__cspErrors=[];document.addEventListener('securitypolicyviolation',e=>window.__cspErrors.push(e.violatedDirective));});
  for(const route of routes){
   const response=await p.goto(base+route+'#explore');assert.equal(response.status(),200,route);
   await p.evaluate(()=>document.fonts.ready);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route);
   assert.deepEqual(await p.evaluate(()=>window.__cspErrors),[],`CSP: ${route}`);
   if(route==='/'){
    assert.equal(await p.locator('.sk-track').evaluateAll(es=>es.length===2&&es.every(e=>getComputedStyle(e).animationName!=='none')),true,'ticker rows animate');
    assert.equal(await p.locator('[aria-hidden="true"] a,[aria-hidden="true"] button,[aria-hidden="true"] [tabindex="0"]').count(),0,'hidden banner has no focusable content');
   }
   if(route!=='/'){
    const crumbs=p.getByRole('navigation',{name:'Breadcrumb',exact:true});
    assert.equal(await crumbs.locator('a[href="/"]').count(),1,route);
   }
   if(route.startsWith('/work/')||route==='/research/'){
    assert.equal(await p.locator('.story-directory li').count(),7,route);
    await p.locator('[data-story-set="quick"]').first().click();
    assert.equal(await p.locator('html').getAttribute('data-story'),'quick');
    await p.goBack();assert.equal(await p.locator('html').getAttribute('data-story'),'explore');
   }
  }
  await p.goto(base+'/work/ecg/#explore');const slider=p.getByRole('slider');await slider.focus();const before=await slider.inputValue();await p.keyboard.press('ArrowRight');assert.notEqual(await slider.inputValue(),before);
  await p.emulateMedia({reducedMotion:'reduce'});
  const firstProbe=p.locator('[data-chain] button').first();await firstProbe.click();
  await p.waitForFunction(()=>document.querySelector('[data-sc]').dataset.node==='0');
  await p.evaluate(()=>window.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown')window.__probePrevented=e.defaultPrevented;}));
  await p.keyboard.press('ArrowUp');assert.equal(await p.evaluate(()=>window.__probePrevented),false,'Up escapes the first probe');
  await firstProbe.click();await p.keyboard.press('ArrowDown');
  assert.equal(await p.evaluate(()=>window.__probePrevented),true,'Down advances within the probe sequence');
  await p.waitForFunction(()=>document.querySelector('[data-sc]').dataset.node==='1');
  await p.emulateMedia({reducedMotion:'no-preference'});
  await firstProbe.focus();await p.keyboard.press('ArrowRight');await p.waitForURL('**/work/arch-support/#explore');
  await p.goto(base+'/research/#explore');await p.keyboard.press('ArrowRight');await p.waitForURL('**/#contact');
  await p.goto(base+'/work/mass-spec/#explore');
  await p.locator('.ms-workbook').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY));
  for(const id of ['ms-sheet','ms-reshaped','ms-flags','ms-stats','ms-volcano','ms-used']){
   await p.waitForFunction(id=>document.querySelector('[data-ms-active]')?.id===id,id);
   assert.equal(await p.locator('[data-ms-sheet]:not([data-ms-active])').evaluateAll(es=>es.every(e=>e.inert)),true);
   if(id!=='ms-used')await p.locator(`#${id} [data-ms-next]`).click();
  }
  await p.goto(base+'/work/arch-support/#explore');await p.locator('.as-anatomy-story.as-scroll').waitFor();
  const values=[];
  for(const progress of [0,.8,.2]){
   await p.locator('.as-anatomy-story').evaluate((el,n)=>scrollTo(0,el.getBoundingClientRect().top+scrollY+n*(el.offsetHeight-innerHeight)),progress);
   await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));values.push(Number(await p.locator('#as-arch').inputValue()));
  }
  assert.ok(values[1]>values[0]&&values[2]<values[1],'arch must reverse with scroll');
  await p.goto(base+'/');await p.locator('.wire.is-live canvas').waitFor();const canvas=p.locator('.wire canvas'),initial=await canvas.evaluate(c=>c.toDataURL());
  await p.waitForFunction(before=>document.querySelector('.wire canvas').toDataURL()!==before,initial);
  await p.emulateMedia({reducedMotion:'reduce'});await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const still=await canvas.evaluate(c=>c.toDataURL());await p.mouse.move(30,400);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await canvas.evaluate(c=>c.toDataURL()),still);
  assert.deepEqual(errors,[]);await p.close();console.log(`${width}: routes, story/history, keyboard, workbook, arch and hero passed`);
 }
 const consent=await browser.newPage();let google=0;
 await consent.route(/https:\/\/.*(googletagmanager|google-analytics|analytics\.google)\.com\//,route=>{google++;return route.fulfill({body:'',contentType:'text/javascript'});});
 await consent.goto(base+'/');assert.equal(google,0);await consent.locator('[data-consent="declined"]').click();assert.equal(google,0);
 await consent.locator('[data-analytics-settings]').first().click();await consent.locator('[data-consent="accepted"]').click();await consent.waitForFunction(()=>!!document.querySelector('script[src*="googletagmanager"]'));assert.equal(google,1);
 await consent.locator('[data-analytics-settings]').first().click();await consent.locator('[data-consent="declined"]').click();await consent.waitForLoadState('load');assert.equal(await consent.evaluate(()=>window['ga-disable-G-X4CMQSBTM1']),true);await consent.close();
 const nojs=await browser.newPage({javaScriptEnabled:false});await nojs.goto(base+'/work/mass-spec/#explore');assert.equal(await nojs.locator('[data-ms-sheet]').evaluateAll(es=>es.every(e=>getComputedStyle(e).visibility==='visible'&&!e.inert)),true);await nojs.close();
 console.log('Consent gating/withdrawal and no-JS workbook passed');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
