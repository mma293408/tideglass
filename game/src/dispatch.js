'use strict';

const node = id => document.getElementById(id);
const movementKeys = new Map([
  ['ArrowUp','up'], ['w','up'], ['ArrowLeft','left'], ['a','left'],
  ['ArrowRight','right'], ['d','right'], ['ArrowDown','down'], ['s','down'], [' ','hold'],
]);
const orderLabels = { up:'north', left:'west', right:'east', down:'south', hold:'hold' };
const storageKey = 'tideglass.voyage.v1';
const numberTag = value => String(value).padStart(2,'0');

function readLog() {
  let record = null;
  try { record = JSON.parse(localStorage.getItem(storageKey)); } catch {}
  return charts.map((_, index) => [0,1,2,3].includes(record?.[index]) ? record[index] : 0);
}

function chartButton(label, title, enabled, onActivate) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label',title);
  button.title = title;
  button.disabled = !enabled;
  button.addEventListener('click',onActivate);
  return button;
}

function describeMap(board, boat, fleetName) {
  const marks = { H:'home berth', '*':'signal light', E:'ebb lock', F:'flood lock', '#':'reef' };
  const coordinates = (x,y) => 'column ' + (x+1) + ', row ' + (y+1);
  const map = board.flatMap((line,y) => Array.from(line,(marker,x) => {
    if (!marks[marker] || (marker === '*' && boat.lit)) return null;
    return marks[marker] + ' at ' + coordinates(x,y);
  })).filter(Boolean);
  return fleetName + ' ferry at ' + coordinates(boat.x,boat.y) + '. ' + map.join('; ');
}

class Voyage {
  constructor() {
    this.medals = readLog();
    this.index = 0;
    this.active = false;
    this.hasSailed = false;
    this.state = castOff(charts[0]);
    this.history = [];
    this.motion = null;
    this.hover = null;
    this.clue = null;
    this.lastOrder = null;
    this.finishTimer = 0;
    this.motionSetting = matchMedia('(prefers-reduced-motion: reduce)');
    this.bells = new HarborSound();
    this.log = node('voyage-log');
    this.report = node('report');
    this.cover = node('cover');
    this.ferries = ['blue','rose'].map(color => ({
      color,
      map: node(color+'-map'),
      status: node(color+'-status'),
    }));
    this.helm = Array.from(document.querySelectorAll('.helm'));
  }

  get chart() { return charts[this.index]; }

  get clear() { return berthCount(this.state) === 2; }

  get controlsOpen() { return this.active && !this.log.open && !this.report.open; }

  access(index) {
    return index === 0 || this.medals[index-1] > 0;
  }

  resume() {
    const next = this.medals.indexOf(0);
    this.start(next === -1 ? charts.length-1 : next);
  }

  cancelFinish() {
    window.clearTimeout(this.finishTimer);
    this.finishTimer = 0;
    if (this.report.open) this.report.close();
  }

  showGame(playing) {
    this.active = playing;
    node('title-screen').hidden = playing;
    node('play-screen').hidden = !playing;
    node('chart-toggle').hidden = !this.hasSailed && !this.medals[0];
    node('resume').hidden = !this.hasSailed && !this.medals[0];
  }

  showCover() {
    this.cancelFinish();
    if (this.log.open) this.log.close();
    this.showGame(false);
    drawCover(this.cover);
  }

  start(index) {
    if (!this.access(index)) return;
    this.cancelFinish();
    if (this.log.open) this.log.close();
    this.index = index;
    this.state = castOff(this.chart);
    this.history.length = 0;
    this.motion = this.hover = this.clue = this.lastOrder = null;
    this.hasSailed = true;
    this.showGame(true);
    node('district').textContent = this.chart.district.toUpperCase() + ' / ' + numberTag(index+1);
    node('chapter').textContent = this.chart.name;
    node('chapter').focus({preventScroll:true});
    node('pilot-note').textContent = this.chart.note;
    for (const place of ['tide','lock-legend','hold-shortcut']) node(place).hidden = !usesTides(this.chart);
    this.updateRoute();
    this.updateHelm();
    this.bells.play('launch');
  }

