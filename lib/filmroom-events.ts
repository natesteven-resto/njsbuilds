export interface FilmStat { shot_x?:number|null; shot_y?:number|null; id:string; player_id:string; player_name:string; player_number?:string; stat_type:string; video_time_ms:number }
export const STAT_NAMES:Record<string,string> = {'2M':'2-point made','2X':'2-point missed','3M':'3-point made','3X':'3-point missed',FTM:'Free throw made',FTX:'Free throw missed',OREB:'Offensive rebound',DREB:'Defensive rebound',AST:'Assist',STL:'Steal',BLK:'Block',DEF:'Deflection',TO:'Turnover',FOUL:'Foul',PTS:'Points',REB:'Rebound',FT:'Free throw'}
export function statMoment(ms:number){return Math.max(0,Math.round(ms)-2000)}
export function reviewMoment(ms:number,lead:number){return Math.max(0,ms-lead*1000)}
export function eventStyle(type:string){
 if(['2M','2X','3M','3X','FTM','FTX','PTS','FT'].includes(type))return {symbol:'●',color:'#e7b96b',group:'Shots'}
 if(['OREB','DREB','REB'].includes(type))return {symbol:'◆',color:'#74bfc9',group:'Rebounds'}
 if(['TO','FOUL'].includes(type))return {symbol:'×',color:'#ef9390',group:'Turnovers / fouls'}
 return {symbol:'▲',color:'#a8bc86',group:'Other stats'}
}
export function statDescription(s:FilmStat){return `${s.player_id ? `${s.player_number && s.player_number!=='?'?'#'+s.player_number+' ':''}${s.player_name}`:'Opponent'} · ${STAT_NAMES[s.stat_type]||s.stat_type}`}
