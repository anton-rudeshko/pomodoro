(function(window, document) {
  'use strict';

  var
    localStorage = window.localStorage || {},
    byId = document.getElementById.bind(document),

    /**
     *
     * @param {EventTarget} el
     * @param {String} event
     * @param {Function} callback
     */
    on = function(el, event, callback) {
      el.addEventListener(event, callback);
    },

    SECOND = 1000,
    MINUTE = 60 * SECOND,

    POMODORO_DURATION = (localStorage['isDev'] ? .25 : 25) * MINUTE,
    SHORT_BREAK_DURATION = (localStorage['isDev'] ? .05 : 5) * MINUTE,
    LONG_BREAK_DURATION = (localStorage['isDev'] ? .15 : 15) * MINUTE,

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

    currentTask = null,
    tasks = JSON.parse(localStorage['tasks'] || '[]');

  if (showNotifyButton) {
    notifyMeButton.classList.add('notify__visible')
  }

  pomodorosTodayEl.innerHTML = renderTaskList(tasks);

  function pad(num) {
    return num < 10 ? '0' + num : num;
  }

  function formatTime(time) {
    var mins = Math.floor(time / MINUTE),
      secs = Math.round(time % MINUTE / SECOND);
    return pad(mins) + ':' + pad(secs);
  }

  /**
   * @param {String} name
   * @constructor
   */
  function Task(name) {
    this.name = name;

    this.pomodoros = 0;
    this.shortBreaks = 0;
    this.longBreaks = 0;
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
      this._countdownInterval = setInterval(function updateCountdown() {
        _this._updateCountdown();
      }, this.tick);
    },

    isTicking: function() {
      return !!this._countdownInterval;
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

  function soundAlert() {
    // http://stackoverflow.com/questions/8733330/why-cant-i-play-sounds-more-than-once-using-html5-audio-tag
    window.chrome && alertSoundEl.load();
    alertSoundEl.play();
  }

  var countdown = new Countdown({
    tick: SECOND,
    onTick: function(timeLeft) {
      var formattedTime = formatTime(timeLeft);
      document.title = formattedTime + ' - Pomodoro tracker';
      countdownEl.innerText = formattedTime;
    },
    onEnd: function(countdownType) {
      countdownType === COUNTDOWN_TYPE.POMODORO && currentTask.pomodoros++;
      countdownType === COUNTDOWN_TYPE.SHORT_BREAK && currentTask.shortBreaks++;
      countdownType === COUNTDOWN_TYPE.LONG_BREAK && currentTask.longBreaks++;

      soundAlert();

      document.title = 'Time is up! - Pomodoro tracker';
      new Notification('Pomodoro tracker', {
        tag: 'pomodoro-tracker',
        body: 'Time is up!'
      });

      saveTasks(tasks);
      pomodorosTodayEl.innerHTML = renderTaskList(tasks);
    }
  });

  function saveTasks(tasks) {
    localStorage['tasks'] = JSON.stringify(tasks);
  }

  function updateTask(newTaskName) {
    if (!currentTask || (!countdown.isTicking() && currentTask.name !== newTaskName))
      tasks.unshift(currentTask = new Task(newTaskName));
    currentTask.name = newTaskName;

    saveTasks(tasks);

    pomodorosTodayEl.innerHTML = renderTaskList(tasks);
  }

  on(taskNameForm, 'submit', function(e) {
    e.preventDefault();
    taskNameInput.blur();

    updateTask(taskNameInput.value);
    countdown.startCountdown(POMODORO_DURATION, COUNTDOWN_TYPE.POMODORO);
  });

  on(pomodoroButton, 'click', function() {
    updateTask(taskNameInput.value);
    countdown.restartCountdown(POMODORO_DURATION, COUNTDOWN_TYPE.POMODORO);
  });

  on(shortBreakButton, 'click', function() {
    updateTask(taskNameInput.value);
    countdown.restartCountdown(SHORT_BREAK_DURATION, COUNTDOWN_TYPE.SHORT_BREAK);
  });

  on(longBreakButton, 'click', function() {
    updateTask(taskNameInput.value);
    countdown.restartCountdown(LONG_BREAK_DURATION, COUNTDOWN_TYPE.LONG_BREAK);
  });

  on(notifyMeButton, 'click', function() {
    notifications.requestPermission();
    notifyMeButton.classList.remove('notify__visible');
  });

  function renderTaskList(tasks) {
    return '<ul class="task-list">' + tasks.map(renderTask).join('') + '</ul>'
  }

  function renderTask(task) {
    return '<li class="task-list__task">' +
           (task.name ? task.name + ': ' : '') +
           [task.pomodoros, task.shortBreaks, task.longBreaks].join('/') +
           '</li>';
  }

})(window, document);
