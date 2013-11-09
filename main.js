(function(window, document) {
  'use strict';

  var
    localStorage = window.localStorage || {},
    byId = document.getElementById.bind(document),

    SECOND = 1000,
    MINUTE = 60 * SECOND,

    POMODORO_DURATION = (localStorage['isDev'] ? .25 : 25) * MINUTE,
    SHORT_BREAK_DURATION = 5 * MINUTE,
    LONG_BREAK_DURATION = 15 * MINUTE,

    COUNTDOWN_TYPE = {
      POMODORO: 1,
      SHORT_BREAK: 2,
      LONG_BREAK: 3
    },

    countdownEl = byId('countdown'),
    alertSoundEl = byId('alert-sound'),
    pomodorosTodayEl = byId('pomodoros-today'),

    pomodoroButton = byId('start-pomodoro'),
    shortBreakButton = byId('short-break'),
    longBreakButton = byId('long-break'),
    notifyMeButton = byId('notify-me'),

    taskNameInput = byId('task-name'),
    taskNameForm = byId('task-form'),

    notifications = window.webkitNotifications,
    showNotifyButton = notifications && notifications.checkPermission() == 1,

    pomodorosToday = 0;

  if (showNotifyButton) {
    notifyMeButton.classList.add('notify__visible')
  }

  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  function formatTime(time) {
    var mins = Math.floor(time / MINUTE),
      secs = Math.round(time % MINUTE / SECOND);
    return pad(mins) + ':' + pad(secs);
  }

  function Countdown(options) {
    options || (options = {});

    this.tick = options.tick || SECOND;
    this.onTick = options.onTick;
    this.onEnd = options.onEnd;

    this._countdownInterval = null;
  }

  Countdown.prototype = {
    startCountdown: function(countdownTime, _countdownType) {
      if (this._countdownInterval) return;

      this._countdownType = _countdownType;
      this._countdownTime = countdownTime || null;
      this._startMillis = new Date();

      var _this = this;

      this._updateCountdown();
      this._countdownInterval = setInterval(function() {
        _this._updateCountdown();
      }, this.tick);
    },

    stopCountdown: function() {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    },

    restartCountdown: function(countdownTime, countdownName) {
      this.stopCountdown();
      this.startCountdown(countdownTime, countdownName);
    },

    _updateCountdown: function() {
      var timeDiff = new Date() - this._startMillis,
        timeLeft = this._countdownTime - timeDiff;

      this._reportTick(timeLeft < 0 ? 0 : timeLeft);
    },

    _reportTick: function(timeLeft) {
      typeof this.onTick === 'function' && this.onTick(timeLeft);
      if (timeLeft === 0) this._reportEnd();
    },

    _reportEnd: function() {
      this.stopCountdown();
      typeof this.onEnd === 'function' && this.onEnd(this._countdownType);
    }

  };

  function countPomodoros() {
    pomodorosTodayEl.innerText = 'Pomodoros today: ' + ++pomodorosToday;
  }

  var countdown = new Countdown({
    tick: SECOND,
    onTick: function(timeLeft) {
      var formattedTime = formatTime(timeLeft);
      document.title = formattedTime + ' - Pomodoro tracker';
      countdownEl.innerText = formattedTime;
    },
    onEnd: function(countdownType) {
      // Count pomodoros
      countdownType == COUNTDOWN_TYPE.POMODORO && countPomodoros();

      alertSoundEl.play();
      document.title = 'Time is up! - Pomodoro tracker';
      new Notification('Pomodoro tracker', {
        tag: 'pomodoro-tracker',
        body: 'Time is up!'
      });
    }
  });

  taskNameForm.addEventListener('submit', function(e) {
    e.preventDefault();

    countdown.startCountdown(POMODORO_DURATION, COUNTDOWN_TYPE.POMODORO);
    taskNameInput.blur();
  });

  pomodoroButton.addEventListener('click', function() {
    countdown.restartCountdown(POMODORO_DURATION, COUNTDOWN_TYPE.POMODORO);
  });

  shortBreakButton.addEventListener('click', function() {
    countdown.restartCountdown(SHORT_BREAK_DURATION, COUNTDOWN_TYPE.SHORT_BREAK);
  });

  longBreakButton.addEventListener('click', function() {
    countdown.restartCountdown(LONG_BREAK_DURATION, COUNTDOWN_TYPE.LONG_BREAK);
  });

  notifyMeButton.addEventListener('click', function() {
    notifications.requestPermission();
    notifyMeButton.classList.remove('notify__visible');
  })

})(window, document);
