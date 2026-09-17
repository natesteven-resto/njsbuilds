export function safeFilmroomNext(raw:string|null):string {
 if(!raw || /[\x00-\x1f\\]/.test(raw) || raw.startsWith('//') || raw.includes(':') || (!raw.startsWith('/filmroom/') && raw!=='/filmroom'))return '/filmroom'
 return raw
}
