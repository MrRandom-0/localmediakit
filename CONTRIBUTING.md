# Contributing to LocalMediaKit

Thanks for being here. LocalMediaKit exists so ordinary people can handle
their photos, videos and captions without uploading them to ad-funded
converter sites — contributions that protect that promise are very welcome.

## Ground rules

- **Privacy is the product.** Never add analytics, tracking, or any network
  call that could carry a user's file (or facts about it) off the device.
  A feature that needs a server is a feature we don't ship.
- **Every tool must actually work.** No stubs, no greyed-out "coming soon"
  buttons. Small and finished beats large and hypothetical.
- **The pure logic goes in `src/lib/`, the UI stays thin.** If a piece of
  behaviour can be expressed as a pure function, it lives in `lib` and gets
  unit tests. This is what keeps the project maintainable by very few people.

## Development setup

You need Node.js 20 or newer (the project is developed on Node 24).

```bash
git clone https://github.com/MrRandom-0/localmediakit.git
cd localmediakit
npm install
npm run dev        # http://localhost:5173 — COOP/COEP headers included
```

Useful commands:

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Dev server with hot reload                    |
| `npm run test`     | Unit tests (Vitest)                           |
| `npm run lint`     | ESLint                                        |
| `npm run build`    | Type-check + production build into `dist/`    |
| `npm run preview`  | Serve the production build locally            |
| `npm run format`   | Prettier over the whole repo                  |

Before opening a PR, `npm run test`, `npm run lint` and `npm run build` must
all pass. CI runs the same three.

## Good first issues

Look for the `good first issue` label. Typical starter work:

- New resize/format presets in Image Studio (pure-function change + tests)
- Subtitle edge cases (odd files welcome — attach a small sample)
- README translations and documentation fixes
- Accessibility passes: labels, focus order, contrast

If you're new to the codebase, the subtitle library
(`src/lib/subtitles.ts`) is the friendliest place to start: it's small,
fully tested, and every behaviour is visible from the UI in seconds.

## Pull requests

1. Fork, branch from `main`, keep the PR focused on one thing.
2. Explain *why* in the PR description, not only *what*.
3. Add or update tests for anything in `src/lib/`.
4. Don't add a new runtime dependency without discussing it in an issue
   first — bundle size is a feature here, and lazy loading is our usual
   answer for heavy libraries (see how Whisper is loaded).
5. Be kind in review. Assume the other person is smart and missing context,
   because that's usually true.

## Reporting bugs

Use the bug report template. The most useful thing you can include is a
small sample file that reproduces the problem (please don't attach anything
private — generate a throwaway clip/photo instead).

## A note on media test files

Never commit real people's photos or recordings as test fixtures. Synthetic
or self-created samples only.
