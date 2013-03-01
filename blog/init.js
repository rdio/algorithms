(function() {
    "use strict";
    R.init = function() {
        R.Services.start();

        R.Services.ready('Loader', function() {
            R.loader.load(['Home'], function() {
                var home = new R.Components.Home();
                home.render(function() {
                    $('body').append(home.el);
                });
            });
        });
    };
}).call(this);
