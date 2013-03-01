/*jslint browser: true */
/*globals server_info getPlayer _ jQuery console FB*/

/**
 * R
 * The R namespace is the catchall for all Rdio application code.
 **/

(function(serverInfo) {
  var root = this;
  var loadTime = (new Date()).getTime();

  if (typeof(R) == 'undefined') {
    R = {};
  }

  // using jquery extend instead of _.extend to reduce dependencies on mobile
  $.extend(R, {
    truncate: function(str, len) {
      if(!str) {
        return '';
      }

      if(str.length <= len) {
        return str;
      }
      return str.substring(0, len) + '...';
    },
    isDesktop: /com.rdio.desktop/.test(navigator.userAgent.toLowerCase()),
    isMacDesktop: /com.rdio.desktop.mac/.test(navigator.userAgent.toLowerCase()),
    isWinDesktop: /com.rdio.desktop.win/.test(navigator.userAgent.toLowerCase()),
    usesNewHeader: /com.rdio.desktop.new_header/.test(navigator.userAgent.toLowerCase()),

    /**
     * R.doNothing() -> undefined
     *
     * Does nothing. Just a reference to an empty function that you can use
     * instead of creating a new empty function.
     **/
    doNothing: function() {},

    /**
     * R.injectScript(src[, root][, onLoad][, onError]) -> HTMLElement
     * - src (String): The path to the script you want to inject.
     * - root (Element): The element you want to append the script tag to.
     * - onLoad (Function): A function to call when the script finishes loading.
     * - onError (Function): A function to call if there is an error loading
     *   the script.
     *
     * Appends a script tag to head if `root` is not specified, otherwise
     * appends a new script tag to `root`.
     *
     * Returns the script element.
     **/
    injectScript: function(src, root, onLoad, onError) {
      var headEl = document.getElementsByTagName("head")[0];
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = src;
      script.async = true;

      if (onLoad) {
        // onreadystatechange for old versions of IE
        script.onload = script.onreadystatechange = function() {
          if (script.readyState &&
              script.readyState != 'complete' && script.readyState != 'loaded') {
            return;
          }
          script.onload = script.onreadystatechange = null;
          onLoad(src);
        };
      }
      // This doesn't work in IE and there's no way to make it work in IE, but
      // it will allow error handling for everybody else.
      if (onError) {
        script.onerror = onError;
      }

      if (root) {
        root.appendChild(script);
      } else {
        headEl.appendChild(script);
      }
      return script;
    },
    fbInit: function(enableMusic, callback) {
      var channelUrl = 'https://' + document.location.host + '/fb_channel.html',
        locale,
        src;

      window.fbAsyncInit = function() {
        FB.init({
          appId: serverInfo().fbid,
          status: true,
          cookie: true,
          xfbml: true,
          music: !!enableMusic,
          channelUrl: channelUrl
        });
        if (callback && typeof callback == 'function') {
          callback();
        }
      };

      src = 'https://connect.facebook.net/' + serverInfo().fbLocale + '/all/vb.js';
      this.injectScript(src, $('#fb-root')[0]);
    },

    /**
     * R.enableLogging() -> undefined
     *
     * Used in production, this will start flash and JS logging to the console.
     **/
    enableLogging: function() {
      serverInfo().debug = true;
      if (typeof getPlayer != 'undefined' && getPlayer()) {
        getPlayer()._enableLogging();
      }
    },
    // Backbone views that map to a template add themselves here
    // DEPRECATED!
    templateViews: {},
    // util function to check a source/type, returns true if it's a station, false otherwise
    isStation: function(obj) {
      if (!obj) {
        return false;
      }
      // TODO make rl a station and remove it here
      var nonStationTypes = ['p', 't', 'a', 'al', 'rl', 'l', 'r', 's', 'ct', 'mr', 'g', 'ver', 'vsr', 'vr', 'st', 'ne', 'cs'];
      var type;
      if (_.isString(obj)) {
        type = obj;
      }
      if (obj.type) {
        type = obj.type;
      } else if (obj.has && obj.has('type')) {
        type = obj.get('type');
      }
      if (!type) {
        return false;
      }
      return _.indexOf(nonStationTypes, type) === -1;
    },
    /**
     * R.changeLocale(newLocale) -> undefined
     *
     * Makes an API call to change the user's locale to `newLocale`. This
     * is fire-and-forget, there's no way to find out if this was sucessful
     * or not as it will reload the page on success.
     **/
    changeLocale: function(newLocale) {
      R.Api.request({
        method: 'changeLocale',
        content: {
          locale: newLocale
        },
        successCallback: function() {
          document.location.reload();
        }
      });
    },

    /**
     * R.reload() -> undefined
     *
     * Reloads the page. Use this instead of window.location.reload so that
     * you can test that your code actually triggers a reload. It also provides
     * some protection around going into rapid reload loops.
     **/
    reload: typeof _ != 'undefined' ? _.once(function() {
      var now = new Date();
      // If are calling reload within 60 seconds of loading, we probably loaded from
      // the old version of the site. Let's reload later when the world is right.
      console.log('Reloading!');
      if (loadTime + 60000 > now.getTime()) {
        _.delay(function() {
          window.location.reload();
        }, 3000);
      } else {
        window.location.reload();
      }
    }) : window.location.reload,

    /**
     * R.Components
     *
     * Namespace holding all of the Rdio components. Everything in here should
     * be an instance of R.Component or another namespace.
     **/
    Components: {},
    /**
     * R.Models
     *
     * Namespace holding all of the Rdio Models
     * 
     **/
    Models: {},
    /**
     * R.Mixins
     *
     * Namespace holding all of the Rdio Mixins
     **/
    Mixins: {},
    isMaster: false,

    // Initialize global data
    /**
     * R.serverInfo -> Backbone.Model
     *
     * Constants that change by configuration or regions. Refer to
     * rdio.utils.template.globals.generate_server_info for what comes back
     **/
    serverInfo: new Backbone.Model(Env.serverInfo),

    VERSION: Env.VERSION
  });

  // ES5 supports trim, so we should be able to use it.
  if (!String.prototype.trim) {
    String.prototype.trim = function() {
      return $.trim(this);
    };
  }
})(function() { return R.serverInfo ? R.serverInfo.attributes : server_info; });
