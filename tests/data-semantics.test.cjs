const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const engine = html.slice(html.indexOf('const NO_OCC ='), html.indexOf('/* =====================================================================\n   PROFILE'));
const unknown = html.slice(html.indexOf('function isUnknownCategory('), html.indexOf('function unknownCategoryOrder('));
const skills = html.slice(html.indexOf('function skillComparisonRows('), html.indexOf('function pdSkillsHTML('));
const unknownLast = html.slice(html.indexOf('function unknownLast('), html.indexOf('const EXP_PREF'));
const sumAt = html.match(/const sumAt =[^]*?;/)[0];
const context = vm.createContext({});
vm.runInContext(engine + unknown + unknownLast + sumAt + skills + '\nglobalThis.api = {MainParser,normalizeRegions,PROVINCE_REGION,provinceKey,skillComparisonRows};', context);
const {MainParser,normalizeRegions,PROVINCE_REGION,provinceKey,skillComparisonRows} = context.api;
function fixture(provinces, regions, years){
  const names = {prov:[...new Set(provinces)],reg:[...new Set(regions)],year:[...new Set(years)]};
  return {n:provinces.length,names,prov:Uint8Array.from(provinces.map(p=>names.prov.indexOf(p))),reg:Uint8Array.from(regions.map(r=>names.reg.indexOf(r))),year:Uint8Array.from(years.map(y=>names.year.indexOf(y)))};
}
function labels(raw){return Array.from(raw.reg,i=>raw.names.reg[i]);}
test('NSO crosswalk covers 77 provinces with explicit boundary conventions',()=>{
  assert.equal(PROVINCE_REGION.size,77);
  for(const [p,r] of [['ตาก','เหนือ'],['นครนายก','ตะวันออก'],['สมุทรสงคราม','ตะวันตก'],['นครสวรรค์','เหนือ'],['นครปฐม','กรุงเทพมหานครและปริมณฑล']]) assert.equal(PROVINCE_REGION.get(p),r);
  assert.equal(provinceKey(' จ. ชลบุรี '),'ชลบุรี');
});
test('repairs missing/mismatched regions without mutating cached originals; repeat is stable',()=>{
  const raw=fixture(['กรุงเทพมหานคร','ชลบุรี','น่าน','ไม่ระบุ','จังหวัดที่ไม่รู้จัก'],['ใต้','ไม่ระบุ','เหนือ','กลาง','ไม่ระบุ'],['2567','2568','2568','2568','2568']);
  const before=labels(raw);const fixed=normalizeRegions(raw);
  assert.deepEqual(labels(fixed),['กรุงเทพมหานครและปริมณฑล','ตะวันออก','เหนือ','กลาง','ไม่ระบุ']);
  assert.deepEqual(labels(raw),before);
  assert.equal(fixed.regionAudit.filled,1);assert.equal(fixed.regionAudit.corrected,1);
  assert.equal(fixed.regionAudit.unknownProvince['ที่ไม่รู้จัก'],1);
  assert.deepEqual(labels(normalizeRegions(fixed)),labels(fixed));
  assert.equal(normalizeRegions(fixed).regionAudit.corrected,1);
});
test('all source rows reconcile after cached or fresh parsing and preserve original codes',()=>{
  const parser=new MainParser({occIndex:new Map(),fosIndex:new Map(),skIndex:new Map()});
  const csv=zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'..','main.csv.gz'))).toString('utf8');
  for(let offset=0;offset<csv.length;offset+=65536)parser.feed(csv.slice(offset,offset+65536));
  parser.finish();const raw=parser.build();assert.equal(raw.n,410200);assert.equal(parser.bad,0);
  const fixed=normalizeRegions(raw);
  assert.equal(fixed.n,raw.n);assert.equal(fixed.regionOriginal.codes,raw.reg);
  let unknown=0;
  for(let i=0;i<raw.n;i++){
    const expected=PROVINCE_REGION.get(provinceKey(raw.names.prov[raw.prov[i]]));
    if(expected)assert.equal(fixed.names.reg[fixed.reg[i]],expected);
    if(fixed.names.reg[fixed.reg[i]]==='ไม่ระบุ')unknown++;
  }
  assert.equal(unknown,15685);assert.equal(Object.keys(fixed.regionAudit.unknownProvince).length,0);
  assert.equal(fixed.regionAudit.byYear['2568'].knownAfter,186788);
  assert.equal(fixed.regionAudit.byYear['2567'].knownAfter,207727);
});
function series(total, counts){return {total,get:(dim,id)=>counts[id] || total.map(()=>0)};}
test('skill ranking scans all IDs and uses the selected period before top-12 limiting',()=>{
  const names=Array.from({length:403},(_,i)=>'Skill '+i),ids=names.map((_,i)=>i);
  const counts=Object.fromEntries(ids.map(i=>[i,[2,1]]));counts[402]=[1,80];
  const T=series([100,100],counts),market=series([1000,2000],{402:[200,100]});
  const rows=skillComparisonRows(ids,names,T,market,[1],[0],undefined,'share');
  assert.equal(rows.length,12);assert.equal(rows[0].key,402);
  assert.equal(rows[0].p,80);assert.equal(rows[0].c,1);assert.equal(rows[0].m,5);
  assert.equal(rows[0].count,80);assert.equal(rows[0].total,100);assert.equal(rows[0].marketCount,100);assert.equal(rows[0].marketTotal,2000);assert.equal(rows[0].ratio,16);
  assert.equal(skillComparisonRows(ids,names,T,market,[0],[1],undefined,'share')[0].key,0);
});
test('above-market ranking uses pp rather than ratio, excludes self and keeps unknown last',()=>{
  const names=['Broad','Niche','ไม่ระบุ','Below market'];
  const T=series([100],{0:[60],1:[10],2:[90],3:[1]}),market=series([1000],{0:[300],1:[1],2:[1],3:[20]});
  const rows=skillComparisonRows([0,1,2,3],names,T,market,[0],null,undefined,'over');
  assert.deepEqual(Array.from(rows,r=>r.key),[0,1,2]); // +30 pp beats +9.9 pp, despite lower ratio.
  assert.equal(rows[0].ratio,2);assert.equal(rows[1].ratio,100);
  assert.deepEqual(Array.from(skillComparisonRows([0,1],names,T,market,[0],null,0,'over'),r=>r.key),[1]);
});
test('declining skills with zero current count remain visible; empty denominators are safe',()=>{
  const T=series([100,100],{0:[70,0],1:[1,10]}),market=series([1000,1000],{});
  assert.equal(skillComparisonRows([0,1],['Lost','Growing'],T,market,[1],[0],undefined,'down')[0].key,0);
  assert.equal(skillComparisonRows([0,1],['Lost','Growing'],T,market,[1],[0],undefined,'up')[0].key,1);
  const zero=series([0],{});
  assert.equal(skillComparisonRows([0],['Absent'],zero,zero,[0],null,undefined,'over').length,0);
  assert.equal(skillComparisonRows([1],['Lost','Growing'],T,market,[1],null,undefined,'share')[0].ratio,null);
});

