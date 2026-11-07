// Bygger interpuls.no som flersidig statisk nettsted fra prototypen (artefaktet).
// Bruk: node build.mjs <proto.html> <utmappe> [--released] [--public=<offentlig index.html for lekkasjesjekk>]
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";

const [,, SRC, OUT, ...flags] = process.argv;
const RELEASED = flags.includes("--released");
const PUBLIC = (flags.find(f=>f.startsWith("--public="))||"").slice(9);
const TOOLS = path.dirname(new URL(import.meta.url).pathname);
const BASE = "https://interpuls.no";
const NOW = new Date().toISOString().slice(0,10);

const src = fs.readFileSync(SRC, "utf8");

// ---------- 1. Hent data og renderfunksjoner fra prototypen ----------
const sStart = src.indexOf("<script>\nconst IMG");
const sEnd = src.indexOf("const ROUTES = {");
if(sStart<0 || sEnd<0) throw new Error("Fant ikke skriptet i prototypen");
let code = src.slice(sStart + 8, sEnd);
code = code.replace("const IMG = n => 'img/' + n + '.jpg';", "const IMG = n => '/img/' + n + '.jpg';");
code += `
;globalThis.__api = {
  setLang: l => { lang = l; }, setReleased: v => { RELEASED_2027 = v; }, state,
  T, PROGRAM, PEOPLE, IPE, PRESS, ALBUMS, VIDEOS, RADIO, TIMELINE, PARTNERS, SUPPORT,
  credit, slug, L, esc, t, IMG, whoLinks, descHtml, newsBand, vids,
  home, program, people, media, about, partners, contact, pressPage, artistsCarousel, daysBrief
};`;
const ctx = vm.createContext({console, Date, URL});
vm.runInContext(code, ctx);
const A = ctx.__api;
A.setReleased(RELEASED);

// ---------- 2. CSS og fonter ----------
const cssStart = src.indexOf("<style>\n@font-face");
const cssEnd = src.indexOf("</style>", cssStart);
let css = src.slice(cssStart + 7, cssEnd);
const fonts = [];
css = css.replace(/url\(data:font\/woff2;base64,([A-Za-z0-9+/=]+)\) format\("woff2"\);font-weight:([0-9 ]+);/g, (m, b64, w) => {
  const name = `museo-sans-${w.trim().replace(/ /g,"-")}.woff2`;
  fonts.push([name, Buffer.from(b64, "base64")]);
  return `url(/fonts/${name}) format("woff2");font-weight:${w};`;
});
css += `
/* --- flersidig versjon --- */
html,body{margin:0}
picture{display:contents}
img{height:auto}
.tba > picture > img,.aud > picture > img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.lang a{font-size:.78rem;font-weight:700;letter-spacing:.06em;color:var(--dim);padding:.45em .6em;text-decoration:none;line-height:1.55}
.lang a.on{background:var(--paper);color:var(--ink)}
.yearbar a{font-weight:700;font-size:.92rem;padding:.45em .95em;color:var(--mist);border:1.5px solid var(--line);text-decoration:none;font-variant-numeric:tabular-nums}
.yearbar a:hover{border-color:var(--mist)}
.yearbar a[aria-current="page"]{background:var(--paper);color:var(--ink);border-color:var(--paper)}
.event h3 a{color:inherit;text-decoration:none}.event h3 a:hover{color:var(--accent)}
.event .more{font-weight:700;font-size:.88rem;color:var(--accent);text-decoration:none}
.concert{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:start}
.concert > *{min-width:0}
.concert .cimg{aspect-ratio:4/3;overflow:hidden}.concert .cimg img{width:100%;height:100%;object-fit:cover}
.concert .time{font-variant-numeric:tabular-nums;color:var(--accent);font-weight:700}
.concert .who{color:var(--mist);margin-block:10px 18px}
.concert .desc{color:var(--mist);max-width:62ch}.concert .desc+.desc{margin-top:14px}
.concert .acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;align-items:center}
@media (max-width:860px){.concert{grid-template-columns:1fr;gap:28px}}
.others{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:2px;margin-top:18px}
.others a{background:var(--ink-2);padding:18px;display:grid;gap:4px;text-decoration:none;min-width:0}
.others a:hover{background:var(--ink-3)}.others span{color:var(--accent);font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
`;
const siteJs = fs.readFileSync(path.join(TOOLS, "site.js"), "utf8");
const hash = s => crypto.createHash("sha1").update(s).digest("hex").slice(0,8);
const CSS_URL = `/css/site.css?v=${hash(css)}`, JS_URL = `/js/site.js?v=${hash(siteJs)}`;

