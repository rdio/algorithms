The Ultimate Frontend Build Tool: `make`
========================================

In recent months there have been a proliferation of frontend tools that aid in transforming the raw, well organized source that developers prefer to work with into the highly optimized packages of code and assets that actually get delivered to users' browsers. Of these tools, there are a few that have risen above the rest.

- [Grunt](http://gruntjs.com)
- [Gulp](http://gulpjs.com)
- [Broccoli](https://github.com/joliss/broccoli)

At Rdio, we've used one-off, hand-spun scripts to build our frontend for years. I decided we needed to fix this recently and dove into finding some build tool that could make our builds consistent and fast. I wanted something blessed by the frontend community as there is a bit of code we're looking to open source in the coming months, but after several failed attempts I became convinced that all the frontend specific build tools are less mature and less flexible than tools that have existed for decades. I reached for trusty old [`make`](https://www.gnu.org/software/make/), and now I don't know why I started with anything else.

There are a number of problems that `make` solves, and a number of restrictions it puts in place that are A Good Thing.

`make` is Unixy
---------------

Assumption time: the Unix philosophy is a good one. The Unix philosophy (as interpreted and simplified by me) can be broken down into a two rules.

- Things should be composable
- Programs should accomplish a single task and no more

There's quite a bit more discussion over what the Unix philosophy is over on [Wikipedia](http://en.wikipedia.org/wiki/Unix_philosophy).

These two things, when combined, allow developers to string together small, focused bits of code to apply complex transformations to data. In the case of a frontend build, your "data" is assets, namely JavaScript, CSS, images, HTML, and other frontend assets that will be served by a static server once they are deployed. Many frontends apply the same transformations as we do at Rdio: compile JS and/or CSS, combine code, minify code, and inline images as datauris. These are all simple transformations that can be combined together to create a functioning frontend build. `make` is beautifully designed to fit in this Unix ecosystem by making it trivial to deduce a dependency tree and then execute some commands. If you've built your asset pipeline in such a way that there's a command for each step, you can trivially compose them together in order to create a functioning frontend build.

Running Tasks
-------------

A lot of the time, you just need to run some commands. Everybody working on a project may need to run the same commands, so you want to record the proper sequence somewhere. This is the only thing that Grunt does decently well, as that's what it's designed for. It's designed to take some commands, find some code that can execute those commands, and run that code. `make` just runs commands directly, removing the need to write custom plugin code.

### Example

Let's say you want a task to run JSHint on your code. This is a task and not a build step because it doesn't produce any build artifacts. Instead, its useful output is a return code and an explanation of that return code. It analyzes your code and tells you whether it passes its checks, but it doesn't transform the code in any way.

```javascript
grunt.initConfig({
  jshint: {
    options: {
      curly: true,
      eqeqeq: true,
      eqnull: true,
      browser: true,
      globals: {
        jQuery: true
      }
    },
    all: ['**/*.js']
  },
});
```

In make, that would look something like this:

```makefile
JSHINT=jshint # You can also make this a relative path if you don't want to install jshint globally
JSHINTFLAGS=

js_files=$(shell find . -name '*.js')
jshint: $(js_files)
	$(JSHINT) $(JSHINTFLAGS) $?

# .PHONY just tells make that these rules don't produce files. So if there is a
# file called "jshint", it won't interpret that file as the output of the
# jshint recipe.
.PHONY: jshint
```

The configuration options are kept totally separate. In this case they could be in a .jshintrc in the current directory, specified in a package.json file, or put in an entirely different file with `--config <path to config>` added to the `JSHINTFLAGS` variable.

There are some things that I think are interesting about this as compared to the Grunt example.

- All it does is declare a dependency relationship. The target "jshint" depends on all js files, so any time any js file has changed since the developer last ran jshint, the recipe steps must be executed on those changed files.
- Everything can be overridden except for the dependency relationship. If you want to change the config, you could run something like `JSHINTFLAGS="--config my-custom-config.json" make jshint` and it would use your config. If you had a super fancy version of JSHint, you could use it by running something like `JSHINT=my-fancy-jshint make jshint` and it would use your super fancy jshint.
- No code was written to support JSHint in `make`.
- It's 100% declarative. More on this later.

Building Artifacts
------------------

Where `make` really shines is going past simply running tasks and actually using it to define your build. `make` takes its knowledge of the build dependency graph you declare in your Makefile to optimize the build. First, it does incremental builds. This means that only the artifacts that depend on the files that were actually changed will be built. This tends to make for much quicker builds, although if you change a file that many files depend on things will still be slow. Fresh builds can also be slow if you have a lot of files (which, at Rdio, we definitely do!). Luckily, since `make` is entirely declarative, it's trivial to parallelize the build.

For example, if you've declared your app CSS to depend on the compiled versions of your .less files, then make knows that it needs to compile all the less files to css files. If you have a recipe for compiling less to css, then it can spawn that recipe as many times as necessary to create all your css files. It won't execute the recipe that depends on all the css until all the css has been generated.

### Example

```makefile
UGLIFYJS=./node_modules/uglify-js/bin/uglifyjs
UGLIFYJSFLAGS=

LESSC=./node_modules/less/bin/lessc
LESSFLAGS=

%.min.js: %.js
	$(UGLIFYJS) $(UGLIFYJSFLAGS) $? > $@

core_js_files=$(shell find blog -name *.js)
min_core_js_files=$(core_js_files:%.js=%.min.js)
core.js: $(min_core_js_files)
	cat $^ > $@

%.css: %.less
	$(LESSC) $(LESSCFLAGS) $? > $@

core.css:
	cat $^ > $@

prod: core.js core.css
```

First of all, this is overly simplified. Just minifying everything in a folder and concatenating it all together only works if nothing depends on anything else or has some other way of resolving its dependencies. But you can imagine using something like require.js to figure out your dependencies, or you can list them all explicitly in the Makefile. You probably also want to build into a separate build directory.

The important part of this, however, is that it demonstrates how to declare multiple paths of dependencies, which `make` can resolve into doing the minimum necessary in order to build the target. The wildcard targets above (`%.min.js` and `%.css`) tell make that any .min.js file and any .css file can be built the same way. For instance, if you change syntax.less and run `make prod`, syntax.css will be built, as will core.css, but nothing will happen to the core.js file. If multiple files have changed, then `make` can distribute that work across multiple processes.

What happens when you need a little logic?
------------------------------------------

The limiting part of using `make` to run your frontend build is that since the web as a platform is relatively immature, most builds involve at least a little logic at some point. An example that comes up a lot is muxing between whether to load the built versions of files or the unbuilt, development version of files. To keep it simple, let's assume that you have listed all your script files in the head of your html page. For dev, you load one set of files, but for prod you load the minified and concatanated versions of files. You need a little logic that knows what those files are and where to put them in the html.

For these situations, I've taken to writing small programs that do that single task that needs to be done. In the example above, this would just involve writing a little program in the language of your choice that, perhaps, takes the development version of the html file, parses out the script tags, and replaces them with the production versions. The beauty of this approach is that that program is entirely self contained. It's very simple, its purpose is clear, and it's such a black box that even the language its written in doesn't matter. It just needs to do the one task that's been asked of it so that it can be composed into something more useful.

A little more fancy with Watchman
---------------------------------

One thing that's nice about most web dev tools these days is that they usually include an option to watch the files they are responsible for transforming and doing that transformation automatically when they change. There are, however, some problems with this approach.

- If you have many transformations, you need to make sure they all start and stay started while you're developing.
- All these watchers work slightly differently.
- This functionality doesn't really belong in the tool. A tool should do one thing and do it well; watching files is not a core functionality for most of these tools.
- Many watchers are broken on Mac OS X and can't handle more than a few thousand files. This is the biggest problem.

Enter [Watchman][1]. Watchman is an open source project from Facebook that solves this one problem and that's it. You define what files you're interested in watching and what you want to do when they change, and it will watch them for changes. It's fast and it works even in very large codebases on Mac OS X.

At Rdio, we just call `make` when files change and the fast incremental build means that by the time the developer gets to their browser, the files are all already compiled and ready to go. We even have a target in our Makefile for making watching easy.

```makefile
watch:
	watchman watch $(shell pwd)
	watchman -- trigger $(shell pwd) remake *.js *.css -- make
```

You can see an example of a small, frontend centric [Makefile][2] as part of this blog. The one we actually use to build the Rdio frontend is quite a bit more complicated than that, with versioning and a build directory and all sorts of fun things, but at the core it's the same thing. It's all just a collection of tools that we can configure and compose in a consistent way, and all we can do in the Makefile is list our dependencies. Simple.

[1]: https://github.com/facebook/watchman
[2]: https://github.com/rdio/algorithms/blob/master/Makefile
