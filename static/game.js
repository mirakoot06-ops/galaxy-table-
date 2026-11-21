/* =====================================================================
   TIMES TABLE GALAXY - code guide (read this first!)
   ---------------------------------------------------------------------
   Files:  index.html (screens)  style.css (looks)  game.js (this file)
           sw.js + manifest.json (offline / install as an app)
   The code runs top to bottom. Main parts, in order, search for them:
     LEVELS / WORLDS / GAMES / STORY   the 9 planets: tables, looks, game types, story
     makeQs, wpick, recFact            the LEARNING ENGINE: every fact (e.g. 6x7) gets a
                                       level 0-5. Wrong answers lower it, right ones raise
                                       it, and weak facts are picked more often.
     start / ask / pick / score        playing one round
     finish                            stars, coins, rewards after a round
     show(v) + VIEWS{}                 switching screens (each screen can have a render hook)
     charSVG / avatarHTML              the explorer character drawing
     guardian / zorp                   the SVG monsters and Zorp (with moods)
     WX / wxHTML                       weather on each planet
     renderProgress, QUESTS            progress page, mastery map, daily quests
     renderShip, DECOR, STAGES         ship parts, cabin decorating, growing pet
     renderRace                        2-player race
     renderTeacher, exportCode         teacher page and save codes
     TX(en, he)                        use this for any NEW text so Hebrew works too
   Saved data (per player) lives in localStorage under "ttg-v2:<name>".
   To add a new planet: add to LEVELS, WORLDS, GAMES, STORY, TEX, WX and GD.
   ===================================================================== */
const LANG=(()=>{try{return localStorage.getItem('ttg-lang')||'en'}catch(e){return'en'}})();
const LEVELS=[
  {n:'Moon',t:[2],c:'radial-gradient(circle at 30% 30%,#f4f4f4,#8d8d96)',g:'#ffffff55'},
  {n:'Mercury',t:[3],c:'radial-gradient(circle at 30% 30%,#d9b99b,#7a5c47)',g:'#d9b99b66'},
  {n:'Venus',t:[4],c:'radial-gradient(circle at 30% 30%,#ffd98a,#d07a2d)',g:'#ffb34766'},
  {n:'Mars',t:[5],c:'radial-gradient(circle at 30% 30%,#ff8a65,#a62b1a)',g:'#ff5a3d77'},
  {n:'Jupiter',t:[6],c:'repeating-linear-gradient(8deg,#e9c9a1 0 12px,#c98d5e 12px 22px,#f3dfc3 22px 30px)',g:'#e9b57e66'},
  {n:'Saturn',t:[7],c:'radial-gradient(circle at 30% 30%,#ffe9a8,#c9a13e)',g:'#ffe29a66',cls:'saturn'},
  {n:'Uranus',t:[8],c:'radial-gradient(circle at 30% 30%,#c4fbff,#3aa8b8)',g:'#5ef2ff77'},
  {n:'Neptune',t:[9],c:'radial-gradient(circle at 30% 30%,#7aa7ff,#1d2fa8)',g:'#4d6dff88'},
  {n:'Black Hole',t:[10,11,12],c:'radial-gradient(circle,#000 38%,#6a2cff 55%,#ff6b8a 72%,transparent 74%)',g:'#a56bff99'}
];
const RANKS=[[0,'Cadet'],[6,'Pilot'],[14,'Captain'],[22,'Commander'],[27,'Star Admiral']];
const BADGES=[
  ['launch','🚀','First Launch','Finish your first mission'],
  ['s3','🔥','Hot Streak','3 right in a row'],
  ['s5','☄️','Comet Tail','5 right in a row'],
  ['s10','💥','Supernova','10 right in a row'],
  ['perfect','💎','Flawless Flight','10 out of 10 on a mission'],
  ['p3','🪐','Planet Hopper','Earn a star on 3 planets'],
  ['p9','🌌','Galaxy Explorer','Earn a star on every planet'],
  ['c100','🌠','Star Collector','Answer 100 questions right'],
  ['all3','👑','Space Legend','Get 3 stars on every planet']
];
const KEY='ttg-v2:';
let S={stars:{},best:0,right:0,ach:{}}, run=null, P=null;
function save(){try{localStorage.setItem(KEY+P.name.toLowerCase(),JSON.stringify(S))}catch(e){}}
const $=id=>document.getElementById(id);
const totalStars=()=>Object.values(S.stars).reduce((a,b)=>a+b,0);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};

function confetti(list,n,x,y){
  x=x??innerWidth/2;y=y??innerHeight/2;
  for(let i=0;i<n;i++){const e=document.createElement('div');e.className='fx';e.textContent=list[i%list.length];
    e.style.left=x+'px';e.style.top=y+'px';e.style.setProperty('--dx',(Math.random()*500-250)+'px');e.style.setProperty('--dy',(Math.random()*-350-40)+'px');
    document.body.appendChild(e);setTimeout(()=>e.remove(),1400)}}
function mood(c,face){const m=$('mascot');$('face').textContent=face;m.className='mascot '+c;setTimeout(()=>{m.className='mascot';$('face').textContent=(run&&run.face)||'👽'},900)}
(function(){const sky=$('sky');for(let i=0;i<60;i++){const d=document.createElement('i');d.style.left=Math.random()*100+'%';d.style.top=Math.random()*100+'%';
  d.style.animationDelay=Math.random()*2+'s';d.style.animationDuration=1+Math.random()*2+'s';sky.appendChild(d)}
  const h=document.querySelector('h1');if(LANG==='he')h.textContent='גלקסיית לוח הכפל';let ci=0;h.innerHTML=h.textContent.split(' ').map(w=>'<span class="w">'+[...w].map(c=>{const i=ci++;return '<span style="animation-delay:'+i*.12+'s;--i:'+i+'">'+c+'</span>'}).join('')+'</span>').join(' ')})();
function fitMap(){const pa=$('path');if(!pa||!$('map').classList.contains('on'))return;let t=0,e=pa;while(e){t+=e.offsetTop;e=e.offsetParent}const h=Math.max(380,innerHeight-t-84);pa.style.height=h+'px';pa.style.setProperty('--ph',h+'px')}
addEventListener('resize',fitMap);
function show(v){document.body.classList.toggle('increator',v==='creator');if(v==='creator')renderCreator();document.body.classList.toggle('world',v==='game'&&!!run&&run.i>=0);document.body.classList.toggle('ingame',v==='game');
  if(v==='map')setTimeout(()=>{fitMap();const c=document.querySelector('#path .cur'),pp=$('path');if(c&&pp)pp.scrollTo({left:slideLeft(pp,c),behavior:'smooth'})},150);if(v==='shop')renderShop();if(v==='tricks')renderTricks();if(v==='spin')renderSpin();if(typeof VIEWS!=='undefined'&&VIEWS[v])VIEWS[v]();document.body.classList.toggle('inhome',v==='home');if(v==='home')renderHome();document.querySelectorAll('.view').forEach(e=>e.classList.toggle('on',e.id===v));
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-pressed',t.dataset.go===v||(t.dataset.go==='more'&&MORE.indexOf(v)>=0)));
  $('cStreak').textContent='🔥 '+S.best+' best'}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{render();show(t.dataset.go)});

function toast(icon,title,text){const t=$('toast');t.innerHTML='<b>'+icon+' '+title+'</b>'+text;t.classList.add('show');
  clearTimeout(toast.id);toast.id=setTimeout(()=>t.classList.remove('show'),2800)}
function award(id){if(S.ach[id])return;S.ach[id]=1;const b=BADGES.find(x=>x[0]===id);toast(b[1],'New badge: '+b[2],b[3]);say(LANG==='he'?'קיבלתם תג חדש! כל הכבוד!':'You earned a new badge! You are amazing!');save()}

function render(){
  $('cStars').textContent='⭐ '+totalStars()+'  🪙 '+(S.coins||0);applyLook();$('cDays').textContent='📅 '+(S.loginStreak||0)+' day streak';
  $('speedBtn').textContent='⚡ Speed Round · best '+(S.speed||0);
  {const d=dayNo(),done=S.last===d;$('dailyBtn').disabled=done;$('dailyBtn').textContent=done?'📅 Daily done! 🔥 '+(S.dayStreak||0)+' day streak':'📅 Daily Mission · bonus + free spin'}
  $('shipChip').textContent='🛠️ Zorp’s ship: '+STORY.map((p,i)=>S.stars[i]>=1?p[0]:'▫️').join(' ');
  const r=[...RANKS].reverse().find(x=>totalStars()>=x[0]);$('cRank').textContent=P.av+' '+P.name+' · '+r[1];
  $('hello').textContent='Welcome aboard, '+P.name+'! Pick a planet. Get 7 out of 10 right to unlock the next one!';
  $('cStreak').textContent='🔥 '+S.best+' best';
  const pa=$('path'),NL=LEVELS.length;
  let cur=-1;LEVELS.forEach((L,i)=>{if((i===0||(S.stars[i-1]||0)>=1)&&!(S.stars[i]||0)&&cur<0)cur=i});if(cur<0)cur=NL-1;
  pa.innerHTML='';
  LEVELS.forEach((L,i)=>{
    const open=i===0||(S.stars[i-1]||0)>=1,s=S.stars[i]||0,W=WORLDS[i],sec=document.createElement('section');
    sec.className='slide '+(L.cls||'')+(s>=1?' done':'')+(s===3?' gold':'')+(i===cur?' cur':'')+(open?'':' lockd');
    sec.style.setProperty('--sky',W.sky);sec.style.setProperty('--gr',W.gr);sec.setAttribute('aria-label',L.n);
    const lm=W.pr.slice(0,2).map((e,k)=>[0,1].map(h=>'<span class="lm" style="left:'+((k?58:14)/2+h*50)+'%;top:'+(k?64:30)+'%">'+e+'</span>').join('')).join('');
    sec.innerHTML='<div class="sstars"></div><div class="'+wxCls(i)+'">'+wxHTML(i,1)+'</div><button class="sg" aria-label="'+GD[i].n+'">'+guardian(i)+'</button><div class="sprops">'+W.pr.slice(0,4).map((e,k)=>'<span style="left:'+[6,84,10,78][k]+'%;top:'+[12,18,66,58][k]+'%;font-size:'+[44,36,34,40][k]+'px;animation-delay:-'+k+'s">'+e+'</span>').join('')+'</div><div class="sground"></div>'+
      '<div class="sbody">'+(i===cur?'<span class="me">'+avatarHTML()+'</span>':'')+
      '<div class="planet" style="background:'+L.c+';--glow:'+L.g+'"><div class="disc"><div class="tex" style="background-image:'+TEX[i]+'">'+lm+'</div><div class="shade"></div></div><span class="mult">×'+(L.t.length>1?'10+':L.t[0])+'</span></div>'+
      '<div class="meta"><h2 class="nm">'+L.n+'</h2><div class="gm">'+GAMES[i][0]+(i===bonusPl()?' · ⭐ '+TX('bonus today','בונוס היום'):'')+'</div><div class="stars">'+[0,1,2].map(k=>'<span class="'+(k<s?'':'off')+'">★</span>').join('')+'</div>'+
      (open?'<button class="btn go2">▶ Play</button>':'<div class="lockmsg">🔒 Earn a star on the planet before this one to unlock it</div>')+'</div></div>';
    const sg=sec.querySelector('.sg');sg.onclick=e=>{e.stopPropagation();sg.innerHTML=guardian(i,'laugh');beep(300+i*40,.12,'square',.07);toast('👾',GD[i].n,TX('Ha ha! Beat me if you can!','חה חה! נצחו אותי אם תוכלו!'));setTimeout(()=>sg.innerHTML=guardian(i),900)};
    const go=()=>{if(Math.abs(sec._p||0)>.4)goTo(i);else if(open)intro(i)};
    sec.querySelector('.planet').onclick=go;const g2=sec.querySelector('.go2');if(g2)g2.onclick=()=>intro(i);
    pa.appendChild(sec)});
  $('dots').innerHTML=LEVELS.map((L,i)=>'<button class="dot'+(i===cur?' on':'')+'" aria-label="'+L.n+'"></button>').join('');
  [...$('dots').children].forEach((d,i)=>d.onclick=()=>goTo(i));
  $('badgeGrid').innerHTML=BADGES.map(b=>'<div class="badge '+(S.ach[b[0]]?'got':'locked')+'"><span class="ic">'+b[1]+'</span><b>'+b[2]+'</b><small>'+b[3]+'</small></div>').join('');
}

const GAMES=[
['Asteroid Blaster','blast','Tap the rock with the right answer before it crashes!'],
['Code Breaker','code','Type the answer on the keypad to crack the code!'],
['Match-Up','match','Match every problem with its answer. Fewer mistakes = more stars!'],
['Rover Repair','rover','Find the missing number to fix the rover!'],
['Lightning Storm','storm','True or false? Be quick, the storm is coming!'],
['Boss Battle','boss','Hit the boss with right answers. You have 3 hearts!'],
['Odd One Out','odd','Three belong to the times table. Tap the one that does NOT!'],
['Space Stories','story','Read the story and solve it!'],
['Black Hole Escape','hole','Answer fast! Wrong answers pull you toward the black hole!']];
let T=[];
function tm(f,ms,iv){const id=iv?setInterval(f,ms):setTimeout(f,ms);T.push(id);return id}
function stopAll(){T.forEach(id=>{clearTimeout(id);clearInterval(id)});T=[]}
const fk=(a,b)=>Math.min(a,b)+'x'+Math.max(a,b);
const F=()=>S.facts||(S.facts={});
function factW(c){const r=F()[fk(c[0],c[1])],lv=r?r.lv:-1;let w=[3,6,6,4,2.5,1.5,.8][lv+1];if(r&&r.lv>=3&&(Date.now()-(r.t||0))/864e5>3)w*=1.6;return w}
function wpick(cands,n){const out=[],pool=cands.slice();while(out.length<n&&pool.length){const ws=pool.map(factW);let r=Math.random()*ws.reduce((x,y)=>x+y,0),i=0;for(;i<ws.length-1;i++){r-=ws[i];if(r<=0)break}out.push(pool.splice(i,1)[0])}return out}
let _ALLF=null;const ALLF=()=>_ALLF||(_ALLF=(()=>{const o=[];for(let a=2;a<=12;a++)for(let b=1;b<=12;b++)o.push([a,b]);return o})());
function makeQs(L){const seen={},c=[];
  L.t.forEach(t=>{for(let m=1;m<=12;m++){const k=fk(t,m);if(seen[k])continue;seen[k]=1;c.push(Math.random()<.5?[t,m]:[m,t])}});
  return shuffle(wpick(c,10));
}
function recFact(f,good){if(!f)return;const k=fk(f[0],f[1]),r=F()[k]||(F()[k]={lv:0,n:0,w:0});r.n++;r.t=Date.now();if(good)r.lv=Math.min(5,r.lv+1);else{r.w++;r.lv=Math.max(1,r.lv-2)}}
function choices(a,b){
  const ans=a*b,set=new Set([ans]);
  const near=[a*(b+1),a*(b-1),(a+1)*b,(a-1)*b,ans+10,ans-10,ans+2,ans-2];
  shuffle(near).forEach(n=>{if(n>0&&set.size<4)set.add(n)});
  let k=1;while(set.size<4)set.add(ans+k++);
  return shuffle([...set]);
}
function fuel(){$('fuel').innerHTML=Array.from({length:Math.min(run.streak,10)},()=>'<span>🔥</span>').join('');
  $('gStreak').textContent='🔥 '+run.streak;$('gStreak').classList.toggle('hot',run.streak>=3);pus()}
function aux(){$('gAux').textContent=run.m==='boss'?'❤️'.repeat(Math.max(run.hearts,0))+' Boss HP '+Math.max(10-run.ok,0):run.m==='speed'?'⏱️ '+run.t+'s':run.m==='practice'?'🧘 '+run.ok+' right':''}
function prog(){const p=run.m==='lesson'?10*run.ok/Math.max(1,run.ok+run.qs.length):['match','boss','hole'].includes(run.m)?run.ok:run.n;$('fill').style.width=Math.min(p,10)*10+'%';$('rocket').style.left='calc('+Math.min(p,10)*10+'% - 6px)';lastQ()}

