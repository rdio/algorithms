(function() {

  // Actually private storage for verbosity level at closure scope
  var _verbosity = "all";

  /**
   * R.logger
   *
   * Does the error and debug logging.
   **/
  R.logger = {

    // "Private" variables for storing original console functions. They're here
    // instead of at function scope so that spyOn can test that they get called.
    _originalLog: _.isUndefined(window.console) ? R.doNothing : console.log,
    _originalError: _.isUndefined(window.console) ? R.doNothing : console.error,

    /**
     * R.logger.logQueue
     *
     * Used to store log messages in case we want to report errors back to the server.
     **/
    logQueue: [],


    // "Private" lower-level logging abstraction called by the log and error methods.
    _log: function(args, method, sendToConsole) {
      args[0] = '[' + Date() + '] ' + args[0];
      this.logQueue.unshift(args.join(' '));
      if (this.logQueue.length >= 10) {
        this.logQueue.pop();
      }
      if (!sendToConsole) {
        return;
      }
      try {
        if (jQuery.browser.msie /*&& parseInt(jQuery.browser.version, 10) == 7*/) {
          method(args[0]);
        } else {
          method.apply(console, args);
        }
      } catch(e) { }
    },

    /**
     * R.logger.log
     *
     * Log a message to the console, depending on the currently-set verbosity.  R.logger.ensureConsole binds
     * console.log and a few other log functions to this method in production.  You should never call it directly.
     **/
    log: function() {
      this._log(_.toArray(arguments), this._originalLog, _verbosity === 'all');
    },

    /**
     * R.logger.error
     *
     * Log a error to the console, depending on the currently-set verbosity.  R.logger.ensureConsole binds
     * console.error and a few other functions to this method in production.  You should never call it directly.
     **/
    error: function() {
      this._log(_.toArray(arguments), this._originalError, _verbosity !== 'none');
    },

    /**
     * R.logger.verbosity([newVal]) -> String or undefined
     * - newVal (String): The console logging verbosity. One of 'all', 'errors', or 'none'.
     *
     * jQuery style accessor to get or set the verbosity of R's logging.  Note that verbosity only works in
     * production, or if the _.extend conditional is short circuited in R.logger.ensureConsole.  This is somewhat
     * sane since you probably want verbosity('all') in dev anyways, and the main reason we have verbosity is 
     * for external apps using the JS API.
     **/
    verbosity: function(level) {
      if (_.isUndefined(level)) {
        //act as a getter
        return _verbosity;
      } else {
        if (level === 'all' || level === 'errors' || level === 'none') {
          _verbosity = level;
        } else {
          this._originalError("Invalid argument passed to R.logger.verbosity()");
        }
      }
    },

    ensureConsole: function() {
      // bind the logger and error to R.logger so we can use 'this' inside them
      var boundLog = _.bind(R.logger.log, R.logger);
      var boundError = _.bind(R.logger.error, R.logger);

      if (_.isUndefined(window.console)) {
        window.console = {};
      }
      _.defaults(console, {
        log: boundLog,
        info: boundLog,
        warn: boundError,
        error: boundError,
        exception: boundError,
        assert: function(condition, message) {
          if (!condition) {
            this.error("Assertion failed: " + message);
          }
        },
        dir: R.doNothing,
        time: R.doNothing,
        timeEnd: R.doNothing,
        trace: R.doNothing
      });

      // If we're in prod, overwrite the built in functions with our log
      // function which keeps a queue of messages just in case we end up
      // reporting an error to the server
      if (R.serverInfo.get('prod')) {
        _.extend(window.console, {
          log: boundLog,
          info: boundLog,
          warn: boundError,
          error: boundError,
          exception: boundError
        });
      }
    }
  };

  // Set up the console right away so other libraries
  // have immediate access to things like console.assert
  R.logger.ensureConsole();
})();
