const HOUR_MODE = 'hourmode';
const STARTED = 'started';

const /** !Element */ timerDiv = document.getElementsByClassName('timers')[0];
const /** !Array<!Timer> */ timers = [];
let /** boolean */ modal = false; // TODO(sdh): just use the class?


/**
 * If a non-final element in history is 'running' then it indicates the
 * timer terminated abruptly.  For now we consider it to be not running
 * while the tab is closed, but we could also add a way to edit history
 * by merging over the gap.
 * @typedef {{'start': number, 'stop': number, 'running': boolean}}
 */
let TimerHistory;

/**
 * @typedef {{
 *   'name': (string|undefined),
 *   'history': (!Array<!TimerHistory>|undefined),
 *   'adjust': (number|undefined),
 *   'summed': (boolean|undefined),
 * }}
 */
let TimerState;

/**
 * @typedef {{
 *   'timers': !Array<!TimerState>,
 *   'modal': boolean,
 *   'hour': boolean,
 * }}
 */
let ProgramState;

/** @return {!ProgramState} */
function computeState() {
  return {
    'timers': timers.map(timer => timer.state()),
    'modal': modal,
    'hour': !!timerDiv && timerDiv.classList.contains('hourmode'),
  };
}

/** @record */
class Timer {
  /** Updates the timer's display, if necessary. */
  update() {}
  /** Stops the timer. */
  stop() {}
  /** Resets the timer. */
  reset() {}
  /** @return {string} The timer's label and current value. */
  label() {}
  /** @return {!TimerState} */
  state() {}
  /** @return {number} */
  value() {}
}

/** @record */
class Dialog {
  /**
   * Shows an aribitrary dialog, returns the clicked button.
   * @param {string} title
   * @param {string} text
   * @param {!Array<string>} buttons
   * @return {!Promise<string>}
   */
  show(title, text, buttons) {}
  /**
   * Shows a simple confirm dialog.
   * @param {string} text
   * @return {!Promise<void>}
   */
  confirm(text) {}
  /**
   * Shows an aribitrary dialog, returns the entered text.
   * @param {string} title
   * @param {string} text
   * @param {string=} placeholder
   * @return {!Promise<string>}
   */
  prompt(title, text, placeholder) {}
}

const /** !Dialog */ dialog = (function() {
  const top = document.querySelector('.modal-barrier');
  const dialogEl = top.querySelector('.dialog');
  const titleEl = top.querySelector('.title');
  const textEl = top.querySelector('.text');
  const buttonsEl = top.querySelector('.buttons');
  const promptEl = top.querySelector('.prompt');

  // TODO(sdh): support drag-drop on title bar
  let /** function(string) */ handler = () => {};
  buttonsEl.addEventListener('click', e => {
    if (e.target.parentNode != buttonsEl) return;
    handler(e.target.textContent);
    handler = () => {};
    top.classList.remove('visible');
  });
  // TODO(sdh): add enter/esc key listeners

  function confirm(text) {
    return show('Confirm', text, ['OK', 'Cancel'])
        .then(response => { if (response != 'OK') throw 'Cancel'; });
  }

  function show(title, text, buttons) {
    dialogEl.classList.remove('prompt');
    titleEl.textContent = title;
    textEl.textContent = text;
    while (buttonsEl.firstChild) buttonsEl.removeChild(buttonsEl.firstChild);
    for (const button of buttons) {
      const div = document.createElement('div');
      div.textContent = button;
      buttonsEl.appendChild(div);
    }
    return new Promise((fulfill, reject) => {
      top.classList.add('visible');
      handler = text => fulfill(text);
    });
  }

  function prompt(title, text, placeholder = '') {
    dialogEl.classList.add('prompt');
    promptEl.value = '';
    promptEl.placeholder = placeholder;
    titleEl.textContent = title;
    textEl.textContent = text;
    while (buttonsEl.firstChild) buttonsEl.removeChild(buttonsEl.firstChild);
    for (const button of ['OK', 'Cancel']) {
      const div = document.createElement('div');
      div.textContent = button;
      buttonsEl.appendChild(div);
    }
    return new Promise((fulfill, reject) => {
      top.classList.add('visible');
      handler =
          (text) => text == 'OK' ? fulfill(promptEl.value) : reject('Cancel');
    });
  }

  return {show, prompt, confirm};
}());