function start(i){
  stopAll();const m=GAMES[i][1];
  run={i,m,L:LEVELS[i],qs:makeQs(LEVELS[i]),missed:[],n:0,ok:0,streak:0,locked:false,hearts:3,pull:30,face:S.char||'👽'};
  $('gLabel').textContent=GAMES[i][0];$('game').dataset.m=m;$('face').textContent=run.face;$('opts').className='opts';$('tb').classList.remove('on');
  document.body.style.setProperty('--wsky',WORLDS[i].sky);document.body.style.setProperty('--wgr',WORLDS[i].gr);$('stand').innerHTML=avatarHTML();
  show('game');guardSet('idle');guardWx();$('gCoin').textContent='🪙 '+S.coins;toast('🎮',GAMES[i][0],GAMES[i][2]);
  if(m==='hole'){$('tb').classList.add('on');$('tbi').style.cssText='transition:none;width:30%;background:linear-gradient(90deg,#6a2cff,#ff6b8a)';
    tm(()=>{if(!run.fz)run.pull=Math.min(100,run.pull+.3);$('tbi').style.width=run.pull+'%';if(run.pull>=100)finish()},100,1)}
  if(m==='blast')rock();else if(m==='code')code();else if(m==='match')match();else ask();
}
function score(good,el){
  if(good){
    run.ok++;run.streak++;S.right++;S.best=Math.max(S.best,run.streak);qadd('right30');if(run.streak===5)qadd('streak5');if(run.cur)recFact(run.cur,true);S.coins=(S.coins||0)+(run.m==='practice'?0:1+(run.streak>=5?1:0));sfx(run.streak>=3?'win':'ok');
    if(run.streak===5){S.pf=(S.pf||0)+1;toast('🔍','Power-up earned!','50/50 added to your bag')}
    if(run.streak===10){S.pz=(S.pz||0)+1;toast('❄️','Power-up earned!','Freeze added to your bag')}
    const say={3:'Hot streak! Rocket boost! 🔥',5:'Comet tail! Keep going! ☄️',10:'SUPERNOVA! 💥'}[run.streak];
    $('msg').textContent=say||['Nice!','Great flying!','Correct!','Boom!'][Math.random()*4|0];
    if(run.streak>=3)award('s3');if(run.streak>=5)award('s5');if(run.streak>=10)award('s10');
    if(S.right>=100)award('c100');
    const r=el?el.getBoundingClientRect():{left:innerWidth/2,width:0,top:innerHeight/2};
    mood('yay','🤩');confetti(run.streak>=3?['🔥','⭐','☄️']:['⭐','✨'],run.streak>=3?14:6,r.left+r.width/2,r.top);
  }else{run.streak=0;mood('sad','😵');sfx('bad');if(run.cur){miss(run.cur);recFact(run.cur,false)}}
  react(good);save();fuel();gfx(good,el);$('cStreak').textContent='🔥 '+S.best+' best';
}
/* question builder for the button games */
function item(){
  const[a,b]=run.m==='speed'?wpick(ALLF(),1)[0]:run.m==='lesson'?run.qs[0]:run.qs[run.n%10],m=run.m,t=run.L.t.includes(a)?a:b,o=t===a?b:a,ans=a*b;run.cur=[a,b];
  const nums=(v,l)=>({q:l,o:v.map(x=>[x,x])});
  if(m==='rover'){const v=shuffle([...new Set([b,b+1,b-1,b+2,b-2,b+3])].filter(x=>x>0).slice(0,4));return{...nums(v,a+' × ? = '+ans),ans:b,shown:b}}
  if(m==='odd'){const ks=shuffle([1,2,3,4,5,6,7,8,9,10,11,12]).slice(0,3),w=t*(1+(Math.random()*12|0))+1+(Math.random()*(t-1)|0);
    return{...nums(shuffle([...ks.map(k=>t*k),w]),'Which is NOT in the '+t+' times table?'),ans:w,shown:w}}
  if(m==='story'){const W=[['space dogs','bones'],['aliens','eyes'],['rockets','windows'],['astronauts','snacks']][run.n%4],o2=o<2?o+1:o;
    return{...nums(choices(t,o2),o2+' '+W[0]+' each have '+t+' '+W[1]+'. How many '+W[1]+' in all?'),ans:t*o2,shown:t*o2}}
  if(m==='storm'){const real=Math.random()<.5,sh=real?ans:ans+t;
    return{q:a+' × '+b+' = '+sh,o:[['✅ True','true'],['❌ False','false']],ans:String(real),shown:real?'True':'False'}}
  return{...nums(choices(a,b),a+' × '+b),ans,shown:ans};
}
function ask(){
  const it=item();run.it=it;run.locked=false;$('msg').textContent='';
  $('q').className='q'+(it.q.length>12?' sm':'');$('q').textContent=it.q;if(SET.read)say(it.q.replace(/×/g,TX(' times ',' כפול ')),0,1);prog();aux();fuel();
  const o=$('opts');o.className='opts';o.innerHTML='';
  it.o.forEach(([l,v])=>{const bt=document.createElement('button');bt.className='opt';bt.textContent=l;bt.dataset.v=v;bt.onclick=()=>pick(bt,v);o.appendChild(bt)});
  if(run.m==='storm'){const i=$('tbi');$('tb').classList.add('on');i.style.cssText='transition:none;width:100%;background:var(--flare)';void i.offsetWidth;
    i.style.transition='width 5s linear';i.style.width='0%';run.tq=tm(()=>pick(null,'timeout'),5000)}
}
function pick(el,val){
  if(run.locked)return;run.locked=true;clearTimeout(run.tq);
  const it=run.it,good=String(val)===String(it.ans);
  document.querySelectorAll('.opt').forEach(o=>{o.disabled=true;if(o.dataset.v===String(it.ans))o.classList.add('right')});
  if(!good&&el)el.classList.add('wrong');
  score(good,el);
  if(!good)$('msg').textContent=(val==='timeout'?'Too slow! ':'Almost! ')+'Answer: '+it.shown;
  if(run.m==='boss'){if(!good)run.hearts--;aux()}
  if(run.m==='hole'){run.pull=Math.max(0,Math.min(100,run.pull+(good?-14:14)));$('tbi').style.width=run.pull+'%'}
  if(run.m==='lesson'){good?run.qs.shift():run.qs.push(run.qs.shift())}
  const end=run.m==='boss'?(run.hearts<=0||run.ok>=10):run.m==='hole'?run.ok>=10:(run.m==='speed'||run.m==='practice')?false:run.m==='lesson'?run.qs.length===0:run.n>=9;
  tm(()=>{run.n++;end?finish():ask()},run.m==='speed'?(good?350:800):(good?800:1600));
}
/* game 1: falling rocks */
function rock(){
  if(run.n>=10)return finish();
  const[a,b]=run.qs[run.n],ans=a*b,f=$('opts');run.locked=false;run.cur=[a,b];run.it={ans,shown:ans};
  $('q').className='q';$('q').textContent=a+' × '+b;$('msg').textContent='';prog();fuel();
  f.className='field';f.innerHTML='';
  choices(a,b).forEach((v,k)=>{const r=document.createElement('button');r.className='rock';r.textContent=v;r.dataset.v=v;r.style.left=(2+k*24)+'%';r.style.animationDelay=(k*.5)+'s';
    r.onclick=()=>{if(run.locked)return;run.locked=true;clearTimeout(run.tq);f.classList.add('stop');const good=v===ans;
      r.classList.add(good?'right':'wrong');score(good,r);if(!good)$('msg').textContent='Answer: '+ans;tm(()=>{run.n++;rock()},good?800:1500)};f.appendChild(r)});
  run.tq=tm(()=>{if(run.locked)return;run.locked=true;f.classList.add('stop');score(false);$('msg').textContent='💥 Crash! Answer: '+ans;tm(()=>{run.n++;rock()},1500)},8000);
}
/* game 2: keypad */
function code(){
  if(run.n>=10)return finish();
  const[a,b]=run.qs[run.n];run.locked=false;run.cur=[a,b];run.buf='';
  $('q').className='q';$('q').textContent=a+' × '+b;$('msg').textContent='';prog();fuel();
  const o=$('opts');o.className='pad';o.innerHTML='<div class="scr" id="scr">?</div>';const scr=$('scr');
  run.key=k=>{if(run.locked)return;
    if(k==='⌫')run.buf=run.buf.slice(0,-1);
    else if(k==='✔'){if(!run.buf)return;run.locked=true;const good=+run.buf===a*b;scr.textContent=(good?'✅ ':'❌ ')+run.buf;score(good,scr);
      if(!good)$('msg').textContent='Answer: '+a*b;tm(()=>{run.n++;code()},good?800:1600);return}
    else run.buf=(run.buf+k).slice(0,3);
    scr.textContent=run.buf||'?'};
  [7,8,9,4,5,6,1,2,3,'⌫',0,'✔'].forEach(k=>{const bt=document.createElement('button');bt.textContent=k;bt.onclick=()=>run.key(String(k));o.appendChild(bt)});
}
document.addEventListener('keydown',e=>{if(!run||run.m!=='code'||!run.key||!$('game').classList.contains('on'))return;
  if(/^\d$/.test(e.key))run.key(e.key);else if(e.key==='Backspace')run.key('⌫');else if(e.key==='Enter')run.key('✔')});
/* game 3: match-up */
function match(){
  run.miss=0;run.cur=null;run.sel=null;$('q').className='q sm';$('q').textContent='Match each problem with its answer!';$('msg').textContent='';prog();fuel();
  const o=$('opts');o.className='cards';o.innerHTML='';const cards=[];
  run.qs.forEach(([a,b],i)=>{cards.push([i,a+'×'+b]);cards.push([i,a*b])});
  shuffle(cards).forEach(([k,t])=>{const c=document.createElement('button');c.className='mc';c.textContent=t;
    c.onclick=()=>{if(c.classList.contains('done')||run.locked)return;
      if(!run.sel){run.sel={c,k};c.classList.add('sel');return}
      if(run.sel.c===c){c.classList.remove('sel');run.sel=null;return}
      const p=run.sel;run.sel=null;
      if(p.k===k){p.c.className=c.className='mc done';recFact(run.qs[k],true);score(true,c);prog();
        if(run.ok>=10){run.locked=true;run.ok=Math.max(0,10-(run.miss>>1));tm(finish,900)}}
      else{run.miss++;miss(run.qs[p.k]);miss(run.qs[k]);recFact(run.qs[p.k],false);recFact(run.qs[k],false);score(false);$('msg').textContent='Not a match, try again!';p.c.classList.remove('sel');
        [p.c,c].forEach(x=>x.classList.add('bad'));tm(()=>[p.c,c].forEach(x=>x.classList.remove('bad')),400)}};
    o.appendChild(c)});
}
function finish(){stopAll();if(run.i<0)return special();$('rAgain').style.display='';lessonPanel();
  const{i,ok}=run,L=LEVELS[i];
  const stars=ok===10?3:ok>=8?2:ok>=7?1:0;
  if(stars){qadd('planets');if(i===bonusPl())S.coins+=5}if(ok===10)qadd('perfect');
  const old=S.stars[i]||0;if(stars>old){S.spins=(S.spins||0)+stars-old;S.stars[i]=stars}
  $('fill').style.width='100%';
  $('rEmoji').textContent=stars?(ok===10?'🏆':'🌟'):'🛸';
  $('rTitle').textContent=stars?(ok===10?'Perfect landing!':'You landed on '+L.n+'!'):'Almost there!';
  $('rStars').innerHTML=[0,1,2].map(k=>'<span class="'+(k<stars?'':'off')+'">★</span>').join('');
  $('rText').textContent=ok+' out of 10 right. '+(stars?'🎁 You found Zorp’s '+STORY[i][1]+' '+STORY[i][0]+'!'+(Object.values(S.stars).filter(x=>x>=1).length>=9?' ALL parts found! Zorp can fly home! 🏠':''):'You need 7 to land. Fly again!');
  const last=i===LEVELS.length-1;
  $('rNext').style.display=stars&&!last?'':'none';
  $('rNext').onclick=()=>intro(i+1);$('rAgain').onclick=()=>start(i);$('rMap').onclick=()=>{render();show('map')};
  if(stars)confetti(['🎉','⭐','🪐','🚀','✨'],ok===10?40:24);
  const rw=reward(i,stars);if(!stars)sfx('bad');if(stars)winPop(rw+(stars>old?'🎡 You earned '+(stars-old)+' spin'+(stars-old>1?'s':'')+'!':''));award('launch');if(ok===10)award('perfect');
  const got=Object.values(S.stars).filter(x=>x>=1).length;
  if(got>=3)award('p3');if(got>=LEVELS.length)award('p9');
  if(Object.values(S.stars).filter(x=>x>=3).length>=LEVELS.length)award('all3');
  save();render();show('result');
}
$('quit').onclick=()=>{stopAll();render();show('map')};
const esc=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function players(){try{return JSON.parse(localStorage.getItem('ttg-players'))||[]}catch(e){return[]}}
function renderHome(){
  if($('zb')){updateCC();updateId();zsay(ZT[0])}
  const L=players();
  $('crew').innerHTML=L.length?'<p>Already on the crew? Tap your name:</p>'+L.map((p,i)=>'<button class="pill" data-i="'+i+'">'+p.av+' '+esc(p.name)+'</button>').join(''):'';
  $('crew').querySelectorAll('.pill').forEach(b=>b.onclick=()=>login(L[+b.dataset.i].name));
}
function regPlayer(){try{localStorage.setItem('ttg-players',JSON.stringify([{name:P.name,av:P.av},...players().filter(p=>p.name.toLowerCase()!==P.name.toLowerCase())].slice(0,12)))}catch(e){}}
function login(name){
  name=name.trim().slice(0,14);
  if(!name){const i=$('nm');i.classList.remove('bad');void i.offsetWidth;i.classList.add('bad');i.focus();$('nmHint').textContent='Give your explorer a name first!';return}
  $('nmHint').textContent='';
  const known=players().find(p=>p.name.toLowerCase()===name.toLowerCase());
  P={name:known?known.name:name,av:known?known.av:'👧'};
  let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY+P.name.toLowerCase()))}catch(e){}
  S=raw||{stars:{},best:0,right:0,ach:{}};S.coins=S.coins||0;S.own=S.own||{};S.chars=S.chars||{};S.spins=S.spins||0;S.char=S.char||'👽';S.pf=S.pf||0;S.pz=S.pz||0;
  {const d=dayNo();S.daySpin=0;if(S.lastLogin!==d){S.loginStreak=S.lastLogin===d-1?(S.loginStreak||0)+1:1;S.lastLogin=d;S.spins=(S.spins||0)+1;S.daySpin=1}}S.r=S.r||'🚀';S.h=S.h||'';
  if(!S.look&&raw)S.look=defLook(P.av);
  if(S.look)finishLogin();else openCreator('new');
}
function finishLogin(){P.av=S.look.body==='b'?'👦':'👧';regPlayer();save();countdown()}
function countdown(){
  const c=$('count'),n=$('cnum'),seq=['3','2','1','🚀'];let i=0;c.classList.add('on');music();
  (function step(){
    if(i>=seq.length){c.classList.remove('on');render();show('map');confetti(['🎉','⭐','🪐','🚀','✨'],30);
      toast('👋','Welcome aboard, '+P.name+'!',(S.daySpin?'Your free daily spin is ready! 🎡 Open the Spin tab.':'Pick a planet to start your mission.'));return}
    n.textContent=seq[i++];sfx(i<4?'tick':'win');n.classList.remove('z');void n.offsetWidth;n.classList.add('z');setTimeout(step,780)})();
}

/* story */
const STORY=[
['⛽','Fuel Tank','Oh no! My ship crashed on the Moon! Blast the space rocks to find my Fuel Tank.'],
['⚙️','Engine','Mercury is so hot! My Engine is inside a locked vault. Help me crack the code!'],
['🔋','Battery','Venus clouds scattered my Battery pieces everywhere. Match them all up!'],
['🧭','Compass','The Mars rover found my Compass, but the rover is broken. Fix it with the missing numbers!'],
['🪟','Window','A giant storm on Jupiter swallowed my Window! Answer fast before the lightning hits!'],
['🪽','Wings','A space dragon is guarding my Wings on Saturn. Beat the boss!'],
['📻','Radio','Sneaky Uranus hid my Radio. Three things are real, one is a trick. Find the odd one!'],
['📡','Antenna','The Neptune sea monsters took my Antenna. Solve their silly puzzles to get it back!'],
['💎','Star Crystal','My Star Crystal is at the edge of the Black Hole! Escape with it and I can fly home!']];
const WORLDS=[
{sky:'linear-gradient(#05071c,#232b5e 75%)',gr:'#a3a3b0',pr:['🚩','🌑','🛸','🪨','⭐']},
{sky:'linear-gradient(#2a0a00,#d4601d 80%)',gr:'#6b4a35',pr:['🌋','☀️','🪨','🔥','🪨']},
{sky:'linear-gradient(#5a3b00,#f0ab45 80%)',gr:'#b3701f',pr:['⚡','☁️','🌋','☁️','⚡']},
{sky:'linear-gradient(#3a0f0a,#e0693a 80%)',gr:'#8f301a',pr:['🤖','🪨','🛰️','🏜️','🪨']},
{sky:'linear-gradient(#2b1a3a,#c0804f 80%)',gr:'#8a5a3a',pr:['🌪️','⛈️','⚡','☁️','🌪️']},
{sky:'linear-gradient(#1b1840,#8f70cc 80%)',gr:'#caa545',pr:['🪐','💫','☄️','⭐','🪐']},
{sky:'linear-gradient(#08323a,#55d6dd 80%)',gr:'#2c8f9a',pr:['🧊','❄️','🔭','🛸','🧊']},
{sky:'linear-gradient(#050f4a,#2d5bff 80%)',gr:'#122a9a',pr:['🐙','🐋','🦑','🫧','🐠']},
{sky:'radial-gradient(circle at 50% 40%,#4a0a8a,#000 72%)',gr:'#13002a',pr:['🌀','☄️','👾','✨','🌀']}];
function intro(i){
  const W=WORLDS[i],st=$('story');st.style.setProperty('--sky',W.sky);st.style.setProperty('--gr',W.gr);
  $('sTitle').textContent=LEVELS[i].n;
  $('sText').innerHTML='<span class="zsm">'+zorp('talk')+'</span><b>Zorp says:</b> '+STORY[i][2]+'<small>🎮 '+GAMES[i][0]+': '+GAMES[i][2]+'</small><small>💡 Trick: '+TRICKS[LEVELS[i].t.length>1?11:LEVELS[i].t[0]]+'</small>';
  $('sMe').innerHTML=avatarHTML();
  $('sProps').innerHTML=W.pr.map((e,k)=>'<span style="left:'+[3,84,14,72,46][k]+'%;--sz:'+[70,62,46,50,38][k]+'px;animation-delay:-'+k+'s">'+e+'</span>').join('');
  st.classList.add('on');sfx('tick');
  $('sGo').onclick=()=>{st.classList.remove('on');tutThen(i,()=>start(i))};$('sBack').onclick=()=>st.classList.remove('on');
}
/* shop */
const ROCKETS=[['🚀',0],['🛸',15],['🛩️',30],['☄️',45],['🐉',70],['🦄',100]];
const HATS=[['',0],['🎓',20],['🎧',25],['🤠',35],['🎩',40],['👑',60]];
const has=k=>k==='r🚀'||k==='h'||k==='g'||S.own[k];
function applyLook(){const r=$('rocket');r.textContent=S.r;r.classList.toggle('o',S.r!=='🚀');r.style.rotate=S.r==='🚀'?'':'-45deg';$('hat').textContent=''}
function renderSuits(){const sh=$('shopS');if(!sh)return;sh.innerHTML='';
  Object.keys(SPECIAL).forEach(k=>{const Sp=SPECIAL[k],own=!!S.own['s'+k],eq=S.look&&S.look.suit===k,d=document.createElement('div');d.className='item'+(eq?' eq':'');
    d.innerHTML='<span class="ic ch" style="font-size:54px;width:1em;margin:0 auto">'+charSVG({...(S.look||defLook(P.av)),suit:k})+'</span><small>'+Sp.n+'</small>';
    const b=document.createElement('button');b.textContent=eq?'Using':own?'Use':'🪙 '+Sp.c;
    b.onclick=()=>{if(!own){if((S.coins||0)<Sp.c){toast('🪙','Need more coins','Keep playing to earn them!');sfx('bad');return}S.coins-=Sp.c;S.own['s'+k]=1;sfx('buy')}S.look.suit=k;save();render();renderShop()};
    d.appendChild(b);sh.appendChild(d)})}
