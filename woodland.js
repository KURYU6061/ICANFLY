(() => {
  'use strict';
  const $=id=>document.getElementById(id),C=KiwiCore,A=KiwiArt,levels=KiwiLevels.levels;
  const SAVE_KEY='kiwi-cannon-save-v2',screens=[...document.querySelectorAll('.screen')];
  const skinNames={forest:'이끼빛 키위',berry:'산딸기 키위',sky:'하늘빛 키위',sun:'햇살 키위'},hatNames={none:'그대로',cap:'탐험 모자',feather:'숲의 깃털'};
  const qaMode=new URLSearchParams(location.search).has('qa');
  let save=loadSave(),screen='home',selected=0,levelIndex=0,run=null,attempt=1,modal=null,previousFocus=null;
  let cam={x:0,y:0},view={w:1280,h:720},effects=[],messageTime=0,last=performance.now(),visualTime=0,shake=0,recordable=true;
  const canvas=$('gameCanvas'),g=canvas.getContext('2d'),title=$('titleCanvas'),tg=title.getContext('2d');
  function loadSave(){
    const defaults={records:{},settings:{master:80,bgm:45,se:80,scanlines:false},character:{skin:'forest',hat:'none'}};
    try{
      const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!v||typeof v!=='object')return defaults;
      for(const k of ['master','bgm','se'])if(Number.isFinite(v.settings?.[k]))defaults.settings[k]=C.clamp(v.settings[k],0,100);
      defaults.settings.scanlines=v.settings?.scanlines===true;
      if(Object.hasOwn(skinNames,v.character?.skin))defaults.character.skin=v.character.skin;
      if(Object.hasOwn(hatNames,v.character?.hat))defaults.character.hat=v.character.hat;
      if(v.records&&typeof v.records==='object')for(const [key,r] of Object.entries(v.records)){
        if(!r||!Number.isFinite(r.bestTime)||r.bestTime<0)continue;
        const rawFlags=r.conditions||r.flags;
        const flags=Array.isArray(rawFlags)&&rawFlags.length===3?rawFlags.map(Boolean):[0,1,2].map(i=>i<C.clamp(r.stars??r.bestStars??0,0,3));
        defaults.records[key]={bestTime:r.bestTime,conditions:flags,stars:flags.filter(Boolean).length,medalTime:Number.isFinite(r.medalTime)?r.medalTime:r.bestTime,clears:Math.max(1,r.clears||1)};
      }
    }catch(error){console.warn('Save could not be read; using safe defaults.',error);}
    return defaults;
  }
  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(error){console.warn('Progress storage unavailable.',error);showMessage('저장 공간을 사용할 수 없어 이번 기록은 이 창에서만 유지됩니다.',5);}}
  const formatTime=n=>{if(!Number.isFinite(n))return '--:--.---';const ms=Math.floor(n*1000);return `${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
  const flagsHTML=flags=>flags.map(v=>`<span class="${v?'filled':''}">★</span>`).join('');
  function conditionsHTML(level,flags=[]){return level.conditions.map((c,i)=>`<div class="condition ${flags[i]?'earned':''}"><span class="star">★</span><span>${c.type==='time'?`${c.value}초 안에 클리어`:`한 번에 별 ${level.stars.length}개 모두 획득!`}</span><em>${flags[i]?'달성':'×1'}</em></div>`).join('');}
  function showScreen(name){
    closeModal();screen=name;screens.forEach(s=>{const active=s.id===`${name}Screen`;s.classList.toggle('active',active);s.inert=!active;s.setAttribute('aria-hidden',active?'false':'true');});
    if(run)run.paused=name!=='game';
    if(name==='stage')renderStages();if(name==='customize')renderCharacter();if(name==='settings')syncSettings();
    audioMode();last=performance.now();
  }
  function renderStages(){
    $('totalStars').textContent=`${levels.reduce((n,_,i)=>n+(save.records[i]?.stars||0),0)} / ${levels.length*3}`;
    $('stageGrid').innerHTML='';
    levels.forEach((l,i)=>{
      const button=document.createElement('button');button.type='button';button.className=`stage-tile ${i===selected?'selected':''}`;
      button.setAttribute('aria-label',`${i+1}. ${l.name}, 별 ${save.records[i]?.stars||0}개`);button.setAttribute('aria-pressed',i===selected?'true':'false');
      const mini=document.createElement('canvas');mini.width=220;mini.height=100;mini.setAttribute('aria-hidden','true');button.append(mini);
      button.insertAdjacentHTML('beforeend',`<div class="tile-heading"><strong>${String(i+1).padStart(2,'0')}</strong><small>${l.name}</small></div><span class="tile-stars">${flagsHTML([0,1,2].map(j=>j<(save.records[i]?.stars||0)))}</span>`);
      button.addEventListener('click',()=>{selected=i;document.querySelectorAll('.stage-tile').forEach((b,j)=>{b.classList.toggle('selected',i===j);b.setAttribute('aria-pressed',i===j?'true':'false');});renderDetail();sound('menu');});
      $('stageGrid').append(button);A.map(mini.getContext('2d'),l,220,100);
    });renderDetail();
  }
  function renderDetail(){
    const l=levels[selected],r=save.records[selected];$('detailNumber').textContent=String(selected+1).padStart(2,'0');$('detailName').textContent=l.name;$('detailNote').textContent=l.note;
    $('detailBiome').textContent=`${A.themes[l.theme].label} · 난이도 ${'◆'.repeat(l.difficulty)}${'◇'.repeat(5-l.difficulty)}`;
    $('conditionList').innerHTML=conditionsHTML(l,r?.conditions);$('bestTime').textContent=formatTime(r?.bestTime);
    A.map($('detailMap').getContext('2d'),l,480,190);
  }
  function renderCharacter(){
    $('skinOptions').innerHTML='';$('hatOptions').innerHTML='';
    Object.entries(skinNames).forEach(([id,name])=>{const b=document.createElement('button');b.type='button';b.className=`swatch ${save.character.skin===id?'selected':''}`;b.innerHTML=`<i style="background:${A.skins[id][0]}"></i>${name}`;b.setAttribute('aria-pressed',save.character.skin===id);b.onclick=()=>{save.character.skin=id;renderCharacter();sound('menu');};$('skinOptions').append(b);});
    Object.entries(hatNames).forEach(([id,name])=>{const b=document.createElement('button');b.type='button';b.className=`hat-option ${save.character.hat===id?'selected':''}`;b.textContent=name;b.setAttribute('aria-pressed',save.character.hat===id);b.onclick=()=>{save.character.hat=id;renderCharacter();sound('menu');};$('hatOptions').append(b);});
    $('skinName').textContent=skinNames[save.character.skin];drawCharacter();
  }
  function drawCharacter(){const c=$('customKiwi'),cx=c.getContext('2d');cx.imageSmoothingEnabled=false;cx.clearRect(0,0,c.width,c.height);cx.fillStyle='#172e29';cx.fillRect(44,90,79,6);cx.drawImage(A.bird(save.character.skin,save.character.hat,Math.floor(visualTime*2)%2),42,30,80,68);}
  function syncSettings(){for(const key of ['master','bgm','se']){$(`${key}Volume`).value=save.settings[key];$(`${key}Value`).textContent=save.settings[key];$(`pause${key[0].toUpperCase()+key.slice(1)}`).value=save.settings[key];}$('scanlineToggle').checked=save.settings.scanlines;$('scanlines').style.display=save.settings.scanlines?'block':'none';audioMode();}
  function resize(){
    const r=$('gameFrame').getBoundingClientRect();if(r.width<1||r.height<1)return;
    canvas.width=Math.round(r.width/2);canvas.height=Math.round(r.height/2);
    view.w=Math.max(800,r.width);view.h=view.w*canvas.height/canvas.width;g.imageSmoothingEnabled=false;
  }
  new ResizeObserver(resize).observe($('gameFrame'));
  function startStage(index,newAttempt=true){
    const errors=C.validate(levels[index]);if(errors.length)throw new Error(`Invalid stage ${index+1}: ${errors.join(', ')}`);
    levelIndex=index;selected=index;if(newAttempt)attempt=1;recordable=!qaMode;run=C.createRun(levels[index]);effects=[];shake=0;showScreen('game');resize();moveCamera(1,true);updateHUD();
    showMessage(`${String(index+1).padStart(2,'0')} · ${levels[index].name}`,2.2);canvas.tabIndex=-1;canvas.focus({preventScroll:true});
  }
  function retry(){const allowRecord=recordable;attempt++;startStage(levelIndex,false);recordable=allowRecord;showMessage('다시, 한 번의 멋진 비행!',1.1);}
  function showMessage(text,seconds=2){$('message').textContent=text;messageTime=seconds;$('message').classList.add('show');}
  function openModal(name){
    if(screen!=='game'||!run||run.state==='clear'&&name!=='result')return;
    previousFocus=document.activeElement;modal=name;run.paused=true;
    for(const id of ['pause','map','result']){$(`${id}Overlay`).classList.toggle('open',id===name);$(`${id}Overlay`).setAttribute('aria-hidden',id===name?'false':'true');}
    if(name==='map'){const m=$('mapCanvas');A.map(m.getContext('2d'),run.level,m.width,m.height,run);}
    syncSettings();audioMode();$(name==='pause'?'resumeButton':name==='map'?'closeMapButton':'nextStageButton').focus();
  }
  function closeModal(){
    modal=null;for(const id of ['pause','map','result']){$(`${id}Overlay`).classList.remove('open');$(`${id}Overlay`).setAttribute('aria-hidden','true');}
    if(run)run.paused=screen!=='game';last=performance.now();audioMode();
    if(previousFocus?.isConnected&&screen==='game')previousFocus.focus({preventScroll:true});previousFocus=null;
  }
  function finish(){
    const conditions=C.evaluate(run.level,run.time,run.stars.size),old=save.records[levelIndex];
    const isBest=!old||run.time<old.bestTime;
    if(recordable){save.records[levelIndex]=C.mergeRecord(old,run.time,conditions);persist();}
    $('resultStars').innerHTML=flagsHTML(conditions);$('resultTime').textContent=formatTime(run.time);
    $('resultRecord').textContent=recordable?`${isBest?'새로운 최단 기록! · ':''}수집 별 ${run.stars.size} / ${run.level.stars.length} · ${run.shots}회 발사`:'검증 모드 · 기록을 저장하지 않습니다.';
    $('resultConditions').innerHTML=conditionsHTML(run.level,conditions);$('nextStageButton').textContent=levelIndex===levels.length-1?'모든 숲길 둘러보기 →':'다음 숲길 →';
    openModal('result');
  }
  function updateHUD(){
    if(!run)return;const l=run.level,c=l.cannons[run.active],auto=c.type==='quick'||c.type==='auto';
    $('timerLabel').textContent=formatTime(run.time);$('stageLabel').textContent=`${String(levelIndex+1).padStart(2,'0')} · ${l.name}`;$('attemptLabel').textContent=String(attempt).padStart(2,'0');
    $('starCounter').querySelector('strong').textContent=`× ${run.stars.size}${l.stars.length?` / ${l.stars.length}`:''}`;
    $('chainLabel').textContent=`CANNON ${run.active+1} / ${l.cannons.length}`;$('progressFill').style.width=`${(run.state==='clear'?1:run.visited.size/l.cannons.length)*100}%`;
    $('fireButton').disabled=run.state!=='loaded'||auto||!!modal;
    $('fireButton').lastElementChild.textContent=auto&&run.state==='loaded'?'자동 발사':run.state==='flying'||run.state==='sliding'?'비행 중':'발사 ↗';
    $('hudTip').querySelector('span').textContent=run.state==='sliding'?'얼음이 다음 대포로 이어줍니다':auto&&run.state==='loaded'?'입장 0.5초 후 자동으로 발사됩니다':'방향이 맞으면 Space 또는 화면 터치';
    const nextGate=l.gates.find(g=>l.edges[g.edge].from===run.active);
    const phase=nextGate?(run.clock+nextGate.phase)%nextGate.period:0;
    const gateHint=nextGate?`\n앞의 가시문: ${C.gateClosed(nextGate,run.clock)?`열림까지 ${(nextGate.closed-phase).toFixed(1)}초`:`통과 가능 ${(nextGate.period-phase).toFixed(1)}초`}`:'';
    $('directionHint').textContent=run.state==='loaded'?`${c.type==='spin90'?'4방향 · 90°':c.type==='spin45'?'8방향 · 45°':'고정 방향 · 자동'}${!run.started?'\n첫 발사부터 시간을 잽니다.':''}${gateHint}`:run.state==='sliding'?'ICE · 속도를 유지하며 슬라이드':run.state==='clear'?'집에 도착했어요!':`별 ${run.stars.size} / ${l.stars.length} · 집을 향해 비행 중`;
  }
  function moveCamera(dt,snap=false){
    const p=run.player,look=run.state==='flying'?90:0;
    const tx=C.clamp(p.x-view.w*.45+Math.sign(p.vx)*look,0,Math.max(0,run.level.world.w-view.w));
    const ty=C.clamp(p.y-view.h*.51+Math.sign(p.vy)*look*.5,0,Math.max(0,run.level.world.h-view.h));
    const k=snap?1:1-Math.exp(-dt*7);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;
  }
  function burst(x,y,count,colors,speed=100){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=(.3+Math.random())*speed,life=.25+Math.random()*.4;effects.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,max:life,size:2+Math.floor(Math.random()*3)*2,color:colors[i%colors.length]});}}
  function consumeEvents(){for(const e of run.events.splice(0)){
    sound(e.type);
    if(e.type==='fire'){burst(e.x,e.y,12,['#eadfbb','#bcbd99'],90);shake=2;}
    if(e.type==='catch')burst(e.x,e.y,12,['#dbdda3','#9cbfa5'],110);
    if(e.type==='star')burst(e.x,e.y,30,['#fff0be','#edc774','#e9ac64'],170);
    if(e.type==='ice')burst(e.x,e.y,16,['#b8e8e7','#dff3ce'],125);
    if(e.type==='fail'){shake=6;burst(e.x,e.y,22,['#cbd59c','#91ae71'],160);showMessage(e.reason==='gate'?'가시문이 닫혀 있어요. 열리는 순간을 기다려 보세요.':'방향을 확인하고 다시 도전!',.8);}
    if(e.type==='clear'){burst(e.x,e.y,70,['#e4cb82','#cfda9c','#f4edc4'],220);finish();}
  }}
  function shoot(){if(screen==='game'&&!modal&&run){ensureAudio();C.fire(run);consumeEvents();updateHUD();}}
  function tick(now){
    const raw=Math.max(0,(now-last)/1000);last=now;
    // A suspended tab or debugger break must not kill a run or silently lose timer time.
    if(raw>.6&&screen==='game'&&!modal&&run?.started&&run.state!=='clear')openModal('pause');
    const dt=Math.min(raw,.6);
    if(screen==='home'){visualTime+=dt;const box=$('homeScreen').getBoundingClientRect(),tw=box.width<650?320:480,th=Math.round(tw*box.height/box.width);if(title.width!==tw||title.height!==th){title.width=tw;title.height=th;}A.title(tg,title.width,title.height,visualTime,save.character);}
    else if(screen==='customize'){visualTime+=dt;drawCharacter();}
    else if(screen==='game'&&run){
      if(!modal){visualTime+=dt;C.step(run,dt);consumeEvents();if(run.state==='dead'&&run.deathTime>.55)retry();moveCamera(dt);shake=Math.max(0,shake-dt*18);messageTime=Math.max(0,messageTime-dt);
        effects=effects.filter(p=>p.life>0);for(const p of effects){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*90;}
        if(run.state==='flying'&&Math.random()<.7)burst(run.player.x,run.player.y,1,['#d9deab'],12);
      }
      $('message').classList.toggle('show',messageTime>0);updateHUD();
      g.setTransform(canvas.width/view.w,0,0,canvas.height/view.h,0,0);g.imageSmoothingEnabled=false;
      A.world(g,run.level,run,{x:cam.x+(modal?0:Math.sin(now*.08)*shake),y:cam.y},view.w,view.h,visualTime,save.character,effects);
    }
    music(dt);requestAnimationFrame(tick);
  }
  // Tiny original chiptune score and sound cues, with separate live gain buses.
  let audio=null,buses=null,musicTime=0,musicNote=0;
  function ensureAudio(){try{if(!audio){audio=new (window.AudioContext||window.webkitAudioContext)();const master=audio.createGain(),bgm=audio.createGain(),se=audio.createGain();bgm.connect(master);se.connect(master);master.connect(audio.destination);buses={master,bgm,se};audioMode();}if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(error){console.warn('Audio unavailable',error);}}
  function audioMode(){if(!audio)return;const mute=document.hidden||modal==='pause'||modal==='map';for(const k of ['master','bgm','se'])buses[k].gain.setValueAtTime(save.settings[k]/100*(k==='master'&&mute?0:1),audio.currentTime);}
  function tone(f,d=.1,type='triangle',gain=.08,delay=0,channel='se',slide=1){if(!audio)return;const now=audio.currentTime+delay,o=audio.createOscillator(),a=audio.createGain();o.type=type;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),now+d);a.gain.setValueAtTime(.0001,now);a.gain.linearRampToValueAtTime(gain,now+.008);a.gain.exponentialRampToValueAtTime(.0001,now+d);o.connect(a).connect(buses[channel]);o.start(now);o.stop(now+d+.01);o.onended=()=>{o.disconnect();a.disconnect();};}
  function cannonPop(){
    if(!audio)return;
    const now=audio.currentTime,duration=.14,length=Math.ceil(audio.sampleRate*duration);
    const buffer=audio.createBuffer(1,length,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++){const fade=1-i/length;data[i]=(Math.random()*2-1)*fade*fade;}
    const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    noise.buffer=buffer;filter.type='lowpass';filter.Q.value=.75;filter.frequency.setValueAtTime(1250,now);filter.frequency.exponentialRampToValueAtTime(260,now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.105,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    noise.connect(filter).connect(gain).connect(buses.se);noise.start(now);noise.stop(now+duration+.01);
    noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};
    tone(120,.145,'triangle',.14,0,'se',.34);
    tone(920,.025,'square',.018,0,'se',.55);
  }
  function sound(type){
    if(type==='menu')tone(420,.08,'triangle',.05);
    if(type==='fire')cannonPop();
    if(type==='catch'){tone(440,.12,'sine',.08);tone(660,.14,'triangle',.06,.06);}
    if(type==='fail')tone(140,.3,'triangle',.16,0,'se',.35);
    if(type==='star')[784,988,1318,1568].forEach((n,i)=>tone(n,.3,'sine',.1,i*.055));
    if(type==='ice')tone(880,.22,'sine',.065,0,'se',1.5);
    if(type==='clear')[523,659,784,1047].forEach((n,i)=>tone(n,.28,'triangle',.10,i*.12));
  }
  function music(dt){if(!audio||modal||document.hidden)return;musicTime-=dt;if(musicTime>0)return;musicTime=.28;const notes=[64,0,67,71,0,67,64,62,60,0,64,67,0,64,62,0,59,0,62,67,0,62,59,57,55,0,59,62,0,59,62,0];const n=notes[musicNote%notes.length];if(n)tone(440*2**((n-69)/12),.25,'triangle',.038,0,'bgm');if(musicNote%4===0)tone(440*2**(([48,45,43,47][Math.floor(musicNote/8)%4]-69)/12),.8,'sine',.04,0,'bgm');musicNote++;}
  document.addEventListener('pointerdown',ensureAudio,{once:true});document.addEventListener('keydown',ensureAudio,{once:true});
  $('startButton').onclick=()=>showScreen('stage');$('customizeButton').onclick=()=>showScreen('customize');$('settingsButton').onclick=()=>showScreen('settings');
  document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{persist();showScreen(b.dataset.back);});
  $('playStageButton').onclick=()=>startStage(selected);$('saveCustomButton').onclick=()=>{persist();showScreen('home');};$('saveSettingsButton').onclick=()=>{persist();showScreen('home');};
  for(const key of ['master','bgm','se'])for(const id of [`${key}Volume`,`pause${key[0].toUpperCase()+key.slice(1)}`])$(id).addEventListener('input',e=>{save.settings[key]=Number(e.target.value);syncSettings();persist();});
  $('scanlineToggle').onchange=e=>{save.settings.scanlines=e.target.checked;syncSettings();persist();};
  $('fireButton').onclick=shoot;canvas.addEventListener('pointerdown',e=>{if(e.button===0){e.preventDefault();shoot();}});
  $('pauseButton').onclick=()=>openModal('pause');$('resumeButton').onclick=closeModal;$('mapButton').onclick=()=>openModal('map');$('closeMapButton').onclick=closeModal;
  for(const id of ['restartButton','pauseRestartButton','resultRetryButton'])$(id).onclick=retry;
  for(const id of ['exitStageButton','resultExitButton'])$(id).onclick=()=>showScreen('stage');
  $('nextStageButton').onclick=()=>levelIndex+1<levels.length?startStage(levelIndex+1):showScreen('stage');
  document.addEventListener('keydown',e=>{
    if(screen!=='game')return;if(e.repeat)return;
    if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();if(modal==='result'){if(e.key==='Escape')showScreen('stage');else trapFocus(e);}else modal?closeModal():openModal('pause');return;}
    if(modal)return;const onControl=e.target instanceof HTMLElement&&['BUTTON','INPUT'].includes(e.target.tagName);
    if((e.code==='Space'||e.code==='Enter')&&!onControl){e.preventDefault();shoot();}
    if(e.code==='KeyR'&&!onControl){e.preventDefault();retry();}if(e.code==='KeyM'&&!onControl){e.preventDefault();openModal('map');}
  });
  function trapFocus(e){const buttons=[...$('resultOverlay').querySelectorAll('button')],i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='game'&&!modal&&run.started&&run.state!=='clear')openModal('pause');audioMode();});
  // Opt-in QA mode, read-only snapshot plus unrecorded simulation. Never touches real records.
  if(qaMode){
    const test=document.createElement('button');test.id='qaSolve';test.textContent='QA · 현재 맵 자동 검증';test.className='text-button';
    // The UI-only test button is deliberately opt-in and cannot save a record.
    document.querySelector('.bottombar').append(test);
    test.onclick=()=>{
      closeModal();recordable=false;let guard=0;
      while(run.state!=='clear'&&run.state!=='dead'&&guard++<24000){
        const l=run.level;
        if(run.state==='loaded'){
          const c=l.cannons[run.active],e=l.edges.find(e=>e.from===run.active),p=e.points[1],a=Math.atan2(p.y-c.y,p.x-c.x);
          const safe=l.gates.filter(g=>g.edge===l.edges.indexOf(e)).every(g=>{const mid={x:(g.a.x+g.b.x)/2,y:(g.a.y+g.b.y)/2},arrival=run.clock+(C.distance(c,mid)-43)/C.SPEED;return [-.12,0,.12].every(m=>!C.gateClosed(g,arrival+m));});
          if(safe&&Math.abs(C.deltaAngle(C.angle(c,run.loadedTime),a))<1e-5)C.fire(run);
        }
        C.step(run,1/120);
      }
      moveCamera(1,true);consumeEvents();updateHUD();
    };
    window.KiwiQA={
    snapshot:()=>({screen,stage:levelIndex,state:run?.state,active:run?.active,time:run?.time,stars:run?.stars.size,paused:run?.paused,modal,angle:run?.state==='loaded'?C.angle(run.level.cannons[run.active],run.loadedTime):null}),
    start:i=>{startStage(i);recordable=false;},
    simulate:seconds=>{if(!run||modal)return;recordable=false;C.step(run,seconds);consumeEvents();updateHUD();},
    shoot,levels:()=>levels.map(l=>({name:l.name,errors:C.validate(l)}))
    };
  }
  syncSettings();showScreen('home');A.title(tg,title.width,title.height,0,save.character);requestAnimationFrame(tick);
})();
