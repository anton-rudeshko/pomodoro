(function(document) {
  'use strict';

  var byId = document.getElementById.bind(document),

    SECOND = 1000,
    MINUTE = 60 * SECOND,

    POMODORO_DURATION = 25 * MINUTE,
    SHORT_BREAK_DURATION = 5 * MINUTE,
    LONG_BREAK_DURATION = 15 * MINUTE,

    needStopTimer = false,
    timeout = null,

    countdownEl = byId('timer'),
    pomodorosTodayEl = byId('pomodoros-today'),

    pomodoroButton = byId('start-pomodoro'),
    shortBreakButton = byId('short-break'),
    longBreakButton = byId('long-break'),
    notifyMeButton = byId('notify-me'),

    taskNameInput = byId('task-name'),
    taskNameForm = byId('task-form'),

    pomodorosToday = 0;

  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  function formatTime(time) {
    var mins = Math.floor(time / MINUTE),
      secs = Math.floor(time % MINUTE / SECOND);
    return pad(mins) + ':' + pad(secs);
  }

  function startTimer(time) {
    if (timeout) return;

    var startMillis = new Date();
    needStopTimer = false;

    (function updateTimer() {
      var timeDiff = new Date() - startMillis,
        timeLeft = time - timeDiff;

      if (timeLeft <= 0) {
        timeLeft = 0;
        needStopTimer = true;
      }

      countdownEl.innerText = formatTime(timeLeft);

      if (timeLeft === 0) {
        pomodorosTodayEl.innerText = 'Pomodoros today: ' + ++pomodorosToday;
        notify();
      }

      if (needStopTimer)
        stopTimer();
      else
        timeout = setTimeout(updateTimer, 250)
    })();
  }

  function stopTimer() {
    clearTimeout(timeout);
    timeout = null;
  }

  function notify() {
    return new Notification('Pomodoro tracker', {
      tag: 'pomodoro-tracker',
      body: 'Time is up!'
    });
  }

  taskNameForm.addEventListener('submit', function(e) {
    e.preventDefault();

    startTimer(POMODORO_DURATION);
    taskNameInput.blur();
  });

  pomodoroButton.addEventListener('click', function(e) {
    stopTimer();
    startTimer(POMODORO_DURATION);
  });

  shortBreakButton.addEventListener('click', function(e) {
    stopTimer();
    startTimer(SHORT_BREAK_DURATION);
  });

  longBreakButton.addEventListener('click', function(e) {
    stopTimer();
    startTimer(LONG_BREAK_DURATION);
  });

  notifyMeButton.addEventListener('click', function(e) {
    Notification.requestPermission(function(permission) {
    })
  })



})(document);
