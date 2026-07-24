/* =========================================================
   EduPay Pico — Professional PWA Service Worker
   Offline + Auto Update System
   ========================================================= */

const APP_VERSION = "1.0.2";

const CACHE_NAME = `edupay-pico-cache-${APP_VERSION}`;
const RUNTIME_CACHE = `edupay-pico-runtime-${APP_VERSION}`;


/* App files */
const CORE_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/manifest.json",
    "/icon-192.png",
    "/icon-512.png"
];



/* =========================
   INSTALL
========================= */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)

        .then(cache => {

            return cache.addAll(CORE_ASSETS);

        })

        .then(()=>{

            // Activate immediately
            return self.skipWaiting();

        })

    );

});



/* =========================
   ACTIVATE
========================= */

self.addEventListener("activate", event=>{


    event.waitUntil(

        caches.keys()

        .then(keys=>{

            return Promise.all(

                keys.map(key=>{

                    if(
                        key !== CACHE_NAME &&
                        key !== RUNTIME_CACHE
                    ){

                        return caches.delete(key);

                    }

                })

            );

        })

        .then(()=>{

            return self.clients.claim();

        })

    );


});




/* =========================
   UPDATE MESSAGE CONTROL
========================= */


self.addEventListener("message", event=>{


    if(!event.data) return;



    if(event.data.type==="SKIP_WAITING"){

        self.skipWaiting();

    }



    if(event.data.type==="GET_VERSION"){

        event.ports[0].postMessage({

            version: APP_VERSION

        });

    }


});





/* =========================
   FETCH SYSTEM
========================= */


self.addEventListener("fetch", event=>{


    const request = event.request;


    if(request.method !== "GET")
        return;



    const url = new URL(request.url);



    /*
       HTML pages
       Network first
    */

    if(request.mode==="navigate"){


        event.respondWith(


            fetch(request)

            .then(response=>{


                const clone=response.clone();


                caches.open(CACHE_NAME)

                .then(cache=>{

                    cache.put(
                        "/index.html",
                        clone
                    );

                });


                return response;


            })


            .catch(()=>{


                return caches.match(
                    "/index.html"
                );


            })


        );


        return;

    }




    /*
       Local files
       Cache first
    */


    if(url.origin === location.origin){


        event.respondWith(


            caches.match(request)

            .then(cached=>{


                if(cached){

                    return cached;

                }



                return fetch(request)

                .then(response=>{


                    const clone=response.clone();


                    caches.open(CACHE_NAME)

                    .then(cache=>{

                        cache.put(
                            request,
                            clone
                        );

                    });


                    return response;


                });



            })


        );


        return;

    }





    /*
       External files
       Example:
       Google fonts
       jsPDF CDN
    */


    event.respondWith(


        caches.open(RUNTIME_CACHE)

        .then(cache=>{


            return cache.match(request)

            .then(cached=>{


                const network = fetch(request)

                .then(response=>{


                    if(
                        response &&
                        response.status===200
                    ){

                        cache.put(
                            request,
                            response.clone()
                        );

                    }


                    return response;


                })


                .catch(()=>cached);



                return cached || network;


            });


        })


    );

});