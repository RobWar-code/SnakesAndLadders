// Interactive six-sided die, using Konva shapes and two-axis squash/spin illusion.
export function createDie({Konva,layer,centerX,centerY}){
  const size=60;
  const die=new Konva.Group({x:centerX,y:centerY});
  layer.add(die);
  const body=new Konva.Rect({x:-size/2,y:-size/2,width:size,height:size,cornerRadius:9,fill:'#fffbea',stroke:'#534d40',strokeWidth:2,shadowColor:'#173b19',shadowBlur:7,shadowOpacity:.3,shadowOffsetY:3});
  die.add(body);
  const spots=new Konva.Group({listening:false});die.add(spots);
  const positions={
    1:[[0,0]],2:[[-15,-15],[15,15]],3:[[-15,-15],[0,0],[15,15]],
    4:[[-15,-15],[15,-15],[-15,15],[15,15]],
    5:[[-15,-15],[15,-15],[0,0],[-15,15],[15,15]],
    6:[[-15,-15],[15,-15],[-15,0],[15,0],[-15,15],[15,15]]
  };
  let face=1,rolling=false,enabled=false,resolveRoll=null;
  function setFace(n){
    face=n;spots.destroyChildren();
    for(const [x,y] of positions[n])spots.add(new Konva.Circle({x,y,radius:4.5,fill:'#242424'}));
  }
  setFace(face);
  die.on('pointerdown',()=>{if(enabled)roll();});
  die.on('mouseenter',()=>{if(!rolling)document.body.style.cursor='pointer';});
  die.on('mouseleave',()=>{document.body.style.cursor='';});
  function roll(){
    if(rolling)return null;
    enabled=false;
    rolling=true;
    document.body.style.cursor='';
    const finalFace=1+Math.floor(Math.random()*6);
    const duration=1200;
    let start=null,lastFace=-1;
    const animation=new Konva.Animation(frame=>{
      if(start===null)start=frame.time;
      const elapsed=frame.time-start,t=Math.min(1,elapsed/duration);
      // Two independently oscillating axes. Each axis scales through near-edge-on
      // rather than showing a mirrored backside; perspective is suggested by rotation.
      const phase=2*Math.PI*(5*t-2*t*t);
      const phaseY=2*Math.PI*(4*t-1.5*t*t);
      const sx=Math.max(.12,Math.abs(Math.cos(phase)));
      const sy=Math.max(.12,Math.abs(Math.cos(phaseY)));
      die.scale({x:sx,y:sy});
      die.rotation(10*Math.sin(phaseY)*(1-t));
      const faceStep=Math.floor(elapsed/75);
      if(faceStep!==lastFace){lastFace=faceStep;setFace(1+Math.floor(Math.random()*6));}
      if(t>=1){
        animation.stop();die.scale({x:1,y:1});die.rotation(0);
        setFace(finalFace);rolling=false;layer.batchDraw();
        die.fire('rollcomplete',{value:finalFace},false);
        if(resolveRoll){resolveRoll(finalFace);resolveRoll=null;}
        window.dispatchEvent(new CustomEvent('snakesandladders:roll',{detail:{value:finalFace}}));
      }
    },layer);
    animation.start();
  }
  layer.draw();
  return {roll:()=>new Promise(resolve=>{if(rolling){resolve(null);return;}resolveRoll=resolve;roll();}),setEnabled:value=>{enabled=value;},getValue:()=>face};
}
