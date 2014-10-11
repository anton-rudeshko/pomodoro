(function(window, document) {
  var angular = window.angular,
    ga = window.ga,
    localStorage = window.localStorage || {},

    POMODORO_STR = 'pomodoro',

    app = angular.module(POMODORO_STR, []),
    isDev = localStorage['isDev'],

    SECOND = 1000,
    MINUTE = 60 * SECOND,
    SCALE = isDev ? SECOND / 5 : MINUTE,

    DURATIONS = {
      pomodoro: 25 * SCALE,
      shortBreak: 5 * SCALE,
      longBreak: 15 * SCALE
    },

    DATE_FORMAT = 'mm:ss',
    DEFAULT_TASK_NAME = 'Some task',

    notifications = window.Notification;

  function panTime(number) {
    return ('00' + number).slice(-2);
  }

  /**
   * @param {String} [name]
   * @constructor
   */
  function Task(name) {
    this.name = name || '';
    this.periods = [];
  }

  /**
   * @param {String} type
   * @constructor
   */
  function Period(type) {
    this.type = type;
    this.time = new Date().getTime();
  }

  /**
   * @return {Task[]}
   */
  function loadTasks() {
    return angular.fromJson(localStorage['tasks'] || '[]');
  }

  /**
   * @param {Task[]} tasks
   */
  function saveTasks(tasks) {
    localStorage['tasks'] = angular.toJson(tasks);
  }

  function soundAlert() {
    // http://stackoverflow.com/questions/8733330/why-cant-i-play-sounds-more-than-once-using-html5-audio-tag
    var audio = document.createElement('audio');
    audio.src = 'assets/alert.mp3';
    audio.load();
    audio.play();
  }

  function notifyAll(taskName) {
    document.title = 'Time is up!' + (taskName ? ' - ' + taskName : '') + ' - Pomodoro Tracker';

    soundAlert();

    var notification = new Notification('Pomodoro Tracker', {
      tag: 'pomodoro-tracker',
      body: (taskName ? taskName + ' - ' : '') + 'Time is up!'
    });

    // Automatically close notification after 5 seconds
    notification.onshow = function() {
      setTimeout(function() { notification.close(); }, 5 * SECOND);
    };
  }

  /**
   * @param {Number|Date} date
   * @return {Number}
   */
  function dropTime(date) {
    date = new Date(date);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  /**
   * @return {Number}
   */
  function todayDate() {
    return dropTime(new Date());
  }

  app.filter('periods', function() {
    return function(tasks) {
      return tasks.reduce(function(result, task) {
        return result.concat(task.periods || []);
      }, []);
    };
  });

  app.filter('today', ['periodsFilter', function(periodsFilter) {
    return function(tasks) {
      var today = todayDate();

      return periodsFilter(tasks).filter(function(period) {
        return today === dropTime(period.time);
      });
    };
  }]);

  app.filter('pomodoros', function() {
    return function(periods) {
      return periods.filter(function(period) {
        return period.type === POMODORO_STR;
      }).length || '';
    };
  });

  app.filter('spent', function() {
    return function(periods) {
      var mins = periods.reduce(function(result, period) {
        return result + DURATIONS[period.type];
      }, 0) / SCALE;

      var hours = (mins / 60) >> 0;
      mins = mins % 60;
      return hours + ':' + panTime(mins);
    };
  });

  app.controller('MainCtrl', ['$scope', '$interval', 'dateFilter', function($scope, $interval, dateFilter) {
    var _this = this,
      tasks = $scope.tasks = loadTasks();

    window.onbeforeunload = function() {
      if (_this.isTicking()) return 'Still ticking!';
    };

    $scope.timerType = POMODORO_STR;
    $scope.formattedTime = dateFilter(DURATIONS.pomodoro, DATE_FORMAT);
    $scope.currentTask = new Task();

    /**
     * @param {Task} task
     */
    $scope.removeTask = function(task) {
      tasks.splice(tasks.indexOf(task), 1);
      saveTasks(tasks);
    };

    _this.updateTimeDisplay = function(timeLeft, taskName) {
      $scope.formattedTime = dateFilter(timeLeft, DATE_FORMAT);
      document.title = $scope.formattedTime + (taskName ? ' - ' + taskName : '') + ' - Pomodoro Tracker';
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

      _this.updateTimeDisplay(timeLeft, currentTask.name);
      _this.countdownInterval = $interval(function() {
        timeLeft -= SECOND;
        _this.updateTimeDisplay(timeLeft, currentTask.name);
      }, SECOND, timeLeft / SECOND);

      _this.countdownInterval.then(function timeIsOut() {
        _this.countdownInterval = null;

        if (!currentTask.name) currentTask.name = DEFAULT_TASK_NAME;

        if (!~tasks.indexOf(currentTask)) tasks.unshift(currentTask);

        currentTask.periods.push(new Period(durationType));
        $scope.currentTask = new Task(currentTask.name);

        saveTasks(tasks);

        notifyAll(currentTask.name);

        ga('send', 'event', durationType, 'end');
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
     * @public
     */
    $scope.select = function(task) {
      $scope.currentTask = task;
    };

    /**
     * @param {String} durationType
     * @public
     */
    $scope.start = function(durationType) {
      document.activeElement.blur();

      var duration = DURATIONS[durationType];
      if (!duration) return;

      _this.restartCountdown(duration, durationType);

      ga('send', 'event', durationType, 'start');
    };

    /**
     * @public
     */
    $scope.submit = function() {
      document.activeElement.blur();

      if (_this.isTicking()) return;
      _this.restartCountdown(DURATIONS[POMODORO_STR], POMODORO_STR);
    };

    // HTML5 Notifications
    $scope.showNotifyButton = notifications && notifications.permission !== 'granted';
    $scope.turnNotifications = function() {
      notifications.requestPermission();
      $scope.showNotifyButton = false;
    };
  }]);
})(window, document);
