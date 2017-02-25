

var mapValues = require("./mapValues")
var matches = require("./matches")

var DotNotationPointers = exports.DotNotationPointers = require("./DotNotationPointers")

// routerDefinition should be a function that gets a Route object as its `this` context
var Parse = function(mongoQuery) {
    this.parts = parseQuery(mongoQuery)
}
Parse.prototype = {}

// instance methods
Parse.prototype.map = function(callback) {
    return map(this.parts, callback)
}
Parse.prototype.mapValues = function(callback) {
    return compressQuery(mapValues(this.parts, callback))
}
Parse.prototype.matches = function(document, validate) {
    return matches(this.parts, document, validate)
}

exports.parse = function(mongoQuery) {
    return new Parse(mongoQuery)
}
exports.inclusive = function(mongoProjection) {
    return isInclusive(mongoProjection)
}

exports.search = function(documents, query, sort, validate) {
    var parsedQuery = new Parse(query)

    return documents.filter(function(doc) {
        return parsedQuery.matches(doc, validate)
    }).sort(function(a,b) {
        for(var k in sort) {
            var result = sortCompare(a,b,k)
            if(result !== 0) {
                if(sort[k]<0)
                    result = -result

                return result
            }
        }

        return 0 // if it got here, they're the same
    })
}

var complexFieldIndependantOperators = {$and:1, $or:1, $nor:1}
var simpleFieldIndependantOperators = {$text:1, $comment:1}

// compares two documents by a single sort property
function sortCompare(a,b,sortProperty) {
    var aVal = DotNotationPointers(a, sortProperty)[0].val // todo: figure out what mongo does with multiple matching sort properties
    var bVal = DotNotationPointers(b, sortProperty)[0].val

    if(aVal > bVal) {
        return 1
    } else if(aVal < bVal) {
        return -1
    } else {
        return 0
    }
}

function isInclusive(projection) {
    for(var k in projection) {
        if(!projection[k]) {
            if(k !== '_id') {
                return false
            }
        } else if(k === '$meta') {
            return true
        } else if(projection[k]) {
            if(projection[k] instanceof Object && ('$elemMatch' in projection[k] || '$slice'  in projection[k])) {
                // ignore
            } else {
                return true
            }
        }
    }
}

function parseQuery(query) {
    if(query instanceof Function || typeof(query) === 'string') {
        if(query instanceof Function) {
            query = "("+query+").call(obj)"
        }

        var normalizedFunction = new Function("return function(){var obj=this; return "+query+"}")()
        return [new Part(undefined, '$where', normalizedFunction)]
    }
    // else

    var parts = []
    for(var key in query) {
        if(key in complexFieldIndependantOperators) { // a field-independant operator
            var operator = key
            var operands = query[key]
            var innerParts = []
            operands.forEach(function(operand) {
                innerParts.push(new Part(undefined, '$and', [operand], parseQuery(operand)))
            })

            parts.push(new Part(undefined, operator, query[key], innerParts))
        } else if(key in simpleFieldIndependantOperators) {
            parts.push(new Part(undefined, key, query[key]))
        } else { // a field
            var field = key
            if(isObject(query[key]) && fieldOperand(query[key])) {
                for(var innerOperator in query[key]) {
                    var innerOperand = query[key][innerOperator]
                    parts.push(parseFieldOperator(field, innerOperator, innerOperand))
                }
            } else { // just a value, shorthand for $eq
                parts.push(new Part(field, '$eq', query[key]))
            }
        }
    }

    return parts
}

function map(parts, callback) {
    var result = {}
    parts.forEach(function(part) {
        if(part.operator === '$and') {
            var mappedResult = map(part.parts, callback)
        } else if(part.operator in complexFieldIndependantOperators) {
            var mappedParts = part.parts.map(function(part) {
                return map(part.parts, callback)
            })
            var mappedResult = {$or: mappedParts}
        } else {            
            var value = {}; value[part.operator] = part.operand
            var cbResult = callback(part.field, value)
            var mappedResult = processMappedResult(part, cbResult)
        }
        
        mergeQueries(result, mappedResult)       
    })

    compressQuery(result)
    return result
    
    function processMappedResult(part, mappedResult) {
        if(mappedResult === undefined) {
            var result = {}
            if(part.field === undefined) {
                result[part.operator] = part.operand
            } else {
                var operation = {}
                operation[part.operator] = part.operand
                result[part.field] = operation
            }
                        
            return result
        } else if(mappedResult ===  null) {
            return {}                            
        } else {
            return mappedResult
        }
    }
}