function renderShop(){$('pvShop').innerHTML=avatarHTML();renderSuits();
  $('coins').textContent='🪙 You have '+(S.coins||0)+' coins. Every right answer earns coins!';
  [['shopR',ROCKETS,'r'],['shopH',HATS,'h'],['shopG',GLASSES,'g']].forEach(([id,list,t])=>{
    $(id).innerHTML='';
    list.forEach(([e,c])=>{const k=t+e,eq=S[t]===e,d=document.createElement('div');d.className='item'+(eq?' eq':'');
      d.innerHTML='<span class="ic">'+(e||'🚫')+'</span>';const b=document.createElement('button');
      b.textContent=eq?'Using':has(k)?'Use':'🪙 '+c;
      b.onclick=()=>{if(!has(k)){if((S.coins||0)<c){toast('🪙','Need more coins','Keep playing to earn them!');sfx('bad');return}S.coins-=c;S.own[k]=1;sfx('buy')}
        S[t]=e;save();render();renderShop()};
      d.appendChild(b);$(id).appendChild(d)})});
}
/* sound: tiny synth, no files needed */
let AC=null,muted=false,M=null;
function beep(f,d,type,v,at){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+(at||0);o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}}
function sfx(k){if(muted)return;if(k==='fanfare'&&REAL.cheer){try{REAL.cheer.currentTime=0;REAL.cheer.play().catch(()=>{})}catch(e){}}
  const n={ok:[[660,.08],[880,.12]],bad:[[220,.15],[160,.25]],win:[[523,.1],[659,.1],[784,.1],[1046,.25]],tick:[[440,.12]],fanfare:[[523,.12],[659,.12],[784,.12],[1047,.12],[784,.1],[1047,.1],[1319,.55]],buy:[[880,.07],[1175,.12]]}[k];
  let at=0;n.forEach(([f,d])=>{beep(f,d,k==='bad'?'sawtooth':'square',k==='fanfare'?.15:.07,at);at+=d*.9})}
function hat(){if(muted||!AC)return;try{const n=AC.sampleRate*.05,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const o=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();f.type='highpass';f.frequency.value=7000;g.gain.value=.05;o.buffer=b;o.connect(f);f.connect(g);g.connect(AC.destination);o.start()}catch(e){}}
function music(){if(M)return;if(REAL.music){const a=REAL.music;a.loop=true;a.volume=.35;a.play().catch(()=>{});M=setInterval(()=>{a.muted=!!muted},400);return}let i=0;const P4=[[131,262,330,392],[110,220,262,330],[87,175,220,262],[98,196,247,294]];
  M=setInterval(()=>{if(muted)return;const ch=P4[(i>>3)%4],st=i%8,pick=()=>ch[1+(Math.random()*3|0)]*2;
    if(st%2===0)beep(ch[0],.2,'triangle',.06);
    if(st===0||st===3||st===5)beep(pick(),.16,'square',.02);else if(Math.random()<.55)beep(pick(),.12,'square',.016);
    if(st%4===2)hat();i++},230)}
function sweep(f1,f2,d,type,v){if(muted)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
  const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(v||.09,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}}
const CLK=[()=>sweep(500,900,.09),()=>sweep(900,450,.09),()=>{beep(784,.06,'square',.05);beep(1175,.08,'square',.05,.06)},()=>sweep(300,700,.13,'triangle'),
  ()=>{beep(659,.05,'sine',.1);beep(988,.07,'sine',.1,.05)},()=>sweep(1300,300,.15,'sawtooth',.035),()=>{beep(392,.05,'triangle',.12);beep(523,.05,'triangle',.12,.05);beep(659,.07,'triangle',.12,.1)},()=>sweep(200,1000,.2,'square',.04)];
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(!b||b.disabled||b.matches('.opt,.rock,.mc,#mute,.deco,.bigrocket,.zh,.cstar'))return;CLK[Math.random()*CLK.length|0]()},true);
$('mute').onclick=()=>{muted=!muted;$('mute').textContent=muted?'🔇':'🔊'};

/* tricks + practice */
const TRICKS={2:'Doubling! 2 × 7 is just 7 + 7.',3:'Double it, then add one more. 3 × 6: 6 + 6 = 12, plus 6 = 18.',4:'Double the double! 4 × 6: 6 → 12 → 24.',
5:'Answers always end in 0 or 5. Try half of the ×10 answer: 5 × 8 is half of 80.',6:'6 × n is 5 × n plus one more n. 6 × 7 = 35 + 7 = 42.',
7:'Remember the pattern 5, 6, 7, 8: 56 = 7 × 8. And 7 × 7 = 49.',8:'Double three times! 8 × 4: 4 → 8 → 16 → 32.',
9:'Finger trick: fold down finger n. Fingers on the left are tens, on the right are ones. The digits of a ×9 answer add up to 9!',
10:'Just add a zero! 10 × 7 = 70.',11:'For 1 to 9, repeat the digit! 11 × 4 = 44.',12:'12 × n is 10 × n plus 2 × n. 12 × 4 = 40 + 8 = 48.'};
function renderTricks(){const g=$('trickGrid');g.innerHTML='';
  for(let t=2;t<=12;t++){const d=document.createElement('div');d.className='tcard';d.innerHTML='<b>× '+t+'</b><p>'+TRICKS[t]+'</p>';
    const b=document.createElement('button');b.className='btn alt';b.style.fontSize='16px';b.textContent='🧘 Practice ×'+t;b.onclick=()=>startPractice(t);d.appendChild(b);g.appendChild(d)}}
function gstart(label,dm){run.ph=0;delete $('game').dataset.ph;$('gLabel').textContent=label;$('face').textContent=run.face;$('opts').className='opts';$('tb').classList.remove('on');$('game').dataset.m=dm;show('game')}
const blank=(m,t,qs)=>({i:-1,m,L:{t},qs,missed:[],n:0,ok:0,streak:0,locked:false,hearts:3,pull:30,face:S.char||'👽',t:60});
function startPractice(t){stopAll();run=blank('practice',[t],makeQs({t:[t]}));gstart('🧘 Practice ×'+t,'odd');toast('🧘','Practice','No timer, no hearts. Take your time!');ask()}
function startSpeed(){stopAll();run=blank('speed',[2,3,4,5,6,7,8,9,10,11,12],[]);gstart('⚡ Speed Round','speed');toast('⚡','Speed Round','How many can you get in 60 seconds?');ask();
  tm(()=>{if(run.fz)return;run.t--;aux();if(run.t<=0)finish()},1000,1)}
const dayNo=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
function startDaily(){stopAll();const d=dayNo(),t=[2+d%11,2+(d*5+3)%11];run=blank('daily',t,makeQs({t}));gstart('📅 Daily Mission','match');
  toast('📅','Daily Mission','Today: ×'+t[0]+' and ×'+t[1]+'. 10 questions!');ask()}
function special(){lessonPanel();
  $('rStars').innerHTML='';$('rNext').style.display='none';$('rAgain').style.display=run.m==='speed'?'':'none';
  $('rAgain').onclick=startSpeed;$('rMap').onclick=()=>{render();show('map')};let pop=false,extra='';
  if(run.m==='speed'){if(run.ok>=8)qadd('speed');const nb=run.ok>(S.speed||0);if(nb)S.speed=run.ok;$('rEmoji').textContent='⚡';$('rTitle').textContent=nb?'New record!':'Time’s up!';
    $('rText').textContent=run.ok+' right in 60 seconds! Best: '+S.speed+'. You earned coins for every answer.';pop=run.ok>=5}
  else if(run.m==='lesson'){qadd(run.mystery?'mystery':'lesson');$('rEmoji').textContent='🎓';$('rTitle').textContent='Lesson complete!';$('rText').textContent='You fixed every one of those facts! 💪 +5 coins';S.coins+=5;pop=true}
  else{const d=dayNo();$('rEmoji').textContent='📅';$('rTitle').textContent='Mission complete!';
    if(S.last!==d){S.dayStreak=S.last===d-1?(S.dayStreak||0)+1:1;S.last=d;S.coins+=10;S.spins=(S.spins||0)+1;extra='🎡 +1 spin and +10 bonus coins!';
      $('rText').textContent=run.ok+' out of 10 right. '+extra+' 🔥 '+S.dayStreak+' day streak!';pop=true}
    else $('rText').textContent=run.ok+' out of 10 right. Great practice!'}
  if(!pop)sfx('win');save();render();show('result');if(pop)winPop(extra)}
$('puF').onclick=()=>{if(!S.pf||run.locked)return;const els=[...document.querySelectorAll('.opt:not(.gone),.rock:not(.gone)')];
  if(els.length<3){toast('🔍','Not here','50/50 needs answer choices');return}
  shuffle(els.filter(e=>e.dataset.v!==String(run.it.ans))).slice(0,2).forEach(e=>e.classList.add('gone'));S.pf--;save();pus();sfx('buy')};
$('puZ').onclick=()=>{if(!S.pz||run.locked)return;
  if(run.m==='storm'){const i=$('tbi'),w=getComputedStyle(i).width;clearTimeout(run.tq);i.style.transition='none';i.style.width=w}
  else if(run.m==='blast'){clearTimeout(run.tq);$('opts').classList.add('stop')}
  else if(run.m==='hole'||run.m==='speed'){run.fz=1;tm(()=>run.fz=0,8000)}
  else{toast('❄️','No timer here','Save your Freeze for a timed game!');return}
  S.pz--;save();pus();sfx('buy');toast('❄️','Time frozen!','Take your time')};
function pus(){$('puF').textContent='🔍 50/50 ×'+(S.pf||0);$('puZ').textContent='❄️ Freeze ×'+(S.pz||0);$('puF').disabled=!S.pf;$('puZ').disabled=!S.pz}
/* win popup with affirmations */
const AFF=['You’re a math superstar! ⭐','Your brain is getting stronger every day! 🧠','Mistakes help you learn. You’ve got this! 💪','Look at you go! Amazing work! 🚀','You’re braver than you think! 🦁','Keep shining, space explorer! ✨','Hard work pays off, and you’re proving it! 🏆','I believe in you! 💖','You never gave up. That’s real power! 🔥'];
const CHEERS=['Amazing','Great job','You did it','Awesome','Fantastic','Super star'];
function cheer(){if(muted)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const n=AC.sampleRate*1.5,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const o=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  f.type='bandpass';f.frequency.value=2600;g.gain.value=.3;o.buffer=b;o.connect(f);f.connect(g);g.connect(AC.destination);o.start()}catch(e){}}

const CH_HE=['מדהים','כל הכבוד','הצלחתם','איזה יופי','פנטסטי','אלופים'];
const AFF_HE=['אתם כוכבי מתמטיקה! ⭐','המוח שלכם מתחזק כל יום! 🧠','טעויות עוזרות לנו ללמוד. אתם מסוגלים! 💪','וואו, איזו עבודה מדהימה! 🚀','אתם אמיצים יותר ממה שאתם חושבים! 🦁','תמשיכו לזרוח, חוקרי חלל! ✨','עבודה קשה משתלמת, ואתם מוכיחים את זה! 🏆','אני מאמין בכם! 💖','לא ויתרתם. זה כוח אמיתי! 🔥'];
function winPop(extra){setTimeout(()=>{const he=LANG==='he',c=(he?CH_HE:CHEERS)[Math.random()*6|0],line=c+', '+P.name+'!',aff=(he?AFF_HE:AFF)[Math.random()*9|0];
  $('winH').textContent=line;$('winC').innerHTML=avatarHTML();$('winT').textContent=aff;$('winX').textContent=extra||'';
  $('win').classList.add('on');sfx('fanfare');cheer();setTimeout(()=>{say(line);say(aff,1)},450);
  confetti(['🎉','⭐','✨','🚀','🌟'],45)},600)}
$('winOk').onclick=()=>$('win').classList.remove('on');
/* prize wheel */
const PRIZES=[['🎁','char'],['🪙','c10'],['🎁','char'],['🔍','pf'],['🎁','char'],['🪙','c25'],['❄️','pz'],['🪙','c10']];
const CHARS=[['👽','Zorp'],['🐶','Comet'],['🐱','Nova'],['🤖','Beep'],['🐙','Octo'],['🦖','Rexy'],['🐲','Draco'],['🐧','Pingu'],['🦉','Hoot'],['🐢','Shelly'],['🦁','Leo'],['🧙','Merlin']];
let rot=0,spinning=false;
function renderSpin(){const w=$('wheel');$('pvSpin').innerHTML=avatarHTML();$('spinGo').textContent=(S.spins>0?'🎡 '+TX('Spin!','סובבו!')+' ('+S.spins+')':TX('No spins left','אין סיבובים'));$('spinGo').classList.toggle('off',!(S.spins>0));
  if(!w.children.length)PRIZES.forEach((pz,i)=>{const sp=document.createElement('span');sp.textContent=pz[0];
    sp.style.transform='translate(-50%,-50%) rotate('+(i*45+22.5)+'deg) translateY(calc(-1 * var(--r)))';w.appendChild(sp)});
  $('spInfo').textContent='🎡 Spins: '+(S.spins||0)+'   🪙 '+(S.coins||0)+'   Free spin every day + one for every new star!';
  $('chars').innerHTML='';
  CHARS.forEach(([e,n],i)=>{const own=i===0||S.chars[e],d=document.createElement('div');d.className='item'+(S.char===e?' eq':'');
    d.innerHTML='<span class="ic">'+(own?e:'❓')+'</span><small>'+(own?n:'Locked')+'</small>';
    if(own){const b=document.createElement('button');b.textContent=S.char===e?'Using':'Use';b.onclick=()=>{S.char=e;save();renderSpin()};d.appendChild(b)}
    $('chars').appendChild(d)})}
function spin(){spinning=true;const idx=Math.random()*8|0,c=idx*45+22.5;rot+=1800+((360-c)-(rot%360)+360)%360;
  $('wheel').style.transform='rotate('+rot+'deg)';$('spRes').textContent=TX('Spinning…','מסתובב…');$('spinGo').disabled=true;sfx('tick');let tk=0;const tki=setInterval(()=>{if(++tk>26)clearInterval(tki);else beep(500+tk*8,.03,'square',.04)},150);
  setTimeout(()=>{const k=PRIZES[idx][1];let msg;
    if(k==='char'){const pool=[];HATS.forEach(([e])=>{if(e&&!S.own['h'+e])pool.push(['h',e])});GLASSES.forEach(([e])=>{if(e&&!S.own['g'+e])pool.push(['g',e])});Object.keys(SPECIAL).forEach(k=>{if(!S.own['s'+k])pool.push(['s',k])});
      CHARS.forEach(([e])=>{if(e!=='👽'&&!S.chars[e])pool.push(['p',e])});
      if(pool.length){const[t,e]=pool[Math.random()*pool.length|0];if(t==='p'){S.chars[e]=1;S.char=e}else if(t==='s'){S.own['s'+e]=1;S.look.suit=e}else{S.own[t+e]=1;S[t]=e}msg='New accessory: '+(t==='s'?SPECIAL[e].n+' space suit':e)+'! Your explorer is wearing it!'}
      else{S.coins+=15;msg='You have everything! +15 coins'}}
    else if(k==='pf'){S.pf++;msg='🔍 You won a 50/50 power-up!'}else if(k==='pz'){S.pz++;msg='❄️ You won a Freeze power-up!'}
    else{const n=k==='c25'?25:10;S.coins+=n;msg='🪙 You won '+n+' coins!'}
    $('spRes').textContent=msg;spinning=false;$('spinGo').disabled=false;save();render();renderSpin();toast('🎡',TX('You won!','זכיתם!'),msg);confetti(['🎉','⭐','✨'],20);sfx('win')},4300)}
$('spinGo').onclick=()=>{if(spinning)return;if(!(S.spins>0)){const m=TX('No spins left. Earn a star on a planet, finish the Daily Mission, or buy a spin for 25 coins!','אין סיבובים. הרוויחו כוכב בכוכב לכת, סיימו משימה יומית או קנו סיבוב ב-25 מטבעות!');$('spRes').textContent=m;toast('🎡',TX('No spins yet','אין סיבובים עדיין'),m);const w=$('wheel');w.classList.remove('shk');void w.offsetWidth;w.classList.add('shk');sfx('bad');return}S.spins--;save();spin()};
$('spinBuy').onclick=()=>{if(spinning)return;if((S.coins||0)<25){const m=TX('You need 25 coins for a spin.','צריך 25 מטבעות לסיבוב.');$('spRes').textContent=m;toast('🪙',TX('Not enough coins','אין מספיק מטבעות'),m);return}S.coins-=25;save();spin()};
$('speedBtn').onclick=startSpeed;$('dailyBtn').onclick=startDaily;

