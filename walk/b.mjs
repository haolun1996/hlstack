// Hand-driver for headless Chrome over CDP (hlstack `walk` skill). One command per call; the page
// persists in Chrome, so a run is a sequence of calls against one tab.
//   CDP_PORT=9223 CDP_WIDTH=1440 node b.mjs <command> …
// Optional, from the project's .hlstack/walk.md: CDP_TOAST_SEL (toast/alert selector),
// CDP_ERROR_SEL (visible field-error selector), CDP_PAGE_JS (js giving the current page name).
// go <url> | url | wait <ms> | shot <file> [full] | click <text> [nth] | clicksel <css> [nth]
// | clickjs <js returning an element> | type <css|label> <value> | key <Key> | keys [css] <chars>
// | select <css> <option label> | file <css> <path> | fields | text [css] | eval <js> | drift
// After each command it prints toasts/alerts, the page name (go/click/key/url) and
// any visible field errors.
import fs from 'node:fs';
const PORT = Number(process.env.CDP_PORT || 9223);
const [cmd, a, b] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const t = list.find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
let n = 0; const pend = {};
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
await new Promise(r => ws.onopen = r);
const send = (method, params = {}) => new Promise(r => { const id = ++n; pend[id] = r; ws.send(JSON.stringify({ id, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return 'ERR ' + JSON.stringify(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text); return r.result?.result?.value; };
// Under 800 is treated as a phone (mobile emulation, 844 tall).
const W = Number(process.env.CDP_WIDTH || 1440);
await send('Emulation.setDeviceMetricsOverride', { width: W, height: W < 800 ? 844 : 900, deviceScaleFactor: 1, mobile: W < 800 });
const settle = async () => { for (let i = 0; i < 30; i++) { await sleep(200); if (await ev('document.readyState') === 'complete') break; } await sleep(700); };
const VIS = `const vis=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};`;
const mouse = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const center = async (finder) => {
  const r = await ev(`(()=>{${VIS} const el=(${finder}); if(!el) return null; el.scrollIntoView({block:'center',inline:'center'}); const b=el.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2,tag:el.tagName,txt:(el.innerText||el.value||'').slice(0,60)}})()`);
  return r;
};
const byText = (txt, nth = 0) => `(()=>{const want=${JSON.stringify(txt)}.toLowerCase();const c=[...document.querySelectorAll('button,a,[role=button],[role=tab],[role=option],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=combobox],label,summary,li,td,th,span,div,p,h1,h2,h3')].filter(vis).filter(e=>(e.innerText||'').trim().toLowerCase()===want);const exact=c.length?c:[...document.querySelectorAll('button,a,[role=button],[role=tab],[role=option],[role=menuitem],label')].filter(vis).filter(e=>(e.innerText||'').trim().toLowerCase().includes(want));const I=e=>e.matches("button,a,[role=button],[role=tab],[role=option],[role=menuitem],[role=switch],[role=checkbox],[role=radio],[role=combobox],label,summary");let pick=exact.filter(e=>!exact.some(o=>o!==e&&e.contains(o)));const ip=exact.filter(I);if(ip.length)pick=ip.filter(e=>!ip.some(o=>o!==e&&e.contains(o)));return pick[${nth}]})()`;
const out = async () => {
  switch (cmd) {
    case 'go': await send('Page.navigate', { url: a }); await settle(); return await ev('location.href');
    case 'url': return await ev('location.href');
    case 'wait': await sleep(Number(a)); return 'ok';
    case 'shot': {
      await sleep(300);
      let p = { format: 'png' };
      const H0 = W < 800 ? 844 : 900; let grew = false;
      if (b === "full") { const extra = await ev("Math.max(0,...[document.documentElement,...document.querySelectorAll(\"*\")].filter(e=>{const s=getComputedStyle(e);return e===document.documentElement||/(auto|scroll)/.test(s.overflowY)}).map(e=>e.scrollHeight-e.clientHeight))"); if (extra > 0) { grew = true; await send("Emulation.setDeviceMetricsOverride", { width: W, height: Math.min(H0 + extra, 9000), deviceScaleFactor: 1, mobile: W < 800 }); await sleep(800); } }
      const r0 = await send('Page.captureScreenshot', p); if (grew) await send('Emulation.setDeviceMetricsOverride', { width: W, height: H0, deviceScaleFactor: 1, mobile: W < 800 }); const r = r0;
      fs.mkdirSync(a.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(a, Buffer.from(r.result.data, 'base64')); return 'saved ' + a;
    }
    case 'click': { const c = await center(byText(a, Number(b || 0))); if (!c) return 'NOT FOUND: ' + a; await mouse(c.x, c.y); await settle(); return `clicked ${c.tag} "${c.txt}"`; }
    case 'clicksel': { const c = await center(`[...document.querySelectorAll(${JSON.stringify(a)})].filter(vis)[${Number(b || 0)}]`); if (!c) return 'NOT FOUND: ' + a; await mouse(c.x, c.y); await settle(); return `clicked ${c.tag} "${c.txt}"`; }
    case 'type': {
      const finder = `(()=>{const q=${JSON.stringify(a)};let el=null;try{el=[...document.querySelectorAll(q)].filter(vis)[0]}catch(e){}if(el)return el;const l=[...document.querySelectorAll('label')].filter(vis).find(l=>l.innerText.trim().toLowerCase().replace(/\\s*\\*$/,'')===q.toLowerCase());if(!l)return null;return l.htmlFor?document.getElementById(l.htmlFor):l.querySelector('input,textarea,select')||l.parentElement.querySelector('input,textarea,select')})()`;
      const c = await center(finder); if (!c) return 'NOT FOUND: ' + a;
      await mouse(c.x, c.y);
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 4, commands: ['selectAll'] });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 4 });
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      await send('Input.insertText', { text: b });
      await sleep(400);
      return 'typed into ' + c.tag + ' -> ' + await ev(`(()=>{const e=document.activeElement;return e&&('value' in e)?e.value:'(no value)'})()`);
    }
    case 'key': {
      const codes = { Enter: 13, Tab: 9, Escape: 27, ArrowDown: 40, ArrowUp: 38, Backspace: 8 };
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: a, code: a, windowsVirtualKeyCode: codes[a], ...(a === 'Enter' ? { text: '\r' } : {}) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: a, code: a, windowsVirtualKeyCode: codes[a] });
      await settle(); return 'key ' + a;
    }
    case 'select': { // native <select>: focus it, then arrow keys until the wanted option label is selected
      const c = await center(`[...document.querySelectorAll(${JSON.stringify(a)})].filter(vis)[0]`); if (!c) return 'NOT FOUND: ' + a;
      await ev(`[...document.querySelectorAll(${JSON.stringify(a)})].filter(e=>e.offsetParent)[0].focus()`);
      const opts = await ev(`[...[...document.querySelectorAll(${JSON.stringify(a)})].filter(e=>e.offsetParent)[0].options].map(o=>o.text)`);
      const want = opts.findIndex(o => o.trim().toLowerCase().startsWith(b.toLowerCase())); if (want < 0) return 'NO OPTION ' + b + ' in ' + opts.join(', ');
      for (let i = 0; i < opts.length + 1; i++) { const cur = await ev(`document.activeElement.selectedIndex`); if (cur === want) break; const ch = opts[want].trim()[0]; await send("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch, unmodifiedText: ch }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: ch }); await sleep(80); }
      await sleep(300); return 'selected ' + await ev(`document.activeElement.options[document.activeElement.selectedIndex].text`) + '  (options: ' + opts.join(' / ') + ')';
    }
    case 'drift': return await ev(`(()=>{const out=[];for(const g of document.querySelectorAll('*')){const s=getComputedStyle(g);if(s.display!=='grid'||s.gridTemplateColumns.split(' ').length<2)continue;const rows={};for(const c of g.children){const r=c.getBoundingClientRect();if(!r.width)continue;const ctl=c.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea,button[role=combobox]');if(!ctl)continue;(rows[Math.round(r.top)]??=[]).push([ctl.getBoundingClientRect().top,(c.querySelector('label')?.innerText||ctl.name||'').trim().slice(0,25)])}for(const k in rows){const t=rows[k].map(x=>x[0]);if(t.length>1&&Math.max(...t)-Math.min(...t)>2)out.push(rows[k].map(x=>x[1]+'@'+Math.round(x[0])).join(' | ')+'  <'+(g.className.baseVal??g.className).slice(0,60)+'>')}}return out.join('\\n')||'no drift'})()`);
    case 'keys': { // focus <css> (optional) then type each character as a real key press (date inputs etc.)
      if (b !== undefined) { const c = await center(`[...document.querySelectorAll(${JSON.stringify(a)})].filter(vis)[0]`); if (!c) return 'NOT FOUND ' + a; await mouse(c.x - (c.w || 0), c.y); }
      const str = b !== undefined ? b : a;
      for (const ch of str) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); await sleep(40); }
      await sleep(300); return 'keys sent; active value=' + await ev('document.activeElement.value');
    }
    case 'clickjs': { const c = await center(`(${a})`); if (!c) return 'NOT FOUND (js)'; await mouse(c.x, c.y); await settle(); return `clicked ${c.tag} "${c.txt}"`; }
    case 'file': { const r = await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(a)})` }); const id = r.result?.result?.objectId; if (!id) return 'NOT FOUND: ' + a; await send('DOM.setFileInputFiles', { files: [b], objectId: id }); await settle(); return 'file set ' + b; }
    case 'eval': return await ev(a);
    case 'text': return await ev(`(document.querySelector(${JSON.stringify(a || 'body')})||document.body).innerText`);
    case 'fields': return await ev(`(()=>{${VIS} return [...document.querySelectorAll('input,select,textarea,button[role=combobox],button[role=switch],button[role=checkbox]')].filter(vis).map(e=>{const id=e.id;const l=id&&document.querySelector('label[for="'+CSS.escape(id)+'"]');return [e.tagName.toLowerCase(),e.type||e.getAttribute('role')||'',e.name||'',id?'#'+id:'',l?l.innerText.trim():(e.placeholder||e.getAttribute('aria-label')||''),e.value??'',e.getAttribute('aria-checked')??e.getAttribute('data-state')??''].join(' | ')}).join('\\n')})()`);
  }
};
console.log(await out());
// surface page errors/toasts quickly
const TOAST = process.env.CDP_TOAST_SEL || '[data-sonner-toast],[role=alert],[role=status]';
const ERRSEL = process.env.CDP_ERROR_SEL || '[data-slot=form-message],[aria-invalid=true]~*,p.text-destructive,p.text-red-600,.text-red-500,.error-message,[role=alert]';
// Default: an SPA's page component when the framework exposes one in history state, else the title.
const PAGEJS = process.env.CDP_PAGE_JS || "(history.state?.page?.component||document.title||'?')";
const toast = await ev(`[...document.querySelectorAll(${JSON.stringify(TOAST)})].map(e=>(e.innerText||'').trim()).filter(Boolean).join(' || ')`);
if (toast) console.log('TOAST/ALERT:', toast);
if (['go', 'click', 'clicksel', 'clickjs', 'key', 'url'].includes(cmd)) console.log('PAGE:', await ev(`${PAGEJS}+'  '+location.href`));
const errs = await ev(`[...document.querySelectorAll(${JSON.stringify(ERRSEL)})].filter(e=>e.offsetParent).map(e=>(e.innerText||'').trim()).filter(Boolean).join(' || ')`);
if (errs) console.log('FIELD ERRORS:', errs);
ws.close();