// ---------- 3. Hjelpere ----------
const YEARS = Object.keys(A.PROGRAM).filter(k=>RELEASED || k!=="2027").sort((a,b)=>b-a);
const PPL_YEARS = Object.keys(A.PEOPLE).filter(k=>RELEASED || k!=="2027").sort((a,b)=>b-a);
const CUR_PPL = PPL_YEARS[0];
const U = (lang, p) => lang==="en" ? (p==="/" ? "/en/" : "/en" + p) : p;
const abs = p => BASE + p;
const progPath = y => (!y || y==="tba" || y==="null") ? "/program" : `/program/${y}`;
const esc = A.esc;
const attr = s => String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");
const clip = (s, n=158) => { s = s.replace(/\s+/g," ").trim(); if(s.length<=n) return s; const c = s.slice(0,n); return c.slice(0, c.lastIndexOf(" ")).replace(/[,.;:·–-]+$/,"") + "…"; };
const stripTags = s => s.replace(/<[^>]+>/g,"");
const isoDate = ddmmyy => { const [d,m,y] = ddmmyy.split("."); return `20${y}-${m}-${d}`; };
const evId = (y, day, e) => `ev-${y}-${day.date.replace(/\./g,"")}-${e.t.replace(":","")}`;
const concertSlug = e => A.slug(e.h.no);
const hasConcertPages = y => RELEASED && String(y)==="2027";

// ---------- Bilder: alt-tekst og responsive varianter ----------
const IMG_DIR = flags.find(f=>f.startsWith("--img="))?.slice(6);
const MANIFEST = IMG_DIR && fs.existsSync(path.join(IMG_DIR, "r/manifest.json")) ? JSON.parse(fs.readFileSync(path.join(IMG_DIR, "r/manifest.json"), "utf8")) : {};
const ALT = {};   // bildenavn -> {no, en}; første kilde vinner
const setAlt = (im, no, en) => { if(im && !ALT[im]) ALT[im] = {no, en}; };
for(const y of YEARS){ const P = A.PROGRAM[y]; if(!P.days) continue;
  for(const d of P.days) for(const e of d.events){
    const tre = /Trekanten/.test(e.h.no);
    setAlt(e.img, `${e.h.no} – Interpuls ${y}, ${tre?"Trekanten":"Kulturkirken Jakob"}`, `${e.h.en} – Interpuls ${y}, ${tre?"Trekanten":"Kulturkirken Jakob"}, Oslo`);
  } }
