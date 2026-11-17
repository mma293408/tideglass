'use strict';

const directions = Object.freeze({
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
  down: [0, 1],
  hold: [0, 0],
});

const chartLocks = new WeakMap();

function usesTides(chart) {
  if (!chartLocks.has(chart)) {
    chartLocks.set(chart, chart.waters.some(board => board.some(row => /[EF]/.test(row))));
  }
  return chartLocks.get(chart);
}

function homePosition(board, marker) {
  const row = board.findIndex(line => line.includes(marker));
  if (row === -1) throw new Error('Each chart needs a ' + marker + ' marker');
  return { x: board[row].indexOf(marker), y: row };
}

function castOff(chart) {
  return {
    boats: chart.waters.map(board => ({
      ...homePosition(board, 'S'),
      angle: 0,
      moored: false,
      lit: false,
    })),
    turns: 0,
    tide: 0,
  };
}

function isPassable(tile, tide) {
  if (!tile || tile === '#') return false;
  if (tile === 'F') return tide === 0;
  if (tile === 'E') return tide === 1;
  return true;
}

function followOrder(boat, board, tide, dx, dy) {
  if (boat.moored || (dx === 0 && dy === 0)) return boat;
  const x = boat.x + dx;
  const y = boat.y + dy;
  const tile = board[y]?.[x];
  if (!isPassable(tile, tide)) return boat;
  return {
    x, y,
    angle: Math.atan2(dx, -dy),
    lit: tile === '*' || boat.lit,
    moored: tile === 'H',
  };
}

function steer(chart, snapshot, order) {
  const [horizontal, vertical] = directions[order];
  const [direct, reflected] = snapshot.boats;
  const [blue, rose] = chart.waters;
  const boats = [
    followOrder(direct, blue, snapshot.tide, horizontal, vertical),
    followOrder(reflected, rose, snapshot.tide, -horizontal, vertical),
  ];
  const tidal = usesTides(chart);
  if (!tidal && boats[0] === direct && boats[1] === reflected) return snapshot;
  return { boats, turns: snapshot.turns + 1, tide: tidal ? snapshot.tide ^ 1 : 0 };
}

function berthCount(snapshot) {
  return Number(snapshot.boats[0].moored) + Number(snapshot.boats[1].moored);
}

function lightCount(snapshot) {
  return Number(snapshot.boats[0].lit) + Number(snapshot.boats[1].lit);
}

function routeMedal(chart, snapshot) {
  const bothLights = lightCount(snapshot) === snapshot.boats.length;
  return 1 + Number(bothLights) + Number(snapshot.turns <= chart.par);
}

function searchKey(snapshot) {
  const vesselKey = boat => boat.x + ',' + boat.y + (boat.lit ? '*' : '.');
  return snapshot.tide + '|' + snapshot.boats.map(vesselKey).join('|');
}

function scoutRoute(chart, snapshot) {
  const frontier = [{ snapshot, firstOrder: null }];
  const seen = new Set([searchKey(snapshot)]);
  const orders = usesTides(chart) ? Object.keys(directions) : ['up', 'left', 'right', 'down'];
  let fallback = null;
  for (let head = 0; head < frontier.length; head++) {
    const point = frontier[head];
    if (berthCount(point.snapshot) === 2) {
      fallback ??= point;
      if (lightCount(point.snapshot) === 2 && point.snapshot.turns <= chart.par) return point;
      continue;
    }
    if (fallback && point.snapshot.turns >= chart.par) break;
    for (const order of orders) {
      const next = steer(chart, point.snapshot, order);
      const hash = searchKey(next);
      if (seen.has(hash)) continue;
      seen.add(hash);
      frontier.push({ snapshot: next, firstOrder: point.firstOrder ?? order });
    }
  }
  return fallback;
}
