# Reel demo

A static, backend-free demo of Reel's landing page and dashboard. A mock API in the browser
(`web/src/mock/`) answers every request and keeps its data in `localStorage`.

```
cd web && npm ci && npm run build:demo   # output in web/dist-demo
```

Pushes to `main` are published with GitHub Pages (Settings → Pages → Source: GitHub Actions).
