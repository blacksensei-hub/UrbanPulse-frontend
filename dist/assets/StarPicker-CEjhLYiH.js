import{G as c,D as i}from"./index-CcvsjSXs.js";import{j as t}from"./motion-D4ctv0sM.js";import{e as n}from"./react-BD33oxTj.js";import{S as p}from"./star-UfBP56yW.js";/**
 * @license lucide-react v0.408.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=c("Copy",[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]]);function h({value:o,onChange:a}){const[s,r]=n.useState(0);return t.jsx("div",{className:"flex gap-1",children:[1,2,3,4,5].map(e=>t.jsx("button",{type:"button",onClick:()=>a(e),onMouseEnter:()=>r(e),onMouseLeave:()=>r(0),"aria-label":`Rate ${e} star${e>1?"s":""}`,children:t.jsx(p,{className:i("h-6 w-6 transition-colors",e<=(s||o)?"fill-accent text-accent":"text-border")})},e))})}export{d as C,h as S};