/* explorer: look, reactions, lesson */
const GLASSES=[['',0],['👓',10],['🕶️',20],['🥽',30]];
const REWARDS=[['h','🎓'],['g','👓'],['h','🎧'],['g','🕶️'],['h','🤠'],['g','🥽'],['h','🎩'],['p','🐙'],['h','👑']];
const SKINS=['#ffe0c2','#f6c99a','#e0a370','#c68642','#8d5524','#5a3a22','#8be7a1','#9ad0ff'];
const HAIRC=['#2b1b12','#6b3f1d','#c58a3a','#f2d16b','#d6452b','#7b3fe4','#ff6bb5','#3aa8ff'];
const SUITS=['#ff6b8a','#ff9f43','#ffd23f','#48d17a','#35b8e8','#6f6bff','#b05cff','#e8e8f0'];
const HAIRS=[['short','Short'],['spiky','Spiky'],['long','Long'],['pony','Pony'],['curly','Curly'],['buns','Buns']];
const STARTPETS=[['👽','Zorp'],['🐶','Comet'],['🐱','Nova'],['🤖','Beep']];
const SPECIAL={galaxy:{n:'Galaxy',c:40,st:['#1b0c5a','#7b2cbf','#1fa2c9']},gold:{n:'Gold',c:60,st:['#fff3b0','#ffd23f','#c98a00']},rainbow:{n:'Rainbow',c:80,st:['#ff6b8a','#ffd23f','#7dff9b','#5ef2ff','#b05cff']},lava:{n:'Lava',c:50,st:['#ffd23f','#ff6b3a','#a01a1a']},ice:{n:'Ice',c:50,st:['#e6fbff','#7fd8ff','#3a7bd5']}};
const SUITDEFS='<defs>'+Object.keys(SPECIAL).map(k=>'<linearGradient id="sg_'+k+'" x1="0" y1="0" x2="1" y2="1">'+SPECIAL[k].st.map((c,i,a)=>'<stop offset="'+(i/(a.length-1))+'" stop-color="'+c+'"/>').join('')+'</linearGradient>').join('')+'</defs>';
const suitCSS=k=>'linear-gradient(135deg,'+SPECIAL[k].st.join(',')+')';
const defLook=av=>av==='👦'?{body:'b',skin:SKINS[1],hair:'short',hc:HAIRC[1],suit:SUITS[4],helmet:0}:{body:'g',skin:SKINS[1],hair:'long',hc:HAIRC[1],suit:SUITS[0],helmet:0};
const baseOf=()=>S&&S.look?(S.look.body==='b'?'👦':'👧'):(['👦','👧'].includes(P&&P.av)?P.av:'👧');
let CSN=0;
function suitDef(k,u){return '<defs><linearGradient id="sg_'+k+u+'" x1="0" y1="0" x2="1" y2="1">'+SPECIAL[k].st.map((c,i,a)=>'<stop offset="'+(i/(a.length-1))+'" stop-color="'+c+'"/>').join('')+'</linearGradient></defs>'}
function charSVG(L,head){const uid=++CSN;
  const sk=L.skin,hc=L.hc,su=SPECIAL[L.suit]?'url(#sg_'+L.suit+uid+')':L.suit,girl=L.body==='g',cap='M23 43Q20 14 50 13Q80 14 77 43Q70 27 55 27Q42 31 33 30Q26 32 23 43Z';
  const back={long:'<path d="M20 44Q16 12 50 12Q84 12 80 44L83 94Q80 102 69 99L69 62L31 62L31 99Q20 102 17 94Z" fill="'+hc+'"/>',
    pony:'<ellipse cx="83" cy="56" rx="9" ry="19" transform="rotate(-14 83 56)" fill="'+hc+'"/><circle cx="77" cy="40" r="4" fill="#ff6bb5"/>',
    curly:[[26,32,13],[40,20,14],[56,18,14],[71,24,13],[78,38,11],[22,46,9],[80,48,9]].map(c=>'<circle cx="'+c[0]+'" cy="'+c[1]+'" r="'+c[2]+'" fill="'+hc+'"/>').join(''),
    buns:'<circle cx="25" cy="20" r="11" fill="'+hc+'"/><circle cx="75" cy="20" r="11" fill="'+hc+'"/>'}[L.hair]||'';
  const front=L.hair==='spiky'?'M22 44L22 22L33 30L36 10L46 26L54 8L62 26L72 12L76 30L78 44Q70 30 50 30Q30 30 22 44Z':cap;
  const body='<rect x="32" y="108" width="15" height="18" rx="6" fill="'+su+'"/><rect x="53" y="108" width="15" height="18" rx="6" fill="'+su+'"/>'+
    '<rect x="29" y="120" width="21" height="9" rx="4.5" fill="#f4f6ff"/><rect x="50" y="120" width="21" height="9" rx="4.5" fill="#f4f6ff"/>'+
    '<rect x="12" y="76" width="17" height="32" rx="8.5" fill="'+su+'"/><rect x="71" y="76" width="17" height="32" rx="8.5" fill="'+su+'"/>'+
    '<circle cx="20.5" cy="110" r="7" fill="#f4f6ff"/><circle cx="79.5" cy="110" r="7" fill="#f4f6ff"/>'+
    '<rect x="26" y="68" width="48" height="48" rx="18" fill="'+su+'"/><rect x="32" y="74" width="7" height="28" rx="3.5" fill="#fff" opacity=".2"/>'+
    '<rect x="38" y="86" width="24" height="14" rx="5" fill="#0a0e27" opacity=".55"/><circle cx="44" cy="93" r="2.6" fill="#7dff9b"/><circle cx="51" cy="93" r="2.6" fill="#ffd23f"/><circle cx="58" cy="93" r="2.6" fill="#ff6b8a"/>'+
    '<ellipse cx="50" cy="70" rx="23" ry="7" fill="#e6ebff"/><ellipse cx="50" cy="69" rx="19" ry="4.5" fill="#b9c4ff"/>';
  const face='<circle cx="23" cy="46" r="5.5" fill="'+sk+'"/><circle cx="77" cy="46" r="5.5" fill="'+sk+'"/><circle cx="50" cy="44" r="27" fill="'+sk+'"/>'+
    '<g class="eyes"><ellipse cx="40" cy="46" rx="3.6" ry="4.4" fill="#1b1230"/><ellipse cx="60" cy="46" rx="3.6" ry="4.4" fill="#1b1230"/><circle cx="41.3" cy="44.3" r="1.3" fill="#fff"/><circle cx="61.3" cy="44.3" r="1.3" fill="#fff"/></g>'+
    (girl?'<path d="M35 42L32 39M36.5 40.5L35 37M65 42L68 39M63.5 40.5L65 37" stroke="#1b1230" stroke-width="1.6" stroke-linecap="round"/>':'')+
    '<circle cx="33" cy="55" r="4.5" fill="#ff6b8a" opacity=".3"/><circle cx="67" cy="55" r="4.5" fill="#ff6b8a" opacity=".3"/>'+
    '<path d="M42 56Q50 64 58 56" stroke="#7a2230" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  const helm=L.helmet?'<circle cx="50" cy="44" r="34" fill="#bfeaff" fill-opacity=".16" stroke="#e8f8ff" stroke-width="3.5"/><path d="M26 28Q32 16 46 12" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>':'';
  return '<svg viewBox="'+(head?'6 4 88 78':'0 0 100 130')+'" width="1em" height="'+(head?'.89em':'1.3em')+'" style="display:block;overflow:visible" aria-hidden="true">'+(SPECIAL[L.suit]?suitDef(L.suit,uid):'')+back+(head?'':body)+face+(L.hair==='bald'?'':'<path d="'+front+'" fill="'+hc+'"/>')+helm+'</svg>';
}
function avatarHTML(o){o=o||{};const L=o.look||S.look||defLook(P&&P.av),pet=o.char!==undefined?o.char:S.char,h=o.h!==undefined?o.h:S.h,g=o.g!==undefined?o.g:S.g;
  return '<span class="ch">'+charSVG(L)+(h?'<span class="ca h">'+h+'</span>':'')+(g?'<span class="ca g">'+g+'</span>':'')+(pet?'<span class="ca p">'+pet+'</span>':'')+'</span>'}
/* character creator */
let CR=null;
function openCreator(mode){CR={mode,look:{...(S.look||defLook(P.av))},pet:S.char||'👽'};show('creator')}
function rc(){CR.ping=1;renderCreator()}
function renderCreator(){
  if(!CR)return;const L=CR.look;
  $('cStage').innerHTML=avatarHTML({look:L,char:CR.pet,h:S.h,g:S.g});$('cName').textContent=P.name;{const c=$('cStage').firstChild;if(CR.ping&&c){c.style.animation='jump .5s';setTimeout(()=>{c.style.animation=''},520)}CR.ping=0}
  $('cDone').textContent=CR.mode==='new'?'Blast off! 🚀':'Save ✔';
  const row=(id,items,make)=>{const el=$(id);el.innerHTML='';items.forEach(it=>{const b=make(it);el.appendChild(b)})};
  const swatch=(key)=>c=>{const b=document.createElement('button');b.className='sw'+(L[key]===c?' sel':'');b.style.setProperty('--c',SPECIAL[c]?suitCSS(c):c);b.setAttribute('aria-label',key);b.onclick=()=>{L[key]=c;rc()};return b};
  const opt=(html,on,fn,cls)=>{const b=document.createElement('button');b.className='ob'+(cls?' '+cls:'')+(on?' sel':'');b.innerHTML=html;b.onclick=fn;return b};
  row('oBody',[['b','👦','Boy'],['g','👧','Girl']],([k,e,n])=>opt('<span style="font-size:26px">'+e+'</span><span>'+n+'</span>',L.body===k,()=>{L.body=k;rc()}));
  row('oSkin',SKINS,swatch('skin'));row('oHairC',HAIRC,swatch('hc'));row('oSuit',[...SUITS,...Object.keys(SPECIAL).filter(k=>S.own['s'+k])],swatch('suit'));
  row('oHair',HAIRS,([k])=>opt('<span class="ch" style="font-size:42px">'+charSVG({...L,hair:k},1)+'</span>',L.hair===k,()=>{L.hair=k;rc()}));
  row('oHelm',[[0,'No helmet'],[1,'Helmet']],([k,n])=>opt('<span>'+n+'</span>',!!L.helmet===!!k,()=>{L.helmet=k;rc()}));
  row('oPet',STARTPETS,([e,n])=>opt('<span>'+e+'</span><small>'+n+'</small>',CR.pet===e,()=>{CR.pet=e;rc()},'pet'));
}
const pk=a=>a[Math.random()*a.length|0];
$('cRand').onclick=()=>{const L=CR.look;L.skin=pk(SKINS);L.hair=pk(HAIRS)[0];L.hc=pk(HAIRC);L.suit=pk(SUITS);L.helmet=Math.random()<.3?1:0;CR.pet=pk(STARTPETS)[0];sfx('win');rc()};
$('cBack').onclick=()=>CR&&CR.mode==='edit'?show('shop'):show('home');
$('cDone').onclick=()=>{S.look=CR.look;S.char=CR.pet;S.chars[CR.pet]=1;P.av=S.look.body==='b'?'👦':'👧';
  if(CR.mode==='new'){S.coins+=Math.min(caught,30);caught=0;updateCC();finishLogin()}else{regPlayer();save();render();show('shop');toast('✨','Looking great!','Your explorer has a new look.')}};
$('editLook').onclick=()=>openCreator('edit');
function reward(i,stars){S.rw=S.rw||{};if(!stars||S.rw[i])return'';S.rw[i]=1;const[t,e]=REWARDS[i];
  if(t==='p'){S.chars[e]=1;S.char=e}else{S.own[t+e]=1;S[t]=e}return '🎁 New accessory: '+e+'! '}
const YES=['Yes! ⭐','Great job! 🎉','Awesome! 🌟','Nailed it! 💥','Boom! 🚀'],NO=['Good try! 💪','Almost! You’ve got this!','Keep going! 🌈','Mistakes help us grow! 🌱'];
function react(good){const p=$('pop'),L=good?YES:NO;p.innerHTML=avatarHTML()+'<div class="pb">'+L[Math.random()*L.length|0]+'</div>';
  p.className='pop '+(good?'yes':'no');void p.offsetWidth;p.classList.add('on');
  clearTimeout(react.t);react.t=setTimeout(()=>p.classList.remove('on'),run&&run.m==='speed'?650:1200)}
function miss(f){if(!f||run.m==='practice'||run.m==='lesson')return;const hi=Math.max(...f),lo=Math.min(...f),k=hi+'x'+lo;
  if(!run.missed.some(m=>m.k===k))run.missed.push({k,f:[hi,lo]})}
function lessonPanel(){const L=$('lesson'),M=run.missed||[];
  if(!M.length){L.innerHTML=run.m==='lesson'?'':'<p>🌟 No mistakes this round. Wow!</p>';return}
  L.innerHTML='<h3 class="lh">📚 Your practice lesson</h3><p>Let’s master the ones that tricked you:</p>'+M.map(m=>{const[a,b]=m.f;
    return '<div class="lcard"><b>'+a+' × '+b+' = '+a*b+'</b><span>'+b+' groups of '+a+': '+Array(b).fill(a).join(' + ')+' = '+a*b+'</span><em>💡 '+TRICKS[b>=2?b:a]+'</em></div>'}).join('')+
    '<button class="btn" id="lessonGo" style="margin-top:8px">📚 Start the lesson</button>';
  $('lessonGo').onclick=()=>startLesson(M)}
function startLesson(M){stopAll();run=blank('lesson',[2],shuffle(M.map(m=>[...m.f])));gstart('📚 Practice lesson','story');
  toast('📚','Practice lesson','Get each one right to finish. No timer!');ask()}

/* Hebrew */
const HE={'🚀 Missions':'🚀 משימות','🏅 Badges':'🏅 תגים','🎡 Spin':'🎡 גלגל','💡 Tricks':'💡 טריקים','🛍️ Shop':'🛍️ חנות','👋 Switch player':'👋 החלפת שחקן',
'Pick your explorer!':'בחרו את החוקר שלכם!','Choose a boy or a girl, give them a name, and blast off!':'בחרו בן או בת, תנו שם, ויוצאים לדרך!','Blast off! 🚀':'שיגור! 🚀','Boy':'בן','Girl':'בת',
'Already on the crew? Tap your name:':'כבר בצוות? לחצו על השם שלכם:','Pick a boy or a girl first!':'בחרו בן או בת קודם!','Give your explorer a name first!':'תנו שם לחוקר שלכם קודם!',
'← Back to map':'← חזרה למפה','Moon':'הירח','Mercury':'כוכב חמה','Venus':'נוגה','Mars':'מאדים','Jupiter':'צדק','Saturn':'שבתאי','Uranus':'אורנוס','Neptune':'נפטון','Black Hole':'חור שחור',
'Asteroid Blaster':'יורה האסטרואידים','Code Breaker':'פורץ הקודים','Match-Up':'התאמות','Rover Repair':'תיקון הרובר','Lightning Storm':'סופת ברקים','Boss Battle':'קרב מול הבוס','Odd One Out':'מי לא שייך','Space Stories':'סיפורי חלל','Black Hole Escape':'בריחה מהחור השחור',
'Nice!':'יפה!','Great flying!':'טיסה מעולה!','Correct!':'נכון!','Boom!':'בום!','Hot streak! Rocket boost! 🔥':'רצף חם! דחיפה לרקטה! 🔥','Comet tail! Keep going! ☄️':'זנב שביט! ממשיכים! ☄️','SUPERNOVA! 💥':'סופרנובה! 💥',
'Not a match, try again!':'לא מתאים, נסו שוב!','Match each problem with its answer!':'התאימו כל תרגיל לתשובה שלו!',
'Yes! ⭐':'כן! ⭐','Great job! 🎉':'כל הכבוד! 🎉','Awesome! 🌟':'מעולה! 🌟','Nailed it! 💥':'בול! 💥','Boom! 🚀':'בום! 🚀','Good try! 💪':'ניסיון טוב! 💪','Almost! You’ve got this!':'כמעט! אתם יכולים!','Keep going! 🌈':'ממשיכים! 🌈','Mistakes help us grow! 🌱':'טעויות עוזרות לנו לגדול! 🌱',
'Next planet':'כוכב הבא','Fly again':'טוסו שוב','Map':'מפה','Perfect landing!':'נחיתה מושלמת!','Almost there!':'כמעט!','Lesson complete!':'השיעור הושלם!','Mission complete!':'המשימה הושלמה!','New record!':'שיא חדש!','Time’s up!':'נגמר הזמן!',
'You need 7 to land. Fly again!':'צריך 7 כדי לנחות. טוסו שוב!','📚 Your practice lesson':'📚 שיעור התרגול שלכם','Let’s master the ones that tricked you:':'בואו נשלוט בתרגילים שהפתיעו אתכם:','📚 Start the lesson':'📚 מתחילים את השיעור','🌟 No mistakes this round. Wow!':'🌟 אין טעויות בסיבוב הזה. וואו!',
'📅 Daily Mission · bonus + free spin':'📅 משימה יומית · בונוס + סיבוב חינם','Yay!':'יש!','Let’s go!':'קדימה!','Back':'חזרה','Rocket skins':'סקינים לרקטה','Hats':'כובעים','Glasses':'משקפיים','Using':'בשימוש','Use':'לבחור',
'Spin!':'סובבו!','Buy a spin 🪙25':'קנו סיבוב 🪙25','My pets (they stand next to your explorer)':'חיות המחמד שלי (עומדות ליד החוקר)','Spinning…':'מסתובב…',
'Your free daily spin is ready! 🎡 Open the Spin tab.':'הסיבוב היומי החינמי מוכן! 🎡 פתחו את לשונית הגלגל.','Pick a planet to start your mission.':'בחרו כוכב כדי להתחיל במשימה.',
'Learn a trick, then practice with no timer and no pressure.':'למדו טריק, ואז תתרגלו בלי טיימר ובלי לחץ.','▶ Play':'▶ שחקו','🔒 Earn a star on the planet before this one to unlock it':'🔒 הרוויחו כוכב בכוכב הקודם כדי לפתוח'};
Object.assign(HE,{'Blast off into a galaxy of times tables!':'יוצאים למסע בגלקסיית לוח הכפל!','What’s your name, space explorer?':'מה שמך, חוקר או חוקרת חלל?','Next ➜':'הבא ➜','← Back':'← חזרה',
'Create your explorer!':'צרו את החוקר שלכם!','I am a':'אני','Skin':'צבע עור','Hair style':'תסרוקת','Hair color':'צבע שיער','Space suit':'חליפת חלל','Space helmet':'קסדת חלל','Space buddy':'חבר חלל',
'🎲 Surprise me':'🎲 הפתיעו אותי','Save ✔':'שמירה ✔','✏️ Customize my explorer':'✏️ עיצוב החוקר שלי','No helmet':'בלי קסדה','Helmet':'קסדה','Looking great!':'נראה מעולה!','Your explorer has a new look.':'לחוקר שלכם יש מראה חדש.','Space suits':'חליפות חלל','📊 Progress':'📊 התקדמות','🛠️ Ship':'🛠️ ספינה','⋯ More':'⋯ עוד','⋯ More ':'⋯ עוד','🗣️ Character voice':'🗣️ קול הדמות','Voice':'קול','Style':'סגנון','Pitch':'גובה','Speed':'מהירות','▶ Test voice':'▶ בדיקת קול','Done':'סיום','Voices come from your device. Different devices have different voices.':'הקולות מגיעים מהמכשיר שלכם. במכשירים שונים יש קולות שונים.','Auto (best voice)':'אוטומטי (הקול הטוב ביותר)','No voices found on this device':'לא נמצאו קולות במכשיר','😊 Friendly':'😊 ידידותי','🦸 Hero':'🦸 גיבור','🐭 Squeaky':'🐭 צייצני','🤖 Robot':'🤖 רובוט','🔒 Win or buy special suits in the Shop!':'🔒 זכו או קנו חליפות מיוחדות בחנות!'});
const RK={Cadet:'צוער',Pilot:'טייס',Captain:'קפטן',Commander:'מפקד','Star Admiral':'אדמירל כוכבים'};
const HP=[[/^Welcome aboard, (.+)! Pick a planet\. Get 7 out of 10 right to unlock the next one!$/,'ברוכים הבאים, $1! בחרו כוכב. ענו נכון על 7 מתוך 10 כדי לפתוח את הבא!'],
[/^(👋 )?Welcome aboard, (.+)!$/,'$1ברוכים הבאים, $2!'],[/^⚡ Speed Round · best (\d+)$/,'⚡ סיבוב מהירות · שיא $1'],
[/^📅 Daily done! 🔥 (\d+) day streak$/,'📅 המשימה היומית הושלמה! 🔥 רצף $1 ימים'],[/^📅 (\d+) day streak$/,'📅 רצף של $1 ימים'],[/^🔥 (\d+) best$/,'🔥 שיא $1'],
[/^❄️ Freeze ×(\d+)$/,'❄️ הקפאה ×$1'],[/^Which is NOT in the (\d+) times table\?$/,'מי לא שייך ללוח הכפל של $1?'],
[/^Almost! Answer: (\d+)$/,'כמעט! התשובה: $1'],[/^Too slow! Answer: (\d+)$/,'איטי מדי! התשובה: $1'],[/^Answer: (\d+)$/,'התשובה: $1'],[/^💥 Crash! Answer: (\d+)$/,'💥 התרסקות! התשובה: $1'],
[/^(\d+) out of 10 right\. ?(.*)$/,(m,n,r)=>n+' מתוך 10 נכון. '+tr(r)],[/^🛠️ Zorp’s ship: (.*)$/,'🛠️ הספינה של זורפ: $1'],
[/^(.+) · (Cadet|Pilot|Captain|Commander|Star Admiral)$/,(m,n,r)=>n+' · '+RK[r]],
[/^🪙 You have (\d+) coins\. Every right answer earns coins!$/,'🪙 יש לכם $1 מטבעות. כל תשובה נכונה מרוויחה מטבעות!'],
[/^🎡 Spins: (\d+)\s+🪙 (\d+)\s+.*$/,'🎡 סיבובים: $1   🪙 $2   סיבוב חינם כל יום + אחד על כל כוכב חדש!']];
function tr(s){const t=s.trim();if(!t)return s;if(HE[t])return s.replace(t,HE[t]);for(const[r,x]of HP)if(r.test(t))return s.replace(t,t.replace(r,x));return s}
function trNode(n){if(n.nodeType===3){const v=tr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}else n.childNodes.forEach(trNode)}
$('langBtn').textContent=LANG==='he'?'🌐 English':'🌐 עברית';
$('langBtn').onclick=()=>{try{localStorage.setItem('ttg-lang',LANG==='he'?'en':'he')}catch(e){}location.reload()};
if(LANG==='he'){document.documentElement.lang='he';document.documentElement.dir='rtl';$('nm').placeholder='הקלידו את שמכם';
  new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='characterData')trNode(m.target);m.addedNodes.forEach(trNode)})).observe(document.body,{childList:true,subtree:true,characterData:true});trNode(document.body)}
