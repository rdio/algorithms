(function() {
    "use strict";
    R.Component.create('App', {
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
        _renderContent: function(contentComponent) {
            var self = this;
            this.currentContent = this.addChild(contentComponent);
            this.currentContent.render(function() {
                self.$('.content').append(self.currentContent.el);
            });
        },
        home: function() {
            var self = this;
            R.loader.load(['Home'], function() {
                self._renderContent(new R.Components.Home());
            });
        },
        post: function(post) {
            var self = this;
            R.loader.load(['Post'], function() {
                self._renderContent(new R.Components.Post({
                    id: post
                }));
            });
        }
    });
}).call(this);
