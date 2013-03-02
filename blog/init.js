(function() {
    "use strict";
    R.init = function() {
        var router = new Backbone.Router({
            routes: {
                "post/:name/": "post",
                "": "home"
            }
        });

        R.Services.start();

        $('body').on('click', 'a', function(e) {
            if (e.target.host === window.location.host) {
                e.preventDefault();
                router.navigate(e.target.pathname, true);
            }
        });

        R.Services.ready('Loader', function() {
            R.loader.load(['App'], function() {
                var app = new R.Components.App();
                app.render(function() {
                    $('body').append(app.el);
                    Backbone.history.start({ pushState: true });
                });
            });
        });
    };
}).call(this);