/* interactive home */
const TX=(en,he)=>LANG==='he'?he:en;
const ZT=LANG==='he'?['היי! אני זורפ, חבר החלל שלכם! 👽','הקלידו את שמכם ולחצו על הבא ➜','לחצו על הכוכבים הצפים כדי לזכות במטבעות! ⭐','לחצו על אותיות הכותרת. זה פסנתר! 🎹','לחצו על הרקטה. תחזיקו חזק! 🚀','לחצו על הכוכב הגדול למטה. יש לו סוד! 🪐','ידעתם? 9 × 9 = 81!','פסס… 7 × 8 = 56. תזכרו!']
 :['Hi! I’m Zorp, your space buddy! 👽','Type your name and press Next ➜','Tap the floating stars to win starter coins! ⭐','Tap the letters of the title. It’s a piano! 🎹','Tap the rocket. Hold on tight! 🚀','Tap the big planet below. It has a secret! 🪐','Did you know? 9 × 9 = 81!','Pssst… 7 × 8 = 56. Remember it!'];
const DE=LANG==='he'?['הטבעות של שבתאי עשויות קרח! ❄️','ביפ בופ! קחו אותי למורה למתמטיקה! 🛸','שביט עובר! 3 × 3 = 9 ☄️','הירח אומר: 8 × 8 = 64! 🌙']
 :['Saturn’s rings are made of ice! ❄️','Beep boop! Take me to your math teacher! 🛸','Comet coming through! 3 × 3 = 9 ☄️','The Moon says: 8 × 8 = 64! 🌙'];
let caught=0,tipN=1,lastTap=Date.now(),mi=0;const MS=[5,10,20,30];
const inHome=()=>document.body.classList.contains('inhome');
function zsay(t,speak){const b=$('zb');if(!b)return;b.textContent=t;b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop');lastTap=Date.now();if(speak)say(t)}
function bump(el,cls,ms){cls=cls||'hit';el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),ms||260)}
function updateCC(){$('cc').textContent='⭐ '+caught+'  🪙 '+Math.min(caught,30)}
function updateId(){const v=$('nm').value.trim();$('idc').textContent=TX('🎫 Space Explorer: ','🎫 חוקר/ת חלל: ')+(v?v.toUpperCase():'???')}
$('nm').addEventListener('input',()=>{updateId();const v=$('nm').value.trim();
  if(v){zsay(TX('Ooh, '+v+'! Great name! 🌟','וואו, '+v+'! שם מעולה! 🌟'));const r=$('nm').getBoundingClientRect();confetti(['✨','⭐'],2,r.left+30+Math.random()*(r.width-60),r.top);beep(600+Math.random()*500,.07,'triangle',.08)}
  else zsay(ZT[1])});
$('zh').onclick=()=>{bump($('zh'));zsay(ZT[tipN++%ZT.length],true);beep(700,.08,'square',.07);beep(1000,.1,'square',.07,.09)};
const NOTES=[523,587,659,784,880,1047,880,784];
document.querySelector('h1').addEventListener('click',e=>{const sp=e.target.closest('.w span');if(!sp||!inHome())return;const i=parseInt(sp.style.getPropertyValue('--i'))||0;
  beep(NOTES[i%NOTES.length],.3,'triangle',.13);bump(sp,'k',220);confetti(['🎵','✨'],2,e.clientX,e.clientY);lastTap=Date.now()});
document.querySelectorAll('.hero .deco').forEach((b,i)=>b.onclick=()=>{bump(b);
  [()=>sweep(300,900,.25,'sine',.1),()=>{beep(880,.08,'square',.07);beep(660,.08,'square',.07,.09);beep(990,.12,'square',.07,.18)},()=>sweep(900,200,.3,'triangle',.1),()=>sweep(200,1000,.3,'sawtooth',.04)][i%4]();
  zsay(DE[i%4]);const r=b.getBoundingClientRect();confetti(['✨','⭐','💫'],6,r.left+r.width/2,r.top+r.height/2)});
$('bigR').onclick=()=>{const r=$('bigR');if(r.classList.contains('go'))return;const b=r.getBoundingClientRect();sweep(180,1400,.9,'sawtooth',.05);
  zsay(TX('3… 2… 1… Blast off! 🚀','3… 2… 1… שיגור! 🚀'));confetti(['🔥','💨','✨'],14,b.left+b.width/2,b.bottom);r.classList.add('go');setTimeout(()=>r.classList.remove('go'),1500)};
const hp=document.querySelector('.hplanet');
hp.onclick=()=>{bump(hp,'hit',320);const a=2+(Math.random()*10|0),b=2+(Math.random()*10|0);zsay(TX('Fun fact: '+a+' × '+b+' = '+a*b+'! 🪐','עובדה: '+a+' × '+b+' = '+a*b+'! 🪐'));sweep(150,500,.3,'triangle',.12)};
document.addEventListener('pointermove',e=>{if(!inHome())return;const r=$('bigR').getBoundingClientRect();$('bigR').style.rotate=(Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))*180/Math.PI+45)+'deg'});
document.addEventListener('pointerdown',e=>{if(!inHome()||e.target.closest('button,input,.panel,#crew,h1,label'))return;lastTap=Date.now();confetti(['✨','⭐','💫'],5,e.clientX,e.clientY);beep(600+Math.random()*600,.1,'sine',.1)});
function spawnStar(){if(!inHome()||document.hidden)return;const L=$('catch');if(L.children.length>=5)return;
  const bonus=Math.random()<.15,b=document.createElement('button');b.className='cstar'+(bonus?' big':'');b.textContent=bonus?'🎁':['⭐','🌟','✨','💫'][Math.random()*4|0];
  b.dataset.v=bonus?3:1;b.style.left=(5+Math.random()*82)+'%';b.style.animationDuration=(7+Math.random()*5)+'s';b.setAttribute('aria-label','Star');
  b.onclick=()=>{const v=+b.dataset.v;caught+=v;updateCC();const r=b.getBoundingClientRect();confetti(['⭐','✨'],4+v*3,r.left+r.width/2,r.top+r.height/2);
    beep(520+(caught%10)*60,.09,'square',.08);beep(780+(caught%10)*60,.12,'square',.08,.08);b.remove();
    while(mi<MS.length&&caught>=MS[mi]){const m=MS[mi++];zsay(m>=30?TX('30 stars! That’s the max: 30 starter coins! 🪙','30 כוכבים! זה המקסימום: 30 מטבעות! 🪙'):TX(m+' stars! Wow! You have '+m+' starter coins! 🪙',m+' כוכבים! וואו! יש לכם '+m+' מטבעות התחלה! 🪙'),true);sfx('fanfare')}};
  b.onanimationend=()=>b.remove();L.appendChild(b)}
setInterval(spawnStar,1500);setTimeout(spawnStar,400);
setInterval(()=>{if(inHome()&&Date.now()-lastTap>7500)zsay(ZT[tipN++%ZT.length])},2500);
/* side-scrolling planets */
const RTL=LANG==='he',RM=matchMedia('(prefers-reduced-motion: reduce)');
const TEX=[
'radial-gradient(circle at 22% 30%,#0003 0 9%,transparent 10%),radial-gradient(circle at 60% 62%,#0003 0 13%,transparent 14%),radial-gradient(circle at 82% 26%,#0002 0 6%,transparent 7%),radial-gradient(circle at 38% 82%,#0002 0 7%,transparent 8%)',
'radial-gradient(circle at 18% 28%,#0004 0 8%,transparent 9%),radial-gradient(circle at 52% 55%,#0003 0 11%,transparent 12%),radial-gradient(circle at 78% 30%,#0003 0 7%,transparent 8%),radial-gradient(circle at 70% 80%,#0003 0 9%,transparent 10%),radial-gradient(circle at 30% 75%,#0002 0 5%,transparent 6%)',
'radial-gradient(ellipse 34% 9% at 30% 34%,#fff4,transparent),radial-gradient(ellipse 30% 8% at 72% 64%,#fff3,transparent),repeating-linear-gradient(0deg,#0000 0 12%,#a0501922 12% 20%)',
'radial-gradient(ellipse 22% 14% at 30% 45%,#0004,transparent 70%),radial-gradient(circle at 70% 30%,#0003 0 8%,transparent 9%),radial-gradient(circle at 62% 74%,#0003 0 11%,transparent 12%),radial-gradient(ellipse 18% 10% at 85% 60%,#fff3,transparent)',
'repeating-linear-gradient(0deg,#0000 0 10%,#8a4a2a55 10% 18%,#fff2 18% 22%),radial-gradient(ellipse 16% 9% at 58% 62%,#c0392bcc 0 60%,#c0392b00 64%)',
'repeating-linear-gradient(0deg,#0000 0 12%,#a07a2a44 12% 20%),radial-gradient(ellipse 14% 8% at 40% 58%,#fff5 0 60%,transparent 64%)',
'repeating-linear-gradient(0deg,#0000 0 14%,#ffffff22 14% 18%),radial-gradient(ellipse 22% 8% at 36% 40%,#fff6,transparent),radial-gradient(ellipse 18% 7% at 78% 68%,#fff5,transparent)',
'radial-gradient(ellipse 14% 9% at 55% 55%,#0a1a7a99 0 60%,transparent 66%),radial-gradient(ellipse 30% 4% at 25% 35%,#fff6,transparent),radial-gradient(ellipse 28% 4% at 78% 72%,#fff5,transparent)',
'radial-gradient(2px 2px at 20% 30%,#fff,transparent),radial-gradient(2px 2px at 60% 70%,#ffd9ff,transparent),radial-gradient(3px 3px at 80% 25%,#fff,transparent),radial-gradient(2px 2px at 40% 85%,#cfe,transparent)'];
const slideLeft=(pp,el)=>{const L=el.offsetLeft-(pp.clientWidth-el.offsetWidth)/2;return RTL?L-(pp.scrollWidth-pp.clientWidth):L};
function goTo(i){const pp=$('path'),el=pp.children[i];if(el)pp.scrollTo({left:slideLeft(pp,el),behavior:'smooth'})}
let mapIdx=0;
function navMap(d){goTo(Math.max(0,Math.min(LEVELS.length-1,mapIdx+(RTL?-d:d))))}
$('arrL').onclick=()=>navMap(-1);$('arrR').onclick=()=>navMap(1);
function mapLoop(t){requestAnimationFrame(mapLoop);
  const pa=$('path');if(!pa||!pa.children.length||!$('map').classList.contains('on')||document.hidden)return;
  const pr=pa.getBoundingClientRect(),cx=pr.left+pr.width/2,kids=[...pa.children],rs=kids.map(k=>k.getBoundingClientRect());let best=0,bp=9;
  kids.forEach((sec,i)=>{
    const r=rs[i],p=(r.left+r.width/2-cx)/r.width,ap=Math.min(Math.abs(p),1);sec._p=p;if(Math.abs(p)<bp){bp=Math.abs(p);best=i}
    const q=sec._q||(sec._q={pl:sec.querySelector('.planet'),tx:sec.querySelector('.tex'),mu:sec.querySelector('.mult'),me:sec.querySelector('.meta'),gr:sec.querySelector('.sground'),st:sec.querySelector('.sstars'),pr:[...sec.querySelectorAll('.sprops span')]});
    const D=q.pl.offsetWidth||1,tilt=p*16,x=p*r.width*.9-(RM.matches?0:t*.012)+i*61;
    q.pl.style.transform='translateX('+(-p*r.width*.16)+'px) rotate('+tilt+'deg) scale('+(1-ap*.3)+')';
    q.pl.style.opacity=1-ap*.45;q.mu.style.rotate=(-tilt)+'deg';
    q.tx.style.translate=(((x%D)+D)%D-D)+'px 0';
    q.me.style.opacity=Math.max(0,1-ap*2.4);q.me.style.pointerEvents=ap<.3?'auto':'none';
    q.gr.style.transform='translateX('+(-p*r.width*.35)+'px)';q.st.style.backgroundPositionX=(-p*r.width*.5)+'px';
    q.pr.forEach((sp,k)=>{sp.style.transform='translateX('+(-p*r.width*([.45,.7,.3,.55][k]||.4))+'px) rotate('+(p*50*(k%2?1:-1))+'deg)'})});
  if(best!==mapIdx){mapIdx=best;[...$('dots').children].forEach((d,j)=>d.classList.toggle('on',j===best))}}
requestAnimationFrame(mapLoop);
/* voice settings */
let VS={voice:'',pitch:1.15,rate:1,custom:0,mode:'kid'};
try{Object.assign(VS,JSON.parse(localStorage.getItem('ttg-voice'))||{})}catch(e){}
const saveVS=()=>{try{localStorage.setItem('ttg-voice',JSON.stringify(VS))}catch(e){}};
const vRank=v=>(/natural|neural|online/i.test(v.name)?3:0)+(/google|samantha|aria|jenny|ava|allison|karen|moira|tessa|zira|libby|sonia/i.test(v.name)?2:0)+(/en-US|en-GB/i.test(v.lang)?1:0);
function voiceList(){if(!('speechSynthesis' in window))return[];return speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith(LANG==='he'?'he':'en')).sort((a,b)=>vRank(b)-vRank(a))}
function pickVoice(){const vs=voiceList();return(VS.voice&&vs.find(v=>v.name===VS.voice))||vs[0]}
function say(t,keep,real){if(muted)return;const kid=VS.mode==='kid'||!VS.mode;if(!real&&(VS.mode==='zorp'||(kid&&(!('speechSynthesis' in window)||!voiceList().length)))){zSay(t,keep);return}if(!('speechSynthesis' in window))return;
  try{if(!keep)speechSynthesis.cancel();const he=LANG==='he',boy=baseOf()==='👦';
    const u=new SpeechSynthesisUtterance(t.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,''));
    u.lang=he?'he-IL':'en-US';u.pitch=VS.custom?VS.pitch:(kid&&!real?(boy?1.55:1.85):(boy?.85:1.2));u.rate=VS.custom?VS.rate:(kid&&!real?1.08:1);u.volume=1;
    const v=pickVoice();if(v){u.voice=v;u.lang=v.lang}speechSynthesis.speak(u)}catch(e){}}
const VPRE={'😊 Friendly':[1.15,1],'🦸 Hero':[.75,.9],'🐭 Squeaky':[1.9,1.1],'🤖 Robot':[.55,.85]};
function testVoice(){say(LANG==='he'?'כל הכבוד! אתם מדהימים!':'Great job, space explorer! You are amazing!')}
function openVoice(){const sel=$('vSel'),vs=voiceList();
  sel.innerHTML='<option value="">Auto (best voice)</option>'+vs.map(v=>'<option value="'+esc(v.name)+'"'+(v.name===VS.voice?' selected':'')+'>'+esc(v.name)+' ('+v.lang+')</option>').join('');
  if(!vs.length)sel.innerHTML='<option value="">No voices found on this device</option>';
  $('vPitch').value=VS.custom?VS.pitch:(baseOf()==='👦'?.85:1.2);$('vRate').value=VS.custom?VS.rate:1;
  $('vPre').innerHTML='';Object.keys(VPRE).forEach(k=>{const b=document.createElement('button');b.className='ob';b.textContent=k;
    b.onclick=()=>{VS.pitch=VPRE[k][0];VS.rate=VPRE[k][1];VS.custom=1;saveVS();$('vPitch').value=VS.pitch;$('vRate').value=VS.rate;testVoice()};$('vPre').appendChild(b)});
  $('vTypeL').textContent=TX('Voice type','סוג קול');$('vType').innerHTML='';
  [['kid','🧒 '+TX('Kid voice','קול של ילד/ה')],['zorp','👽 '+TX('Zorp voice (made up!)','קול של זורפ (מומצא!)')],['device','🗣️ '+TX('Normal voice','קול רגיל')]].forEach(([k,n])=>{const b=document.createElement('button');b.className='ob'+((VS.mode||'kid')===k?' sel':'');b.textContent=n;b.onclick=()=>{VS.mode=k;saveVS();openVoice();testVoice()};$('vType').appendChild(b)});
  $('vbox').classList.add('on')}