  updateRoute() {
    node('route').replaceChildren(...charts.map((chart,index) => {
      const medal = this.medals[index];
      const description = medal ? chart.name + ', ' + medal + ' stars' : chart.name;
      const button = chartButton(numberTag(index+1),description,this.access(index),() => this.start(index));
      button.classList.toggle('done',medal > 0);
      button.classList.toggle('current',index === this.index);
      if (index === this.index) button.setAttribute('aria-current','step');
      return button;
    }));
  }

  updateHelm(message = 'Find both home berths') {
    const {state,chart} = this;
    node('moves').textContent = numberTag(state.turns);
    node('par').textContent = numberTag(chart.par);
    node('moored').textContent = berthCount(state) + '/' + state.boats.length;
    node('lights').textContent = lightCount(state) + '/' + state.boats.length;
    node('tide-name').textContent = state.tide === 0 ? 'FLOOD' : 'EBB';
    node('tide').classList.toggle('ebb',Boolean(state.tide));
    node('undo').disabled = this.history.length === 0;
    node('scout').disabled = this.clear;
    node('footer-note').textContent = message;
    this.ferries.forEach(({color,map,status},index) => {
      const boat = state.boats[index];
      status.textContent = boat.moored ? '✓ MOORED' : boat.lit ? '✦ LIGHT ABOARD' : 'UNDER WAY';
      map.setAttribute('aria-label',describeMap(chart.waters[index],boat,color));
    });
    for (const button of this.helm) {
      const order = button.dataset.order;
      button.disabled = this.clear || (order === 'hold' && !usesTides(chart));
      button.classList.toggle('active',order === this.lastOrder);
      button.classList.toggle('suggested',order === this.clue);
    }
  }

  order(command) {
    if (!this.controlsOpen || this.clear || (command === 'hold' && !usesTides(this.chart))) return;
    const next = steer(this.chart,this.state,command);
    const moved = next.boats.some((boat,index) => boat !== this.state.boats[index]);
    const docked = berthCount(next) > berthCount(this.state);
    const lit = lightCount(next) > lightCount(this.state);
    this.lastOrder = command;
    this.clue = null;
    if (next !== this.state) {
      this.history.push(this.state);
      this.motion = { from:this.state, at:performance.now()/1000 };
      this.state = next;
    }
    const feedback = moved ? ['stroke','Order received'] : [
      'blocked', usesTides(this.chart) ? 'Channel blocked · tide turned' : 'Channel blocked',
    ];
    const [cue,message] = docked ? ['moor','Ferry moored'] : lit ? ['light','Signal light aboard'] :
      command === 'hold' ? ['tide','Tide turned'] : feedback;
    this.bells.play(cue);
    this.updateHelm(message);
    if (this.clear) this.finishTimer = window.setTimeout(() => this.finish(),this.motionSetting.matches ? 1 : 225);
  }

  undo() {
    if (!this.controlsOpen || !this.history.length) return;
    this.cancelFinish();
    this.motion = {from:this.state,at:performance.now()/1000};
    this.state = this.history.pop();
    this.lastOrder = this.clue = null;
    this.bells.play('undo');
    this.updateHelm('Order taken back');
  }

  scout() {
    if (!this.controlsOpen || this.clear) return;
    const found = scoutRoute(this.chart,this.state);
    this.clue = found?.firstOrder ?? null;
    if (!this.clue) {
      this.updateHelm('Scout found no route. Undo an order and try again.');
      this.bells.play('blocked');
      return;
    }
    const firstStep = this.clue === 'hold' ? 'hold for the next tide' : 'try ' + orderLabels[this.clue];
    const remaining = found.snapshot.turns - this.state.turns;
    const reach = remaining === 1 ? '1 order to harbor' : remaining + ' orders to harbor';
    this.updateHelm('Scout says ' + firstStep + ' · ' + reach);
    this.bells.play('tide');
  }

