(function() {
    "use strict";
    var langMap = {
        js: 'javascript',
        py: 'python'
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
