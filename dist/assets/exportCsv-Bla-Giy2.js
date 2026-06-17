function p(c,o,a){const s=o.map(t=>t.label).join(","),r=c.map(t=>o.map(l=>JSON.stringify(t[l.key]??"")).join(",")),b=[s,...r].join(`
`),i=new Blob([b],{type:"text/csv"}),n=URL.createObjectURL(i),e=document.createElement("a");e.href=n,e.download=a,e.click(),URL.revokeObjectURL(n)}export{p as e};
