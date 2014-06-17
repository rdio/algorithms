Playing with ECMAScript 6
=========================

The next version of JavaScript, officially called [ECMAScript 6](http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts) and often referred to as ES6, is upon us. Browsers are starting to implement a few features, and it is expected that we will have widespread support sometime in 2015. ES6 represents the biggest change to the language since ES3 was released in 1999.

## What's new

The addition of classes is arguably the largest addition to the language. JavaScript currently uses [prototypal inheritence](https://en.wikipedia.org/wiki/Prototype-based_programming) for managing objects, which works well enough. Unfortunately, people who come from more classical OOP languages like C++ and Java have a hard time adapting to and using prototypes. The new class syntax is just syntactic sugar over prototypes, but it should make JavaScript much more welcoming to developers coming from other languages.

```javascript
class foo extends bar {
  constructor() {
    this._prop = 'my prop';
  }
  print(message) {
    console.log(message);
  }
  get prop() {
    return this._prop;
  }
  set prop(value) {
    this._prop = value;
  }
}
```

The other major addition to the language is a native module system so that we no longer have to rely on third party module libraries, such as [CommonJS](http://www.commonjs.org/) or [RequireJS](http://www.requirejs.org/). There is a high-level syntax (called the Module spec) and a low-level API for working with the module system (called the Module Loader spec). The module syntax looks a lot like the `import` syntax in Python.

```javascript
import { foo, bar } from 'bar';

export function myfunc(val) {
  return foo.stuff(val);
}
```

The module loader API allows developers to modify how the module system works, including overriding how module names are resolved, how they are fetched, etc:

```javascript
import Loader from 'Reflect';
let loader = new Loader({
  normalize: function(name, referrerName, referrerAddress) {
    // Normalize the name
  },
  locate: function(loadRequest) {
    // Determine the absolute URL
  },
  fetch: function (loadRequest) {
    // Fetch the module
  }
});

// Use loader to load things
loader.load('foo').then(function(foo) {
  // Do stuff with foo
})
```

There is a default loader that is exposed as part of the `System` object and is the loader used for handling ```import```/```export``` statements. Unfortunately, the module and module loader spec are undergoing some churn right now. I attempted to make this code as current as possible, but it will most likely be obsolete soon, and indeed may be wrong already.

Another cool feature coming in ES6 is destructuring assignment, which allows for assigning parts of an object or array to multiple variables, similar to Python's tuples.

```javascript
var [x, y] = [10, 20]; // Set x to 10 and y to 20
var { foo: a, bar: b } = { foo: 10, bar: 20 }; // Set a to 10 and b to 20
```

We are finally getting actual constants and block-scope variables in JavaScript in ES6 (yay). The `let` and `const` keywords specifies block-scope, with `var` still specifying function scope.

```javascript
if (true) {
  let x = 10;
}
console.log(x); // Throws an error

const x = 10;
x = 20; // Does nothing or throws an error, depending on strict mode
```

## How we could use ES6 at Rdio

Here at Rdio, we currently use our own component framework based on Backbone. Our framework allows us to specify dependencies, inheritence, constructors, etc. Re-writing it using the ECMAScript 6 features discussed above, we can define a component as follows:

```javascript
import GridItem from 'R.Components.GridItem';

/**
 * class R.Components.GridItem.Album < R.Components.GridItem
 *
 * Album grid item
 **/
export class Album extends GridItem {
  constructor() {
    super();
    this._icon = this.model.get('icon')
  }
  getIcon() {
    return this._icon;
  }
}
```

Once we have the code, what do we do with it?

## ES6 Transcompiler

For hack day, I created a tool that takes these classes defined in ES6 and transcompiles it to our current style of declaring classes. For example, the above class gets compiled to the following code:

```javascript
(function() {
  /**
   * class R.Components.GridItem.Album < R.Components.GridItem
   *
   * Album grid item
   **/
  R.Component.create("GridItem.Album", {
    dependencies: ["GridItem", "Album.DragProxy"],
    superClass: "GridItem",

    initialize: function() {
      R.Components.GridItem.prototype.initialize.call(this);
      this.dragProxy = 'Album.DragProxy';
    },

    isAvailable: function() {
      return this.model.get('canSample');
    }
  });
})();
```

Of note, this code is identical to how this code looks today written directly in ECMAScript 5.

Most (proper) code analysis and modification tools are based on [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) (AST) parsing. An AST parser takes in source code in the form of a string and parses it into a tree structure. Each node in the tree represents a semantically complete piece of code, with the leaves representing a single "thing" (an operator, a value, a variable, etc). As an example, the code ```x = 1 + 2``` can be represented as:

```
x   =   1 + 2
|   |     |
x   =   1 + 2
        | | |
        1 + 2
```

Code rewriting is reduced to (relatively) simple tree transformations, which is much easier and more reliable than, say, regex parsing. Rewriting code is as simple as deleting the old node and replacing it with a new node. Once all of the replacement have been made, the modified AST is serialized back to a string.

I am using [recast](https://github.com/benjamn/recast) to do the AST parsing and rewriting. Recast is a tool that provides ES6-aware [Mozilla Parser](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API) compliant AST parsing and provides a set of helper methods that makes it easy to rewrite ASTs.

To use recast, you supply a series of callback functions for the type of nodes you want to modify. Other nodes are left as is. Each callback takes a node, and the node is replaced with whatever the method returns. As an example, here is the code that parses dependencies from the import statements, and deletes the import statements:

```javascript
var dependencies = [];
...
visitImportDeclaration: function(node) {
  var source = node.source.value;
  for (var i = 0, len = node.specifiers.length; i < len; i++) {
    var specifier = node.specifiers[i];
    specifier = specifier.name ? specifier.name.name : specifier.id.name;
    if (/R\.Components/.test(source)) {
      dependencies[specifier] = source.replace('R.Components.', '');
    } else {
      otherImports[specifier] = source + '.' + node.specifiers[i].id.name;
    }
  }
  return builders.emptyStatement(node.loc);
}
...
```

Using this tool, we can write our code in ES6 and have it compiled to ES5 for use in current browsers. The workflow for developers is the same as writing code in CoffeeScript, with the key difference being that this transcompiler has a built-in shelf-life.

The current implementation works as advertized, but is pretty alpha quality. Right now, it will crash (at best) when it encounters something unexpected. Writing a transcompiler that accepts only well-written code is pretty simple, but beefing up error-handling and such to handle not-so-well written code is considerably more complex. Lots of checks are needed to make sure code is in the format expected. Trying to handle malformed code and figure out the intention is even more difficult, and the prototype currently does neither. For the next hack day, I intend to polish up the transcompiler so we can consider using it on production code.

## Conclusions

This is just a small look at the exciting future that is ECMAScript 6 and one way that you can use it today. There are a lot more cool features coming, including [rest parameters](http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html), [generators](http://wiki.ecmascript.org/doku.php?id=harmony:rest_parameters), [default parameters](http://wiki.ecmascript.org/doku.php?id=harmony:parameter_default_values) and more!

There are also other ways to start playing with ES6, including the [Traceur Compiler](https://github.com/google/traceur-compiler) from Google and [es6-module-transpiler](http://square.github.io/es6-module-transpiler/).

What do you think? Are you using ES6 in your code? What have your experiences been like?
