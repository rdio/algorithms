(function() {
    var githubUrl = "https://api.github.com/repos/JustinTulloss/engblog/commits";
    var githubToken = "";
    var bylineTemplate = _.template('<a href="https://github.com/JustinTulloss/engblog/commits/master/posts/{{ post }}">Last modified</a> by <a href="{{ url }}">{@ name @}</a> on {{ date }}');

    var PostModel = Backbone.Model.extend({
        shouldFetch: true,
        urlRoot: '/posts/',
        fetchOptions: {
            dataType: 'text'
        },
        fetch: function() {
            var self = this;
            $.ajax(githubUrl, {
                data: {
                    access_token: githubToken,
                    path: this.urlRoot + this.id
                },
                success: function(response) {
                    if (response.length) {
                        self.set(response[0]);
                    }
                },
                error: function(response) {
                    console.error(response.status, response.statusText);
                }
            });
            return Backbone.Model.prototype.fetch.apply(this, arguments);
        },
        parse: function(markdown) {
            return {
                markdown: markdown
            };
        }
    });
    R.Component.create('Post', {
        initialize: function() {
            R.Components.Post.callSuper(this, 'initialize');
            this._postSlug = this.options.postId || this.options.urlMatches[0];
        },
        modelFactory: function() {
            var model = new PostModel({
                id: this._postSlug + '.md'
            });
            this.listen(model, 'change:author', this.onCommitChanged);
            return model;
        },
        onRendered: function() {
            var title = $(this.$('h1')[0]);
            var $link = $('<a />').attr('href', '/post/' + this._postSlug + '/');
            title.wrap($link);
        },
        onCommitChanged: function() {
            var commitISO = this.model.get('commit').author.date;
            var byline = bylineTemplate({
                post: this.model.id,
                url: this.model.get('author').html_url,
                name: this.model.get('commit').author.name,
                date: R.Date.formatLongDate(commitISO)
            });
            this.$('h5.byline').html(byline);
        }
    });
}).call(this);
