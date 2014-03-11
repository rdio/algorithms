(function() {
    var commitsPath = "rdio/algorithms/commits";
    var githubUrl = _.template("https://api.github.com/repos/{{ commitsPath }}", {
        commitsPath: commitsPath
    });
    var githubToken = "05ecdbfddb50419a2afb9026dd4229df8f8c495a";
    var bylineTemplate = _.template('<a href="https://github.com/{{ commitsPath }}/master/posts/{{ post }}">Last modified</a> by <a href="{{ url }}">{@ name @}</a> on {{ date }}');

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
        options: {
            showComments: true
        },
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
            if (this.options.showComments) {
              this._renderDisqusComments();
            }
        },
        onCommitChanged: function() {
            var commitISO = this.model.get('commit').author.date;
            var byline = bylineTemplate({
                commitsPath: commitsPath,
                post: this.model.id,
                url: this.model.get('author').html_url,
                name: this.model.get('commit').author.name,
                date: R.Date.formatLongDate(commitISO)
            });
            this.$('h5.byline').html(byline);
        },
        _renderDisqusComments: function() {
            // This code provided by disqus http://rdioalgorithmsandblues.disqus.com/admin/settings/universalcode/
            var disqus_shortname = 'rdioalgorithmsandblues';
            var dsq = document.createElement('script');
            dsq.type = 'text/javascript';
            dsq.async = true;
            dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
        }
    });
}).call(this);
