# sky-harbor-rings

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/ishiemon/sky-harbor-rings/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/ishiemon/sky-harbor-rings/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Sky Harbor Rings is an original flight game that plays offline in a desktop
browser. Chase view behind a red prop plane over a recognisable harbor:
runway ahead, a river, a town, golden fields and mountains. Steer through
12 golden rings, collect stars, and avoid storm clouds before the
90-second clock and fuel run out. The HUD always shows score, rings,
altitude, speed and heading, with lit instruments — airspeed and altitude
dials, an artificial horizon, a fuel gauge and lives — along the bottom.
All art is drawn in code: no image, sound or font files, no network requests.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Keys: Arrows / WASD steer, `Shift` speeds up, `P` pauses.
Mouse: hold and drag to steer toward the pointer.

To hand the game in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — copies `game/` and `screenshots/` to the output folder and
  writes `dossier.json` with the vendored make.fun library.
- `game/` — the playable game, plain static files, no build step.
  - `game/src/config.js` — field, run clock, lives
  - `game/src/world.js` — flight model, rings, stars, storm clouds, fuel
  - `game/src/render.js` — terrain, runway, plane, HUD and instruments
  - `game/src/input.js` — keyboard and mouse
  - `game/src/shots.js` — deterministic scenes used for the screenshots
- `screenshots/` — real renders of the game in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