for(const v of [...A.VIDEOS, ...A.RADIO]) setAlt(v.img, `${v.h.no.replace(/ \(utdrag\)$/,"")} – ${v.p.no.split(" · ")[0]}`, `${v.h.en.replace(/ \(excerpt\)$/,"")} – ${v.p.en.split(" · ")[0]}`);
for(const a of A.ALBUMS){
  const [yr, sub] = a.h.no.replace("Interpuls ","").split(" · ");
  for(const im of a.imgs) setAlt(im, sub ? `${sub}, Interpuls ${yr} i Kulturkirken Jakob` : `Fra Interpuls ${yr} i Kulturkirken Jakob`, sub ? `${sub}, Interpuls ${yr} at Kulturkirken Jakob` : `Interpuls ${yr} at Kulturkirken Jakob, Oslo`);
}
const OVR = JSON.parse(fs.readFileSync(path.join(TOOLS, "alt-overrides.json"), "utf8"));
const altFor = (im, lang) => OVR[im] ? OVR[im][lang==="no"?0:1] : ALT[im] ? ALT[im][lang] : (lang==="no" ? "Interpuls i Kulturkirken Jakob" : "Interpuls at Kulturkirken Jakob, Oslo");
function sizesFor(before){
  if(/class="bg">(<img[^>]*>)*$/.test(before)) return "100vw";
  if(/force-dark"?>$/.test(before)) return "100vw";
  if(/class="img">$/.test(before)) return "(max-width:760px) 100vw, 200px";
  if(/class="th">$/.test(before)) return "(max-width:860px) 100vw, 380px";
  if(/class="(ph|fi)">$/.test(before)) return "(max-width:560px) 100vw, (max-width:900px) 50vw, 380px";
  if(/class="cimg">$/.test(before)) return "(max-width:860px) 100vw, 640px";
  if(/photo-stack">(<img[^>]*>)*$/.test(before)) return "(max-width:860px) 100vw, 560px";
  if(/dir-in">$/.test(before)) return "160px";
  return "(max-width:760px) 100vw, 600px";
}
function images(html, lang){
  // alt-tekst: formatbildene får formatets navn, ellers fra kart; dekorative bakgrunner og videominiatyrer forblir tomme
  html = html.replace(/<div class="fi"><img src="\/img\/([\w.-]+)\.jpg" alt=""([^>]*)><\/div><h3>([^<]*)<\/h3>/g,
    (m, im, rest, h) => `<div class="fi"><img src="/img/${im}.jpg" alt="${attr(OVR[im] ? OVR[im][lang==="no"?0:1] : `${h} ${lang==="no"?"på":"at"} Interpuls`)}"${rest}></div><h3>${h}</h3>`);
  if(lang==="en") html = html.replace('alt="Publikum og Philipp Geists visuals i Kulturkirken Jakob"', 'alt="The audience and Philipp Geist\'s visuals at Kulturkirken Jakob"');
  let first = true;
  return html.replace(/<img ([^>]*?)src="\/img\/([\w.-]+)\.jpg"([^>]*)>/g, (m, pre, im, post, off, all) => {
    const before = all.slice(Math.max(0, off-300), off);
    let attrs = pre + post;
    if(/alt=""/.test(attrs) && !/class="th">$|force-dark"?>$/.test(before)) attrs = attrs.replace('alt=""', `alt="${attr(altFor(im, lang))}"`);
    const M = MANIFEST[im];
    if(!M) return m.replace(pre+`src="/img/${im}.jpg"`+post, attrs.trim()+` src="/img/${im}.jpg"`);
    const hero = first && /class="bg">$/.test(before); first = false;
    if(hero) attrs += ' fetchpriority="high"'; else if(!/loading=/.test(attrs)) attrs += ' loading="lazy"';
    const sz = sizesFor(before);
    const set = fmt => M.ws.map(w=>`/img/r/${im}-${w}.${fmt} ${w}w`).join(", ");
    return `<picture><source type="image/avif" srcset="${set("avif")}" sizes="${sz}"><source type="image/webp" srcset="${set("webp")}" sizes="${sz}"><img ${attrs.trim().replace(/\s+/g," ")} src="/img/${im}.jpg" width="${M.w}" height="${M.h}" decoding="async"></picture>`;
  });
}

// Gjør prototypens #hash-lenker om til ekte adresser
function rewrite(html, lang){
  html = html.replace(/<button data-year="([^"]+)" data-key="(progYear|pplYear)" aria-pressed="(true|false)">([^<]*)<\/button>/g,
    (m, y, key, pr, txt) => `<a href="${U(lang, key==="progYear" ? progPath(y) : `/medvirkende/${y}`)}"${pr==="true"?' aria-current="page"':""}>${txt}</a>`);
  html = html.replace(/<a\b([^>]*)>/g, (m, attrs) => {
    const get = n => (attrs.match(new RegExp(`\\s${n}="([^"]*)"`))||[])[1];
    const href = get("href");
    if(!href || !href.startsWith("#")) return m;
    const route = get("data-route") || href.slice(1);
    let p;
    if(get("data-person")) p = `/medvirkende/${get("data-pyear")}#p-${get("data-pyear")}-${get("data-person")}`;
    else if(get("data-goto")) p = `/om#${get("data-goto")}`;
    else if(route==="program") p = progPath(get("data-year"));
    else if(route==="medvirkende") p = `/medvirkende/${CUR_PPL}`;
    else if(route==="hjem") p = "/";
    else p = "/" + route;
    attrs = attrs.replace(/\s(href|data-year|data-key|data-route|data-person|data-pyear|data-goto)="[^"]*"/g, "");
    return `<a href="${U(lang,p)}"${attrs}>`;
  });
  // fotokreditering til lysbildet
  html = html.replace(/data-lb="([^"]+)"/g, (m, im) => `${m} data-cap="${attr(A.credit(im))}"`);
  // mobilversjon av video
  for(const v of A.VIDEOS) if(v.murl) html = html.split(`href="${v.url}"`).join(`href="${v.url}" data-murl="${v.murl}"`);
  return html;
}

// ---------- 4. Sideskall ----------
const NAV = ["program","medvirkende","bilder","presse","om","partnere","kontakt"];
const navHref = (lang, k) => U(lang, k==="program" ? "/program" : k==="medvirkende" ? `/medvirkende/${CUR_PPL}` : "/"+k);

function header(lang, cur, alt){
  const T = A.T[lang];
  const nav = T.nav.map(([k,v]) => `<a href="${navHref(lang,k)}"${k===cur?' aria-current="page"':""}>${v}</a>`).join("");
  const top = RELEASED ? `<a class="btn" id="topBtn" href="https://www.ticketmaster.no/" target="_blank" rel="noopener">${T.tickets}</a>`
                       : `<a class="btn" id="topBtn" href="http://eepurl.com/hXy6Rn" target="_blank" rel="noopener">${T.newsletter}</a>`;
  const langLink = (l, label) => `<a href="${l===lang ? U(lang, alt.self) : U(l, alt.self)}" hreflang="${l==="no"?"nb":"en"}" lang="${l==="no"?"nb":"en"}" data-lang="${l}"${l===lang?' class="on" aria-current="true"':""}>${label}</a>`;
  return `<header class="top">
  <div class="wrap">
    <a class="brand" href="${U(lang,"/")}" aria-label="Interpuls"><img class="logo-d" src="/img/logo_small_white.png" alt="Interpuls" width="117" height="20"><img class="logo-l" src="/img/logo_small.png" alt="Interpuls" width="117" height="20"></a>
    <button class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="mainNav">${T.menu}</button>
    <nav class="main" id="mainNav" aria-label="${lang==="no"?"Hovedmeny":"Main menu"}">${nav}</nav>
    <button class="theme-btn" id="themeBtn" aria-label="${lang==="no"?"Bytt mellom mørk og lys visning":"Switch between dark and light mode"}" title="${lang==="no"?"Lys / mørk visning":"Light / dark mode"}">◐</button>
    <div class="lang" role="group" aria-label="Språk / Language">${langLink("no","NO")}${langLink("en","EN")}</div>
    ${top}
  </div>
</header>`;
}
function footer(lang){
  const T = A.T[lang];
  return `<footer>
  <div class="wrap" id="foot">
    <div><img class="logo-d" src="/img/logo_full_white.png" alt="Interpuls" loading="lazy"><img class="logo-l" src="/img/logo_full.png" alt="Interpuls" loading="lazy"><p style="margin-top:14px;max-width:34ch">${lang==="no"?"Festival for minimalistisk musikk i Kulturkirken Jakob, Oslo.":"Festival of minimalist music at Kulturkirken Jakob, Oslo."}</p></div>
    <div><b>${T.contactH}</b>hei@interpuls.no<br>+47 986 70 803<br>Hausmanns gate 14, Oslo</div>
    <div><b>${T.follow}</b><a href="https://www.instagram.com/interpuls_festival/" target="_blank" rel="noopener">Instagram</a><br><a href="https://www.facebook.com/interpulsfestival/" target="_blank" rel="noopener">Facebook</a><br><a href="http://eepurl.com/hXy6Rn" target="_blank" rel="noopener">${T.newsBtn} (${lang==="no"?"nyhetsbrev":"newsletter"})</a></div>
    <div class="fine"><span>Interpuls · ${T.org}</span><span>© Interpuls</span></div>
  </div>
</footer>`;
}
const LB = lang => `<div class="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="${lang==="no"?"Bilde":"Image"}">
  <button class="lb-x" data-lbx aria-label="${lang==="no"?"Lukk":"Close"}">×</button>
  <button class="lb-nav lb-prev" data-lbstep="-1" aria-label="${lang==="no"?"Forrige":"Previous"}">‹</button>
  <figure><img id="lbImg" alt=""><figcaption id="lbCap"></figcaption></figure>
  <button class="lb-nav lb-next" data-lbstep="1" aria-label="${lang==="no"?"Neste":"Next"}">›</button>
</div>`;

const HASH_REDIRECT = `<script>(function(){var h=location.hash.slice(1),m={hjem:"",program:"program",medvirkende:"medvirkende",bilder:"bilder",presse:"presse",om:"om",partnere:"partnere",kontakt:"kontakt"};window.goatcounter={};if(!h||!Object.prototype.hasOwnProperty.call(m,h))return;var en=/^\\/en\\//.test(location.pathname);try{if(localStorage.getItem("ip-lang")==="en")en=true}catch(e){}window.goatcounter.no_onload=true;location.replace((en?"/en/":"/")+m[h])})();</script>`;

const ORG = {"@type":"Organization","@id":BASE+"/#org","name":"Interpuls","url":BASE+"/","email":"hei@interpuls.no","logo":BASE+"/img/logo_full.png","sameAs":["https://www.instagram.com/interpuls_festival/","https://www.facebook.com/interpulsfestival/"]};
const JAKOB = {"@type":"Place","name":"Kulturkirken Jakob","address":{"@type":"PostalAddress","streetAddress":"Hausmanns gate 14","postalCode":"0182","addressLocality":"Oslo","addressCountry":"NO"}};
const TREKANTEN = {"@type":"Place","name":"Trekanten","address":{"@type":"PostalAddress","streetAddress":"Pilestredet","addressLocality":"Oslo","addressCountry":"NO"}};

function page({lang, key, self, title, desc, img="og.jpg", body, ld=[], extraHead=""}){
  const nb = abs(U("no", self)), en = abs(U("en", self)), canon = lang==="no" ? nb : en;
  const ldTag = ld.length ? `<script type="application/ld+json">${JSON.stringify(ld.length===1 ? {"@context":"https://schema.org", ...ld[0]} : {"@context":"https://schema.org","@graph":ld}).replace(/</g,"\\u003c")}</script>\n` : "";
  return `<!doctype html>
<html lang="${lang==="no"?"nb":"en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${canon}">
<link rel="alternate" hreflang="nb" href="${nb}">
<link rel="alternate" hreflang="en" href="${en}">
<link rel="alternate" hreflang="x-default" href="${nb}">
<meta name="theme-color" content="#181818">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/${fonts[0][0]}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/${fonts[1][0]}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${CSS_URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Interpuls">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${canon}">
<meta property="og:image" content="${BASE}/img/${img}">
<meta property="og:locale" content="${lang==="no"?"nb_NO":"en_GB"}">
<meta property="og:locale:alternate" content="${lang==="no"?"en_GB":"nb_NO"}">
<meta name="twitter:card" content="summary_large_image">
${ldTag}<script>try{var th=localStorage.getItem("ip-theme");if(th==="light"||th==="dark")document.documentElement.setAttribute("data-theme",th)}catch(e){}</script>
${extraHead || "<script>window.goatcounter={};</script>"}
<script data-goatcounter="https://interpuls.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
<script defer src="${JS_URL}"></script>
</head>
<body>
${header(lang, key, {self})}

<main id="app">
${body}
</main>
${LB(lang)}

${footer(lang)}
</body>
</html>
`;
}

// ---------- 5. Strukturerte data ----------
function performers(who, y){
  return who.split(" · ").map(n => {
    const p = (A.PEOPLE[y]||[]).find(q => q.n===n);
    const role = p ? p.r.no : "";
    const group = /ensemble|orkest|orchestra|sinfonietta|trio|kvartett|kvintett|solistene|kor\b|duo|beat|loop|pack|lightsout|stemmeklang|musikkhøgskole/i.test(n + " " + role);
    return {"@type": group ? "PerformingGroup" : "Person", "name": n};
  });
}
function musicEvent(y, day, e, lang, url){
  const date = isoDate(day.date);
  const ev = {
    "@type":"MusicEvent",
    "name": lang==="no" ? e.h.no : e.h.en,
    "startDate": `${date}T${e.t}:00+01:00`,
    "eventStatus":"https://schema.org/EventScheduled",
    "eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode",
    "location": /Trekanten/.test(e.h.no) ? TREKANTEN : JAKOB,
    "image": BASE + "/img/" + e.img + ".jpg",
    "description": lang==="no" ? e.desc.no : e.desc.en,
    "performer": performers(e.who, y),
    "organizer": {"@type":"Organization","name":"Interpuls","url":BASE+"/"},
    "superEvent": {"@type":"Festival","name":`Interpuls ${y}`},
    "url": url,
    "inLanguage": lang==="no" ? "nb" : "en"
  };
  if(String(y)===String(YEARS[0]) && RELEASED && String(y)==="2027"){
    if(e.sold) ev.offers = {"@type":"Offer","availability":"https://schema.org/SoldOut","url":e.url||"https://www.ticketmaster.no/"};
    else if(e.url) ev.offers = {"@type":"Offer","availability":"https://schema.org/InStock","url":e.url};
  }
  return ev;
}

// ---------- 6. Sider ----------
const pages = [];   // {file, self, lang}
const sitemap = [];
function emit(lang, self, html){
  const rel = U(lang, self).replace(/^\//,"");
  const file = path.join(OUT, rel, "index.html");
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, images(html, lang));
  pages.push({lang, self, file});
}
function render(fn, lang){ A.setLang(lang); return rewrite(fn(), lang); }

for(const lang of ["no","en"]){
  A.setLang(lang);
  const T = A.T[lang], NO = lang==="no";

  // Forside
  {
    const festLd = {"@type":"Festival","name":"Interpuls 2027","startDate":"2027-02-25","endDate":"2027-02-27","eventStatus":"https://schema.org/EventScheduled","eventAttendanceMode":"https://schema.org/OfflineEventAttendanceMode","location":JAKOB,"image":BASE+"/img/og.jpg","description":NO?"Festival for minimalistisk musikk i Kulturkirken Jakob, Oslo.":"Festival of minimalist music at Kulturkirken Jakob, Oslo.","organizer":{"@id":BASE+"/#org"},"url":abs(U(lang,"/"))};
    if(RELEASED) festLd.subEvent = A.PROGRAM[2027].days.flatMap(d=>d.events.map(e=>({"@type":"MusicEvent","name":NO?e.h.no:e.h.en,"startDate":`${isoDate(d.date)}T${e.t}:00+01:00`,"url":abs(U(lang,`/program/2027/${concertSlug(e)}`))})));
    const web = {"@type":"WebSite","name":"Interpuls","url":abs(U(lang,"/")),"inLanguage":NO?"nb":"en","publisher":{"@id":BASE+"/#org"}};
    emit(lang, "/", page({lang, key:"hjem", self:"/",
      title: NO ? "Interpuls – festival for minimalistisk musikk i Oslo" : "Interpuls – festival of minimalist music in Oslo",
      desc: NO ? "Interpuls er Norges festival for minimalistisk og ny musikk, i Kulturkirken Jakob i Oslo. Korte konsertpulser, visuals, popcorn og bar. 25.–27. februar 2027."
               : "Interpuls is Norway's festival of minimalist and new music, at Kulturkirken Jakob in Oslo. Short concert sets, visuals, popcorn and a bar. 25–27 February 2027.",
      body: render(A.home, lang), ld:[ORG, web, festLd], extraHead: HASH_REDIRECT}));
  }

  // Program-forside (før slipp)
  if(!RELEASED){
    A.state.progYear = "tba";
    emit(lang, "/program", page({lang, key:"program", self:"/program",
      title: NO ? "Program – Interpuls 2027" : "Programme – Interpuls 2027",
      desc: NO ? "Programmet for Interpuls 2027, 25.–27. februar i Kulturkirken Jakob, slippes i desember. Se programmene fra tidligere festivaler."
               : "The programme for Interpuls 2027, 25–27 February at Kulturkirken Jakob, is out in December. See the programmes from past festivals.",
      body: render(A.program, lang)}));
  }

  // Program per år
  for(const y of YEARS){
    A.state.progYear = +y;
    const P = A.PROGRAM[y];
    let body = render(A.program, lang), ld = [], img = "og.jpg", desc;
    if(P.days){
      const evs = P.days.flatMap(d=>d.events.map(e=>[d,e]));
      img = evs[0][1].img + ".jpg";
      desc = clip(NO ? `Program for Interpuls ${y} i Kulturkirken Jakob, Oslo: ${evs.map(([,e])=>e.h.no).join(", ")}.`
                     : `Programme for Interpuls ${y} at Kulturkirken Jakob, Oslo: ${evs.map(([,e])=>e.h.en).join(", ")}.`);
      ld = evs.map(([d,e]) => musicEvent(y, d, e, lang, hasConcertPages(y) ? abs(U(lang,`/program/${y}/${concertSlug(e)}`)) : abs(U(lang,`/program/${y}`)) + "#" + evId(y,d,e)));
      if(hasConcertPages(y)){
        for(const [d,e] of evs){
          const id = evId(y,d,e), href = U(lang, `/program/${y}/${concertSlug(e)}`);
          body = body.replace(new RegExp(`(<article class="event" id="${id}">[\\s\\S]*?)<h3>([^<]*)</h3>`), `$1<h3><a href="${href}">$2</a></h3>`);
          body = body.replace(new RegExp(`(<article class="event" id="${id}">[\\s\\S]*?<div class="acts">)`), `$1<a class="more" href="${href}">${NO?"Mer om konserten":"More about the concert"} →</a>`);
        }
      }
    } else {
      desc = clip(`Interpuls ${y}: ${P.highlights.map(h=>`${A.L(h[0])}. ${A.L(h[1])}`).join(" ")}`);
    }
    emit(lang, `/program/${y}`, page({lang, key:"program", self:`/program/${y}`,
      title: `${T.progH} ${y} – Interpuls`, desc, img, body, ld}));

    // Én side per konsert (bare for programmet som er sluppet)
    if(hasConcertPages(y)){
      const evs = P.days.flatMap(d=>d.events.map(e=>[d,e]));
      for(const [d,e] of evs){
        const s = concertSlug(e), self = `/program/${y}/${s}`;
        const full = [A.L(e.desc), e.more ? A.L(e.more) : ""].filter(Boolean);
        const acts = `${e.sold?`<span class="tag sold">${T.soldout}</span>`: e.url?`<a class="btn" href="${e.url}" target="_blank" rel="noopener">${T.buy}</a>`:`<span class="tag">${T.soon}</span>`}${e.tag==="premiere"?`<span class="tag">${NO?"Urfremføring":"World premiere"}</span>`:""}`;
        const others = evs.filter(([,o])=>o!==e).map(([od,o])=>`<a href="${U(lang,`/program/${y}/${concertSlug(o)}`)}"><span>${A.L(od.d)} ${od.date.slice(0,5)} · ${o.t}</span><b>${esc(A.L(o.h))}</b></a>`).join("");
        const cb = rewrite(`<div class="wrap page-hero"><span class="label"><b>//</b> Interpuls ${y} · ${A.L(d.d)} ${esc(d.date)} · ${e.t}</span><h1>${esc(A.L(e.h))}</h1></div>
  <section style="padding-top:24px"><div class="wrap">
    ${P.prelim?`<p class="notice">${T.prelim}</p>`:""}
    <div class="concert">
      <div class="cimg"><img src="/img/${e.img}.jpg" alt=""></div>
      <div>
        <div class="time">${A.L(d.d)} ${esc(d.date)} · ${e.t}${d.theme?` · ${A.L(d.theme)}`:""}</div>
        <div class="who">${A.whoLinks(e.who, y)}</div>
        ${full.map(p=>`<p class="desc">${esc(p)}</p>`).join("")}
        ${e.pulses?`<ul class="pulses">${e.pulses.map(p=>`<li><span class="t">${p[0]}</span><span class="p">${p[1]}</span><span>${esc(A.L(p[2]))}</span></li>`).join("")}</ul>`:""}
        <div class="acts">${acts}</div>
        <p style="margin-top:20px;color:var(--dim)">Kulturkirken Jakob, Hausmanns gate 14, Oslo</p>
      </div>
    </div>
    <a class="morelink" href="#program" data-year="${y}" data-key="progYear" data-route="program">← ${NO?`Hele programmet ${y}`:`Full programme ${y}`}</a>
    <h2 class="subhead" style="margin-bottom:0">${NO?"Flere konserter":"More concerts"}</h2>
    <div class="others">${others}</div>
  </div></section>${A.newsBand()}`, lang);
        emit(lang, self, page({lang, key:"program", self,
          title: `${A.L(e.h)} – Interpuls ${y}`,
          desc: clip(`${A.L(d.d)} ${d.date} ${NO?"kl.":"at"} ${e.t}, Kulturkirken Jakob. ${full.join(" ")}`),
          img: e.img + ".jpg", body: cb, ld:[musicEvent(y, d, e, lang, abs(U(lang, self)))]}));
      }
    }
  }

  // Medvirkende per år
  for(const y of PPL_YEARS){
    A.state.pplYear = +y;
    const names = A.PEOPLE[y].map(p=>p.n);
    emit(lang, `/medvirkende/${y}`, page({lang, key:"medvirkende", self:`/medvirkende/${y}`,
      title: `${T.pplH} ${y} – Interpuls`,
      desc: clip(NO ? `Medvirkende på Interpuls ${y}: ${names.join(", ")}.` : `Artists at Interpuls ${y}: ${names.join(", ")}.`),
      body: render(A.people, lang)}));
  }

  const simple = [
    ["bilder", A.media, NO?"Bilder, video og radio fra Interpuls":"Photos, video and radio from Interpuls", T.medP],
    ["presse", A.pressPage, NO?"Presse – Interpuls":"Press – Interpuls", T.pressP + " " + (NO?"Anmeldelser og omtaler i Klassiskmusikk.com, Ballade, Scenekunst, Samtiden, NRK og Radio Nova.":"Reviews and coverage in Klassiskmusikk.com, Ballade, Scenekunst, Samtiden, NRK and Radio Nova.")],
    ["om", A.about, NO?"Om Interpuls – festival og ensemble":"About Interpuls – festival and ensemble", stripTags(T.omP[0])],
    ["partnere", A.partners, NO?"Partnere – Interpuls":"Partners – Interpuls", T.conP],
    ["kontakt", A.contact, NO?"Kontakt – Interpuls":"Contact – Interpuls", T.kP],
  ];
  for(const [k, fn, title, desc] of simple){
    emit(lang, "/"+k, page({lang, key:k, self:"/"+k, title, desc: clip(desc), body: render(fn, lang)}));
  }
}

// 404
{
  A.setLang("no");
  const body = `<div class="wrap page-hero"><span class="label"><b>//</b> 404</span><h1>Fant ikke siden</h1><p>Siden finnes ikke lenger, eller adressen er feil. <span lang="en">Page not found.</span></p>
  <p style="margin-top:28px" class="cta-row"><a class="btn" href="/">Til forsiden</a><a class="btn ghost" href="/program">Program</a><a class="btn ghost" href="/en/" lang="en">English</a></p></div>`;
  let html = page({lang:"no", key:"", self:"/", title:"Fant ikke siden – Interpuls", desc:"Siden finnes ikke.", body});
  html = html.replace(/<link rel="canonical"[^>]*>\n|<link rel="alternate"[^>]*>\n/g, "").replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"');
  fs.writeFileSync(path.join(OUT, "404.html"), html);
}

// ---------- 7. Ressurser ----------
fs.mkdirSync(path.join(OUT, "css"), {recursive:true});
fs.mkdirSync(path.join(OUT, "js"), {recursive:true});
fs.mkdirSync(path.join(OUT, "fonts"), {recursive:true});
fs.writeFileSync(path.join(OUT, "css/site.css"), css.trim() + "\n");
fs.writeFileSync(path.join(OUT, "js/site.js"), siteJs);
for(const [n, buf] of fonts) fs.writeFileSync(path.join(OUT, "fonts", n), buf);

// sitemap
{
  const selves = [...new Set(pages.map(p=>p.self))];
  const prio = s => s==="/" ? "1.0" : s.startsWith("/program") ? "0.8" : "0.6";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${selves.flatMap(s => ["no","en"].map(l => `<url><loc>${abs(U(l,s))}</loc><lastmod>${NOW}</lastmod><priority>${prio(s)}</priority><xhtml:link rel="alternate" hreflang="nb" href="${abs(U("no",s))}"/><xhtml:link rel="alternate" hreflang="en" href="${abs(U("en",s))}"/><xhtml:link rel="alternate" hreflang="x-default" href="${abs(U("no",s))}"/></url>`)).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), xml);
}

