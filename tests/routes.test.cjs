const assert=require('node:assert/strict');
const C=require('../dist/core.js');
const {levels}=require('../dist/levels.js');

function solve(level,dt=1/120,shortcut=false){
  const r=C.createRun(level);let guard=0,ice=0;
  while(r.state!=='clear'&&r.state!=='dead'&&guard++<120/dt){
    if(r.state==='loaded'){
      const c=level.cannons[r.active],edge=level.edges.find(e=>e.from===r.active&&(shortcut?e.shortcut:true))||level.edges.find(e=>e.from===r.active);
      const p=edge.points[1],a=Math.atan2(p.y-c.y,p.x-c.x);
      const gates=level.gates.filter(g=>g.edge===level.edges.indexOf(edge));
      const safe=gates.every(g=>{const mid={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},arrival=r.clock+(C.distance(c,mid)-43)/C.SPEED;return [-.12,0,.12].every(m=>!C.gateClosed(g,arrival+m));});
      if(Math.abs(C.deltaAngle(C.angle(c,r.loadedTime),a))<1e-5&&safe)C.fire(r);
    }
    C.step(r,dt);ice+=r.events.filter(e=>e.type==='ice').length;r.events.length=0;
  }
  assert.equal(r.state,'clear',`${level.name}: failed at cannon ${r.active+1}, state ${r.state}, x ${r.player.x}, y ${r.player.y}`);
  return {r,ice};
}

assert.equal(levels.length,11);
for(const [i,l] of levels.entries()){
  assert.deepEqual(C.validate(l),[],`Geometry, stage ${i+1}`);
  for(const dt of [1/120,1/60,1/30,1/15]){
    const {r,ice}=solve(l,dt);assert.equal(r.stars.size,l.stars.length,`All stars, stage ${i+1}`);assert.equal(ice,l.ice.length,`All ice, stage ${i+1}`);
    assert.deepEqual(C.evaluate(l,r.time,r.stars.size),[true,true,true]);
    if(dt===1/120)console.log(`PASS ${String(i+1).padStart(2,'0')} ${l.name}: ${r.time.toFixed(3)}s, ${r.stars.size} stars, ${ice} ice transitions`);
  }
  if(l.edges.some(e=>e.shortcut)){const {r}=solve(l,1/120,true);assert.ok(r.stars.size<l.stars.length,'Shortcut must skip a collectible');assert.deepEqual(C.evaluate(l,r.time,r.stars.size),[true,true,false]);}
}

// Shared revolution period, discrete directions and exact restart angle.
for(const type of ['spin45','spin90']){
  const c={type},n=type==='spin90'?4:8;
  for(let k=0;k<n;k++)assert.ok(Math.abs(C.deltaAngle(C.angle(c,(k+.3)/n),-Math.PI/2-k*Math.PI*2/n))<1e-8);
  assert.ok(Math.abs(C.deltaAngle(C.angle(c,1),-Math.PI/2))<1e-8);
}
const paused=C.createRun(levels[0]);C.step(paused,.25);assert.equal(paused.time,0);const beforePause=paused.loadedTime;paused.paused=true;C.step(paused,10);assert.equal(paused.loadedTime,beforePause);assert.equal(C.fire(paused),false);
paused.paused=false;C.fire(paused);const time=paused.time;paused.paused=true;C.step(paused,10);assert.equal(paused.time,time);
const wrong=C.createRun(levels[0]);C.fire(wrong);C.step(wrong,.6);assert.equal(wrong.state,'dead','Bad shot must hit the enclosing forest quickly.');
const quick=C.createRun(levels[3]);quick.active=1;quick.loadedTime=0;assert.equal(C.fire(quick),false);C.step(quick,.49);assert.equal(quick.state,'loaded');C.step(quick,.02);assert.equal(quick.state,'flying');assert.equal(quick.player.spinning,true);
let record=C.mergeRecord(null,170,[false,false,true]);record=C.mergeRecord(record,100,[true,true,false]);assert.equal(record.stars,2);assert.deepEqual(record.conditions,[true,true,false]);
record=C.mergeRecord(record,110,[true,true,true]);assert.equal(record.stars,3);assert.equal(record.bestTime,100);assert.equal(record.medalTime,110);
const again=C.mergeRecord(record,95,[true,true,false]);assert.equal(again.stars,3);assert.equal(again.bestTime,95);assert.deepEqual(again.conditions,[true,true,true]);
assert.deepEqual(C.evaluate(levels[1],120,1),[true,true,true]);assert.deepEqual(C.evaluate(levels[1],120.001,1),[false,true,true]);
const fresh=C.createRun(levels[1]);assert.equal(fresh.stars.size,0);assert.equal(fresh.time,0);
console.log('PASS compass rotation, countdown, pause, wall collision, timer boundaries, non-cumulative records, and fresh attempts.');

for(let i=0;i<8;i++){
  const a=-Math.PI/2-i*Math.PI/4;
  const p={vx:Math.cos(a)*760,vy:Math.sin(a)*760,spinning:false,spin:0};
  assert.ok(Math.abs(C.deltaAngle(C.flightAngle(p),a))<1e-8,`Character must face shot direction ${i}.`);
}
assert.ok(Math.abs(C.flightAngle({spinning:true,spin:Math.PI/2,vx:760,vy:0})-Math.PI/2)<1e-8,'Automatic cannon must retain spinning animation.');
console.log('PASS all eight character flight orientations and automatic spinning.');