// merges query b into query a, resolving conflicts by using $and (or other techniques)
function mergeQueries(a,b) {
    for(var k in b) {
        if(k in a) {
            if(k === '$and') {
                a[k] = a[k].concat(b[k])  
            } else {
                var andOperandA = {}; andOperandA[k] = a[k]
                var andOperandB = {}; andOperandB[k] = b[k]
                var and = {$and:[andOperandA,andOperandB]}
                delete a[k]
                mergeQueries(a,and)            
            }
        } else {
            a[k] = b[k]
        }
    }    
}

// decanonicalizes the query to remove any $and or $eq that can be merged up with its parent object
// compresses in place (mutates)
var compressQuery = exports.compressQuery = function (x) {
    for(var operator in complexFieldIndependantOperators) {
        if(operator in x) {
            x[operator].forEach(function(query){
                compressQuery(query)
            })
        }
    }
    if('$and' in x) {
        x.$and.forEach(function(andOperand) {
            for(var k in andOperand) {
                if(k in x) {
                    if(!(x[k] instanceof Array) && typeof(x[k]) === 'object' && k[0] !== '$') {
                        for(var operator in andOperand[k]) {
                            if(!(operator in x[k])) {
                                x[k][operator] = andOperand[k][operator]
                                delete andOperand[k][operator]
                                if(Object.keys(andOperand[k]).length === 0)
                                    delete andOperand[k]
                            }
                        }  
                    }  
                } else {
                    x[k] = andOperand[k]
                    delete andOperand[k] 
                }
            }
        })
        x.$and = filterEmpties(x.$and)
        if(x.$and.length === 0) {
            delete x.$and
        }
    }   
    if('$or' in x) {
        x.$or = filterEmpties(x.$or)
        if(x.$or.length === 0) {
            delete x.$or
        } else if(x.$or.length === 1) {
            var orOperand = x.$or[0]
            delete x.$or
            mergeQueries(x,orOperand)
        }
    }
    
    for(var k in x) {
        if(x[k].$eq !== undefined && Object.keys(x[k]).length === 1) {
            x[k] = x[k].$eq
        }    
        if(x[k].$elemMatch !== undefined) {
            compressQuery(x[k].$elemMatch)
        }
    }
    
    return x
    
    function filterEmpties(a) {
        return a.filter(function(operand) {
            if(Object.keys(operand).length === 0)
                return false
            else 
                return true 
        })  
    }
}

// returns a Part object
function parseFieldOperator(field, operator, operand) {
    if(operator === '$elemMatch') {
        var elemMatchInfo = parseElemMatch(operand)
        var innerParts = elemMatchInfo.parts
        var implicitField = elemMatchInfo.implicitField
    } else if(operator === '$not') {
        var innerParts = parseNot(field, operand)
    } else {
        var innerParts = []
    }
    return new Part(field, operator, operand, innerParts, implicitField)
}

// takes in the operand of the $elemMatch operator
// returns the parts that operand parses to, and the implicitField value
function parseElemMatch(operand) {
    if(fieldOperand(operand)) {
        var parts = []
        for(var operator in operand) {
            var innerOperand = operand[operator]
            parts.push(parseFieldOperator(undefined, operator, innerOperand))
        }
        return {parts: parts, implicitField: true}
    } else {          // non-field operators ( stuff like {a:5} or {$and:[...]} )
        return {parts: parseQuery(operand), implicitField: false}
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


var Part = function(field, operator, operand, parts, implicitField) {
    if(parts === undefined) parts = []

    this.field = field
    this.operator = operator
    this.operand = operand
    this.parts = parts
    this.implicitField = implicitField // only used for a certain type of $elemMatch part
}