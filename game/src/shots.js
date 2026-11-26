import {SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER} from './render.js';

// Deterministic screenshot scenes. Heading always follows the flight
// model (heading = 74 + bank * 28, as in world.js) so the compass, the
// bank and the horizon gauge agree. Items are placed so the ring, star,
// storm cloud, plane and UI never overlap.
export function stageShot(name, world) {
  world.reset();
  const s = world.state;

  if (name === 'play') {
    // Gentle right bank, two rings ahead in a near-concentric course,
    // star clear on the left, storm cloud clear on the right.
    s.time = 24; s.left = 90 - s.time;
    s.score = 400; s.rings = 4; s.stars = 3;
    s.alt = 1420; s.speed = 198; s.fuel = 72; s.dist = 8.2;
    s.pitch = -0.15; s.bank = 0.18; s.heading = 79;
    s.x = 545; s.y = 465;
    s.items = [
      {kind: 'ring', z: 260, lane: 0.22, h: -0.35, done: false},
      {kind: 'ring', z: 820, lane: 0.42, h: -0.55, done: false},
      {kind: 'star', z: 600, lane: -0.55, h: -0.45, done: false},
      {kind: 'cloud', z: 700, lane: 1.05, h: 0.75, done: false},
    ];
    return {screen: SCREEN_PLAY, best: 900};
  }

  if (name === 'rush') {
    // Hard left bank at speed: plane threads the huge near ring (its
    // front arc is redrawn over the plane), far ring in the same line,
    // star far left, storm cloud low right.
    s.time = 52; s.left = 90 - s.time;
    s.score = 750; s.rings = 7; s.stars = 3;
    s.alt = 1680; s.speed = 242; s.fuel = 48; s.dist = 18.4;
    s.pitch = 0.32; s.bank = -1.05; s.heading = 45;
    s.x = 690; s.y = 435;
    s.items = [
      {kind: 'ring', z: 170, lane: -0.30, h: -0.25, done: false},
      {kind: 'ring', z: 760, lane: -0.58, h: -0.55, done: false},
      {kind: 'star', z: 520, lane: -1.15, h: -0.75, done: false},
      {kind: 'cloud', z: 900, lane: 1.15, h: 0.90, done: false},
    ];
    return {screen: SCREEN_PLAY, best: 900};
  }

  if (name === 'end') {
    // Result card on top; ring low-left and star right stay clear of the
    // card and the FLY AGAIN button.
    s.time = 90; s.left = 0;
    s.score = 1150; s.rings = 10; s.stars = 5;
    s.alt = 1520; s.speed = 205; s.fuel = 22; s.dist = 31.6;
    s.pitch = -0.10; s.bank = 0.22; s.heading = 80;
    s.x = 640; s.y = 505;
    s.items = [
      {kind: 'ring', z: 430, lane: -0.95, h: 0.35, done: false},
      {kind: 'star', z: 760, lane: 0.95, h: 0.15, done: false},
    ];
    return {screen: SCREEN_OVER, best: 1150};
  }

  // title: hero plane low on the runway under the emblem, ring ahead,
  // star off to the right, nothing touching the title or the button.
  s.time = 2;
  s.pitch = -0.22; s.bank = 0.25; s.heading = 81;
  s.x = 640; s.y = 485;
  s.items = [
    {kind: 'ring', z: 300, lane: 0.02, h: -0.05, done: false},
    {kind: 'ring', z: 920, lane: -0.42, h: 0.20, done: false},
    {kind: 'star', z: 640, lane: 0.78, h: 0.35, done: false},
  ];
  return {screen: SCREEN_TITLE, best: 900};
}
