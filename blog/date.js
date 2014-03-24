/*jslint browser:true */
/*globals R Bujagali Locale */

/**
 * R.Date
 *
 * Namespace for Date helpers.
 **/
R.Date = (function() {
  var t = typeof t === 'undefined' ? _.identity : t;
  var Locale = typeof Locale === 'undefined' ? {} : Locale;

  var keys = {
    shortDays: [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')],
    longDays: [t('Sunday'), t('Monday'), t('Tuesday'), t('Wednesday'), t('Thursday'), t('Friday'), t('Saturday')],
    shortMonths: [t('Jan'), t('Feb'), t('Mar'), t('Apr'), t('May'), t('Jun'), t('Jul'), t('Aug'), t('Sep'), t('Oct'), t('Nov'), t('Dec')],
    longMonths: [t('January'), t('February'), t('March'), t('April'), t('May'), t('June'), t('July'), t('August'), t('September'), t('October'), t('November'), t('December')]
  };

  var paddingOperatorMap = {
    '-': '',
    '_': ' ',
    '0': '0'
  };

  function pad(num, padWith) {
    if (padWith === null) {
      padWith = paddingOperatorMap['0'];
    }

    if (num < 10) {
      return padWith + num;
    }
    else {
      return num;
    }
  }

  var tzFinder = /[A-Z]{3}/g;
  var formats = {
    a: function(date) { return keys.shortDays[date.getDay()]; },
    A: function(date) { return keys.longDays[date.getDay()]; },
    b: function(date) { return keys.shortMonths[date.getMonth()]; },
    B: function(date) { return keys.longMonths[date.getMonth()]; },
    c: function(date) { return date.toString(); },
    d: function(date, padWith) {
      return pad(date.getDate(), padWith);
    },
    e: function(date, padWith) {
      if (padWith === null) {
        padWith = paddingOperatorMap._;
      }

      return pad(date.getDate(), padWith);
    },
    H: function(date, padWith) {
      return pad(date.getHours(), padWith);
    },
    I: function(date) {
      if (date.getHours() % 12 === 0) {
        return 12;
      }
      return date.getHours() % 12;
    },
    m: function(date, padWith) {
         return pad(date.getMonth() + 1, padWith);
    },
    M: function(date, padWith) {
      return pad(date.getMinutes(), padWith);
    },
    p: function(date) {
      var hour = date.getHours();
      if (hour >= 12) {
        return 'PM';
      }
      return 'AM';
    },
    S: function(date, padWith) {
      return pad(date.getSeconds(), padWith);
    },
    x: function(date) { return R.Date.strftime(date, Locale.shortDate || '%m/%d/%y'); },
    X: function(date) {
      return Locale.timeFormat ? R.Date.strftime(date, Locale.timeFormat) : date.toLocaleTimeString();
    },
    y: function(date) { return date.getFullYear().toString().slice(2); },
    Y: function(date) { return date.getFullYear(); },
    Z: function(date) {
      var tz = date.toString().match(tzFinder);
      if (tz && tz.length) {
        return tz.pop();
      }
      else {
        return '';
      }
    },
    '%': function() { return '%'; }
  };

  var parser = /%([\-_0]?[A-z%])/g;

  var durations = {
    'ms': 1,
    's': (1000),
    'm': (1000*60),
    'h': (1000*60*60),
    'd': (1000*60*60*24),
    'w': (1000*60*60*24*7),
    'mo':(1000*60*60*24*30), // imperfect
    'y': (1000*60*60*24*365) // also imperfect
  };
  var duration_regex = /^(-?)([0-9]+)\s*(.*)$/;

  var granularities = {
    'minutes': 0,
    'hours': 1,
    'days': 2,
    'weeks': 3,
    'months': 4,
    'years': 5
  };

  var relativeFutureMap = {
    'years': function(diff) {
      return t(['in [num] year', 'in [num] years'], {
        num: Math.round(diff / D('-1y'))
      });
    },
    'months': function(diff) {
      return t(['in [num] month', 'in [num] months'], {
        num: Math.round(diff / D('-1mo'))
      });
    },
    'weeks': function(diff) {
      return t(['in [num] week', 'in [num] weeks'], {
        num: Math.round(diff / D('-1w'))
      });
    },
    'days': function(diff) {
      return t(['in [num] day', 'in [num] days'], {
        num: Math.round(diff / D('-1d'))
      });
    },
    'hours': function(diff) {
      return t(['in one hour', 'in [num] hours'], {
        num: Math.round(diff / D('-1h'))
      });
    },
    'minutes': function(diff) {
      return t(['in a minute', 'in [num] minutes'], {
        num: Math.round(diff / D('-1m'))
      });
    }
  };

  var relativePastMap = {
    'years': function(diff) {
      return t(['[num] year ago', '[num] years ago'], {
        num: Math.round(diff / D('1y'))
      });
    },
    'months': function(diff) {
      return t(['[num] month ago', '[num] months ago'], {
        num: Math.round(diff / D('1mo'))
      });
    },
    'weeks': function(diff) {
      return t(['[num] week ago', '[num] weeks ago'], {
        num: Math.round(diff / D('1w'))
      });
    },
    'days': function(diff) {
      return t(['[num] day ago', '[num] days ago'], {
        num: Math.round(diff / D('1d'))
      });
    },
    'hours': function(diff) {
      return t(['[num] hour ago', '[num] hours ago'], {
        num: Math.round(diff / D('1h'))
      });
    },
    'minutes': function(diff) {
      return t(['[num] minute ago', '[num] minutes ago'], {
        num: Math.round(diff / D('1m'))
      });
    }
  };

  // return durations in ms
  function D(s) {
    var m = s.match(duration_regex);
    return parseInt("" + m[1] + (parseInt(m[2], 10)*durations[m[3]]), 10);
  }

  // borrowed from date.js
  function isLeapYear(year) { 
    return ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0); 
  }

  // borrowed from date.js
  function getDaysInMonth(year, month) {
    return [31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  return {
    /* strftime implementation that mimics the python version, docs here:
     * http://docs.python.org/library/datetime.html#strftime-strptime-behavior
     * Supports different locales, you should use this everywhere.
     * Extended to support padding operator:
     * http://www.gnu.org/software/libc/manual/html_node/Formatting-Calendar-Time.html
     */
    strftime: function(date, format) {
      if (!date) {
        return '';
      }
      var matches = format.match(parser);

      if (!matches) { return format; }

      var len = matches.length;
      var padWith;
      var match;
      var identifier;

      for (var i = 0; i < len; i++) {
        match = matches[i];
        identifier = match.charAt(1);

        padWith = paddingOperatorMap[identifier];

        if (typeof padWith !== 'undefined') {
          identifier = match.charAt(2);
        }

        format = format.replace(match, formats[identifier](date, padWith));
      }

      return format;
    },

    // borrowed from date.js
    addMonths: function(date, value) {
      var day = date.getDate();
      date.setDate(1);
      date.setMonth(date.getMonth() + value * 1);
      var daysInMonth = getDaysInMonth(date.getFullYear(), date.getMonth());
      date.setDate(Math.min(day, daysInMonth));
      return date;
    },

    formatCreditCardDate: function(date) {
      if (_.isString(date)) {
        // RDIO1: In rdio 1 land, we pass a variable to exclude. We usually
        // want to exclude, so we default to that in rdio 2. Change this
        // once we update Utils.date in rdio 2 land.
        date = Bujagali.Utils.date(date, true);
      }

      return this.strftime(date, '%m/%Y');
    },

    formatShortDate: function(date, includeTimezone) {
      if (_.isString(date)) {
        // RDIO1: In rdio 1 land, we pass a variable to exclude. We usually
        // want to exclude, so we default to that in rdio 2. Change this
        // once we update Utils.date in rdio 2 land.
        date = Bujagali.Utils.date(date, !includeTimezone);
      }

      return this.strftime(date, Locale.shortDate);
    },

    formatLongDate: function(date, includeTimezone) {
      if (_.isString(date)) {
        // RDIO1: In rdio 1 land, we pass a variable to exclude. We usually
        // want to exclude, so we default to that in rdio 2. Change this
        // once we update Utils.date in rdio 2 land.
        date = Bujagali.Utils.date(date, !includeTimezone);
      }

      return this.strftime(date, Locale.longDate || "%B %d, %Y");
    },

    // express a relative time (in ms) in words
    //   - minGranularity (String): specify the minimum relative time unit. (Optional)
    //                              Possible keys: 'minutes', 'hours', 'days', 'weeks', 'months', 'years'
    relativeTime: function(date, minGranularity) {
      var now = (new Date()).getTime();
      var diff = now - date;
      var d;
      try {
        var unit;
        if (diff < 0) {
          if (diff < D('-1y')) {
            unit = 'years';
          } else if (diff < D('-6w')) {
            unit = 'months';
          } else if (diff < D('-2w')) {
            unit = 'weeks';
          } else if (diff < D('-1d')) {
            unit = 'days';
          } else if (diff < D('-1h')) {
            unit = 'hours';
          } else if (diff < D('-1m')) {
            unit = 'minutes';
          } else {
            return t('in a moment');
          }

          if (minGranularity && granularities[unit] > granularities[minGranularity]) {
            unit = minGranularity;
          }

          return relativeFutureMap[unit](diff);
        } else {
          if (diff < D('1m')) {
            return t('a moment ago');
          } else if (diff < D('1h')) {
            unit = 'minutes';
          } else if (diff < D('1d')) {
            unit = 'hours';
          } else if (diff < D('1w')) {
            unit = 'days';
          } else if (diff < D('8w')) {
            unit = 'weeks';
          } else if (diff < D('1y')) {
            unit = 'months';
          } else {
            unit = 'years';
          }

          if (minGranularity && granularities[unit] > granularities[minGranularity]) {
            unit = minGranularity;
          }

          return relativePastMap[unit](diff);
        }
      } catch (exc) {
        console.log('Could not translate relative times: ', t, exc);
        throw exc;
      }
    },
    duration: D
  };
})();

Bujagali.mixin(R.Date);
