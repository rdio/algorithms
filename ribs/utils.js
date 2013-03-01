(function() {
  var html5Tags = [
    'abbr',
    'article',
    'aside',
    'audio',
    'canvas',
    'datalist',
    'details',
    'figcaption',
    'figure',
    'footer',
    'header',
    'hgroup',
    'mark',
    'meter',
    'nav',
    'output',
    'progress',
    'section',
    'subline',
    'summary',
    'time',
    'video'
  ];

  var objectClassNames = [
    'Album',
    'Artist',
    'Track',
    'Contributor',
    'Movie',
    'Series',
    'Genre',
    'Distributor'
  ];

  var typeMap = {
    a: 'Album',
    al: 'Album',
    rl: 'Artist',
    r: 'Artist',
    t: 'Track',
    p: 'Playlist',
    l: 'Label',
    s: 'Person',
    ct: 'Contributor',
    mr: 'Movie',
    vr: 'Series',
    vsr: 'Season',
    ver: 'Episode',
    g: 'Genre',
    ne: 'Distributor',
    st: 'Distributor',
    cs: 'Set'
  };

  /**
   * R.Utils
   *
   * Grab bag of useful functions.
   **/
  R.Utils = {
    ensureHtml5Elements: function() {
      if ($.browser.msie && parseInt($.browser.version, 10) < 9) {
        _.each(html5Tags, function(el) {
          document.createElement(el);
        });
      }
    },
    /**
     * R.Utils.hasCanvas() -> boolean
     *
     * Returns true if the browser supports the <canvas> element, false otherwise.
     **/
    supportsCanvas: function() {
      var elem = document.createElement('canvas');
      return !!(elem.getContext && elem.getContext('2d'));
    },

    /**
     * R.Utils.stopEvent(e) -> undefined
     * - e (Event): The event to stop
     *
     * Stop the event from propagating or doing its default behavior.
     **/
    stopEvent: function(e) {
      e.preventDefault();
      e.stopPropagation();
    },

    /**
      * R.Utils.convertToModel(o) -> Backbone.Model
     * - list (Array): An array/list of objects to convert to models.
     *
     * Takes a raw JS object and returns a Backbone model.
     * This function is aware of Rdio types, so an object with `type: 'a'` will
     * return an [[R.Models.Album]] instance. This applies to all known types.
     *
     * If the type of the object is unknown, returns a generic [[Backbone.Model]]
     **/
    convertToModel: function(o) {
      if (!o) {
        return null;
      }

      if (o instanceof R.Model) {
        return o;
      }

      if (o instanceof Backbone.Model) {
        o = o.attributes;
      }

      if (R.isStation(o)) {
        return new R.Models.Station(o);
      }

      switch (o.type) {
        case 'a':
        case 'al':
          return new R.Models.Album(o);
        case 'p':
          return new R.Models.Playlist(o);
        case 'l':
          return new R.Models.Label(o);
        case 's':
          return new R.Models.User(o);
        case 'r':
        case 'rl':
          return new R.Models.Artist(o);
        case 't':
          return new R.Models.Track(o);
        case 'mr':
          return new R.Models.Movie(o);
        case 'ct':
          return new R.Models.Contributor(o);
        case 'ver':
          return new R.Models.Episode(o);
        case 'vsr':
          return new R.Models.Season(o);
        case 'vr':
          return new R.Models.Series(o);
        case 'g':
          return new R.Models.Genre(o);
        case 'ne':
          return new R.Models.Network(o);
        case 'st':
          return new R.Models.Studio(o);
        case 'cs':
          return new R.Models.Set(o);
        default:
          console.warn('Unknown type ' + o.type + ' in convertToModels');
          return new R.Model(o);
      }
    },

    /**
     * R.Utils.convertToModels(list) -> Array
     * - list (Array): An array/list of objects to convert to models.
     *
     * Takes a list of raw JS objects and returns a list of Backbone models.
     * This function is aware of Rdio types, so an object with `type: 'a'` will
     * return an [[R.Models.Album]] instance. This applies to all known types.
     *
     * If the type of the object is unknown, returns a generic [[Backbone.Model]]
     **/
    convertToModels: function(list) {
      return _.map(list, function(o) {
        return R.Utils.convertToModel(o);
      });
    },

    /**
     * R.Utils.getComponentClassForModel(model) -> String
     * - model (Object): A backbone (or Rdio) model
     *
     * Returns the string that represents the class that should be used to create a component for this model.
     **/
    getComponentClassForModel: function(model) {
      var type = model.get('type');
      if (type in typeMap) {
        return typeMap[type];
      }
      return null;
    },

    /**
     * R.Utils.getComponentForModel(model[, defaultComponent]) -> Component
     * - model (Object): A backbone (or Rdio) model
     * - defaultComponent (Object): An Rdio component to return if we don't find a match. Optional.
     *
     * Returns the class that should be used to create a component that would represent the given model. If the model
     * doesn't have an associated component, return the defaultComponent. If default is falsy, return null.
     **/
    getComponentForModel: function(model, defaultComponent) {
      // TODO: This should be able to load components on the fly. Not possible now as we call this from templates.
      if (!model) {
        return null;
      }

      var component;
      var componentClass = this.getComponentClassForModel(model);

      if (componentClass) {
        component = R.Components[componentClass];
      } else if (R.isStation(model)) {
        component = R.Components.Station;
      } else if (defaultComponent) {
        component = defaultComponent;
      }

      // if component is undefined, but we had a type, we haven't loaded it yet
      if (model.get('type') && !component) {
        console.error('Component not loaded. Type was: ' + model.get('type'));
      } else {
        return component;
      }

      // if we didn't match a component and didn't have a default, return null
      return null;
    },

    /**
     * R.Utils.factory(c) -> Function
     * - c (Function): A constructor function
     *
     * Returns a factory function that when called will return a new instance
     * of the constructor provided. Assumes the constructor takes two arguments.
     **/
    factory: function(c) {
      c = c || this;
      return function(data, options) {
        return new c(data, options);
      };
    },

    /**
     * R.Utils.reportErrors(f[, name]) -> Function
     * - f (Function): Function to wrap.
     * - name (String): Optional string to call the function by.
     *
     * Wraps the provided function in error handling code that will
     * report errors in a useful fashion across all browsers and any
     * reporting to the server that might need to happen.
     *
     * Returns the wrapped function.
     **/
    reportErrors: function(f, name) {
      return function() {
        try {
          f.apply(this, arguments);
        } catch(exc) {
          var message = "Exception occurred in " + (name || f.name || 'anonymous function');
          R.Utils.logException(message, exc);
          R.Services.ErrorReporter.reportError(message, '', '', exc.stack);
        }
      };
    },

    /**
     * R.Utils.logException(message, exc) -> undefined
     * - message (String): Message for logging
     * - exc (Exception): Exception
     *
     **/
    logException: function(message, exc) {
      if (!exc) {
        exc = { message: 'No Exception provided', stack: '' };
      }

      message += ': ' + exc.message;
      if (console.group) {
        console.group(message);
      } else {
        console.log(message);
      }
      if (console.exception) {
        console.exception(exc);
      } else if (exc.stack) {
        console.error(exc.stack);
      } else {
        console.error(message);
      }
      if (console.groupEnd) {
        console.groupEnd();
      }
    },

    /**
     * R.Utils.value(val[, args...]) -> *
     * - val (Function | ...) The function or value to evaluate.
     *
     * If passed a function, returns the result of the function. If passed
     * a value, returns the value.
     *
     * If provided with additional arguments, these will be passed to the
     * `val` function if `val` is a function.
     **/
    value: function(val) {
      if (_.isFunction(val)) {
        return val.apply(this, _.tail(arguments));
      }
      return val;
    },

    /**
     * R.Utils.array(val) -> Array
     * - val (Array|...) The argument you want to be an array.
     *
     * If passed an array, it just returns the array. If passed anything else,
     * returns that value in an array.
     **/
    array: function(val) {
      if (!_.isArray(val)) {
        return [val];
      }
      return val;
    },

    /**
     * R.Utils.eachKey(obj, iterator[, context]) -> undefined
     * - obj (Object): The object you want to iterate over.
     * - iterator (Function): The function with which to iterate; takes in value, key.
     * - context (Object): The "this" for the function.
     *
     * _.each() and $.each() both treat objects that have "length" properties as arrays.
     * Use this function when you want to force such an object to be iterated as an object.
     **/
    eachKey: function(obj, iterator, context) {
      if (!obj) {
        return;
      }
      for (var key in obj) {
        if (_.has(obj, key)) {
          iterator.call(context, obj[key], key, obj);
        }
      }
    },

    /**
     * R.Utils.transitionEndEvent() -> String
     *
     * Determines the name of the "transition end" event for the browser. Useful
     * when you want something to happen after a transition is complete.
     **/
    transitionEndEvent: _.memoize(function() {
      var tr;
      var el = document.createElement('fakeelement');
      var transitions = {
        'transition': 'transitionEnd',
        'OTransition': 'oTransitionEnd',
        'MSTransition': 'msTransitionEnd',
        'MozTransition': 'transitionend',
        'WebkitTransition': 'webkitTransitionEnd'
      };

      for (tr in transitions) {
        if (el.style[tr] !== undefined) {
          return transitions[tr];
        }
      }
    }),

    /**
     * R.Utils.getUserEnvironment(nav) -> Object
     * - nav (`Object`): Pass in either the global object `navigator` or an object representing the navigator. Requires
     *   the following fields: userAgent, appVersion, vendor, platform.
     *
     * Returns an object containing information about the user's operating
     * system, browser, and browser version.  The object is cached on first access.
     *
     * The returned object contains the following keys:
     * - browser ("Internet Explorer", "Chrome", "Safari", "Firefox", and others)
     * - browserVersion (major browser version number, integer value, 999 if unknown)
     * - operatingSystem ("Mac", "Windows", "iOS", "Android", or "Linux")
     **/
    getUserEnvironment: _.memoize(function(nav) {
      // The following browser detection routine is based on
      // http://www.quirksmode.org/js/detect.html, which was last updated August 2011.
      // Names are returned from the "identity" key in the dataBrowser/dataOS array.
      var BrowserDetect = {
        init: function() {
          this.browser = this.searchString(this.dataBrowser) || "Unknown Browser";
          this.version = this.searchVersion(nav.userAgent)
            || this.searchVersion(nav.appVersion)
            || 999;
          this.OS = this.searchString(this.dataOS) || "Unknown OS";
          this.isMobile = (this.OS.search(/^(iOS|Android|Windows Phone)$/) != -1);
          // The iPad application appends "vdioipadplayer" it its existing user agent.
          this.isIpadPlayer = nav.userAgent.search(/vdioipadplayer/) != -1;
          this.isIpad = nav.userAgent.search(/iPad/) != -1 || this.isIpadPlayer;
          this.isTv = (this.OS === 'Google TV');
        },
        searchString: function(data) {
          for (var i = 0; i < data.length; i++) {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
              if (dataString.indexOf(data[i].subString) != -1) {
                return data[i].identity;
              }
            } else if (dataProp) {
              return data[i].identity;
            }
          }
        },
        searchVersion: function(dataString) {
          var index = dataString.indexOf(this.versionSearchString);
          if (index == -1) {
            return;
          }
          return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
        },
        dataBrowser: [
          {
            string: nav.userAgent,
            subString: "PhantomJS",
            versionSearch: "PhantomJS/",
            identity: "Phantom"
          },
          {
            string: nav.userAgent,
            subString: "facebook",
            identity: "Facebook"
          },
          {
            string: nav.userAgent,
            subString: "Chrome",
            identity: "Chrome"
          },
          {
            string: nav.userAgent,
            subString: "IEMobile",
            versionSearch: "IEMobile",
            identity: "IE Mobile"
          },
          {
            string: nav.userAgent,
            subString: "Firefox",
            identity: "Firefox"
          },
          {
            string: nav.userAgent,
            subString: "Mobile",
            versionSearch: "Version",
            identity: "Mobile WebKit"
          },
          {
            string: nav.userAgent,
            subString: "OmniWeb",
            versionSearch: "OmniWeb/",
            identity: "OmniWeb"
          },
          {
            string: nav.appVersion,
            subString: "Google Web Preview",
            versionSearch: "Mozilla",
            identity: "Safari"
          },
          {
            string: nav.vendor,
            subString: "Apple",
            versionSearch: "Version",
            identity: "Safari"
          },
          {
            prop: window.opera,
            versionSearch: "Version",
            identity: "Opera"
          },
          {
            string: nav.vendor,
            subString: "iCab",
            identity: "iCab"
          },
          {
            string: nav.vendor,
            subString: "KDE",
            identity: "Konqueror"
          },
          {
            string: nav.vendor,
            subString: "Camino",
            identity: "Camino"
          },
          { // for newer Netscapes (6+)
            string: nav.userAgent,
            subString: "Netscape",
            identity: "Netscape"
          },
          {
            string: nav.userAgent,
            subString: "MSIE",
            versionSearch: "MSIE",
            identity: "Internet Explorer"
          },
          {
            string: nav.userAgent,
            subString: "Gecko",
            versionSearch: "rv",
            identity: "Mozilla"
          },
          { // for older Netscapes (4-)
            string: nav.userAgent,
            subString: "Mozilla",
            versionSearch: "Mozilla",
            identity: "Netscape"
          },
          { // for Chromium 19 Windows desktop app
            string: nav.userAgent,
            subString: "com.rdio.desktop.win/",
            versionSearch: "com.rdio.desktop.win",
            identity: "Rdio Windows App"
          }
        ],
        dataOS: [
          {
            string: nav.userAgent,
            subString: "iPhone",
            identity: "iOS"
          },
          {
            string: nav.userAgent,
            subString: "iPad",
            identity: "iOS"
          },
          {
            string: nav.userAgent,
            subString: "iPod",
            identity: "iOS"
          },
          {
            string: nav.userAgent,
            subString: "GoogleTV",
            identity: "Google TV"
          },
          {
            string: nav.userAgent,
            subString: "Android",
            identity: "Android"
          },
          {
            string: nav.userAgent,
            subString: "Windows Phone",
            identity: "Windows Phone"
          },
          {
            string: nav.platform,
            subString: "Win",
            identity: "Windows"
          },
          {
            string: nav.userAgent,
            subString: "CrOS",
            identity: "Chrome OS"
          },
          {
            string: nav.platform,
            subString: "Linux",
            identity: "Linux"
          },
          {
            string: nav.platform,
            subString: "Mac",
            identity: "Mac"
          }
        ]
      };
      BrowserDetect.init();

      return {
        browser: BrowserDetect.browser,
        browserVersion: BrowserDetect.version,
        operatingSystem: BrowserDetect.OS, 
        isMobile: BrowserDetect.isMobile, 
        isTv: BrowserDetect.isTv,
        isIpadPlayer: BrowserDetect.isIpadPlayer,
        isIpad: BrowserDetect.isIpad
      };
    }, function(nav) {
      return nav.userAgent + '::' + nav.appVersion + '::' + nav.vendor + '::' + nav.platform;
    }),

    /**
     * R.Utils.modelReviver(prop, value) -> object
     *
     * Can be passed to JSON.parse and will return objects that represent well
     * known API entities.
     **/
    modelReviver: function(prop, value) {
      if (value && value.type === 'list' && prop !== 'result') {
        return new (R.Models.ModelFieldCollection.factory())(value, {
          parentProperty: prop
        });
      }
      return value;
    },

    /**
     * R.Utils.shareDialog(options) -> undefined
     *
     * Utility function for creating a share dialog. Loads the ShareDialog component as well as any other component
     * that needs to be loaded for the model (eg. R.Components.Track when a model R.Models.Track is passed in).
     *
     * Valid options (in addition to `R.Components.ShareDialog` options)
     *
     *    * parent (Component): The dialog will be added as a child to the 'parent' component after being created.
     **/
    shareDialog: function(options) {
      options = options || {};
      if (!options.model) {
        throw new Error('Model required when calling shareDialog');
      }
      var parent;
      if (options.parent) {
        parent = options.parent;
        delete options.parent;
      }
      R.loader.load(['ShareDialog', this.getComponentClassForModel(options.model)], function() {
        var dialog = new R.Components.ShareDialog(options);
        if (parent) {
          parent.addChild(dialog);
        }
        dialog.open();
      });
    },

    /**
     * R.Utils.messageDialog(options) -> undefined
     *
     * Utility function for creating a message dialog a bit more painlessly.
     *
     * Valid options:
     *
     *    * message (String|Function): The message to display. *Required*
     *    * title (String|Function): The title. *Required*
     *    * parent (Component): The parent component of the dialog. Defaults to R.app
     *    * buttons (Array): Buttons array, same format as [[R.Components.Dialog]]'s buttons option.
     *    * closeButton (String|Function): Close button text.
     **/
    messageDialog: function(options) {
      var message = R.Utils.value(options.message);

      if (!message) {
        throw new Error("Valid message required when calling messageDialog");
      }

      var title = R.Utils.value(options.title);

      if (!title) {
        throw new Error("Valid title required when calling messageDialog");
      }

      var parent = options.parent || R.app;

      R.loader.load(['Dialog.MessageDialog'], function() {
        var dialog = new R.Components.Dialog.MessageDialog({
          model: new Backbone.Model({ message: message }),
          title: title,
          buttons: new Backbone.Collection(options.buttons),
          closeButton: options.closeButton,
          closeOnNavigate: options.closeOnNavigate,
          extraClassName: options.extraClassName
        });
        parent.addChild(dialog);
        dialog.open();
      });
    },

    /**
     * R.Utils.createAndOpenSecureDialog(options) -> R.Component|Window
     *
     * Utility function for creating a secure dialog.  If the user is already using https, a
     * regular dialog is used.  If not, a 'standalone' version of the dialog is opened in a
     * popup window.
     *
     * - options (Object): Options for rendering the dialog.
     *
     * Valid options:
     *    * componentName (String): The name of the dialog component to be created and opened. *Required*
     *    * componentOptions (Object): Options for the dialog component to be rendered and opened.
     *    * callback (Function): A function to execute after the dialog has been created and opened. The dialog is passed as the first argument to `callback`.
     *    * popupHeight (Number): The height of the popup. Default is 630.
     *    * popupWidth (Number): The width of the popup. Default is 650.
     *
     * Valid componentOptions:
     *    * Any valid option for `componenetName`.
     **/
    createAndOpenSecureDialog: function(options) {
      var isSecure = R.Utils.isSecure();
      options = options || {};
      var dialog;

      if (!(options && options.componentName)) {
        throw new Error('createAndOpenSecureDialog requires a componentName option.');
      }

      var componentName = options.componentName;

      if (isSecure) {
        delete options.popupHeight;
        delete options.popupWidth;

        R.loader.load([componentName], function() {
          dialog = new (R.Component.getObject(componentName))(options.componentOptions);
          dialog.open();

          if (options.callback && _.isFunction(options.callback)) {
            options.callback(dialog);
          }
        });
      } else {
        var url = this.fullUrl(R.serverInfo.get('urls').secureDialog, true);
        var componentOptions = _.extend({
          componentName: options.componentName
        }, options.componentOptions);

        var urlParams = _.reduce(componentOptions, function(arr, value, key) {
          if (typeof value === 'string') {
            value = '"' + value.replace(/"/g, '\\"') + '"';
          }
          arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
          return arr;
        }, []).join('&');
        if (urlParams) {
          url += '?' + urlParams;
        }
        var height = options.popupHeight || 630;
        var width = options.popupWidth || 650;
        var windowTop = window.screenY || window.screenTop;
        var windowLeft = window.screenX || window.screenLeft;
        var top = Math.floor( windowTop + document.body.clientHeight / 2 - height / 2 );
        var left = Math.floor( windowLeft + document.body.clientWidth / 2 - width / 2 );

        var dialogOptions = 'height=' + height +
                            ',width=' + width +
                            ',top='   + top +
                            ',left='  + left +
                            'dialog=yes,titlebar=no,close=no';

        dialog = window.open(url, 'secure_dialog', dialogOptions);
        dialog.focus();

        if (options.callback && _.isFunction(options.callback)) {
          options.callback(dialog);
        }
      }
    },

    /**
     * R.Utils.notifyDialogClosed(options) -> undefined
     *
     * Utility function for creating a callback when a dialog is closed.
     *
     * - dialog (window): window object representing the popup.
     * - callback (Function): callback to call when the dialog is closed.
     * - interval (Number): interval to poll the dialog.
     **/
    notifyDialogClosed: function(dialog, callback, interval) {
      if (!interval) {
        interval = 200;
      }

      var checkFn = function() {
        if (dialog.closed) {
          callback();
        } else {
          setTimeout(checkFn, interval);
        }
      };

      setTimeout(checkFn, interval);
    },

    /**
     * R.Utils.getWindowLocation() -> Object
     *
     * Returns the window's location object. For testing purposes.
     **/
     getWindowLocation: function() {
       return window.location;
     },

    /**
     * R.Utils.isSecure() -> Boolean
     *
     * Returns whether or not the current window is using https.
     **/
    isSecure: function() {
      var isSimulatingHttps = R.serverInfo.get('simulateDevHttps');
      var location = R.Utils.getWindowLocation();
      var isSecureHost = location.host === R.serverInfo.get('secureHost');
      var isSecureProtocol = location.protocol === 'https:';
      if ((isSimulatingHttps && isSecureHost) || isSecureProtocol) {
        return true;
      }
      return false;
    },

    redirectToSignup: function() {
      window.location.href = '/account/signup/';
    },

    /**
     * R.Utils.subNameForSubType(subType) -> String
     * - subType (`Number`): Number representing a type of subscription
     *
     * Returns a string representing a given subscription type or null if the `subType` doesn't represent an available
     * subscription.
     **/
    subNameForSubType: function(subType) {
      switch (subType) {
        case 1:
          return 'web';
        case 2:
          return 'unlimited';
        case 3:
          return 'family';
      }
      return null;
    },

    renderChildAtIndex: function(component, child, index, defaultInsertionEl) {

      // This method is used by list view components (e.g. InfiniteScroll and TrackList).

      if (!(component.model instanceof Backbone.Collection || component.model instanceof R.Models.SparseCollection)) {
        throw new TypeError('Component model must be a collection to render child at index');
      }

      component.addChild(child);

      // We need to make sure our new component's DOM element gets inserted in the right spot.
      // We can't do direct indexed array splicing, because there might be other
      // child components (i.e., Spinner) mixed in with our list items, or the child component
      // array might be in a jumbled order. But we can instead reference the position
      // of the component's model in the collection array, an array with a meaningful order.

      child.render(function() {
        var length = 0;
        if(component.model.length) {
          length = R.Utils.value.call(component.model, component.model.length); // Property in Backbone Collection; function in SparseCollection
        }

        var modelBefore = index > 0 ? component.model.at(index - 1) : null;
        var componentBefore = modelBefore ? component.findChildWithModel(modelBefore) : null;
        var modelAfter = index + 1 < length ? component.model.at(index + 1) : null;
        var componentAfter = modelAfter ? component.findChildWithModel(modelAfter) : null;

        if (componentAfter && componentAfter.isRendered()) {
          // Find the component corresponding to the model at the index after this new model was inserted,
          // and insert the DOM element of the new model before the DOM element of that one.
          componentAfter.$el.before(child.$el);
        } else if (componentBefore && componentBefore.isRendered()) {
          // Slightly different at the end of the list...
          componentBefore.$el.after(child.$el);
        } else {
          // No siblings to relate to
          if (defaultInsertionEl) {
            $(defaultInsertionEl).append(child.$el);
          } else {
            throw new Error('A $defaultInsertionEl wasn\'t specified while adding a child to an empty model view.');
          }
        }
      });
    },

    /**
     * R.Utils.isValidEmail(toTest) -> Boolean
     * - toTest (`String`): String to test if is an email
     *
     * Returns true if `toTest` is a valid email. Currently this is a fairly
     * loose test and currently is not guaranteed to match all email addresses.
     **/
    isValidEmail: function(toTest) {
      return toTest.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i);
    },

    /**
     * R.Utils.parseUrl(url) -> Object
     * - url (`String`): The url to parse
     *
     *  Takes an arbitrary url an returns an object with the following properties: href, protocol, host, port, pathname, search, hash.
     *  If `url` is just a path, a full url will be built using the current window's location.
     **/
     parseUrl: function(url) {
       var a = document.createElement('a');
       // This will resolve the full url
       a.href = url;
       // IE requires a full url in order to parse out the parts below
       a.href = a.href;
       var urlParts = _.pick(a, 'href', 'protocol', 'host', 'port', 'pathname', 'search', 'hash');
       if (urlParts.pathname && urlParts.pathname.indexOf('/') !== 0) {
         urlParts.pathname = '/' + urlParts.pathname;
       }
       return urlParts;
     },

    /**
     * R.Utils.fullUrl(url, forceSecure) -> String
     * - url (`String`): Absolute path to a resource.
     * - forceSecure (`Boolean`): Force the generated link to use https. Defaults to false.
     *
     * Returns a fully-qualified URL including domain name. Useful for generating link text from absolute URL paths.
     **/
    fullUrl: function(url, forceSecure) {
      var isFullUrl = /^https?:\/\//.test(url);
      var isRelativePath = url.indexOf('/') !== 0;
      if (!isFullUrl && isRelativePath) {
        console.warn('R.Utils.fullUrl is not designed for relative URLs.');
        url = '/' + url;
      }
      var urlParts = R.Utils.parseUrl(url);
      var fullUrl = urlParts.href;

      if (forceSecure) {
        if (R.serverInfo.get('prod')) {
          fullUrl = fullUrl.replace(urlParts.protocol, 'https:');
        } else if (R.serverInfo.get('simulateDevHttps')) {
          fullUrl = fullUrl.replace(urlParts.host, R.serverInfo.get('secureHost'));
        }
      }

      return fullUrl;
    },

    /**
     * R.Utils.hashUrlMatches(url) -> Object
     * - urlMatches (`Array`): List of matched url parts from the router.
     * - keys (`Array`): List of keys to match urlMatches on.
     *
     * Returns a hash of the matches by their keys.
     **/
    getHashUrlMatches: function(urlMatches, keys) {
      keys = keys.slice();

      var matches = {};
      var start = -1;
      var end = -1;
      var i;
      var j;
      var urlMatch;
      var key;

      for (i = 0; i < urlMatches.length; i++) {
        urlMatch = urlMatches[i];

        for (j = 0; j < keys.length; j++) {
          key = keys[j];

          if (key === urlMatch) {
            matches[key] = urlMatches[i + 1];
            keys.splice(j, 1);
            break;
          }
        }
      }

      return matches;
    },

    /**
     * R.Utils.getSafeRedirectUrl(url) -> String
     * - url (String): A url to redirect to.
     *
     * If the url is safe, return it, otherwise return '/'. 'Safe' means
     * it will take the user to an approved external url or remain within
     * the site. This method should be used to sanitize values taken from
     * user-input especially in the case of signin auto-redirects via the
     * '?next=url' querystring param.
     **/
    getSafeRedirectUrl: function(url) {
      if (url.indexOf('/') === 0 || url.indexOf('http://' + document.location.host) === 0) {
        return url;
      }

      if (url.indexOf(R.serverInfo.get('rdioHelpUrl')) === 0) {
        return url;
      }

      if (url.indexOf('http://translations.rdio.com') === 0) {
        return url;
      }

      return '/';
    },

    /**
     * R.Utils.camelToSnake(val) -> String
     * - val (String): The String value to snake-case.
     *
     * Snake-cases the camel-cased string.
     **/
    camelToSnake: function(val) {
      return val.replace(/^([A-Z])/, function($0, $1) {
          // Handle leading uppercase character
          return $1.toLowerCase();
      }).replace(/([A-Z])/g, function($0, $1) {
          // Handle uppercase characters
          return '_' + $1.toLowerCase();
      });
    },

    /**
     * R.Utils.snakeToCamel(val) -> String
     * - val (String): The String value to camel-case.
     *
     * Camel-cases the snake-cased string.
     **/
    snakeToCamel: function(val) {
      return val.replace(/_(\w)/g, function($0, $1) {
        return $1.toUpperCase();
      });
    },

    /**
     * R.Utils.lowerCaseInitial(val) -> String
     * - val (String): The string to operate on.
     *
     * Returns a copy of the string with the initial character lower-cased.
     **/
    lowerCaseInitial: function(val) {
      return val.replace(/^([A-Z])/, function($0, $1) {
        return $1.toLowerCase();
      });
    },

    /**
     * R.Utils.bool(val) -> Boolean
     * - val (anything): The value to convert.
     *
     * Returns the value forced to true/false. Provided here to make your code more readable.
     **/
    bool: function(val) {
      return !!val;
    },

    /**
     * R.Utils.ensureBodyClasses([navigator]) -> undefined
     * - navigator (Object): Navigator to pass to [[R.Utils.getUserEnvironment]].
     *   Defaults to `window.navigator`.
     *
     * Inspects the environment and applies the appropriate classes to
     * the `body` element.
     **/
    ensureBodyClasses: function(navigator) {
      var $body = $('body');

      if (R.serverInfo.get('isOi')) {
        $body.addClass('oi_body');
      }

      if (R.isDesktop) {
        $body.addClass('desktop');
      }

      if (R.isMacDesktop) {
        $body.addClass('mac_desktop');
      } else if (R.isWinDesktop) {
        $body.addClass('win_desktop');
      }

      if (R.usesNewHeader) {
        $body.addClass('new_desktop_header');
      }

      if (R.currentUser.isAnonymous()) {
        $body.addClass('anonymous');
      }

      if (R.isMobile) {
        $body.addClass('mobile');
      }

      var env = R.Utils.getUserEnvironment(navigator || window.navigator);
      if (env.browser === 'Phantom') {
        $body.addClass('robot');
      }

      // Media queries are totally brokeshow in IE9, but IE10 works ok.
      if (R.isIE && env.browserVersion <= 9) {
        $body.addClass('no_media_queries');
      } else {
        $body.addClass('media_queries');
      }
    },

    /**
     * R.Utils.scrollbarSize() -> Number
     *
     * Returns scrollbar size in pixels.
     * Taken from antiscroll: https://github.com/LearnBoost/antiscroll
     **/
    scrollbarSize: _.memoize(function() {
      var size;
      var div = $(
        '<div style="width:50px;height:50px;overflow:hidden;'
          + 'position:absolute;top:-200px;left:-200px;"><div style="height:100px;">'
          + '</div>'
      );

      $('body').append(div);

      var w1 = $('div', div).innerWidth();
      div.css('overflow-y', 'scroll');
      var w2 = $('div', div).innerWidth();
      $(div).remove();

      size = w1 - w2;

      return size;
    }),

    /**
     * R.Utils.getHelpUrl() -> String
     * - id (`String`): The help article id.
     *
     * Gets a locale-specific help url with optional id.
     **/
    getHelpUrl: function(id) {
      var baseHelpUrl = R.serverInfo.get('rdioHelpBaseUrl');

      if (id) {
        return baseHelpUrl += id;
      } else if (!R.currentUser.get('isAnonymous')) {
        return R.serverInfo.get('rdioHelpUrl');
      }

      return baseHelpUrl;
    },

    /**
     * R.Utils.linkSortControls(collectionComponent, sortControls, notFound) -> undefined
     * - collectionComponent (R.Component)
     * - sortControls (R.Components.SortControls)
     * - notFound (R.Components.Search.NotFound)
     *
     * Toggle the visibility of collectionComponent & notFound, based on
     * 'notFound' and 'found' events from sortControls.
     **/
    linkSortControls: function(collectionComponent, sortControls, notFound) {
      collectionComponent.listen(sortControls, 'found', function() {
        collectionComponent.$el.show();
        notFound.$el.hide();
      });

      collectionComponent.listen(sortControls, 'notFound', function() {
        collectionComponent.$el.hide();
        notFound.$el.show();
      });
    },

    /**
     * R.Utils.nameForType(type) -> String
     * - type (`String`): the short code for an item type
     *
     * Returns the full name for an item type code, such as Album, Artist, etc.
     **/
    nameForType: function(type) {
      switch(type) {
        case 'a':
          return t('Album');
        case 'r':
          return t('Artist');
        case 'p':
          return t('Playlist');
        case 't':
          return t('Song');
        case 's':
          return t('Profile');
      }
    },

    /**
     * R.Utils.setCursor(el, position) -> jQuery
     * - el (HTMLElement | jQuery): The input element to set the cursor
     *   position on.
     * - position (number): The index position to set.
     *
     * Moves the cursor to the correct place in the input in a
     * crowse-browser manner.
     **/
    setCursor: function(el, position) {
      var $el = $(el);
      if (!$el.length) {
        throw new Error("Must provide an element to setCursor on");
      }
      el = $el[0];
      if (!_.isUndefined(el.selectionStart)) {
        el.selectionStart = el.selectionEnd = position;
      } else if (el.createTextRange) {
        var range = el.createTextRange();
        range.move('character', position);
        range.select();
      }
      return $el;
    },

    /**
     * R.Utils.parseTimeString(timeString) -> Number
     * - timeString (String)
     *
     * Translates timeString in one of the following formats into total seconds:
     *
     *  hours:minutes:seconds.milliseconds
     *  hours:minutes:seconds
     *  minutes:seconds.milliseconds
     *  minutes:seconds
     *  seconds.milliseconds
     *  seconds
     *  
     *  Returns the number of total seconds (including possibly a fractional part 
     *  representing milliseconds), or null if timeString can't be
     *  understood.
     **/
    parseTimeString: function(timeString) {
      var milliseconds = 0;

      // Make a copy of the input timestring as we may modify this to separate
      // the integer and fractional parts fo the timestring.
      var timeStringIn = timeString;

      // Check to see if the string contains a fractional part
      if (/\./.test(timeStringIn)) {
        var splitResult = timeStringIn.split('.');
        if (splitResult.length === 2) {
          
          // Save the integer part of the timestring for processing later
          timeStringIn = splitResult[0];

          // Check the validity of the milliseconds value
          if (_.isNaN(parseInt(splitResult[1], 10))) {
            return null;
          }

          // use parseFloat to actually pull out the milliseconds value appending "0." as this will 
          // automatically handle missing trailing zeros
          milliseconds = parseFloat("0." + splitResult[1], 10);
        } else {
          return null;
        }
      }

      var totalSeconds;
      var hours, minutes, seconds;
      var splitResult;

      if (/:/.test(timeStringIn)) {
        splitResult = timeStringIn.split(':');
        if (splitResult.length === 3) {
          // hours:minutes:seconds
          hours = parseInt(splitResult[0], 10);
          minutes = parseInt(splitResult[1], 10);
          seconds = parseInt(splitResult[2], 10);
        } else if (splitResult.length === 2) {
          // minutes:seconds
          hours = 0;
          minutes = parseInt(splitResult[0], 10);
          seconds = parseInt(splitResult[1], 10);
        } else {
          return null;
        }

        if (_.isNaN(hours) || _.isNaN(minutes) || _.isNaN(seconds)) {
          return null;
        }

        if (minutes >= 60 || seconds >= 60) {
          return null;
        }

        totalSeconds = 3600 * hours + 60 * minutes + seconds;
      } else {
        totalSeconds = parseInt(timeString, 10);
        if (_.isNaN(totalSeconds)) {
          return null;
        }
      }

      return totalSeconds + milliseconds;
    },

    /**
     * R.Utils.toTimeString(seconds) -> String
     * - seconds (Number)
     *
     * Return a time string of the argument number of seconds.  The format of
     * the time string is:
     *
     *  hours:minutes:seconds
     *
     * The argument may contain a fractional part and if so the format of 
     * the output time string is:
     *  
     *  hours:minutes:seconds:milliseconds
     *
     **/
    toTimeString: function(seconds) {

      var withLeadingZeros = function(n) {
        if (n < 10) {
          return '00' + n;
        } else if (n < 100) {
          return '0' + n;
        } else {
          return '' + n;
        }
      };

      var withLeadingZero = function(n) {
        if (n < 10) {
          return '0' + n;
        } else {
          return '' + n;
        }
      };
      var hours;
      var minutes;
      var sec = seconds;
      var resultString;

      hours = Math.floor(sec / 3600); // 3600 seconds per hour
      sec = sec - (hours * 3600);
      minutes = Math.floor(sec / 60); // 60 seconds per minute
      sec = Math.floor(sec - (minutes * 60));
      resultString =  withLeadingZero(hours) + ':' + withLeadingZero(minutes) + ':' + withLeadingZero(sec);

      if ((seconds % 1) > 0) {
        // If there is a fractional part, process the number of milliseconds
        var milliseconds = Math.round((seconds % 1) * 1000);
        resultString += '.' + withLeadingZeros(milliseconds);
      } 
      return resultString;
    },

    /**
     * R.Utils.chunk(array, chunkLength)  -> Array
     *
     * Splits an array into several arrays that are each no longer than
     * chunkLength.
     * Returns an array of those arrays.
     **/
    chunk: function(array, chunkLength) {
      return _.values(_.groupBy(array, function(item, i) {
        return Math.floor(i / chunkLength);
      }));
    },

    /**
     * R.Utils.isExtraExclusion(extra) -> Boolean
     * - extra (String|Object): An string or object from a model's 'extras' field.
     *
     * Returns whether or not the extra is an exclusion.
     **/
    isExtraExclusion: function(extra) {
      var isExclusion = false;
      var field = extra;

      if (_.isObject(extra)) {
        isExclusion = extra.exclude;
        field = extra.field;
      }

      return isExclusion || field.charAt(0) === '-';
    },

    /**
     * R.Utils.initCanvas(canvas) -> canvas element
     * - canvas (HTMLElement): Canvas element to initialize.
     *
     * Necessary for working with excanvas (IE8).
     * Returns initialized canvas element.
     **/
    initCanvas: function(canvas) {
      if (!R.Utils.supportsCanvas() && !_.isUndefined(window.G_vmlCanvasManager)) {
        canvas = window.G_vmlCanvasManager.initElement(canvas);
      }
      return canvas;
    },

    getVersionedFlashUrl: function(flashFile) {
      var base = R.serverInfo.get('flashMediaUrl');
      var url = base + 'flash/' + flashFile;
      var versions = R.serverInfo.get('resourceVersions');
      var version = versions ? versions[flashFile] : null;
      if (version) {
        url += '?' + version;
      }
      return url;
    },

    /**
     * R.Utils.whenAll(promises) -> jQuery.Promise
     * - promises (Array): An array of jQuery.Promise objects.
     *
     * Returns a deferred that completes when all the provided deferreds are
     * completed, regardless if they fail or not. This compliments jQuery.when,
     * which triggers callbacks as soon as the first deferred is rejected.
     *
     * Returns a new promise that will resolve if all promises resolved and
     * reject if any projects were rejected. The args passed to the returned
     * promise are: [listOfResolvedPromises, listOfRejectedPromises]
     **/
    whenAll: function(promises) {
      var deferreds = [];
      var successes = [];
      var failures = [];
      _.each(promises, function(promise) {
        var deferred = $.Deferred();
        deferreds.push(deferred);
        promise.done(function() {
          successes.push(promise);
        }).fail(function() {
          failures.push(promise);
        }).always(deferred.resolve);
      });

      return $.when.call($, deferreds).pipe(function() {
        var final = $.Deferred();
        var method = failures.length ? 'reject' : 'resolve';
        final[method]([successes, failures]);
        return final.promise();
      });
    },

    /**
     * R.Utils.remapObjectKeys(obj, map) -> Object
     * - obj (Object): The object to rename keys on.
     * - map (Object): The conversion mapping (keys are old, values are new)
     *
     * Renames keys in the provided object using the conversation table.
     *
     * Example input:
     *   var obj = {
     *     'key1': 'val1', 
     *     'key2': 'val2', 
     *     'key3': 'val3'
     *   };
     *   var map = {
     *     'key1': '1key', 
     *     'key3': '3key'
     *   };
     *   var res = R.Utils.remapObjectKeys(obj, map);
     * 
     * Example output:
     *   {
     *     '1key': 'val1',
     *     'key2': 'val2',
     *     '3key': 'val3'
     *   }
     **/
    remapObjectKeys: function(obj, map) {
      var result = {};
      _.each(obj, function(val, key) {
        key = _.has(map, key) ? map[key] : key;
        result[key] = val;
      });
      return result;
    },

    /**
     * R.Utils.getQueryStringParams(rawQueryString) -> Object
     * - rawQueryString (String): a string including a querystring at the end.
     *
     * Returns an object representing a query string:
     * Example:
     *
     *    R.Utils.getQueryStringParams('?k1=v1&k2=v2') ->
     *      { k1: 'v1', k2: 'v2' }
     *
     *    R.Utils.getQueryStringParams('/somepage/?foo=bar') ->
     *      { foo: 'bar' }
     **/
    getQueryStringParams: function(rawQueryString) {
      var queryString = decodeURIComponent(rawQueryString);
      if (!queryString.length) {
        return {};
      }
      queryString = queryString.substring(queryString.indexOf('?') + 1);
      return _.reduce(queryString.split('&'), function(params, paramStr) {
        var paramPair = paramStr.split('=');
        params[paramPair[0]] = paramPair[1];
        return params;
      }, {});
    },

    /**
     * R.Utils.convertToModelOverride(prop) -> object
     * - prop (String): The name of the property being overridden
     *
     * This is a convenient utility for creating an override that isn't
     * of a known type until data arrives.
     *
     * ### Example
     *
     *     NewModel = R.Model.extend({
     *       overrides: {
     *         source: R.Utils.convertToModel('source')
     *       }
     *     });
     *     model = new NewModel({ source: { type: 't' }});
     *     model.get('source'); // This will be a Track model
     **/
    convertToModelOverride: function(prop) {
      var _prop = '__' + prop;
      return {
        get: function() {
          if (!this[_prop]) {
            this[_prop] = R.Utils.convertToModel(this.attributes[prop]);
          }
          return this[_prop];
        },
        set: function(newValue) {
          // We only want to call set on the new model if it's the same type,
          // otherwise we want to recreate it. So if we know the type of the
          // new value, and it's the same, we allow set to be called. If there
          // is no type, we assume it's the same type cause what else can we do.
          if (this[_prop] && newValue && 
              (!newValue.type || newValue.type === this[_prop].get('type'))) {
            this[_prop].set.apply(this[_prop], arguments);
          } else {
            this[_prop] = R.Utils.convertToModel(newValue);
          }
        }
      }
    }

  };

  // Set up the environment right away so other libraries
  // can rely on HTML5.
  R.Utils.ensureHtml5Elements();
})();
