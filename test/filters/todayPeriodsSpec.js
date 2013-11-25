describe('todayPeriods', function() {
  var filter;

  beforeEach(module('pomodoro'));

  beforeEach(inject(function($filter) {
    filter = $filter('todayPeriods');
  }));

  it('should return empty array without tasks', function() {
    expect(filter([]).length).toBe(0);
  });

  it('should return empty array with outdated tasks', function() {
    expect(filter([task(123)]).length).toBe(0);
  });

  it('should return single period', function() {
    expect(filter([task(new Date().getTime())]).length).toBe(1);
  });

  function task() {
    return {
      periods: Array.prototype.map.call(arguments, function(time) {
        return { time: time };
      })
    };
  }

});