// netlify.toml
{
  const r = (from, to, status=301) => `[[redirects]]\n  from = "${from}"\n  to = "${to}"\n  status = ${parseInt(status)}\n${String(status).endsWith("!")?"  force = true\n":""}`;
  const cur = `/medvirkende/${CUR_PPL}`;
  let t = `# GENERERT – rediger kilden og bygg på nytt i stedet for å endre denne fila.
[build]
  publish = "."

# Gjeldende år (endres ved programslipp)
${r("/medvirkende", cur, 302)}${r("/en/medvirkende", "/en"+cur, 302)}${RELEASED ? r("/program", "/program/2027", 302) + r("/en/program", "/en/program/2027", 302) : ""}
# Gamle adresser fra forrige nettside (gjelder bare stier som ikke finnes som filer)
${r("/program/*", "/program")}${r("/medvirkende/*", "/medvirkende")}${r("/en/program/*", "/en/program")}${r("/en/medvirkende/*", "/en/medvirkende")}${r("/aktuelt/*", "/bilder")}${r("/aktuelt", "/bilder")}${r("/index.html", "/")}${r("/tools/*", "/404.html", "404!")}${r("/README.md", "/404.html", "404!")}
[[headers]]
  for = "/img/*"
  [headers.values]
    Cache-Control = "public, max-age=604800"
[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
`;
  fs.writeFileSync(path.join(OUT, "netlify.toml"), t);
}

