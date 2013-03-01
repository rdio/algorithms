/*globals less */
(function() {
  var root = this;
  var thingsLoading = 0;
  var inProgressCss = [];

  function logLessError(err) {
    console.error('Could not parse ', err.filename + ':', err.message, err);
  }

  /**
   * R.StyleManager
   *
   * Helpers for injecting styles from components
   **/
  R.StyleManager = {
    loadComponentLess: function(component, lessText) {
      var env = {
        filename: component + '.less'
      };
      if (!root.less) {
        throw new Error("Less.js is not loaded, cannot parse Less!");
      }
      try {
        new less.Parser(env).parse(lessText, function(err, tree) {
          if (err) {
            logLessError(err);
            return;
          }
          R.StyleManager.loadComponentCss(component, tree.toCSS());
        });
      } catch(exc) {
        logLessError(exc);
      }
    },

    /**
     * R.StyleManager.beginLoadingCss() -> undefined
     *
     * This should be called when you are initially going to be loading CSS.
     * This starts a queue of CSS to be injected that will not actually be
     * put into the document until [[R.StyleManager.commitCss]] is called.
     *
     * It is safe to call this multiple times, but you must call [[R.StyleManager.commitCss]]
     * for every call to this.
     **/
    beginLoadingCss: function() {
      thingsLoading++;
    },

    /**
     * R.StyleManager.commitCss() -> string | undefined
     *
     * This tells the style manager that you are done adding CSS to the document
     * so that it can actually inject the css into the appropriate place. If
     * there have been multiple calls to [[R.StyleManager.beginLoadingCss]],
     * then this function will do nothing until the final call.
     *
     * Returns the id of the style tag if css was actually put in the document.
     **/
    commitCss: function() {
      var cssText;
      thingsLoading--;
      if (!thingsLoading) {
        if (!inProgressCss.length) {
          return;
        }
        cssText = inProgressCss.join('\n');
        inProgressCss = [];
        if(document.createStyleSheet) {
          return R.StyleManager._ieLoadCss(cssText);
        }
        var textNode;
        var id = _.uniqueId('component_css');
        var styleEl = R.StyleManager._createStyleEl(id);

        textNode = document.createTextNode(cssText);
        styleEl.appendChild(textNode);
        return id;
      }
    },

    /**
     * R.StyleManager.loadComponentCss(component, cssText) -> undefined
     *
     * Adds the css text provided to the queue to be injected.
     **/
    loadComponentCss: function(component, cssText) {
      if (cssText) {
        inProgressCss.push(cssText);
      }
    },

    _createStyleEl: function(id) {
      var styleEl = document.createElement('style');
      styleEl.type = 'text/css';
      styleEl.media = 'screen';
      styleEl.id = id;
      document.getElementsByTagName('head')[0].appendChild(styleEl);
      return styleEl;
    },

    _ieLoadCss: function(cssText) {
      var id = "css_for_components";
      var styleEl = document.getElementById(id);

      if (!styleEl) {
        styleEl = R.StyleManager._createStyleEl(id);
      }

      // for now, just append indefinitely to this element
      styleEl.styleSheet.cssText += cssText;
      return id;
    },

    /**
     * R.StyleManager.reset() -> undefined
     *
     * Resets the style manager. Used for tests.
     **/
    reset: function() {
      thingsLoading = 0;
      inProgressCss = [];
    }
  };
})();
