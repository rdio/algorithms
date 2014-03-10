(function() {
    "use strict";
    var langMap = {
        js: 'javascript',
        py: 'python'
    };

    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g,
        escape: /\{\@(.+?)\@\}/g
    };

    R.init = function() {
        var router = new Backbone.Router({
            routes: {
                "post/:name/": "post",
                "": "home"
            }
        });

        R.Services.start();

        marked.setOptions({
            gfm: true,
            tables: true,
            highlight: function(code, lang) {
                lang = langMap[lang] || lang;
                try {
                    var highlighted = hljs.highlight(lang, code, true);
                    return highlighted.value;
                } catch(exc) {
                    console.warn('Unhighlightable language', lang);
                    return code;
                }
            }
        });

        $('body').on('click', 'a', function(e) {
            if (e.currentTarget.host === window.location.host) {
                e.preventDefault();
                router.navigate(e.currentTarget.pathname, true);
            } else {
                e.currentTarget.target = "_blank";
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
