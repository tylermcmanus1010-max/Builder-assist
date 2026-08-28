(function(global){
'use strict';

var STATUSES=['not-started','in-progress','blocked','needs-inspection','complete'];
function key(projectId){return'assistify3d:progress:'+projectId;}
function blank(projectId){return{version:1,projectId:projectId,stages:{},history:[]};}
function normalize(projectId,value){var data=value&&value.version===1?value:blank(projectId);data.projectId=projectId;data.stages=data.stages||{};data.history=Array.isArray(data.history)?data.history.slice(0,100):[];return data;}
function load(projectId){try{return normalize(projectId,JSON.parse(localStorage.getItem(key(projectId))||'null'));}catch(error){return blank(projectId);}}
function save(data){localStorage.setItem(key(data.projectId),JSON.stringify(data));return data;}
function stage(data,stageId){var value=data.stages[stageId]||{};return{status:STATUSES.indexOf(value.status)>=0?value.status:'not-started',percent:Math.max(0,Math.min(100,Number(value.percent)||0)),updatedBy:String(value.updatedBy||''),note:String(value.note||''),evidenceName:String(value.evidenceName||''),updatedAt:String(value.updatedAt||'')};}
function update(data,stageId,input){var next=stage(data,stageId),now=new Date().toISOString();next.status=STATUSES.indexOf(input.status)>=0?input.status:next.status;next.percent=Math.max(0,Math.min(100,Number(input.percent)||0));next.updatedBy=String(input.updatedBy||'').trim().slice(0,80);next.note=String(input.note||'').trim().slice(0,500);next.evidenceName=String(input.evidenceName||'').trim().slice(0,160);next.updatedAt=now;data.stages[stageId]=next;data.history.unshift({stageId:stageId,status:next.status,percent:next.percent,updatedBy:next.updatedBy,note:next.note,evidenceName:next.evidenceName,updatedAt:now});data.history=data.history.slice(0,100);return save(data);}
function summary(data,stageIds){var records=stageIds.map(function(id){return stage(data,id);}),total=records.reduce(function(sum,item){return sum+item.percent;},0),counts={};STATUSES.forEach(function(status){counts[status]=0;});records.forEach(function(item){counts[item.status]++;});return{percent:records.length?Math.round(total/records.length):0,counts:counts,updated:records.filter(function(item){return item.updatedAt;}).length};}

global.AssistifyProgressStore={STATUSES:STATUSES,load:load,save:save,stage:stage,update:update,summary:summary,key:key};
})(window);
