(function() {
  var currentlyLoading = {};
  function parseClientHeader(xhr) {
    return parseInt(xhr.getResponseHeader('X-Client-Version'), 10);
  }

  var currentlyLoadingScripts = {};
  var COMPONENT_BASE = R.serverInfo.get('media_address') + 'client/Components/';
  var THEME = R.serverInfo.get('theme');

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

    onInitialized: function() {
      // We only want singletons of these models so we don't
      // fetch the components every time we start/stop the loader,
      // but due to load order shenanigans we can't just initialize
      // them when the file loads. So we do it once here.
      // This should be fixed when we make the loader not so Rdio
      // specific.
      VersionsModel = VersionsModel || R.Model.extend({
        method: 'getComponentVersions',
        content: function() {
          return {
            app: Env.loadedTarget
          };
        },
        overrides: {
          components: Backbone.Model,
          app: Backbone.Model,
          models: Backbone.Model
        }
      });
      versionsModel = versionsModel || new VersionsModel();
      versionsXhr = versionsXhr || versionsModel.fetch();
    },

    onStarted: function(k) {
      _.bindAll(this, 'onVersionChanged', 'refreshModels', '_successLoading',
        '_errorLoading', '_checkClientVersion', '_requestReload');

      currentlyLoading = {};
      this._currentlyLoading = currentlyLoading; // For debugging

      var self = this;
      this.model = versionsModel;
      versionsXhr.done(function() {
        self.model.get('components').bind('change', self.onVersionChanged);
        self.model.get('app').bind('change', self._requestReload);
        self.model.get('models').bind('change', self.refreshModels);
        k();
      });

      // Global ajax handler to check the API's client version on every API
      // request. That's how we know when we need to refresh.
      $(document).ajaxSuccess(this._checkClientVersion);
    },

    onStopped: function() {
      this.model.get('components').unbind('change', this.onVersionChanged);
      this.model.get('app').unbind('change', this._requestReload);
      this.model.get('models').unbind('change', this.refreshModels);
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
          versions = self.model.get('components').get(component),
          src;

        var needsUpdate = (versions && loadedComponent && loadedComponent.version && loadedComponent.version.self != versions.self);
        if (_.isFunction(loadedComponent) && !needsUpdate) {
          return after();
        }

        if (!versions) {
          R.StyleManager.commitCss();
          throw new Error('No version information found for ' + component);
        }
        if (pending) {
          pending.push(after);
        } else {
          currentlyLoading[component] = [after];
          self._loadSource(component, versions);
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

    _loadSource: function(component, versions) {
      var self = this;
      var base = COMPONENT_BASE + component;
      if (THEME) {
        base += '.' + THEME;
      }
      var src = base + '.' + versions.self + '.js';
      currentlyLoadingScripts[src] = 1;
      R.injectScript(src, null, self._successLoading, self._errorLoading);
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
    },
    refreshModels: function(model) {
      console.log('updating models');
      // Need to reload because any existing component classes may have
      // references to modelClass definitions that no longer exist!
      this._requestReload();
    },
    _checkClientVersion: function(e, xhr, ajaxOptions) {
      // With the API request, a version of the client software is returned.
      // If we're out of date, we need to get the most up to date versions.
      // The componentVersions model changing will trigger whatever other
      // needed changes are necessary.
      var version = parseClientHeader(xhr);
      if (version && R.VERSION.version && version > R.VERSION.version) {
        console.log('Updating to client version', version);
        var updateXhr = this.model.fetch({
          success: function(model, response) {
            // We can get into a situation where the fetch hits a server that
            // isn't fully deployed, so we update to the old version and then
            // don't update again cause we've set the master version to the
            // new version. So we check to make sure that the response's version
            // is the same as the one we're trying to upgrade to.
            if (parseClientHeader(updateXhr) == version) {
              console.log('Successfully updated to', version);
              R.VERSION.version = version;
            } else {
              console.log('Tried to update to', version, 'but hit old server');
            }
          }
        });
      }
    },
    onVersionChanged: function(model, options) {
      var componentsToReload = [];
      var self = this;
      _.each(model.changedAttributes(), function(version, component) {
        if (!version) { // removing a component means we don't need to do anything
          return;
        }

        // If we've already loaded one of the components that changed, we need to
        // update it.
        if (R.Component.getObject(component)) {
          console.log('Refreshing', component, version.self, model.previous(component).self);
          componentsToReload.push(component);
        }
      });
      this.load(componentsToReload);
    }
  }, Backbone.Events);
})();
