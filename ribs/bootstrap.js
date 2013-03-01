/*jshint evil:true */
/*globals $LAB ActiveXObject */
(function() {
  "use strict";

  var root = this;
  var headEl = document.getElementsByTagName('head')[0];
  var targetBase = '/';
  var resourceBase = '';
  var pathFactories;

  function time(name) {
    try {
      if (typeof console !== 'undefined' && console.time) {
        console.time(name);
      }
      Env.timers[name] = new Date();
    } catch (e) { }
  }

  function timeEnd(name) {
    try {
      if (typeof console !== 'undefined' && console.timeEnd) {
        console.timeEnd(name);
      }
      Env.timers[name] = new Date() - Env.timers[name];
    } catch (e) { }
  }

  function defaultPathFactory(file) {
    if (file.ext) {
      return file.file + '.' + file.ext;
    }
    return file.file;
  }

  function getXhr() {
    if (root.XMLHttpRequest) {
      return new XMLHttpRequest();
    } else {
      // This might fail if there's no support for any sort
      // of AJAX. I don't really know what to tell you in that case,
      // so I'm not going to handle it.
      return new ActiveXObject("MSXML2.XMLHTTP.3.0");
    }
  }

  function flattenList(list, absolute) {
    if (!list) {
      return [];
    }
    var len = list.length;
    var flattened = [];
    var basePath, fileList, numFiles, file, pathFactory;
    for (var i = 0; i < len; i++) {
      basePath = list[i][0];
      // We assume that basePath ends in /, so fix it if it doesn't
      if (basePath.charAt(basePath.length - 1) !== '/') {
        basePath = basePath + '/';
      }
      if (!absolute) {
        basePath = resourceBase + basePath;
      }
      fileList = list[i][1];
      numFiles = fileList.length;
      for (var j = 0; j < numFiles; j++) {
        file = fileList[j];
        if (typeof file == 'string') {
          flattened.push(basePath + file);
        } else {
          pathFactory = pathFactories[file.ext] || defaultPathFactory;
          flattened.push(basePath + pathFactory(file));
        }
      }
    }
    return flattened;
  }

  // A collection of functions that deals with merging target
  // JSON files together.
  var Target = {
    load: function(target, callback) {
      var xhr = getXhr();
      var targetUrl = targetBase + target + '.json';
      var parsedTarget;
      xhr.open('GET', targetUrl);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              parsedTarget = JSON.parse(xhr.responseText);
            } catch(e) {
              console.error("Could not parse target:", target);
              throw e;
            }
            Target.flatten(parsedTarget, callback);
          } else {
            callback("Could not load " + target);
          }
        }
      };
      xhr.send(null);
    },
    flatten: function(target, callback) {
      var targetDeps = target.targetDependencies;
      var targetsToMerge = [];
      function loaded(err, dependentTarget) {
        if (err) {
          return callback(err);
        }
        targetsToMerge.push(dependentTarget);
        if (targetsToMerge.length === targetDeps.length) {
          targetsToMerge.push(target);
          callback(null, Target.merge(targetsToMerge));
        }
      }
      var len = targetDeps && targetDeps.length;
      if (len) {
        for (var i = 0; i < len; i++) {
          Target.load(targetDeps[i], loaded);
        }
      } else {
        callback(null, target);
      }
    },
    merge: function(targetList) {
      var current;
      var merged = {};
      var len = targetList.length;
      for (var i = 0; i < len; i++) {
        current = targetList[i];
        for (var field in current) {
          if (current.hasOwnProperty(field)) {
            merged[field] = Target.mergeField(merged[field], current[field]);
          }
        }
      }
      return merged;
    },
    mergeField: function(a, b) {
      if (!a) {
        return b;
      } else if (a instanceof Array) {
        // For an array, the earlier values come before the latter values
        return a.concat(b);
      } else if (typeof b == 'string') {
        // For a string, the last one wins.
        if (b) {
          return b;
        }
        return a;
      } else {
        // For a dict, latter values override earlier values
        for (var field in b) {
          if (b.hasOwnProperty(field)) {
            a[field] = b[field];
          }
        }
        return a;
      }
    }
  };

  // Flattens the various lists of JS files and uses LAB.js to load
  // and evaluate the scripts in the correct order.
  function loadJavascript(target, options) {
    var fileList = [];
    var toLoad = ['dependencies', 'scripts', 'models'];
    if (options.dev) {
      toLoad.splice(1, 0, 'devDependencies');
    }
    for (var i = 0; i < toLoad.length; i++) {
      fileList = fileList.concat(flattenList(target[toLoad[i]]));
    }
    time("loading.js");
    // We need the JS to load in order, and since we're doing this from JS,
    // it will be async. Making async script loading parallel and in order is
    // a bit tricky, but luckily LAB.js does it for us!
    $LAB.setOptions({ AlwaysPreserveOrder: true }).script(fileList).wait(function() {
      timeEnd("loading.js");
      // After all the js is loaded, call the
      // `main` function and start the program
      eval(target.main).call(root, options.mainOptions);
    });
  }

  // Flattens the css and less lists and injects the elements into the head
  function loadStyles(target, options) {
    var toLoad = ['externalCss', 'css'];
    if (options.dev) {
      toLoad.push('less');
    }
    var el, field, files, numFiles;
    for (var i = 0; i < toLoad.length; i++) {
      field = toLoad[i];
      files = flattenList(target[field], field === 'externalCss');
      numFiles = files.length;
      for (var j = 0; j < numFiles; j++) {
        el = document.createElement('link');
        el.rel = field === 'less' ? 'stylesheet/less' : 'stylesheet';
        el.type = 'text/css';
        el.href = files[j];
        headEl.appendChild(el);
      }
    }
  }

  root.R = root.R || {};

  /**
   * R.boot(app, options) -> undefined
   * - app (string): The name of the app to load
   * - options (object): Options object (documented below)
   *
   * ## Options
   *
   *  - environment (object): An object that contains objects that
   *    describe something about the environment this app is being loaded
   *    in. A good example is server configuration or the current user.
   *  - targetBase (string): The base url for requesting the target
   *    that is used to describe how to load the application.
   *  - resourceBase (string): The base url for requesting the resources
   *    described in the target file.
   *  - dev (boolean): Whether to load dev dependencies or not.
   *  - mainOptions (object): Options object to pass to the `main` function.
   *  - pathFactories (object): A map of extension to function that will
   *    construct the correct file name for a given file object in a target.
   *    Files that are just strings are assumed to be complete.
   *  - unstyled (Boolean): If `true`, don't load styles.
   **/
  R.boot = function(app, options) {
    options = options || {};
    root.Env = options.environment;
    Env.timers = {};
    if (options.targetBase) {
      targetBase = options.targetBase;
    }
    if (typeof targetBase === 'function') {
      targetBase = targetBase();
    }
    if (options.resourceBase) {
      resourceBase = options.resourceBase;
    }
    if (typeof resourceBase === 'function') {
      resourceBase = resourceBase();
    }
    pathFactories = options.pathFactories || {};
    var timer = 'loading.target.' + app;
    time(timer);
    Target.load(app, function(err, target) {
      timeEnd(timer);
      if (err) {
        throw new Error(err);
      }
      Env.target = target;
      if (!options.unstyled) {
        loadStyles(target, options);
      }
      loadJavascript(target, options);
    });
  }
}).call(this);
