# I-SAW Portal

A public-facing web portal for **I-SAW: Infrastructure for Sensing and Analytics on Wildlife** — a plug-and-play, edge-networked wildlife sensing platform built for K-12 camps, citizen scientists, and field researchers. The portal presents the project vision, an interactive "Smart Honeypot" data sandbox with analytics dashboards, and an onboarding hub where visitors can download a deployment script, generate a device `config.json`, or request a prebuilt field kit.

**Tags:** Software, Animal-Ecology, Visual-Analytics


### License

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

## References

https://github.com/ICICLE-ai/training-catalog/blob/docusaurus-demo/.claude/skills/icicle-readme-skill/templates/README.md
https://github.com/ICICLE-ai/training-catalog/blob/docusaurus-demo/.claude/skills/icicle-component-info-skill/templates/component-info.yaml
https://github.com/xw0108/Backpack

## Acknowledgements

*National Science Foundation (NSF) funded AI institute for Intelligent Cyberinfrastructure with Computational Learning in the Environment (ICICLE) (OAC 2112606)*

## Issue reporting

Please open an issue at <https://github.com/ICICLE-ai/I-SAW_Portal/issues>.

---

# Tutorials

## Run the portal locally

This walkthrough takes you from a fresh clone to the portal running in your browser.

### Prerequisites

- **Node.js 20 or newer** (the Docker build uses `node:20-alpine`; the ICICLE service definition targets Node 24)
- **npm** (ships with Node.js)
- Git

### Steps

1. **Clone the repository and enter it.**

   ```bash
   git clone https://github.com/ICICLE-ai/I-SAW_Portal.git
   cd I-SAW_Portal
   ```

2. **Install dependencies.**

   ```bash
   npm install
   ```

3. **Start the development server.**

   ```bash
   npm run dev
   ```

   Vite serves the app on port `3000` and binds to `0.0.0.0`, so it is reachable both at `http://localhost:3000` and from other machines on your network.

4. **Open `http://localhost:3000`** in a browser.

### What you should see

A dark, full-screen single-page app with an animated canvas background and a three-tab header:

| Tab | Header label | Contents |
| --- | --- | --- |
| 1 | Project Vision & Strategic Pillars | The I-SAW mission plus three pillars — Networking, Smart Sensing, Innovative Hardware |
| 2 | Data Sandbox & Functional Capabilities | Sub-tabs for *The Smart Honeypot*, *Analytics*, and *Gesture Drone Control* |
| 3 | Onboarding Hub | Sub-tabs for *Quick Start*, *DIY Hardware*, and *Request Kit* |

On narrow screens the tab bar collapses into a dropdown selector.

## Take the guided tour of the sandbox

1. Open **Data Sandbox & Functional Capabilities → The Smart Honeypot.** Step through the honeypot slideshow to see the feeder illustration, the sensor deployment map, and the three-stage confirmation pipeline (visual detection → audio confirmation → footfall confirmation).
2. Switch to **Analytics.** You get metric cards (total visits, species detected, feed time, peak activity), a visits-over-time chart, an activity heatmap, a species visit summary table, and smart alerts — all rendered with Tailwind utilities and inline SVG, no charting library.
3. Switch to **Gesture Drone Control** for the interactive command matrix and the detection-engine specs.
4. Move to the **Onboarding Hub → Quick Start** and click *Get Deployment Package*. The browser generates and downloads `setup-drone.sh` client-side.
5. In **DIY Hardware**, click *Generate sample config.json file* to download a provisioning payload describing the MQTT broker, hardware modes, and cloud endpoint.

> All data shown in the sandbox is illustrative and generated in the browser. The portal does not currently connect to live sensors or a backend API.

---

# How-To Guides

## Build a production bundle

```bash
npm run build
```

The static site is emitted to `dist/`. Preview the built output with:

```bash
npm run preview
```

## Type-check the project

There is no separate test suite; type-checking is the gate:

```bash
npm run lint
```

This runs `tsc --noEmit` against `tsconfig.json`.

## Build and run with Docker

The `Dockerfile` is a two-stage build: Node builds the Vite bundle, then nginx serves `dist/` on port 80 with an SPA fallback (`try_files $uri $uri/ /index.html`, see `nginx.conf`).

```bash
docker build -t i-saw-portal .
```

```bash
docker run --rm -p 8080:80 i-saw-portal
```

Then open `http://localhost:8080`.

To stamp the image with the commit it was built from, pass the build argument:

```bash
docker build --build-arg BUILD_SHA=$(git rev-parse --short HEAD) -t i-saw-portal .
```

## Deploy to ICICLE infrastructure

Deployment is automated. `.github/workflows/deploy.yaml` runs on every push to `main` (and can be triggered manually from the Actions tab) and calls the shared reusable workflow `icicle-ai/cicd-templates/.github/workflows/deploy-service.yaml@main`.

The workflow needs three repository secrets:

