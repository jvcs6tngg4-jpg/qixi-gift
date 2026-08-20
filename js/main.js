/* ============================================================
   七夕 · 给可芯的礼物 —— 主逻辑 v2
   ============================================================ */
(function(){
"use strict";

var ASSETS_BASE = (window.ASSETS_BASE || "assets/");
var PAGES_BASE  = "https://jvcs6tngg4-jpg.github.io/qixi-gift/assets/";
var LOCAL_BASE  = "assets/";

function asset(p){ return ASSETS_BASE + p; }

/* ---------- 离线预加载资源清单 ---------- */
var OFFLINE_CACHE = "qixi-gift-v3";
var OFFLINE_LOCAL = ["css/style.css", "js/main.js", "patterns/baoxianghua.svg", "patterns/chanzhilian.svg"];
var OFFLINE_REMOTE = [
  "photos/bear.jpg", "photos/bear_box.jpg",
  "photos/perfume_1.jpg", "photos/perfume_2.jpg", "photos/perfume_3.jpg",
  "photos/pajama.jpg", "photos/dress.jpg",
  "music/qixi_letter.m4a", "music/bear.m4a", "music/perfume.m4a",
  "music/pajama.m4a", "music/dress.m4a"
];
/* 各资源近似字节数（用于进度估算，避免读 blob 占内存） */
var OFFLINE_BYTES = {
  "css/style.css": 29000, "js/main.js": 16000, "patterns/baoxianghua.svg": 2040, "patterns/chanzhilian.svg": 1773,
  "photos/bear.jpg": 172530, "photos/bear_box.jpg": 194221,
  "photos/perfume_1.jpg": 309277, "photos/perfume_2.jpg": 144991,
  "photos/perfume_3.jpg": 134879, "photos/pajama.jpg": 125881,
  "photos/dress.jpg": 88992,
  "music/qixi_letter.m4a": 3905836, "music/bear.m4a": 3491143,
  "music/perfume.m4a": 3206732, "music/pajama.m4a": 1915820,
  "music/dress.m4a": 4032104
};
var OFFLINE_TOTAL_BYTES = Object.keys(OFFLINE_BYTES).reduce(function(a,k){ return a + OFFLINE_BYTES[k]; }, 0);
/* 下载提示文案 */
var DL_TIPS = {
  "photos/bear.jpg": "正在把小熊装进盒子…",
  "photos/bear_box.jpg": "正在系上小熊的礼带…",
  "photos/perfume_1.jpg": "正在给香水盖上瓶盖…",
  "photos/perfume_2.jpg": "正在读香水的香调…",
  "photos/perfume_3.jpg": "正在把月光收进瓶里…",
  "photos/pajama.jpg": "正在叠好噜噜睡衣…",
  "photos/dress.jpg": "正在把裙子轻轻挂好…",
  "music/qixi_letter.m4a": "正在藏好开场的情歌…",
  "music/bear.m4a": "正在藏好小熊的歌…",
  "music/perfume.m4a": "正在藏好香水的歌…",
  "music/pajama.m4a": "正在藏好噜噜的歌…",
  "music/dress.m4a": "正在藏好裙子的歌…"
};

/* ---------- 音乐表 ---------- */
var TRACKS = {
  letter:  { id:"audLetter",  file:"music/qixi_letter.m4a" },
  bear:    { id:"audBear",    file:"music/bear.m4a" },
  perfume: { id:"audPerfume", file:"music/perfume.m4a" },
  pajama:  { id:"audPajama",  file:"music/pajama.m4a" },
  dress:   { id:"audDress",   file:"music/dress.m4a" }
};
var letterPos = 0;   // 情书歌续播位置

var STAGES = ["open","letter","guide","g1","g2","g3","g4","final"];
var current = "open";
var historyStack = [];
var $  = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };

/* ---------- 幕切换 ---------- */
function showStage(name){
  var cur = $("#stage-" + current);
  var next = $("#stage-" + name);
  if(!next || current === name) return;
  // 离开情书页时，记下音乐断点
  if(current === "letter"){
    var al = document.getElementById("audLetter");
    if(al && !al.paused) letterPos = al.currentTime;
  }
  cur.classList.remove("active");
  cur.classList.add("hide");
  next.classList.remove("hide");
  void next.offsetWidth;
  next.classList.add("active");
  current = name;
  window.scrollTo({top:0, behavior:"instant"});
}
function goTo(name){ historyStack.push(current); showStage(name); onEnter(name); }
function goBack(){
  if(!historyStack.length) return;
  var prev = historyStack.pop();
  showStage(prev); onEnter(prev);
}

/* ---------- 音乐控制 ---------- */
function setupTrack(key){
  var t = TRACKS[key];
  var a = document.getElementById(t.id);
  if(!a || a.dataset.src === asset(t.file)) return;
  a.src = asset(t.file);
  a.dataset.src = asset(t.file);
  a.load();
}
function playTrack(key, seekTo){
  var t = TRACKS[key];
  var a = document.getElementById(t.id);
  if(!a) return;
  setupTrack(key);
  if(typeof seekTo === "number" && isFinite(seekTo) && seekTo >= 0){
    try{ a.currentTime = seekTo; }catch(e){}
  }
  var r = a.play();
  if(r && r.catch) r.catch(function(){ setTimeout(function(){ var r2 = a.play(); if(r2 && r2.catch) r2.catch(function(){}); }, 300); });
}
function stopMusic(exclude){
  Object.keys(TRACKS).forEach(function(k){
    if(k === exclude) return;
    var a = document.getElementById(TRACKS[k].id);
    if(a) a.pause();
  });
}
function fadeOutMusic(ms, cb){
  var els = Object.keys(TRACKS).map(function(k){ return document.getElementById(TRACKS[k].id); })
             .filter(function(a){ return a && !a.paused; });
  if(!els.length){ if(cb) cb(); return; }
  var done = 0;
  els.forEach(function(a){
    var v = a.volume; var step = v / 8;
    var iv = setInterval(function(){
      v -= step;
      if(v <= 0.03){ clearInterval(iv); a.pause(); a.volume = 1; done++; if(cb && done===els.length) cb(); }
      else a.volume = v;
    }, 34);
  });
}

/* ---------- 每幕进入 ---------- */
function onEnter(name){
  $("#btnBack").hidden = (name === "open" || name === "letter");

  switch(name){
    case "open":
      stopMusic(); break;
    case "letter":
      playTrack("letter");        // 音乐直接响起
      setupTrack("bear");
      setupTrack("perfume");
      break;
    case "guide":
      // 过渡页继续放《关于爱的定义》，直到点进第一件礼物才停
      playTrack("letter");
      preloadImg("photos/bear.jpg");
      preloadImg("photos/bear_box.jpg");
      break;
    case "g1": case "g2": case "g3": case "g4": {
      var map = {g1:"bear",g2:"perfume",g3:"pajama",g4:"dress"};
      var preloads = {
        g1:["photos/perfume_1.jpg","photos/perfume_2.jpg","photos/perfume_3.jpg"],
        g2:["photos/pajama.jpg"],
        g3:["photos/dress.jpg"],
        g4:[]
      }[name] || [];
      preloads.forEach(function(pp){ preloadImg(pp); });
      var content = $("#" + name + "Content");
      if(content && !content.hidden){
        playTrack(map[name]);
      } else {
        stopMusic();
      }
      break;
    }
    case "final":
      // 续播情书断掉的地方
      playTrack("letter", letterPos);
      spawnPetals(26, "gold");
      break;
  }
}


/* ---------- 图片模糊渐显 ---------- */
function initImgFade(){
  $$("img.gift-img, .thumb").forEach(function(img){
    if(img.complete && img.naturalWidth > 0){
      img.classList.add("loaded");
    } else {
      img.addEventListener("load", function(){ img.classList.add("loaded"); });
      img.addEventListener("error", function(){ img.classList.add("loaded"); });
    }
  });
}

/* ---------- 图片 CDN 回退 ---------- */
function bindImgFallback(img, path){
  if(!img) return;
  var tried = 0;
  img.addEventListener("error", function(){
    tried++;
    if(tried === 1 && PAGES_BASE !== ASSETS_BASE) img.src = PAGES_BASE + path;
    else if(tried === 2) img.src = LOCAL_BASE + path;
  });
}


/* ---------- 按幕预加载礼物图片 ---------- */
function preloadImg(path){
  var im = new Image();
  im.src = asset(path);
}

/* ---------- 星空（星星 + 流星） ---------- */
function initStars(){
  var cv = $("#stars");
  if(!cv) return;
  var ctx = cv.getContext("2d");
  var W, H, stars = [], meteors = [];
  function resize(){
    W = cv.width = cv.offsetWidth || window.innerWidth;
    H = cv.height = cv.offsetHeight || window.innerHeight;
  }
  function makeStars(){
    stars = [];
    var n = window.innerWidth < 480 ? 70 : 110;
    for(var i=0;i<n;i++){
      stars.push({
        x:Math.random()*W, y:Math.random()*H*0.85,
        r:Math.random()*1.5+.3,
        a:Math.random()*.65+.25,
        tw:Math.random()*.03+.006,
        ph:Math.random()*Math.PI*2,
        big:Math.random()>.88
      });
    }
  }
  function spawnMeteor(){
    if(meteors.length > 2) return;
    meteors.push({
      x:Math.random()*W*0.7 + W*0.2, y:Math.random()*H*0.25,
      vx:-4.5-Math.random()*4, vy:2+Math.random()*1.8,
      life:1
    });
  }
  var t = 0;
  function draw(){
    t += .016;
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){
      var s = stars[i];
      var alpha = s.a * (0.5 + 0.5*Math.sin(t*s.tw*9 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = "rgba(238,230,205," + alpha.toFixed(3) + ")";
      ctx.fill();
      if(s.big && alpha > .55){
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r*3, 0, Math.PI*2);
        ctx.fillStyle = "rgba(238,230,205," + (alpha*.09).toFixed(3) + ")";
        ctx.fill();
      }
    }
    // 流星
    if(Math.random() < .006) spawnMeteor();
    for(var m=meteors.length-1; m>=0; m--){
      var mt = meteors[m];
      mt.x += mt.vx; mt.y += mt.vy; mt.life -= .02;
      ctx.strokeStyle = "rgba(240,232,210," + Math.max(0,mt.life*.8).toFixed(3) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(mt.x, mt.y);
      ctx.lineTo(mt.x - mt.vx*6, mt.y - mt.vy*6);
      ctx.stroke();
      if(mt.life <= 0) meteors.splice(m,1);
    }
    requestAnimationFrame(draw);
  }
  resize();
  makeStars();
  window.addEventListener("resize", function(){ resize(); makeStars(); });
  draw();
}

/* ---------- 花瓣 ---------- */
function spawnPetals(n, kind){
  var wrap = $("#petals");
  if(!wrap) return;
  n = n || 14;
  var cls = kind === "gold" ? "petal gold" : (kind === "pink" ? "petal pink" : "petal");
  for(var i=0;i<n;i++){
    var p = document.createElement("span");
    p.className = cls + (Math.random()>.5 ? "" : (Math.random()>.5 ? " pink" : " gold"));
    var size = 9 + Math.random()*13;
    p.style.width = size + "px";
    p.style.height = size*1.18 + "px";
    p.style.left = Math.random()*100 + "vw";
    p.style.setProperty("--sway", (Math.random()*140 - 70) + "px");
    var dur = 7 + Math.random()*8;
    p.style.animationDuration = dur + "s";
    p.style.animationDelay = (Math.random()*4) + "s";
    wrap.appendChild(p);
    (function(el,d){ setTimeout(function(){ el.remove(); }, d*1000 + 5000); })(p, dur);
  }
}

/* ---------- 星点粒子 ---------- */
function spark(x, y, color, n){
  n = n || 6;
  for(var i=0;i<n;i++){
    var sp = document.createElement("span");
    sp.className = "spark" + (color === "pink" ? " spark-pink" : (color === "gold" ? " spark-gold" : ""));
    sp.style.left = x + "px";
    sp.style.top = y + "px";
    var ang = Math.random()*Math.PI*2;
    var dist = 28 + Math.random()*46;
    sp.style.setProperty("--sx", Math.cos(ang)*dist + "px");
    sp.style.setProperty("--sy", Math.sin(ang)*dist + "px");
    sp.style.animation = "sparkFly " + (0.5 + Math.random()*0.5) + "s ease-out forwards";
    document.body.appendChild(sp);
    setTimeout(function(){ sp.remove(); }, 1100);
  }
}

/* ---------- 波纹涟漪 ---------- */
function ripple(x, y){
  var layer = $("#rippleLayer");
  var r = document.createElement("span");
  r.className = "ripple";
  r.style.left = x + "px";
  r.style.top = y + "px";
  layer.appendChild(r);
  setTimeout(function(){ r.remove(); }, 900);
  spark(x, y, "gold", 4);
}

/* ---------- 开盒特效 ---------- */
function burst(x, y, colorA, colorB){
  var layer = $("#burst");
  for(var i=0;i<22;i++){
    var s = document.createElement("i");
    var size = 4 + Math.random()*10;
    s.style.width = s.style.height = size + "px";
    s.style.left = x + "px";
    s.style.top = y + "px";
    var ang = Math.random()*Math.PI*2;
    var dist = 70 + Math.random()*130;
    s.style.setProperty("--bx", Math.cos(ang)*dist + "px");
    s.style.setProperty("--by", Math.sin(ang)*dist + "px");
    s.style.background = Math.random()>.5 ? colorA : colorB;
    layer.appendChild(s);
    setTimeout(function(){ s.remove(); }, 1000);
  }
  ripple(x, y);
  spark(x, y, "gold", 10);
  spark(x, y, "pink", 8);
}

/* ---------- 拆礼物 ---------- */
function bindOpenGift(stageKey, trackKey, theme){
  var closed = $("#" + stageKey + "Closed");
  var content = $("#" + stageKey + "Content");
  if(!closed || !content) return;
  closed.addEventListener("click", function(ev){
    var rect = closed.getBoundingClientRect();
    var cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    var cs = getComputedStyle(document.querySelector(".gift-stage"));
    var ca = cs.getPropertyValue("--ga") || "#c9a24b";
    var ca2 = cs.getPropertyValue("--gabg") || "rgba(201,162,75,.4)";
    burst(cx, cy, ca, "#f5ecd8");
    closed.style.opacity = 0;
    spawnPetals(16, theme);
    setTimeout(function(){
      closed.hidden = true;
      content.hidden = false;
      playTrack(trackKey);
      // 预载下一首
      var nextMap = {bear:"perfume", perfume:"pajama", pajama:"dress", dress:null};
      if(nextMap[trackKey]) setupTrack(nextMap[trackKey]);
      window.scrollTo({top:0, behavior:"smooth"});
    }, 430);
  });
}


/* ---------- 木盒滑动开盒 ---------- */
function initWoodenBox(){
  var box = $("#woodenBox");
  var knob = $("#claspKnob");
  var track = box ? box.querySelector(".clasp-track") : null;
  var tip = $("#boxTip");
  if(!box || !knob || !track) return;

  var dragging = false, startX = 0, startKnobX = 0, knobX = 0, trackW = 0;
  function trackWidth(){ return track.getBoundingClientRect().width; }
  function setKnob(dx){
    trackW = trackWidth();
    knobX = Math.max(0, Math.min(dx, trackW));
    knob.style.transform = "translateX(" + knobX + "px)";
  }
  function openBox(){
    if(box.classList.contains("opened")) return;
    box.classList.add("opened");
    trackW = trackWidth();
    knob.style.transform = "translateX(" + trackW + "px)";
    if(tip) tip.style.opacity = 0;
    spawnPetals(14, "pink");
    var paper = $("#letterPaper");
    setTimeout(function(){
      if(box) box.style.display = "none";
      if(paper){ paper.hidden = false; window.scrollTo({top:0, behavior:"smooth"}); }
    }, 1150);
  }

  knob.addEventListener("pointerdown", function(e){
    dragging = true;
    startX = e.clientX;
    startKnobX = knobX;
    if(knob.setPointerCapture) knob.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  knob.addEventListener("pointermove", function(e){
    if(!dragging) return;
    setKnob(e.clientX - startX + startKnobX);
    e.preventDefault();
  });
  var endDrag = function(e){
    if(!dragging) return;
    dragging = false;
    trackW = trackWidth();
    if(knobX >= trackW * 0.55){
      setKnob(trackW);
      openBox();
    } else {
      knobX = 0;
      knob.style.transform = "translateX(0)";
    }
  };
  knob.addEventListener("pointerup", endDrag);
  knob.addEventListener("pointercancel", endDrag);
}

/* ---------- 全局点击涟漪 ---------- */
function initRipples(){
  document.addEventListener("click", function(ev){
    var target = ev.target;
    if(target && target.closest && target.closest(".btn-seal, .thumb, .gift-closed, .clasp-knob")){
      ripple(ev.clientX, ev.clientY);
    }
  });
}

/* ---------- 离线下载 ---------- */
function formatMB(n){ return (n/1048576).toFixed(1) + " MB"; }

function checkOfflineReady(){
  try{
    return caches.open(OFFLINE_CACHE).then(function(c){
      return c.match(OFFLINE_REMOTE[OFFLINE_REMOTE.length-1]).then(function(r){ return !!r; });
    });
  }catch(e){ return Promise.resolve(false); }
}

function startDownload(){
  var bar = document.getElementById("dlBar");
  var pct = document.getElementById("dlPercent");
  var tip = document.getElementById("dlTip");
  var size = document.getElementById("dlSize");
  var enter = document.getElementById("dlEnter");
  var loaded = 0;
  var list = OFFLINE_LOCAL.concat(OFFLINE_REMOTE);

  function step(path){
    loaded += OFFLINE_BYTES[path] || 0;
    var p = Math.min(100, Math.round(loaded / OFFLINE_TOTAL_BYTES * 100));
    if(bar) bar.style.width = p + "%";
    if(pct) pct.textContent = p;
    if(size) size.textContent = formatMB(loaded) + " / " + formatMB(OFFLINE_TOTAL_BYTES);
    if(tip && DL_TIPS[path]) tip.textContent = DL_TIPS[path];
  }

  Promise.all(list.map(function(path, i){
    var remote = OFFLINE_REMOTE.indexOf(path) !== -1;
    var url = remote ? asset(path) : path;
    return fetch(url, {mode: remote ? "cors" : "same-origin", cache:"no-store"})
      .then(function(res){
        if(res && res.status === 200){
          return caches.open(OFFLINE_CACHE).then(function(c){ return c.put(url, res); });
        }
      })
      .catch(function(){})
      .then(function(){ step(path); });
  })).then(function(){
    try{ localStorage.setItem("qixi_ready_v3", "1"); }catch(e){}
    if(enter) enter.hidden = false;
    if(tip) tip.textContent = "全部礼物已悄悄收好，随时可以打开";
    if(bar) bar.style.width = "100%";
    if(pct) pct.textContent = "100";
    if(enter){
      enter.addEventListener("click", function(){ enterSite(); });
    }
    // 3 秒后自动进入
    setTimeout(function(){ enterSite(); }, 3000);
  });
}

function enterSite(){
  var dl = document.getElementById("stage-download");
  if(dl){ dl.classList.remove("active"); dl.classList.add("hide"); }
  if(!window.__siteStarted){
    window.__siteStarted = true;
    init();
  }
}

function initOffline(){
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  }
  checkOfflineReady().then(function(ready){
    if(ready){
      enterSite();
    } else {
      startDownload();
    }
  });
}

/* ---------- 初始化 ---------- */
function init(){
  var s0 = document.getElementById("stage-open");
  if(s0 && !s0.classList.contains("active")) s0.classList.add("active");
  initStars();
  initRipples();
  initImgFade();

  $("#btnEnter").addEventListener("click", function(){ goTo("letter"); });

  // 木盒：滑动红扣开盒
  initWoodenBox();

  $("#btnToGift").addEventListener("click", function(){ goTo("guide"); });
  $("#btnFirstGift").addEventListener("click", function(){ goTo("g1"); });

  bindOpenGift("g1","bear","pink");
  bindOpenGift("g2","perfume","gold");
  bindOpenGift("g3","pajama","pink");
  bindOpenGift("g4","dress","gold");

  $$(".btn-ink").forEach(function(){});
  $$("[data-next]").forEach(function(btn){
    btn.addEventListener("click", function(){
      fadeOutMusic(200);
      goTo(btn.getAttribute("data-next"));
    });
  });
  $("#btnToFinal").addEventListener("click", function(){
    fadeOutMusic(260);
    goTo("final");
  });
  $("#btnBack").addEventListener("click", goBack);

  // 缩略图切换
  [["g1Thumbs","g1Img","photos/bear.jpg"],
   ["g2Thumbs","g2Img","photos/perfume_1.jpg"]].forEach(function(pair){
    var row = document.getElementById(pair[0]);
    var img = document.getElementById(pair[1]);
    if(!row || !img) return;
    bindImgFallback(img, pair[2]);
    row.querySelectorAll(".thumb").forEach(function(t){
      t.addEventListener("click", function(ev){
        row.querySelectorAll(".thumb").forEach(function(x){x.classList.remove("on")});
        t.classList.add("on");
        img.src = asset(t.getAttribute("data-full").replace(/^.*assets\//, ""));
        ripple(ev.clientX || window.innerWidth/2, ev.clientY || 200);
      });
    });
  });

  // 礼物大图 CDN 回退
  bindImgFallback(document.getElementById("g1Img"), "photos/bear.jpg");
  bindImgFallback(document.getElementById("g2Img"), "photos/perfume_1.jpg");
  $$(".gift-img").forEach(function(img){
    var path = img.getAttribute("src").replace(/^.*assets\//, "");
    bindImgFallback(img, path);
  });

  // 预载
  setupTrack("letter");
  setupTrack("bear");

  setTimeout(function(){ spawnPetals(8, "pink"); }, 1400);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initOffline);
} else {
  initOffline();
}

})();