/** Updates localStorage with the current timer data. */
function updateTimers() {
  if (localStorage) {
    const names = timers.map((timer) => timer.label());
    localStorage.setItem('timerNames', names.join('|'));
    localStorage.setItem('state', JSON.stringify(computeState()));
  }
  let sum = 0;
  let summing = false;
  for (const timer of timers) {
    if (timer.state()['summed']) {
      summing = true;
      sum += timer.value();
    }
  }
  document.body.classList.toggle('summing', summing);
  if (summing) {
    document.querySelector('.sum .time-hours').textContent = formatHourTime(sum);
    document.querySelector('.sum .time-minutes').textContent = formatTime(sum);
  }
}

/** Adds a timer with the given name. */
function addTimer(/** !TimerState= */ state = {}) {
  let element = document.querySelector('.template .timer').cloneNode(true);
  timerDiv.insertBefore(element, timerDiv.lastElementChild);

  /** Returns the (required) child element with the given class name. */
  function /** !Element */ child(/** string */ className) {
    const children = element.getElementsByClassName(className);
    if (children.length < 1) {
      throw new Error(`could not find child ${className}`);
    }
    return children[0];
  }

  let /** number|undefined */ started = undefined;
  let /** number */ adjust = state['adjust'] || 0;
  let /** number */ elapsed = adjust;
  const /** !Array<!TimerHistory> */ history = state['history'] || [];
  for (const {'start': start, 'stop': stop, 'running': running} of history) {
    elapsed += stop - start;
  }
  child('name').firstElementChild.value = state['name'] || '';
  element.classList.toggle('summed', state['summed'] || false);

  const hourTime = child('time-hours');
  const minuteTime = child('time-minutes');

  // TODO(sdh): use an object instead of a function as the timer.
  const /** function(): number */ currentTime = () =>
      (elapsed + (started ? new Date() - started : 0)) / 1000;
  const /** function() */ update = () => {
    const full = currentTime();
    minuteTime.textContent = formatTime(full);
    hourTime.textContent = formatHourTime(full);
    if (history.length && history[history.length - 1]['running']) {
      history[history.length - 1]['stop'] = +new Date();
    }
  };
  const /** function() */ reset = () => {
    history.splice(0, history.length);
    elapsed = adjust = 0;
    if (started) {
      started = +new Date();
      history.push({'start': started, 'stop': started, 'running': true});
    }
    update();
  };
  // TODO(sdh): delete label function
  const /** function(): string */ label = () =>
      escape(child('name').firstElementChild.value) + '=' +
      ((started ? -1 : 1) * currentTime());
  const /** function(): !TimerState */ computeState = () => ({
    'name': child('name').firstElementChild.value,
    'history': history,
    'adjust': adjust,
    'summed': element.classList.contains('summed'),
  });
  const stop = () => {
    if (!started) return;
    const stop = +new Date();
    history[history.length - 1]['stop'] = stop;
    history[history.length - 1]['running'] = false;
    elapsed += (stop - started);
    started = undefined;
    element.classList.remove('started');
    update();
  };
  const timer = {update, reset, label, stop,
                 state: computeState, value: currentTime};

  const start = () => {
    if (modal) stopAll();
    started = +new Date();
    // TODO(sdh): consolidate older history entries?
    history.push({'start': started, 'stop': started, 'running': true});
    element.classList.add('started');
    update();
  };
  if (history.length && history[history.length - 1]['running']) {
    start();
  }

  const sumToggle = () => {
    element.classList.toggle('summed');
    updateTimers();
  };
  child('start').addEventListener('click', start);
  child('pause').addEventListener('click', stop);
  child('reset').addEventListener('click', reset);
  child('sum').addEventListener('click', sumToggle);
  child('delete').addEventListener('click', () => {
    element.parentNode.removeChild(element);
    timers.splice(timers.indexOf(timer), 1);
    updateTimers();
  });
  child('name').firstElementChild.addEventListener('blur', updateTimers);
  child('time').addEventListener('dblclick', () => {
    dialog.prompt('Adjust Time', 'Please enter a new time' , '00:00:00')
        .then((time) => {
          if (!time) return;
          let fields = time.split(':');
          while (fields.length < 3) fields.unshift('0');
          fields = fields.map(Number);
          for (const field of fields) {
            if (!Number.isInteger(field) || fields.length > 3) {
              dialog.show('Error', `Could not parse time: "${time}"`, ['OK']);
              return;
            }
          }
          const adj = (fields[0] * 3600 + fields[1] * 60 + fields[2]) * 1000;
          reset();
          elapsed += adj;
          adjust += adj;
          update();
        });
  });
  timers.push(timer);
}

