(function(window, document) {
  var angular = window.angular,
    localStorage = window.localStorage || {},

    app = angular.module('pomodoro', []),
    isDev = localStorage['isDev'],

    SECOND = 1000,
    MINUTE = 60 * SECOND,
    SCALE = isDev ? SECOND : MINUTE,

    DURATIONS = {
      pomodoro: 25 * SCALE,
      shortBreak: 5 * SCALE,
      longBreak: 15 * SCALE
    },

    DATE_FORMAT = 'mm:ss',
    DEFAULT_TASK_NAME = 'Some task',

    notifications = window.webkitNotifications;

  /**
   * @param {String} [name]
   * @property {String} name
   * @property {Object[]} periods
   * @constructor
   */
  function Task(name) {
    this.name = name || '';
    this.periods = [];
  }

  function loadTasks() {
    return JSON.parse(localStorage['tasks'] || '[]');
  }

  /**
   * @param {Object[]} tasks
   */
  function saveTasks(tasks) {
    localStorage['tasks'] = angular.toJson(tasks);
  }

  function soundAlert() {
    // http://stackoverflow.com/questions/8733330/why-cant-i-play-sounds-more-than-once-using-html5-audio-tag
    var audio = document.createElement('audio');
    audio.src = 'alert.mp3';
    audio.load();
    audio.play();
  }

  function notifyAll() {
    document.title = 'Time is up! - Pomodoro tracker';

    new Notification('Pomodoro tracker', {
      tag: 'pomodoro-tracker',
      body: 'Time is up!'
    });

    soundAlert();
  }

  app.controller('MainCtrl', function MainCtrl($scope, $interval, dateFilter) {
    var _this = this,
      tasks = $scope.tasks = loadTasks();

    $scope.timerType = 'pomodoro';
    $scope.formattedTime = dateFilter(DURATIONS.pomodoro, DATE_FORMAT);
    $scope.currentTask = new Task();

    /**
     * @param {Task} task
     */
    $scope.removeTask = function(task) {
      tasks.splice(tasks.indexOf(task), 1);
      saveTasks(tasks);
    };

    _this.updateTimeDisplay = function(timeLeft) {
      $scope.formattedTime = dateFilter(timeLeft, DATE_FORMAT);
      document.title = $scope.formattedTime + ' - Pomodoro tracker';
    };

    /**
     * @return {Boolean}
     */
    _this.isTicking = function() {
      return !!_this.countdownInterval;
    };

    /**
     * @param {Number} duration
     * @param {String} durationType
     */
    _this.startCountdown = function(duration, durationType) {
      if (!duration || !durationType || _this.isTicking()) return;

      var timeLeft = duration,
        currentTask = $scope.currentTask;

      // Looking for task with same name
      tasks.some(function(task) {
        if (!currentTask.name.match(new RegExp(task.name.trim(), 'gi'))) return false;

        $scope.currentTask = currentTask = task;
        return true;
      });

      $scope.timerType = durationType;

      _this.updateTimeDisplay(timeLeft);
      _this.countdownInterval = $interval(function() {
        timeLeft -= SECOND;
        _this.updateTimeDisplay(timeLeft);
      }, SECOND, timeLeft / SECOND);

      _this.countdownInterval.then(function timeIsOut() {
        _this.countdownInterval = null;

        if (!currentTask.name) currentTask.name = DEFAULT_TASK_NAME;

        if (!~tasks.indexOf(currentTask)) tasks.unshift(currentTask);

        currentTask.periods.push({ type: durationType });
        $scope.currentTask = new Task(currentTask.name);

        notifyAll();

        saveTasks(tasks);
      });
    };

    _this.cancelCountdown = function() {
      $interval.cancel(_this.countdownInterval);
      _this.countdownInterval = null;
    };

    _this.restartCountdown = function(duration, durationType) {
      _this.cancelCountdown();
      _this.startCountdown(duration, durationType);
    };

    /**
     * Switch currently selected task.
     * @param {Task} task
     */
    $scope.select = function(task) {
      $scope.currentTask = task;
    };

    /**
     * @param {String} durationType
     */
    $scope.start = function(durationType) {
      document.activeElement.blur();

      var duration = DURATIONS[durationType];
      if (!duration) return;

      _this.restartCountdown(duration, durationType);
    };

    $scope.submit = function() {
      document.activeElement.blur();

      if (_this.isTicking()) return;
      _this.restartCountdown(DURATIONS['pomodoro'], 'pomodoro');
    };

    $scope.showNotifyButton = notifications && notifications.checkPermission() === 1;
    $scope.turnNotifications = function() {
      notifications.requestPermission();
      $scope.showNotifyButton = false;
    };
  });
})(window, document);
