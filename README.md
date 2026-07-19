# FILMOGRAPHIE RAISONNÉE

A wiki-style, citation-first online archive of **Arab women filmmakers** (Tunisia / Egypt / Lebanon, 1967–2020), built entirely from Mathilde Rouxel's PhD thesis.

> **Source Nº 001** — Mathilde Rouxel, *Figures du peuple en lutte. Des pionnières du cinéma arabe aux réalisatrices postrévolutionnaires (Tunisie / Égypte / Liban, 1967-2020)*, Université Sorbonne Nouvelle – Paris 3, 2020. HAL: [tel-03425456](https://theses.hal.science/tel-03425456v1)

The site is named after the thesis's dictionary chapter, **« Filmographie raisonnée »** (pp. 730–972): **206 filmmaker entries** and **1,149 films**, plus **24 long-form profiles with interviews**, a **1940–2020 chronology**, and the full **bibliography** — all parsed from the thesis and cited back to it.

## Stack

React 19 + TypeScript + Vite 7 + Tailwind CSS 3.4 (static build). No backend — content ships as JSON in `public/data/`, fetched client-side. Black/white/red archive-catalog design, dark "Screening Room" mode, French source content with English UI.

## How the data works

`public/data/` is **generated, not committed** (see `.gitignore`). Regenerate it anytime from the canonical source:

```bash
sudo apt-get install -y poppler-utils   # pdftotext
bash scripts/fetch-data.sh              # downloads the thesis from HAL, parses into public/data/*.json
```

`scripts/parser.py` extracts the Filmographie raisonnée (206 entries), the 24 Biographies et entretiens, the Chronologie and the Bibliographie from the thesis text. Every film record keeps its original raw text, so nothing is lost.

## Local development

```bash
bash scripts/restore-assets.sh   # decode brand assets into public/
bash scripts/fetch-data.sh       # generate public/data/ (or copy existing JSONs there)
npm ci
npm run dev
```

## Deployment to OVHcloud (Pro hosting) via GitHub Actions

Every push to `main` builds the site and uploads `dist/` to your OVHcloud hosting over FTP (`.github/workflows/deploy-ovh.yml`).

**One-time setup:**

1. In your [OVHcloud Control Panel](https://www.ovh.com/manager/) → **Web Cloud → Hosting → your plan → FTP-SSH** tab, note the FTP server (e.g. `ftp.cluster0XX.hosting.ovh.net`), login and password. Make sure your domain's **root folder** (e.g. `www`) is set under the **Multisite** tab.
2. In this GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:
   | Secret | Example |
   |---|---|
   | `FTP_SERVER` | `ftp.cluster0XX.hosting.ovh.net` |
   | `FTP_USERNAME` | your OVH FTP login |
   | `FTP_PASSWORD` | your OVH FTP password |
   | `FTP_SERVER_DIR` | `/www/` (the multisite root folder, with slashes) |
3. Push to `main` (or run the workflow manually via **Actions → Build & Deploy to OVHcloud → Run workflow**).

The workflow restores brand assets, downloads & parses the thesis data, runs `npm ci && npm run build`, then FTP-deploys `dist/` — including the bundled `.htaccess` that makes SPA routes work on OVH's Apache.

## Design

- Paper white `#FAFAF7`, ink `#111111`, signal red `#D81E1E` (rationed). No gradients.
- Oswald (display) · Source Serif 4 (French editorial) · Inter (UI) · IBM Plex Mono (metadata/citations) · Noto Naskh Arabic.
- Film-strip filmographies, catalog numbering Nº 001–206, sidenote-style citations on every page.

## License & attribution

Content is extracted and quoted from the thesis for scholarly/archival purposes — always cite Rouxel (2020), HAL tel-03425456. This project is an independent archive initiative, not affiliated with the author or the university.
