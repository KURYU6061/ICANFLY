/* Authored routes use an 800px compass grid. Every launch is an exact legal angle. */
(function (root) {
  'use strict';
  const P = (x, y) => ({ x, y });
  const themes = {
    dawn: { label:'이슬 숲', sky:'#122f33', deep:'#102b24', leaf:['#1c4c38','#286849','#408456','#79a35d'], bank:'#30543c', moss:'#789557', path:'#52634c', pathLight:'#68745a', accent:'#e7c978', mist:'#d6eaca' },
    amber: { label:'노을 숲', sky:'#322d38', deep:'#302e29', leaf:['#41452b','#6e6538','#948049','#c19d5d'], bank:'#564c33', moss:'#b49c60', path:'#6f6853', pathLight:'#847b60', accent:'#ffcc88', mist:'#ffcfaa' },
    frost: { label:'서리 숲', sky:'#142d44', deep:'#153444', leaf:['#204951','#32656c','#57848a','#99bdb3'], bank:'#3a6270', moss:'#9dcbd0', path:'#547584', pathLight:'#6e8c9a', accent:'#a2eeff', mist:'#b9eaff' },
    moon: { label:'달빛 숲', sky:'#181c35', deep:'#182436', leaf:['#26364e','#354d63','#536d7d','#779c9b'], bank:'#32435e', moss:'#648993', path:'#4e6175', pathLight:'#60798c', accent:'#c7b8ff', mist:'#aaafff' }
  };
  function build(name, note, theme, difficulty, rows, options = {}) {
    const scale = options.scale || 800, margin = 320;
    const points = rows.map(r => P(r[0] * scale, r[1] * scale));
    const minX = Math.min(...points.map(p=>p.x)), minY = Math.min(...points.map(p=>p.y));
    points.forEach(p=>{p.x += margin-minX; p.y += margin-minY;});
    const cannons = points.slice(0,-1).map((p,i)=>({...p,type:rows[i][2] || 'spin45', a:-Math.PI/2}));
    const goal=points.at(-1), edges=[];
    for(let i=0;i<cannons.length;i++) {
      const bend=options.ice?.[i];
      const via=bend ? P(bend[0]*scale+margin-minX,bend[1]*scale+margin-minY) : null;
      edges.push({from:i,to:i===cannons.length-1?'goal':i+1,points:via?[points[i],via,points[i+1]]:[points[i],points[i+1]],ice:!!via});
    }
    // Optional compass-aligned shortcuts omit a star-bearing detour.
    (options.shortcuts||[]).forEach(([from,to])=>edges.push({from,to,points:[points[from],points[to]],shortcut:true}));
    const ice=[];
    edges.forEach(e=>{
      if(e.ice) {
        const a=e.points[1], target=e.points[2], len=Math.hypot(target.x-a.x,target.y-a.y);
        const ux=(target.x-a.x)/len,uy=(target.y-a.y)/len;
        ice.push({a:{...a},b:P(target.x-ux*180,target.y-uy*180),width:28,edge:edges.indexOf(e)});
      }
    });
    const stars=(options.stars||[]).map(([edge,t=0.5])=>{
      const e=edges[edge], a=e.points[e.points.length-2],b=e.points.at(-1);
      return P(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
    });
    const gates=(options.gates||[]).map(([edge,period=4,closed=1.65,phase=0])=>{
      const e=edges[edge],a=e.points[0],b=e.points[1],len=Math.hypot(b.x-a.x,b.y-a.y);
      const c=P(a.x+(b.x-a.x)*.52,a.y+(b.y-a.y)*.52),nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;
      return {a:P(c.x-nx*155,c.y-ny*155),b:P(c.x+nx*155,c.y+ny*155),period,closed,phase,edge};
    });
    cannons.forEach((c,i)=>{if(c.type==='quick'||c.type==='auto'){const aim=edges.find(e=>e.from===i).points[1]; c.a=Math.atan2(aim.y-c.y,aim.x-c.x);}});
    return {name,note,theme,difficulty,cannons,goal,edges,ice,stars,gates,radius:148,
      world:{w:Math.max(...points.map(p=>p.x))+margin,h:Math.max(...points.map(p=>p.y))+margin},
      conditions:stars.length?[{type:'time',value:120},{type:'time',value:160},{type:'stars'}]:[{type:'time',value:60},{type:'time',value:120},{type:'time',value:160}]};
  }
  const levels=[
    build('깊은숲 오솔길','대각선으로 숲을 건너 집으로 돌아가세요.','dawn',1,[[0,2,'spin45'],[1.25,.75,'spin45'],[2.625,2.125,'spin45'],[4,.75,'quick'],[4,-.3125,'spin90'],[5.375,-.3125]],{scale:800}),
    build('햇살 징검길','한 개의 별, 짧은 고정발사. 여행의 첫 수집품입니다.','dawn',1,[[0,2],[1,1,'spin90'],[2.4,1,'spin45'],[3.4,2,'quick'],[4.4,1,'spin90'],[5.6,1]],{stars:[[2,.55]]}),
    build('붉은 나뭇가지','상하좌우로 꺾이는 길. 빨간 대포의 네 방향을 읽으세요.','amber',2,[[0,2],[1,1,'spin90'],[2.3,1,'spin90'],[2.3,2.3,'spin90'],[3.7,2.3,'spin90'],[3.7,.7,'spin45'],[4.7,-.3,'quick'],[6,-.3]],{stars:[[1],[4]]}),
    build('보랏빛 릴레이','보라색 대포에 들어가면 0.5초 후 바로 이어집니다.','dawn',2,[[0,3],[1,2,'quick'],[2,1,'quick'],[3,2,'quick'],[4,1,'spin45'],[5,0,'spin90'],[6.25,0]],{stars:[[2],[4]]}),
    build('첫눈 미끄럼길','파란 얼음에 닿으면 수평으로 미끄러집니다.','frost',2,[[0,2],[2.2,1,'spin45'],[3.2,2,'quick'],[4.2,1,'spin90'],[5.5,1]],{ice:{0:[1,1]},stars:[[0,.55]]}),
    build('별빛 갈림길','위쪽 별을 돌아갈까요, 곧장 지름길로 갈까요?','amber',3,[[0,2],[1,1,'spin45'],[2,0,'spin45'],[3,1,'spin45'],[4,2,'spin90'],[5.3,2]],{shortcuts:[[1,3]],stars:[[1],[3]]}),
    build('잠든 가시문','가시문이 접히는 시간을 보고 출발하세요.','moon',3,[[0,2],[1,1,'spin90'],[2.5,1,'spin45'],[3.5,2,'quick'],[4.5,1,'spin90'],[6,1]],{stars:[[1],[4]],gates:[[1,4.6,1.75,.3]]}),
    build('서리의 굽이','두 번의 얼음 회전. 미끄러진 끝에서 다시 날아갑니다.','frost',3,[[0,3],[2.2,2,'spin45'],[3.2,1,'spin45'],[5.5,0,'spin90'],[6.8,0,'spin45'],[7.8,1]],{ice:{0:[1,2],2:[4.2,0]},stars:[[0],[2],[4]]}),
    build('달빛 우회로','별이 있는 북쪽 길과 빠른 남쪽 길이 만납니다.','moon',4,[[0,3],[1,2,'spin45'],[2,1,'spin90'],[3.2,1,'spin45'],[4.2,2,'spin45'],[5.2,3,'spin90'],[6.7,3,'quick'],[7.7,2]],{shortcuts:[[1,4]],stars:[[1],[3],[6]],gates:[[5,4.3,1.5,.7]]}),
    build('노을의 긴 비행','긴 대각선, 빠른 릴레이, 끝에서 기다리는 별.','amber',4,[[0,3],[1.6,1.4,'quick'],[3.1,2.9,'quick'],[4.6,1.4,'spin90'],[4.6,-.1,'spin90'],[6.2,-.1,'spin45'],[7.7,1.4,'spin90'],[9,1.4]],{stars:[[0,.7],[4],[6]],gates:[[4,4.8,1.6,.1]]}),
    build('숲의 심장','갈림길·얼음·가시문을 지나 세 별과 함께 집으로.','moon',5,[[0,3],[1,2,'spin45'],[2,1,'spin45'],[3,2,'spin45'],[5.2,1,'quick'],[6.2,2,'spin90'],[7.7,2,'spin45'],[8.7,1,'quick'],[9.7,0,'spin90'],[11,0]],{shortcuts:[[1,3]],ice:{3:[4,1]},stars:[[1],[3],[7]],gates:[[5,4.5,1.5,.25],[6,4.9,1.6,.9]]})
  ];
  const api={levels,themes};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KiwiLevels=api;
})(globalThis);
