import {SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER} from './render.js';

// Deterministic screenshot scenes. Heading always follows the flight
// model (heading = 74 + bank * 28, as in world.js) so the compass, the
// bank and the horizon gauge agree. Each scene flies a different part
// of the harbour — different plane position, altitude and distance, so
// the parallaxed terrain, harbour and runway compose differently in
// every shot. Items are placed so the ring, star, storm cloud, plane
// and UI never overlap.
export function stageShot(name, world) {
  world.reset();
  const s = world.state;

  if (name === 'play') {
    // High harbour cruise: gentle right bank in the UPPER band of the
    // frame at 2400 ft, so the set covers high / mid / low plane
    // positions across the four shots. Items ride at h = -1 — the top
    // of the world model's height range, level with the plane in
    // collision space — which keeps the course up by the dropped
    // horizon: two rings ahead in a near-concentric pair chained by
    // the guide line, star off the left wingtip, storm cell over the
    // harbour edge, and the +FUEL popup floats over the plane where a
    // ring pass would have spawned it.
    s.time = 24; s.left = 90 - s.time;
    s.score = 400; s.rings = 4; s.stars = 3;
    s.alt = 2400; s.speed = 198; s.fuel = 72; s.dist = 8.2;
    s.pitch = -0.15; s.bank = 0.18; s.heading = 79;
    s.x = 430; s.y = 250;
    s.items = [
      {kind: 'ring', z: 300, lane: 0.10, h: -1.00, done: false},
      {kind: 'ring', z: 850, lane: 0.34, h: -1.00, done: false},
      {kind: 'star', z: 520, lane: -1.15, h: -1.00, done: false},
      {kind: 'cloud', z: 760, lane: 1.38, h: 0.55, done: false},
    ];
    s.fx = [
      {x: 500, y: 168, text: '+FUEL', kind: 'fuel', t: 0.4, burst: false, seed: 1},
    ];
    return {screen: SCREEN_PLAY, best: 900};
  }

  if (name === 'rush') {
    // Low over the sea in a hard left bank at boost: the near ring is
    // centred exactly on the plane so it reads as threading it, the
    // far ring waits up-left along the turn with the lighthouse clear
    // between the two, and a PERFECT popup with its spark burst hangs
    // over the pass.
    s.time = 52; s.left = 90 - s.time;
    s.score = 750; s.rings = 7; s.stars = 3;
    s.alt = 780; s.speed = 242; s.fuel = 48; s.dist = 18.4;
    s.pitch = 0.32; s.bank = -1.05; s.heading = 45;
    s.x = 760; s.y = 430;
    s.boost = true;
    s.items = [
      {kind: 'ring', z: 170, lane: 0.32, h: 0.30, done: false},
      {kind: 'ring', z: 700, lane: -0.15, h: -0.55, done: false},
      {kind: 'star', z: 520, lane: -1.30, h: -0.50, done: false},
      {kind: 'cloud', z: 800, lane: 1.60, h: -0.60, done: false},
    ];
    s.fx = [
      {x: 655, y: 285, text: 'PERFECT!', kind: 'perfect', t: 0.35, burst: true, seed: 0.7},
      {x: 695, y: 515, text: '+100', kind: 'ring', t: 0.5, burst: true, seed: 2.1},
    ];
    return {screen: SCREEN_PLAY, best: 900};
  }

  if (name === 'end') {
    // High-altitude overview behind the logbook card: a clean 12/12
    // finish with time and fuel to spare, so the rank badge and the
    // itemised breakdown agree with the score. Ring low-left and star
    // right stay clear of the card, the button and the plane.
    s.time = 72; s.left = 18;
    s.score = 1698; s.rings = 12; s.stars = 5;
    s.alt = 2400; s.speed = 205; s.fuel = 34; s.dist = 31.6;
    s.pitch = -0.10; s.bank = 0.22; s.heading = 80;
    s.x = 690; s.y = 540;
    s.items = [
      {kind: 'ring', z: 430, lane: -1.15, h: 0.50, done: false},
      {kind: 'star', z: 700, lane: 1.38, h: 0.80, done: false},
    ];
    return {screen: SCREEN_OVER, best: 1698};
  }

  // title: takeoff approach — hero plane low on the runway under the
  // emblem, ring ahead, star off to the right. cloudShift parks the
  // cloud lattice so only one cloud sits behind the lettering (the
  // fixed lattice cannot clear the title box completely), and the
  // navy-stroked title stays crisp over it.
  s.time = 2;
  s.alt = 700; s.speed = 150;
  s.pitch = -0.05; s.bank = 0.25; s.heading = 81;
  s.x = 640; s.y = 485;
  s.dist = 3; s.cloudShift = 800;
  s.items = [
    {kind: 'ring', z: 300, lane: 0.02, h: -0.05, done: false},
    {kind: 'ring', z: 920, lane: -0.42, h: 0.20, done: false},
    {kind: 'star', z: 640, lane: 0.95, h: 0.35, done: false},
  ];
  return {screen: SCREEN_TITLE, best: 900};
}
