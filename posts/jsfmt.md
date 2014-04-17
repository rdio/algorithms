Introducing `jsfmt`
===

Static Analysis
---

At Rdio, we've built some simple JavaScript static analysis tools to catch bugs and improve performance in the web app. Static analysis involves inspecting source code to determine useful things about it without actually firing up the app and executing that app's JavaScript. From [Wikipedia](http://en.wikipedia.org/wiki/Abstract_syntax_tree):

> "Static program analysis is the analysis of computer software that is performed without actually executing programs (analysis performed on executing programs is known as dynamic analysis).[1] In most cases the analysis is performed on some version of the source code, and in the other cases, some form of the object code. The term is usually applied to the analysis performed by an automated tool, with human analysis being called program understanding, program comprehension or code review."

Analyze What?
---

The Rdio app uses a component architecture where a component is a collection of HTML, CSS and JavaScript that form a complete set of functionality. Buttons, forms, and views are all components as well as the overall Rdio app itself which in turn depends on a number of other components. We explicitly declare these dependencies in each component declaration so we know which subsequent components to load at runtime:

```
R.Components.create('MyComponent', {
  dependencies: ['MyOtherComponent']
});
```

This is where the static analysis comes in. Keeping track of these dependencies can be useful so we use static analysis to look for the dependencies declaration in each component declaration. We can do a number of useful things with this information:

- We "lint" our components by looking for unused dependencies that were declared since it increases the total download size of a given component.
- Detect the usage of dependencies we forgot to declare since it could cause the component to break (if another loaded component doesn't include the missing dependency).
- Bundle component dependencies at build and run-time since, if they're going to be requested eventually anyway, why not save the extra network requests.
- Graph dependency trees for visual inspection.

First Attempts
---

When I first implemented our dependencies analysis I had little success with string searches as even with complex regular expressions, finding the dependencies declaration in a large JavaScript file is fragile. This becomes even more problematic when considering that documentation comments can contain the exact string but not be in an executable path. Instead we looked at [Esprima](http://esprima.org/):

> "Esprima is a high performance, standard-compliant ECMAScript parser written in ECMAScript (also popularly known as JavaScript)."

We used Esprima to parse our JavaScript source files into an AST or Abstract Syntax Tree: "a tree representation of the abstract syntactic structure of source code written in a programming language." [Wikipedia](http://en.wikipedia.org/wiki/Abstract_syntax_tree)

Unfortunately, the subsequent "analysis" consisted of a few hundred lines of ugly, fragile, hand-written traversal of that AST — checking node types and verifying parent nodes all the way down until we found the dependencies declaration we were looking for. To be fair, it was originally written during a hackday and it didn't get much attention since it _mostly_ worked. However the code was severely limited in what it could do beyond just finding component dependencies.

The Solution
---

I've spent the last year thinking about the problem and a more elegant solution eventually taking inspiration from [`gofmt`](http://golang.org/cmd/gofmt/). `gofmt` is a commandline tool bundled with the Go language that provides standardized formatting for the language and source rewriting using the code's AST. Given two valid Go expressions, such as `"[match] -> [replace]"`, it will replace one with the other. Taking this idea to JavaScript, I wanted to provide a valid JavaScript expression (as a string) and use _what it represents_ to find the matching expression.

The first thing we want to do is take a plain JavaScript string that represents what we want to search for and parse it into an AST. For example, if we want to find the function call  `"_.reduce()"` then we parse that string into an AST that looks something like this:

```
{
    "type": "ExpressionStatement",
    "expression": {
        "type": "CallExpression",
        "callee": {
            "type": "MemberExpression",
            "computed": false,
            "object": {
                "type": "Identifier",
                "name": "_"
            },
            "property": {
                "type": "Identifier",
                "name": "reduce"
            }
        },
        "arguments": []
    }
}
```

Then we parse the source file that we want to search into its own AST.

Next we perform a recursive walk on the source AST looking for our query's root node (i.e. the `ExpressionStatement`). If we find it, we move down the query's tree looking for the next matching node.

If one of the nodes we're searching for is a single-letter identifier (`[a-z]`) then we treat it as a wildcard and successfully match anything at that place.

I've iterated a lot on how to best handle a list in the AST, such as the `arguments: []` above. Currently, in the query AST we require matching all items in such a list, _in order_, but only inclusively match items in the source AST. What this means in practice is that if we don't provide any arguments like `_.reduce()` in the query, it will match any call no matter how many arguments are provided `_.reduce(one, two, three)`. But, if the query is `_.reduce(a)` then our source will only match calls that have _at least_ one argument. Any time a list of expressions is encountered such as arguments, object property declarations or array elements are guaranteed to match _at least_ the parts we specify. This is useful because we may not know how many arguments are permissible for a given function call. The result is intuitive JavaScript-aware matching.

As an example, if we wanted to find all occurrences of Underscore's reduce function with 3 arguments:

  `jsfmt --search "_.reduce(a, b, c)" <source>`

The wildcards `a`, `b` and `c` will match any expression at that location. Furthermore, we match any `_.reduce` call with 3 _or more_ arguments.

Taking this example a step further, what if we wanted to replace all occurrences of one function with another such as a library upgrade or dropping support for an older browser? For example, replacing all `_.reduce` calls with the native JavaScript `Array.prototype.reduce`. We use the same syntax as before but also specifying the replacement after an arrow (`[match] -> [replacement]`):

  `jsfmt --replace "_.reduce(a, b, c) -> a.reduce(b, c)" <source>`

We can use the same wildcards in the "match" as placeholders in our "replacement".

Back to the original problem of finding component dependencies. Before `jsfmt` even our simple static analysis was unwieldy. Now searching for component dependencies is simple and intuitive:

`jsfmt --search "R.Component.create(a, { dependencies: z })" <source>`

There's also a JavaScript API exposed:

```
jsfmt.search(source, "R.Component.create(a, { dependencies: z })").forEach(function(matches, wildcards) {
  console.log(wildcards.z);
});
```

We just pass in a valid JavaScript expression and `jsfmt` does the rest.

https://github.com/rdio/jsfmt

Addendum: While `jsfmt` is a useful tool, as I've worked on this project I believe what's next is a kind of pluggable, language-agnostic `ack`. A syntax-aware search/replace/diff tool with a consistent interface and support for any language would feel like the future: `ast --js --search "_.reduce()"`