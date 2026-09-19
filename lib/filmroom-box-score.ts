import type {FilmStat} from './filmroom-events'
export type BoxPlayer={id:string;name:string;number:string|null}
export function boxScore(entries:FilmStat[]){
 const n=(type:string)=>entries.filter(e=>e.stat_type===type).length
 const twos=n('2M'),threes=n('3M'),ft=n('FTM'),fg=twos+threes,fga=fg+n('2X')+n('3X'),threeA=threes+n('3X'),fta=ft+n('FTX')
 const pct=(m:number,a:number)=>a?Math.round(m/a*100)+'%':'—'
 return {PTS:twos*2+threes*3+ft,REB:n('OREB')+n('DREB')+n('REB'),AST:n('AST'),STL:n('STL'),BLK:n('BLK'),TO:n('TO'),FG:`${fg}-${fga}`,'FG%':pct(fg,fga),'3PT':`${threes}-${threeA}`,'3PT%':pct(threes,threeA),FT:`${ft}-${fta}`,'FT%':pct(ft,fta),OREB:n('OREB'),DREB:n('DREB'),DEF:n('DEF'),FOUL:n('FOUL')}
}
export const boxGroups={
 Overview:['PTS','REB','AST','STL','BLK','TO'],
 Shooting:['FG','FG%','3PT','3PT%','FT','FT%'],
 Defense:['OREB','DREB','STL','BLK','DEF','FOUL'],
} as const
