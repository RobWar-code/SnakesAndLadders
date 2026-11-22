const stage = new Konva.Stage({container:'stage',width:500,height:600});
const layer = new Konva.Layer();stage.add(layer);
const snake = new Konva.Group({x:63,y:26});layer.add(snake);
// Drawn in local coordinates, with the head near (0,20) and the tail at (2,213).
const outline = 'M 0 15 Q -5 19 -12 25 L -12 34 Q -12 44 -5.5 52 Q -8.5 61 -4.5 70 Q 0 80 -9 91 Q -16 104 -6 116 Q 5 130 -3 141 Q -13 156 -5 168 Q 5 180 1 193 Q -3 204 2 213 L 5 213 Q 5 202 10 192 Q 15 178 5 165 Q -2 156 6 145 Q 17 131 8 115 Q 0 104 5 93 Q 11 80 4.5 70 Q -4.5 61 5.5 52 Q 12 44 12 34 L 12 25 Q 5 19 0 15 Z';
snake.add(new Konva.Path({data:outline,fill:'#ffeb22',stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
// Derive each marking from the actual filled silhouette, rather than guessing x positions.
// Native canvas hit-testing is used only to measure the SVG path; Konva draws all marks.
const probe = document.createElement('canvas').getContext('2d');
const silhouette = new Path2D(outline);
function inside(x,y) { return probe.isPointInPath(silhouette,x,y); }
function spanAt(y) {
  const xs=[];
  for(let x=-24;x<=24;x+=0.25) if(inside(x,y)) xs.push(x);
  return xs.length ? [xs[0],xs[xs.length-1]] : null;
}
// Bands: transverse, deliberately inset from both edges.
for (const y of [76,99,123,147,171,189]) {
  const span=spanAt(y);
  if(!span) continue;
  const [left,right]=span, margin=2.4;
  if(right-left<margin*2+2) continue;
  snake.add(new Konva.Line({points:[left+margin,y,right-margin,y],
    stroke:'#d64a25',strokeWidth:4.2,lineCap:'round'}));
}
// Spots: centered on the curved body, alternately offset left and right.
for (const [y,side] of [[57,-1],[67,1],[88,1],[111,-1],[136,1],[159,-1],[181,1]]) {
  const span=spanAt(y);
  if(!span) continue;
  const [left,right]=span, width=right-left;
  const radius=Math.min(3.1,Math.max(1.5,width*0.17));
  const center=(left+right)/2+side*Math.min(2.1,width*0.12);
  if(inside(center-radius,y)&&inside(center+radius,y)&&
     inside(center,y-radius)&&inside(center,y+radius)) {
    snake.add(new Konva.Circle({x:center,y,radius,fill:'#2259a5'}));
  }
}
// Re-outline for an uninterrupted crisp outer edge.
snake.add(new Konva.Path({data:outline,stroke:'#191919',strokeWidth:2.7,lineJoin:'round',lineCap:'round'}));
// Eyes, nostrils, mouth and upright forked tongue.
snake.add(new Konva.Circle({x:-5.2,y:27,radius:2.1,fill:'white',stroke:'#161616',strokeWidth:.7}));
snake.add(new Konva.Circle({x:5.2,y:27,radius:2.1,fill:'white',stroke:'#161616',strokeWidth:.7}));
snake.add(new Konva.Circle({x:-5.2,y:27,radius:.9,fill:'#101010'}));
snake.add(new Konva.Circle({x:5.2,y:27,radius:.9,fill:'#101010'}));
snake.add(new Konva.Line({points:[-3,34,0,36,3,34],stroke:'#111',strokeWidth:1.1,lineCap:'round'}));
snake.add(new Konva.Line({points:[0,16,0,3,-5,-1],stroke:'#111',strokeWidth:2,lineCap:'round',lineJoin:'round'}));
snake.add(new Konva.Line({points:[0,3,5,-1],stroke:'#111',strokeWidth:2,lineCap:'round'}));
layer.draw();
