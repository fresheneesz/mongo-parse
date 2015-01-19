

var proto = require('proto')

var mapValues = require("./mapValues")


module.exports = proto(function(superclass) {

    // static

    // routerDefinition should be a function that gets a Route object as its `this` context
    this.init = function(mongoQuery) {
        this.parts = parseQuery(mongoQuery)
    }

    // instance

    this.mapValues = function(callback) {
        return mapValues(this.parts, callback)
    }

    this.matches = function(document) {
        this.parts.forEach(function(part) {

        })
    }
})


var complexFieldIndependantOperators = {$and:1, $or:1, $nor:1}
var simpleFieldIndependantOperators = {$text:1}

function parseQuery(query) {
    if(query instanceof Function || typeof(query) === 'string') {
        if(!(query instanceof Function)) { // its a string
            query = eval("(function() {return "+query+"})")
        }

        return [Part(undefined, '$where', query)]
    }
    // else

    var parts = []
    for(var key in query) {
        if(key in complexFieldIndependantOperators) { // a field-independant operator
            var operator = key
            var operands = query[key]
            var innerParts = []
            operands.forEach(function(operand) {
                innerParts.push(Part(undefined, '$and', [operand], parseQuery(operand)))
            })

            parts.push(Part(undefined, operator, query[key], innerParts))
        } else if(key in simpleFieldIndependantOperators) {
            parts.push(Part(undefined, key, query[key]))
        } else { // a field
            var field = key
            if(isObject(query[key]) && fieldOperand(query[key])) {
                for(var innerOperator in query[key]) {
                    var innerOperand = query[key][innerOperator]
                    parts.push(parseFieldOperator(field, innerOperator, innerOperand))
                }
            } else { // just a value
                parts.push(Part(field, undefined, query[key]))
            }
        }
    }

    return parts
}

// returns a Part object
function parseFieldOperator(field, operator, operand) {
    if(operator === '$elemMatch') {
        var innerParts = parseElemMatch(operand)
    } else if(operator === '$not') {
        var innerParts = parseNot(field, operand)
    } else {
        var innerParts = []
    }
    return Part(field, operator, operand, innerParts)
}

// takes in the operand of the $elemMatch operator
// returns the parts that operand parses to
function parseElemMatch(operand) {
    if(fieldOperand(operand)) {
        var parts = []
        for(var operator in operand) {
            var innerOperand = operand[operator]
            parts.push(parseFieldOperator(undefined, operator, innerOperand))
        }
        return parts
    } else {          // non-field operators ( stuff like {a:5} or {$and:[...]} )
        return parseQuery(operand)
    }
}

function parseNot(field, operand) {
    var parts = []
    for(var operator in operand) {
        var subOperand = operand[operator]
        parts.push(parseFieldOperator(field, operator, subOperand))
    }
    return parts
}

// returns true for objects like {$gt:5}, {$elemMatch:{...}}
// returns false for objects like {x:4} and {$or:[...]}
function fieldOperand(obj) {
    for(var key in obj) {
        return key[0] === '$' && !(key in complexFieldIndependantOperators) // yes i know this won't actually loop
    }
}

// returns true if the value is an object and *not* an array
function isObject(value) {
    return value instanceof Object && !(value instanceof Array)
}


var Part = proto(function() {
    this.init = function(field, operator, operand, parts) {
        if(parts === undefined) parts = []

        this.field = field
        this.operator = operator
        this.operand = operand
        this.parts = parts
    }
})