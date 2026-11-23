import {regenerate,gameLayout,pieceLayer,squareCenter,snakePath,die} from './boardSnakes.js';

const status=document.getElementById('status');
const intro=document.getElementById('intro');
const finish=document.getElementById('finish');
const resultText=document.getElementById('resultText');
// A completed turn is one die roll, including bonus rolls after a six.
// sessionStorage survives reloads in this browser tab but not the end of the tab session.
const CHART_KEY='snakes-and-ladders-trial5-charts-v1';
const charts=document.getElementById('charts');
const chartsContent=document.getElementById('chartsContent');
let completedTurns=0;
let chartOpen=false;
function readCharts(){
 try{const data=JSON.parse(sessionStorage.getItem(CHART_KEY)||'[]');return Array.isArray(data)?data.filter(x=>(x.winner==='Player'||x.winner==='Computer')&&Number.isInteger(x.turns)&&x.turns>0).slice(0,10):[];}
 catch{return [];}
}
function saveResult(winner,turns){
 const entries=readCharts();entries.push({winner,turns});
 entries.sort((a,b)=>a.turns-b.turns);
 try{sessionStorage.setItem(CHART_KEY,JSON.stringify(entries.slice(0,10)));}catch(e){console.warn('Session chart storage unavailable:',e);}
}
function renderCharts(){
 chartsContent.replaceChildren();
 const entries=readCharts();
 if(!entries.length){const p=document.createElement('p');p.className='chart-empty';p.textContent='No completed games yet.';chartsContent.append(p);return;}
 const table=document.createElement('table');table.className='chart-table';
 const head=document.createElement('thead');head.innerHTML='<tr><th scope="col">Rank</th><th scope="col">Winner</th><th scope="col">Turns</th></tr>';table.append(head);
 const body=document.createElement('tbody');
 entries.forEach((entry,i)=>{const row=document.createElement('tr');[String(i+1),entry.winner,String(entry.turns)].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell);});body.append(row);});
 table.append(body);chartsContent.append(table);
}
function openCharts(){renderCharts();chartOpen=true;charts.hidden=false;die.setEnabled(false);document.getElementById('chartsClose').focus();}
function closeCharts(){charts.hidden=true;chartOpen=false;if(active&&turn==='player')die.setEnabled(true);document.getElementById('chartsButton').focus();}
document.getElementById('chartsButton').addEventListener('click',openCharts);
document.getElementById('chartsClose').addEventListener('click',closeCharts);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let token=0,active=false,turn='player',positions={player:1,computer:1};
const pawns={};
function pawn(fill){
  // 25 px high, pawn head and flared base, with black outline.
  const group=new Konva.Group({listening:false});
  group.add(new Konva.Path({data:'M 0 -12.5 C -7 -12.5 -8 -7.2 -7 -3.5 C -6 -0.5 -3 -0.2 -2.8 1.4 L -9.4 10 Q -11 12.5 -7 12.5 L 7 12.5 Q 11 12.5 9.4 10 L 2.8 1.4 C 3 -0.2 6 -0.5 7 -3.5 C 8 -7.2 7 -12.5 0 -12.5 Z',fill,stroke:'#151515',strokeWidth:1.3,lineJoin:'round'}));
  pieceLayer.add(group);return group;
}
pawns.computer=pawn('#fff');pawns.player=pawn('#ef3526');
function lanePoint(square,who){const p=squareCenter(square);return {x:p.x,y:p.y+(who==='computer'?-8:8)};}
function place(who,square){pawns[who].position(lanePoint(square,who));pieceLayer.batchDraw();}
function showTurn(){status.textContent=turn==='player'?'Your turn — touch or click the die':"Computer's turn";}
function assertActive(t){return active&&token===t;}
async function hop(who,from,to,t){
  const a=lanePoint(from,who),b=lanePoint(to,who),duration=200;
  await animate(duration,k=>{const p={x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k-10*Math.sin(Math.PI*k)};pawns[who].position(p);pieceLayer.batchDraw();},t);
}
function animate(duration,step,t){return new Promise(resolve=>{
 const start=performance.now();function frame(now){if(!assertActive(t)){resolve();return;}const k=Math.min(1,(now-start)/duration);step(k);if(k<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);
});}
async function slide(who,points,t){
  const first=lanePoint(positions[who],who),last=lanePoint(points.end,who);
  const coords=[first,...points.path.slice(1,-1),last];
  const lens=[0];for(let i=1;i<coords.length;i++)lens.push(lens[i-1]+Math.hypot(coords[i].x-coords[i-1].x,coords[i].y-coords[i-1].y));
  const total=lens[lens.length-1];
  await animate(800,k=>{const d=k*total;let i=1;while(i<lens.length-1&&lens[i]<d)i++;const span=lens[i]-lens[i-1],f=span?(d-lens[i-1])/span:0;pawns[who].position({x:coords[i-1].x+(coords[i].x-coords[i-1].x)*f,y:coords[i-1].y+(coords[i].y-coords[i-1].y)*f});pieceLayer.batchDraw();},t);
}
async function move(who,roll,t){
 const from=positions[who],dest=from+roll;
 if(dest>88){status.textContent=`${who==='player'?'You need':'Computer needs'} an exact roll to reach 88`;await sleep(600);return;}
 for(let n=from+1;n<=dest;n++){if(!assertActive(t))return;await hop(who,n-1,n,t);positions[who]=n;}
 if(dest===88)return;
 const snakeIndex=gameLayout.snakes.findIndex(s=>s.from===dest);
 const ladderIndex=gameLayout.ladders.findIndex(l=>l.from===dest);
 if(snakeIndex>=0){const s=gameLayout.snakes[snakeIndex];status.textContent=`${who==='player'?'You slide':'Computer slides'} down a snake!`;await sleep(220);if(!assertActive(t))return;await slide(who,{path:snakePath(gameLayout.snakeGeometry[snakeIndex]),end:s.to},t);positions[who]=s.to;place(who,s.to);}
 else if(ladderIndex>=0){const l=gameLayout.ladders[ladderIndex];status.textContent=`${who==='player'?'You climb':'Computer climbs'} a ladder!`;await sleep(220);if(!assertActive(t))return;await slide(who,{path:[gameLayout.ladderGeometry[ladderIndex].base,gameLayout.ladderGeometry[ladderIndex].top],end:l.to},t);positions[who]=l.to;place(who,l.to);}
}
async function takeTurn(t){
 while(assertActive(t)){
  showTurn();let value;
  if(turn==='computer'){
   die.setEnabled(false);await sleep(700);if(!assertActive(t))return;
   value=await die.roll();
  }else{
   die.setEnabled(!chartOpen);
   value=await new Promise(resolve=>{
    const handler=e=>{window.removeEventListener('snakesandladders:roll',handler);resolve(e.detail.value);};
    window.addEventListener('snakesandladders:roll',handler);
    // Restart removes the listener via abort event.
    window.addEventListener('snakesandladders:abort',()=>{window.removeEventListener('snakesandladders:roll',handler);resolve(null);},{once:true});
   });
  }
  die.setEnabled(false);if(!assertActive(t)||value===null)return;
  completedTurns++;
  status.textContent=`${turn==='player'?'You rolled':'Computer rolled'} ${value}`;
  await sleep(250);if(!assertActive(t))return;
  await move(turn,value,t);if(!assertActive(t))return;
  if(positions[turn]===88){active=false;saveResult(turn==='player'?'Player':'Computer',completedTurns);resultText.textContent=turn==='player'?'You win!':'Computer wins!';finish.hidden=false;status.textContent=turn==='player'?'Congratulations!':'Better luck next time!';return;}
  if(value!==6)turn=turn==='player'?'computer':'player';
  else{status.textContent=`${turn==='player'?'You get':'Computer gets'} another turn!`;await sleep(600);}
 }
}
async function reset(startNow){
 token++;active=false;completedTurns=0;charts.hidden=true;chartOpen=false;die.setEnabled(false);window.dispatchEvent(new Event('snakesandladders:abort'));
 finish.hidden=true;intro.hidden=true;status.textContent='Generating a new board…';
 const t=token,ok=await regenerate();if(token!==t)return;
 if(!ok){status.textContent='Could not generate board. Press Restart to retry.';return;}
 positions={player:1,computer:1};place('computer',1);place('player',1);
 turn=Math.random()<.5?'player':'computer';active=startNow;
 if(startNow)takeTurn(t);else{intro.hidden=false;status.textContent='Press Game Start to play';}
}
document.getElementById('restart').addEventListener('click',()=>reset(true));
document.getElementById('again').addEventListener('click',()=>reset(true));
document.getElementById('start').addEventListener('click',()=>{intro.hidden=true;active=true;takeTurn(token);});
reset(false);
