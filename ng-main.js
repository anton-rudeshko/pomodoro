(function(window, document) {
  var angular = window.angular,

    app = angular.module('pomodoro', []),
    localStorage = window.localStorage || {},
    isDev = localStorage['isDev'],

    SECOND = 1000,
    MINUTE = 60 * SECOND,
    SCALE = isDev ? SECOND : MINUTE,

    DURATIONS = {
      pomodoro: 25 * SCALE,
      shortBreak: 5 * SCALE,
      longBreak: 15 * SCALE
    },

    DEFAULT_TASK_NAME = 'Some task',

    notifications = window.webkitNotifications;

  /**
   * @param {String} [name]
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

  app.controller('MainCtrl', function($scope, $interval, dateFilter) {
    var _this = this,

      tasks = $scope.tasks = loadTasks();

    $scope.timerType = 'pomodoro';
    $scope.formattedTime = '25:00';
    $scope.currentTask = new Task();

    $scope.removeTask = function(task) {
      tasks.splice(tasks.indexOf(task), 1);
      saveTasks(tasks);
    };

    _this.updateTimeDisplay = function(timeLeft) {
      $scope.formattedTime = dateFilter(timeLeft, 'mm:ss');
      document.title = $scope.formattedTime + ' - Pomodoro tracker';
    };

    /**
     * @param {Number} duration
     * @param {String} durationType
     */
    _this.countdown = function(duration, durationType) {
      if (_this.countdownInterval) return;

      var timeLeft = duration,
        currentTask = $scope.currentTask;

      // Looking for task with same name
      tasks.some(function(task) {
        if (!task.name.match(new RegExp(currentTask.name.trim(), 'gi'))) return false;

        $scope.currentTask = currentTask = task;
        return true;
      });

      $scope.timerType = durationType;

      _this.updateTimeDisplay(timeLeft);
      _this.countdownInterval = $interval(function() { timeLeft -= SECOND; }, SECOND, timeLeft / SECOND)
        .then(function timeIsOut() {
          _this.countdownInterval = null;

          if (!currentTask.name) currentTask.name = DEFAULT_TASK_NAME;

          if (!~tasks.indexOf(currentTask)) tasks.unshift(currentTask);

          currentTask.periods.push({ type: durationType });

          notifyAll();

          saveTasks(tasks);
        }, function canceled() {

        }, function progress() {
          _this.updateTimeDisplay(timeLeft);
        });
    };

    $scope.select = function(task) {
      $scope.currentTask = task;
    };

    $scope.start = function(durationType) {
      var duration = DURATIONS[durationType];
      if (duration) _this.countdown(duration, durationType);
    };

    $scope.showNotifyButton = notifications && notifications.checkPermission() === 1;
    $scope.turnNotifications = function() {
      notifications.requestPermission();
      $scope.showNotifyButton = false;
    };
  });
})(window, document);
