/* ============================================================
   七夕 · 给可芯的礼物 —— Service Worker（离线缓存）
   ============================================================ */
const CACHE_NAME = "qixi-gift-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/main.js",
  "./sw.js"
];

self.addEventListener("install", function(e){
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(CORE_ASSETS);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; })
                        .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;

  // 页面导航：network-first，失败时回退缓存（保证内容可更新）
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); });
        return res;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match("./index.html"); });
      })
    );
    return;
  }

  // 静态资源：cache-first（已下载的资源秒开）
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && (res.type === "basic" || res.type === "cors")){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
