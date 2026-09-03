document.getElementById('yr').textContent = new Date().getFullYear();

/* ---------- theme ---------- */
(function(){
  var root = document.documentElement,
      btn = document.getElementById('themebtn'),
      mq = matchMedia('(prefers-color-scheme: dark)');

  function current(){
    var set = root.getAttribute('data-theme');
    return set ? set : (mq.matches ? 'dark' : 'light');
  }
  function label(){
    btn.setAttribute('aria-label',
      current() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
  label();

  btn.addEventListener('click', function(){
    var next = current() === 'dark' ? 'light' : 'dark';
    /* damp the cross-fade so the swap reads as one movement, not a flash */
    root.classList.add('theming');
    root.setAttribute('data-theme', next);
    try{ localStorage.setItem('theme', next); }catch(e){}
    label();
    setTimeout(function(){ root.classList.remove('theming'); }, 420);
  });

  /* follow the system if the visitor never chose */
  mq.addEventListener('change', function(){
    var stored = null;
    try{ stored = localStorage.getItem('theme'); }catch(e){}
    if(!stored) label();
  });
})();

/* ---------- menu ---------- */
(function(){
  var btn = document.getElementById('menubtn'),
      menu = document.getElementById('menu'),
      scrim = document.getElementById('scrim');

  function setOpen(open){
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
  }
  btn.addEventListener('click', function(){
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });
  scrim.addEventListener('click', function(){ setOpen(false); });
  menu.addEventListener('click', function(e){ if(e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true'){ setOpen(false); btn.focus(); }
  });

  /* keep focus inside the panel while it is open */
  menu.addEventListener('keydown', function(e){
    if(e.key !== 'Tab') return;
    var f = menu.querySelectorAll('a');
    if(!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); btn.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); btn.focus(); }
  });

  /* mark the section you are currently in */
  var links = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
  var targets = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });
  var ticking = false;
  function spy(){
    ticking = false;
    var line = scrollY + innerHeight * 0.32, cur = -1;
    targets.forEach(function(t, i){ if(t && t.offsetTop <= line) cur = i; });
    links.forEach(function(a, i){ a.classList.toggle('here', i === cur); });
  }
  addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(spy); }
  }, {passive:true});
  spy();
})();

/* ---------- map: read out the place under the cursor ---------- */
(function(){
  var out = document.getElementById('mapread');
  if(!out) return;
  var idle = out.textContent;
  document.querySelectorAll('.map .node').forEach(function(n){
    n.addEventListener('mouseenter', function(){ out.textContent = n.dataset.blurb; });
    n.addEventListener('mouseleave', function(){ out.textContent = idle; });
    n.addEventListener('click', function(){ out.textContent = n.dataset.blurb; });
  });
})();