// vite.config.ts
import tailwindcss from "file:///D:/project/myProjects/accounting/.claude/worktrees/parent-sms/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///D:/project/myProjects/accounting/.claude/worktrees/parent-sms/node_modules/@vitejs/plugin-react/dist/index.js";
import { readFileSync } from "node:fs";
import { defineConfig } from "file:///D:/project/myProjects/accounting/.claude/worktrees/parent-sms/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///D:/project/myProjects/accounting/.claude/worktrees/parent-sms/node_modules/vite-plugin-pwa/dist/index.js";
var basePath = process.env.VITE_BASE_PATH ?? "/";
var appName = process.env.VITE_APP_ENV === "dev" ? "\u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628 (dev)" : "\u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628";
var appVersion = JSON.parse(readFileSync("./package.json", "utf8")).version;
var versionFile = {
  name: "app-version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ version: appVersion })
    });
  }
};
var pdfExportChunks = ["jspdf", "html2canvas", "purify.es", "index.es"];
var pdfExportChunkPattern = new RegExp(
  `/assets/(?:${pdfExportChunks.map((name) => name.replace(".", "\\.")).join("|")})[^/]*\\.js$`
);
var vite_config_default = defineConfig(({ command }) => ({
  base: basePath,
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts"]
  },
  plugins: [
    tailwindcss(),
    react(),
    versionFile,
    VitePWA({
      // A new version waits for the user's «به‌روزرسانی» (src/services/webUpdate.ts).
      registerType: "prompt",
      devOptions: {
        enabled: true,
        type: "module"
      },
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "pwa-maskable-512x512.png"
      ],
      manifest: {
        id: basePath,
        name: appName,
        short_name: appName,
        description: "\u062D\u0633\u0627\u0628 \u06A9\u062A\u0627\u0628: \u062D\u0633\u0627\u0628\u062F\u0627\u0631\u06CC \u0634\u062E\u0635\u06CC \u0628\u0627 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632\u06CC \u062F\u0631 \u06AF\u0648\u06AF\u0644 \u0634\u06CC\u062A",
        theme_color: "#0f766e",
        background_color: "#f0fdfa",
        display: "standalone",
        orientation: "portrait",
        lang: "fa",
        dir: "rtl",
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        // Long-press on the home-screen icon; App reads `?action=` (useLaunchAction).
        shortcuts: [
          {
            name: "\u062B\u0628\u062A \u0647\u0632\u06CC\u0646\u0647",
            url: `${basePath}?action=expense`,
            icons: [{ src: "shortcut-expense.png", sizes: "96x96", type: "image/png" }]
          },
          {
            name: "\u062B\u0628\u062A \u062F\u0631\u0622\u0645\u062F",
            url: `${basePath}?action=income`,
            icons: [{ src: "shortcut-income.png", sizes: "96x96", type: "image/png" }]
          },
          {
            name: "\u067E\u06CC\u0627\u0645\u06A9\u200C\u0647\u0627\u06CC \u0628\u0627\u0646\u06A9\u06CC",
            url: `${basePath}?action=sms`,
            icons: [{ src: "shortcut-sms.png", sizes: "96x96", type: "image/png" }]
          }
        ],
        // A bank SMS shared from the messages app runs through the bank SMS parser.
        share_target: {
          action: `${basePath}?share=1`,
          method: "GET",
          params: { text: "text" }
        }
      },
      workbox: {
        globPatterns: command === "serve" ? [] : ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // PDF export only: jspdf, html2canvas and their lazy deps (DOMPurify,
        // canvg as `index.es`). Most sessions never load them, so they are cached
        // on first use (rule below) instead of on install.
        globIgnores: ["**/node_modules/**/*", ...pdfExportChunks.map((name) => `**/${name}*.js`)],
        additionalManifestEntries: command === "serve" ? [] : [{ url: "version.json", revision: appVersion }],
        importScripts: ["push-handler.js"],
        // The develop build is served under `<base>dev/`, inside this worker's scope. Its
        // pages must come from the network, not from this build's index.html.
        navigateFallbackDenylist: [new RegExp(`^${basePath}dev/`)],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: "NetworkOnly"
          },
          {
            // Not anchored at the start, so Workbox only matches same-origin URLs.
            urlPattern: pdfExportChunkPattern,
            handler: "CacheFirst",
            options: {
              cacheName: "pdf-export-chunks",
              expiration: {
                maxEntries: 12,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true
              }
            }
          }
        ]
      }
    })
  ]
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxwcm9qZWN0XFxcXG15UHJvamVjdHNcXFxcYWNjb3VudGluZ1xcXFwuY2xhdWRlXFxcXHdvcmt0cmVlc1xcXFxwYXJlbnQtc21zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxwcm9qZWN0XFxcXG15UHJvamVjdHNcXFxcYWNjb3VudGluZ1xcXFwuY2xhdWRlXFxcXHdvcmt0cmVlc1xcXFxwYXJlbnQtc21zXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9wcm9qZWN0L215UHJvamVjdHMvYWNjb3VudGluZy8uY2xhdWRlL3dvcmt0cmVlcy9wYXJlbnQtc21zL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3QvY29uZmlnXCIgLz5cclxuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xyXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXHJcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnXHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgdHlwZSBQbHVnaW4gfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJ1xyXG5cclxuY29uc3QgYmFzZVBhdGggPSBwcm9jZXNzLmVudi5WSVRFX0JBU0VfUEFUSCA/PyAnLydcclxuXHJcbi8qKiBEZXZlbG9wIGJ1aWxkcyAoYFZJVEVfQVBQX0VOVj1kZXZgKSBzYXkgXHUwMEFCZGV2XHUwMEJCIGluIHRoZSBpbnN0YWxsZWQgYXBwJ3MgbmFtZS4gKi9cclxuY29uc3QgYXBwTmFtZSA9IHByb2Nlc3MuZW52LlZJVEVfQVBQX0VOViA9PT0gJ2RldicgPyAnXHUwNjJEXHUwNjMzXHUwNjI3XHUwNjI4IFx1MDZBOVx1MDYyQVx1MDYyN1x1MDYyOCAoZGV2KScgOiAnXHUwNjJEXHUwNjMzXHUwNjI3XHUwNjI4IFx1MDZBOVx1MDYyQVx1MDYyN1x1MDYyOCdcclxuXHJcbi8qKiBUaGUgYXBwIHJlYWRzIHRoZSBzYW1lIGZpZWxkIChgaW1wb3J0IHsgdmVyc2lvbiB9IGZyb20gJ3BhY2thZ2UuanNvbidgKS4gKi9cclxuY29uc3QgYXBwVmVyc2lvbiA9IChKU09OLnBhcnNlKHJlYWRGaWxlU3luYygnLi9wYWNrYWdlLmpzb24nLCAndXRmOCcpKSBhcyB7IHZlcnNpb246IHN0cmluZyB9KVxyXG4gIC52ZXJzaW9uXHJcblxyXG4vKipcclxuICogYHZlcnNpb24uanNvbmAgYmVzaWRlIHRoZSBidWlsZDogdGhlIHVwZGF0ZSBiYW5uZXIgZmV0Y2hlcyBpdCB0byBuYW1lIHRoZSB3YWl0aW5nXHJcbiAqIHNlcnZpY2Ugd29ya2VyJ3MgdmVyc2lvbiwgYW5kIGl0IGlzIHByZWNhY2hlZCB3aXRoIHRoZSB2ZXJzaW9uIGFzIGl0cyByZXZpc2lvbi5cclxuICovXHJcbmNvbnN0IHZlcnNpb25GaWxlOiBQbHVnaW4gPSB7XHJcbiAgbmFtZTogJ2FwcC12ZXJzaW9uLWZpbGUnLFxyXG4gIGFwcGx5OiAnYnVpbGQnLFxyXG4gIGdlbmVyYXRlQnVuZGxlKCkge1xyXG4gICAgdGhpcy5lbWl0RmlsZSh7XHJcbiAgICAgIHR5cGU6ICdhc3NldCcsXHJcbiAgICAgIGZpbGVOYW1lOiAndmVyc2lvbi5qc29uJyxcclxuICAgICAgc291cmNlOiBKU09OLnN0cmluZ2lmeSh7IHZlcnNpb246IGFwcFZlcnNpb24gfSlcclxuICAgIH0pXHJcbiAgfVxyXG59XHJcblxyXG4vKiogTmFtZSBwcmVmaXhlcyBvZiB0aGUgaGFzaGVkIGNodW5rcyBvbmx5IFBERiBleHBvcnQgbG9hZHMgKGNoZWNrZWQgYWdhaW5zdCBkaXN0L2Fzc2V0cykuICovXHJcbmNvbnN0IHBkZkV4cG9ydENodW5rcyA9IFsnanNwZGYnLCAnaHRtbDJjYW52YXMnLCAncHVyaWZ5LmVzJywgJ2luZGV4LmVzJ11cclxuY29uc3QgcGRmRXhwb3J0Q2h1bmtQYXR0ZXJuID0gbmV3IFJlZ0V4cChcclxuICBgL2Fzc2V0cy8oPzoke3BkZkV4cG9ydENodW5rcy5tYXAobmFtZSA9PiBuYW1lLnJlcGxhY2UoJy4nLCAnXFxcXC4nKSkuam9pbignfCcpfSlbXi9dKlxcXFwuanMkYFxyXG4pXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCB9KSA9PiAoe1xyXG4gIGJhc2U6IGJhc2VQYXRoLFxyXG4gIHRlc3Q6IHtcclxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoudGVzdC50cyddXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICB0YWlsd2luZGNzcygpLFxyXG4gICAgcmVhY3QoKSxcclxuICAgIHZlcnNpb25GaWxlLFxyXG4gICAgVml0ZVBXQSh7XHJcbiAgICAgIC8vIEEgbmV3IHZlcnNpb24gd2FpdHMgZm9yIHRoZSB1c2VyJ3MgXHUwMEFCXHUwNjI4XHUwNjQ3XHUyMDBDXHUwNjMxXHUwNjQ4XHUwNjMyXHUwNjMxXHUwNjMzXHUwNjI3XHUwNjQ2XHUwNkNDXHUwMEJCIChzcmMvc2VydmljZXMvd2ViVXBkYXRlLnRzKS5cclxuICAgICAgcmVnaXN0ZXJUeXBlOiAncHJvbXB0JyxcclxuICAgICAgZGV2T3B0aW9uczoge1xyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdHlwZTogJ21vZHVsZSdcclxuICAgICAgfSxcclxuICAgICAgaW5jbHVkZUFzc2V0czogW1xyXG4gICAgICAgICdmYXZpY29uLnN2ZycsXHJcbiAgICAgICAgJ2FwcGxlLXRvdWNoLWljb24ucG5nJyxcclxuICAgICAgICAncHdhLTE5MngxOTIucG5nJyxcclxuICAgICAgICAncHdhLTUxMng1MTIucG5nJyxcclxuICAgICAgICAncHdhLW1hc2thYmxlLTUxMng1MTIucG5nJ1xyXG4gICAgICBdLFxyXG4gICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgIGlkOiBiYXNlUGF0aCxcclxuICAgICAgICBuYW1lOiBhcHBOYW1lLFxyXG4gICAgICAgIHNob3J0X25hbWU6IGFwcE5hbWUsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdcdTA2MkRcdTA2MzNcdTA2MjdcdTA2MjggXHUwNkE5XHUwNjJBXHUwNjI3XHUwNjI4OiBcdTA2MkRcdTA2MzNcdTA2MjdcdTA2MjhcdTA2MkZcdTA2MjdcdTA2MzFcdTA2Q0MgXHUwNjM0XHUwNjJFXHUwNjM1XHUwNkNDIFx1MDYyOFx1MDYyNyBcdTA2MzBcdTA2MkVcdTA2Q0NcdTA2MzFcdTA2NDdcdTIwMENcdTA2MzNcdTA2MjdcdTA2MzJcdTA2Q0MgXHUwNjJGXHUwNjMxIFx1MDZBRlx1MDY0OFx1MDZBRlx1MDY0NCBcdTA2MzRcdTA2Q0NcdTA2MkEnLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzBmNzY2ZScsXHJcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmMGZkZmEnLFxyXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcclxuICAgICAgICBsYW5nOiAnZmEnLFxyXG4gICAgICAgIGRpcjogJ3J0bCcsXHJcbiAgICAgICAgc3RhcnRfdXJsOiBiYXNlUGF0aCxcclxuICAgICAgICBzY29wZTogYmFzZVBhdGgsXHJcbiAgICAgICAgaWNvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3JjOiAncHdhLTE5MngxOTIucG5nJyxcclxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcclxuICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICAgIHB1cnBvc2U6ICdhbnknXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxyXG4gICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJyxcclxuICAgICAgICAgICAgcHVycG9zZTogJ2FueSdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJ3B3YS1tYXNrYWJsZS01MTJ4NTEyLnBuZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnLFxyXG4gICAgICAgICAgICBwdXJwb3NlOiAnbWFza2FibGUnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICAvLyBMb25nLXByZXNzIG9uIHRoZSBob21lLXNjcmVlbiBpY29uOyBBcHAgcmVhZHMgYD9hY3Rpb249YCAodXNlTGF1bmNoQWN0aW9uKS5cclxuICAgICAgICBzaG9ydGN1dHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogJ1x1MDYyQlx1MDYyOFx1MDYyQSBcdTA2NDdcdTA2MzJcdTA2Q0NcdTA2NDZcdTA2NDcnLFxyXG4gICAgICAgICAgICB1cmw6IGAke2Jhc2VQYXRofT9hY3Rpb249ZXhwZW5zZWAsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICdzaG9ydGN1dC1leHBlbnNlLnBuZycsIHNpemVzOiAnOTZ4OTYnLCB0eXBlOiAnaW1hZ2UvcG5nJyB9XVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZTogJ1x1MDYyQlx1MDYyOFx1MDYyQSBcdTA2MkZcdTA2MzFcdTA2MjJcdTA2NDVcdTA2MkYnLFxyXG4gICAgICAgICAgICB1cmw6IGAke2Jhc2VQYXRofT9hY3Rpb249aW5jb21lYCxcclxuICAgICAgICAgICAgaWNvbnM6IFt7IHNyYzogJ3Nob3J0Y3V0LWluY29tZS5wbmcnLCBzaXplczogJzk2eDk2JywgdHlwZTogJ2ltYWdlL3BuZycgfV1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWU6ICdcdTA2N0VcdTA2Q0NcdTA2MjdcdTA2NDVcdTA2QTlcdTIwMENcdTA2NDdcdTA2MjdcdTA2Q0MgXHUwNjI4XHUwNjI3XHUwNjQ2XHUwNkE5XHUwNkNDJyxcclxuICAgICAgICAgICAgdXJsOiBgJHtiYXNlUGF0aH0/YWN0aW9uPXNtc2AsXHJcbiAgICAgICAgICAgIGljb25zOiBbeyBzcmM6ICdzaG9ydGN1dC1zbXMucG5nJywgc2l6ZXM6ICc5Nng5NicsIHR5cGU6ICdpbWFnZS9wbmcnIH1dXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICAvLyBBIGJhbmsgU01TIHNoYXJlZCBmcm9tIHRoZSBtZXNzYWdlcyBhcHAgcnVucyB0aHJvdWdoIHRoZSBiYW5rIFNNUyBwYXJzZXIuXHJcbiAgICAgICAgc2hhcmVfdGFyZ2V0OiB7XHJcbiAgICAgICAgICBhY3Rpb246IGAke2Jhc2VQYXRofT9zaGFyZT0xYCxcclxuICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICBwYXJhbXM6IHsgdGV4dDogJ3RleHQnIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICBnbG9iUGF0dGVybnM6IGNvbW1hbmQgPT09ICdzZXJ2ZScgPyBbXSA6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZjJ9J10sXHJcbiAgICAgICAgLy8gUERGIGV4cG9ydCBvbmx5OiBqc3BkZiwgaHRtbDJjYW52YXMgYW5kIHRoZWlyIGxhenkgZGVwcyAoRE9NUHVyaWZ5LFxyXG4gICAgICAgIC8vIGNhbnZnIGFzIGBpbmRleC5lc2ApLiBNb3N0IHNlc3Npb25zIG5ldmVyIGxvYWQgdGhlbSwgc28gdGhleSBhcmUgY2FjaGVkXHJcbiAgICAgICAgLy8gb24gZmlyc3QgdXNlIChydWxlIGJlbG93KSBpbnN0ZWFkIG9mIG9uIGluc3RhbGwuXHJcbiAgICAgICAgZ2xvYklnbm9yZXM6IFsnKiovbm9kZV9tb2R1bGVzLyoqLyonLCAuLi5wZGZFeHBvcnRDaHVua3MubWFwKG5hbWUgPT4gYCoqLyR7bmFtZX0qLmpzYCldLFxyXG4gICAgICAgIGFkZGl0aW9uYWxNYW5pZmVzdEVudHJpZXM6XHJcbiAgICAgICAgICBjb21tYW5kID09PSAnc2VydmUnID8gW10gOiBbeyB1cmw6ICd2ZXJzaW9uLmpzb24nLCByZXZpc2lvbjogYXBwVmVyc2lvbiB9XSxcclxuICAgICAgICBpbXBvcnRTY3JpcHRzOiBbJ3B1c2gtaGFuZGxlci5qcyddLFxyXG4gICAgICAgIC8vIFRoZSBkZXZlbG9wIGJ1aWxkIGlzIHNlcnZlZCB1bmRlciBgPGJhc2U+ZGV2L2AsIGluc2lkZSB0aGlzIHdvcmtlcidzIHNjb3BlLiBJdHNcclxuICAgICAgICAvLyBwYWdlcyBtdXN0IGNvbWUgZnJvbSB0aGUgbmV0d29yaywgbm90IGZyb20gdGhpcyBidWlsZCdzIGluZGV4Lmh0bWwuXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbbmV3IFJlZ0V4cChgXiR7YmFzZVBhdGh9ZGV2L2ApXSxcclxuICAgICAgICBydW50aW1lQ2FjaGluZzogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL3NoZWV0c1xcLmdvb2dsZWFwaXNcXC5jb21cXC8uKi9pLFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya09ubHknXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICAvLyBOb3QgYW5jaG9yZWQgYXQgdGhlIHN0YXJ0LCBzbyBXb3JrYm94IG9ubHkgbWF0Y2hlcyBzYW1lLW9yaWdpbiBVUkxzLlxyXG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiBwZGZFeHBvcnRDaHVua1BhdHRlcm4sXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICAgIGNhY2hlTmFtZTogJ3BkZi1leHBvcnQtY2h1bmtzJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMixcclxuICAgICAgICAgICAgICAgIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDkwLFxyXG4gICAgICAgICAgICAgICAgcHVyZ2VPblF1b3RhRXJyb3I6IHRydWVcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgXVxyXG59KSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sV0FBVztBQUNsQixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLG9CQUFpQztBQUMxQyxTQUFTLGVBQWU7QUFFeEIsSUFBTSxXQUFXLFFBQVEsSUFBSSxrQkFBa0I7QUFHL0MsSUFBTSxVQUFVLFFBQVEsSUFBSSxpQkFBaUIsUUFBUSw0REFBb0I7QUFHekUsSUFBTSxhQUFjLEtBQUssTUFBTSxhQUFhLGtCQUFrQixNQUFNLENBQUMsRUFDbEU7QUFNSCxJQUFNLGNBQXNCO0FBQUEsRUFDMUIsTUFBTTtBQUFBLEVBQ04sT0FBTztBQUFBLEVBQ1AsaUJBQWlCO0FBQ2YsU0FBSyxTQUFTO0FBQUEsTUFDWixNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixRQUFRLEtBQUssVUFBVSxFQUFFLFNBQVMsV0FBVyxDQUFDO0FBQUEsSUFDaEQsQ0FBQztBQUFBLEVBQ0g7QUFDRjtBQUdBLElBQU0sa0JBQWtCLENBQUMsU0FBUyxlQUFlLGFBQWEsVUFBVTtBQUN4RSxJQUFNLHdCQUF3QixJQUFJO0FB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
