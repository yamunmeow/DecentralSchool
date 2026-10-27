import react from "@vitejs/plugin-react";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { build, defineConfig, type Plugin } from "vite";

const ENTRIES: Record<string, string> = {
  "virtual:player-runtime": resolve(import.meta.dirname, "src/player/main.ts"),
  "virtual:code-runtime": resolve(import.meta.dirname, "src/codeplayer/main.ts"),
  "virtual:learn-runtime": resolve(import.meta.dirname, "src/learnplayer/main.ts"),
};

/** Compiles a student-side runtime (src/player, src/codeplayer) into one minified script. */
async function compile(entry: string): Promise<string> {
  const out = await build({
    configFile: false,
    logLevel: "warn",
    build: {
      write: false,
      target: "es2017",
      minify: true,
      lib: { entry, formats: ["iife"], name: "DecentralRuntime", fileName: () => "runtime.js" },
    },
  });
  const results = Array.isArray(out) ? out : [out];
  for (const r of results)
    if ("output" in r)
      for (const o of r.output)
        if (o.type === "chunk") return o.code;
  throw new Error("player build produced no script");
}

/**
 * `import runtime from "virtual:player-runtime"` gives the studio the player as a
 * string, so it can inline it into downloads, APKs and previews. The same script is
 * served as the hosted player at /p/.
 */
function playerRuntime(): Plugin {
  const cache = new Map<string, Promise<string>>();
  const runtime = (id: string) => {
    if (!cache.has(id)) cache.set(id, compile(ENTRIES[id]));
    return cache.get(id)!;
  };
  const hostedPage = async (kind: "p" | "c") => {
    const { buildPage, buildCodePage } = await import("./src/shared/page.ts");
    return kind === "p" ? buildPage(await runtime("virtual:player-runtime"), null, { hosted: true }) : buildCodePage(await runtime("virtual:code-runtime"), null, "", { hosted: true });
  };
  return {
    name: "player-runtime",
    resolveId: (id) => (id in ENTRIES ? "\0" + id : undefined),
    async load(id) {
      if (!id.startsWith("\0virtual:")) return;
      const name = id.slice(1);
      if (!(name in ENTRIES)) return;
      return `export default ${JSON.stringify(await runtime(name))};`;
    },
    hotUpdate({ file, server }) {
      if (!/src[\\/](player|shared|code|codeplayer|learn|learnplayer)[\\/]/.test(file)) return;
      cache.clear();
      for (const name of Object.keys(ENTRIES)) {
        const mod = server.moduleGraph.getModuleById("\0" + name);
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
      if (/src[\\/](player|codeplayer|learnplayer)[\\/]/.test(file)) server.ws.send({ type: "full-reload" });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url || "").split("?")[0];
        const kind = path === "/p/" || path === "/p/index.html" ? "p" : path === "/c/" || path === "/c/index.html" ? "c" : null;
        if (!kind) return next();
        try {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(await hostedPage(kind));
        } catch (e) {
          next(e);
        }
      });
    },
    async generateBundle() {
      this.emitFile({ type: "asset", fileName: "p/index.html", source: await hostedPage("p") });
      this.emitFile({ type: "asset", fileName: "c/index.html", source: await hostedPage("c") });
    },
  };
}

/** Every file under public/, as site paths (the library games, icons, the APK shell). */
function publicFiles(dir = resolve(import.meta.dirname, "public")): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return publicFiles(full);
    return name.startsWith(".") || name === "_headers" ? [] : ["/" + relative(resolve(import.meta.dirname, "public"), full).split("\\").join("/")];
  });
}

/**
 * The studio's service worker (dist/sw.js): every built file and library game is
 * stored on the first visit, so the whole studio, not only the player, opens and
 * works with no internet afterwards.
 */
function studioWorker(): Plugin {
  return {
    name: "studio-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const files = ["/", ...Object.keys(bundle).map((f) => "/" + f), ...publicFiles()].filter((f) => !f.endsWith(".map") && !f.startsWith("/p/") && !f.startsWith("/c/") && f !== "/sw.js");
      const version = Date.now().toString(36);
      const source = `// Made by vite.config.ts (studioWorker). Keeps DecentralSchool working offline.
const CACHE = "ds-studio-${version}";
const FILES = ${JSON.stringify(files)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("ds-studio-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/p/") || url.pathname.startsWith("/c/") || url.pathname.startsWith("/api/")) return;
  // Pages: the newest when online; offline, the stored page (a library game) or the studio.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) || caches.match("/", { ignoreVary: true })));
    return;
  }
  // Built files never change (their names carry a hash); everything else refreshes in the background.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      if (hit && url.pathname.startsWith("/assets/")) return hit;
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || fresh;
    }),
  );
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), playerRuntime(), studioWorker()],
  build: { target: "es2022", chunkSizeWarningLimit: 1500 },
  // Sign-in runs in the Worker: `npm run dev:api` serves it on 8787.
  server: { proxy: { "/api": "http://localhost:8787" } },
});
