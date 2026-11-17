'use strict';

const nauticalInks = [
  { bright: '#9ef5e3', pale: '#f3ffe4', shoal: '#2a514e', dark: '#10242b' },
  { bright: '#ffc2ad', pale: '#fff5da', shoal: '#624650', dark: '#271e2c' },
];

function seededGrain(a, b) {
  const wave = Math.sin(a * 183.13 + b * 61.147) * 46749.277;
  return wave - Math.floor(wave);
}

function trace(ctx, vertices, closed = false) {
  ctx.beginPath();
  vertices.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (closed) ctx.closePath();
}

function inkPath(ctx, vertices, color, width = 1, closed = false) {
  trace(ctx, vertices, closed);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function inkShape(ctx, vertices, color) {
  trace(ctx, vertices, true);
  ctx.fillStyle = color;
  ctx.fill();
}

function inkRing(ctx, x, y, size, color, width = 1) {
  ctx.beginPath();
  ctx.ellipse(x, y, size, size, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function compassStar(ctx, x, y, size, color, center = null) {
  const rays = [[0,-1],[.22,-.22],[1,0],[.22,.22],[0,1],[-.22,.22],[-1,0],[-.22,-.22]];
  inkShape(ctx, rays.map(([dx,dy]) => [x+dx*size,y+dy*size]), color);
  if (center) inkShape(ctx, rays.map(([dx,dy]) => [x+dx*size*.36,y+dy*size*.36]), center);
}

function paintVessel(ctx, x, y, heading, size, ink, resting) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.scale(size, size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (!resting) {
    for (const sign of [-1,1]) {
      inkPath(ctx, [[sign*.24,.34],[sign*.37,.61],[sign*.48,.81]], ink.bright+'9c', .046);
      inkPath(ctx, [[sign*.15,.54],[sign*.26,.74]], ink.bright+'61', .033);
    }
  }
  const hull = [[0,-.54],[.3,-.20],[.27,.33],[.16,.50],[-.16,.50],[-.27,.33],[-.30,-.2]];
  ctx.shadowColor = ink.bright;
  ctx.shadowBlur = size * .41;
  inkShape(ctx, hull, ink.bright);
  ctx.shadowBlur = 0;
  inkShape(ctx, hull.map(([hx,hy]) => [hx*.77,hy*.78]), '#192c32');
  inkShape(ctx, [[-.15,-.12],[.15,-.12],[.15,.21],[-.15,.21]], ink.pale);
  inkPath(ctx, [[-.097,-.066],[.097,-.066]], '#537170', .049);
  inkPath(ctx, [[0,-.44],[0,-.28]], ink.pale, .046);
  inkPath(ctx, [[-.10,.32],[.10,.32]], ink.bright, .045);
  ctx.restore();
}

function shoreOutline(seed, count) {
  return Array.from({length: count}, (_, i) => {
    const a = i * 2 * Math.PI / count;
    const height = .82 + .112*Math.sin(a*3+seed) + .051*Math.cos(a*7-seed) + .037*Math.sin(a*11+seed);
    return [Math.cos(a)*height, Math.sin(a)*height];
  });
}

function engraveIsland(ctx, centerX, centerY, width, height, ink, seed, scale = 1) {
  const coast = shoreOutline(seed, scale === 1 ? 56 : 24);
  const contour = (size, inset = 0) => coast.map(([dx, dy]) => [
    centerX + dx*width*size - inset,
    centerY + dy*height*size - inset*.58,
  ]);
  for (let band = scale === 1 ? 10 : 2; band >= 1; band--) {
    const offshore = contour(1 + band*.071);
    if (band === 1) inkShape(ctx, offshore, ink.dark);
    inkPath(ctx, offshore, ink.bright + (band % 3 ? '26' : '42'), scale, true);
  }
  const coastline = contour(1);
  inkShape(ctx, coastline, ink.shoal);
  ctx.save();
  ctx.clip();
  for (let y = -height; y < height*1.5; y += scale === 1 ? 4.2 : 3.5) {
    inkPath(ctx, [[centerX-width,centerY+y+12],[centerX+width,centerY+y-width*.48]],
      ink.pale+'24', .7);
  }
  for (let elevation = 1; elevation <= (scale === 1 ? 8 : 3); elevation++) {
    inkPath(ctx, contour(1-elevation*(scale === 1 ? .091 : .19),elevation*scale*1.5),
      ink.bright+'62', .75, true);
  }
  ctx.restore();
  inkPath(ctx, coastline, ink.bright+'a4', scale*1.2, true);
}

function paintBerth(ctx, x, y, unit, ink, occupied) {
  const reach = unit*.34;
  inkRing(ctx, x, y, reach, ink.bright+'a8', 1.3);
  inkRing(ctx, x, y, reach*.77, ink.bright+'45');
  for (let quarter = 0; quarter < 4; quarter++) {
    const turn = quarter * Math.PI / 2;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(turn);
    inkPath(ctx, [[-3,-reach],[3,-reach]], ink.bright, 2);
    ctx.restore();
  }
  if (!occupied) {
    inkPath(ctx, [[x-6,y-7],[x-6,y+6],[x+6,y+6],[x+6,y-7]], ink.bright, 1.7);
    inkPath(ctx, [[x,y-6],[x,y+2]], ink.bright, 1.7);
  }
}

function paintBuoy(ctx, x, y, unit, timestamp) {
  const drift = Math.sin(timestamp*2.25)*.026;
  inkRing(ctx,x,y,unit*(.266+drift),'#ffd68485');
  inkRing(ctx,x,y,unit*.344,'#ffd68438');
  ctx.shadowColor = '#ffc473';
  ctx.shadowBlur = 13;
  compassStar(ctx,x,y,unit*.21,'#ffcd7e','#fff0c5');
  ctx.shadowBlur = 0;
}

function paintLock(ctx, x, y, unit, marker, phase) {
  const open = isPassable(marker,phase);
  const hue = marker === 'E' ? '#d9b3ff' : '#ffd189';
  const edge = unit*.35;
  ctx.fillStyle = hue + (open ? '18' : '45');
  ctx.fillRect(x-edge,y-edge,edge*2,edge*2);
  ctx.strokeStyle = hue + (open ? '99' : 'ef');
  ctx.strokeRect(x-edge,y-edge,edge*2,edge*2);
  for (const bank of [-1,1]) {
    const post = x + bank*edge*.72;
    inkPath(ctx, [[post,y-edge*.65],[post,y+edge*.65]], hue, 1.8);
    if (open) {
      inkPath(ctx, [[post-bank*5,y-6],[post,y],[post-bank*5,y+6]], hue, 1.5);
    }
  }
  if (!open) {
    for (const offset of [-.52,-.16,.20,.56]) {
      inkPath(ctx, [[x-edge*.61,y+offset*edge+4],[x+edge*.61,y+offset*edge-4]], hue, 1.4);
    }
  }
}

function canvasSurface(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return null;
  const dpi = Math.min(2, window.devicePixelRatio || 1);
  const px = Math.round(width*dpi);
  const py = Math.round(height*dpi);
  if (canvas.width !== px || canvas.height !== py) {
    canvas.width = px;
    canvas.height = py;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  return {ctx,width,height};
}

function paintWater(ctx, width, height, ink, waveTime) {
  const tint = ctx.createRadialGradient(width*.41,height*.31,10,width*.47,height*.43,width*.77);
  tint.addColorStop(0,ink.shoal);
  tint.addColorStop(.52,ink.dark);
  tint.addColorStop(1,'#121b22');
  ctx.fillStyle = tint;
  ctx.fillRect(0,0,width,height);
  for (let line = -2; line < height/9+2; line++) {
    const wake = [];
    for (let x = 0; x < width + 12; x += 8) {
      const y = line*9 + Math.sin(x*.014+line*.47+waveTime*.42)*4 + Math.sin(x*.028+line*.18)*2.3;
      wake.push([x,y]);
    }
    inkPath(ctx,wake,ink.bright+(line%5 ? '0e' : '22'), .8);
  }
}

function paintChart(canvas, board, side, snapshot, tween, prediction, history, now, animate) {
  const surface = canvasSurface(canvas);
  if (!surface) return;
  const {ctx,width,height} = surface;
  const colors = nauticalInks[side];
  const columns = board[0].length;
  const rows = board.length;
  const tileSize = Math.min((width-36)/columns,(height-32)/rows);
  const x0 = (width-columns*tileSize)*.5;
  const y0 = (height-rows*tileSize)*.5;
  const tileCenter = ({x,y}) => [x0+(x+.5)*tileSize,y0+(y+.5)*tileSize];
  const boat = snapshot.boats[side];
  paintWater(ctx,width,height,colors,animate ? now : 0);
  for (let row = 0; row <= rows; row++) {
    const y = y0+row*tileSize;
    inkPath(ctx,[[x0,y],[width-x0,y]],colors.bright+'37');
  }
  for (let column = 0; column <= columns; column++) {
    const x = x0+column*tileSize;
    inkPath(ctx,[[x,y0],[x,height-y0]],colors.bright+'37');
  }
  board.forEach((row,y) => Array.from(row).forEach((marker,x) => {
    const [cx,cy] = tileCenter({x,y});
    if (marker === '#') engraveIsland(ctx,cx,cy,tileSize*.47,tileSize*.44,colors,side+x*4.13+y*2.1,.93);
    if (marker === 'H') paintBerth(ctx,cx,cy,tileSize,colors,boat.moored);
    if (marker === '*' && !boat.lit) paintBuoy(ctx,cx,cy,tileSize,animate ? now : 0);
    if (marker === 'E' || marker === 'F') paintLock(ctx,cx,cy,tileSize,marker,snapshot.tide);
  }));
  history.slice(-6).forEach((step,index) => {
    const [x,y] = tileCenter(step.boats[side]);
    const opacity = (23 + index*13).toString(16).padStart(2,'0');
    inkRing(ctx,x,y,2.7+index*.66,colors.bright+opacity,1.3);
  });
  const [x,y] = tileCenter(boat);
  const ghost = prediction?.boats[side];
  if (ghost && ghost !== boat && (ghost.x !== boat.x || ghost.y !== boat.y)) {
    const [gx,gy] = tileCenter(ghost);
    ctx.setLineDash([3,4]);
    inkPath(ctx, [[x,y],[gx,gy]], colors.pale+'b2', 1.4);
    inkRing(ctx,gx,gy,tileSize*.28,colors.pale+'b2',1.5);
    ctx.setLineDash([]);
    compassStar(ctx,gx,gy,4,colors.pale);
  }
  const previous = tween?.from.boats[side] ?? boat;
  const [fromX,fromY] = tileCenter(previous);
  const completion = animate && tween ? Math.max(0,Math.min(1,(now-tween.at)/.15)) : 1;
  const factor = 1-(1-completion)**3;
  const angleDiff = boat.angle-previous.angle;
  const heading = previous.angle + Math.atan2(Math.sin(angleDiff),Math.cos(angleDiff))*factor;
  const bob = animate && !boat.moored ? .85*Math.sin(now*2.65+side) : 0;
  paintVessel(ctx,fromX+(x-fromX)*factor,fromY+(y-fromY)*factor+bob,heading,tileSize*.77,colors,boat.moored);
}

function coverWake(ctx, ink, start, handle1, handle2, end, beacon) {
  ctx.beginPath();
  ctx.moveTo(...start);
  ctx.bezierCurveTo(...handle1,...handle2,...end);
  ctx.lineTo(...beacon);
  ctx.strokeStyle = ink.bright+'d4';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4,7]);
  ctx.stroke();
  ctx.setLineDash([]);
  const [x,y] = beacon;
  inkRing(ctx,x,y,18,ink.bright+'98');
  inkRing(ctx,x,y,24,ink.bright+'47');
  compassStar(ctx,x,y,8,ink.bright);
}

function drawCover(canvas) {
  const surface = canvasSurface(canvas);
  if (!surface) return;
  const {ctx,width,height} = surface;
  ctx.scale(width/1160,height/630);
  const sound = ctx.createLinearGradient(350,230,1160,465);
  sound.addColorStop(0,'#1e2222');
  sound.addColorStop(.53,'#153940');
  sound.addColorStop(1,'#49313d');
  ctx.fillStyle = sound;
  ctx.fillRect(0,0,1160,630);
  for (let ribbon = -5; ribbon < 112; ribbon++) {
    const curve = [];
    for (let x = 400; x <= 1168; x += 8) {
      const offset = Math.sin(x*.009+ribbon*.108)*16 + Math.sin(x*.018+ribbon*.074)*5;
      curve.push([x,ribbon*6.6+offset+(x-785)*.064]);
    }
    inkPath(ctx,curve,ribbon%5 ? '#b2d0b523' : '#eee0b933',.8);
  }
  for (let dot = 0; dot < 1250; dot++) {
    ctx.fillStyle = dot%4 ? '#b9e4c631' : '#ffd3aa46';
    ctx.fillRect(400+seededGrain(dot,9)*760,seededGrain(dot,12)*630,1.0,1.0);
  }
  const [blue,rose] = nauticalInks;
  const islands = [
    [601,158,128,99,blue,3.9],
    [1063,160,104,83,rose,7.1],
    [1008,455,135,118,rose,9.2],
    [667,484,105,81,blue,5.7],
    [825,526,40,35,rose,2.6],
    [811,100,57,45,blue,6.7],
  ];
  islands.forEach(item => engraveIsland(ctx,...item));
  ctx.setLineDash([2,9]);
  inkPath(ctx,[[453,553],[1133,95]],'#f8e0a55e',1.1);
  ctx.setLineDash([]);
  coverWake(ctx,blue,[548,99],[697,264],[805,303],[921,208],[985,219]);
  coverWake(ctx,rose,[1094,522],[969,343],[862,343],[766,436],[696,427]);
  paintVessel(ctx,793,247,1.22,62,blue,false);
  paintVessel(ctx,854,389,-1.99,62,rose,false);
  inkRing(ctx,1043,71,24,'#f4d7a4a1');
  inkRing(ctx,1043,71,19,'#f4d7a455');
  compassStar(ctx,1043,71,33,'#eee1b3','#4e6265');
  ctx.font = '12px monospace';
  ctx.fillStyle = '#f2dfb1';
  ctx.fillText('N',1039,26);
  const vignette = ctx.createLinearGradient(395,0,666,0);
  vignette.addColorStop(0,'#1e2222');
  vignette.addColorStop(1,'#1e222200');
  ctx.fillStyle = vignette;
  ctx.fillRect(0,0,667,630);
}
