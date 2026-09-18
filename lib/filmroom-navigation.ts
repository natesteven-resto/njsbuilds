/** Payment status never grants access to another coach's library. */
export function shouldOpenFamily(hasInvitation:boolean,hasOwnGames:boolean,coachRequested:boolean,paidCoach=false){
 return hasInvitation&&!hasOwnGames&&!coachRequested&&!paidCoach
}
export function selectOwnedTeam<T extends {id:string}>(teams:T[],requested:string|null){
 return teams.find(team=>team.id===requested)||teams[0]||null
}
export function savedCoachTeam(){try{return localStorage.getItem('filmroom:selected-team')}catch{return null}}
export function rememberCoachTeam(id:string){try{localStorage.setItem('filmroom:selected-team',id)}catch{}}
