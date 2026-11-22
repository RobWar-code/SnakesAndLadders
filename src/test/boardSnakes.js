// Trial 2. Reuses the approved Trial 1 five-variant silhouette and its marking algorithm.
const W=360,H=600,CELL=45,ROWS=11,COLS=8,COUNT=7;
const stage=new Konva.Stage({container:'stage',width:W,height:H});
const boardLayer=new Konva.Layer({listening:false});
const snakeLayer=new Konva.Layer({listening:false});
stage.add(boardLayer);stage.add(snakeLayer);
boardLayer.add(new Konva.Rect({x:0,y:0,width:W,height:H,fill:'#faf7e7'}));
for(let c=0;c<=COLS;c++)boardLayer.add(new Konva.Line({points:[c*CELL,0,c*CELL,ROWS*CELL],stroke:'#999',strokeWidth:1}));
for(let r=0;r<=ROWS;r++)boardLayer.add(new Konva.Line({points:[0,r*CELL,W,r*CELL],stroke:'#999',strokeWidth:1}));
boardLayer.draw();

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
  // Reserve the entire top-left cell, not just its centre.
  // Samples approximate the complete silhouette, including tongue and outline.
  for(const p of candidate.samples){
    const closestX=Math.max(0,Math.min(CELL,p.x));
    const closestY=Math.max(0,Math.min(CELL,p.y));
    if((p.x-closestX)**2+(p.y-closestY)**2<=(p.r+1)**2)return false;
  }
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
function makeLayout(){
  // Prefer shorter snakes for easy placement; still permit all lengths from 3 to 9 cells.
  const lengths=[3,3,3,4,4,4,5,5,6,7,8,9];
  for(let restart=0;restart<350;restart++){
    const placed=[],used=new Set();
    for(let i=0;i<COUNT;i++){
      let found=false;
      for(let attempt=0;attempt<350;attempt++){
        const length=choose(lengths),hr=Math.floor(random(0,ROWS-length)),tr=hr+length;
        const hc=Math.floor(random(0,COLS)),tc=hc+choose([-1,0,1]);
        if(tc<0||tc>=COLS)continue;
        const c=candidate(hc,hr,tc,tr);
        if(!valid(c,placed,used))continue;
        placed.push(c);used.add(hr*COLS+hc);used.add(tr*COLS+tc);found=true;break;
      }
      if(!found)break;
    }
    if(placed.length===COUNT)return {placed,restarts:restart};
  }
  return null;
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
function regenerate(){
  const status=document.getElementById('status'),btn=document.getElementById('next');btn.disabled=true;
  // Allow status/paint to update before the synchronous search begins.
  requestAnimationFrame(()=>setTimeout(()=>{
    const start=performance.now(),result=makeLayout(),elapsed=performance.now()-start;
    if(result){snakeLayer.destroyChildren();result.placed.forEach(drawSnake);snakeLayer.draw();status.textContent=`${COUNT} snakes · ${elapsed.toFixed(0)} ms · ${result.restarts} layout retries`;}
    else status.textContent=`No valid seven-snake layout found in ${elapsed.toFixed(0)} ms; previous layout retained. Try Next Layout again.`;
    btn.disabled=false;
  },0));
}
document.getElementById('next').addEventListener('click',regenerate);regenerate();
