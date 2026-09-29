/* Original code-authored pixel assets. No filters, generated illustrations or external art. */
(function(root){
  'use strict';
  const C=KiwiCore, themes=KiwiLevels.themes;
  const ink='#101f29',cream='#fff1c7',cache=new Map();
  const skins={forest:['#c9d96a','#8fa64c','#eaf0a1'],berry:['#ed9aa3','#b8647c','#ffd0b6'],sky:['#8ccbd0','#5593ab','#d0efe1'],sun:['#f1c36b','#c78c4d','#ffe6a1']};
  const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  const rect=(g,c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);};
  function sprite(rows,palette){const s=canvas(Math.max(...rows.map(r=>r.length)),rows.length),g=s.getContext('2d');rows.forEach((r,y)=>[...r].forEach((v,x)=>{if(palette[v])rect(g,palette[v],x,y,1,1);}));return s;}
  function bird(skin='forest',hat='none',flap=0){
    const key=`bird-${skin}-${hat}-${flap}`;if(cache.has(key))return cache.get(key);
    const colors=skins[skin]||skins.forest;
    const s=sprite([
      '......oo............',
      '.....oggooo.........',
      '...oogllgggo........',
      '..oglllllgggo.......',
      '.oglllllgggggo......',
      '.ogllgggggwogo......',
      'ogllggggggwoooo.....',
      'oggggggggggoaaaoooo.',
      'ogggsssggggoaaaaaaao',
      'oggsbbssggggooooooo.',
      '.ogssbbsggggo.......',
      '.ogggssssssgo.......',
      '..ogssssssso........',
      '...oogsssoo.........',
      '.....oooo...........',
      '.....oa.oa..........',
      '....oaa.oaa.........'
    ],{o:ink,g:colors[0],s:colors[1],l:colors[2],b:colors[1],w:'#fff9e9',a:'#e4a05a'});
    const g=s.getContext('2d');
    if(flap){rect(g,colors[1],3,8,6,2);rect(g,colors[1],4,10,4,1);rect(g,colors[2],3,7,3,1);rect(g,ink,3,9,1,2);rect(g,ink,4,11,3,1);}
    if(hat==='cap'){rect(g,ink,3,0,10,4);rect(g,'#c97658',4,0,7,3);rect(g,'#efb075',5,0,4,1);rect(g,ink,11,3,4,2);}
    if(hat==='feather'){rect(g,ink,5,0,3,5);rect(g,'#b0a0db',6,0,1,4);rect(g,'#ece2fa',7,0,2,2);}
    cache.set(key,s);return s;
  }
  function cannon(type){
    const key=`cannon-${type}`;if(cache.has(key))return cache.get(key);
    const s=canvas(36,36),g=s.getContext('2d');
    const colors=type==='spin90'?['#b85d56','#df8d70','#753e44']:type==='quick'||type==='auto'?['#8974ba','#b7a0db','#54466e']:['#5e9185','#9cc3a1','#365853'];
    const rows=[[12,23],[10,25],[8,27],[7,28],[6,29],[5,30],[5,30],[4,31],[4,31],[4,31],[4,31],[4,31],[4,31],[5,30],[5,30],[6,29],[7,28],[8,27],[10,25],[12,23]];
    rows.forEach(([a,b],i)=>{const y=i+11;rect(g,ink,a,y,b-a+1,1);rect(g,colors[0],a+2,y,b-a-3,1);if(i>2&&i<15){rect(g,colors[1],a+2,y,2,1);rect(g,colors[2],b-4,y,3,1);}});
    // Broad open lip + very short neck, all attached to the rotating body.
    rect(g,ink,7,3,22,10);rect(g,ink,9,1,18,2);rect(g,ink,9,13,18,2);
    rect(g,'#a48054',8,5,20,6);rect(g,'#e2bd76',9,3,18,3);rect(g,'#f6dda0',10,3,15,1);rect(g,'#85633e',9,10,18,2);
    rect(g,ink,10,6,16,3);rect(g,'#253536',12,6,12,1);
    rect(g,colors[2],9,26,18,2);rect(g,colors[1],12,29,11,1);
    rect(g,'#e2bd76',7,18,2,3);rect(g,'#a48054',28,18,2,3);rect(g,'#e2bd76',16,29,3,2);
    // Strong central arrow: dark keyline then ivory pixels.
    rect(g,ink,15,16,6,11);rect(g,ink,11,18,14,4);rect(g,ink,13,16,10,4);
    rect(g,cream,17,15,2,10);rect(g,cream,15,17,6,3);rect(g,cream,13,19,10,2);
    cache.set(key,s);return s;
  }
  function tree(theme,variant=0){
    const key=`tree-${theme}-${variant}`;if(cache.has(key))return cache.get(key);
    const t=themes[theme],s=canvas(72,94),g=s.getContext('2d');
    rect(g,'#132b2d',16,82,44,5);rect(g,'#182c27',24,86,33,4);
    rect(g,'#1b2a29',30,34,15,51);rect(g,'#493b30',33,37,10,46);rect(g,'#736044',34,44,3,34);
    rect(g,'#283630',25,54,9,5);rect(g,'#736044',28,54,8,2);rect(g,'#283630',43,47,10,5);
    rect(g,'#31473b',25,81,8,5);rect(g,'#668255',29,80,5,3);rect(g,'#253d31',42,80,12,5);
    let seed=71+variant*137;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const clusters=[[34,14,19],[17,29,18],[47,29,22],[29,43,23],[52,45,15],[13,46,13]];
    for(const [cx,cy,r] of clusters){
      for(let y=-r;y<=r;y+=3){const w=Math.floor(Math.sqrt(Math.max(0,r*r-y*y))/3)*3;rect(g,t.deep,cx-w,cy+y,w*2+3,3);}
      for(let y=-r+3;y<r-3;y+=3){const w=Math.floor(Math.sqrt(Math.max(0,(r-3)**2-y*y))/3)*3;rect(g,t.leaf[0],cx-w,cy+y,w*2,3);}
      for(let j=0;j<25;j++){const x=cx-r+random()*r*2,y=cy-r+random()*r*1.6;if((x-cx)**2+(y-cy)**2<(r-4)**2)rect(g,t.leaf[j%3===0?2:1],Math.round(x/2)*2,Math.round(y/2)*2,3+Math.floor(random()*3),2);}
      rect(g,t.leaf[3],cx-7,cy-r+5,6,2);rect(g,t.leaf[2],cx-12,cy-r+7,8,2);
    }
    cache.set(key,s);return s;
  }
  function house(g,x,y,scale=2){
    g.save();g.translate(Math.round(x),Math.round(y));g.scale(scale,scale);
    rect(g,ink,-27,18,54,5);rect(g,'#87765a',-29,23,58,3);
    rect(g,ink,-23,-19,46,39);rect(g,'#936547',-20,-17,40,35);
    for(let y=-13;y<19;y+=6){rect(g,'#bc8c58',-20,y,40,2);rect(g,'#634b3d',-20,y+2,40,1);}
    for(let y=0;y<22;y++){const half=3+y*1.25;rect(g,ink,-half,-42+y,half*2,1);if(y>3)rect(g,'#557463',-half+3,-42+y,half*2-6,1);}
    for(let y=0;y<3;y++){rect(g,'#8ca16b',-16-y*5,-33+y*6,32+y*10,2);}
    rect(g,ink,-7,-5,15,26);rect(g,'#3c4541',-5,-3,11,23);rect(g,'#e8b864',3,8,2,2);
    for(const dx of [-16,12]){rect(g,ink,dx-2,-13,10,13);rect(g,'#f5c878',dx,-11,6,8);rect(g,'#fff0b0',dx,-11,3,4);rect(g,'#916a42',dx+2,-11,1,8);}
    rect(g,'#a77c51',-12,21,26,2);rect(g,ink,21,-41,9,16);rect(g,'#b18868',23,-39,5,13);
    g.restore();
  }
  function star(g,x,y,size=2,dim=false){const s=sprite(['....o....','...oYo...','...oYo...','oooYYYooo','.oYYYYYo.','..oYYYo..','.oYYoYYo.','.ooo.ooo.'],{o:dim?'#243733':'#795638',Y:dim?'#3e5149':'#ffe294'});g.drawImage(s,Math.round(x-4.5*size),Math.round(y-4*size),9*size,8*size);}
  function fern(g,x,y,s,t){g.save();g.translate(x,y);g.scale(s,s);rect(g,t.leaf[0],0,-12,2,13);for(let i=0;i<4;i++){rect(g,t.leaf[1],-7+i,-i*3,7-i,2);rect(g,t.leaf[2],2,-i*3-1,7-i,2);}g.restore();}
  function terrain(level){
    if(level.art)return level.art;
    let seed=83+level.cannons.length*101;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const trees=[],details=[];
    for(let y=-180;y<level.world.h+250;y+=145)for(let x=-180;x<level.world.w+250;x+=155){const p={x:x+rnd()*85,y:y+rnd()*85},d=C.corridorDistance(level,p);if(d>level.radius+92)trees.push({...p,v:Math.floor(rnd()*4),s:2+Math.floor(rnd()*2)*.35});}
    for(const e of level.edges)for(let j=1;j<e.points.length;j++){
      const a=e.points[j-1],b=e.points[j],len=C.distance(a,b),nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;
      for(let d=20;d<len;d+=44){const t=d/len;for(const side of [-1,1]){const offset=(level.radius+8+rnd()*25)*side;details.push({x:a.x+(b.x-a.x)*t+nx*offset,y:a.y+(b.y-a.y)*t+ny*offset,type:rnd()>.22?'plant':'mushroom',v:rnd()});}details.push({x:a.x+(b.x-a.x)*t+(rnd()-.5)*160,y:a.y+(b.y-a.y)*t+(rnd()-.5)*160,type:'stone',v:rnd()});}
    }
    trees.sort((a,b)=>a.y-b.y);level.art={trees,details};return level.art;
  }
  const visible=(p,cam,w,h,pad=220)=>p.x>cam.x-pad&&p.x<cam.x+w+pad&&p.y>cam.y-pad&&p.y<cam.y+h+pad;
  function world(g,level,run,cam,w,h,time,character,fx=[]){
    const t=themes[level.theme],env=terrain(level);g.imageSmoothingEnabled=false;
    rect(g,t.deep,0,0,w,h);g.save();g.translate(-Math.round(cam.x/2)*2,-Math.round(cam.y/2)*2);
    // Banks use the exact same polylines as collision. No decorative false tunnels.
    for(const [width,color] of [[level.radius*2+32,'#112725'],[level.radius*2+16,t.bank],[level.radius*2+5,t.moss],[level.radius*2-3,t.path]]){
      g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.beginPath();for(const e of level.edges){g.moveTo(e.points[0].x,e.points[0].y);e.points.slice(1).forEach(p=>g.lineTo(p.x,p.y));}g.stroke();
    }
    for(const d of env.details){if(!visible(d,cam,w,h))continue;
      if(d.type==='stone'){rect(g,t.pathLight,d.x,d.y,6+Math.floor(d.v*8),3);if(d.v>.6)rect(g,t.bank,d.x-2,d.y+3,9,2);}
      else if(d.type==='plant')fern(g,Math.round(d.x/2)*2,Math.round(d.y/2)*2,2,t);
      else {rect(g,ink,d.x,d.y,6,12);rect(g,'#dfc99a',d.x+2,d.y+2,2,8);rect(g,'#8c5147',d.x-6,d.y-2,18,6);rect(g,'#e6a06d',d.x-4,d.y-4,12,4);rect(g,'#ffe3b0',d.x-2,d.y-4,4,2);}
    }
    for(const v of env.trees){if(visible(v,cam,w,h))g.drawImage(tree(level.theme,v.v),Math.round(v.x-36*v.s),Math.round(v.y-50*v.s),72*v.s,94*v.s);}
    for(const rail of level.ice){g.lineCap='square';g.strokeStyle='#285d78';g.lineWidth=27;g.beginPath();g.moveTo(rail.a.x,rail.a.y+20);g.lineTo(rail.b.x,rail.b.y+20);g.stroke();g.strokeStyle='#96d7e2';g.lineWidth=15;g.stroke();g.strokeStyle='#eff9dc';g.lineWidth=4;g.beginPath();g.moveTo(rail.a.x,rail.a.y+10);g.lineTo(rail.b.x,rail.b.y+10);g.stroke();const len=C.distance(rail.a,rail.b);for(let d=20;d<len;d+=48){rect(g,'#518fa9',rail.a.x+(rail.b.x-rail.a.x)*d/len,rail.a.y+20,12,4);}label(g,rail.a.x,rail.a.y+65,'ICE →','#b7e9ed');}
    for(const gate of level.gates){
      const closed=C.gateClosed(gate,run.clock),phase=(run.clock+gate.phase)%gate.period,len=C.distance(gate.a,gate.b),nx=(gate.b.x-gate.a.x)/len,ny=(gate.b.y-gate.a.y)/len;
      for(let i=0;i<=len;i+=12){if(!closed&&i>36&&i<len-36)continue;const x=gate.a.x+nx*i,y=gate.a.y+ny*i;rect(g,ink,x-8,y-8,16,16);rect(g,closed?'#bd775e':'#679f82',x-5,y-5,10,10);rect(g,'#e0bd7b',x-2,y-7,4,3);}
      const x=(gate.a.x+gate.b.x)/2,y=(gate.a.y+gate.b.y)/2;label(g,x,y-55,closed?`문 열림 ${(gate.closed-phase).toFixed(1)}`:`통과 ${(gate.period-phase).toFixed(1)}`,closed?'#f2b296':'#c6eac5');
    }
    level.stars.forEach((s,i)=>{if(run.stars.has(i))return;const bob=Math.round(Math.sin(time*3+i)*3)*2;star(g,s.x,s.y+bob,4);rect(g,'#fff2b6',s.x-29,s.y-20+bob,4,4);if(Math.sin(time*5+i)>.3)rect(g,'#fff2b6',s.x+24,s.y+10+bob,4,4);});
    house(g,level.goal.x,level.goal.y,2.5);label(g,level.goal.x,level.goal.y-132,'HOME',t.accent);
    level.cannons.forEach((c,i)=>{
      if(!visible(c,cam,w,h,90))return;
      const occupied=run.state==='loaded'&&run.active===i,ang=occupied?C.angle(c,run.loadedTime):(c.type==='quick'||c.type==='auto'?c.a:-Math.PI/2);
      rect(g,'#253e34',c.x-27,c.y+36,54,6);
      if(occupied){const n=c.type==='spin90'?4:8;for(let k=0;k<n;k++){const a=-Math.PI/2-k*Math.PI*2/n;rect(g,Math.abs(C.deltaAngle(a,ang))<.01?cream:'#93a390',c.x+Math.cos(a)*53-2,c.y+Math.sin(a)*53-2,4,4);}}
      g.save();g.translate(Math.round(c.x/2)*2,Math.round(c.y/2)*2);g.rotate(ang+Math.PI/2);const bounce=occupied?1+Math.max(0,.14-run.loadedTime)*.4:1;g.scale(bounce,bounce);g.drawImage(cannon(c.type),-36,-36,72,72);g.restore();
      label(g,c.x,c.y+65,c.type==='spin90'?'4':c.type==='spin45'?'8':c.type==='auto'?'3·2·1':'0.5',occupied?cream:'#b9c8af');
      if(occupied&&(c.type==='quick'||c.type==='auto')){const duration=c.type==='quick'?.5:1.5;rect(g,ink,c.x-30,c.y-59,60,8);rect(g,'#cfb9ed',c.x-28,c.y-57,56*(1-run.loadedTime/duration),4);}
      if(i===0&&!run.started)label(g,c.x,c.y-84,'START',t.accent);
    });
    for(const p of fx){g.globalAlpha=Math.max(0,p.life/p.max);rect(g,p.color,p.x,p.y,p.size,p.size);}g.globalAlpha=1;
    if(run.state!=='loaded'&&run.state!=='dead'&&run.state!=='clear'){
      const p=run.player;g.save();g.translate(Math.round(p.x/2)*2,Math.round(p.y/2)*2);g.rotate(C.flightAngle(p));g.drawImage(bird(character.skin,character.hat,Math.floor(time*10)%2),-19,-17,40,34);g.restore();
    }
    if(run.state==='clear')g.drawImage(bird(character.skin,character.hat),level.goal.x-20,level.goal.y-22,40,34);
    g.restore();
    // Drifting pollen stays behind the HUD, without glow or blur.
    for(let i=0;i<18;i++){const x=((i*139+time*(5+i%3))%w+w)%w,y=((i*97+Math.sin(time*.4+i)*23)%h+h)%h;g.globalAlpha=.15+(i%3)*.08;rect(g,t.mist,x,y,2,2);}g.globalAlpha=1;
  }
  function label(g,x,y,text,color=cream){g.font='bold 14px "Malgun Gothic", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=ink;g.fillText(text,Math.round(x)+2,Math.round(y)+2);g.fillStyle=color;g.fillText(text,Math.round(x),Math.round(y));}
  function map(g,level,width,height,run=null){
    const t=themes[level.theme],pad=35,scale=Math.min((width-pad*2)/level.world.w,(height-pad*2)/level.world.h),ox=(width-level.world.w*scale)/2,oy=(height-level.world.h*scale)/2;
    g.clearRect(0,0,width,height);rect(g,t.deep,0,0,width,height);g.save();g.translate(ox,oy);g.scale(scale,scale);
    g.lineCap='round';g.lineJoin='round';
    for(const e of level.edges){g.strokeStyle=e.shortcut?t.leaf[2]:t.pathLight;g.lineWidth=level.radius*1.3;g.beginPath();g.moveTo(e.points[0].x,e.points[0].y);e.points.slice(1).forEach(p=>g.lineTo(p.x,p.y));g.stroke();}
    for(const r of level.ice){g.strokeStyle='#a4e6ef';g.lineWidth=45;g.beginPath();g.moveTo(r.a.x,r.a.y);g.lineTo(r.b.x,r.b.y);g.stroke();}
    for(const gate of level.gates){g.strokeStyle='#df9b7b';g.lineWidth=32;g.beginPath();g.moveTo(gate.a.x,gate.a.y);g.lineTo(gate.b.x,gate.b.y);g.stroke();}
    level.cannons.forEach((c,i)=>{g.fillStyle=c.type==='spin90'?'#df8d70':c.type==='quick'?'#b7a0db':'#b9d5ac';g.beginPath();g.arc(c.x,c.y,Math.max(42,4/scale),0,Math.PI*2);g.fill();if(width>400){g.fillStyle=ink;g.textAlign='center';g.textBaseline='middle';g.font=`bold ${10/scale}px monospace`;g.fillText(i+1,c.x,c.y);}});
    level.stars.forEach((s,i)=>{if(!run?.stars.has(i))star(g,s.x,s.y,Math.max(12,1.5/scale));});
    house(g,level.goal.x,level.goal.y,Math.max(3,.28/scale));
    if(run){const p=run.player;g.strokeStyle=cream;g.lineWidth=2/scale;g.beginPath();g.arc(p.x,p.y,11/scale,0,Math.PI*2);g.stroke();}
    g.restore();
  }
  function title(g,w,h,time,character){
    rect(g,'#b8c9ac',0,0,w,h);rect(g,'#d4d7ae',0,h*.32,w,h*.4);
    // Sun, stepped clouds and sparse dithering keep the palette intentionally small.
    for(let y=-17;y<=17;y++){const half=Math.floor(Math.sqrt(17*17-y*y));rect(g,'#e7dfac',w*.67-half,h*.23+y,half*2,1);}
    for(let i=0;i<6;i++){const x=(i*83)%w,y=20+i%3*14;rect(g,'#cdd3b2',x,y,30+i%3*9,3);rect(g,'#cdd3b2',x+7,y-3,20,3);}
    // Deliberate pixel clusters and staggered depth planes, not a blurred picture.
    for(let layer=0;layer<3;layer++){
      const color=['#8caaa1','#668d85','#416b65'][layer];
      for(let i=0;i<16;i++){const x=i*39-10+layer*13,base=h*.68+layer*12,height=80+(i*23%55);rect(g,color,x,base-height,5,height);for(let j=0;j<7;j++){const spread=5+j*3;rect(g,color,x-spread,base-height+j*11,spread*2+5,11);rect(g,color,x-spread+3,base-height+j*11-3,spread*2-2,3);}if(layer===2){rect(g,'#527c6e',x,base-height+10,2,height-20);for(let j=0;j<6;j++)rect(g,'#527c6e',x-6-j,base-height+12+j*13,8+j,2);}}
    }
    rect(g,'#264e41',0,h*.79,w,h*.21);rect(g,'#3e654a',0,h*.82,w,h*.18);
    for(let i=0;i<210;i++){const x=(i*53+17)%w,y=h*.79+(i*29)%Math.floor(h*.21);rect(g,i%3?'#4c7150':'#5d7d54',x,y,3+i%3,1);}
    for(let y=Math.floor(h*.74);y<h;y++){const width=8+(y-h*.74)*.54,x=w*.70-(y-h*.74)*.2;rect(g,'#93866a',x-width,y,width*2,1);if(y%7===0)rect(g,'#b4a07a',x-width+4,y,width,1);}
    house(g,w*.73,h*.75,1.0);
    for(let i=0;i<6;i++){const x=w*.8+i*8,y=h*.79;rect(g,ink,x,y-10,3,13);rect(g,'#8c7954',x+1,y-9,1,12);rect(g,'#a59162',x-1,y-6,11,2);}
    for(const [x,y,s,v] of [[-24,90,2.5,0],[45,22,2,2],[w-78,25,2.2,1],[w-8,105,2.2,3]])g.drawImage(tree('dawn',v),x-36*s,y-40*s,72*s,94*s);
    for(let i=0;i<29;i++){const x=(i*71)%w,y=h*.88+(i*19)%40;fern(g,x,y,1, themes.dawn);if(i%3===0){rect(g,ink,x+10,y-5,2,5);rect(g,'#e1cd9a',x+10,y-4,1,4);rect(g,'#c78c65',x+7,y-7,7,3);rect(g,'#edc497',x+9,y-7,2,1);}}
    const bx=w*.73,by=h*.90;rect(g,'#294837',bx-15,by+7,55,5);g.drawImage(bird(character.skin,character.hat,Math.floor(time*2)%2),bx,by-13,40,34);
    g.save();g.translate(bx-26,by-2);g.rotate(Math.PI/4);g.drawImage(cannon('spin45'),-20,-20,40,40);g.restore();
    for(let i=0;i<15;i++)rect(g,i%2?'#e2cd8e':'#c9db9c',(i*89+Math.floor(time*4))%w,35+(i*29)%Math.floor(h*.8),1,1);
  }
  root.KiwiArt={bird,cannon,star,house,world,map,title,skins,themes,canvas};
})(globalThis);
