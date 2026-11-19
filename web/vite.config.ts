import { defineConfig, loadEnv, type Plugin } from "vite";
import { resolve } from "node:path";
import { createReadStream, existsSync, statSync } from "node:fs";
import { HTML_EL } from "./src/i18n/html.el";

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

// The language of the build (VITE_LANG=el -> Greek; nothing -> English, the pages as written).
// The text of index.html and about.html is English in the files. For a Greek build every English
// piece listed in src/i18n/html.el.ts is swapped for its Greek text here, at build time, so the
// title, the share text and the first paint are Greek. A piece that is no longer in the page stops
// the build: the two languages cannot drift apart unnoticed.
// VITE_NOINDEX=1 (test copies) asks search engines to skip the site.
function pageLanguage(lang: string, noindex: boolean): Plugin {
  const squash = (s: string) => s.replace(/\s+/g, " ");
  return {
    name: "page-language",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        let out = html;
        if (lang === "el") {
          out = squash(out).replace('<html lang="en">', '<html lang="el">');
          const page = ctx.path.includes("about") ? "about" : "index";
          const pairs = [...HTML_EL.both, ...HTML_EL[page]].sort((a, b) => b[0].length - a[0].length);
          for (const [en, el] of pairs) {
            const key = squash(en);
            if (!out.includes(key)) throw new Error(`Greek page text: this English piece is not in ${ctx.path} any more: "${key.slice(0, 80)}"`);
            out = out.split(key).join(el);
          }
        }
        if (noindex) out = out.replace("<head>", '<head>\n  <meta name="robots" content="noindex, nofollow" />');
        return out;
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, __dirname, "VITE_"), ...process.env };
  return {
  base: "./",
  // A new id for every build. Map files carry it in their address, so a phone that has pieces of an
  // older upload never mixes them with the new one (that left the map empty until you zoomed).
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  plugins: [privateData(), pageLanguage(env.VITE_LANG ?? "en", env.VITE_NOINDEX === "1")],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, "index.html"), about: resolve(__dirname, "about.html") },
    },
  },
};
});
