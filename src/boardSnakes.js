// Trial 4. Reuses the approved Trial 1 five-variant silhouette and its marking algorithm.
const W=360,H=600,CELL=45,ROWS=11,COLS=8,COUNT=7,LADDER_COUNT=6;
const stage=new Konva.Stage({container:'stage',width:W,height:H});
const boardLayer=new Konva.Layer({listening:false});
const snakeLayer=new Konva.Layer({listening:false});
const ladderLayer=new Konva.Layer({listening:false});
const numberLayer=new Konva.Layer({listening:false});
export const pieceLayer=new Konva.Layer({listening:false});
const dieLayer=new Konva.Layer();
stage.add(boardLayer);stage.add(snakeLayer);stage.add(ladderLayer);stage.add(numberLayer);stage.add(pieceLayer);stage.add(dieLayer);
boardLayer.add(new Konva.Rect({x:0,y:0,width:W,height:H,fill:'#faf7e7'}));
boardLayer.add(new Konva.Rect({x:0,y:ROWS*CELL,width:W,height:H-ROWS*CELL,fill:'#408b42'}));
for(let c=0;c<=COLS;c++)boardLayer.add(new Konva.Line({points:[c*CELL,0,c*CELL,ROWS*CELL],stroke:'#999',strokeWidth:1}));
for(let r=0;r<=ROWS;r++)boardLayer.add(new Konva.Line({points:[0,r*CELL,W,r*CELL],stroke:'#999',strokeWidth:1}));
boardLayer.draw();
// Serpentine numbering from bottom-left (1) to top-right (88).
// Square numbers are 22 canvas pixels, bold, 60% opacity.
for(let row=0;row<ROWS;row++){
  const rowFromBottom=ROWS-1-row;
  for(let col=0;col<COLS;col++){
    const number=rowFromBottom*COLS+(rowFromBottom%2===0?col+1:COLS-col);
    numberLayer.add(new Konva.Text({
      x:col*CELL,y:row*CELL,width:CELL,height:CELL,
      text:String(number),fontFamily:'Arial, sans-serif',fontSize:22,
      fontStyle:'bold',fill:'#333333',opacity:0.6,
      align:'center',verticalAlign:'middle',listening:false
    }));
  }
}
numberLayer.draw();

const outline='M 0 15 Q -5 19 -12 25 L -12 34 Q -12 44 -5.5 52 Q -8.5 61 -4.5 70 Q 0 80 -9 91 Q -16 104 -6 116 Q 5 130 -3 141 Q -13 156 -5 168 Q 5 180 1 193 Q -3 204 2 213 L 5 213 Q 5 202 10 192 Q 15 178 5 165 Q -2 156 6 145 Q 17 131 8 115 Q 0 104 5 93 Q 11 80 4.5 70 Q -4.5 61 5.5 52 Q 12 44 12 34 L 12 25 Q 5 19 0 15 Z';
const probe=document.createElement('canvas').getContext('2d');
const silhouette=new Path2D(outline);
const inside=(x,y)=>probe.isPointInPath(silhouette,x,y);
function spanAt(y){let lo=null,hi=null;for(let x=-24;x<=24;x+=.25)if(inside(x,y)){if(lo===null)lo=x;hi=x;}return lo===null?null:[lo,hi];}
const spans=[];for(let y=15;y<=213;y+=2){const s=spanAt(y);if(s)spans.push({y,lo:s[0],hi:s[1]});}
const random=(a,b)=>a+Math.random()*(b-a),choose=a=>a[Math.floor(Math.random()*a.length)];
const bodies=['#ffeb22','#81e65d','#ff9f48','#6ee3e7','#ed9cf4','#ffe66b','#9db8ff'];
const accents=['#d64a25','#be3158','#5636b3','#177b69','#ec5638'];
const dots=['#2259a5','#672a9a','#b82c54','#126a72','#253d8d'];
const center=(col,row)=>({x:(col+.5)*CELL,y:(row+.5)*CELL});