if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{if($('vbox').classList.contains('on'))openVoice()};
$('voiceBtn').onclick=openVoice;$('voiceBtn2').onclick=openVoice;
$('vSel').onchange=()=>{VS.voice=$('vSel').value;VS.custom=1;saveVS();testVoice()};
$('vPitch').oninput=()=>{VS.pitch=+$('vPitch').value;VS.custom=1;saveVS()};
$('vRate').oninput=()=>{VS.rate=+$('vRate').value;VS.custom=1;saveVS()};
$('vTest').onclick=testVoice;$('vOk').onclick=()=>$('vbox').classList.remove('on');
/* ===== stage 2: guardians, Zorp, weather, game feel, tutorials ===== */
const VIEWS={},MORE=['more','teacher','tricks','badges','settings','race'];
let GID=0;
const GD=[
 {n:'Rocky',a:'#f4f4f6',b:'#8d8d96',eyes:2,back:'<circle cx="18" cy="60" r="9" fill="#a9a9b3"/><circle cx="82" cy="60" r="9" fill="#a9a9b3"/>',mid:'<circle cx="30" cy="70" r="5" fill="#0002"/><circle cx="72" cy="38" r="4" fill="#0002"/><circle cx="64" cy="76" r="6" fill="#0002"/>'},
 {n:'Sizzle',a:'#ffc58a',b:'#9a5a2e',eyes:2,back:'',front:'<path d="M40 30Q44 8 50 20Q56 4 60 30Q50 22 40 30Z" fill="#ff7a00"/><path d="M45 29Q50 16 55 29Z" fill="#ffd23f"/>'},
 {n:'Puff',a:'#fff6c8',b:'#e8a93a',eyes:2,back:'<circle cx="24" cy="52" r="16" fill="#ffe9a0"/><circle cx="76" cy="52" r="16" fill="#ffe9a0"/><circle cx="50" cy="32" r="18" fill="#fff0b8"/>',mid:'<circle cx="28" cy="62" r="5" fill="#ff8aa8" opacity=".7"/><circle cx="72" cy="62" r="5" fill="#ff8aa8" opacity=".7"/>'},
 {n:'Rusty',a:'#ff9a78',b:'#a62b1a',eyes:2,back:'<path d="M22 36L28 8L42 30Z" fill="#f4f0e0"/><path d="M78 36L72 8L58 30Z" fill="#f4f0e0"/>',mid:'<path d="M30 78l6-8 6 8M58 78l6-8 6 8" fill="none" stroke="#7a1d10" stroke-width="3"/>'},
 {n:'Stormy',a:'#f3dfc3',b:'#c98d5e',eyes:1,back:'',mid:'<path d="M18 50Q50 42 82 50M20 68Q50 76 80 68" stroke="#b9774a" stroke-width="5" fill="none" opacity=".7"/>',front:'<path d="M70 12l-8 14h8l-6 14 14-18h-9l7-10Z" fill="#ffd23f" stroke="#fff" stroke-width="1"/>'},
 {n:'Drako',a:'#ffe08a',b:'#c9861a',eyes:2,back:'<path d="M18 50Q-6 30 4 6Q22 14 30 38Z" fill="#e85d3a"/><path d="M82 50Q106 30 96 6Q78 14 70 38Z" fill="#e85d3a"/><path d="M32 34L24 12L42 28Z" fill="#fff4c9"/><path d="M68 34L76 12L58 28Z" fill="#fff4c9"/>',front:'<ellipse cx="50" cy="60" rx="46" ry="9" fill="none" stroke="#ffd2f0" stroke-width="4" opacity=".85" transform="rotate(-12 50 60)"/>'},
 {n:'Frosty',a:'#e8ffff',b:'#3aa8b8',eyes:2,back:'<path d="M28 34L34 6L44 28Z" fill="#bff6ff"/><path d="M44 28L50 0L56 28Z" fill="#d8fbff"/><path d="M56 28L66 6L72 34Z" fill="#bff6ff"/>',mid:'<circle cx="30" cy="62" r="5" fill="#fff" opacity=".8"/><circle cx="70" cy="62" r="5" fill="#fff" opacity=".8"/>'},
 {n:'Inky',a:'#9ec0ff',b:'#1d2fa8',eyes:3,back:'<path d="M22 76Q8 96 24 98M38 82Q30 100 44 100M62 82Q70 100 56 100M78 76Q92 96 76 98" stroke="#3a56d4" stroke-width="8" fill="none" stroke-linecap="round"/>',front:'<circle cx="84" cy="22" r="5" fill="none" stroke="#cfe0ff" stroke-width="2"/><circle cx="92" cy="12" r="3" fill="none" stroke="#cfe0ff" stroke-width="2"/>'},
 {n:'Voidy',a:'#3a1a6e',b:'#000',eyes:1,back:'<circle cx="50" cy="57" r="46" fill="#a56bff" opacity=".4"/><circle cx="50" cy="57" r="40" fill="#ff6b8a" opacity=".3"/>',mid:'<path d="M50 57m-26 0a26 26 0 1 1 26 26" fill="none" stroke="#a56bff" stroke-width="3" opacity=".8"/><path d="M50 57m-14 0a14 14 0 1 1 14 14" fill="none" stroke="#ff6b8a" stroke-width="3" opacity=".8"/>'}
];
function guardian(i,mood){mood=mood||'idle';const g=GD[i],id='gd'+(++GID),Eyes={1:[[50,50,11]],2:[[37,48,8],[63,48,8]],3:[[30,52,6],[50,44,8],[70,52,6]]}[g.eyes];
  const eye=([x,y,r])=>mood==='hurt'?'<path d="M'+(x-r+2)+' '+(y-r+2)+'L'+(x+r-2)+' '+(y+r-2)+'M'+(x+r-2)+' '+(y-r+2)+'L'+(x-r+2)+' '+(y+r-2)+'" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>':mood==='laugh'?'<path d="M'+(x-r)+' '+(y+3)+'Q'+x+' '+(y-r-3)+' '+(x+r)+' '+(y+3)+'" fill="none" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>':'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#fff" stroke="#0003"/><circle cx="'+(x+1)+'" cy="'+(y+1.5)+'" r="'+r*.5+'" fill="#222"/><circle cx="'+(x+2)+'" cy="'+(y-.5)+'" r="'+r*.18+'" fill="#fff"/>';
  const brows=mood==='angry'?Eyes.map(([x,y,r],k)=>'<path d="M'+(x-r-2)+' '+(y-r-(Eyes.length===2?(k?-3:3):0)-2)+'L'+(x+r+2)+' '+(y-r-(Eyes.length===2?(k?3:-3):0)-2)+'" stroke="#222" stroke-width="3.5" stroke-linecap="round"/>').join(''):'';
  const mouth={idle:'<path d="M40 70Q50 77 60 70" fill="none" stroke="#222" stroke-width="3" stroke-linecap="round"/>',hurt:'<ellipse cx="50" cy="72" rx="6" ry="8" fill="#5a0d1a"/>',laugh:'<path d="M36 66Q50 90 64 66Z" fill="#5a0d1a" stroke="#222" stroke-width="2"/>',angry:'<path d="M38 76Q50 64 62 76" fill="none" stroke="#222" stroke-width="3.5" stroke-linecap="round"/><path d="M44 71l2 5M56 71l-2 5" stroke="#fff" stroke-width="3"/>'}[mood];
  return '<svg viewBox="0 0 100 100" class="gsvg" role="img" aria-label="'+g.n+'"><defs><radialGradient id="'+id+'" cx=".35" cy=".3"><stop offset="0" stop-color="'+g.a+'"/><stop offset="1" stop-color="'+g.b+'"/></radialGradient></defs>'+(g.back||'')+'<ellipse cx="50" cy="57" rx="34" ry="30" fill="url(#'+id+')" stroke="#0005" stroke-width="2"/>'+(g.mid||'')+Eyes.map(eye).join('')+brows+mouth+(g.front||'')+'</svg>'}
function zorp(mood){mood=mood||'happy';const id='zg'+(++GID),m={happy:'<path d="M38 66Q50 78 62 66" fill="none" stroke="#1a3a1a" stroke-width="3.5" stroke-linecap="round"/>',wow:'<ellipse cx="50" cy="70" rx="7" ry="9" fill="#1a3a1a"/>',sad:'<path d="M40 74Q50 64 60 74" fill="none" stroke="#1a3a1a" stroke-width="3.5" stroke-linecap="round"/>',talk:'<path d="M38 66Q50 84 62 66Z" fill="#1a3a1a"/><path d="M44 72Q50 78 56 72" fill="#ff6b8a"/>',think:'<path d="M42 70h16" stroke="#1a3a1a" stroke-width="3.5" stroke-linecap="round"/>'}[mood]||'';
  return '<svg viewBox="0 0 100 100" class="gsvg zs" role="img" aria-label="Zorp"><defs><radialGradient id="'+id+'" cx=".35" cy=".3"><stop offset="0" stop-color="#b6ffb0"/><stop offset="1" stop-color="#2fb34a"/></radialGradient></defs><path d="M34 22Q26 6 18 10M66 22Q74 6 82 10" stroke="#2fb34a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="17" cy="10" r="5" fill="#ffd23f"/><circle cx="83" cy="10" r="5" fill="#ffd23f"/><ellipse cx="50" cy="52" rx="36" ry="34" fill="url(#'+id+')" stroke="#0004" stroke-width="2"/><ellipse cx="36" cy="46" rx="10" ry="'+(mood==='wow'?15:12)+'" fill="#0d1f0d" transform="rotate(-12 36 46)"/><ellipse cx="64" cy="46" rx="10" ry="'+(mood==='wow'?15:12)+'" fill="#0d1f0d" transform="rotate(12 64 46)"/><circle cx="39" cy="41" r="3.5" fill="#fff"/><circle cx="67" cy="41" r="3.5" fill="#fff"/>'+(mood==='sad'?'<path d="M26 34L44 38M74 34L56 38" stroke="#1a3a1a" stroke-width="3" stroke-linecap="round"/>':'')+m+'<circle cx="24" cy="62" r="4" fill="#ff8aa8" opacity=".6"/><circle cx="76" cy="62" r="4" fill="#ff8aa8" opacity=".6"/></svg>'}
$('zh').innerHTML=zorp('happy');
(()=>{const o=$('zh').onclick;$('zh').onclick=e=>{o&&o(e);$('zh').innerHTML=zorp('wow');setTimeout(()=>$('zh').innerHTML=zorp('happy'),1000)}})();
/* weather */
const WX=[{ch:['☄️','✨'],k:'diag',n:5,d:[5,9]},{ch:['🔥','✨'],k:'rise',n:10,d:[4,8]},{ch:['☁️'],k:'drift',n:6,d:[14,22],sz:[30,56]},{ch:['💨','🟤'],k:'drift',n:12,d:[4,8]},{ch:['💧'],k:'fall',n:12,d:[2,4],flash:1},{ch:['✨','💫'],k:'drift',n:12,d:[10,18]},{ch:['❄️'],k:'fall',n:18,d:[6,11]},{ch:['💧'],k:'diag',n:22,d:[1.4,2.4]},{ch:['✨','🌀','⭐'],k:'swirl',n:12,d:[5,9]}];
function wxHTML(i,small){const c=WX[i];if(!c)return'';const r=(a,b)=>a+Math.random()*(b-a),sz=c.sz||[14,26];
  return Array.from({length:small?Math.ceil(c.n*.7):c.n},(_,k)=>{const d=r(c.d[0],c.d[1]);return'<span style="left:'+(c.k==='diag'?r(20,120):r(0,100)).toFixed(0)+'%;top:'+(c.k==='drift'?r(5,80):c.k==='rise'||c.k==='fall'||c.k==='diag'?0:50).toFixed(0)+'%;font-size:'+r(sz[0],sz[1]).toFixed(0)+'px;animation:w'+c.k+' '+d.toFixed(1)+'s linear -'+r(0,d).toFixed(1)+'s infinite">'+c.ch[k%c.ch.length]+'</span>'}).join('')}
const wxCls=i=>'wx k-'+WX[i].k+(WX[i].flash?' flash':'');
/* game feel */
const gIdx=()=>run&&run.i>=0?run.i:run&&run.mystery?8:-1;
function guardSet(mood,ms){const gi=gIdx(),g=$('guard');$('game').dataset.g=gi>=0?1:0;if(gi<0){$('gwx').innerHTML='';return}
  const base=run.ph>=2?'angry':'idle';g.className='guard gg '+(mood&&mood!=='idle'?mood:'');g.innerHTML=guardian(gi,mood||base);
  if(ms)setTimeout(()=>{if(gIdx()===gi){g.className='guard gg';g.innerHTML=guardian(gi,run.ph>=2?'angry':'idle')}},ms)}
function guardWx(){const gi=gIdx(),w=$('gwx');if(gi<0){w.innerHTML='';return}w.className=wxCls(gi)+' gwx';w.innerHTML=wxHTML(gi,1)}
function shake(){const c=document.querySelector('#game .card');if(!c)return;c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}
function popCombo(n){const c=$('combo');c.textContent='🔥 '+TX('COMBO','קומבו')+' ×'+n+'!';c.style.fontSize=Math.min(26+n*3,60)+'px';c.classList.remove('go');void c.offsetWidth;c.classList.add('go')}
function banner(t,ms){const b=$('banner');b.textContent=t;b.classList.remove('go');void b.offsetWidth;b.classList.add('go')}
function flyCoin(el){const to=$('gCoin').getBoundingClientRect(),r=el?el.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  const c=document.createElement('span');c.className='flycoin';c.textContent='🪙';document.body.appendChild(c);
  const x0=r.left+r.width/2-14,y0=r.top+r.height/2-14,x1=to.left+to.width/2-14,y1=to.top+to.height/2-14;
  try{c.animate([{transform:'translate('+x0+'px,'+y0+'px) scale(.6)',opacity:1},{transform:'translate('+((x0+x1)/2)+'px,'+(Math.min(y0,y1)-60)+'px) scale(1.3)',opacity:1,offset:.4},{transform:'translate('+x1+'px,'+y1+'px) scale(.7)',opacity:.9}],{duration:750,easing:'ease-in'}).onfinish=()=>{c.remove();const g=$('gCoin');g.textContent='🪙 '+S.coins;g.classList.remove('bump');void g.offsetWidth;g.classList.add('bump')}}catch(e){c.remove()}}
function gfx(good,el){
  if(gIdx()>=0)guardSet(good?'hurt':'laugh',800);
  if(good){if(run.streak>=3)popCombo(run.streak);flyCoin(el||$('mascot'))}else shake();
  if(run.m==='boss'){const hp=Math.max(10-run.ok,0),ph=hp>6?1:hp>3?2:3;if(ph!==run.ph){const first=!run.ph;run.ph=ph;$('game').dataset.ph=ph;
    if(!first){banner(ph===2?'😡 '+TX('Phase 2: '+GD[gIdx()].n+' is angry!','שלב 2: '+GD[gIdx()].n+' כועס!'):'🔥 '+TX('FINAL PHASE!','השלב האחרון!'));shake();sfx('bad');setTimeout(()=>guardSet('angry'),850)}}}
  $('gCoin').textContent='🪙 '+S.coins}
function lastQ(){if(!run||run._lq||run.m==='speed'||run.m==='practice')return;
  const last=run.m==='lesson'?run.qs.length===1&&run.ok>0:['boss','hole'].includes(run.m)?run.ok===9:run.n===9;
  if(last){run._lq=1;banner('⭐ '+TX('LAST ONE!','השאלה האחרונה!'))}}
/* tutorials */
const TUT={blast:['☄️ 🪨 🎯',['Asteroid Blaster','משגר אסטרואידים'],['A problem shows at the top.','Rocks fall with answers on them.','Tap the right rock before it crashes!'],['מופיע תרגיל למעלה.','סלעים נופלים עם תשובות.','לחצו על הסלע הנכון לפני שהוא נופל!']],
 code:['🔐 ⌨️ ✅',['Code Breaker','פורץ הקודים'],['Solve the problem.','Type the answer on the keypad.','Press ✔ to crack the code!'],['פתרו את התרגיל.','הקלידו את התשובה במקלדת.','לחצו ✔ כדי לפרוץ את הקוד!']],
 match:['🔗 ➡️ 🧩',['Match-Up','התאמה'],['Tap a problem.','Then tap its answer.','Match all pairs. Fewer mistakes = more stars!'],['לחצו על תרגיל.','אחר כך על התשובה שלו.','התאימו את כל הזוגות. פחות טעויות = יותר כוכבים!']],
 rover:['🤖 🔧 ❓',['Rover Repair','תיקון הרובר'],['One number is missing: 6 × ? = 42.','Pick the missing number.','Fix the rover!'],['חסר מספר: 6 × ? = 42.','בחרו את המספר החסר.','תקנו את הרובר!']],
 storm:['⚡ ✅ ❌',['Lightning Storm','סערת ברקים'],['You see a full problem and an answer.','Is it True or False?','Be quick, the storm bar runs out!'],['רואים תרגיל שלם ותשובה.','נכון או לא נכון?','מהרו, פס הסערה נגמר!']],
 boss:['🐉 ⚔️ ❤️',['Boss Battle','קרב מול הבוס'],['Every right answer hurts the boss.','A wrong answer costs you a heart.','Beat all 3 phases before your hearts run out!'],['כל תשובה נכונה פוגעת בבוס.','תשובה שגויה עולה לכם לב.','נצחו את כל 3 השלבים לפני שהלבבות נגמרים!']],
 odd:['🔎 3️⃣ 🚫',['Odd One Out','מי לא שייך'],['Four numbers appear.','Three belong to the times table.','Tap the one that does NOT!'],['מופיעים ארבעה מספרים.','שלושה שייכים ללוח הכפל.','לחצו על זה שלא!']],
 story:['📖 🐶 🦴',['Space Stories','סיפורי חלל'],['Read the little story.','Think: what do you multiply?','Pick the answer!'],['קראו את הסיפור הקטן.','חשבו: מה צריך לכפול?','בחרו את התשובה!']],
 hole:['🌀 🚀 ⏱️',['Black Hole Escape','בריחה מהחור השחור'],['The black hole pulls you in.','Right answers push you away.','Wrong answers pull you closer. Escape!'],['החור השחור מושך אתכם.','תשובות נכונות דוחפות אתכם החוצה.','תשובות שגויות מקרבות אתכם. ברחו!']]};
function tutThen(i,cb){const m=GAMES[i][1],t=TUT[m];if(!t||(S.tut&&S.tut[m])){cb();return}
  $('tDemo').textContent=t[0];$('tTitle').textContent=TX(t[1][0],t[1][1])+' '+TX('— how to play','— איך משחקים');$('tSteps').innerHTML=(LANG==='he'?t[3]:t[2]).map(x=>'<li>'+x+'</li>').join('');$('tGo').textContent=TX('Got it, let’s go! 🚀','הבנתי, יאללה! 🚀');
  $('tut').classList.add('on');$('tGo').onclick=()=>{(S.tut||(S.tut={}))[m]=1;save();$('tut').classList.remove('on');cb()}}
