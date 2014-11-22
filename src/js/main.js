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

  function now() {
    return +new Date();
  }

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

  function normalizeTaskName(task) {
    return task.name.trim().toLowerCase();
  }

  function taskEquals(task1, task2) {
    return normalizeTaskName(task1) === normalizeTaskName(task2);
  }

  /**
   * @param {String} type
   * @constructor
   */
  function Period(type) {
    this.type = type;
    this.time = now();
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

    function findMatchingTask(task) {
      for (var i = 0, len = tasks.length; i < len; i++)
        if (taskEquals(tasks[i], task))
          return tasks[i];
    }

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

    _this.updateCountdownDisplay = function(timeLeft, taskName) {
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
     * @param {String} durationType
     * @see https://docs.angularjs.org/api/ng/service/$interval
     */
    _this.startCountdown = function(durationType) {
      var duration = DURATIONS[durationType];
      if (!duration || _this.isTicking()) return;

      var startTime = now(),
        currentTask = $scope.currentTask = findMatchingTask($scope.currentTask) || $scope.currentTask,
        INTERVAL = SECOND / 4;

      $scope.timerType = durationType;

      _this.updateCountdownDisplay(duration, currentTask.name);

      _this.countdownInterval = $interval(function onTick() {
        var elapsedTime = now() - startTime,
          timeLeft = Math.max(duration - elapsedTime, 0);

        timeLeft = Math.ceil(timeLeft / SECOND) * SECOND; // display previous second as long as possible
        _this.updateCountdownDisplay(timeLeft, currentTask.name);

        if (timeLeft > 0) return;

        _this.stopCountdown();
        onFinish();
      }, INTERVAL);

      function onFinish() {
        if (!currentTask.name) currentTask.name = DEFAULT_TASK_NAME;

        var match = findMatchingTask(currentTask);
        match ? currentTask = match : tasks.unshift(currentTask);

        currentTask.periods.push(new Period(durationType));
        $scope.currentTask = new Task(currentTask.name);

        saveTasks(tasks);

        notifyAll(currentTask.name);

        ga('send', 'event', durationType, 'end');
      }

      ga('send', 'event', durationType, 'start');
    };

    _this.stopCountdown = function() {
      $interval.cancel(_this.countdownInterval);
      _this.countdownInterval = null;
    };

    _this.restartCountdown = function(durationType) {
      _this.stopCountdown();
      _this.startCountdown(durationType);
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
      _this.restartCountdown(durationType);
    };

    /**
     * Submit may be used to confirm task name change, so we should not restart countdown if already ticking.
     * @public
     */
    $scope.submit = function() {
      if (!_this.isTicking()) $scope.start(POMODORO_STR);
    };

    // HTML5 Notifications
    $scope.showNotifyButton = notifications && notifications.permission !== 'granted';
    $scope.turnNotifications = function() {
      notifications.requestPermission();
      $scope.showNotifyButton = false;
    };
  }]);
})(window, document);