// ---------- 8. Kontroller ----------
const outFiles = [];
(function walk(d){ for(const f of fs.readdirSync(d)){ const p = path.join(d,f); if(fs.statSync(p).isDirectory()) walk(p); else if(/\.(html|xml|toml|js|css)$/.test(f)) outFiles.push(p); } })(OUT);
const allOut = outFiles.map(f => [f, fs.readFileSync(f,"utf8")]);

// bilder som mangler
const imgDir = IMG_DIR;
if(imgDir){
  const missing = new Set();
  for(const [, s] of allOut) for(const m of s.matchAll(/\/img\/([\w.-]+\.(?:jpg|png))/g)) if(!fs.existsSync(path.join(imgDir, m[1]))) missing.add(m[1]);
  if(missing.size) console.warn("MANGLER BILDER:", [...missing].join(", "));
}

// interne lenker som ikke finnes
{
  const exists = p => { p = p.split("#")[0].split("?")[0]; if(p==="/"||p==="") return true;
    return fs.existsSync(path.join(OUT, p, "index.html")) || fs.existsSync(path.join(OUT, p)) || (imgDir && p.startsWith("/img/") && fs.existsSync(path.join(imgDir, p.slice(5)))) || ["/favicon.png","/apple-touch-icon.png"].includes(p) || /^\/(en\/)?(medvirkende|program)$/.test(p); };
  const bad = new Set();
  for(const [f, s] of allOut) if(f.endsWith(".html")) for(const m of s.matchAll(/href="(\/[^"]*)"/g)) if(!exists(m[1])) bad.add(m[1] + "  (" + path.relative(OUT,f) + ")");
  if(bad.size) console.warn("BRUTTE LENKER:\n  " + [...bad].join("\n  "));
  for(const [f, s] of allOut) if(f.endsWith(".html") && /href="#(hjem|program|medvirkende|bilder|presse|om|partnere|kontakt)"/.test(s)) console.warn("HASH-LENKE IGJEN:", f);
}