document.querySelector('.new').addEventListener('click', () => {
  addTimer();
  updateTimers();
});
document.querySelector('.hours').addEventListener('click', () => {
  timerDiv.classList.remove('hourmode');
});
document.querySelector('.minutes').addEventListener('click', () => {
  timerDiv.classList.add('hourmode');
});
document.querySelector('.modal').addEventListener('click', () => {
  modal = false;
  timerDiv.classList.remove('modal');
});
document.querySelector('.non-modal').addEventListener('click', () => {
  // TODO(sdh): if more than one timer is running, that'do nothing?
  modal = true;
  timerDiv.classList.add('modal');
});
document.getElementsByClassName('reset-all')[0].addEventListener('click', () => {
  dialog.confirm('Reset all timers?').then(() => {
    timers.forEach((timer) => timer.reset());
  });
});
document.body.addEventListener('keypress', (e) => {
  if (e.key == 'Enter') e.target.blur();
});

// Initialize the timers from local storage.
/** @type {!ProgramState} */
const storageState = (() => {
  if (!localStorage) return {'modal': false, 'timers': []};
  const stateJson = localStorage.getItem('state');
  if (stateJson) return JSON.parse(stateJson);
  // migrate legacy storage...
  const timerNames = (localStorage.getItem('timerNames') || '').split('|');
  const state = {'modal': false, 'timers': []};
  timerNames.forEach((name) => {
    const eq = name.indexOf('=');
    const timer = {'history': [], 'adjust': 0};
    if (eq >= 0) {
      let elapsed = Number(name.substring(eq + 1)) * 1000;
      name = name.substring(0, eq);
      if (elapsed < 0) {
        elapsed *= -1;
        const now = +new Date();
        timer['history'].push({'start': now, 'stop': now, running: true});
      }
      timer['adjust'] = elapsed;
    }
    name = unescape(name);
    timer['name'] = name;
    state['timers'].push(timer);
  });
  return state;
})();

timerDiv.classList.toggle('modal', modal = storageState['modal']);
timerDiv.classList.toggle('hourmode', storageState['hour']),
storageState['timers'].forEach((timer) => addTimer(timer));

function stopAll() {
  timers.forEach((timer) => timer.stop());
}

/** @param {number} seconds
    @return {string} */
function formatTime(seconds) {
  let hours = Math.floor(seconds / 3600);
  let mins = String(Math.floor((seconds % 3600) / 60));
  let secs = String(Math.floor(seconds % 60));
  if (mins.length < 2) mins = `0${mins}`;
  if (secs.length < 2) secs = `0${secs}`;
  return `${hours}:${mins}:${secs}`;
}

/** @param {number} seconds
    @return {string} */
function formatHourTime(seconds) {
  let hours = Math.floor(seconds / 3600);
  let frac = Math.round((seconds % 3600) / 360);
  let hourFrac = hours;
  if (frac == 10) {
    frac = 0;
    hourFrac++;
  }
  return `${hourFrac}.${frac} h`;
}

// Start updating.
/** Runs every quarter second to update the timer display. */
function update() {
  timers.forEach((timer) => timer.update());
  window.setTimeout(update, 250);
  updateTimers();
}
update();
