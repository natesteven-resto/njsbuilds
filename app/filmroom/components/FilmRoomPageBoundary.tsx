'use client'
import {useEffect} from 'react'

// Keep a one-finger drag inside the app when every scroll area is at its edge.
// Interior scrolling, nested panels, and multi-touch zoom remain available.
export function FilmRoomPageBoundary(){
 useEffect(()=>{
  let lastY=0
  const start=(event:TouchEvent)=>{if(event.touches.length===1)lastY=event.touches[0].clientY}
  const move=(event:TouchEvent)=>{
   if(event.touches.length!==1)return
   const y=event.touches[0].clientY,delta=y-lastY;lastY=y
   let element=event.target instanceof HTMLElement?event.target:null
   if(!element?.closest('.filmroom-shell')||element.closest('[aria-modal="true"]'))return
   const root=document.scrollingElement
   while(element){
    const style=getComputedStyle(element)
    const isRoot=element===root
    const scrollable=isRoot ? !/hidden|clip/.test(style.overflowY) : /auto|scroll/.test(style.overflowY)
    const max=element.scrollHeight-element.clientHeight
    if(scrollable&&max>1&&((delta>0&&element.scrollTop>0)||(delta<0&&element.scrollTop<max-1)))return
    element=element.parentElement
   }
   if(event.cancelable)event.preventDefault()
  }
  document.addEventListener('touchstart',start,{passive:true})
  document.addEventListener('touchmove',move,{passive:false})
  return()=>{document.removeEventListener('touchstart',start);document.removeEventListener('touchmove',move)}
 },[])
 return null
}
