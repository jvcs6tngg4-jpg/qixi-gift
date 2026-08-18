/* ============================================================
   七夕 · 给可芯的礼物 —— 主逻辑
   ============================================================ */
(function(){
"use strict";

/* ---------- 媒体基址（部署后切换为 jsDelivr CDN） ---------- */
var ASSETS_BASE = (window.ASSETS_BASE || "assets/");
function asset(p){ return ASSETS_BASE + p; }

/* ---------- 音乐表 ---------- */
var TRACKS = {
  letter:  { id:"audLetter",  file:"music/qixi_letter.m4a", title:"方大同《关于爱的定义》" },
  bear:    { id:"audBear",    file:"music/bear.m4a",        title:"周杰伦《告白气球》" },
  perfume: { id:"audPerfume", file:"music/perfume.m4a",     title:"方大同《月亮代表我的心》" },
  pajama:  { id:"audPajama",  file:"music/pajama.m4a",      title:"萤火虫儿歌《萌萌噜噜》" },
  dress:   { id:"audDress",   file:"music/dress.m4a",       title:"方大同《每天每天》" }
};

/* ---------- 幕注册 ---------- */
var STAGES = ["open","letter","guide","g1","g2","g3","g4","final"];
var current = "open";
var historyStack = [];

var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return document.querySelectorAll(s); };

function showStage(name, dir){
  var cur = $("#stage-" + current);
  var next = $("#stage-" + name);
  if(!next || current === name) return;
  cur.classList.remove("active");
  cur.classList.add("hide");
  next.classList.remove("hide");
  // 触发重排再淡入
  void next.offsetWidth;
  next.classList.add("active");
  current = name;
  window.scrollTo({top:0, behavior:"instant"});
}

function goTo(name){
  historyStack.push(current);
  showStage(name);
  onEnter(name);
}
function goBack(){
  if(!historyStack.length) return;
  var prev = historyStack.pop();
  showStage(prev);
  onEnter(prev);
}

/* ---------- 每幕进入时的行为 ---------- */
function onEnter(name){
  var backBtn = $("#btnBack");
  if(name === "open" || name === "letter"){
    backBtn.hidden = true;
  } else {
    backBtn.hidden = false;
  }

  switch(name){
    case "open":
      stopAllMusic();
      break;
    case "letter":
      preloadTrack("bear");
      preloadTrack("perfume");
      break;
    case "g1": case "g2": case "g3": case "g4": {
      // 如果礼物已经拆开过（返回时），恢复音乐
      var map = {g1:"bear",g2:"perfume",g3:"pajama",g4:"dress"};
      var content = $("#" + name + "Content");
      if(content && !content.hidden){
        playTrack(map[name]);
      } else {
        stopAllMusic();
      }
      break;
    }
    case "guide":
      stopAllMusic();
      break;
    case "final":
      stopAllMusic();
      spawnPetals(22, true);
      break;
  }
}


/* ---------- 预加载（逐幕预载下一首，避免首屏下载全部音乐） ---------- */
function preloadTrack(key){
  var t = TRACKS[key];
  if(!t) return;
  var a = document.getElementById(t.id);
  if(!a || a.dataset.loading) return;
  a.dataset.loading = "1";
  a.preload = "auto";
  a.src = asset(t.file);
  a.dataset.src = asset(t.file);
  a.load();
}

/* ---------- 音乐控制 ---------- */
function playTrack(key){
  var t = TRACKS[key];
  if(!t) return;
  var a = document.getElementById(t.id);
  if(!a) return;
  if(a.dataset.src !== asset(t.file)){
    a.src = asset(t.file);
    a.dataset.src = asset(t.file);
    a.load();
  }
  var p = a.play();
  if(p && p.catch) p.catch(function(){ /* 等待用户手势 */ });
}
function stopAllMusic(){
  Object.keys(TRACKS).forEach(function(k){
    var a = document.getElementById(TRACKS[k].id);
    if(a) a.pause();
  });
}
function fadeOutMusic(ms){
  Object.keys(TRACKS).forEach(function(k){
    var a = document.getElementById(TRACKS[k].id);
    if(!a || a.paused) return;
    var v = a.volume;
    var step = v / 10;
    var iv = setInterval(function(){
      v -= step;
      if(v <= 0.02){ clearInterval(iv); a.pause(); a.volume = 1; }
      else a.volume = v;
    }, Math.max(30, ms/10));
  });
}

/* ---------- 星空 canvas ---------- */
function initStars(){
  var cv = $("#stars");
  if(!cv) return;
  var ctx = cv.getContext("2d");
  var W, H, stars = [];
  function resize(){
    W = cv.width = cv.offsetWidth || window.innerWidth;
    H = cv.height = cv.offsetHeight || window.innerHeight;
  }
  function makeStars(n){
    stars = [];
    for(var i=0;i<n;i++){
      stars.push({
        x: Math.random()*W,
        y: Math.random()*H,
        r: Math.random()*1.4 + .3,
        a: Math.random()*.7 + .3,
        tw: Math.random()*.02 + .004,
        ph: Math.random()*Math.PI*2
      });
    }
  }
  var t = 0;
  function draw(){
    t += 0.016;
    ctx.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){
      var s = stars[i];
      var alpha = s.a * (0.55 + 0.45*Math.sin(t*s.tw*8 + s.ph));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = "rgba(240,230,210," + alpha.toFixed(3) + ")";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize();
  makeStars(window.innerWidth < 480 ? 55 : 90);
  window.addEventListener("resize", function(){ resize(); makeStars(window.innerWidth < 480 ? 55 : 90); });
  draw();
}

/* ---------- 花瓣 ---------- */
function spawnPetals(n, pinkMix){
  var wrap = $("#petals");
  if(!wrap) return;
  n = n || 12;
  for(var i=0;i<n;i++){
    var p = document.createElement("span");
    p.className = "petal" + (pinkMix && Math.random()>.45 ? " pink" : "");
    var size = 10 + Math.random()*12;
    p.style.width = size + "px";
    p.style.height = size * 1.15 + "px";
    p.style.left = Math.random()*100 + "vw";
    p.style.setProperty("--sway", (Math.random()*120 - 60) + "px");
    var dur = 7 + Math.random()*7;
    p.style.animationDuration = dur + "s";
    p.style.animationDelay = (Math.random()*4) + "s";
    wrap.appendChild(p);
    (function(el, d){
      setTimeout(function(){ el.remove(); }, d*1000 + 4500);
    })(p, dur);
  }
}

/* ---------- 拆箱动效 ---------- */
function burst(x, y){
  var layer = $("#burst");
  for(var i=0;i<16;i++){
    var s = document.createElement("i");
    var size = 5 + Math.random()*9;
    s.style.width = s.style.height = size + "px";
    s.style.left = x + "px";
    s.style.top = y + "px";
    var ang = Math.random()*Math.PI*2;
    var dist = 60 + Math.random()*110;
    s.style.setProperty("--bx", Math.cos(ang)*dist + "px");
    s.style.setProperty("--by", Math.sin(ang)*dist + "px");
    s.style.background = Math.random()>.5 ? "#e3b96b" : "#d98a7a";
    layer.appendChild(s);
    setTimeout(function(){ s.remove(); }, 1000);
  }
}

/* ---------- 拆开礼物 ---------- */
function bindOpenGift(stageKey, trackKey){
  var closed = $("#" + stageKey + "Closed");
  var content = $("#" + stageKey + "Content");
  if(!closed || !content) return;
  closed.addEventListener("click", function(ev){
    // 拆箱动效
    var rect = closed.getBoundingClientRect();
    burst(rect.left + rect.width/2, rect.top + rect.height/2);
    closed.style.opacity = 0;
    spawnPetals(16, true);
    setTimeout(function(){
      closed.hidden = true;
      content.hidden = false;
      playTrack(trackKey);
      // 预载下一首，保证切换秒播
      var nextMap = {bear:"perfume", perfume:"pajama", pajama:"dress", dress:null};
      if(nextMap[trackKey]) preloadTrack(nextMap[trackKey]);
      // 内容出现后滚动到顶部
      window.scrollTo({top:0, behavior:"smooth"});
    }, 420);
  });
}

/* ---------- 初始化 ---------- */
function init(){
  // 确保开场幕可见
  var s0 = document.getElementById('stage-open');
  if(s0 && !s0.classList.contains('active')) s0.classList.add('active');
  initStars();

  // 开场 → 信
  $("#btnEnter").addEventListener("click", function(){
    goTo("letter");
  });

  // 信封 → 展开信并播音乐
  $("#letterEnvelope").addEventListener("click", function(){
    var env = $("#letterEnvelope");
    var paper = $("#letterPaper");
    env.classList.add("opened");
    spawnPetals(10, true);
    setTimeout(function(){
      env.hidden = true;
      paper.hidden = false;
      playTrack("letter");
    }, 500);
  });

  // 信 → 引导
  $("#btnToGift").addEventListener("click", function(){ goTo("guide"); });

  // 引导 → 第一件礼物
  $("#btnFirstGift").addEventListener("click", function(){ goTo("g1"); });

  // 四件礼物拆开
  bindOpenGift("g1","bear");
  bindOpenGift("g2","perfume");
  bindOpenGift("g3","pajama");
  bindOpenGift("g4","dress");

  // 礼物间跳转
  $$(".btn-ink[data-next]").forEach(function(btn){
    btn.addEventListener("click", function(){
      fadeOutMusic(220);
      goTo(btn.getAttribute("data-next"));
    });
  });

  // 最后一件 → 结尾
  $("#btnToFinal").addEventListener("click", function(){
    fadeOutMusic(500);
    goTo("final");
  });

  // 返回
  $("#btnBack").addEventListener("click", goBack);

  // 预加载：先载开头信与第一首礼物歌，其余逐幕预载
  preloadTrack("letter");
  preloadTrack("bear");

  // 开场先放一点花瓣
  setTimeout(function(){ spawnPetals(8, true); }, 1200);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

})();
