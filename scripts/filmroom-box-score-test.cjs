const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');const exports_={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/filmroom-box-score.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exports_});
const {boxScore}=exports_;
const events=['2M','2M','2X','3M','3X','3X','FTM','FTX','OREB','DREB','DREB','AST','STL','BLK','DEF','FOUL','TO'].map((stat_type,id)=>({id:String(id),stat_type}));
const score=boxScore(events);assert.equal(score.PTS,8);assert.equal(score.FG,'3-6');assert.equal(score['FG%'],'50%');assert.equal(score['3PT'],'1-3');assert.equal(score['3PT%'],'33%');assert.equal(score.FT,'1-2');assert.equal(score['FT%'],'50%');assert.equal(score.REB,3);assert.equal(score.OREB,1);assert.equal(score.DREB,2);for(const key of ['AST','STL','BLK','DEF','FOUL','TO'])assert.equal(score[key],1);
assert.equal(boxScore([]).PTS,0);assert.equal(boxScore([]).FG,'0-0');assert.equal(boxScore([])['FG%'],'—');
console.log('PASS: box score points, attempts, shooting percentages, rebounds, hustle stats, and empty games');
