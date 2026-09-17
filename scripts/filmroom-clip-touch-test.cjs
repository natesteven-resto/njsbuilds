const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const source=fs.readFileSync('app/filmroom/game/[id]/page.tsx','utf8')
const start=source.indexOf('    let lastY=0')
const end=source.indexOf("    document.addEventListener('touchstart'",start)
assert(start>0&&end>start)
class Element {
 constructor(parent=null,height=100,client=100,top=0){this.parentElement=parent;this.scrollHeight=height;this.clientHeight=client;this.scrollTop=top}
 contains(el){for(;el;el=el.parentElement)if(el===this)return true;return false}
}
const details=new Element(null,500,200,100),field=new Element(details),outside=new Element()
const scope={HTMLElement:Element,dialogRef:{current:{querySelector:()=>details}},getComputedStyle:()=>({overflowY:'auto'})}
vm.createContext(scope)
vm.runInContext(ts.transpileModule(source.slice(start,end)+'\nthis.start=touchStart;this.move=touchMove',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope)
function drag(target,dy,touches=1){let blocked=false;scope.start({touches:[{clientY:100}]});scope.move({target,touches:Array.from({length:touches},()=>({clientY:100+dy})),cancelable:true,preventDefault(){blocked=true}});return blocked}
assert.equal(drag(field,30),false,'scroll up within content')
assert.equal(drag(field,-30),false,'scroll down within content')
details.scrollTop=0;assert.equal(drag(field,30),true,'block top bounce')
assert.equal(drag(field,-30),false,'allow moving away from top')
details.scrollTop=300;assert.equal(drag(field,-30),true,'block bottom bounce')
assert.equal(drag(outside,-30),true,'block background and footer dragging')
const textarea=new Element(details,200,80,20)
assert.equal(drag(textarea,-30),false,'allow nested textarea scrolling')
assert.equal(drag(outside,-30,2),false,'preserve pinch zoom')
details.scrollHeight=200;details.scrollTop=0;assert.equal(drag(field,-30),true,'block bounce when content fits')
console.log('PASS: interior scrolling, top/bottom boundaries, background lock, nested textarea, pinch zoom, short content')
