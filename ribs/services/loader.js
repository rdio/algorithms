(function() {
  var currentlyLoading = {};

  var currentlyLoadingScripts = {};
  var parser = new Bujagali.Parser();
  var COMPONENT_BASE = '/Components/';

  var VersionsModel, versionsModel, versionsXhr;

  /**
   * R.Services.Loader
   *
   * Takes care of dynamically loading code.
   *
   * Singleton instance is available at `R.loader`
   **/
  R.Services.register('Loader', {
    isGlobal: true,
    onStarted: function(k) {
      currentlyLoading = {};
      this._currentlyLoading = currentlyLoading; // For debugging
      k();
    },

    onStopped: function() {
      currentlyLoading = null;
    },

    /**
     * R.Services.Loader.load(components, k) -> undefined
     * - components (Array|String): List of components to load.
     * - k (Function): continuation
     * fires loaded:<component>
     *
     * Given a list of `components`, load each one. Calls `k` after all the
     * components have been successfully loaded.
     **/
    load: function(components, k) {
      var self = this;
      k = k || R.doNothing;

      if (!components || !components.length) {
        k();
        return;
      }

      components = R.Utils.array(components);

      R.StyleManager.beginLoadingCss();
      // This causes the event to not be triggered until all the
      // components are actually loaded. This allows us to call k for each
      // and every dependency and only have k run once every dependency is
      // actually loaded.
      var after = _.after(components.length, function() {
        R.StyleManager.commitCss();
        k();
      });
      _.each(components, function(component) {
        var pending = currentlyLoading[component],
          loadedComponent = R.Component.getObject(component),
          src;

        if (_.isFunction(loadedComponent)) {
          return after();
        }

        if (pending) {
          pending.push(after);
        } else {
          currentlyLoading[component] = [after];
          self._loadSource(component);
        }
      });
    },

    /**
     * R.Services.Loader.loadExternalScripts(scripts, k) -> undefined
     * - scripts (Array): List of scripts to load.
     * - k (Function): continuation
     *
     * Given a list of script urls, load each one. Calls `k` after all the
     * scripts have been successfully loaded.
     **/
    loadExternalScripts: function(scripts, k) {
      var self = this;
      k = k || R.doNothing;

      if (!scripts || !scripts.length) {
        k();
        return;
      }

      var after = _.after(scripts.length, function() {
        k();
      });

      var success = function(src) {
        var pending = currentlyLoading[src];
        _.each(pending, function(k) {
          k();
        });
        delete currentlyLoading[src];
        self._successLoading(src);
      };

      _.each(scripts, function(script) {
        var pending = currentlyLoading[script];

        if (pending) {
          pending.push(after);
        } else {
          currentlyLoading[script] = [after];
          currentlyLoadingScripts[script] = 1;
          R.injectScript(script, null, success, self._errorLoading);
        }
      });
    },

    _requestReload: function() {
      var e = $.Event();
      this.trigger('reload', e);
      if (!e.isDefaultPrevented()) {
        R.reload();
      }
    },

    _loadSource: function(component) {
      var self = this;
      var bits = component.split('.');
      var path = bits.join('/');
      var base = COMPONENT_BASE + path;
      var name = bits.pop();
      var src = base + '/' + name +  '.js';
      var template = base + '/' + name + '.bg.html';
      currentlyLoadingScripts[src] = 1;
      $.ajax(template, {
        success: function(response) {
          Bujagali.fxns[template] = eval(parser.parse(response));
        },
        complete: function() {
          R.injectScript(src, null, self._successLoading, self._errorLoading);
        }
      });
    },
    _successLoading: function(src) {
      delete currentlyLoadingScripts[src];
    },
    _errorLoading: function(e) {
      var self = this;
      var $failedScript = $(e.target);
      var src = $failedScript.attr('src');
      var numTries = currentlyLoadingScripts[src];
      if (numTries <= 3) {
        _.defer(function() {
          R.injectScript(src, null, self._successLoading, self._errorLoading);
          currentlyLoadingScripts[src]++;
        }, 100);
      } else {
        R.reload();
      }
    },
    loaded: function(component) {
      this.trigger('loaded:' + component);
      var pending = currentlyLoading[component];
      _.each(pending, function(k) {
        k();
      });
      // It's possible for a script to arrive after the
      // service has been stopped.
      if (currentlyLoading) {
        delete currentlyLoading[component];
      }
    }
  }, Backbone.Events);
})();
