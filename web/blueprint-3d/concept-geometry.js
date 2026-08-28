(function(global){
'use strict';

var PROJECT_ID='scottsdale-4752-25-approvedplans',DOCUMENT_ID='approvedplans-4752-25';

function augment(input){
  if(!input||!input.project||input.project.id!==PROJECT_ID)return input;
  if((input.geometry&&input.geometry.elements||[]).some(function(element){return element.concept===true;}))return input;
  var model=JSON.parse(JSON.stringify(input)),elements=model.geometry.elements;
  function source(page,region){return[{documentId:DOCUMENT_ID,page:page,region:region}];}
  function line(id,name,stage,page,region,role,a,b,inference){elements.push({id:'concept-'+id,name:name,type:'line',buildStage:stage,state:'INFERRED',concept:true,inference:inference,sourceRefs:source(page,region),factRefs:['planNoteRegister'],role:role,geometry:{points:[a,b]}});}
  function box(id,name,stage,page,region,role,min,size,inference){elements.push({id:'concept-'+id,name:name,type:'box',buildStage:stage,state:'INFERRED',concept:true,inference:inference,sourceRefs:source(page,region),factRefs:['planNoteRegister'],role:role,geometry:{min:min,size:size}});}
  function rectangle(prefix,name,stage,page,region,role,x0,y0,x1,y1,z,inference){line(prefix+'-south',name+' south',stage,page,region,role,[x0,y0,z],[x1,y0,z],inference);line(prefix+'-east',name+' east',stage,page,region,role,[x1,y0,z],[x1,y1,z],inference);line(prefix+'-north',name+' north',stage,page,region,role,[x1,y1,z],[x0,y1,z],inference);line(prefix+'-west',name+' west',stage,page,region,role,[x0,y1,z],[x0,y0,z],inference);}

  rectangle('site-limit','Conceptual site-work limit','site-controls',4,'A102 site-plan context','concept-site',-12,-12,142.5,99.5,.15,'Approximate work limit expanded from the building extents; not a parcel or survey boundary.');
  rectangle('demo-limit','Conceptual demolition limit','clearing-erosion',3,'A101 demolition plan context','concept-demo',-3,-3,134,90.5,.35,'Approximate demolition review envelope; exact removal limits require drawing takeoff.');
  for(var contour=0;contour<6;contour++)line('grade-'+contour,'Conceptual grading contour '+(contour+1),'earthwork-grading',2,'SITE grading and drainage plan','concept-earth',[-10,contour*20-6,.35-contour*.16],[140,contour*20-13,.35-contour*.16],'Directional grade concept only; elevations and slope breaks are not surveyed coordinates.');
  line('site-drainage','Conceptual site drainage path','underground-utilities',2,'SITE drainage arrows and details','concept-utility',[-8,94,.2],[140,-8,-1.1],'Diagrammatic drainage direction based on the grading sheet; route and invert are approximate.');
  line('water-service','Conceptual water service','underground-utilities',10,'A108 plumbing plan and isometric','concept-plumbing',[-10,18,-1.2],[91,18,-1.2],'Diagrammatic service route inferred from plumbing coverage, not a coordinated trench layout.');
  line('sewer-service','Conceptual sewer service','underground-utilities',10,'A108 plumbing plan and isometric','concept-plumbing',[72,44,-1.8],[140,44,-2.4],'Diagrammatic sanitary route; fixture branches, slope, and invert require plumbing takeoff.');
  line('gas-service','Conceptual gas service','underground-utilities',12,'A110 gas plan','concept-gas',[-10,72,-1],[118,72,-1],'Diagrammatic gas service route; sizing and exact routing remain sheet-controlled.');
  line('electrical-service','Conceptual electrical service','underground-utilities',14,'E002 power plan','concept-electrical',[132,8,-1.3],[82,8,-1.3],'Diagrammatic electrical service route; equipment and conduit locations are approximate.');

  box('footing-south','Conceptual continuous footing south','footings',16,'S002 foundation plan and footing details','concept-concrete',[0,-.8,-2],[130.5,1.6,1.2],'Perimeter footing inferred from the architectural extents; width and depth are conceptual.');
  box('footing-north','Conceptual continuous footing north','footings',16,'S002 foundation plan and footing details','concept-concrete',[0,86.7,-2],[130.5,1.6,1.2],'Perimeter footing inferred from the architectural extents; width and depth are conceptual.');
  box('footing-west','Conceptual continuous footing west','footings',16,'S002 foundation plan and footing details','concept-concrete',[-.8,0,-2],[1.6,87.5,1.2],'Perimeter footing inferred from the architectural extents; width and depth are conceptual.');
  box('footing-east','Conceptual continuous footing east','footings',16,'S002 foundation plan and footing details','concept-concrete',[129.7,0,-2],[1.6,87.5,1.2],'Perimeter footing inferred from the architectural extents; width and depth are conceptual.');
  [30,62,98].forEach(function(x,index){box('footing-grid-x-'+index,'Conceptual interior footing line '+(index+1),'footings',16,'S002 foundation plan and details','concept-concrete',[x-.45,6,-1.6],[.9,75.5,.8],'Interior support line guessed from a regular structural grid; verify against S002 details.');});
  [29,58].forEach(function(y,index){box('footing-grid-y-'+index,'Conceptual cross footing '+(index+1),'footings',16,'S002 foundation plan and details','concept-concrete',[8,y-.45,-1.6],[114.5,.9,.8],'Interior support line guessed from a regular structural grid; verify against S002 details.');});
  box('foundation-south','Conceptual foundation wall south','foundation-waterproofing',16,'S002 foundation plan and details','concept-concrete',[0,-.35,-.8],[130.5,.7,1.3],'Conceptual perimeter stem wall aligned to the inferred slab extents.');
  box('foundation-north','Conceptual foundation wall north','foundation-waterproofing',16,'S002 foundation plan and details','concept-concrete',[0,87.15,-.8],[130.5,.7,1.3],'Conceptual perimeter stem wall aligned to the inferred slab extents.');
  box('foundation-west','Conceptual foundation wall west','foundation-waterproofing',16,'S002 foundation plan and details','concept-concrete',[-.35,0,-.8],[.7,87.5,1.3],'Conceptual perimeter stem wall aligned to the inferred slab extents.');
  box('foundation-east','Conceptual foundation wall east','foundation-waterproofing',16,'S002 foundation plan and details','concept-concrete',[130.15,0,-.8],[.7,87.5,1.3],'Conceptual perimeter stem wall aligned to the inferred slab extents.');

  box('wall-south','Conceptual exterior framing south','wall-framing-sheathing',18,'S004 framing plan and details','concept-wood',[0,-.3,.1],[130.5,.6,10],'Simplified exterior framing shell; openings, studs, headers, and shear panels are not resolved.');
  box('wall-north','Conceptual exterior framing north','wall-framing-sheathing',18,'S004 framing plan and details','concept-wood',[0,87.2,.1],[130.5,.6,10],'Simplified exterior framing shell; openings, studs, headers, and shear panels are not resolved.');
  box('wall-west','Conceptual exterior framing west','wall-framing-sheathing',18,'S004 framing plan and details','concept-wood',[-.3,0,.1],[.6,87.5,10],'Simplified exterior framing shell; openings, studs, headers, and shear panels are not resolved.');
  box('wall-east','Conceptual exterior framing east','wall-framing-sheathing',18,'S004 framing plan and details','concept-wood',[130.2,0,.1],[.6,87.5,10],'Simplified exterior framing shell; openings, studs, headers, and shear panels are not resolved.');
  [22,44,66,88,110].forEach(function(x,index){line('frame-grid-'+index,'Conceptual framing grid '+(index+1),'wall-framing-sheathing',18,'S004 framing plan and details','concept-wood',[x,6,.2],[x,81.5,10],'Diagrammatic framing grid used to communicate structural coverage; not a stud or shear-wall layout.');});
  line('roof-ridge','Conceptual roof ridge','roof-structure-envelope',7,'A105 roof plan','concept-roof',[-2,43.75,15],[132.5,43.75,15],'Conceptual ridge line inferred from the roof extents; verify slopes and parapets on A105/A106.');
  for(var rafter=0;rafter<12;rafter++){var x=5+rafter*11;line('rafter-'+rafter,'Conceptual roof framing '+(rafter+1),'roof-structure-envelope',18,'S004 framing plan and details','concept-wood',[x,0,13.8],[x,43.75,15],'Evenly spaced diagrammatic framing member, not a truss or rafter takeoff.');line('rafter-north-'+rafter,'Conceptual roof framing north '+(rafter+1),'roof-structure-envelope',18,'S004 framing plan and details','concept-wood',[x,87.5,13.8],[x,43.75,15],'Evenly spaced diagrammatic framing member, not a truss or rafter takeoff.');}

  line('plumbing-trunk','Conceptual plumbing trunk','mep-insulation',10,'A108 plumbing plan and isometric','concept-plumbing',[12,45,1],[120,45,1],'Diagrammatic plumbing trunk; fixture branches, elevations, sizes, and slopes are approximate.');
  [[22,16],[48,72],[75,18],[102,70],[120,28]].forEach(function(point,index){line('plumbing-branch-'+index,'Conceptual plumbing branch '+(index+1),'mep-insulation',10,'A108 plumbing plan and isometric','concept-plumbing',[point[0],45,1],[point[0],point[1],1],'Diagrammatic fixture branch based on plan coverage, not an install route.');});
  line('mechanical-trunk','Conceptual mechanical trunk','mep-insulation',11,'A109 mechanical plan','concept-mechanical',[10,42,9.2],[122,42,9.2],'Diagrammatic duct main; sizes, offsets, equipment, and diffuser locations require coordination.');
  [[25,18],[52,70],[82,20],[110,68]].forEach(function(point,index){line('mechanical-branch-'+index,'Conceptual mechanical branch '+(index+1),'mep-insulation',11,'A109 mechanical plan','concept-mechanical',[point[0],42,9.2],[point[0],point[1],9.2],'Diagrammatic duct branch; not a fabrication or coordination model.');});
  line('gas-trunk','Conceptual gas trunk','mep-insulation',12,'A110 gas plan','concept-gas',[5,74,2],[122,74,2],'Diagrammatic gas main; route, size, valves, and appliance connections remain plan-controlled.');
  [[35,48],[68,55],[104,42]].forEach(function(point,index){line('gas-branch-'+index,'Conceptual gas branch '+(index+1),'mep-insulation',12,'A110 gas plan','concept-gas',[point[0],74,2],[point[0],point[1],2],'Diagrammatic gas branch; not an installation layout.');});
  line('electrical-trunk','Conceptual electrical distribution','mep-insulation',14,'E002 power plan','concept-electrical',[8,8,8.5],[124,8,8.5],'Diagrammatic electrical distribution path; circuits, homeruns, and device locations are approximate.');
  [16,32,48,64,80,96,112].forEach(function(x,index){line('electrical-branch-'+index,'Conceptual electrical branch '+(index+1),'mep-insulation',14,'E002 power plan','concept-electrical',[x,8,8.5],[x,79,8.5],'Diagrammatic branch path; verify circuits and devices on E001/E002.');});
  [18,45,72,99,126].forEach(function(x,xi){[20,44,68].forEach(function(y,yi){box('light-'+xi+'-'+yi,'Conceptual ceiling light '+(xi*3+yi+1),'finishes-closeout',6,'A104 reflected ceiling and lighting plan','concept-electrical',[x-.35,y-.35,9.65],[.7,.7,.18],'Regularized lighting marker for coverage visualization; exact fixture type and location require A104 review.');});});
  return model;
}

global.AssistifyConceptGeometry={augment:augment};
})(window);