const mapCode=html.slice(html.indexOf('function skillMapPoints('),html.indexOf('function skillPoints('));
const sidebarCode=html.slice(html.indexOf('const ENT_TS_DIM ='),html.indexOf('function ',html.indexOf('function periodSidebarItems(')+9));
const mapContext=vm.createContext({sumAt:(s,ts)=>ts.reduce((n,t)=>n+(s[t]||0),0),TS:null});
const unknownOrder=html.slice(html.indexOf('function isUnknownCategory('),html.indexOf('function unknownLast('));
vm.runInContext(unknownOrder,mapContext);
vm.runInContext(mapCode+sidebarCode+'\nglobalThis.mapApi={skillMapPoints,periodSidebarItems,setSeries:s=>TS=s};',mapContext);
const {skillMapPoints,periodSidebarItems,setSeries}=mapContext.mapApi;
test('skill map ranks the full candidate set and distinguishes share changes from count growth',()=>{
  const names=Array.from({length:403},(_,i)=>'Skill '+i),ids=names.map((_,i)=>i),types=ids.map(()=> 'Common Skill');
  const counts=Object.fromEntries(ids.map(i=>[i,[1,1]]));counts[402]=[200,300];
  const points=skillMapPoints(ids,names,types,series([1000,2000],counts),1,0);
  assert.equal(points.length,60);assert.equal(points[0].i,402);
  assert.equal(points[0].n,300);assert.equal(points[0].prevN,200);
  assert.equal(points[0].x,15);assert.equal(points[0].before,20);assert.equal(points[0].y,-5); // More postings, lower share.
  assert.equal(skillMapPoints(ids,names,types,series([0,0],counts),1,0).length,0);
  assert.equal(skillMapPoints([402],names,types,series([1000,2000],counts),1,-1)[0].y,null);
  assert.deepEqual(Array.from(skillMapPoints([0,1],['ไม่ระบุ','Known'],types,series([100],{0:[90],1:[10]}),0,-1),p=>p.i),[1,0]);
});
test('sidebar counts follow full selected periods while growth compares matched quarters',()=>{
  setSeries(series([100,200,300],{4:[10,20,30]}));
  const E={items:()=>[{key:4,name:'Skill',c:999,cur:888,prev:777}],sel:id=>({kind:'skill',id})};
  let item=periodSidebarItems(E,{idx:[1,2],match:[1],cmpIdx:[0]})[0];
  assert.equal(item.c,50);assert.equal(item.cur,20);assert.equal(item.prev,10);
  item=periodSidebarItems(E,{idx:[2],match:[2],cmpIdx:null})[0];
  assert.equal(item.c,30);assert.equal(item.cur,30);assert.equal(item.prev,null);
});
