# Driver Spec Runner UI

Angular frontend for the PlaceOS Driver Spec Runner. The app lets a developer
select a driver, select the matching spec file, choose commits for each, run the
spec, and watch the compiler/test output stream back in the browser.

## What the App Talks To

The UI is a browser client for the Crystal runner in the repository root. It
calls the runner through same-origin endpoints:

- `GET /build/repositories` lists available driver repositories.
- `GET /build` lists drivers for the selected repository.
- `GET /build/:driver/commits` lists driver commit history.
- `GET /test` lists available `drivers/**/*_spec.cr` files.
- `GET /test/:spec/commits` lists spec commit history.
- `POST /test` runs a spec without live streaming.
- `WS /test/run_spec` runs a spec and streams live output.

During local development, `ng serve` uses `proxy.conf.js` to forward `/build`
and `/test` traffic to `localhost:8085`. Run the backend there, or update the
proxy target if your runner is bound to another port.

## Prerequisites

- Node.js and npm compatible with Angular 22.
- A running Driver Spec Runner backend with access to the PlaceOS driver
  repository and the PlaceOS Build service.
- Frontend dependencies installed with `npm install`.

## Local Development

From this directory:

```sh
npm install
npm start
```

Open `http://localhost:4200/`.

Useful routes:

- `/` opens the workbench with the default repository selected.
- `/:repo` opens the workbench for a repository.
- `/:repo/:driver` opens the workbench with a driver selected.

Example:

```text
http://localhost:4200/Public/drivers/example/example.cr
```

The app will reload when files under `src/` change.

## Backend Setup

The frontend proxy expects the runner on port `8085`. From the repository root,
one local option is:

```sh
shards install
crystal run src/app.cr -- --port=8085
```

If the backend aborts with a PlaceOS Build connection error, follow the driver
repository setup linked from the root README and confirm the build service is
healthy before starting the UI.

## Running Tests

```sh
npm test
```

Tests run through Angular's `@angular/build:unit-test` builder with Vitest.

## Building

```sh
npm run build
```

The production build is written to `dist/spec-runner-ui/browser`.

To serve the built app from the Crystal runner, point `PUBLIC_WWW_PATH` at that
directory before starting the backend:

```sh
PUBLIC_WWW_PATH=frontend/dist/spec-runner-ui/browser crystal run src/app.cr -- --port=8085
```

## Project Layout

- `src/app/workbench.component.ts` wires repository and driver route params into
  the workbench.
- `src/app/workbench-form.component.ts` renders repository, driver, spec, commit,
  and debug-symbol controls.
- `src/app/workbench-output.component.ts` runs specs, cancels active websocket
  runs, and renders terminal output.
- `src/app/services/build.service.ts` owns repository, driver, commit, and test
  status state.
- `src/app/services/test.service.ts` owns spec selection, spec commits, settings,
  and test execution.
- `public/assets/locales/` contains runtime translation files.
- `proxy.conf.js` controls local API and websocket proxying.

## Troubleshooting

- Empty repository or driver lists usually mean the Angular dev server cannot
  reach the backend target configured in `proxy.conf.js`.
- A websocket run that closes immediately usually means the backend could not
  compile either the selected driver or the selected spec.
- `DEBUG_WITH_API=1` in browser local storage makes the output panel use the
  non-streaming `POST /test` path instead of the websocket path.
- Test status badges are stored in browser local storage under
  `HARNESS.statuses`.
