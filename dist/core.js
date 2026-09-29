/* Deterministic simulation, shared by the browser and the route test runner. */
(function(root){
  'use strict';
  const TAU=Math.PI*2, SPEED=760, RADIUS=12, CATCH=35, CYCLE=1;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(l||1),0,1);return {x:a.x+dx*t,y:a.y+dy*t,t};}
  const segmentDistance=(p,a,b)=>distance(p,project(p,a,b));
  function corridorDistance(level,p){let d=Infinity;for(const e of level.edges)for(let j=1;j<e.points.length;j++)d=Math.min(d,segmentDistance(p,e.points[j-1],e.points[j]));return d;}
  const deltaAngle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const flightAngle=p=>p.spinning?Math.round(p.spin/(Math.PI/8))*Math.PI/8:Math.atan2(p.vy,p.vx);
  function angle(c,t){if(c.type==='quick'||c.type==='auto')return c.a;const n=c.type==='spin90'?4:8;return -Math.PI/2-Math.floor((t+1e-9)*n/CYCLE)%n*TAU/n;}
  const gateClosed=(g,time)=>((time+g.phase)%g.period+g.period)%g.period<g.closed;
  function createRun(level){const c=level.cannons[0];return {level,state:'loaded',active:0,loadedTime:0,time:0,clock:0,started:false,stars:new Set(),visited:new Set([0]),player:{x:c.x,y:c.y,vx:0,vy:0,spin:0,spinning:false},events:[],ice:null,iceCooldown:0,deathTime:0,paused:false,shots:0};}
  function emit(run,type,data={}){run.events.push({type,x:run.player.x,y:run.player.y,...data});}
  function fire(run,forced=false){
    if(run.paused||run.state!=='loaded')return false;
    const c=run.level.cannons[run.active];
    if(!forced&&(c.type==='quick'||c.type==='auto'))return false;
    const a=angle(c,run.loadedTime),speed=SPEED*(c.type==='auto'?1.5:1);
    run.player={x:c.x+Math.cos(a)*43,y:c.y+Math.sin(a)*43,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,spin:a,spinning:c.type==='quick'||c.type==='auto'};
    run.state='flying';run.started=true;run.shots++;run.ice=null;emit(run,'fire',{angle:a});return true;
  }
  function die(run,reason){if(run.state==='dead'||run.state==='clear')return;run.state='dead';run.deathTime=0;emit(run,'fail',{reason});}
  function step(run,dt){
    if(run.paused||run.state==='clear')return;
    // Small swept substeps avoid tunnelling at low display frame rates.
    for(let left=dt;left>1e-8;){const h=Math.min(left,1/120);left-=h;tick(run,h);if(run.state==='clear')break;}
  }
  function tick(run,dt){
    if(run.state==='dead'){run.deathTime+=dt;return;}
    run.clock+=dt;if(run.started)run.time+=dt;
    if(run.state==='loaded'){
      run.loadedTime+=dt;const c=run.level.cannons[run.active];
      if((c.type==='quick'&&run.loadedTime>=.5)||(c.type==='auto'&&run.loadedTime>=1.5))fire(run,true);
      return;
    }
    const p=run.player,level=run.level,old={x:p.x,y:p.y};run.iceCooldown=Math.max(0,run.iceCooldown-dt);
    p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.spinning)p.spin+=dt*12;
    if(run.state==='sliding'){
      const rail=level.ice[run.ice],q=project(p,rail.a,rail.b);p.x=q.x;p.y=q.y;
      if((run.slideSign>0&&q.t>=1)||(run.slideSign<0&&q.t<=0)){run.state='flying';run.ice=null;run.iceCooldown=.25;emit(run,'iceExit');}
    }else if(run.iceCooldown<=0){
      for(let i=0;i<level.ice.length;i++){
        const rail=level.ice[i],q=project(p,rail.a,rail.b);
        if(distance(p,q)<=RADIUS+8){
          const len=distance(rail.a,rail.b),ux=(rail.b.x-rail.a.x)/len,uy=(rail.b.y-rail.a.y)/len,speed=Math.hypot(p.vx,p.vy);
          const sign=p.vx*ux+p.vy*uy>=0?1:-1;
          run.ice=i;run.slideSign=sign;run.state='sliding';p.x=q.x;p.y=q.y;p.vx=ux*speed*sign;p.vy=uy*speed*sign;emit(run,'ice');break;
        }
      }
    }
    level.stars.forEach((s,i)=>{if(!run.stars.has(i)&&segmentDistance(s,old,p)<30){run.stars.add(i);emit(run,'star',{x:s.x,y:s.y});}});
    for(const g of level.gates){if(gateClosed(g,run.clock)&&segmentDistance(p,g.a,g.b)<RADIUS+7){die(run,'gate');return;}}
    for(let i=0;i<level.cannons.length;i++){
      if(i===run.active)continue;const c=level.cannons[i];
      if(segmentDistance(c,old,p)<CATCH){run.active=i;run.visited.add(i);run.state='loaded';run.loadedTime=0;run.ice=null;p.x=c.x;p.y=c.y;p.vx=0;p.vy=0;emit(run,'catch');return;}
    }
    if(segmentDistance(level.goal,old,p)<48){run.state='clear';emit(run,'clear');return;}
    if(corridorDistance(level,p)>level.radius-RADIUS){die(run,'wall');}
  }
  function evaluate(level,time,collected){return level.conditions.map(c=>c.type==='time'?time<=c.value:level.stars.length>0&&collected===level.stars.length);}
  function mergeRecord(old,time,conditions){
    const count=conditions.filter(Boolean).length,prevCount=old?.conditions?.filter(Boolean).length??old?.stars??0;
    const better=!old||count>prevCount||(count===prevCount&&time<(old.medalTime??old.bestTime??Infinity));
    return {bestTime:Math.min(old?.bestTime??Infinity,time),stars:better?count:prevCount,conditions:better?conditions:[...old.conditions||Array.from({length:3},(_,i)=>i<prevCount)],medalTime:better?time:(old.medalTime??old.bestTime),clears:(old?.clears||0)+1};
  }
  function validate(level){
    const errors=[];if(level.cannons[0]?.type!=='spin45')errors.push('First cannon must be 8-way.');
    level.edges.forEach((e,index)=>{
      const c=level.cannons[e.from],target=e.points[1],a=Math.atan2(target.y-c.y,target.x-c.x);
      const step=c.type==='spin90'?Math.PI/2:Math.PI/4;
      if(c.type==='quick'||c.type==='auto'){if(Math.abs(deltaAngle(c.a,a))>1e-6)errors.push(`Edge ${index}: fixed aim mismatch`);}
      else if(Math.abs(a/step-Math.round(a/step))>1e-6)errors.push(`Edge ${index}: non-compass angle`);
      for(let j=1;j<e.points.length;j++){
        const a=e.points[j-1],b=e.points[j];
        for(let k=0;k<=50;k++){const p={x:a.x+(b.x-a.x)*k/50,y:a.y+(b.y-a.y)*k/50};if(corridorDistance(level,p)>level.radius-RADIUS)errors.push(`Edge ${index}: blocked corridor`);}
        level.cannons.forEach((other,i)=>{if(i!==e.from&&i!==e.to&&segmentDistance(other,a,b)<CATCH+4)errors.push(`Edge ${index}: unintended cannon ${i}`);});
      }
      if(e.ice&&!level.ice.some(r=>r.edge===index))errors.push(`Edge ${index}: missing ice`);
    });
    for(const s of level.stars)if(corridorDistance(level,s)>level.radius-RADIUS)errors.push('Unreachable collectible.');
    return [...new Set(errors)];
  }
  const api={SPEED,RADIUS,CATCH,CYCLE,clamp,distance,project,segmentDistance,corridorDistance,deltaAngle,flightAngle,angle,gateClosed,createRun,fire,step,evaluate,mergeRecord,validate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KiwiCore=api;
})(globalThis);
