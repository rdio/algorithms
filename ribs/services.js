(function() {
  var BaseService = function(options) {
    this.options = options || {};
    this._readyState = R.Services.STATE_NOT_READY;
    this.initialize();
    this.trigger('initialized');
  };

  BaseService.extend = Backbone.View.extend;

  /**
   * class R.Service
   * 
   * Base class used for services
   **/
  _.extend(BaseService.prototype, Backbone.Events, {
    /**
     * R.Service#isGlobal -> Boolean
     *
     * Set to true if this service should be a "global" off of R.
     * Note that all implementations of a service type need to agree on their isGlobal.
     **/
    isGlobal: false,
    
    initialize: function() {
      this.onInitialized();
    },

    /**
     * R.Service#onInitialized() -> undefined
     *
     * Called when the service is being created. Default implementation is a no-op.
     **/
    onInitialized: R.doNothing,

    /**
     * R.Service#isReady() -> Boolean
     *
     * Returns true if the service has signaled it is ready
     **/
    isReady: function() {
      return this._readyState == R.Services.STATE_READY;
    },

    /**
     * R.Service#onStarted(k) -> undefined
     * - k (Function): continuation callback to be called when the service is ready
     *
     * Override this if there is any async initialization that needs to be completed (wait for flash, etc). The
     * default implementation just calls k and returns.
     **/
    onStarted: function(k) {
      k();
    },

    /**
     * R.Services#onStopping() -> undefined
     *
     * Override this to do any cleanup that may include talking to other parts of the app or other services.
     * Default implementation is a no-op.
     **/
    onStopping: R.doNothing,

    /**
     * R.Service#onStopped() -> undefined
     *
     * Override this to do any internal cleanup that should happen after services are destroyed. Default
     * implementation is a no-op.
     **/
    onStopped: R.doNothing,

    /**
     * R.Service#onAppCreated(app) -> undefined
     * - app (Object): App instance that was just created
     *
     * Override this to hook up to the app. Default implementation is a no-op.
     **/
    onAppCreated: R.doNothing,

    /**
     * R.Service#isUsable() -> Boolean
     *
     * Used to determine if the service is (likely) to be usable. Default implementation returns true.
     **/
    isUsable: function() {
      return true;
    },
    
    /**
     * R.Service#getCaps() -> Object
     *
     * Returns an object listing the capabilities of the service.
     * Default implementation returns undefined.
     **/
    getCaps: function() {
      return undefined;
    },

    _setReadyState: function(new_state) {
      if (this._readyState == new_state) {
        return;
      }

      switch (new_state) {
        case R.Services.STATE_READY:
          var self = this;
          var k = function() {
            self._readyState = new_state;
            if (self.isReady()) {
              console.log('[Services] ' + self._name + ' is ready');
              self.trigger('ready');
              R.Services.trigger(self._name + ':ready');
            }
          };

          this.onStarted(k);
          break;
        case R.Services.STATE_STOPPED:
          try {
            this.onStopped();
          } catch (e) {
            R.Utils.logException('Error stopping service ' + this._name, e);
          }
          this._readyState = new_state;
          break;
        case R.Services.STATE_STOPPING:
          this.onStopping();
          this._readyState = new_state;
          break;
        default:
          console.error('Unable to handle new ready state: ', new_state);
          break;
      }
    }
  });

  R.Services = function() {

  };

  /**
   * class R.Services
   *
   * Container for various services exposed internally
   **/
  _.extend(R.Services, Backbone.Events, {
    _serviceKlasses: {},
    _activeServices: {}, 

    /**
     * R.Services.register(name, props[, options]) -> undefined
     * - name (String): Name of the service
     * - props (Object): Service methods
     * - options (Object): Optional initialization options. Used for determing which implementation to use for a specific service.
     *
     * Use this to register new services for use, see [[R.Service]] documentation for more information on services
     **/
    register: function(name, props, options) {
      var klass = BaseService.extend(props);

      options = options || {};
      _.defaults(options, {
        priority: this._serviceKlasses[name] ? this._serviceKlasses[name].length + 1 : 1,
        id: Math.random()
      });

      klass.prototype._name = name;
      klass.prototype.__options = options;

      if (this._serviceKlasses[name] && this._serviceKlasses[name].length) {
        console.assert(klass.prototype.isGlobal == this._serviceKlasses[name][0].prototype.isGlobal, 
          "[Services] all implementations of " + name + " must agree on isGlobal");
        this._serviceKlasses[name].push(klass);
      } else {
        this._serviceKlasses[name] = [klass];
      }
    },

    /**
     * R.Services.unregister(name) -> undefined
     * - name (String): Name of the service
     *
     * Use this to unregister new services for use. This will prevent the
     * service from being started or stopped when [[R.Services.start]] or
     * [[R.Services.stop]] are called.
     **/
    unregister: function(name) {
      this.stop(name);
      delete this._serviceKlasses[name];
    },

    /**
     * R.Services.start([name]) -> undefined
     * - name (String): the name of the service to start
     *
     * Starts the service specified by `name`. If `name` is not defined, starts
     * all services registered with [[R.Services.register]].
     **/
    start: function(name, optionsMap) {
      optionsMap = optionsMap || {};
      if (name) {
        if (this._activeServices[name]) {
          console.log('Service named ' + name + ' already exists');
        } else {
          if (!this._serviceKlasses[name]) {
            console.log('No service named ', name);
            return;
          }

          this._createService(name, optionsMap[name]);
        }
        if (this._activeServices[name].isUsable()) {
          this._activeServices[name]._setReadyState(this.STATE_READY);
        }
      } else {
        var servicesToStart = [];

        var self = this;
        _.each(this._serviceKlasses, function(klass, name) {
          // Fill in empty services when start() is called without arguments
          // Don't try to start services that are already started
          if (!(name in self._activeServices)) {
            self._createService(name, optionsMap[name]);
            servicesToStart.push(name);
          }
        });

        _.each(servicesToStart, function(serviceName) {
          if (self._activeServices[serviceName].isUsable()) {
            self._activeServices[serviceName]._setReadyState(self.STATE_READY);
          }
        });
      }
    },

    /**
     * R.Services.stop([name]) -> undefined
     * - name (String): the name of the service to stop
     *
     * Stops the service specified by `name`, or stops all services if `name`
     * is not provided.
     **/
    stop: function(name) {
      var self = this;
      var servicesToStop = name ? [name] : _.keys(this._serviceKlasses);
      var servicesStopping = [];
      _.each(servicesToStop, function(name) {
        if (self._activeServices[name] && self._activeServices[name].isReady()) {
          self._activeServices[name]._setReadyState(self.STATE_STOPPING);
          servicesStopping.push(name);
        }
      });
      _.each(servicesStopping, function(name) {
        self._activeServices[name]._setReadyState(self.STATE_STOPPED);
      });
      _.each(servicesToStop, function(name) {
        self._deleteReferences(name);
      });
    },

    /**
     * R.Services.appCreated(app) -> undefined
     * - app (Object): Instance of app that was just created
     *
     * Pass the new app to all the services to allow them to hook up to events, etc.
     **/
    appCreated: function(app) {
      var self = this;
      _.each(this._serviceKlasses, function(klass, name) {
        if (self._activeServices[name] && self._activeServices[name].isUsable()) {
          self._activeServices[name].onAppCreated(app);
        }
      });
    },

    /**
     * R.Services.ready(name, callback) -> undefined
     * - name (String): The name of the service
     * - callback (Function): The function to call when ready
     *
     * Call the given `callback` when the service specified by `name` is ready.
     * The callback will only be called once.
     **/
    ready: function(name, k) {
      if (this._activeServices[name] && this._activeServices[name].isReady()) {
        k();
      } else {
        var eventName = name + ':ready';
        this.bind(eventName, function() {
          this.unbind(eventName, arguments.callee);
          k();
        });
      }
    },
    
    /**
     * R.Services.getCaps() -> Object
     *
     * Returns an object listing the capabilities of the available services.
     **/
    getCaps: function() {
      var self = this;
      
      function combine(a, b) {
        _.each(b, function(v, k) {
          if (k in a) {
            if (_.isObject(v) && _.isObject(a[k])) {
              combine(a[k], v);
            } else {
              throw new Error("[Services] getCaps collision on " + k + " combining " + v + " and " + a[k]);
            }
          } else {
            a[k] = v;
          }
        });
      }
      
      var caps = {};
      _.each(this._serviceKlasses, function(klass, name) {
        if (self._activeServices[name] && self._activeServices[name].isUsable()) {
          var serviceCaps = self._activeServices[name].getCaps();
          if (serviceCaps) {
            combine(caps, serviceCaps);
          }
        }
      });
      
      return caps;
    },

    _createService: function(name, options) {
      // Sort the implementations registered for this service by priority
      var klasses = _.sortBy(this._serviceKlasses[name], function(k) {
        return k.prototype.__options.priority;
      });

      var impl = null;

      // Find the first implementation that isUsable
      for (var i = 0; i < klasses.length; i++) {
        impl = new klasses[i](options);

        if (impl.isUsable()) {
          break;
        }
      }

      if (impl === null) {
        console.error('Unable to find a usable implementation for service: ' + name);
        return;
      }

      var self = this;
      impl.bind('remove', function() {
        console.log('[Services] A service implementation of type ' + name + ' failed and asked to be removed, doing so now');
        self._serviceKlasses[name] = _.reject(self._serviceKlasses[name], function(klass) {
          return klass.prototype.__options.id == impl.__options.id;
        });
        self.stop(name);
        self.start(name);
      });

      this._activeServices[name] = impl;
      if (impl.isGlobal) {
        var globalName = R.Utils.lowerCaseInitial(name);
        console.assert(!(globalName in R), "[Services] global slot should be empty for " + globalName);
        R[globalName] = impl;
      } else {
        console.assert(!(name in this), "[Services] local slot should be empty for " + name);
        this[name] = impl;
      }
    },

    _deleteReferences: function(name) {
      if (this._activeServices[name]) {
        if (this._activeServices[name].isGlobal) {
          delete R[R.Utils.lowerCaseInitial(name)];
        } else {
          delete this[name];
        }
        delete this._activeServices[name];
      }
    }
  }, {
    STATE_NOT_READY: 0,
    STATE_READY: 1,
    STATE_STOPPED: 2,
    STATE_STOPPING: 3
  });

  $(window).bind('beforeunload', function(e) {
    R.Services.stop();
  });
})();
