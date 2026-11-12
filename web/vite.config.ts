import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import { createReadStream, existsSync, statSync } from "node:fs";

// PRIVATE data (future finds log, village notes) lives in ../data/web-private and is served ONLY by the
// local dev server. It is never copied into the built site.
function privateData(): Plugin {
  const dir = resolve(__dirname, "../data/web-private");
  return {
    name: "private-data-dev-only",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/private/", (req, res, next) => {
        const file = resolve(dir, (req.url ?? "").split("?")[0].replace(/^\//, ""));
        if (!file.startsWith(dir) || !existsSync(file)) return next();
        const size = statSync(file).size;
        const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
        if (range) {
          const start = Number(range[1]);
          const end = range[2] ? Number(range[2]) : size - 1;
          res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${size}`,
            "Accept-Ranges": "bytes", "Content-Length": end - start + 1 });
          createReadStream(file, { start, end }).pipe(res);
        } else {
          res.writeHead(200, { "Content-Length": size, "Accept-Ranges": "bytes" });
          createReadStream(file).pipe(res);
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [privateData()],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), about: resolve(__dirname, "about.html") },
    },
  },
});