  finish() {
    this.finishTimer = 0;
    const earned = routeMedal(this.chart,this.state);
    this.medals[this.index] = Math.max(this.medals[this.index],earned);
    try { localStorage.setItem(storageKey,JSON.stringify(this.medals)); } catch {}
    this.updateRoute();
    const finalChart = this.index === charts.length-1;
    node('report-kicker').textContent = finalChart ? 'THE FAR LANTERN IS LIT' : 'CHART ' + numberTag(this.index+1) + ' COMPLETE';
    node('report-title').textContent = finalChart ? 'Voyage complete' : 'Safe harbor';
    node('report-copy').textContent = finalChart ? 'All six charts crossed. Both ferries are home.' :
      'The ferries are moored. Your next chart is open.';
    node('stars').textContent = '★'.repeat(earned) + '☆'.repeat(3-earned);
    node('stars').setAttribute('aria-label',earned + ' of 3 stars');
    const facts = [this.state.turns + ' orders',lightCount(this.state) + '/2 lights'];
    if (finalChart) facts.push(this.medals.reduce((sum,stars) => sum+stars,0) + '/18 voyage stars');
    node('report-stats').textContent = facts.join('  ·  ');
    node('next-label').textContent = finalChart ? 'Voyage log' : 'Next chart';
    this.bells.play(finalChart ? 'voyage' : 'clear');
    this.report.showModal();
  }

  showLog() {
    if (this.finishTimer && !this.report.open && this.clear) return;
    if (this.report.open) this.report.close();
    const rows = charts.map((chart,index) => {
      const medal = this.medals[index];
      const accessible = this.access(index);
      const outcome = medal ? '★'.repeat(medal) : accessible ? 'Open' : 'Locked';
      const button = chartButton('',chart.name + ', ' + outcome,accessible,() => this.start(index));
      button.className = 'outline log-entry';
      for (const part of [numberTag(index+1),chart.name,outcome]) {
        const cell = document.createElement('span');
        cell.textContent = part;
        button.append(cell);
      }
      return button;
    });
    node('log-entries').replaceChildren(...rows);
    this.log.showModal();
  }

  handleKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || this.report.open || this.log.open) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === 'm') node('sound').click();
    if (!this.active) {
      if (key === 'Enter' && event.target === document.body) this.start(0);
      return;
    }
    if (movementKeys.has(key)) {
      if (key === ' ' && !usesTides(this.chart)) return;
      event.preventDefault();
      this.order(movementKeys.get(key));
    }
    if (key === 'h' && !event.repeat) this.scout();
    if (key === 'z') this.undo();
    if (key === 'r' && !event.repeat) this.start(this.index);
  }

  render(time) {
    if (!this.active) return;
    const projected = this.hover ?? this.clue;
    const prediction = projected && !this.clear ? steer(this.chart,this.state,projected) : null;
    this.ferries.forEach(({map},side) => paintChart(map,this.chart.waters[side],side,this.state,this.motion,
      prediction,this.history,time,!this.motionSetting.matches));
  }

  bind() {
    const actions = {
      home: () => this.showCover(),
      start: () => this.start(0),
      resume: () => this.resume(),
      undo: () => this.undo(),
      restart: () => this.start(this.index),
      replay: () => this.start(this.index),
      next: () => this.index === charts.length-1 ? this.showLog() : this.start(this.index+1),
      'chart-toggle': () => this.showLog(),
      'close-log': () => this.log.close(),
      scout: () => this.scout(),
      sound: () => {
        this.bells.enabled = !this.bells.enabled;
        node('sound').textContent = this.bells.enabled ? 'Sound on' : 'Sound off';
        node('sound').setAttribute('aria-pressed',String(this.bells.enabled));
        if (this.bells.enabled) this.bells.play('launch');
      },
    };
    for (const [id,action] of Object.entries(actions)) node(id).addEventListener('click',action);
    for (const button of this.helm) {
      const order = button.dataset.order;
      button.addEventListener('click',() => this.order(order));
      button.addEventListener('pointerenter',() => { this.hover = button.disabled ? null : order; });
      button.addEventListener('pointerleave',() => { this.hover = null; });
    }
    this.report.addEventListener('cancel',event => event.preventDefault());
    window.addEventListener('keydown',event => this.handleKey(event));
    new ResizeObserver(() => drawCover(this.cover)).observe(this.cover);
    this.showCover();
    const drawFrame = timestamp => {
      this.render(timestamp/1000);
      window.requestAnimationFrame(drawFrame);
    };
    window.requestAnimationFrame(drawFrame);
  }
}

const voyage = new Voyage();
voyage.bind();
