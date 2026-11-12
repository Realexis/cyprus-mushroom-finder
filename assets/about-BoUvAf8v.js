import{i as e,n as t,t as n}from"./theme-D_9d_ddH.js";var r=e=>e.replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]);n(t()),e([...document.querySelectorAll(`[data-emergency]`)]),fetch(new URL(`data/meta.json`,document.baseURI),{cache:`no-cache`}).then(e=>e.json()).then(e=>{document.getElementById(`run`).textContent=`${e.weather_run} · model ${e.model}`,document.getElementById(`credits`).innerHTML=e.credits.map(e=>`
      <div class="card">
        <h3>${r(e.name)}</h3>
        <p>${r(e.credit)}</p>
        <p><span class="tag ${e.status===`verified`?``:`warn`}">${r(e.licence)}${e.status===`verified`?``:` · licence being checked`}</span></p>
        ${e.use?`<p>${r(e.use)}</p>`:``}
      </div>`).join(``)+`
      <div class="card"><h3>Protomaps basemap</h3><p>Map tiles from the Protomaps build of OpenStreetMap. © OpenStreetMap contributors (ODbL).</p></div>`});