const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript')
const source=fs.readFileSync('app/filmroom/components/FilmRoomPageBoundary.tsx','utf8')
class Element {
 constructor(parent=null,height=100,client=100,top=0,overflow='visible'){Object.assign(this,{parentElement:parent,scrollHeight:height,clientHeight:client,scrollTop:top,overflowY:overflow,inApp:true,modal:false})}
 closest(selector){return selector==='.filmroom-shell'?(this.inApp?this:null):(this.modal?this:null)}
}
const root=new Element(null,2000,800,300),body=new Element(root),target=new Element(body)
const scope={HTMLElement:Element,document:{scrollingElement:root},getComputedStyle:el=>el}
vm.createContext(scope)
const code=source.slice(source.indexOf('  let lastY=0'),source.indexOf("  document.addEventListener('touchstart'"))
vm.runInContext(ts.transpileModule(code+'\nthis.start=start;this.move=move',{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,scope)
function drag(el,dy,count=1){let blocked=false;scope.start({touches:[{clientY:100}]});scope.move({target:el,touches:Array.from({length:count},()=>({clientY:100+dy})),cancelable:true,preventDefault(){blocked=true}});return blocked}
assert.equal(drag(target,20),false)
assert.equal(drag(target,-20),false)
root.scrollTop=0;assert.equal(drag(target,20),true,'top edge blocked');assert.equal(drag(target,-20),false)
root.scrollTop=1200;assert.equal(drag(target,-20),true,'bottom edge blocked');assert.equal(drag(target,20),false)
const panel=new Element(body,800,200,100,'auto'),input=new Element(panel)
assert.equal(drag(input,-20),false,'nested scroll continues at page bottom')
panel.scrollTop=600;assert.equal(drag(input,-20),true,'both edges blocked')
target.modal=true;assert.equal(drag(target,-20),false,'modal uses its own guard');target.modal=false
target.inApp=false;assert.equal(drag(target,-20),false,'other pages untouched');target.inApp=true
assert.equal(drag(target,-20,2),false,'pinch zoom preserved')
root.scrollHeight=800;root.scrollTop=0;assert.equal(drag(target,-20),true,'short page edge blocked')
console.log('PASS: page edges, normal scrolling, nested panels, modal isolation, route isolation, pinch zoom, short pages')
