(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var HOUR_MODE = 'hourmode';
var STARTED = 'started';

var timerDiv = document.getElementsByClassName('timers')[0];
var timers = [];

function updateTimers() {
  if (localStorage) {
    var names = timers.map(function (timer) {
      return timer.label();
    });
    localStorage.setItem('timerNames', names.join('|'));
  }
}

function addTimer() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

  var element = document.querySelector('.template .timer').cloneNode(true);
  timerDiv.insertBefore(element, timerDiv.lastElementChild);

  function child(className) {
    var children = element.getElementsByClassName(className);
    if (children.length < 1) {
      throw new Error('could not find child ' + className);
    }
    return children[0];
  }

  var elapsed = 0;
  var eq = name.indexOf('=');
  if (eq >= 0) {
    elapsed = Number(name.substring(eq + 1)) * 1000;
    name = name.substring(0, eq);
  }
  name = unescape(name);

  child('name').firstElementChild.value = name;

  var hourTime = child('time-hours');
  var minuteTime = child('time-minutes');

  var started = undefined;

  // TODO(sdh): use an object instead of a function as the timer.
  var currentTime = function currentTime() {
    return (elapsed + (started ? new Date() - started : 0)) / 1000;
  };
  var update = function update() {
    var full = currentTime();
    var hours = Math.floor(full / 3600);
    var minutes = String(Math.floor(full % 3600 / 60));
    var seconds = String(Math.floor(full % 60));
    var frac = Math.round(full % 3600 / 360);
    var hourFrac = hours;
    if (frac == 10) {
      frac = 0;
      hourFrac++;
    }
    if (minutes.length < 2) minutes = '0' + minutes;
    if (seconds.length < 2) seconds = '0' + seconds;
    hourTime.textContent = hourFrac + '.' + frac + ' h';
    minuteTime.textContent = hours + ':' + minutes + ':' + seconds;
  };
  update.reset = function () {
    elapsed = 0;
    started = started && +new Date();
    update();
  };
  update.label = function () {
    return escape(child('name').firstElementChild.value) + '=' + (started ? -1 : 1) * currentTime();
  };

  var start = function start() {
    started = +new Date();
    element.classList.add('started');
    update();
  };
  if (elapsed < 0) {
    elapsed *= -1;
    start();
  }
  child('start').addEventListener('click', start);
  child('pause').addEventListener('click', function () {
    elapsed += new Date() - started;
    started = undefined;
    element.classList.remove('started');
    update();
  });
  child('reset').addEventListener('click', function () {
    elapsed = 0;
    started = started && +new Date();
    update();
  });
  child('delete').addEventListener('click', function () {
    element.parentNode.removeChild(element);
    timers.splice(timers.indexOf(update), 1);
    updateTimers();
  });
  child('name').firstElementChild.addEventListener('blur', updateTimers);
  timers.push(update);
}

document.getElementsByClassName('new')[0].addEventListener('click', function () {
  addTimer();
  updateTimers();
});
document.getElementsByClassName('hours')[0].addEventListener('click', function () {
  timerDiv.classList.remove('hourmode');
});
document.getElementsByClassName('minutes')[0].addEventListener('click', function () {
  timerDiv.classList.add('hourmode');
});
document.getElementsByClassName('reset-all')[0].addEventListener('click', function () {
  timers.forEach(function (timer) {
    return timer.reset();
  });
});

document.body.addEventListener('keypress', function (e) {
  if (e.key == 'Enter') e.target.blur();
});

var storageTimers = localStorage && (localStorage.getItem('timerNames') || '').split('|') || [];
storageTimers.forEach(function (timer) {
  return addTimer(timer);
});

function update() {
  timers.forEach(function (timer) {
    return timer();
  });
  window.setTimeout(update, 1000);
  updateTimers();
}
update();

},{}]},{},[1]);
