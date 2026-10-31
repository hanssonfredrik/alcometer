# Promilla

A private drink journal for your phone. You log what you drink, see an
estimate of your evening, and build streaks of alcohol-free days. Everything
stays on the device and it works offline.

It is one React + Vite codebase that ships as a web app (PWA) and as native
iOS and Android apps through [Capacitor](https://capacitorjs.com/).

**[Try the web app](https://app.promilla.se/)** · [promilla.se](https://www.promilla.se/)

## Run it

You need [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Commands

| Command              | What it does                                                 |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Dev server with hot reload                                   |
| `npm run build`      | Production build to `dist/`, including the service worker    |
| `npm run preview`    | Serves `dist/`. Use this to test offline and install         |
| `npm test`           | Unit tests in watch mode (`npm run test:run` runs them once) |
| `npm run lint`       | ESLint                                                       |
| `npm run format`     | Prettier                                                     |
| `npm run icons`      | Rebuilds every app icon and splash from `assets/*.svg`       |
| `npm run sync`       | Builds and copies the web app into `ios/` and `android/`     |
| `npm run android`    | Syncs, then runs on an Android emulator or device            |
| `npm run store`      | Rebuilds the App Store and Google Play screenshots           |

The service worker only runs in a build, so test offline behavior with
`npm run build && npm run preview`, not `npm run dev`.

## How it's built

```
src/
  App.jsx       The shell: header, the four tabs, bottom nav
  screens/      Today, History, Insights, Settings
  components/   Shared pieces (the gauge, the curve, the log sheet, ...)
  lib/          Pure logic with unit tests (the estimate, dates, storage)
  hooks/        useTracker: the one store for all data
```

`CLAUDE.md` has the full architecture, the data model and the conventions.

## Native apps

`ios/` and `android/` are thin Capacitor shells around the same `dist/` build.
There is no separate mobile code. On a phone, data goes to the platform's
own storage instead of the browser's.

- **Android:** run `npm run android`, or download the APK from the
  *Android* GitHub Actions workflow.
- **iOS:** the *iOS (TestFlight)* workflow builds and uploads it from a macOS
  runner, so you don't need a Mac.

Store setup is in [`docs/SUBMISSION.md`](docs/SUBMISSION.md). Screenshots,
icons and the listing text are in [`store/`](store/README.md).

## The estimate

The ‰ level uses the Widmark formula:

$$\text{BAC} = \frac{A}{r \cdot w} - \beta \cdot t$$

$A$ is grams of alcohol so far, $r$ the body-water ratio (0.68 for men, 0.55
for women), $w$ your weight in kg, $t$ the hours since your first drink, and
$\beta$ = 0.15 ‰ per hour.

It is an estimate, and your real level can be quite different. Never use it
to decide whether you can drive.

## Privacy

There is no account, no server and no tracking. Your data never leaves your
device unless you save a backup or export a CSV yourself. The full policy is
in [`public/privacy.html`](public/privacy.html).
