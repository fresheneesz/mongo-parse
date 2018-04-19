"use strict";

var Unit = require('deadunit')

var parser = require("../mongoParse")


var parse = parser.parse
var DotNotationPointers = parser.DotNotationPointers

Unit.test("mongo-parse", function(t) {



    //*
    this.test('query parts', function(t) {
        this.test('simple equality', function() {
            var parsedQuery = parse({a: 'av'})
            this.eq(parsedQuery.parts.length, 1)

            var part0 = parsedQuery.parts[0]
            this.eq(part0.field , 'a')
            this.eq(part0.operator , '$eq')
            this.eq(part0.operand , 'av')
            this.eq(part0.implicitField, undefined)
            this.eq(part0.parts.length, 0)
        })

        this.test('simple operator query', function() {
            var parsedQuery = parse({b: {$gt: 3}})
            this.eq(parsedQuery.parts.length, 1)

            var part0 = parsedQuery.parts[0]
            this.eq(part0.field , 'b')
            this.eq(part0.operator , '$gt')
            this.eq(part0.operand , 3)
            this.eq(part0.parts.length, 0)
        })

        this.test("basic and", function() {
            var parsedQuery = parse({c: 'cv', d: 'dv'})
            this.eq(parsedQuery.parts.length, 2)

            var part = parsedQuery.parts[0]
            this.eq(part.field, 'c')
            this.eq(part.operator, '$eq')
            this.eq(part.operand, 'cv')
            this.eq(part.parts.length, 0)

            part = parsedQuery.parts[1]
            this.eq(part.field, 'd')
            this.eq(part.operator, '$eq')
            this.eq(part.operand, 'dv')
            this.eq(part.parts.length, 0)
        })

        this.test("combination of operators", function() {
            var parsedQuery = parse({e: {$gt: 3, $lt: 4}})
            this.eq(parsedQuery.parts.length, 2)

            var part = parsedQuery.parts[0]
            this.eq(part.field, 'e')
            this.eq(part.operator, '$gt')
            this.eq(part.operand, 3)
            this.eq(part.parts.length, 0)

            part = parsedQuery.parts[1]
            this.eq(part.field, 'e')
            this.eq(part.operator, '$lt')
            this.eq(part.operand, 4)
            this.eq(part.parts.length, 0)
        })


        this.test("$not", function() {
            var parsedQuery = parse({x: {$not:{$gt: 3}}, y: {$not: 7}})
            this.eq(parsedQuery.parts.length, 2)

            var part = parsedQuery.parts[0]
            this.eq(part.field, 'x')
            this.eq(part.operator, '$not')
            this.ok(deepEqual(part.operand, {$gt: 3}), part.operand)
            this.eq(part.parts.length, 1)

                var subPart = part.parts[0]
                this.eq(subPart.field, 'x')
                this.eq(subPart.operator, '$gt')
                this.eq(subPart.operand, 3)
                this.eq(subPart.parts.length, 0)

            part = parsedQuery.parts[1]
            this.eq(part.field, 'y')
            this.eq(part.operator, '$not')
            this.ok(part.operand, 7)
            this.eq(part.parts.length, 0)
        })

        this.test("$text", function() {
            var parsedQuery = parse({$text: {$search: "whatever"}})
            this.eq(parsedQuery.parts.length, 1)

            var part = parsedQuery.parts[0]
            this.eq(part.field, undefined)
            this.eq(part.operator, '$text')
            this.ok(deepEqual(part.operand, {$search: "whatever"}), part.operand)
            this.eq(part.parts.length, 0)
        })

        this.test("bare function and string - equivalent of the $where operator", function(t) {

            var where1 = function() {return this.whatever === 'whatever'}
            var where1String = "this.whatever === 'whatever'"
            var where2 = function() {return obj.whatever === 'whatever'}
            var where2String = "obj.whatever === 'whatever'"

            ;[where1, where1String, where2, where2String].forEach(function(whereValue) {
                var parsedQuery = parse(whereValue)
                t.eq(parsedQuery.parts.length, 1)

                var part = parsedQuery.parts[0]
                t.eq(part.field, undefined)
                t.eq(part.operator, '$where')
                t.ok(part.operand instanceof Function, part.operand)
                t.ok(part.operand.call({whatever:"whatever"}))
                t.eq(part.parts.length, 0)
            })
        })

        this.test("complex field-indepedant operators", function() {
            var parsedQuery = parse({$or: [{a: 3}, {b:'four', c:5}]})
            this.eq(parsedQuery.parts.length, 1)

            var part = parsedQuery.parts[0]
            this.eq(part.field, undefined)
            this.eq(part.operator, '$or')
            this.ok(deepEqual(part.operand, [{a: 3}, {b:'four', c:5}]), part.operand)
            this.eq(part.parts.length, 2)

                var subPart = part.parts[0]
                this.eq(subPart.field, undefined)
                this.eq(subPart.operator, '$and')
                this.ok(deepEqual(subPart.operand,[{a: 3}]), subPart.operand)
                this.eq(subPart.parts.length, 1)

                    var subSubPart = subPart.parts[0]
                    this.eq(subSubPart.field, 'a')
                    this.eq(subSubPart.operator, '$eq')
                    this.eq(subSubPart.operand, 3)
                    this.eq(subSubPart.parts.length, 0)

                subPart = part.parts[1]
                this.eq(subPart.field, undefined)
                this.eq(subPart.operator, '$and')
                this.ok(deepEqual(subPart.operand,[{b:'four', c:5}]), subPart.operand)
                this.eq(subPart.parts.length, 2)

                    subSubPart = subPart.parts[0]
                    this.eq(subSubPart.field, 'b')
                    this.eq(subSubPart.operator, '$eq')
                    this.eq(subSubPart.operand, 'four')
                    this.eq(subSubPart.parts.length, 0)

                    subSubPart = subPart.parts[1]
                    this.eq(subSubPart.field, 'c')
                    this.eq(subSubPart.operator, '$eq')
                    this.eq(subSubPart.operand, 5)
                    this.eq(subSubPart.parts.length, 0)
        })

        this.test('$elemMatch', function() {
            var parsedQuery = parse({a: {$elemMatch:{$lt:5, $gt:9}}, b:{$elemMatch:{x:1, y:2}}})
            this.eq(parsedQuery.parts.length, 2)

            var part = parsedQuery.parts[0]
            this.eq(part.field, 'a')
            this.eq(part.operator, '$elemMatch')
            this.ok(deepEqual(part.operand, {$lt:5, $gt:9}), part.operand)
            this.eq(part.implicitField, true)
            this.eq(part.parts.length, 2)

                var subPart = part.parts[0]
                this.eq(subPart.field, undefined)
                this.eq(subPart.operator, '$lt')
                this.eq(subPart.operand, 5)
                this.eq(subPart.parts.length, 0)

                subPart = part.parts[1]
                this.eq(subPart.field, undefined)
                this.eq(subPart.operator, '$gt')
                this.eq(subPart.operand, 9)
                this.eq(subPart.parts.length, 0)

            part = parsedQuery.parts[1]
            this.eq(part.field, 'b')
            this.eq(part.operator, '$elemMatch')
            this.ok(deepEqual(part.operand, {x:1, y:2}), part.operand)
            this.eq(part.implicitField, false)
            this.eq(part.parts.length, 2)

                subPart = part.parts[0]
                this.eq(subPart.field, 'x')
                this.eq(subPart.operator, '$eq')
                this.eq(subPart.operand, 1)
                this.eq(subPart.parts.length, 0)

                subPart = part.parts[1]
                this.eq(subPart.field, 'y')
                this.eq(subPart.operator, '$eq')
                this.eq(subPart.operand, 2)
                this.eq(subPart.parts.length, 0)
        })

        this.test("basic and + multiple operators", function() {
            var parsedQuery = parse({a:'moose', d: {$lt:3, $gt:4}})
            this.eq(parsedQuery.parts.length, 3)

            var part = parsedQuery.parts[0]
            this.eq(part.field, 'a')
            this.eq(part.operator, '$eq')
            this.eq(part.operand, 'moose')
            this.eq(part.parts.length, 0)

            part = parsedQuery.parts[1]
            this.eq(part.field, 'd')
            this.eq(part.operator, '$lt')
            this.eq(part.operand, 3)
            this.eq(part.parts.length, 0)

            part = parsedQuery.parts[2]
            this.eq(part.field, 'd')
            this.eq(part.operator, '$gt')
            this.eq(part.operand, 4)
            this.eq(part.parts.length, 0)
        })

        this.test('$comment', function() {
            var parsedQuery = parse({$comment: 'whatever'})
            this.eq(parsedQuery.parts.length, 1)

            var part0 = parsedQuery.parts[0]
            this.eq(part0.field , undefined)
            this.eq(part0.operator , '$comment')
            this.eq(part0.operand , 'whatever')
            this.eq(part0.parts.length, 0)
        })
    })

    this.test("DotNotationPointers", function() {
        var object = {a:1, b:{c:2, d:{e:3}}}

        this.test("root property", function() {
            var pointerz = DotNotationPointers(object)
            this.eq(pointerz.length, 1)

            var one = pointerz[0]
            this.eq(one.val.a, 1)
            this.eq(one.propertyInfo.obj, object)
            this.eq(one.propertyInfo.last, undefined)
        })

        this.test("shallow property", function() {
            var pointerz = DotNotationPointers(object, 'a')
            this.eq(pointerz.length, 1)

            var one = pointerz[0]
            this.eq(one.val, 1)
            this.eq(one.propertyInfo.obj, object)
            this.eq(one.propertyInfo.last, 'a')

            var pointerz2 = DotNotationPointers(object, 'b')
            this.eq(pointerz2.length, 1)

            var two = pointerz2[0]
            this.eq(two.propertyInfo.obj, object)
            this.eq(two.propertyInfo.last, 'b')
            this.eq(two.val.c, 2)
        })

        this.test("deep property", function() {
            var pointerz = DotNotationPointers(object, 'b.c')
            this.eq(pointerz.length, 1)

            var one = pointerz[0]
            this.eq(one.val, 2)
            this.eq(one.propertyInfo.obj, object.b)
            this.eq(one.propertyInfo.last, 'c')
        })

        this.test('simple array index access', function() {
            var theObject = {a:[{b:1}, {b:2}, {b:3}]}
            var pointerz = DotNotationPointers(theObject, 'a.1.b')
            this.eq(pointerz.length, 1)

            this.eq(pointerz[0].val, 2)
        })

        this.test('simple property tree', function() {
            var theObject = {a:[{b:1}, {b:2}, {b:3}]}
            var pointerz = DotNotationPointers(theObject, 'a.b')
            this.eq(pointerz.length, 3)

            this.eq(pointerz[0].val, 1)
            this.eq(pointerz[1].val, 2)
            this.eq(pointerz[2].val, 3)
        })

        this.test('deeper property tree', function() {
            var theObject = {a:[{b:[{c:1}, {c:2}]}, {b:[{c:3}]}, {b:{c:4}}]}
            var pointerz = DotNotationPointers(theObject, 'a.b.c')
            this.eq(pointerz.length, 4)

            this.eq(pointerz[0].val, 1)
            this.eq(pointerz[1].val, 2)
            this.eq(pointerz[2].val, 3)
            this.eq(pointerz[3].val, 4)
        })

        this.test('creating properties', function() {
          var theObject = {};
          var pointerz = DotNotationPointers(theObject, "a.b");
          this.eq(pointerz.length, 1);

          pointerz[0].val = 1;
          this.eq(theObject.a.b, 1);
        });

        this.test('removing an existing property', function() {
          var theObject = {};
          var pointerz = DotNotationPointers(theObject, "a.b");
          this.eq(pointerz.length, 1);

          pointerz[0].val = 1;
          this.eq(theObject.a.b, 1);

          pointerz[0].val = undefined;
          this.eq(theObject.a.hasOwnProperty("b"), false);
        });

        this.test('removing a property that does not exist', function() {
          var theObject = {};
          var pointerz = DotNotationPointers(theObject, "a.b");
          this.eq(pointerz.length, 1);

          pointerz[0].val = 1;
          this.eq(theObject.a.b, 1);

          pointerz = DotNotationPointers(theObject, "a.c");
          pointerz[0].val = undefined;
          this.eq(theObject.a.hasOwnProperty("c"), false);
        });
    })

    this.test("compressQuery", function(t) {
        var test = function(a,b) {
            var result = parser.compressQuery(a)
            t.log(JSON.stringify(a))
            t.ok(deepEqual(result, b), result)
        }

        test({a:1}, {a:1})
        test({a:{$eq:1}}, {a:1})
        test({a:{$gt:3}, $and:[{a:{$lt:9}}]}, {a:{$gt:3,$lt:9}})
        test({a:{$gt:3}, $or:[{a:{$lt:1}}, {a:{$gt:9}}]}, {a:{$gt:3}, $or:[{a:{$lt:1}}, {a:{$gt:9}}]})
        test({$or:[{},{a:1}]}, {a:1})
        //test({a:null}, {a:null});
        test({a:{$eq:null}}, {a:null});

        var x = {"$and":[{"$or":[{"parent":"58a017558db10ff76667bba7"},{"ancestry":"58a017558db10ff76667bba7"}],"done":true,"complexity":{"$gt":0},"archived":{"$ne":true}},{"type":{"$ne":"Bug"}}]}
        var y = {"$or":[{"parent":"58a017558db10ff76667bba7"},{"ancestry":"58a017558db10ff76667bba7"}],"done":true,"complexity":{"$gt":0},"archived":{"$ne":true}, "type":{"$ne":"Bug"}}
        test(x, y)

    })

    this.test('mapValues', function(t) {
        //this.count(20*2 + 10)

        var parsedQuery = parse({
            $or: [
                {a: {$eq: null}},
                {b: {$gt: 3}},
                {$nor: [
                    {c:'four'},
                    {d:{$ne:5}},
                    {$and:[
                        {e:6}
                    ]},
                ]},
                {f: [1,2,3]},       // $eq array value
                {f2: {$ne:[1,2,3]}} // $ne array value
            ],
            g: 'testing',
            h: {$geoIntersects: {$geometry: {
              type: "<GeoJSON object type>" ,
              coordinates: []
            }}},
            i: {$not: 5},
            array: {$nin: [1,2], $all: [3,4], $in: [5,6]},
            noValue: {$mod: [3,0],$exists: false, $regex: /whatever/, $size: 3, $nearSphere: {}, $near: {}, $comment: "blah"},
            special: {$elemMatch: {x: 5, y: {$lt:9}}},
            special2: {$elemMatch: {$gt: 6}},
            $text: {$search: "stringy"}
        })

        var done = false
        var sequence = seq(function(field, value) {
            t.eq(field, 'a')
            t.eq(value, null)
        },function(field, value) {
            t.eq(field, 'b')
            t.eq(value, 3)
        },function(field, value) {
            t.eq(field, 'c')
            t.eq(value, 'four')
        },function(field, value) {
            t.eq(field, 'd')
            t.eq(value, 5)
        },function(field, value) {
            t.eq(field, 'e')
            t.eq(value, 6)
        },function(field, value) {
            t.eq(field, 'f')
            t.eq(value, 1)
        },function(field, value) {
            t.eq(field, 'f')
            t.eq(value, 2)
        },function(field, value) {
            t.eq(field, 'f')
            t.eq(value, 3)
        },function(field, value) {
            t.eq(field, 'f2')
            t.eq(value, 1)
        },function(field, value) {
            t.eq(field, 'f2')
            t.eq(value, 2)
        },function(field, value) {
            t.eq(field, 'f2')
            t.eq(value, 3)
        },function(field, value) {
            t.eq(field, 'g')
            t.eq(value, 'testing')
        },
//        function(field, value) {  // gonna ignore these for now
//            t.eq(field, 'h')
//            t.eq(value, "<GeoJSON object type>")
//        }
        function(field, value) {
            t.eq(field, 'i')
            t.eq(value, 5)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 1)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 2)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 3)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 4)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 5)
        },function(field, value) {
            t.eq(field, 'array')
            t.eq(value, 6)
        },function(field, value) {
            t.eq(field, 'special.x')
            t.eq(value, 5)
        },function(field, value) {
            t.eq(field, 'special.y')
            t.eq(value, 9)
        },function(field, value) {
            t.eq(field, 'special2')
            t.eq(value, 6)
        },function(field, value) {
            t.eq(field, undefined)
            t.eq(value, 'stringy')
            done = true
        })

        var newQuery = parsedQuery.mapValues(function(field, value) {
            sequence(field, value)
            return value+'_'
        })

        t.ok(done)
        t.eq(Object.keys(newQuery).length, 9)

        t.ok(deepEqual(newQuery.$or, [
            {a: 'null_'},
            {b: {$gt: '3_'}},
            {$nor: [
                {c:'four_'},
                {d:{$ne:'5_'}},
                {e:'6_'},
            ]},
            {f: ['1_','2_','3_']},
            {f2: {$ne:['1_','2_','3_']}},
        ]), newQuery.$or)
        t.eq(newQuery.g, 'testing_')
        t.ok(deepEqual(newQuery.h, {$geoIntersects: {$geometry: {
          type: "<GeoJSON object type>" ,
          coordinates: []
        }}}), newQuery.h)
        t.ok(deepEqual(newQuery.i, {$not: '5_'}), newQuery.i)
        t.ok(deepEqual(newQuery.array, {$nin: ['1_','2_'], $all: ['3_','4_'], $in: ['5_','6_']}), newQuery.array)
        t.ok(deepEqual(newQuery.noValue, {$mod: [3,0],$exists: false, $regex: /whatever/, $size: 3, $nearSphere: {}, $near: {}, $comment: "blah"}), newQuery.noValue)
        t.ok(deepEqual(newQuery.special, {$elemMatch: {x: '5_', y: {$lt:'9_'}}}), newQuery.special)
        t.ok(deepEqual(newQuery.special2, {$elemMatch: {$gt: '6_'}}), newQuery)
        t.ok(deepEqual(newQuery.$text, {$search: "stringy_"}), newQuery.$text)

    })

    this.test('map', function(t) {
        var result = parse({a:1}).map(function(key, value) {
            t.ok(deepEqual(value,{$eq:1}), value)
            t.eq(key,'a')
            return {b:2}
        })
        this.eq(Object.keys(result).length, 1)
        this.eq(result.b, 2)

        var result = parse({a:{$not:1, $lt:4}}).map(function(key, value) {
            t.eq(key,'a')
            if(value.$not === 1) {
                return {a:{$gt:3}}
            } else if(value.$lt === 4) {
                return {a:{$ne:5}}
            } else throw ': ('
        })
        this.eq(Object.keys(result).length, 1)
        t.ok(deepEqual(result, {a:{$gt:3,$ne:5}}), result)

        var result = parse({a:{$exists:false}}).map(function(key, value) {
            t.eq(key,'a')
            t.eq(value.$exists, false)
        })
        this.eq(Object.keys(result).length, 1)
        t.ok(deepEqual(result, {a:{$exists:false}}), result)

        var result = parse({a:{$geoIntersects: {$geometry: {
          type: "<GeoJSON object type>",
          coordinates: []
        }}}}).map(function(key, value) {
            t.eq(key,'a')
            t.ok(deepEqual(value, {$geoIntersects: {$geometry: {
              type: "<GeoJSON object type>",
              coordinates: []
            }}}), value)

            return {a:4, b:5}
        })
        this.eq(Object.keys(result).length, 2)
        t.ok(deepEqual(result, {a:4,b:5}), result)


        var result = parse({$or: [
            {a:1}, {b:{$nin:[1,2,3]}}
        ]}).map(function(key, value) {
            if(key === 'a') {
                t.ok(deepEqual(value,{$eq:1}), value)
                return null
            } else if(key ==='b') {
                t.ok(deepEqual(value, {$nin:[1,2,3]}), value)
                return {c:value}
            }
        })
        t.ok(deepEqual(result, {c:{$nin:[1,2,3]}}), result)

        var result = parse({$and: [
            {a:{$all:[1,2,3]}}, {b:{$elemMatch: {x: 5, y: {$lt:9}}}}, {$text: {$search: "stringy"}}
        ]}).map(function(key, value) {
            if(key === 'a') {
                t.ok(deepEqual(value, {$all:[1,2,3]}), value)
            } else if(key === 'b') {
                t.ok(deepEqual(value, {$elemMatch: {x: 5, y: {$lt:9}}}), value)
                return {$text: {$search: "moo"}}
            } else if(key === undefined) {
                t.ok(deepEqual(value, {$text: {$search: "stringy"}}), value)
                return {x:2}
            }
        })
        t.ok(deepEqual(result, {a:{$all:[1,2,3]}, $text: {$search: "moo"}, x:2}), result)


        var result = parse({a:5, b:5}).map(function(key, value) {
            if(key === 'b') {
                return {a:{$gt:3}}
            }
        })
        t.ok(deepEqual(result, {a:5, $and:[{a:{$gt:3}}]}), result)

        var result = parse({a:{$ne:5}, b:5}).map(function(key, value) {
            if(key === 'b') {
                return {a:{$ne:3}}
            }
        })
        t.ok(deepEqual(result, {a:{$ne:5}, $and:[{a:{$ne:3}}]}), result)

        var result = parse({a:5, d:9, $nor:[{b:9}, {c:10}]}).map(function(key, value) {
            if(key === 'a') {
                return {$nor:[{a:{$gt:4}}, {a:{$lt:6}}]}
            } else if(key === 'd') {
                return;
            } else {
                return null
            }
        })
        t.ok(deepEqual(result, {$nor:[{a:{$gt:4}}, {a:{$lt:6}}], d:9}), result)

        var result = parse({$text:{$search:"moose"}}).map(function(key, value) {
            return;
        })
        t.ok(deepEqual(result, {$text:{$search:"moose"}}), result)


        this.test("former bugs", function(t) {
            this.test("$or was being treated like an $and", function(t) {
                var x = {"$and":[{"$or":[{"parent":"58a017558db10ff76667bba7"},{"ancestry":"58a017558db10ff76667bba7"}],"done":true,"complexity":{"$gt":0},"archived":{"$ne":true}},{"type":{"$ne":"Bug"}}]}
                var y = {"$or":[{"parent":"58a017558db10ff76667bba7"},{"ancestry":"58a017558db10ff76667bba7"}],"done":true,"complexity":{"$gt":0},"archived":{"$ne":true}, "type":{"$ne":"Bug"}}
                var result = parse(x).map(function() {})
                this.ok(deepEqual(result, y), result)
            })
        })
    })

    this.test('matching', function() {
        // simple equality {a: 'a'}
        // simple operator queries {b: {$gt: '3'}}
        // basic and {c: 'c', d: 'd')}
        // dot notation: {'e.x': 'ab'}
        // array equality: {array: [1,2,3]}
        // object equality: {obj: {x:1,y:2}} // order matters
        // array contains: {array: 2}
        // dot notation with array index: {'array.1.x': 'ab'}
        // any obj embedded in array: {'array.x': 'ab'}
        // combination of operators {e: {$gt: 3, $lt: 4}}
        // function or string - equivalent of the $where operator
            // function using obj or this

        // operators:
            // field operators
                // single-value
                    // $gt, $gte, $lt, $lte, $ne
                    // special (multiple operands)
                        // $geoIntersects, $geoWithin
                // array
                    // $nin, $all, $in,
                // no-value
                    // $mod, $exists, $regex, $size, $nearSphere, $near
                // special
                    // $elemMatch, $not
            // field-independant operators
                // no-value
                   // $and, $or, $nor, $where, $comment
                // has value
                    // $text
            // projection-operators
                // $, $elemMatch, $meta, $slice

        this.test("simple equality", function() {
            var parsedQuery = parse({})
            this.ok(parsedQuery.matches({a:'a', b:'b'}))
            this.ok(parsedQuery.matches({a:'b', b:'a'}))
            this.ok(parsedQuery.matches({}))

            var parsedQuery = parse({a:null})
            this.ok(parsedQuery.matches({a:null}))
            this.ok(parsedQuery.matches({}))
            this.ok(!parsedQuery.matches({a:'b'}))

            var parsedQuery = parse({a:'a'})
            this.ok(parsedQuery.matches({a:'a', b:'b'}))
            this.ok(!parsedQuery.matches({a:'b', b:'a'}))
        })

        this.test("simple operator queries", function() { //{b: {$gt: '3'}}
            var parsedQuery = parse({a: {$gt: 3}})
            this.ok(parsedQuery.matches({a:4}))
            this.ok(!parsedQuery.matches({a:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$lt: 3}})
            this.ok(parsedQuery.matches({a:2}))
            this.ok(!parsedQuery.matches({a:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$gte: 3}})
            this.ok(parsedQuery.matches({a:4}))
            this.ok(parsedQuery.matches({a:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$lte: 3}})
            this.ok(parsedQuery.matches({a:2}))
            this.ok(parsedQuery.matches({a:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$ne: 3}})
            this.ok(parsedQuery.matches({a:2}))
            this.ok(parsedQuery.matches({}))
            this.ok(!parsedQuery.matches({a:3}))

            var parsedQuery = parse({a: {$in: [1,2]}})
            this.ok(parsedQuery.matches({a:2}))
            this.ok(!parsedQuery.matches({a:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$nin: [1,2]}})
            this.ok(parsedQuery.matches({a:3}))
            this.ok(parsedQuery.matches({}))
            this.ok(!parsedQuery.matches({a:2}))

            var parsedQuery = parse({a: {$all: [1,2]}})
            this.ok(parsedQuery.matches({a:[1,2,2,2,1]}))
            this.ok(!parsedQuery.matches({a:2}))
            this.ok(!parsedQuery.matches({a:[1,2,3]}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$mod: [4,3]}})
            this.ok(parsedQuery.matches({a:3}))
            this.ok(parsedQuery.matches({a:7}))
            this.ok(!parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$exists: true}})
            this.ok(parsedQuery.matches({a:{x:1}})) // object value
            this.ok(parsedQuery.matches({a:false})) // primitive value
            this.ok(!parsedQuery.matches({b:{b:'a'}, c:'a'}))
            this.ok(!parsedQuery.matches({}))

            // more complex queries for $exists
            var parsedQuery = parse({'a.b': {$exists: true}})
            this.ok(parsedQuery.matches({a:[{b:1},{x:'moose'}]})) // array element
            this.ok(!parsedQuery.matches({}))


            var parsedQuery = parse({a: {$regex: /x+/}})
            this.ok(parsedQuery.matches({a:'x'}))
            this.ok(parsedQuery.matches({a:'xxx'}))
            this.ok(parsedQuery.matches({a:'xxxwaef'}))
            this.ok(!parsedQuery.matches({a:''}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$size: 2}})
            this.ok(parsedQuery.matches({a:[1,2]}))
            this.ok(!parsedQuery.matches({a:[1]}))
            this.ok(!parsedQuery.matches({a:2}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$elemMatch: {x:5}}})
            this.ok(parsedQuery.matches({a:[{x:5}, {y:4}]}))
            this.ok(!parsedQuery.matches({a:[{x:4}, {y:5}]}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: {$elemMatch: {$gt:5}}})
            this.ok(parsedQuery.matches({a:[4,5,6]}))
            this.ok(!parsedQuery.matches({a:[3,4,5]}))

            var parsedQuery = parse({a: {$not: {$gt:5}}})
            this.ok(parsedQuery.matches({a:4}))
            this.ok(parsedQuery.matches({}))
            this.ok(!parsedQuery.matches({a:6}))

            var parsedQuery = parse({a: {$not: 4}})
            this.ok(parsedQuery.matches({a:5}))
            this.ok(parsedQuery.matches({}))
            this.ok(!parsedQuery.matches({a:4}))

            var parsedQuery = parse({$and: [{a:3, b:{$gt:4}}]})
            this.ok(parsedQuery.matches({a:3,b:6}))
            this.ok(!parsedQuery.matches({a:3,b:3}))
            this.ok(!parsedQuery.matches({a:6,b:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({$or: [{a:3}, {b:{$gt:4}}]})
            this.ok(parsedQuery.matches({a:3,b:6}))
            this.ok(parsedQuery.matches({a:3,b:3}))
            this.ok(!parsedQuery.matches({a:6,b:3}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({$nor: [{a:3}, {b:{$gt:4}}]})
            this.ok(!parsedQuery.matches({a:3,b:6}))
            this.ok(!parsedQuery.matches({a:3,b:3}))
            this.ok(parsedQuery.matches({a:6,b:3}))
            this.ok(parsedQuery.matches({}))

            var parsedQuery = parse({a: {$where: function() {return this === 5}}})
            this.ok(parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({a:4}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse(function() {return this.a === 5})
            this.ok(parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({a:4}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse(function() {return obj.a === 5})
            this.ok(parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({a:4}))
            this.ok(!parsedQuery.matches({}))

            var parsedQuery = parse({a: 5,  $comment: "whatever"})
            this.ok(parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({a:6}))
        })

        this.test("basic and", function() {
            var parsedQuery = parse({a: 5, b:6})
            this.ok(parsedQuery.matches({a:5, b:6, c:7}))
            this.ok(!parsedQuery.matches({a:5, c:6}))
        })

        this.test("dot notation", function() {
            var parsedQuery = parse({'a.b': 5})
            this.ok(parsedQuery.matches({a:{b:5}}))
            this.ok(!parsedQuery.matches({a:5}))
            this.ok(!parsedQuery.matches({a:{b:6}}))
            this.ok(!parsedQuery.matches({b:6}))

            var parsedQuery = parse({'a.0': 5})
            this.ok(parsedQuery.matches({a:[5,6,7]}))
            this.ok(!parsedQuery.matches({a:[6,6,7]}))
            this.ok(!parsedQuery.matches({a:[6,5,7]}))
            this.ok(!parsedQuery.matches({a:5}))

            var parsedQuery = parse({'a.0.x': 5})
            this.ok(parsedQuery.matches({a:[{x:5}]}))
            this.ok(!parsedQuery.matches({a:[6,6,7]}))
            this.ok(!parsedQuery.matches({a:[{x:6}, {x:5}]}))

            // matching any element's subdocument
            var parsedQuery = parse({'a.x': 5})
            this.ok(parsedQuery.matches({a:[0, {x:5}]}))
            this.ok(!parsedQuery.matches({a:[5,6,7]}))
            this.ok(!parsedQuery.matches({a:[{x:6}, {x:7}]}))

            // more complex array subdocuments
            var parsedQuery = parse({'a.x.y.z': 5})
            this.ok(parsedQuery.matches({a:[{x:[{y:[{z:5}]}]}]}))
            this.ok(!parsedQuery.matches({a:[{x:[{y:[{z:6}]}]}]}))
        })

        this.test('array equality and element match', function() {
            var parsedQuery = parse({a: [1,2,3]})
            this.ok(parsedQuery.matches({a:[1,2,3]}))
            this.ok(!parsedQuery.matches({a:[0,1,2,3]}))
            this.ok(!parsedQuery.matches({a:2}))

            // array contains
            var parsedQuery = parse({a: 5})
            this.ok(parsedQuery.matches({a:[5,6,7]}))
            this.ok(parsedQuery.matches({a:[6,5,7]}))
            this.ok(!parsedQuery.matches({a:[6,6,7]}))

            var parsedQuery = parse({a: {$gt:5}})
            this.ok(parsedQuery.matches({a:[5,6,7]}))
            this.ok(parsedQuery.matches({a:[6,7]}))
            this.ok(!parsedQuery.matches({a:[1,2,3]}))
        })

        this.test("object equality", function() {
            var parsedQuery = parse({a: {x:1,y:2}})
            this.ok(parsedQuery.matches({a:{x:1,y:2}}))
            this.ok(!parsedQuery.matches({a:{y:2,x:1}}))
            this.ok(!parsedQuery.matches({a:{x:1}}))
            this.ok(!parsedQuery.matches({x:1}))
        })

        this.test("inclusive", function() {
            this.eq(parser.inclusive({a:1}), true)
            this.eq(parser.inclusive({_id:1}), true)      // mongo apparently cares if _id is explicitly included, but not if its explicitly excluded
            this.eq(parser.inclusive({a:true}), true)
            this.eq(parser.inclusive({a:45}), true)
            this.eq(parser.inclusive({'a.$':1}), true)
            this.eq(parser.inclusive({_id:0, a:45}), true)
            this.eq(parser.inclusive({$meta:'textScore'}), true)

            this.eq(parser.inclusive({a:0}), false)
            this.eq(parser.inclusive({a:false}), false)

            this.eq(parser.inclusive({}), undefined)
            this.eq(parser.inclusive({_id:0}), undefined)
            this.eq(parser.inclusive({a:{$elemMatch:{x:1}}}), undefined)
            this.eq(parser.inclusive({a:{$slice:4}}), undefined)
            this.eq(parser.inclusive({a:{$slice:[2,3]}}), undefined)
        })

        this.test("errors", function() {
            this.count(2)

            var parsedQuery = parse({})

            try {
                parsedQuery.matches({$a:5})
            } catch(e) {
                this.eq(e.message, "Field names can't start with $")
            }

            try {
                parsedQuery.matches({'a.b':5})
            } catch(e) {
                this.eq(e.message, "Field names can't contain .")
            }
        })

    })

    this.test('$in array match', function() {

        var parsedQuery = parser.parse({
            tags:{ $in:['a','b']}
        });

        this.ok(parsedQuery.matches({ tags:['a', 'b', 'c'] }));
        this.ok(parsedQuery.matches({ tags:['a'] }));
        this.ok(parsedQuery.matches({ tags:'a' }));

        this.ok(!parsedQuery.matches({ tags:[] }));
        this.ok(!parsedQuery.matches({ tags:['d'] }));
        this.ok(!parsedQuery.matches({ tags:['d', 'e'] }));
        this.ok(!parsedQuery.matches({ tags:null }));
        this.ok(!parsedQuery.matches({ tags:'' }));
    });

    this.test('$nin array match', function() {

        var parsedQuery = parser.parse({
            tags:{ $nin:['a','b']}
        });

        this.ok(!parsedQuery.matches({ tags:['a', 'b', 'c'] }));
        this.ok(!parsedQuery.matches({ tags:['a'] }));
        this.ok(!parsedQuery.matches({ tags:'a' }));

        this.ok(parsedQuery.matches({ tags:[] }));
        this.ok(parsedQuery.matches({ tags:['d'] }));
        this.ok(parsedQuery.matches({ tags:['d', 'e'] }));
        this.ok(parsedQuery.matches({ tags:null }));
        this.ok(parsedQuery.matches({ tags:'' }));
    })

    this.test('searching', function() {
        var documents = [{x:5,y:{z:10}},{x:7,y:{z:10}},{x:6,y:{z:4}},{x:4,y:{z:6}}]

        var results = parser.search(documents, {x: {$gt:4}}, {x:1})
        this.ok(deepEqual(results, [{x:5,y:{z:10}}, {x:6,y:{z:4}}, {x:7,y:{z:10}}]))

        results = parser.search(documents, {'y.z': 10}, {x:-1})
        this.ok(deepEqual(results, [{x:7,y:{z:10}}, {x:5,y:{z:10}}]))

        results = parser.search(documents, {}, {'y.z':1, x:-1})
        this.ok(deepEqual(results, [{x:6,y:{z:4}},{x:4,y:{z:6}},{x:7,y:{z:10}},{x:5,y:{z:10}}]))
    })

    //*/


}).writeConsole(1000)



// you define the functions up front, and when you call the return value, it passes the arguments you call it with to the functions in sequence
// returns a function that, each time its called, calls the next function in the list with the passed argument
// example:
/*
var sequenceX = testUtils.seq(
 function(x) {
     t.ok(x === 'a')
 },
 function(x) {
     t.ok(x === 'b')
 },
 function(x) {
     t.ok(x === 'c')
})

 var obj = {a:1,b:2,c:3}
 for(var x in obj) {
     sequenceX(x)
 }
 */
function seq(/*functions*/) {
    var n=-1
    var fns = arguments
    return function() {
        n++
        if(n>=fns.length)
            throw new Error("Unexpected call: "+n)
        // else
        fns[n].apply(this,arguments)
    }
}

// compares arrays and objects for value equality (all elements and members must match)
function deepEqual(a,b) {
    if(a instanceof Array) {
        if(!(b instanceof Array))
            return false
        if(a.length !== b.length) {
            return false
        } else {
            return a.reduce(function(previousValue, currentValue, index) {
                return previousValue && deepEqual(currentValue,b[index])
            }, true)
        }
    } else if(a instanceof Object) {
        if(!(b instanceof Object))
            return false

        var aKeys = Object.keys(a)
        var bKeys = Object.keys(b)

        if(aKeys.length !== bKeys.length) {
            return false
        } else {
            for(var n=0; n<aKeys.length; n++) {
                var key = aKeys[n]
                var aVal = a[key]
                var bVal = b[key]

                if(!deepEqual(aVal,bVal)) {
                    return false
                }
            }
            // else
            return true
        }
    } else {
        return a===b
    }
}
