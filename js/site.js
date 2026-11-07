/* Interpuls – felles klientskript for de statiske sidene (ingen innholdsdata her) */
(function(){
  var d = document, root = d.documentElement, en = root.lang === "en";

  // --- GoatCounter-hendelser (sidevisninger telles automatisk med sti per side)
  function gcSend(obj, tries){
    tries = tries || 0;
    if(window.goatcounter && window.goatcounter.count){ try{ window.goatcounter.count(obj); }catch(e){} }
    else if(tries < 30) setTimeout(function(){ gcSend(obj, tries+1); }, 300);
  }
  function gcEvent(name, title){ gcSend({path: name, title: title || name, event: true}); }

  // --- egen mobilversjon av video (f.eks. YouTube Shorts)
  try{
    if(matchMedia("(max-width:760px)").matches){
      d.querySelectorAll("a[data-murl]").forEach(function(a){ a.href = a.getAttribute("data-murl"); });
    }
  }catch(e){}

  // --- lysbilde (lightbox)
  var lb = d.getElementById("lb"), LB = {list:[], i:0};
  function lbShow(){
    var it = LB.list[LB.i];
    d.getElementById("lbImg").src = "/img/" + it.im + ".jpg";
    d.getElementById("lbCap").textContent = (en ? "Photo: " : "Foto: ") + it.cap + "  ·  " + (LB.i+1) + " / " + LB.list.length;
  }
  function lbOpen(list, i){ LB = {list:list, i:Math.max(0,i)}; lbShow(); lb.hidden = false; d.body.style.overflow = "hidden"; lb.querySelector(".lb-x").focus(); }
  function lbClose(){ lb.hidden = true; d.body.style.overflow = ""; }
  function lbGo(n){ LB.i = (LB.i + n + LB.list.length) % LB.list.length; lbShow(); }
  if(lb){
    d.addEventListener("keydown", function(e){ if(lb.hidden) return; if(e.key==="Escape") lbClose(); if(e.key==="ArrowRight") lbGo(1); if(e.key==="ArrowLeft") lbGo(-1); });
    var tx = null;
    lb.addEventListener("touchstart", function(e){ tx = e.touches[0].clientX; }, {passive:true});
    lb.addEventListener("touchend", function(e){ if(tx===null) return; var dx = e.changedTouches[0].clientX - tx; if(Math.abs(dx) > 50) lbGo(dx<0?1:-1); tx = null; });
  }

  // --- markér medvirkende man lenkes til
  function flash(){
    var id = location.hash.slice(1); if(!id) return;
    var el = d.getElementById(id);
    if(el && el.classList.contains("person")){ el.classList.add("flash"); setTimeout(function(){ el.classList.remove("flash"); }, 1800); }
  }
  flash(); window.addEventListener("hashchange", flash);

  d.addEventListener("click", function(e){
    var out = e.target.closest("a[href^='http']");
    if(out){
      var h = out.href, n;
      if(/ticketmaster/.test(h)) n = "klikk-billetter";
      else if(/eepurl|mailchimp/.test(h)) n = "klikk-nyhetsbrev";
      else if(/youtu/.test(h)) n = "klikk-video: " + ((out.querySelector("h3")||{}).textContent || h);
      else if(/radio\.nrk/.test(h)) n = "klikk-radio: " + ((out.querySelector("h3")||{}).textContent || h);
      else { try{ n = "utlenke: " + new URL(h).hostname.replace(/^www\./,""); }catch(_){ n = "utlenke"; } }
      gcEvent(n, h);
    }
    var lg = e.target.closest("a[data-lang]");
    if(lg){ try{ localStorage.setItem("ip-lang", lg.getAttribute("data-lang")); }catch(_){} return; }
    if(e.target.closest("#themeBtn")){
      var th = root.getAttribute("data-theme")==="light" ? "dark" : "light";
      root.setAttribute("data-theme", th);
      try{ localStorage.setItem("ip-theme", th); }catch(_){}
      return;
    }
    var mb = e.target.closest("#menuBtn");
    if(mb){ var o = d.getElementById("mainNav").classList.toggle("open"); mb.setAttribute("aria-expanded", o); return; }
    var rm = e.target.closest("[data-rm]");
    if(rm){
      var r = rm.previousElementSibling.querySelector(".rest"), open = r.hidden;
      r.hidden = !open; rm.setAttribute("aria-expanded", open);
      rm.textContent = open ? (en ? "Show less" : "Vis mindre") : (en ? "Read more" : "Les mer");
      return;
    }
    var sc = e.target.closest("[data-scroll]");
    if(sc){ var c = d.getElementById("carousel"); if(c) c.scrollBy({left: +sc.getAttribute("data-scroll") * c.clientWidth * 0.8, behavior:"smooth"}); return; }
    var lo = e.target.closest("[data-lb]");
    if(lo){
      var all = [].slice.call((lo.closest(".album")||d).querySelectorAll("[data-lb]")).map(function(b){ return {im:b.getAttribute("data-lb"), cap:b.getAttribute("data-cap")||"Interpuls"}; });
      lbOpen(all, all.map(function(x){ return x.im; }).indexOf(lo.getAttribute("data-lb")));
      return;
    }
    if(e.target.closest("[data-lbx]") || e.target.id==="lb"){ lbClose(); return; }
    var st = e.target.closest("[data-lbstep]");
    if(st){ lbGo(+st.getAttribute("data-lbstep")); return; }
  });

  // --- kontaktskjema (Netlify Forms via AJAX)
  d.addEventListener("submit", function(e){
    if(e.target.id !== "cform") return;
    e.preventDefault();
    var f = e.target, done = function(){ f.hidden = true; d.getElementById("cdone").hidden = false; };
    fetch("/", {method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body:new URLSearchParams(new FormData(f)).toString()})
      .then(function(r){ if(!r.ok) throw 0; done(); gcEvent("kontaktskjema-sendt"); })
      .catch(function(){ alert(en ? "Something went wrong. Please email us at hei@interpuls.no." : "Noe gikk galt. Send oss gjerne en e-post på hei@interpuls.no."); });
  });
})();
