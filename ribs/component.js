(function() {
  var bgProto = Bujagali.View.prototype;
  var externalRe = /^(http[s]?:)?\/\//;

  /**
   * class R.Component < Bujagali.View
   *
   * A component. This is the building block for all Rdio
   * UI Components. It helps tie together templates and models,
   * and extends Bujagali Views, which provide a convenient
   * way to attach behaviors.
   **/
  R.Component = Bujagali.View.extend({

    /**
     * R.Component#dependencies -> Array
     *
     * List of components this component depends on by fully qualified name.
     * If this component has a super class, that is also a dependency and
     * must be put in this list.
     **/
    dependencies: [],


    /**
     * R.Component#libraries -> Array | Function
     *
     * List of libraries this component depends on by url, or a function that
     * returns this list.
     **/
    libraries: [],

    /**
     * R.Component#requiredFields -> Array
     *
     * List of fields that must exist on this component's model in order for
     * it to work.
     **/
    requiredFields: [],

    /**
     * R.Component#cache -> boolean
     *
     * false value prevents App.Rdio from pushing this component
     * on the caching history stack. Default: true
     **/
    cache: true,

    /**
     * R.Component#onFetchError -> string
     *
     * Name of NotFound component to render when App.Rdio unsuccessfully tries loading
     * content. Default: "NotFound"
     **/
    onFetchError: 'NotFound',

    /**
     * R.Component#modelClass -> Function | R.Model
     *
     * Either a model type to instantiate or a function that will return a
     * model instance. This is automatically created when [[R.Component#ensureModel]]
     * is called and there is not yet a model for this component.
     **/

    /**
     * new R.Component(options)
     *
     * Creates a new component instance.
     *
     * All components are given a default css class that is the name of the
     * component, with all namespaces included. For example, a component
     * called `Comments.Comment` will have its elements class attribute
     * set to 'Comments Comment'.
     *
     * #### Options
     *
     *  - `model`: A model to use for this component. Will not try an
     *    construct its own model if this option is provided.
     *  - `extraClassName`: Additional CSS classes to put on the component's
     *    element.
     *
     *  Additional options are automatically stuck on the `options` property.
     **/
    initialize: function(options) {
      if (options && options.extraClassName) {
        $(this.el).addClass(options.extraClassName);
      }
      this._eventHandlers = [];
      this._addedRequiredFields = false;
      this.listen(R.loader, 'loaded:' + this._name, this._componentChanged);
      bgProto.initialize.apply(this, arguments);
      if (this.model) {
        this.listen(this.model, 'remove', this.onModelRemoved);
        this._onModelCreated();
      }
    },
    _readyToRender: function(k, isSubtree) {
      var self = this;
      return bgProto.render.call(self, {
        data: self.model || new Backbone.Model()
      }, function() {
        if (k) {
          k();
        }
      }, isSubtree);
    },

    mixin: function(mixin, options) {
      var self = this;
      if (!mixin) {
        throw new Error('Mixin not defined');
      }

      _.each(mixin, function(method, methodName) {
        if (!self[methodName]) {
          self[methodName] = method;
        } else {
          var originalCall = self[methodName];
          var newCall = method;
          self[methodName] = function() {
            originalCall.apply(this, arguments);
            newCall.apply(this, arguments);
          };
        }
      });

      if (mixin.className) {
        $(this.el).addClass(mixin.className);
      }

      if (mixin.onMixin) {
        mixin.onMixin.call(this, options || {});
      }
    },

    /**
     * R.Component#listen(object, eventName, eventHandler) -> undefined
     * - object (Object): Event emitting object
     *   (supports the [Backbone.Events][1] API)
     * - eventName (String): One or more (space-separated) events to bind to on `object`
     * - eventHandler (Function): Function to run when `eventName` is triggered
     *
     * Binds to `object`. Will run `eventHandler` whenever `object` triggers
     * `eventName`. `eventHandler` will be run in the current context. The
     * handler will be unbound on destroy, so no cleanup is necessary for
     * handlers bound with this method.
     *
     * [[R.Component#stopListening]] should be used to undo this operation.
     *
     * [1]: http://documentcloud.github.com/backbone/#Events
     **/
    listen: function(object, eventName, eventHandler) {
      this._eventHandlers.push([object, eventName, eventHandler]);
      object.bind(eventName, eventHandler, this);
    },

    /**
     * R.Component#stopListening(object[, eventName][, eventHandler]) -> undefined
     * - object (Object): Event emitting object
     *   (supports the [Backbone.Events][1] API)
     * - eventName (String): Event to unbind from `object`
     * - eventHandler (Function): Handler function to unbind
     *
     * Unbinds a handler bound by [[R.Component#listen]]. If `eventHandler` is not
     * specified, unbinds all handlers this component has bound to the `eventName`
     * event on `object`. If `eventName` is not specified, unbinds all events this
     * component has bound to `object`.
     *
     * [1]: http://documentcloud.github.com/backbone/#Events
     **/
    stopListening: function(object, eventName, eventHandler) {
      var self = this;
      _.each(self._eventHandlers, function(handler, i) {
        if (object == handler[0]) {
          if (eventName && eventName == handler[1]) {
            if (eventHandler && eventHandler == handler[2]) {
              self._removeEventHandler(handler);
            } else if (!eventHandler) {
              self._removeEventHandler(handler);
            }
          } else if (!eventName) {
            self._removeEventHandler(handler);
          }
        }
      });
    },

    /**
     * R.Component#bubbleEvent(eventName, event[, args...]) -> Boolean
     * - eventName (String): The name of the event you want to `trigger`
     * - event (Event): The event you want to propagate to parent containers
     *
     * Bubbles up the event through all parent containers until it reaches
     * the top most container or the event is stopped using
     * R.Utils.stopEvent(event). The eventName is what's called on the parent's
     * trigger method and the event and any other arguments will be passed along.
     *
     * This method will also attach the calling component instance to the
     * event's `targetComponent` property. Listeners can use this to determine
     * who dispatched the event.
     *
     * This method will always return true unless the event's default
     * was prevented using event.preventDefault().
     **/
    bubbleEvent: function(eventName, event) {
      var component = this;
      event.targetComponent = this;

      while (component && !event.isPropagationStopped()) {
        // So it's actually possible that triggering this event will cause
        // the destruction of the current component, so we need to check
        // to make sure it still exists on the next loop.
        event.currentComponent = component;
        component.trigger.apply(component, arguments);
        component = component.parent();
      }

      return !event.isDefaultPrevented();
    },

    // helper for stopListening
    _removeEventHandler: function(handler, i) {
      handler[0].unbind(handler[1], handler[2], this);
      delete this._eventHandlers[i];
    },

    _componentChanged: function() {
      // The component's code has changed. Probably some top level component
      // is very concerned about this, so we bubble the event up. However, if
      // they don't do anything about it, we're just going to commit seppuku.
      var e = $.Event();
      e.component = this;
      if(this.bubbleEvent('componentChanged', e)) {
        this.destroy();
      }
    },

    /**
     * R.Component#ensureModel([k]) -> undefined
     * - k (Function): Continuation to be called after the model is loaded
     *
     * Call this to ensure that your model is loaded. This is automatically
     * called on render, but if you need to make sure your component's
     * model is loaded at some other time, call this function and it
     * will do that. It will not refresh data from the server, so if you
     * have stale data, this doesn't do anything.
     **/
    ensureModel: function(k) {
      var self = this;
      k = k || R.doNothing;

      if (self.model || !(self.modelClass || self.modelFactory)) {
        self._verifyModelType();
        if (self.model && self._addModelFields() && self._shouldFetch()) {
          self._fetchModel(k, self.model.fetchOptions);
        } else {
          k();
        }

        return;
      }

      var modelFactory = self.modelFactory,
        modelClass = self.modelClass;
      if (modelFactory) {
        self.model = modelFactory.call(self);
      } else if (modelClass && _.isFunction(modelClass)) {
        self.model = new modelClass();
      }

      self._verifyModelType();
      self._addModelFields();
      self.listen(self.model, 'remove', self.onModelRemoved);

      if (self._shouldFetch()) {
        self._fetchModel(function() {
          self._onModelCreated();
          k();
        }, self.model.fetchOptions);
      } else {
        self._onModelCreated();
        k();
      }
    },

    _shouldFetch: function() {
      var isShouldFetchDefined = !_.isUndefined(this.model.shouldFetch);
      var shouldFetch = R.Utils.value.call(this.model, this.model.shouldFetch);

      // If shouldFetch is defined, fetch if it evaluates to true.
      // If shouldFetch is not defined, only fetch if the model has a 'method' defined.
      return (isShouldFetchDefined && shouldFetch) || (!isShouldFetchDefined && this.model.method);
    },

    _onModelCreated: function() {
      if (_.isFunction(this.model.reference)) {
        this.model.reference();
      }
      this.onModelCreated();
    },

    /*
     * Adds requiredFields to the model if they have not yet been added.
     * Returns true if missing fields were added to the model.
     */
    _addModelFields: function() {
      if (this.requiredFields.length > 0 && !this._addedRequiredFields) {
        var hadMissingFields = _.difference(this.requiredFields, this.model.getAllFields()).length > 0;

        this.model.addFieldRefs(this.requiredFields);
        this._addedRequiredFields = true;

        return hadMissingFields;
      }

      return false;
    },

    _fetchModel: function(k, options) {
      var self = this;
      self.pendingFetch = self.model.fetch(_.extend({
        success: function(model, response) {
          self.pendingFetch = null;
          k();
        },
        error: function(model, response) {
          // XXX: There's more to do here. Need to communicate with the user
          // that things didn't go well.
          self.pendingFetch = null;
          self.trigger('fetchError', model, response);
          console.error("Request failed: " + response.statusText);
        },
        // We don't trigger events because we might be rendering, and we don't
        // want a change to result in a 'render while rendering' error.
        silent: true
      }, options));
    },

    isType: function(obj, type) {
      return obj instanceof type;
    },

    _verifyModelType: function() {
      var self = this,
        modelClass = self.modelClass,
        model = self.model;
      if (modelClass && model) {
        if (_.isFunction(modelClass) && !self.isType(model, modelClass)) {
          throw new TypeError("Model is not correct type");
        } else if (_.isArray(modelClass)) {
          var ok = _.any(modelClass, function(klass) {
            return self.isType(model, klass);
          });
          if (!ok) {
            throw new TypeError("Model is not correct type");
          }
        }
      }
    },

    render: function(k, isSubtree) {
      if (this._willBeDestroyed) {
        return k ? k() : null;
      }
      if (this.ensureModel) {
        this.ensureModel(_.bind(this._readyToRender, this, k, isSubtree));
      } else {
        this._readyToRender(k, isSubtree);
      }

      return this;
    },

    /**
     * R.Component#renderNewChild(child, selector, k, options) -> R.Component
     * - child (Backbone.View): A `Backbone.View` to include as a child of
     *   this component
     * - selector (String | jQuery | element): Identifier of where to place
     *   the child in the DOM. If falsy, just appends to this component's element.
     * - options (Object): A object specifying additional options.
     *
     * This convenience method adds a child to the `children` array of this
     * component and renders it into the specifed place in the DOM.
     *
     * By default, `child.el` is appended to whatever selector or element
     * is specified by `selector`
     *
     * Returns `child`
     **/
    renderNewChild: function(child, selector, k, options) {
      if (!child) {
        throw new TypeError('Cannot render a null child');
      }
      var self = this;
      k = k || R.doNothing;

      self.addChild(child);
      child.render(function() {
        var method = (options && options.where) ? options.where : 'append';
        var $el = self.$el;
        if (selector && selector !== self.$el) {
          $el = self.$(selector);
        }
        $el[method](child.el);
        self.trigger("childRender", child);
        k();
      });
      return child;
    },

    remove: function() {
      bgProto.remove.apply(this, arguments);
      if (this.isInserted()) {
        this.onDetached();
      }
    },

    destroy: function() {
      var self = this;
      if (!this._willBeDestroyed) {
        this._willBeDestroyed = true;
        bgProto.destroy.apply(self, arguments);
        _.defer(function() {
          if (self._destroyed) {
            return;
          }
          self._destroyed = true; // this is useful for debugging

          // Unbind all event handlers that we're aware of (that were bound by listen)
          _.each(self._eventHandlers, function(args) {
            args[0].unbind(args[1], args[2], self);
          });
          self._eventHandlers = null;

          // Give components a chance to clean themselves up
          self.onDestroyed();

          self.unbind();
          $(self.el).unbind();

          if (self.options) {
            self.options = null;
          }
          if (self.model) {
            if (self._addedRequiredFields) {
              self.model.removeFields(self.requiredFields);
            }
            if (_.isFunction(self.model.release)) {
              self.model.release();
            }
            self.model = null;
          }
          if (self.pendingFetch) {
            self.pendingFetch.abort();
            self.pendingFetch = null;
          }

          // Set destroyComplete to true after all the cleanup has cleared
          self._destroyComplete = true;
        });
      }
    },

    isDestroyed: function() {
      return this._destroyed;
    },


    isDestroyComplete: function() {
      return this._destroyComplete;
    },

    /**
     * R.Component#invalidate() -> undefined
     *
     * Used to mark a component as being in an incorrect state in some way.
     * Sets 'invalidated' property to true and bubbles an invalidate event.
     **/
    invalidate: function() {
      var event = $.Event();
      this.invalidated = true;
      this.bubbleEvent('invalidate', event);
    },

    // Filtering functions to aid in finding children components

    /**
     * R.Component#findChild(filterFunc) -> R.Component
     * - filterFunc (Function): Function that returns true if the passed child
     *   is the child you're looking for.
     *
     * This finds the first child in the component's children list that passes
     * the test provided by `filterFunc`.
     *
     * Returns the found child component.
     **/
    findChild: function(filterFunc) {
      return _.find(this.children, filterFunc);
    },

    /**
     * R.Component#findChildWithModel(model) -> R.Component
     * - model (Backbone.Model): A model that you want to find the
     *   corresponding component for.
     *
     * This function returns the first child with the specified model.
     * Useful if you have a collection of models and want to get the component
     * that ended up rendering that specific data.
     **/
    findChildWithModel: function(model) {
      return this.findChild(function(child) {
        return child.model === model;
      });
    },

    /**
     * R.Component#findAllChildren(filterFunc) -> [R.Component]
     *
     * Like findChild, but recursively searches the entire component tree,
     * and returns all children that pass the test function.
     *
     * - filterFunc (Function): Function that returns true if the passed child
     *   is a child you're looking for.
     **/
    findAllChildren: function(filterFunc) {
      var queue = _.clone(this.children);
      var found = [];
      var child;

      while (!_.isEmpty(queue)) {
        child = queue.shift();

        if (_.isObject(child) && filterFunc(child)) {
          found.push(child);
        }

        if (_.isArray(child.children)) {
          queue = queue.concat(child.children);
        }
      }

      return found;
    },

    /**
     * R.Components#invokeChildren(childClass, method) -> undefined
     * - childClass (Component|String): Component class with the
     *   target method.
     * - method (String): String referring to a method on the child
     *   that will be called.
     *
     * Any additional arguments will be passed through to the method.
     **/
    invokeChildren: function(childClass, method) {
      var args = _.rest(arguments, 2);
      if (_.isString(childClass)) {
        childClass = R.Component.getObject(childClass);
      }
      var children = _.each(this.children, function(ch) {
        if (ch instanceof childClass) {
          // Rather than checking that the method exists, let this
          // call be noisy if it fails so we know invokeChildren was
          // used incorrectly.
          ch[method].apply(ch, args);
        }
      });
    },

    // Delegates

    /**
     * R.Component#onInserted() -> undefined
     *
     * Called when the component is inserted into the document. This does not
     * necessarily happen on render, it can happen later if the component is
     * cached or the parent component has not yet been inserted into the
     * document.
     **/
    onInserted: R.doNothing,

    /**
     * R.Component#onDetached() -> undefined
     *
     * Called when the component is removed for the document. It's a good idea
     * to detach from global events when you are not in the document.
     **/
    onDetached: R.doNothing,

    /**
     * R.Component#onModelRemoved() -> undefined
     *
     * Called when the backing model for this component has been removed from
     * its containing collection.
     **/
    onModelRemoved: R.doNothing,

    /**
     * R.Component#onModelCreated() -> undefined
     *
     * After the model has been created, but before anything else is done, this
     * function is called.
     **/
    onModelCreated: R.doNothing,

    /**
     * R.Component#onDestroyed() -> undefined
     *
     * When this component is no longer needed and will not be needed in the
     * future, it is destroyed. This function is called to allow the component
     * to clean up. Does nothing by default.
     **/
    onDestroyed: R.doNothing

  }, {
    /**
     * R.Component.create(fullName, properties[, classProperties]) -> undefined
     * - fullName (String): The name of the component, including namespace
     *   `R.Components` is not part of the `fullName`
     * - properties (Object): a component definition. Whatever you would pass
     *   to [[R.Component.extend]]
     * - classProperties (Object): Optional. Items from this object will be
     *   added to the created component's namespace.
     *
     * Use this factory to create new components. It does things like
     * set the correct template and load all your dependencies. The
     * resulting component will be `fullName` put in [[R.Components]]
     *
     * #### Special properties
     *
     * - `superClass` (String | [[R.Component]]): Extend the specified component
     *   instead of [[R.Component]]
     * - `template` (String): Instead of rendering the default template (which is
     *   just the template of the same name as the component), use a custom
     *   template.
     **/
    create: function(fullName, properties, classProperties) {
      var deps = properties.dependencies;
      var libs = R.Utils.value(properties.libraries);
      var path = fullName.split('.');
      var name = _.last(path);
      var templateName = ['/Components/', path.join('/'), '/', name, '.bg.html'].join('');
      var hasTemplate = Bujagali.fxns[templateName] ? true : false;
      var className = path.join('_');

      properties = _.extend({
        template: hasTemplate ? templateName : null,
        _name: fullName,
        superClass: R.Component
      }, properties);

      var loaded = _.after(2, function() {
        R.loader.loaded(fullName);
      });

      R.loader.loadExternalScripts(libs, function() {
        loaded();
      });

      R.loader.load(deps, function() {
        var superClass = properties.superClass;
        if (_.isString(superClass)) {
          properties.superClass = R.Component.getObject(superClass);
          superClass = properties.superClass;
        }

        var ctor = superClass;
        while (ctor != R.Component) {
          className = ctor.prototype.className + ' ' + className;
          ctor = ctor.prototype.superClass;
        }

        properties.className = properties.className ? className + ' ' + properties.className : className;

        var namespace = R.Component.getObject(_.initial(path), true);
        var componentClass = superClass.extend(properties, classProperties);

        if (namespace[name]) {
          _.extend(componentClass, namespace[name]);
        }
        namespace[name] = componentClass;
        loaded();
      });
    },

    /**
     * R.Component.getObject(path[, createAsResolved]) -> Object | R.Component
     * - path (String): A component or component namespace name.
     *   Ie. 'Comments.Comment'
     * - createAsResolved (Boolean): If true, create the namespaces as
     *   you descend.
     *
     * Resolve a string component name into its constructor, or a namespace into
     * its object.
     **/
    getObject: function(path, createAsResolved) {
      var i, sub,
        pointer = R.Components;
      if (_.isString(path)) {
        path = path.split('.');
      }
      for (i = 0; i < path.length; i++) {
        sub = path[i];
        if (createAsResolved && !pointer[sub]) {
          pointer[sub] = {};
        }
        pointer = pointer[sub];
        if (!pointer) {
          return null;
        }
      }
      return pointer;
    },

    /**
     * R.Component.callSuper(object, method[, args]) -> unknown
     * - object (object): An instance of the class you're calling super on
     * - method (string): The name of the method to call
     * - args (objects): all additional arguments will be passed to the super class
     *
     * Calls the method on the superClass of the class it's called on.
     * Returns the result of the call.
     *
     * To pass arguments to the superClass method, include them as extra
     * arguments to this method.
     * Otherwise, the caller's arguments will be passed to the superClass
     * method.
     *
     * ###Example
     *
     *     // This calls the `initialize` method on the super class of
     *     // `R.Components.App.Rdio`.
     *     R.Components.App.Rdio.callSuper(this, 'initialize');
     *
     *     // This calls the `getChildComponent` method of the super class of
     *     // R.Components.QueueList.  `getChildComponent` has two named
     *     // parameters: `listItem` and `index`.  This passes `{}` as
     *     // `listItem` and `0` as `index`.
     *     R.Components.QueueList.callSuper(this, 'getChildComponent', {}, 0)
     **/
    callSuper: function callSuper(self, method) {
      var args;

      if (arguments.length >= 3) {
        args = _.toArray(arguments).slice(2);
      } else {
        // Function.caller isn't part of the ECMA spec, but everybody
        // supports it or arguments.callee.caller
        args = (callSuper.caller || arguments.callee.caller).arguments;
      }

      return this.prototype.superClass.prototype[method].apply(self, args);
    }
  });
})();