// Local tongue-fork tips (-5,-1),(5,-1); tail end (5,213).
// The midpoint of the two tongue tips is anchored to the head-cell centre.
// The end of the tail is anchored exactly to the tail-cell centre.
function candidate(hc,hr,tc,tr){
  const head=center(hc,hr),tail=center(tc,tr),sy=(tail.y-head.y)/214,sx=random(.87,1.10);
  const shear=(tail.x-head.x-5*sx)/(214*sy);
  const x=head.x+shear*sy,y=head.y+sy;
  const transform=(lx,ly)=>({x:x+lx*sx+shear*ly*sy,y:y+ly*sy});
  const samples=[];
  for(const s of spans){
    const a=transform(s.lo,s.y),b=transform(s.hi,s.y);
    const mid=transform((s.lo+s.hi)/2,s.y);
    samples.push({x:mid.x,y:mid.y,r:Math.hypot(a.x-b.x,a.y-b.y)/2+1.8});
  }
  // Tongue, head and tail extents are included in collision and bounds checks.
  for(const [lx,ly,r] of [[-5,-1,2.2],[5,-1,2.2],[0,8,2.2],[5,213,2.0]]){
    const p=transform(lx,ly);samples.push({...p,r});
  }
  return {hc,hr,tc,tr,x,y,sx,sy,shear,samples,head,tail,body:choose(bodies),band:choose(accents),spot:choose(dots)};
}
function valid(candidate,placed,used){
  // Limit heads to two per row.
  if(placed.filter(s=>s.hr===candidate.hr).length>=2)return false;
  // The top-right cell (square 88) cannot contain a snake head.
  if(candidate.hr===0&&candidate.hc===COLS-1)return false;
  if(used.has(candidate.hr*COLS+candidate.hc)||used.has(candidate.tr*COLS+candidate.tc))return false;
  for(const p of candidate.samples)if(p.x-p.r<1||p.x+p.r>W-1||p.y-p.r<1||p.y+p.r>ROWS*CELL-1)return false;
  for(const prev of placed){
    for(const a of candidate.samples){
      for(const b of prev.samples){
        const d=a.r+b.r+2.2;
        if(Math.abs(a.x-b.x)<d&&Math.abs(a.y-b.y)<d&&((a.x-b.x)**2+(a.y-b.y)**2)<d*d)return false;
      }
    }
  }
  return true;
}
// Geometry tests use complete ladder rail segments (not merely their centre lines).
const distPointSegment=(p,a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
function segmentDistance(a,b,c,d){
  const cross=(u,v)=>u.x*v.y-u.y*v.x;
  const sub=(u,v)=>({x:u.x-v.x,y:u.y-v.y});
  const r=sub(b,a),q=sub(d,c),den=cross(r,q);
  if(Math.abs(den)>1e-9){
    const t=cross(sub(c,a),q)/den,u=cross(sub(c,a),r)/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)return 0;
  }
  return Math.min(distPointSegment(a,c,d),distPointSegment(b,c,d),distPointSegment(c,a,b),distPointSegment(d,a,b));
}
function ladderCandidate(topCol,topRow,baseCol,baseRow){
  const top=center(topCol,topRow),base=center(baseCol,baseRow);
  const vx=base.x-top.x,vy=base.y-top.y,len=Math.hypot(vx,vy);
  const nx=vy/len,ny=-vx/len; // unit perpendicular to the ladder's axis
  const railHalfSpacing=14,railRadius=2,clearance=2.5;
  const rails=[-1,1].map(side=>({
    a:{x:top.x+side*nx*railHalfSpacing,y:top.y+side*ny*railHalfSpacing},
    b:{x:base.x+side*nx*railHalfSpacing,y:base.y+side*ny*railHalfSpacing}
  }));
  const segments=rails.map(r=>({...r,radius:railRadius+clearance}));
  // Rungs are contained within the two rails; still check the full 32px corridor
  // against snakes and other ladders to avoid interleaving or near contacts.
  return {topCol,topRow,baseCol,baseRow,top,base,nx,ny,len,rails,segments,halfWidth:16+clearance};
}
function ladderValid(l,snakes,ladders,used){
  if(used.has(l.topRow*COLS+l.topCol)||used.has(l.baseRow*COLS+l.baseCol))return false;
  // All rail endpoints and the rung envelope must be within the grid.
  for(const p of [l.top,l.base,...l.rails.flatMap(r=>[r.a,r.b])]){
    if(p.x-l.halfWidth<0||p.x+l.halfWidth>W||p.y-l.halfWidth<0||p.y+l.halfWidth>ROWS*CELL)return false;
  }
  // The top-right cell (square 88) cannot contain a ladder top.
  if(l.topRow===0&&l.topCol===COLS-1)return false;
  for(const snake of snakes){
    for(const point of snake.samples){
      if(distPointSegment(point,l.top,l.base)<point.r+l.halfWidth+1.5)return false;
    }
  }
  for(const other of ladders){
    if(segmentDistance(l.top,l.base,other.top,other.base)<l.halfWidth+other.halfWidth+2)return false;
  }
  return true;
}
function makeLayout(){
  const lengths=[3,3,3,4,4,4,5,5,6,7,8,9];
  const ladderHeights=[2,2,2,3,3,3,4,4,5,6,7,8];
  let snakeAttempts=0,ladderAttempts=0;
  for(let restart=0;restart<550;restart++){
    const placed=[],ladders=[],used=new Set();
    const ladderBaseRows=new Array(ROWS).fill(0);
    for(let i=0;i<COUNT;i++){
      let found=false;
      for(let attempt=0;attempt<350;attempt++){
        snakeAttempts++;
        const length=choose(lengths),hr=Math.floor(random(0,ROWS-length)),tr=hr+length;
        const hc=Math.floor(random(0,COLS)),tc=hc+choose([-1,0,1]);
        if(tc<0||tc>=COLS)continue;
        const c=candidate(hc,hr,tc,tr);
        if(!valid(c,placed,used))continue;
        placed.push(c);used.add(hr*COLS+hc);used.add(tr*COLS+tc);found=true;break;
      }
      if(!found)break;
    }
    if(placed.length!==COUNT)continue;
    for(let i=0;i<LADDER_COUNT;i++){
      let found=false;
      for(let attempt=0;attempt<500;attempt++){
        ladderAttempts++;
        const height=choose(ladderHeights),topRow=Math.floor(random(0,ROWS-height)),baseRow=topRow+height;
        const topCol=Math.floor(random(0,COLS)),baseCol=topCol+choose([-1,0,1]);
        if(baseCol<0||baseCol>=COLS)continue;
        if(ladderBaseRows[baseRow]>=2)continue;
        if(topRow===0&&topCol===COLS-1)continue;
        if(baseRow===ROWS-1&&baseCol===0)continue;
        const l=ladderCandidate(topCol,topRow,baseCol,baseRow);
        if(!ladderValid(l,placed,ladders,used))continue;
        ladders.push(l);ladderBaseRows[baseRow]++;used.add(topRow*COLS+topCol);used.add(baseRow*COLS+baseCol);found=true;break;
      }
      if(!found)break;
    }
    if(ladders.length===LADDER_COUNT)return {placed,ladders,restarts:restart,snakeAttempts,ladderAttempts};
  }
  return {failed:true,snakeAttempts,ladderAttempts};
}
function drawLadder(l){
  const g=new Konva.Group();ladderLayer.add(g);
  // Rungs remain perpendicular to the inclined rails.
  const dx=(l.base.x-l.top.x)/l.len,dy=(l.base.y-l.top.y)/l.len;
  const rungCount=Math.max(1,Math.floor((l.len-20)/22));
  for(let i=1;i<=rungCount;i++){
    const t=i/(rungCount+1),x=l.top.x+(l.base.x-l.top.x)*t,y=l.top.y+(l.base.y-l.top.y)*t;
    g.add(new Konva.Line({points:[x-14*l.nx,y-14*l.ny,x+14*l.nx,y+14*l.ny],stroke:'#b16a46',strokeWidth:4,lineCap:'round'}));
  }
  for(const rail of l.rails){
    g.add(new Konva.Line({points:[rail.a.x,rail.a.y,rail.b.x,rail.b.y],stroke:'#71351e',strokeWidth:4,lineCap:'round'}));
    g.add(new Konva.Line({points:[rail.a.x+.4,rail.a.y,rail.b.x+.4,rail.b.y],stroke:'#a75b39',strokeWidth:2,lineCap:'round'}));
  }
}
function drawSnake(c){
  const g=new Konva.Group({x:c.x,y:c.y,scaleX:c.sx,scaleY:c.sy,skewX:c.shear});snakeLayer.add(g);
  g.add(new Konva.Path({data:outline,fill:c.body,stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
  const shift=random(-3,3);
  for(const base of [76,99,123,147,171,189]){
    const yy=base+shift+random(-2,2),span=spanAt(yy);if(!span)continue;
    const [left,right]=span,margin=2.4;
    if(right-left<margin*2+2)continue;
    g.add(new Konva.Line({points:[left+margin,yy,right-margin,yy],stroke:c.band,strokeWidth:random(3.4,4.6),lineCap:'round'}));
  }
  for(const [base,side] of [[57,-1],[67,1],[88,1],[111,-1],[136,1],[159,-1],[181,1]]){
    const yy=base+random(-2.5,2.5),span=spanAt(yy);if(!span)continue;
    const [left,right]=span,width=right-left,radius=Math.min(3.1,Math.max(1.4,width*.17));
    const cx=(left+right)/2+side*Math.min(2.1,width*.12);
    if(inside(cx-radius,yy)&&inside(cx+radius,yy)&&inside(cx,yy-radius)&&inside(cx,yy+radius))g.add(new Konva.Circle({x:cx,y:yy,radius,fill:c.spot}));
  }
  g.add(new Konva.Path({data:outline,stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
  for(const xx of [-5.2,5.2]){
    g.add(new Konva.Circle({x:xx,y:27,radius:2.1,fill:'white',stroke:'#161616',strokeWidth:.7}));
    g.add(new Konva.Circle({x:xx,y:27,radius:.9,fill:'#101010'}));
  }
  g.add(new Konva.Line({points:[-3,34,0,36,3,34],stroke:'#111',strokeWidth:1.1,lineCap:'round'}));
  g.add(new Konva.Line({points:[0,16,0,3,-5,-1],stroke:'#111',strokeWidth:2,lineCap:'round',lineJoin:'round'}));
  g.add(new Konva.Line({points:[0,3,5,-1],stroke:'#111',strokeWidth:2,lineCap:'round'}));
}
// Stable game-facing endpoint representation; refreshed only on successful layout generation.
// Square numbers follow the same serpentine scheme as the displayed board.
function squareNumber(col,row){
  const fromBottom=ROWS-1-row;
  return fromBottom*COLS+(fromBottom%2===0?col+1:COLS-col);
}
export const gameLayout={snakes:[],ladders:[]};
function storeEndpoints(result){
  gameLayout.snakes=result.placed.map(s=>({from:squareNumber(s.hc,s.hr),to:squareNumber(s.tc,s.tr)}));
  gameLayout.ladders=result.ladders.map(l=>({from:squareNumber(l.baseCol,l.baseRow),to:squareNumber(l.topCol,l.topRow)}));
  // The same object is kept stable for future game modules and debugging.
  window.snakesAndLaddersLayout=gameLayout;
}

export function regenerate(){
  return new Promise(resolve=>{
  const btn=document.getElementById('restart');btn.disabled=true;
  // Allow status/paint to update before the synchronous search begins.
  requestAnimationFrame(()=>setTimeout(()=>{
    const start=performance.now(),result=makeLayout(),elapsed=performance.now()-start;
    if(!result.failed){
      snakeLayer.destroyChildren();ladderLayer.destroyChildren();
      result.placed.forEach(drawSnake);result.ladders.forEach(drawLadder);
      storeEndpoints(result);
      gameLayout.snakeGeometry=result.placed;
      gameLayout.ladderGeometry=result.ladders;
      snakeLayer.draw();ladderLayer.draw();
      // Timing/retry diagnostics remain internal; no visible generation footer.
    } else console.warn(`No valid layout in ${elapsed.toFixed(0)} ms; retry requested.`);
    btn.disabled=false;
    resolve(!result.failed);
  },0));
  });
}
export {stage};
export function squareCenter(n){
 const bottom=Math.floor((n-1)/COLS),position=(n-1)%COLS;
 return center(bottom%2===0?position:COLS-1-position,ROWS-1-bottom);
}
export function snakePath(s){
 const path=[];
 for(let y=0;y<=214;y+=3){
  const yy=Math.max(15,Math.min(213,y)),span=spanAt(yy);
  const lx=span?(span[0]+span[1])/2:0;
  path.push({x:s.x+lx*s.sx+s.shear*yy*s.sy,y:s.y+yy*s.sy});
 }
 path[0]=s.head;path[path.length-1]=s.tail;
 return path;
}
import {createDie} from './die.js';
export const die=createDie({Konva,layer:dieLayer,centerX:W/2,centerY:ROWS*CELL+(H-ROWS*CELL)/2});
