(function() {
    "use strict";
    R.Component.create('App', {
        dependencies: ['Home'],
        initialize: function() {
            R.Component.prototype.initialize.apply(this, arguments);
            this.listen(Backbone.history, 'route', this.route);
        },
        route: function(router, route, urlArgs) {
            var handler = this[route];
            if (handler) {
                if (this.currentContent) {
                    this.currentContent.destroy();
                }
                handler.apply(this, urlArgs);
            } else {
                console.warn("No route found for", route);
            }
        },
        home: function() {
            var self = this;
            this.currentContent = this.addChild(new R.Components.Home());
            this.currentContent.render(function() {
                self.$el.append(self.currentContent.el);
            });
        }
    });
}).call(this);
