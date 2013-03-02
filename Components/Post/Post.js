(function() {
    "use strict";
    var PostModel = Backbone.Model.extend({
        shouldFetch: true,
        urlRoot: '/posts/',
        fetchOptions: {
            dataType: 'text'
        },
        parse: function(markdown) {
            return {
                markdown: markdown
            };
        }
    });
    R.Component.create('Post', {
        modelFactory: function() {
            return new PostModel({
                id: this.options.postId + '.md'
            });
        }
    });
}).call(this);
