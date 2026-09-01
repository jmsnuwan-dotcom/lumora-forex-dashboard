const CACHE_NAME = "lumora-pwa-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


/*
 * INSTALL
 */

self.addEventListener(
  "install",
  (event) => {

    event.waitUntil(

      caches.open(CACHE_NAME)
        .then((cache) => {

          return cache.addAll(
            APP_SHELL
          );

        })

    );

    self.skipWaiting();

  }
);


/*
 * ACTIVATE
 */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      caches.keys()
        .then((keys) => {

          return Promise.all(

            keys
              .filter(
                key => key !== CACHE_NAME
              )
              .map(
                key => caches.delete(key)
              )

          );

        })

    );

    self.clients.claim();

  }
);


/*
 * FETCH
 */

self.addEventListener(
  "fetch",
  (event) => {

    const request =
      event.request;


    /*
     * API REQUESTS
     * Always use network first.
     */

    if (
      request.url.includes("/api/")
    ) {

      event.respondWith(

        fetch(request)
          .catch(() =>
            caches.match(request)
          )

      );

      return;

    }


    /*
     * NORMAL FILES
     * Cache first + network fallback.
     */

    event.respondWith(

      caches.match(request)
        .then((cached) => {

          if (cached) {

            return cached;

          }


          return fetch(request)
            .then((response) => {

              if (
                !response ||
                response.status !== 200 ||
                response.type === "opaque"
              ) {

                return response;

              }


              const responseClone =
                response.clone();


              caches.open(CACHE_NAME)
                .then((cache) => {

                  cache.put(
                    request,
                    responseClone
                  );

                });


              return response;

            });

        })

    );

  }
);