- `TAPIS_TOKEN`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`

Service identity and runtime come from `icicle-service.yaml`:

| Field | Value |
| --- | --- |
| `service-name` | `i-saw-frontend` |
| `service-version` | `0.1.0` |
| `project-name` | `icicle-project` |
| `pod-name` | `isawfrontendprod` |
| `runtime-type` | `node-frontend` |
| `runtime-version` | `24.18` |

Bump `service-version` in that file when you cut a new release.

## Configure environment variables

Copy the example file if you need local overrides:

```bash
cp .env.example .env
```

`.env.example` documents `GEMINI_API_KEY` and `APP_URL`, which the AI Studio hosting environment injects at runtime. Neither variable is read by the current `src/` code — the portal builds and runs without a `.env` file. Never commit real secrets.

## Disable hot module reload

Agent-driven editing environments can flicker under HMR. Set `DISABLE_HMR=true` before starting the dev server to turn off both HMR and file watching (see `vite.config.ts`):

```bash
DISABLE_HMR=true npm run dev
```

## Work on the right files (team ownership)

This repository enforces per-tab file ownership to avoid merge conflicts. Before editing, check `CLAUDE.md` for the current rules:

| Tab | Owner | Primary file |
| --- | --- | --- |
| 1 — Infrastructure / Vision | All team members | `src/components/TabVision.tsx` |
| 2 — Smart Honeypot & Analytics | Manas | `src/components/TabSandbox.tsx` |
| 3 — Onboarding Hub | Jacob | `src/components/TabOnboarding.tsx` |

`src/App.tsx` and `src/components/CanvasBackground.tsx` are global; change them only with team agreement.

## Troubleshooting

- **Port 3000 already in use** — edit the `dev` script in `package.json`, or run `npx vite --port=3001`.
- **A route 404s behind your own web server** — the app is a client-side SPA. Rewrite unknown paths to `index.html`, as `nginx.conf` does.
- **`npm run lint` fails after adding a package** — install the matching `@types/*` package.
- **New dependency rejected in review** — the project deliberately limits itself to React, Tailwind, `lucide-react`, and `motion`. Add heavier libraries only with team sign-off.

---

# Explanation

## What I-SAW is

I-SAW ("Infrastructure for Sensing and Analytics on Wildlife") is an edge-networked wildlife observation stack. Its centerpiece is a **smart honeypot** — an open, see-through bird feeder with no cameras inside it, so birds stay in unobstructed natural context while surrounding sensors do the observing.

Three ideas drive the design:

- **Cross-modal wake-ups ("Bullseye Ambush").** Ultra-low-power audio sentinels listen continuously and wake high-power camera traps over a local MQTT channel only when something is detected. Power, not compute, is the binding constraint in the field.
- **Three-step verification.** A visit is confirmed by (1) visual detection from wide-angle AI edge cameras, (2) audio matching of bird song against species call libraries, and (3) footfall sensors on each perch proving a physical landing. Any one channel alone produces false positives; agreement across three modalities does not.
- **Privacy at the edge.** Reduction happens on-device, so raw imagery and audio need not leave the deployment site. Only reduced observations travel onward to the hosted cyberinfrastructure.

## What this repository is

This repository is the **portal**, not the sensing stack. It is a static React single-page app whose job is communication and conversion: explain the project to NSF program managers and K-12 camp counselors, demonstrate the analytics value with a realistic mockup, and hand developers a concrete next step. All sensor data in the sandbox is synthetic and generated in the browser.

## Architecture

```
index.html
└── src/main.tsx                     React 19 entry point
    └── src/App.tsx                  Layout, header, footer, tab state
        ├── components/CanvasBackground.tsx   Animated background (global)
        ├── components/TabVision.tsx          Tab 1 — vision & pillars
        ├── components/TabSandbox.tsx         Tab 2 — honeypot, analytics, drone
        └── components/TabOnboarding.tsx      Tab 3 — quick start, DIY, kit request
```

Tab state is a single `useState` in `App.tsx`; there is no router, no global store, and no data-fetching layer. Each tab owns its own sub-tab state locally. That flatness is intentional — it lets three people edit three files without stepping on each other.

Supporting files:

| File | Role |
| --- | --- |
| `vite.config.ts` | Vite + React + Tailwind v4 plugin, `@` path alias, HMR kill-switch |
| `Dockerfile` / `nginx.conf` | Two-stage build; nginx serves the SPA |
| `icicle-service.yaml` | ICICLE service identity and runtime declaration |
| `.github/workflows/deploy.yaml` | Deploys via the shared ICICLE CI/CD template |
| `CLAUDE.md` | Team ownership rules and design conventions |

## Design choices

- **Static over dynamic.** With no backend, the portal ships as an nginx-served bundle, deploys in seconds, and never exposes a data path that could leak field observations.
- **Tailwind-only visualization.** The dashboards, heatmaps, and feeder illustrations are hand-built with Tailwind utilities and inline SVG rather than a charting library. This keeps the bundle small, keeps the visuals on-brand ("nature meets edge AI": deep forest greens, stone/slate darks, glowing emerald accents), and avoids dependency churn in a repo edited by several people at once.
- **Client-side file generation.** `setup-drone.sh` and `backpack-config.json` are assembled in the browser with a `Blob` and an object URL, so downloads work with zero server involvement.
- **Motion, used sparingly.** `motion/react` handles tab cross-fades and slide transitions only.
- **A deliberately narrow dependency set.** React, Tailwind, `lucide-react`, and `motion`. New heavy dependencies require team permission.
