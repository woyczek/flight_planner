# Flight Planner - bundled iOS app (Capacitor)

This folder wraps the static suite in a native iOS shell with [Capacitor](https://capacitorjs.com/). The web
code is **not** duplicated: the app bundles the site built by `tools/build_pages.py` (tracked files, `?v=` stamps,
no `data/`), exactly what GitHub Pages serves. It runs without a launcher and without a service worker; data is read
and written from the private GitHub data repository through `shared/github_data.js` (token entered in the app).

Nothing generated is versioned: `node_modules/`, `ios/` (the Xcode project) and `assets/` (icon sources) are
ignored and rebuilt on demand, locally or by the workflow.

| File | Role |
| --- | --- |
| `package.json` | Capacitor CLI, core, iOS platform and asset generator, pinned to exact versions (no lockfile) |
| `capacitor.config.json` | App id `org.sogvirtual.flightplanner`, name, web folder `../_site`, origin `capacitor://localhost` |

## Building locally (Mac with Xcode, Node 20, Python 3.12, CocoaPods)

From the `mobile/` folder:

```sh
npm install
npm run build                                       # builds the site into ../_site (python3 tools/build_pages.py)
npx cap add ios                                     # generates ios/ (first time only)

# icons and splash screens: a 1024x1024 PNG named assets/logo.png (and a copy as assets/icon-only.png)
brew install librsvg
mkdir -p assets
rsvg-convert -w 1024 -h 1024 ../assets/favicon-flight.svg -o assets/logo.png
cp assets/logo.png assets/icon-only.png
npx @capacitor/assets generate --ios --iconBackgroundColor '#101317' --iconBackgroundColorDark '#101317' \
  --splashBackgroundColor '#f5f6f8' --splashBackgroundColorDark '#101317'

npx cap sync ios                                    # copies ../_site into the app
plutil -replace CFBundleDisplayName -string "Flight Planner" ios/App/App/Info.plist
npx cap open ios                                    # opens Xcode: choose a simulator or a device, Run
```

After a change in the web code, run `npm run build` then `npm run ios:sync` and run again from Xcode. To run on a
physical device, select your team under Signing & Capabilities in Xcode.

## Building on GitHub Actions

`.github/workflows/ios.yml` ("iOS (appli)") runs on a `macos-14` runner (free: the repository is public) on every push
to `feature/mobile` that touches the app or the web code, and on demand (Actions > iOS (appli) > Run workflow).

- **Job `build`** (always): builds the site, generates the project, icons and splash screens as above, then makes an
  **unsigned simulator build** to check that the project compiles. The result is the artifact
  `FlightPlanner-simulator` (zip of `App.app`), which can be dropped onto an iOS simulator.
- **Job `testflight`** (only if the secret `ASC_KEY_ID` is set): same preparation, then a signed Release archive
  (automatic signing through an App Store Connect API key), export and upload to TestFlight.

The secrets and the one-time Apple prerequisites are described at the top of the workflow file and in
`docs/technique/APPLI_AUTONOME.md`, section 6.
