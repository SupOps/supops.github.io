# supops.github.io

The website for [SupOps](https://github.com/SupOps/SupOps), open-source AIOps that asks first.
Live at **https://supops.github.io**.

Plain HTML, CSS and a little JavaScript: no build step, no dependencies, no tracking.

```
index.html          the page
404.html            not found
assets/css/site.css styles (the same design tokens as the app)
assets/js/site.js   the demo run, screenshot tabs, copy button, forecast chart
assets/img/         logo, icons, screenshots (demo data only), og.png (link preview)
assets/fonts/       Outfit and JetBrains Mono (SIL Open Font License)
```

Preview locally:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Pushing to `main` publishes the site (Settings → Pages → Deploy from a branch → `main` / root).

Screenshots must only ever show demo data: never real hostnames, IPs or company names.

Content is licensed Apache-2.0, like SupOps. The fonts keep their own licences (see `assets/fonts/`).
