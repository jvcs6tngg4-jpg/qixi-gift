/* ============================================================
   七夕 · 给可芯的礼物 —— 主逻辑 v2
   ============================================================ */
(function(){
"use strict";

var ASSETS_BASE = (window.ASSETS_BASE || "assets/");
var PAGES_BASE  = "https://jvcs6tngg4-jpg.github.io/qixi-gift/assets/";
var LOCAL_BASE  = "assets/";

function asset(p){ return ASSETS_BASE + p; }

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
      stopMusic(); break;
    case "guide":
      preloadImg("photos/bear.jpg");
      preloadImg("photos/bear_box.jpg");
      preloadImg("photos/bear_detail.jpg");
      break;
    case "g1":
      preloadImg("photos/perfume_1.jpg");
      preloadImg("photos/perfume_2.jpg");
      preloadImg("photos/perfume_3.jpg");
      break;
    case "g2":
      preloadImg("photos/pajama.jpg");
      break;
    case "g3":
      preloadImg("photos/dress.jpg");
      break;
    case "g1": case "g2": case "g3": case "g4": {
      var map = {g1:"bear",g2:"perfume",g3:"pajama",g4:"dress"};
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

/* ---------- 波纹涟漪 ---------- */
function ripple(x, y){
  var layer = $("#rippleLayer");
  var r = document.createElement("span");
  r.className = "ripple";
  r.style.left = x + "px";
  r.style.top = y + "px";
  layer.appendChild(r);
  setTimeout(function(){ r.remove(); }, 900);
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

/* ---------- 全局点击涟漪 ---------- */
function initRipples(){
  document.addEventListener("click", function(ev){
    var target = ev.target;
    if(target && target.closest && target.closest(".btn-seal, .thumb, .gift-closed, .letter-envelope")){
      ripple(ev.clientX, ev.clientY);
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

  $("#letterEnvelope").addEventListener("click", function(){
    var env = $("#letterEnvelope");
    var paper = $("#letterPaper");
    env.classList.add("opened");
    spawnPetals(12, "pink");
    setTimeout(function(){
      env.hidden = true;
      paper.hidden = false;
    }, 560);
  });

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
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

})();
