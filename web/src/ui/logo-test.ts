// TEST ONLY (26 Nov 2026): ?logo=b|c|d shows another phone header, so Real can compare. Remove once one is picked.
const pick = new URLSearchParams(location.search).get("logo");
if (pick && /^[bcd]$/.test(pick)) document.documentElement.dataset.logo = pick;
