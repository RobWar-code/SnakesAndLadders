// Trial: five variations of the approved Draft 5 silhouette.
// The silhouette and marking placement are retained from Draft 5.
const WIDTH=360, HEIGHT=600;
const stage=new Konva.Stage({container:'stage',width:WIDTH,height:HEIGHT});
const layer=new Konva.Layer();stage.add(layer);
const outline='M 0 15 Q -5 19 -12 25 L -12 34 Q -12 44 -5.5 52 Q -8.5 61 -4.5 70 Q 0 80 -9 91 Q -16 104 -6 116 Q 5 130 -3 141 Q -13 156 -5 168 Q 5 180 1 193 Q -3 204 2 213 L 5 213 Q 5 202 10 192 Q 15 178 5 165 Q -2 156 6 145 Q 17 131 8 115 Q 0 104 5 93 Q 11 80 4.5 70 Q -4.5 61 5.5 52 Q 12 44 12 34 L 12 25 Q 5 19 0 15 Z';
const probe=document.createElement('canvas').getContext('2d');
const silhouette=new Path2D(outline);
const inside=(x,y)=>probe.isPointInPath(silhouette,x,y);
function spanAt(y){let lo=null,hi=null;for(let x=-24;x<=24;x+=.25){if(inside(x,y)){if(lo===null)lo=x;hi=x;}}return lo===null?null:[lo,hi];}
const random=(a,b)=>a+Math.random()*(b-a);
const choose=a=>a[Math.floor(Math.random()*a.length)];
const bodies=['#ffeb22','#81e65d','#ff9f48','#6ee3e7','#ed9cf4','#ffe66b','#9db8ff'];
const accents=['#d64a25','#be3158','#5636b3','#177b69','#ec5638'];
const dots=['#2259a5','#672a9a','#b82c54','#126a72','#253d8d'];
function drawSnake(lane){
  const scaleY=random(.55,1.95); // local height ~214 => 118..417 px
  const scaleX=random(.90,1.10);
  // Shear is limited so even the longest snakes remain within their 72px lane.
  const shear=random(-.07,.07);
  const top=random(18,Math.min(HEIGHT-18-214*scaleY,155));
  const snake=new Konva.Group({x:36+lane*72,y:top,scaleX,scaleY,skewX:shear});
  layer.add(snake);
  const body=choose(bodies), band=choose(accents), spot=choose(dots);
  snake.add(new Konva.Path({data:outline,fill:body,stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
  // Bands and spots are computed from the actual Draft 5 outline, not guessed coordinates.
  const bandShift=random(-3,3);
  for(const base of [76,99,123,147,171,189]){
    const y=base+bandShift+random(-2,2), span=spanAt(y);if(!span)continue;
    const [left,right]=span,margin=2.4;
    if(right-left<margin*2+2)continue;
    snake.add(new Konva.Line({points:[left+margin,y,right-margin,y],stroke:band,strokeWidth:random(3.4,4.6),lineCap:'round'}));
  }
  for(const [base,side] of [[57,-1],[67,1],[88,1],[111,-1],[136,1],[159,-1],[181,1]]){
    const y=base+random(-2.5,2.5),span=spanAt(y);if(!span)continue;
    const [left,right]=span,width=right-left;
    const radius=Math.min(3.1,Math.max(1.4,width*.17));
    const cx=(left+right)/2+side*Math.min(2.1,width*.12);
    if(inside(cx-radius,y)&&inside(cx+radius,y)&&inside(cx,y-radius)&&inside(cx,y+radius))
      snake.add(new Konva.Circle({x:cx,y,radius,fill:spot}));
  }
  snake.add(new Konva.Path({data:outline,stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
  for(const x of [-5.2,5.2]){
    snake.add(new Konva.Circle({x,y:27,radius:2.1,fill:'white',stroke:'#161616',strokeWidth:.7}));
    snake.add(new Konva.Circle({x,y:27,radius:.9,fill:'#101010'}));
  }
  snake.add(new Konva.Line({points:[-3,34,0,36,3,34],stroke:'#111',strokeWidth:1.1,lineCap:'round'}));
  snake.add(new Konva.Line({points:[0,16,0,3,-5,-1],stroke:'#111',strokeWidth:2,lineCap:'round',lineJoin:'round'}));
  snake.add(new Konva.Line({points:[0,3,5,-1],stroke:'#111',strokeWidth:2,lineCap:'round'}));
}
function regenerate(){layer.destroyChildren();for(let i=0;i<5;i++)drawSnake(i);layer.draw();}
document.getElementById('next').addEventListener('click',regenerate);
regenerate();