/* ===== stage 3: ship, pet, decor, settings, race, events ===== */
const bonusPl=()=>dayNo()%9;
const DECOR=[['🪴','Plant','צמח',10],['🖼️','Space painting','ציור חלל',15],['🌈','Rainbow lamp','מנורת קשת',20],['🛋️','Bean bag','פוף',25],['🕹️','Arcade','ארקייד',30],['🔭','Telescope','טלסקופ',40],['🎸','Guitar','גיטרה',50],['🏆','Trophy','גביע',60]];
const STAGES=[[0,'🥚','Egg','ביצה'],[30,'🐣','Hatchling','אפרוח'],[100,'','Baby','תינוק'],[250,'','Buddy','חבר'],[500,'👑','Legend','אגדה']];
const petPts=()=>(S.right||0)+((S.pet&&S.pet.fed)||0)*10;
const petStage=()=>{const p=petPts();let k=0;STAGES.forEach((x,i)=>{if(p>=x[0])k=i});return k};
function shipSVG(f,fly){const G=(i,svg)=>'<g class="pt'+(f[i]?'':' ghost')+'">'+svg+'</g>';
  return '<svg class="shipsvg'+(fly?' fly':'')+'" viewBox="0 0 200 250" role="img" aria-label="Zorp’s ship"><g class="fl"><path d="M82 222Q100 262 118 222Z" fill="#ff9f43"/><path d="M90 222Q100 246 110 222Z" fill="#ffd23f"/></g>'+
  G(5,'<path d="M60 150L18 212L60 196Z" fill="#ff5a3d" stroke="#7a1d10" stroke-width="3"/><path d="M140 150L182 212L140 196Z" fill="#ff5a3d" stroke="#7a1d10" stroke-width="3"/>')+
  '<path d="M100 18Q142 70 142 150L142 200L58 200L58 150Q58 70 100 18Z" fill="#dfe5fb" stroke="#5b6aa8" stroke-width="3"/>'+
  G(1,'<path d="M76 200L124 200L112 226L88 226Z" fill="#8a8fa8" stroke="#444" stroke-width="3"/>')+
  G(0,'<rect x="76" y="152" width="48" height="38" rx="9" fill="#ffd23f" stroke="#a37b00" stroke-width="3"/><text x="100" y="178" font-size="22" text-anchor="middle">⛽</text>')+
  G(2,'<rect x="144" y="150" width="16" height="36" rx="5" fill="#48d17a" stroke="#1d7a43" stroke-width="3"/>')+
  G(3,'<circle cx="100" cy="132" r="12" fill="#fff" stroke="#333" stroke-width="3"/><path d="M100 123L104 132L100 141L96 132Z" fill="#e0457b"/>')+
  G(4,'<circle cx="100" cy="98" r="19" fill="#5ef2ff" stroke="#2a6f9a" stroke-width="4"/><path d="M90 92Q96 84 106 88" stroke="#fff" stroke-width="3" fill="none"/>')+
  G(6,'<rect x="38" y="118" width="18" height="26" rx="5" fill="#b86bff" stroke="#5a2a9a" stroke-width="3"/>')+
  G(7,'<path d="M100 18L100 -2" stroke="#444" stroke-width="3"/><circle cx="100" cy="-4" r="5" fill="#ff5a3d"/>')+
  G(8,'<path d="M100 40L112 56L100 72L88 56Z" fill="#ff6bd5" stroke="#9a2a80" stroke-width="3"/>')+'</svg>'}
function renderShip(){const f=STORY.map((p,i)=>(S.stars[i]||0)>=1),got=f.filter(Boolean).length,all=got===9,st=petStage(),pt=petPts(),nx=STAGES[st+1],pet=S.pet||{},D=S.decor||{own:{},on:{}};
  const petFace=st===0?'🥚':st===1?'🐣':(S.char||'👽'),pSize=[56,60,48+0,66,80][st]+(st>=2?0:0);
  let h='<h2 class="ph">🛠️ '+TX('Zorp’s ship','הספינה של זורפ')+'</h2><div class="pcard"><div class="shipwrap"><div id="shipSv">'+shipSVG(f)+'</div><div><b>'+got+' / 9 '+TX('parts found','חלקים נמצאו')+'</b><div class="bar2"><i style="width:'+got/9*100+'%"></i></div><div class="partlist" style="margin-top:10px">'+STORY.map((x,i)=>'<span class="'+(f[i]?'got':'')+'">'+(f[i]?x[0]:'❔')+'</span>').join('')+'</div><div class="row" style="justify-content:flex-start;margin-top:12px"><button class="btn" id="launchBtn"'+(all?'':' disabled')+'>🚀 '+(all?TX('Launch Zorp home!','שגרו את זורפ הביתה!'):TX('Find all 9 parts first','מצאו את כל 9 החלקים קודם'))+'</button></div>'+(S.launch?'<small style="color:var(--dim)">'+TX('Launched home ','שוגר הביתה ')+S.launch+'×</small>':'')+'</div></div></div>';
  h+='<h3 class="ph2">🐾 '+TX('My space pet','חיית החלל שלי')+'</h3><div class="pcard petbox"><div class="pet" style="font-size:'+pSize+'px">'+(st===4?'<div style="font-size:30px">👑</div>':'')+petFace+'</div><div style="flex:1;min-width:150px"><b>'+esc(pet.name||'Buddy')+'</b> · '+TX(STAGES[st][2],STAGES[st][3])+'<div class="bar2"><i style="width:'+(nx?Math.min(100,(pt-STAGES[st][0])/(nx[0]-STAGES[st][0])*100):100)+'%"></i></div><small style="color:var(--dim)">'+(nx?TX('Grows with every right answer. Next stage at ','גדל עם כל תשובה נכונה. השלב הבא ב-')+nx[0]+' ⭐':TX('Fully grown legend!','אגדה בוגרת לגמרי!'))+'</small><div class="row" style="justify-content:flex-start;margin-top:8px"><button class="btn alt qb" id="feedBtn">🍪 '+TX('Feed (5 🪙)','האכלה (5 🪙)')+'</button><button class="btn alt qb" id="nameBtn">✏️ '+TX('Rename','שינוי שם')+'</button></div><input id="petNm" maxlength="12" style="display:none;margin-top:8px;width:100%;font:inherit;padding:8px;border-radius:12px;border:2px solid var(--line);background:var(--void);color:var(--text)"></div></div>';
  h+='<h3 class="ph2">🏠 '+TX('Zorp’s cabin','התא של זורפ')+'</h3><div class="cabin">'+(Object.keys(D.on).filter(k=>D.on[k]).map(k=>'<span>'+k+'</span>').join('')||'<small>'+TX('Buy things below to decorate!','קנו דברים למטה כדי לקשט!')+'</small>')+'</div><div class="decor">'+DECOR.map(d=>'<button data-d="'+d[0]+'" class="'+(D.on[d[0]]?'on':'')+'"><b>'+d[0]+'</b>'+TX(d[1],d[2])+'<br>'+(D.own[d[0]]?(D.on[d[0]]?'✅ '+TX('placed','מוצב'):TX('tap to place','לחצו להצבה')):'🪙 '+d[3])+'</button>').join('')+'</div>';
  $('shipBody').innerHTML=h;
  $('launchBtn').onclick=()=>{if(!all)return;$('shipSv').innerHTML=shipSVG(f,1);let n=3;const c=()=>{banner(n>0?String(n):'🚀',900);if(n-->0)setTimeout(c,700)};c();sfx('win');
    setTimeout(()=>{banner('🏠 '+TX('Zorp is flying home!','זורפ עף הביתה!'));confetti(['🎉','⭐','🚀','✨'],40)},2300);
    setTimeout(()=>{S.launch=(S.launch||0)+1;if(S.launch===1){S.coins+=50;toast('🪙',TX('+50 coins!','+50 מטבעות!'),TX('Zorp says THANK YOU!','זורפ אומר תודה רבה!'))}save();render();renderShip()},4200)};
  $('feedBtn').onclick=()=>{if(S.coins<5){toast('🪙',TX('Need 5 coins','צריך 5 מטבעות'),TX('Play a mission to earn more!','שחקו משימה כדי להרוויח עוד!'));return}S.coins-=5;(S.pet||(S.pet={})).fed=(S.pet.fed||0)+1;save();render();sfx('win');confetti(['🍪','💖'],8);renderShip()};
  $('nameBtn').onclick=()=>{const i=$('petNm');if(i.style.display==='none'){i.style.display='block';i.value=pet.name||'';i.focus()}else{(S.pet||(S.pet={})).name=i.value.trim()||'Buddy';save();renderShip()}};
  $('petNm').onkeydown=e=>{if(e.key==='Enter')$('nameBtn').click()};
  $('shipBody').querySelectorAll('.decor button').forEach(b=>b.onclick=()=>{const d=DECOR.find(x=>x[0]===b.dataset.d),D=S.decor||(S.decor={own:{},on:{}});
    if(!D.own[d[0]]){if(S.coins<d[3]){toast('🪙',TX('Not enough coins','אין מספיק מטבעות'),TX('Need ','צריך ')+d[3]);return}S.coins-=d[3];D.own[d[0]]=1;D.on[d[0]]=1;sfx('win')}else D.on[d[0]]=!D.on[d[0]];save();render();renderShip()})}
VIEWS.ship=renderShip;
/* settings / accessibility */
let SET={};try{SET=JSON.parse(localStorage.getItem('ttg-set'))||{}}catch(e){}
function applySet(){const b=document.body.classList;b.toggle('big',!!SET.big);b.toggle('cb',!!SET.cb);b.toggle('calm',!!SET.calm)}
applySet();
function renderSettings(){const T2=[['big','🔠','Large text','טקסט גדול','Makes everything bigger.','מגדיל הכול.'],['cb','🎨','Colour-blind friendly','ידידותי לעיוורון צבעים','Right answers are blue with ✔, wrong are orange with ✖.','תשובות נכונות כחולות עם ✔, שגויות כתומות עם ✖.'],['read','🔊','Read questions aloud','הקראת שאלות','The character reads each question out loud.','הדמות מקריאה כל שאלה בקול.'],['calm','🐢','Calm mode (less motion)','מצב רגוע (פחות תנועה)','Turns off most animations and weather.','מבטל את רוב האנימציות ומזג האוויר.']];
  $('setBody').innerHTML='<h2 class="ph">⚙️ '+TX('Settings','הגדרות')+'</h2>'+T2.map(t=>'<div class="tgl"><span>'+t[1]+' '+TX(t[2],t[3])+'<small>'+TX(t[4],t[5])+'</small></span><button class="tsw" data-k="'+t[0]+'" aria-pressed="'+!!SET[t[0]]+'" aria-label="'+t[2]+'"></button></div>').join('')+'<div class="pcard">⌨️ '+TX('Keyboard: press 1, 2, 3 or 4 to pick an answer.','מקלדת: לחצו 1, 2, 3 או 4 כדי לבחור תשובה.')+'</div>';
  $('setBody').querySelectorAll('.tsw').forEach(b=>b.onclick=()=>{SET[b.dataset.k]=!SET[b.dataset.k];try{localStorage.setItem('ttg-set',JSON.stringify(SET))}catch(e){}applySet();b.setAttribute('aria-pressed',!!SET[b.dataset.k])})}
VIEWS.settings=renderSettings;
document.addEventListener('keydown',e=>{const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;const n=+e.key;if(!(n>=1&&n<=4))return;
  const sel=$('game').classList.contains('on')?'#opts .opt':$('race').classList.contains('on')?'#raceBody .opt':null;if(!sel)return;const o=document.querySelectorAll(sel)[n-1];if(o&&!o.disabled)o.click()});
/* two-player race */
let RC=null;
function renderRace(){RC=null;const nm=P?P.name:'Player 1';
  $('raceBody').innerHTML='<h2 class="ph">🏁 '+TX('2-Player Race','מירוץ לשניים')+'</h2><div class="pcard">'+TX('Two kids, one screen! Take turns. Each right answer moves your rocket. First to 8 wins!','שני ילדים, מסך אחד! משחקים בתורות. כל תשובה נכונה מקדמת את הרקטה. הראשון ל-8 מנצח!')+'</div><label class="mini">'+TX('Player 1','שחקן 1')+'</label><input id="rn1" maxlength="12" value="'+esc(nm)+'" style="width:100%;font:inherit;padding:10px;border-radius:12px;border:2px solid var(--line);background:var(--void);color:var(--text)"><label class="mini">'+TX('Player 2','שחקן 2')+'</label><input id="rn2" maxlength="12" placeholder="'+TX('Friend','חבר/ה')+'" style="width:100%;font:inherit;padding:10px;border-radius:12px;border:2px solid var(--line);background:var(--void);color:var(--text)"><label class="mini">'+TX('Tables','לוחות')+'</label><select id="rt" style="width:100%;font:inherit;padding:10px;border-radius:12px;border:2px solid var(--line);background:var(--void);color:var(--text)"><option value="2-5">2 – 5</option><option value="6-9" selected>6 – 9</option><option value="2-12">'+TX('Mixed 2 – 12','מעורב 2 – 12')+'</option></select><div class="row" style="margin-top:14px"><button class="btn" id="rGo">🏁 '+TX('Start race','התחילו מירוץ')+'</button></div>';
  $('rGo').onclick=()=>{const[a,b]=$('rt').value.split('-').map(Number);RC={n:[$('rn1').value.trim()||'Player 1',$('rn2').value.trim()||TX('Friend','חבר/ה')],sc:[0,0],turn:0,lo:a,hi:b,t:0};raceAsk()}}
function raceDraw(body){const L=i=>'<div class="lane'+(RC.turn===i?' me':'')+'"><b>'+(i?'🧑‍🚀 ':'👧 ')+esc(RC.n[i])+'</b> · '+RC.sc[i]+'/8<div class="tr"><i style="left:calc('+Math.min(RC.sc[i],8)/8*88+'% )">🚀</i></div></div>';$('raceBody').innerHTML=L(0)+L(1)+body}
function raceAsk(){if(RC.sc[0]>=8||RC.sc[1]>=8||RC.t>=24)return raceEnd();
  const a=RC.lo+(Math.random()*(RC.hi-RC.lo+1)|0),b=2+(Math.random()*11|0),ans=a*b,ch=choices(a,b);RC.cur={ans};
  raceDraw('<div class="pcard" style="text-align:center"><b>'+TX('Your turn, ','תורך, ')+esc(RC.n[RC.turn])+'!</b></div><div class="rq">'+a+' × '+b+'</div><div class="ropts">'+ch.map(v=>'<button class="opt" data-v="'+v+'">'+v+'</button>').join('')+'</div>');
  document.querySelectorAll('#raceBody .opt').forEach(o=>o.onclick=()=>{document.querySelectorAll('#raceBody .opt').forEach(x=>{x.disabled=true;if(+x.dataset.v===ans)x.classList.add('right')});
    const good=+o.dataset.v===ans;if(good){RC.sc[RC.turn]++;sfx('win')}else{o.classList.add('wrong');sfx('bad')}RC.t++;
    setTimeout(()=>{RC.turn=1-RC.turn;raceAsk()},good?700:1300)})}
function raceEnd(){const w=RC.sc[0]===RC.sc[1]?-1:RC.sc[0]>RC.sc[1]?0:1;sfx('win');confetti(['🏆','⭐','🎉'],30);
  raceDraw('<div class="pcard" style="text-align:center;font-size:22px">'+(w<0?'🤝 '+TX('It’s a tie!','תיקו!'):'🏆 '+esc(RC.n[w])+' '+TX('wins!','מנצח/ת!'))+'</div><div class="row"><button class="btn" id="raceAgain">🔁 '+TX('Race again','עוד מירוץ')+'</button></div>');$('raceAgain').onclick=renderRace}
VIEWS.race=renderRace;
/* meteor shower event */
function meteorShow(){const box=$('meteors');banner('☄️ '+TX('Meteor shower! Tap them!','מטר מטאורים! לחצו עליהם!'));let got=0;
  for(let k=0;k<6;k++){const m=document.createElement('button');m.className='met';m.textContent='☄️';m.setAttribute('aria-label','meteor');m.style.left=(35+Math.random()*70)+'%';m.style.animationDelay=(k*.9)+'s';m.style.animationDuration=(4.5+Math.random()*2)+'s';
    m.onclick=()=>{if(m.classList.contains('hit'))return;m.classList.add('hit');got++;S.coins++;save();render();beep(900+got*120,.1,'square',.06);confetti(['🪙'],4,m.getBoundingClientRect().left,m.getBoundingClientRect().top);setTimeout(()=>m.remove(),300)};
    m.addEventListener('animationend',e=>{if(e.animationName==='metFall')m.remove()});box.appendChild(m)}}
setInterval(()=>{const v=document.querySelector('.view.on');if(P&&v&&v.id==='map'&&!document.querySelector('.met')&&!$('tut').classList.contains('on'))meteorShow()},60000);
/* ===== Zorp voice: an invented talking-alien voice made from musical blips (no recordings needed) ===== */
const ZVOW={a:[800,1250],e:[550,1800],i:[320,2300],o:[500,900],u:[350,800]};
let zEnd=0,zNodes=[];
function zStop(){zNodes.forEach(o=>{try{o.stop()}catch(e){}});zNodes=[];zEnd=0}
/* schedules the blips on any AudioContext (live, or offline for previews). returns end time */
function zSchedule(ctx,dest,text,at,base,step,track){
  const s=text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu,'').toLowerCase().slice(0,110),tail=s.trim().slice(-1),n=(s.match(/\p{L}/gu)||[]).length||1;let li=0;
  for(const ch of s){
    if(/\p{L}/u.test(ch)){
      const code=ch.codePointAt(0),vow=ZVOW[ch]||(code>1487&&code%3===0?[600,1500]:null),prog=li/n;
      let semi=[0,2,4,7,9][code%5]+((code>>2)%2)*12-4+(tail==='?'?prog*6:0)+(tail==='!'&&prog>.75?4:0)-(tail==='.'&&prog>.8?3:0);
      const f=base*Math.pow(2,semi/12),d=step*(vow?2.3:1.15),o=ctx.createOscillator(),bp=ctx.createBiquadFilter(),g=ctx.createGain();
      o.type=vow?'sawtooth':'square';o.frequency.setValueAtTime(f,at);o.frequency.linearRampToValueAtTime(f*(vow?1.05:1.18),at+d);
      bp.type='bandpass';bp.Q.value=vow?5:3;bp.frequency.value=vow?vow[0]:1400+(code%7)*260;
      g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vow?.9:.55,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+d);
      o.connect(bp);bp.connect(g);g.connect(dest);o.start(at);o.stop(at+d+.02);if(track)zNodes.push(o);at+=d*.9;li++}
    else if(ch===' ')at+=step*1.4;else if(/[,;:]/.test(ch))at+=step*2.5;else if(/[.!?]/.test(ch))at+=step*4}
  return at}
