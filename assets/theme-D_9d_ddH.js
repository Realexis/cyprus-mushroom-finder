(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(){return`
  <div class="em-head" id="em-title">
    <h2>Mushroom poisoning?</h2>
    <div>Act now. Do not wait for symptoms.</div>
  </div>
  <div class="em-body">
    <a class="call" href="tel:112">
      <span>Call 112<small>Ambulance</small></span><span aria-hidden="true">📞</span>
    </a>
    <a class="call secondary" href="tel:1401">
      <span>Cyprus Poison Centre: 1401</span><span aria-hidden="true">📞</span>
    </a>
    <ul>
      <li><b>Do not wait for symptoms.</b> Death cap poisons show no symptoms for <b>6–12 hours</b>.
          Some Cyprus species act after about <b>48 hours</b>.</li>
      <li><b>Bring the mushroom</b> (or what is left of it) to the hospital.</li>
      <li><b>Cooking does not remove the poison.</b></li>
    </ul>
    <form method="dialog"><button class="em-close">Close</button></form>
  </div>`}function t(t){let n=document.createElement(`dialog`);n.className=`emergency`,n.setAttribute(`aria-labelledby`,`em-title`),n.innerHTML=e(),document.body.append(n);for(let e of t)e.addEventListener(`click`,()=>n.showModal())}var n=`cmf-theme`;function r(){try{let e=localStorage.getItem(n);if(e===`dark`||e===`light`)return e}catch{}return matchMedia(`(prefers-color-scheme: light)`).matches?`light`:`dark`}function i(e){document.documentElement.dataset.theme=e,document.querySelector(`meta[name="theme-color"]`)?.setAttribute(`content`,e===`dark`?`#14211b`:`#fffdf8`)}function a(){let e=r()===`dark`?`light`:`dark`;try{localStorage.setItem(n,e)}catch{}return i(e),e}export{t as i,r as n,a as r,i as t};