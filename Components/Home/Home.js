(function() {
    "use strict";
    var PostsCollection = Backbone.Collection.extend({
        shouldFetch: true,
        url: '/posts/published_posts.json'
    });
    R.Component.create('Home', {
        dependencies: ['Post'],
        modelClass: PostsCollection
    });
}).call(this);