function zSay(t,keep){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){return}
  if(!keep)zStop();const mul=VS.custom?VS.pitch:(baseOf()==='👦'?.85:1.2),at=Math.max(AC.currentTime+.03,keep?zEnd+.2:0);
  const gm=AC.createGain();gm.gain.value=2.2;const cp=AC.createDynamicsCompressor();gm.connect(cp);cp.connect(AC.destination);setTimeout(()=>{try{gm.disconnect()}catch(e){}},9000);
  zEnd=zSchedule(AC,gm,t,at,300*mul,.05/(VS.custom?VS.rate:1),true)}
/* ===== stage 4: optional real audio + offline ===== */
/* Drop audio/music.mp3 and audio/cheer.mp3 next to index.html and they are used instead of the built-in synth sounds. */
const REAL={};
['music','cheer'].forEach(k=>{try{const a=new Audio('audio/'+k+'.mp3');a.preload='auto';a.addEventListener('canplaythrough',()=>{REAL[k]=a},{once:true});a.addEventListener('error',()=>{},{once:true})}catch(e){}});
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}
/* progress, quests, mystery planet, teacher, codes */
const QUESTS=[{id:'streak5',n:1,r:8,en:'Get a streak of 5 in a row',he:'הגיעו לרצף של 5 תשובות נכונות'},{id:'planets',n:2,r:10,en:'Finish 2 planets',he:'סיימו 2 כוכבים'},{id:'speed',n:1,r:10,en:'Get 8 right in a Speed Round',he:'ענו 8 נכון בסיבוב מהירות'},{id:'right30',n:30,r:12,en:'Answer 30 questions right',he:'ענו נכון על 30 שאלות'},{id:'perfect',n:1,r:15,en:'Get a perfect 10 out of 10',he:'קבלו 10 מתוך 10'},{id:'lesson',n:1,r:8,en:'Finish a practice lesson',he:'סיימו שיעור תרגול'},{id:'mystery',n:1,r:12,en:'Finish the Mystery Planet',he:'סיימו את כוכב התעלומה'}];
const todayIds=()=>{const d=dayNo();return[0,2,4].map(k=>QUESTS[(d+k)%QUESTS.length].id)};
const Q=()=>S.dq&&S.dq.d===dayNo()?S.dq:(S.dq={d:dayNo(),p:{},c:{}});
function qadd(id,n){if(!S||!S.right&&S.right!==0)return;if(!todayIds().includes(id))return;const q=Q();q.p[id]=(q.p[id]||0)+(n||1)}
const allKeys=()=>{const k=[];for(let a=1;a<=12;a++)for(let b=a;b<=12;b++)k.push(a+'x'+b);return k};
function classStats(){const out=[];players().forEach(pl=>{let st=null;if(P&&pl.name.toLowerCase()===P.name.toLowerCase())st=S;else try{st=JSON.parse(localStorage.getItem(KEY+pl.name.toLowerCase()))}catch(e){}if(st)out.push({name:pl.name,av:pl.av,S:st})});
  if(P&&!out.some(o=>o.name.toLowerCase()===P.name.toLowerCase()))out.push({name:P.name,av:P.av,S});return out}
const masteredOf=st=>allKeys().filter(k=>st.facts&&st.facts[k]&&st.facts[k].lv>=4).length;
const weakOf=(st,n)=>Object.keys(st.facts||{}).filter(k=>st.facts[k].lv<=3).sort((a,b)=>st.facts[a].lv-st.facts[b].lv||st.facts[b].w-st.facts[a].w).slice(0,n);
const fmt=k=>k.replace('x',' × ');
function rocketHTML(total){const goal=500,lvl=Math.floor(total/goal),fr=(total%goal)/goal;
  return '<div class="pcard"><b>🚀 '+TX('Class rocket','רקטת הכיתה')+' #'+(lvl+1)+'</b> · '+(total%goal)+' / '+goal+'<div class="bar2"><i style="width:'+(fr*100)+'%"></i></div><small style="color:var(--dim)">'+TX('Every right answer from every player on this computer fuels it. Rockets launched: ','כל תשובה נכונה של כל השחקנים במחשב הזה מתדלקת אותה. רקטות ששוגרו: ')+lvl+'</small></div>'}
function renderProgress(){
  const F0=S.facts||{},keys=allKeys(),mastered=masteredOf(S),seen=keys.filter(k=>F0[k]).length,q=Q(),total=classStats().reduce((a,o)=>a+(o.S.right||0),0);
  let h='<h2 class="ph">📊 '+TX('My progress','ההתקדמות שלי')+'</h2><div class="pcard"><b>'+mastered+' / 78</b> '+TX('facts mastered','עובדות שנלמדו')+' · '+seen+' '+TX('practiced','תורגלו')+'<div class="bar2"><i style="width:'+(mastered/78*100)+'%"></i></div></div>';
  h+='<h3 class="ph2">🎯 '+TX('Today’s quests','משימות היום')+'</h3>'+todayIds().map(id=>{const Qd=QUESTS.find(x=>x.id===id),p=Math.min(q.p[id]||0,Qd.n),done=p>=Qd.n;
    return '<div class="qrow"><span>'+TX(Qd.en,Qd.he)+'<small>'+p+' / '+Qd.n+'</small></span>'+(q.c[id]?'<b>✅</b>':done?'<button class="btn qb" data-q="'+id+'">'+TX('Claim','קבלו')+' 🪙'+Qd.r+'</button>':'<b>🪙'+Qd.r+'</b>')+'</div>'}).join('');
  h+='<h3 class="ph2">🔮 '+TX('Mystery Planet','כוכב התעלומה')+'</h3><div class="pcard">'+TX('A special planet made from the facts that tricked you most.','כוכב מיוחד שנבנה מהתרגילים שהכי בלבלו אתכם.')+'<div class="row" style="margin-top:8px"><button class="btn" id="mysBtn"'+(seen>=6?'':' disabled')+'>'+(seen>=6?'🔮 '+TX('Visit the Mystery Planet','בקרו בכוכב התעלומה'):TX('Play a few planets first','שחקו כמה כוכבים קודם'))+'</button></div></div>';
  h+='<h3 class="ph2">🧮 '+TX('My times-table map','מפת לוח הכפל שלי')+'</h3><div class="mg"><b></b>'+[1,2,3,4,5,6,7,8,9,10,11,12].map(c=>'<b>'+c+'</b>').join('');
  for(let r=1;r<=12;r++){h+='<b>'+r+'</b>';for(let c=1;c<=12;c++){const rec=F0[fk(r,c)];h+='<button class="mc2 l'+(rec?rec.lv:0)+'" data-f="'+r+'x'+c+'" aria-label="'+r+' times '+c+'">'+(rec&&rec.lv>=4?'✓':'')+'</button>'}}
  h+='</div><div class="leg"><span><i style="background:#1b2160"></i>'+TX('new','חדש')+'</span><span><i style="background:#e0457b"></i>'+TX('learning','לומדים')+'</span><span><i style="background:#ff9f43"></i></span><span><i style="background:#ffd23f"></i></span><span><i style="background:#48d17a"></i>✓ '+TX('strong','חזק')+'</span><span><i style="background:#ffd23f"></i>✓ '+TX('mastered','שולטים')+'</span></div>';
  h+=rocketHTML(total)+'<h3 class="ph2">🏆 '+TX('Keep & share','שמרו ושתפו')+'</h3><div class="row" style="justify-content:flex-start"><button class="btn alt" id="certBtn">🏆 '+TX('My certificate','התעודה שלי')+'</button><button class="btn alt" id="codeBtn">📤 '+TX('Copy my save code','העתקת קוד השמירה')+'</button></div><div id="codeOut"></div><textarea class="tarea" id="codeIn" placeholder="'+TX('Paste a save code here to load it','הדביקו כאן קוד שמירה כדי לטעון')+'"></textarea><div class="row" style="justify-content:flex-start"><button class="btn alt" id="codeLoad">📥 '+TX('Load save code','טעינת קוד שמירה')+'</button></div>';
  $('progBody').innerHTML=h;
  $('progBody').querySelectorAll('.qb').forEach(b=>b.onclick=()=>{const Qd=QUESTS.find(x=>x.id===b.dataset.q);S.coins+=Qd.r;Q().c[Qd.id]=1;save();render();renderProgress();sfx('win');confetti(['🪙','⭐','✨'],18)});
  $('progBody').querySelectorAll('.mc2').forEach(b=>b.onclick=()=>{const[x,y]=b.dataset.f.split('x').map(Number),rec=F0[fk(x,y)];toast('🧮',x+' × '+y+' = '+x*y,(rec?rec.n+' tries, '+rec.w+' misses. ':'Not played yet. ')+'💡 '+TRICKS[Math.max(x,y)>=2?Math.max(x,y):x])});
  $('mysBtn').onclick=startMystery;$('certBtn').onclick=showCert;$('codeBtn').onclick=()=>copyText(exportCode(P.name),'codeOut');
  $('codeLoad').onclick=()=>{try{const nm=importCode($('codeIn').value);toast('📥',TX('Loaded!','נטען!'),nm)}catch(e){toast('⚠️',TX('That code did not work','הקוד לא עבד'),TX('Check you copied all of it.','בדקו שהעתקתם את כולו.'))}}}
VIEWS.progress=renderProgress;
function startMystery(){const F0=S.facts||{},ks=allKeys().filter(k=>F0[k]&&F0[k].lv<=3).sort((a,b)=>F0[a].lv-F0[b].lv||F0[b].w-F0[a].w).slice(0,8);
  if(ks.length<8)allKeys().filter(k=>!F0[k]&&!k.startsWith('1x')).sort(()=>Math.random()-.5).slice(0,8-ks.length).forEach(k=>ks.push(k));
  stopAll();run=blank('lesson',[2],shuffle(ks.map(k=>{const[a,b]=k.split('x').map(Number);return[b,a]})));run.mystery=1;gstart('🔮 Mystery Planet','odd');
  toast('🔮',TX('Mystery Planet','כוכב התעלומה'),TX('Your trickiest facts. Get each one right!','התרגילים הכי מסובכים שלכם. ענו נכון על כל אחד!'));ask()}
/* more menu */
VIEWS.more=()=>{const items=[['tricks','💡','Tricks','טריקים'],['badges','🏅','Badges','תגים'],['race','🏁','2-Player Race','מירוץ לשניים'],['teacher','🧑‍🏫','Teacher page','דף מורה'],['settings','⚙️','Settings','הגדרות'],['cert','🏆','My certificate','התעודה שלי'],['home','👋','Switch player','החלפת שחקן']];
  $('moreGrid').innerHTML=items.map(([go,e,en,he])=>'<button data-go="'+go+'"><span>'+e+'</span>'+TX(en,he)+'</button>').join('');
  $('moreGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.go==='cert')showCert();else{render();show(b.dataset.go)}})};
/* save codes */
const enc=o=>btoa(unescape(encodeURIComponent(JSON.stringify(o)))),dec=c=>JSON.parse(decodeURIComponent(escape(atob(c.trim()))));
function exportCode(name){let st=P&&name===P.name?S:null;if(!st)try{st=JSON.parse(localStorage.getItem(KEY+name.toLowerCase()))}catch(e){}const pl=players().find(x=>x.name===name)||{name,av:'👧'};return enc({v:2,n:name,av:pl.av,s:st})}
function importCode(c){const o=dec(c);if(!o||!o.n||!o.s)throw new Error('bad');try{localStorage.setItem(KEY+o.n.toLowerCase(),JSON.stringify(o.s));localStorage.setItem('ttg-players',JSON.stringify([{name:o.n,av:o.av||'👧'},...players().filter(p=>p.name.toLowerCase()!==o.n.toLowerCase())].slice(0,12)))}catch(e){}
  if(P&&P.name.toLowerCase()===o.n.toLowerCase()){S=o.s;render()}return o.n}
function copyText(t,outId){const done=()=>toast('📋',TX('Copied!','הועתק!'),TX('Paste it on the other computer.','הדביקו במחשב השני.'));
  const fallback=()=>{const o=$(outId);if(o){o.innerHTML='<textarea class="tarea" id="codeSel" readonly></textarea>';const ta=$('codeSel');ta.value=t;ta.focus();ta.select()}};
  try{navigator.clipboard.writeText(t).then(done,fallback)}catch(e){fallback()}}
/* certificate */
function showCert(){const done=Object.values(S.stars).filter(x=>x>=1).length,stars=Object.values(S.stars).reduce((a,b)=>a+b,0);
  $('paper').innerHTML='<div style="font-size:42px">🏆</div><h2>'+TX('Certificate of Space Exploration','תעודת חוקר חלל')+'</h2><p>'+TX('This proudly certifies that','תעודה זו מעידה בגאווה כי')+'</p><div class="nmx">'+esc(P.name)+'</div>'+avatarHTML()+
    '<p>'+TX('has landed on '+done+' of 9 planets, earned '+stars+' stars, and answered '+(S.right||0)+' questions correctly in','נחת על '+done+' מתוך 9 כוכבים, צבר '+stars+' כוכבים וענה נכון על '+(S.right||0)+' שאלות ב')+' <b>'+TX('Times Table Galaxy','גלקסיית לוח הכפל')+'</b>.</p><p>'+new Date().toLocaleDateString(LANG==='he'?'he-IL':'en-US',{year:'numeric',month:'long',day:'numeric'})+' · 👽 Zorp</p>';
  $('cert').classList.add('on');sfx('win');confetti(['🎉','⭐','✨'],24)}
$('certClose').onclick=()=>$('cert').classList.remove('on');
$('certPrint').onclick=()=>{try{window.print()}catch(e){}toast('🖨️',TX('Printing','הדפסה'),TX('If nothing opens, take a screenshot instead.','אם לא נפתח כלום, צלמו מסך.'))};
/* teacher page */
function renderTeacher(){const cs=classStats(),total=cs.reduce((a,o)=>a+(o.S.right||0),0),agg={};
  cs.forEach(o=>Object.keys(o.S.facts||{}).forEach(k=>{agg[k]=(agg[k]||0)+o.S.facts[k].w}));
  const hard=Object.keys(agg).filter(k=>agg[k]>0).sort((a,b)=>agg[b]-agg[a]).slice(0,10);
  let h='<h2 class="ph">🧑‍🏫 '+TX('Teacher page','דף מורה')+'</h2>'+rocketHTML(total)+'<h3 class="ph2">'+TX('Players on this computer','שחקנים במחשב הזה')+'</h3><div class="tw"><table class="tt"><tr><th>'+TX('Name','שם')+'</th><th>⭐</th><th>🪐</th><th>🪙</th><th>🔥</th><th>✅</th><th>🧮 /78</th><th>'+TX('Needs practice','צריך תרגול')+'</th><th></th></tr>';
  cs.forEach((o,i)=>{const st=o.S;h+='<tr><td>'+o.av+' '+esc(o.name)+'</td><td>'+Object.values(st.stars||{}).reduce((a,b)=>a+b,0)+'</td><td>'+Object.values(st.stars||{}).filter(x=>x>=1).length+'/9</td><td>'+(st.coins||0)+'</td><td>'+(st.best||0)+'</td><td>'+(st.right||0)+'</td><td>'+masteredOf(st)+'</td><td>'+(weakOf(st,3).map(fmt).join(', ')||'–')+'</td><td><button class="btn alt qb" data-c="'+i+'">📤</button> <button class="btn alt qb" data-d="'+i+'">🗑️</button></td></tr>'});
  h+='</table></div><h3 class="ph2">'+TX('Hardest facts for the class','התרגילים הקשים לכיתה')+'</h3><div class="chips2">'+(hard.length?hard.map(k=>'<span>'+fmt(k)+' · '+agg[k]+'</span>').join(''):'<small>'+TX('No data yet','אין נתונים עדיין')+'</small>')+'</div>';
  h+='<h3 class="ph2">'+TX('Tools','כלים')+'</h3><div class="row" style="justify-content:flex-start"><button class="btn alt" id="tRep">📋 '+TX('Copy class report','העתקת דוח כיתה')+'</button></div><div id="tOut"></div><textarea class="tarea" id="tIn" placeholder="'+TX('Paste a save code to add a player','הדביקו קוד שמירה כדי להוסיף שחקן')+'"></textarea><div class="row" style="justify-content:flex-start"><button class="btn alt" id="tLoad">📥 '+TX('Add player from code','הוספת שחקן מקוד')+'</button></div><p class="mini">'+TX('Data lives in this browser only. Use save codes to move a player to another computer.','הנתונים שמורים בדפדפן הזה בלבד. השתמשו בקודי שמירה כדי להעביר שחקן למחשב אחר.')+'</p>';
  $('teachBody').innerHTML=h;
  $('teachBody').querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>copyText(exportCode(cs[+b.dataset.c].name),'tOut'));
  $('teachBody').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const o=cs[+b.dataset.d];if(P&&o.name.toLowerCase()===P.name.toLowerCase()){toast('⚠️',TX('This is the active player','זה השחקן הפעיל'),TX('Switch player first.','החליפו שחקן קודם.'));return}
    if(b.dataset.s){try{localStorage.removeItem(KEY+o.name.toLowerCase());localStorage.setItem('ttg-players',JSON.stringify(players().filter(p=>p.name.toLowerCase()!==o.name.toLowerCase())))}catch(e){}renderTeacher();return}
    b.dataset.s=1;b.textContent='❓';setTimeout(()=>{delete b.dataset.s;b.textContent='🗑️'},3500)});
  $('tRep').onclick=()=>copyText('Name,Stars,Planets,Coins,BestStreak,Correct,Mastered\n'+cs.map(o=>[o.name,Object.values(o.S.stars||{}).reduce((a,b)=>a+b,0),Object.values(o.S.stars||{}).filter(x=>x>=1).length,o.S.coins||0,o.S.best||0,o.S.right||0,masteredOf(o.S)].join(',')).join('\n'),'tOut');
  $('tLoad').onclick=()=>{try{const nm=importCode($('tIn').value);toast('📥',TX('Added','נוסף'),nm);renderTeacher()}catch(e){toast('⚠️',TX('That code did not work','הקוד לא עבד'),'')}}}
VIEWS.teacher=renderTeacher;
$('go').onclick=()=>login($('nm').value);
$('nm').onkeydown=e=>{if(e.key==='Enter')login($('nm').value)};
show('home');