// lekkasjesjekk: ingen upubliserte 2027-data i bygget før slipp
if(!RELEASED){
  const pub = PUBLIC ? fs.readFileSync(PUBLIC, "utf8") : "";
  const secret = new Set();
  const collect = v => { if(typeof v==="string"){ secret.add(v); v.split(/ · | & |, | og | and /).forEach(x=>secret.add(x)); } else if(v && typeof v==="object") Object.values(v).forEach(collect); };
  collect(A.PROGRAM[2027]); collect(A.PEOPLE[2027]); collect(A.TIMELINE.filter(r=>r[0]==="2027"));
  collect(A.PARTNERS.filter(p=>!p.tba)); collect(A.T.no.days); collect(A.T.en.days);
  const comp = src.match(/<p class="composers">[^\n]*?<\/b>([^<]+)<\/p>/); if(comp) collect(comp[1]);
  const ok = JSON.stringify(OVR);
  const check = [...secret].map(s=>s.trim()).filter(s => s.length >= 6 && !/^\d/.test(s) && !pub.includes(s) && !pub.includes(esc(s)) && !ok.includes(s));
  const leaks = [];
  for(const [f, s] of allOut) for(const x of check) if(s.includes(x) || s.includes(esc(x))) leaks.push(`${path.relative(OUT,f)}: «${x.slice(0,60)}»`);
  if(leaks.length){ console.error("LEKKASJE AV 2027-DATA:\n  " + leaks.slice(0,40).join("\n  ")); process.exit(2); }
  console.log(`Lekkasjesjekk OK (${check.length} hemmelige strenger kontrollert mot ${allOut.length} filer)`);
}
console.log(`Bygget ${pages.length} sider (${RELEASED?"MED":"uten"} 2027-program) til ${OUT}`);
