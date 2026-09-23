# GZCLP Tracker

An offline workout tracker for a GZCLP-style program with two days and four rotating sessions (A1, B1, A2, B2). It is a Progressive Web App - it installs on Android from Chrome, runs full screen with its own icon, and keeps all data on the phone in IndexedDB.

Pushing to `main` deploys the site to GitHub Pages - see Deploying below.

## Deploying

The app is a static site. Any static host works, as long as it serves over HTTPS. The host is only needed to install and update the app - it plays no part in storing data.

### GitHub Pages

The repository includes a workflow (`.github/workflows/deploy.yml`) that tests, builds and deploys the site on every push to `main`.

1. Create an empty repository on GitHub, for example `gzclp-tracker`.
2. Push this project to it:

   ```sh
   git remote add origin https://github.com/<user>/gzclp-tracker.git
   git push -u origin main
   ```

3. In the repository, open Settings > Pages and set Source to GitHub Actions.
4. Re-run the workflow from the Actions tab if the first run finished before Pages was enabled.

The site is then live at `https://<user>.github.io/gzclp-tracker/`. All paths are relative, so the sub-path works without configuration. Every later push to `main` redeploys, and the installed app picks up the new version the next time it opens.

### Netlify or Cloudflare Pages

Drag `dist/` onto the Netlify dashboard, or connect the repository with build command `npm run build` and output directory `dist`.

## Installing on Android

1. Open the deployed URL in Chrome.
2. Open the menu and tap Install app.
3. Open the app once while online so the service worker caches everything. It works offline from then on.

## Updating

Change the code, run `npm run build` and redeploy. The next time the app comes to the foreground it downloads the new version in the background and shows a "A new version is ready" prompt. Tapping Reload switches over. Data is unaffected.

## Backups

Data lives only on the phone. Uninstalling the app, clearing Chrome's site data or losing the phone erases it. Settings has an export to a JSON file and an import that restores from one. The app nudges for a backup after 7 days without one.

## Development

```sh
npm install
npm test          # progression engine tests
npm run typecheck
npm run build     # outputs dist/
npm run preview   # serves dist/ locally
npm run dev       # unminified build with source maps, then serves it
```

The service worker only registers over HTTPS or on `localhost`. When testing on a phone against a local build, use a tunnel or deploy to a preview URL.

### Fonts

By default the app loads Barlow, Barlow Condensed and Rock Salt from Google Fonts on first launch, and the service worker caches them for offline use. To bundle them with the app instead:

```sh
npm run fonts
npm run build
```

The build uses local fonts whenever `static/fonts/fonts.css` exists.

### Icons

The PNG icons in `static/icons/` are rendered from `icon.svg` and `maskable.svg`. To regenerate them after editing the SVGs, install `sharp` and run `node scripts/icons.mjs`.

## Project layout

| Path | Contents |
| --- | --- |
| `src/engine/` | Pure progression logic - schemes, weights, rotation, estimates, session finish. Covered by `engine.test.ts`. |
| `src/data/` | App state, IndexedDB persistence, actions, built-in quotes and the starter program. |
| `src/ui/` | React screens and components. |
| `static/` | Manifest, icons and the service worker template. |
| `build.mjs` | esbuild bundle, `index.html` and service worker generation. |

## Progression rules

- T1 heavy track runs 3×5, 4×4, 5×3. T1 volume track and T2 run 3×10, 3×8, 3×6.
- Hitting every rep adds one increment next time at the same stage.
- Missing any rep keeps the weight and stage. The next time that lift is opened, the app offers to drop a stage. Failing the last stage offers a deload to the first stage at 85% (configurable), rounded down to an achievable weight.
- T3 is 2×8-15 with an AMRAP last set. 15 on the first set and at least 12 on the AMRAP moves the weight up. T3 never prompts or deloads.
- Moving up is automatic. Moving down always needs confirmation.
- Each slot, and each track of a main lift, progresses independently. Skipped lifts are left unchanged.
- Plate machines use every weight their plates and add-ons can make, and step to the next one up.
- Bodyweight exercises have no weight. Every set is AMRAP (set count per exercise, default 3) and each set's target is the reps from that set last time. Beating last time's total counts as moving up. Bodyweight exercises use this scheme at any tier and never prompt or deload.

## Claude artifact version

`npm run build:artifact` (or `node build-artifact.mjs`) produces `artifact/gzclp-tracker.html`, a single-file build for publishing as a Claude artifact. It bundles React inline, skips the service worker, and saves to the artifact's database instead of the browser - `app/program`, `app/active` and one `sessions/<id>` document per finished session. Backups go through the viewer's download prompt. Entry point: `src/artifact-main.tsx`.

## Notes on the build

The plan specified Preact, Dexie and Vite. This build uses React, a small hand-written IndexedDB store and a plain esbuild script instead, because only those packages were available when it was built. The app behaves the same. React adds roughly 60 KB gzipped over Preact, which has no practical effect once the app is cached.
