(function(global){
'use strict';

var STAGES=[
  {id:'site-controls',name:'Site controls',description:'Survey control, verified parcel context, and site reference evidence.'},
  {id:'clearing-erosion',name:'Clearing & erosion control',description:'Plan-supported clearing limits and erosion-control work.'},
  {id:'earthwork-grading',name:'Earthwork & grading',description:'Verified existing/proposed grades, cuts, fills, and excavation.'},
  {id:'underground-utilities',name:'Underground utilities',description:'Civil-plan utilities, drainage, and below-grade service routes.'},
  {id:'footings',name:'Footings',description:'Plan-supported continuous and isolated footings.'},
  {id:'foundation-waterproofing',name:'Foundation & waterproofing',description:'Foundation walls, waterproofing, drainage, and backfill.'},
  {id:'slabs-flatwork',name:'Slabs & flatwork',description:'Slabs, stoops, walks, and supported exterior flatwork.'},
  {id:'floor-structure',name:'Floor structure',description:'Beams, posts, joists, rim, and structural floor deck.'},
  {id:'wall-framing-sheathing',name:'Wall framing & sheathing',description:'Exterior and interior walls, openings, headers, and sheathing.'},
  {id:'roof-structure-envelope',name:'Roof structure & envelope',description:'Trusses or rafters, roof deck, weather layers, and exterior envelope.'},
  {id:'mep-insulation',name:'MEP & insulation',description:'Plan-supported mechanical, electrical, plumbing, and insulation.'},
  {id:'finishes-closeout',name:'Finishes & closeout',description:'Verified finish assemblies, fixtures, and closeout scope.'}
];
var STAGE_INDEX={};STAGES.forEach(function(stage,index){STAGE_INDEX[stage.id]=index;});

var TOOLS=[
  {id:'orbit',label:'Orbit',shortcut:'O'},
  {id:'pan',label:'Pan',shortcut:'P'},
  {id:'zoom',label:'Zoom',shortcut:'Z'},
  {id:'fit',label:'Fit model',shortcut:'F'},
  {id:'stage-filter',label:'Stage filter',shortcut:'S'},
  {id:'sequence',label:'Play sequence',shortcut:'Space'},
  {id:'dimensions',label:'Dimensions',shortcut:'D'},
  {id:'measure',label:'Measure',shortcut:'M'},
  {id:'section',label:'Section',shortcut:'X'},
  {id:'inspect',label:'Inspect',shortcut:'I'},
  {id:'source',label:'Source citation',shortcut:'C'},
  {id:'map-sync',label:'Map / 3D sync',shortcut:'G'}
];

function finitePoint(value){return Array.isArray(value)&&value.length===3&&value.every(function(n){return typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=100000;});}
function safeId(value){return typeof value==='string'&&/^[a-z0-9][a-z0-9._-]{0,79}$/.test(value);}
function sourceKey(ref){return ref.documentId+':p'+ref.page+':'+ref.region;}
function validateModel(model){
  var errors=[],ids={},docs={},facts=model&&model.facts||{};
  function need(ok,message){if(!ok)errors.push(message);}
  need(model&&typeof model==='object','Model must be an object.');if(!model||typeof model!=='object')return errors;
  need(model.schemaVersion==='1.0.0','schemaVersion must be 1.0.0.');
  need(model.units==='ft','units must be ft.');
  need(model.project&&safeId(model.project.id),'project.id must be a safe, stable ID.');
  need(model.project&&typeof model.project.displayName==='string'&&model.project.displayName.trim(),'project.displayName is required.');
  var states=['VERIFIED','INFERRED','CONFLICT','UNVERIFIED'];
  need(model.project&&states.indexOf(model.project.status)>=0,'project.status is invalid.');
  var documents=model.sources&&Array.isArray(model.sources.documents)?model.sources.documents:[];
  documents.forEach(function(doc,index){
    need(doc&&typeof doc.id==='string'&&doc.id,'sources.documents['+index+'].id is required.');
    if(doc&&doc.id){need(!docs[doc.id],'Duplicate document ID '+doc.id+'.');docs[doc.id]=doc;}
    need(doc&&/^[a-f0-9]{64}$/.test(doc.sha256||''),'Document '+(doc&&doc.id||index)+' requires a SHA-256 hash.');
    need(doc&&Number.isInteger(doc.pageCount)&&doc.pageCount>0,'Document '+(doc&&doc.id||index)+' requires pageCount.');
  });
  function validateRefs(refs,path,required){
    need(Array.isArray(refs),path+' must be an array.');if(!Array.isArray(refs))return;
    if(required)need(refs.length>0,path+' requires at least one citation.');
    refs.forEach(function(ref,index){
      need(ref&&docs[ref.documentId],path+'['+index+'] references an unknown document.');
      need(ref&&Number.isInteger(ref.page)&&ref.page>0,path+'['+index+'].page must be a positive integer.');
      need(ref&&typeof ref.region==='string'&&ref.region.trim(),path+'['+index+'].region is required.');
      if(ref&&docs[ref.documentId]&&Number.isInteger(ref.page))need(ref.page<=docs[ref.documentId].pageCount,path+'['+index+'].page exceeds the document page count.');
    });
  }
  function validateFact(fact,path){
    need(fact&&states.indexOf(fact.state)>=0,path+'.state is invalid.');if(!fact)return;
    need(Object.prototype.hasOwnProperty.call(fact,'value'),path+'.value is required.');
    if(fact.state==='UNVERIFIED')need(fact.value===null,path+' must use value:null when UNVERIFIED.');
    if(fact.state==='CONFLICT')need(fact.value===null,path+' must use value:null when CONFLICT.');
    if(fact.state==='INFERRED')need(typeof fact.derivation==='string'&&fact.derivation.trim(),path+' requires a derivation when INFERRED.');
    validateRefs(fact.sourceRefs,path+'.sourceRefs',fact.state==='VERIFIED'||fact.state==='INFERRED');
  }
  Object.keys(facts).forEach(function(key){validateFact(facts[key],'facts.'+key);});
  ['parcel','terrain','systems','mapRegistration'].forEach(function(key){validateFact(model[key],key);});
  if(model.mapRegistration&&model.mapRegistration.state==='VERIFIED'){
    var controls=model.mapRegistration.value&&model.mapRegistration.value.controlPoints;
    need(Array.isArray(controls)&&controls.length>=2,'Verified mapRegistration requires at least two control points.');
    (controls||[]).forEach(function(control,index){
      need(control&&finitePoint(control.local),'mapRegistration control point '+index+' requires a finite local [x,y,z] point.');
      need(control&&Array.isArray(control.geographic)&&control.geographic.length===2&&control.geographic.every(Number.isFinite),'mapRegistration control point '+index+' requires [latitude,longitude].');
      if(control&&Array.isArray(control.geographic)){need(Math.abs(control.geographic[0])<=90&&Math.abs(control.geographic[1])<=180,'mapRegistration control point '+index+' is outside geographic bounds.');}
    });
  }
  var elements=model.geometry&&Array.isArray(model.geometry.elements)?model.geometry.elements:null;
  need(!!elements,'geometry.elements must be an array.');
  (elements||[]).forEach(function(el,index){
    var path='geometry.elements['+index+']';
    need(el&&typeof el.id==='string'&&el.id,path+'.id is required.');if(el&&el.id){need(!ids[el.id],'Duplicate element ID '+el.id+'.');ids[el.id]=true;}
    need(el&&typeof el.name==='string'&&el.name.trim(),path+'.name is required.');
    need(el&&['box','face','line'].indexOf(el.type)>=0,path+'.type is invalid.');
    need(el&&Object.prototype.hasOwnProperty.call(STAGE_INDEX,el.buildStage),path+'.buildStage is invalid.');
    need(el&&['VERIFIED','INFERRED'].indexOf(el.state)>=0,path+' physical geometry must be VERIFIED or INFERRED.');
    validateRefs(el&&el.sourceRefs,path+'.sourceRefs',true);
    need(el&&Array.isArray(el.factRefs)&&el.factRefs.length>0,path+'.factRefs requires at least one fact.');
    (el&&el.factRefs||[]).forEach(function(ref){need(Object.prototype.hasOwnProperty.call(facts,ref),path+' references unknown fact '+ref+'.');});
    var g=el&&el.geometry||{};
    if(el&&el.type==='box'){need(finitePoint(g.min),path+'.geometry.min must be a finite [x,y,z] point.');need(finitePoint(g.size)&&g.size.every(function(n){return n>0;}),path+'.geometry.size must contain positive feet values.');}
    if(el&&el.type==='face'){need(Array.isArray(g.points)&&g.points.length>=3&&g.points.every(finitePoint),path+'.geometry.points requires at least three finite points.');}
    if(el&&el.type==='line'){need(Array.isArray(g.points)&&g.points.length===2&&g.points.every(finitePoint),path+'.geometry.points requires two finite points.');}
  });
  need(model.takeoff&&Array.isArray(model.takeoff.items),'takeoff.items must be an array.');
  need(Array.isArray(model.unresolved),'unresolved must be an array.');
  (model.unresolved||[]).forEach(function(item,index){need(item&&item.state==='UNVERIFIED','unresolved['+index+'] must be UNVERIFIED.');need(item&&typeof item.reason==='string'&&item.reason.trim(),'unresolved['+index+'] requires a reason.');});
  return errors;
}

function mount(root,initialModel){
  if(!root)throw new Error('Assistify root is required.');
  var canvas=root.querySelector('#modelCanvas'),ctx=canvas.getContext('2d'),viewport=root.querySelector('#viewport');
  var stageSelect=root.querySelector('#stageSelect'),dock=root.querySelector('#toolDock'),announceNode=document.getElementById('announcer');
  var model=initialModel,state={stage:0,mode:'orbit',dimensions:true,section:0,level:'first',playing:false,selected:null,mapSync:false};
  var camera={az:-0.78,el:0.52,dist:110,target:[0,0,0]},pointer=null,raf=0,dirty=true,lastDrawables=[],measurePoints=[],playTimer=0,destroyed=false,reduceMotion=false;
  var bounds={min:[-20,-20,-2],max:[20,20,12],center:[0,0,5],radius:30};
  try{reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
  var media=null;try{media=matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',onMotion);}catch(e){}
  function onMotion(event){reduceMotion=event.matches;if(reduceMotion)stopSequence();}
  function $(selector){return root.querySelector(selector);}
  function esc(text){return String(text==null?'':text).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function announce(text){if(announceNode){announceNode.textContent='';setTimeout(function(){announceNode.textContent=text;},20);}}
  function storageKey(suffix){return 'assistify3d:v1:'+model.project.id+':'+suffix;}
  function saveState(){try{localStorage.setItem(storageKey('view'),JSON.stringify({version:1,stage:state.stage,dimensions:state.dimensions,section:state.section,level:state.level,camera:camera}));}catch(e){}}
  function restoreState(){try{var saved=JSON.parse(localStorage.getItem(storageKey('view'))||'null');if(saved&&saved.version===1){state.stage=Math.max(0,Math.min(STAGES.length-1,saved.stage|0));state.dimensions=saved.dimensions!==false;state.section=Math.max(0,Math.min(3,saved.section|0));state.level=['first','second','roof','all'].indexOf(saved.level)>=0?saved.level:'first';if(saved.camera&&Number.isFinite(saved.camera.dist))camera=saved.camera;}}catch(e){try{localStorage.removeItem(storageKey('view'));}catch(ignore){}}}
  function persistModel(){try{localStorage.setItem('assistify3d:model:'+model.project.id,JSON.stringify(model));localStorage.setItem('assistify3d:v1:active',model.project.id);}catch(e){announce('Local prototype storage is unavailable.');}}
  function tryStoredModel(fallback){try{var id=localStorage.getItem('assistify3d:v1:active');if(id){var candidate=JSON.parse(localStorage.getItem('assistify3d:model:'+id)||'null');if(candidate&&!validateModel(candidate).length)return candidate;}}catch(e){}return fallback;}
  function setDirty(){dirty=true;if(!raf)raf=requestAnimationFrame(loop);}

  function compile(){
    var output=[];
    (model.geometry.elements||[]).forEach(function(el){
      var stage=STAGE_INDEX[el.buildStage],role=el.role||el.type,faces=[];
      if(el.type==='box'){
        var m=el.geometry.min,s=el.geometry.size,x=m[0],y=m[1],z=m[2],X=x+s[0],Y=y+s[1],Z=z+s[2];
        faces=[[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z]],[[x,y,Z],[x,Y,Z],[X,Y,Z],[X,y,Z]],[[x,y,z],[x,y,Z],[X,y,Z],[X,y,z]],[[X,y,z],[X,y,Z],[X,Y,Z],[X,Y,z]],[[X,Y,z],[X,Y,Z],[x,Y,Z],[x,Y,z]],[[x,Y,z],[x,Y,Z],[x,y,Z],[x,y,z]]];
        faces.forEach(function(points){output.push({kind:'face',points:points,stage:stage,role:role,source:el});});
      }else output.push({kind:el.type,points:el.geometry.points,stage:stage,role:role,source:el});
    });
    return output;
  }
  var elements=[];
  function computeBounds(){
    var points=[];elements.forEach(function(el){el.points.forEach(function(p){points.push(p);});});
    if(!points.length){bounds={min:[-20,-20,-2],max:[20,20,12],center:[0,0,5],radius:30};return;}
    var min=points[0].slice(),max=points[0].slice();points.forEach(function(p){for(var i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}});var center=min.map(function(v,i){return(v+max[i])/2;}),dx=max[0]-min[0],dy=max[1]-min[1],dz=max[2]-min[2];bounds={min:min,max:max,center:center,radius:Math.max(8,Math.sqrt(dx*dx+dy*dy+dz*dz)*.65)};
  }
  function fit(){camera.target=bounds.center.slice();camera.dist=Math.max(35,bounds.radius*3.2);camera.az=-.78;camera.el=.52;saveState();setDirty();announce('View fitted to supported model geometry.');}
  function loadModel(next,shouldPersist){
    var errors=validateModel(next);if(errors.length)throw new Error(errors.slice(0,8).join(' '));
    model=next;state.selected=null;state.stage=0;state.section=0;measurePoints=[];elements=compile();computeBounds();restoreState();if(shouldPersist)persistModel();renderUI();fit();
  }

  function vsub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]];}function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}function norm(v){var n=Math.sqrt(dot(v,v))||1;return[v[0]/n,v[1]/n,v[2]/n];}
  var basis={};
  function updateBasis(){var ce=Math.cos(camera.el),eye=[camera.target[0]+camera.dist*ce*Math.cos(camera.az),camera.target[1]+camera.dist*ce*Math.sin(camera.az),camera.target[2]+camera.dist*Math.sin(camera.el)],f=norm(vsub(camera.target,eye)),r=norm(cross(f,[0,0,1])),u=cross(r,f);basis={eye:eye,f:f,r:r,u:u};}
  function toView(p){var d=vsub(p,basis.eye);return[dot(d,basis.r),dot(d,basis.u),dot(d,basis.f)];}
  function clipNear(poly,near){var out=[];for(var i=0;i<poly.length;i++){var a=poly[i],b=poly[(i+1)%poly.length],ai=a[2]>=near,bi=b[2]>=near;if(ai)out.push(a);if(ai!==bi){var t=(near-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near]);}}return out;}
  function clipLine(a,b,near){if(a[2]<near&&b[2]<near)return null;if(a[2]<near||b[2]<near){var low=a[2]<near?a:b,high=a[2]<near?b:a,t=(near-low[2])/(high[2]-low[2]),p=[low[0]+(high[0]-low[0])*t,low[1]+(high[1]-low[1])*t,near];if(a[2]<near)a=p;else b=p;}return[a,b];}
  function project(v,w,h){var scale=Math.min(w,h)*1.05;return[w/2+v[0]/v[2]*scale,h/2-v[1]/v[2]*scale];}
  function sectionVisible(el){if(state.section===3){if(state.level==='all')return true;var averageZ=el.points.reduce(function(total,p){return total+p[2];},0)/el.points.length;if(state.level==='first')return averageZ<10.6563;if(state.level==='second')return averageZ>=10.6563&&averageZ<20.4583;return averageZ>=20.4583;}if(!state.section)return true;var axis=state.section===1?0:1,cut=bounds.center[axis];return el.points.some(function(p){return p[axis]<=cut;});}
  function roleColor(role,active,alpha){var palette={concrete:'#8ca1b8',steel:'#8fd5ed',wood:'#c69154',envelope:'#438fe8',mep:'#d978ce',finish:'#d7e4ee',earth:'#927251',utility:'#e1a431'};var hex=active?'#38b9ff':(palette[role]||'#87a9cd');return hexToRgba(hex,alpha);}
  function hexToRgba(hex,alpha){var h=hex.replace('#','');if(h.length===3)h=h.split('').map(function(c){return c+c;}).join('');return'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+alpha+')';}
  function drawGrid(w,h){var span=Math.max(bounds.max[0]-bounds.min[0],bounds.max[1]-bounds.min[1]),step=span<=80?10:(span<=200?20:(span<=500?50:100)),margin=step*2,minX=Math.floor((bounds.min[0]-margin)/step)*step,maxX=Math.ceil((bounds.max[0]+margin)/step)*step,minY=Math.floor((bounds.min[1]-margin)/step)*step,maxY=Math.ceil((bounds.max[1]+margin)/step)*step;ctx.save();ctx.lineWidth=1;for(var x=minX;x<=maxX;x+=step)drawWorldLine([x,minY,0],[x,maxY,0],x===0?'rgba(104,212,255,.55)':'rgba(110,145,181,.18)',w,h);for(var y=minY;y<=maxY;y+=step)drawWorldLine([minX,y,0],[maxX,y,0],y===0?'rgba(104,212,255,.55)':'rgba(110,145,181,.18)',w,h);ctx.restore();}
  function drawWorldLine(a,b,color,w,h){var seg=clipLine(toView(a),toView(b),.2);if(!seg)return;var p=project(seg[0],w,h),q=project(seg[1],w,h);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
  function render(){
    var rect=viewport.getBoundingClientRect(),dpr=Math.min(2,global.devicePixelRatio||1),w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);var grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#071b33');grad.addColorStop(1,'#0b2945');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);updateBasis();drawGrid(w,h);
    var list=[];elements.forEach(function(el){if(el.stage>state.stage||!sectionVisible(el))return;if(el.kind==='face'){var view=clipNear(el.points.map(toView),.2);if(view.length<3)return;var screen=view.map(function(p){return project(p,w,h);}),depth=view.reduce(function(n,p){return n+p[2];},0)/view.length;list.push({kind:'face',screen:screen,depth:depth,el:el});}else{var seg=clipLine(toView(el.points[0]),toView(el.points[1]),.2);if(!seg)return;list.push({kind:'line',screen:seg.map(function(p){return project(p,w,h);}),depth:(seg[0][2]+seg[1][2])/2,el:el});}});list.sort(function(a,b){return b.depth-a.depth;});lastDrawables=list;
    list.forEach(function(item){var active=item.el.stage===state.stage,selected=state.selected&&state.selected.id===item.el.source.id;ctx.beginPath();ctx.moveTo(item.screen[0][0],item.screen[0][1]);for(var i=1;i<item.screen.length;i++)ctx.lineTo(item.screen[i][0],item.screen[i][1]);if(item.kind==='face'){ctx.closePath();ctx.fillStyle=roleColor(item.el.role,active,selected?.9:(active?.48:.26));ctx.fill();}ctx.strokeStyle=selected?'#ffe16b':roleColor(item.el.role,active,.95);ctx.lineWidth=selected?3:(active?1.8:1);ctx.stroke();});
    if(state.dimensions&&elements.length)drawDimensions(w,h);if(measurePoints.length)drawMeasurement(w,h);dirty=false;
  }
  function drawDimensions(w,h){ctx.save();ctx.font='bold 11px Arial';ctx.fillStyle='#dcecff';ctx.strokeStyle='rgba(220,236,255,.7)';var axes=[[0,'X'],[1,'Y'],[2,'Z']];axes.forEach(function(pair){var axis=pair[0],a=bounds.min.slice(),b=bounds.min.slice();b[axis]=bounds.max[axis];var seg=clipLine(toView(a),toView(b),.2);if(!seg)return;var p=project(seg[0],w,h),q=project(seg[1],w,h);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.fillText(pair[1]+' '+(bounds.max[axis]-bounds.min[axis]).toFixed(2)+' ft',(p[0]+q[0])/2+5,(p[1]+q[1])/2-5);});ctx.restore();}
  function drawMeasurement(w,h){ctx.save();measurePoints.forEach(function(point){var v=toView(point);if(v[2]<.2)return;var p=project(v,w,h);ctx.fillStyle='#ffe16b';ctx.beginPath();ctx.arc(p[0],p[1],5,0,Math.PI*2);ctx.fill();});if(measurePoints.length===2)drawWorldLine(measurePoints[0],measurePoints[1],'#ffe16b',w,h);ctx.restore();}
  function loop(){raf=0;if(destroyed)return;if(dirty)render();}
  function worldOnReferencePlane(clientX,clientY){var rect=canvas.getBoundingClientRect(),nx=(clientX-rect.left-rect.width/2)/(Math.min(rect.width,rect.height)*1.05),ny=-(clientY-rect.top-rect.height/2)/(Math.min(rect.width,rect.height)*1.05);updateBasis();var dir=norm([basis.f[0]+nx*basis.r[0]+ny*basis.u[0],basis.f[1]+nx*basis.r[1]+ny*basis.u[1],basis.f[2]+nx*basis.r[2]+ny*basis.u[2]]);if(Math.abs(dir[2])<.0001)return null;var t=-basis.eye[2]/dir[2];if(t<=0)return null;return[basis.eye[0]+dir[0]*t,basis.eye[1]+dir[1]*t,0];}
  function selectAt(clientX,clientY){var rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top,best=null,bestDistance=28;lastDrawables.forEach(function(item){var cx=item.screen.reduce(function(n,p){return n+p[0];},0)/item.screen.length,cy=item.screen.reduce(function(n,p){return n+p[1];},0)/item.screen.length,d=Math.hypot(cx-x,cy-y);if(d<bestDistance){bestDistance=d;best=item.el.source;}});state.selected=best;renderInspection();updateTools();setDirty();announce(best?'Selected '+best.name+'.':'No supported element selected.');}
  function pointerDown(event){if(event.button!==0)return;canvas.setPointerCapture(event.pointerId);pointer={id:event.pointerId,x:event.clientX,y:event.clientY,az:camera.az,el:camera.el,dist:camera.dist,target:camera.target.slice(),moved:false};}
  function pointerMove(event){if(!pointer||pointer.id!==event.pointerId)return;var dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>4)pointer.moved=true;if(state.mode==='orbit'){camera.az=pointer.az-dx*.008;camera.el=Math.max(-1.25,Math.min(1.25,pointer.el+dy*.007));}else if(state.mode==='pan'){updateBasis();var scale=camera.dist*.0025;camera.target=[pointer.target[0]-basis.r[0]*dx*scale+basis.u[0]*dy*scale,pointer.target[1]-basis.r[1]*dx*scale+basis.u[1]*dy*scale,pointer.target[2]-basis.r[2]*dx*scale+basis.u[2]*dy*scale];}else if(state.mode==='zoom')camera.dist=Math.max(5,Math.min(5000,pointer.dist*Math.exp(dy*.008)));setDirty();}
  function pointerUp(event){if(!pointer||pointer.id!==event.pointerId)return;var moved=pointer.moved;pointer=null;try{canvas.releasePointerCapture(event.pointerId);}catch(e){}if(!moved&&state.mode==='inspect')selectAt(event.clientX,event.clientY);if(!moved&&state.mode==='measure'){var point=worldOnReferencePlane(event.clientX,event.clientY);if(point){if(measurePoints.length===2)measurePoints=[];measurePoints.push(point);updateMeasurement();setDirty();}}saveState();}
  function pointerCancel(){pointer=null;}
  function wheel(event){event.preventDefault();camera.dist=Math.max(5,Math.min(5000,camera.dist*Math.exp(event.deltaY*.001)));saveState();setDirty();}
  function keydown(event){if(event.target&&/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;var key=event.key.toLowerCase(),handled=true;if(key==='arrowleft'&&event.shiftKey)stepStage(-1);else if(key==='arrowright'&&event.shiftKey)stepStage(1);else if(key==='arrowleft')camera.az-=.08;else if(key==='arrowright')camera.az+=.08;else if(key==='arrowup')camera.el=Math.min(1.25,camera.el+.07);else if(key==='arrowdown')camera.el=Math.max(-1.25,camera.el-.07);else if(key==='+'||key==='=')camera.dist*=.9;else if(key==='-')camera.dist*=1.1;else if(key==='escape'){setMode('orbit');measurePoints=[];updateMeasurement();}else{var shortcut=TOOLS.find(function(t){return t.shortcut.toLowerCase()===key||(t.shortcut==='Space'&&event.code==='Space');});if(shortcut)activateTool(shortcut.id);else handled=false;}if(handled){event.preventDefault();saveState();setDirty();}}

  function setMode(mode){state.mode=mode;canvas.dataset.mode=mode;updateTools();announce(mode.charAt(0).toUpperCase()+mode.slice(1)+' tool active.');}
  function stepStage(delta){setStage(state.stage+delta);}
  function setStage(index){state.stage=Math.max(0,Math.min(STAGES.length-1,index));stageSelect.value=String(state.stage);state.selected=null;renderStage();renderInspection();saveState();setDirty();announce('Stage '+(state.stage+1)+' of '+STAGES.length+': '+STAGES[state.stage].name+'.');}
  function stopSequence(){state.playing=false;if(playTimer){clearInterval(playTimer);playTimer=0;}updateTools();}
  function toggleSequence(){if(state.playing){stopSequence();announce('Construction sequence paused.');return;}if(reduceMotion){announce('Sequence animation is disabled because reduced motion is enabled.');return;}state.playing=true;if(state.stage===STAGES.length-1)setStage(0);playTimer=setInterval(function(){if(state.stage===STAGES.length-1){stopSequence();return;}setStage(state.stage+1);},1400);updateTools();announce('Construction sequence playing.');}
  function activateTool(id){
    if(['orbit','pan','zoom','measure','inspect'].indexOf(id)>=0){setMode(id);return;}
    if(id==='fit'){fit();return;}if(id==='stage-filter'){stageSelect.focus();announce('Construction stage filter focused.');return;}if(id==='sequence'){toggleSequence();return;}
    if(id==='dimensions'){state.dimensions=!state.dimensions;saveState();updateTools();setDirty();announce('Dimensions '+(state.dimensions?'shown.':'hidden.'));return;}
    if(id==='section'){state.section=(state.section+1)%4;if(state.section===3){state.level=state.level==='all'?'first':state.level;$('#floorLevel').value=state.level;camera.target=bounds.center.slice();camera.az=-Math.PI/2;camera.el=1.52;camera.dist=Math.max(35,bounds.radius*3.2);}else if(state.section===0)fit();saveState();updateTools();setDirty();announce(state.section===0?'Section view off.':(state.section===1?'X section active.':(state.section===2?'Y section active.':state.level+' floor plan view active.')));return;}
    if(id==='source'){if(state.selected&&state.selected.sourceRefs.length){$('#sourceList').scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});announce('Source citations displayed.');}return;}
    if(id==='map-sync'&&model.mapRegistration.state==='VERIFIED'){state.mapSync=!state.mapSync;updateTools();announce('Map synchronization '+(state.mapSync?'enabled.':'disabled.'));}
  }
  function toolDisabledReason(id){if(id==='source'&&!(state.selected&&state.selected.sourceRefs&&state.selected.sourceRefs.length))return'Inspect an element with a source citation first.';if(id==='map-sync'&&model.mapRegistration.state!=='VERIFIED')return'Map registration is UNVERIFIED.';if(id==='sequence'&&reduceMotion)return'Disabled while reduced motion is enabled.';return'';}
  function renderTools(){dock.innerHTML='';TOOLS.forEach(function(tool){var button=document.createElement('button');button.type='button';button.className='tool';button.dataset.tool=tool.id;button.addEventListener('click',function(){activateTool(tool.id);});dock.appendChild(button);});updateTools();}
  function updateTools(){TOOLS.forEach(function(tool){var button=dock.querySelector('[data-tool="'+tool.id+'"]'),reason=toolDisabledReason(tool.id),pressed=(['orbit','pan','zoom','measure','inspect'].indexOf(tool.id)>=0&&state.mode===tool.id)||(tool.id==='sequence'&&state.playing)||(tool.id==='dimensions'&&state.dimensions)||(tool.id==='section'&&state.section>0)||(tool.id==='map-sync'&&state.mapSync),sectionLabel=['','X','Y','PLAN'][state.section]||'';button.textContent=tool.label+(tool.id==='section'&&sectionLabel?' '+sectionLabel:'');button.disabled=!!reason;button.title=reason||tool.label+' ('+tool.shortcut+')';button.setAttribute('aria-label',reason?tool.label+' unavailable: '+reason:tool.label+', shortcut '+tool.shortcut);button.setAttribute('aria-pressed',String(!!pressed));});}
  function renderStage(){var stage=STAGES[state.stage],atStage=(model.geometry.elements||[]).filter(function(el){return STAGE_INDEX[el.buildStage]===state.stage;}),visible=(model.geometry.elements||[]).filter(function(el){return STAGE_INDEX[el.buildStage]<=state.stage;});$('#hudStage').textContent='Stage '+(state.stage+1)+' / '+STAGES.length+' · '+stage.name;$('#hudSelection').textContent=state.selected?state.selected.name:(elements.length?'Select Inspect to view evidence.':'No plan-supported geometry loaded.');$('#stageStatus').textContent=atStage.length?stage.description:'UNVERIFIED — no plan-supported geometry is available for this stage.';$('#visibleCount').textContent=visible.length;$('#stageCount').textContent=atStage.length;$('#modelDescription').textContent=model.project.displayName+', '+model.project.status+'. Stage '+(state.stage+1)+' of '+STAGES.length+', '+stage.name+'. '+visible.length+' supported elements are visible.';}
  function renderInspection(){var box=$('#inspection'),list=$('#sourceList');if(!state.selected){box.textContent='Select Inspect, then choose supported geometry in the viewport.';list.innerHTML='<li class="empty">No source citation selected.</li>';renderStage();return;}var el=state.selected;box.innerHTML='<b>'+esc(el.name)+'</b>'+esc(el.state)+' · '+esc(el.buildStage)+'<br>Facts: '+esc(el.factRefs.join(', '));list.innerHTML=el.sourceRefs.map(function(ref){return'<li data-source-key="'+esc(sourceKey(ref))+'"><b>'+esc(ref.documentId)+'</b>, page '+ref.page+', region '+esc(ref.region)+'</li>';}).join('');renderStage();}
  function renderRegister(){var docs=model.sources.documents||[],list=$('#planRegister');list.innerHTML=docs.length?docs.map(function(doc){return'<li><b>'+esc(doc.title)+'</b><br>'+esc(doc.status)+' · '+doc.pageCount+' page(s) · SHA-256 '+esc(doc.sha256.slice(0,12))+'…'+(doc.revision?' · rev '+esc(doc.revision):'')+'</li>';}).join(''):'<li class="empty">No source documents loaded.</li>';}
  function renderNoteRegister(query){var fact=model.facts&&model.facts.planNoteRegister,value=fact&&fact.value,entries=value&&Array.isArray(value.entries)?value.entries:[],needle=String(query||'').trim().toLowerCase(),filtered=entries.filter(function(entry){if(!needle)return true;return[entry.text,entry.kind,entry.modelAction,(entry.disciplines||[]).join(' '),(entry.occurrences||[]).map(function(item){return item.sheet+' page '+item.page;}).join(' ')].join(' ').toLowerCase().indexOf(needle)>=0;}),coverage=value&&value.coverage||{};$('#noteCount').textContent=entries.length?'('+entries.length+')':'';$('#noteSummary').textContent=entries.length?(coverage.nonemptyLineOccurrences+' extracted line occurrence(s), '+entries.length+' unique normalized entries across '+coverage.pageCount+' sheet(s). '+filtered.length+' shown.'):'No note register loaded.';$('#noteList').innerHTML=filtered.length?filtered.map(function(entry){var first=entry.firstSource||{},disciplines=(entry.disciplines||[]).join(', ');return'<li><b>'+esc(entry.text)+'</b><span class="note-meta">'+esc(entry.modelAction)+' · '+esc(entry.kind)+(disciplines?' · '+esc(disciplines):'')+' · page '+esc(first.page||'—')+', '+esc(first.region||'source region unavailable')+(entry.occurrenceCount>1?' · '+entry.occurrenceCount+' occurrences':'')+'</span><br>'+esc(entry.rationale||'')+'</li>';}).join(''):'<li class="empty">No notes match this filter.</li>';}
  function renderUnknowns(){var unresolved=model.unresolved||[],list=$('#unknownList');list.innerHTML=unresolved.length?unresolved.map(function(item){return'<li><b>'+esc(item.label)+': UNVERIFIED</b><br>'+esc(item.reason)+'</li>';}).join(''):'<li>No unresolved facts reported.</li>';}
  function renderOutline(){var list=$('#modelOutline'),byStage={};STAGES.forEach(function(stage){byStage[stage.id]=[];});(model.geometry.elements||[]).forEach(function(el){byStage[el.buildStage].push(el);});list.innerHTML=STAGES.map(function(stage,index){var items=byStage[stage.id];return'<li><b>'+(index+1)+'. '+esc(stage.name)+'</b> — '+(items.length?items.map(function(el){return esc(el.name)+' ('+esc(el.state)+')';}).join('; '):'UNVERIFIED — no supported geometry')+'</li>';}).join('');}
  function updateMeasurement(){if(measurePoints.length===2){var d=Math.hypot(measurePoints[1][0]-measurePoints[0][0],measurePoints[1][1]-measurePoints[0][1],measurePoints[1][2]-measurePoints[0][2]);$('#measurement').textContent=d.toFixed(2)+' ft';announce('Measured '+d.toFixed(2)+' feet on the neutral reference plane.');}else $('#measurement').textContent=measurePoints.length?'Choose end point':'—';}
  function renderUI(){document.getElementById('projectName').textContent=model.project.displayName;document.getElementById('projectStatus').textContent=model.project.status;var notice=$('#modelNotice');notice.innerHTML=model.geometry.elements.length?'<strong>'+esc(model.project.status)+':</strong> '+model.geometry.elements.length+' source-linked geometry element(s) loaded.':'<strong>UNVERIFIED:</strong> No project plans or geometry are loaded.';$('#truthBanner').textContent=model.geometry.elements.length?'Only cited geometry is rendered. Parcel, terrain, and map truth remain subject to their displayed verification states.':'Reference grid only — not a parcel, legal survey, verified site grade, or plan-derived building.';stageSelect.innerHTML=STAGES.map(function(stage,index){return'<option value="'+index+'">'+(index+1)+' — '+esc(stage.name)+'</option>';}).join('');stageSelect.value=String(state.stage);$('#floorLevel').value=state.level;$('#noteSearch').value='';renderRegister();renderNoteRegister('');renderUnknowns();renderOutline();renderStage();renderInspection();updateTools();}
  function downloadModel(){var blob=new Blob([JSON.stringify(model,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=model.project.id+'-assistify-model.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},0);announce('Current project model exported.');}
  async function loadSampleModel(){var error=$('#uploadError');error.hidden=true;try{var response=await fetch('sample-full-floor-plan-model.json',{cache:'no-store'});if(!response.ok)throw new Error('Sample model could not be downloaded.');var next=await response.json(),errors=validateModel(next);if(errors.length)throw new Error(errors.slice(0,8).join(' '));loadModel(next,true);announce('Loaded the complete Los Angeles sample floor plan.');}catch(e){error.textContent='Sample load rejected: '+e.message;error.hidden=false;}}
  function clearModel(){try{localStorage.removeItem('assistify3d:model:'+model.project.id);localStorage.removeItem(storageKey('view'));if(localStorage.getItem('assistify3d:v1:active')===model.project.id)localStorage.removeItem('assistify3d:v1:active');}catch(e){}loadModel(initialModel,false);announce('Local prototype project data cleared.');}
  function upload(event){var file=event.target.files&&event.target.files[0],error=$('#uploadError');error.hidden=true;if(!file)return;if(file.size>5*1024*1024){error.textContent='Model file exceeds the 5 MB prototype limit.';error.hidden=false;return;}var reader=new FileReader();reader.onload=function(){try{var next=JSON.parse(String(reader.result)),errors=validateModel(next);if(errors.length)throw new Error(errors.slice(0,8).join(' '));loadModel(next,true);announce('Imported '+next.project.displayName+'.');}catch(e){error.textContent='Import rejected: '+e.message;error.hidden=false;}};reader.onerror=function(){error.textContent='The model file could not be read.';error.hidden=false;};reader.readAsText(file);event.target.value='';}

  renderTools();stageSelect.addEventListener('change',function(){setStage(Number(this.value));});$('#floorLevel').addEventListener('change',function(){state.level=this.value;saveState();setDirty();announce(this.options[this.selectedIndex].text+' selected.');});$('#noteSearch').addEventListener('input',function(){renderNoteRegister(this.value);});$('#stageBack').addEventListener('click',function(){stepStage(-1);});$('#stageForward').addEventListener('click',function(){stepStage(1);});$('#loadSampleModel').addEventListener('click',loadSampleModel);$('#modelUpload').addEventListener('change',upload);$('#exportModel').addEventListener('click',downloadModel);$('#clearModel').addEventListener('click',clearModel);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);canvas.addEventListener('lostpointercapture',pointerCancel);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);global.addEventListener('resize',setDirty);
  var resizeObserver=global.ResizeObserver?new ResizeObserver(setDirty):null;if(resizeObserver)resizeObserver.observe(viewport);
  try{loadModel(tryStoredModel(initialModel),false);}catch(e){loadModel(initialModel,false);}
  return{destroy:function(){destroyed=true;stopSequence();if(raf)cancelAnimationFrame(raf);if(resizeObserver)resizeObserver.disconnect();global.removeEventListener('resize',setDirty);try{if(media)media.removeEventListener('change',onMotion);}catch(e){}},loadModel:function(next){loadModel(next,true);},getModel:function(){return JSON.parse(JSON.stringify(model));},getState:function(){return JSON.parse(JSON.stringify(state));}};
}

global.Assistify3D={STAGES:STAGES,TOOLS:TOOLS,validateModel:validateModel,mount:mount};
})(window);
