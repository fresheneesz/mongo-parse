`mongo-parse`
============

A parser for mongo db queries. You can use this to analyze, modify, and match against MongoDb queries.

Install
=======

```
npm install mongo-parse
```

Usage
=====

```javascript
var parse = require('mongo-parse')
```

`var queryObject = parse(mongoQuery)` - Returns an object that contains a list of query parts, and methods for interacting with the query.

`queryObject.parts` - A list of QueryPart objects.

`queryObject.mapValues(function(field, value) {...})` - Returns a new mongo query object with values mapped based on the passed in callback. The callback will be called for each leaf-node in the query. For example, in the query `{x:1, $and:[{y:2,z:3}]}`, the callback will be called 3 times. Query parts that don't relate to a field may not trigger the callback. The callback's parameters:

* `field` - The field the query part is for. E.g. for `{x:1}`, the field will be `"x"`.
* `value` - the value that query part is querying with. E.g. for `{x:1`, the value will be `1`.

QueryPart
--------------

A QueryPart contains the following properties:

* `field` - The field a query part relates to. Can be `undefined` if the queryPart doesn't related to a specific field.
* `operator` - The operator of a query part. Will be `undefined` for the basic equality query.
* `operand` - The operand for a query part. This is the whole value or object contained for the given operation. For example, for `{x: 2}` the operand is `2`, for `{x: {$lt:3}}` the operand is `{$lt:3}`, and for {$and:[{x:1},{y:2}]}, the operand is `[{x:1},{y:2}]`.
 * `parts` - A list of QueryPart for parts contained within the given query part. For example, for `{a:{$not:{$lt: 4}}}` the parts contains the $lt operator, for `{$and:[{x:1},{y:2}]}` there are two elements in `parts`: one for `{x:1}` and one for `{y:2}`.

Todo
====

* Query matching
  * `queryObject.matches(document)` - Returns true if the query matches the document, false otherwise.

Changelog
========

* 0.0.1 - first version

How to Contribute!
============

Anything helps:

* Creating issues (aka tickets/bugs/etc). Please feel free to use issues to report bugs, request features, and discuss changes
* Updating the documentation: ie this readme file. Be bold! Help create amazing documentation!
* Submitting pull requests.

How to submit pull requests:

1. Please create an issue and get my input before spending too much time creating a feature. Work with me to ensure your feature or addition is optimal and fits with the purpose of the project.
2. Fork the repository
3. clone your forked repo onto your machine and run `npm install` at its root
4. If you're gonna work on multiple separate things, its best to create a separate branch for each of them
5. edit!
6. If it's a code change, please add to the unit tests (at test/grapetreeTest.js) to verify that your change
7. When you're done, run the unit tests and ensure they all pass
8. Commit and push your changes
9. Submit a pull request: https://help.github.com/articles/creating-a-pull-request

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT
