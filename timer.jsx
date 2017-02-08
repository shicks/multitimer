'use strict';

const React = require('react');
const ReactDOM = require('react-dom');

const HOUR_MODE = 'hourmode';
const STARTED = 'started';

const timerDiv = document.getElementsByClassName('timers')[0];
const timers = [];

function updateTimers() {
  if (localStorage) {
    const names = timers.map((timer) => timer.label());
    localStorage.setItem('timerNames', names.join('|'));
  }
}

function addTimer(name = '') {
  let element = document.createElement('div');
  ReactDOM.render(
      <div className="timer">
        <div className="timerow">
          <div className="time">
            <div className="time-hours">0.0</div>
            <div className="time-minutes">0:00:00</div>
          </div>
        </div>
        <div className="buttons">
          <div className="start material-icons">play_arrow</div>
          <div className="pause material-icons">pause</div>
          <div className="reset material-icons">replay</div>
          <div className="delete material-icons">delete</div>
        </div>
        <div className="name">
          <input type="text"></input>
        </div>
      </div>,
      element);
  element = element.firstChild;
  timerDiv.insertBefore(element, timerDiv.lastElementChild);

  function child(className) {
    const children = element.getElementsByClassName(className);
    if (children.length < 1) {
      throw new Error(`could not find child ${className}`);
    }
    return children[0];
  }

  let elapsed = 0;
  const eq = name.indexOf('=');
  if (eq >= 0) {
    elapsed = Number(name.substring(eq + 1)) * 1000;
    name = name.substring(0, eq);
  }
  name = unescape(name);

  child('name').firstElementChild.value = name;

  const hourTime = child('time-hours');
  const minuteTime = child('time-minutes');

  let started = undefined;

  // TODO(sdh): use an object instead of a function as the timer.
  const currentTime = () =>
      (elapsed + (started ? new Date() - started : 0)) / 1000
  const update = () => {
    const full = currentTime();
    let hours = Math.floor(full / 3600);
    let minutes = String(Math.floor((full % 3600) / 60));
    let seconds = String(Math.floor(full % 60));
    let frac = Math.round((full % 3600) / 360);
    let hourFrac = hours;
    if (frac == 10) {
      frac = 0;
      hourFrac++;
    }
    if (minutes.length < 2) minutes = `0${minutes}`;
    if (seconds.length < 2) seconds = `0${seconds}`;
    hourTime.textContent = `${hourFrac}.${frac} h`;
    minuteTime.textContent = `${hours}:${minutes}:${seconds}`;
  };
  update.reset = () => {
    elapsed = 0;
    started = started && +new Date();
    update();
  };
  update.label = () =>
      escape(child('name').firstElementChild.value) + '=' +
      ((started ? -1 : 1) * currentTime());

  const start = () => {
    started = +new Date();
    element.classList.add('started');
    update();
  }
  if (elapsed < 0) {
    elapsed *= -1;
    start();
  }
  child('start').addEventListener('click', start);
  child('pause').addEventListener('click', () => {
    elapsed += (new Date() - started);
    started = undefined;
    element.classList.remove('started');
    update();
  });
  child('reset').addEventListener('click', () => {
    elapsed = 0;
    started = started && +new Date();
    update();
  });
  child('delete').addEventListener('click', () => {
    element.parentNode.removeChild(element);
    timers.splice(timers.indexOf(update), 1);
    updateTimers();
  });
  child('name').firstElementChild.addEventListener('blur', updateTimers);
  timers.push(update);
}

document.getElementsByClassName('new')[0].addEventListener('click', () => {
  addTimer();
  updateTimers();
});
document.getElementsByClassName('hours')[0].addEventListener('click', () => {
  timerDiv.classList.remove('hourmode');
});
document.getElementsByClassName('minutes')[0].addEventListener('click', () => {
  timerDiv.classList.add('hourmode');
});
document.getElementsByClassName('reset-all')[0].addEventListener('click', () => {
  timers.forEach((timer) => timer.reset());
});

document.body.addEventListener('keypress', (e) => {
  if (e.key == 'Enter') e.target.blur();
});

const storageTimers =
    localStorage &&
    (localStorage.getItem('timerNames') || '').split('|') || [];
storageTimers.forEach((timer) => addTimer(timer));

function update() {
  timers.forEach((timer) => timer());
  window.setTimeout(update, 1000);
  updateTimers();
}
update();
