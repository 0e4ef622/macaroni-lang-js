String.prototype.to_a = function() {
    return this.split('').map(function(v){return v.charCodeAt(0);});
}

Array.prototype.to_s = function() {
    if (!this.every(function(v){return typeof v === "number"})) throw "Invalid string";
    return this.map(function(v){return String.fromCharCode(v)}).join('');
}

var mac = {};
mac.run = function(code) {

    mac.vars = {};
    mac.currentTokenIndex = 0;
    mac.program = mac.tokenize(code);
    mac.run_tokens();

}

const OP = 0;
const VAR = 1
const ARR = 2;
const NUM = 3;

mac.Token = function(type, value) {
    this.type = type;
    this.value = value;
};

mac.deref_vars = function(args) {
    return args.map(function(v) {
        if (v.type === VAR) {
            if (!(v.value in mac.vars)) return new mac.Token(NUM, 0);
            return mac.vars[v.value];
        }
        return v;
    });
}

mac.operators = {
    "add": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== NUM && args[1].type !== NUM) {
                mac.panic("Called add with Arr");
            }
            return new mac.Token(NUM, args[0].value + args[1].value);
        },
        name: "add",
        arity: 2
    },
    "multiply": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== NUM && args[1].type !== NUM) {
                mac.panic("Called multiply with Arr");
            }
            return new mac.Token(NUM, args[0].value * args[1].value);
        },
        name: "multiply",
        arity: 2
    },
    "print": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== ARR) {
                mac.panic("Called print with Num");
            }
            console.log(args[0].value.to_s());
            return null;
        },
        name: "print",
        arity: 1
    },
    "tobase": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== NUM && args[1].type !== NUM) {
                mac.panic("i dont care about writing good error messages anymore");
            }
            return new mac.Token(ARR, args[0].value.toString(args[1].value).to_a());
        },
        name: "tobase",
        arity: 2
    },
    "frombase": {
        func: function(args) {

            const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            args = mac.deref_vars(args);
            if (args[0].type !== ARR && args[1].type !== NUM) {
                mac.panic("frombase called with inappropriate types");
            }
            var str = args[0].value; // actually an character array
            var base = args[1].value;
            // gonna basically copy keyboardfire but translate to js :P
            var neg = str[0] === '-';
            if (neg) str.shift();
            var sub_pos = str.indexOf(46); // code for '.'
            if (sub_pos === -1) sub_pos = str.length - 1;
            else str.splice(--sub_pos, 1);

            str = str.to_s(); // now its an actual string
            var n = 0;
            for (var i = 0; i < str.length; i++) {
                let c = str[i].toUpperCase();
                var digit = DIGITS.indexOf(c);
                if (digit === -1) mac.panic("unrecognized digit " + c);
                n += digit * Math.pow(base, sub_pos - i);
            }
            return new mac.Token(NUM, n);
        },
        name: "frombase",
        arity: 2
    },
    "set": {
        func: function(args) {
            val = mac.deref_vars([args[1]])[0];
            mac.vars[args[0].value] = val;
            return null;
        },
        name: "set",
        arity: 2
    },
    "pow": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== NUM && args[1].type !== NUM) {
                mac.panic("Called pow with Arr");
            }
            return new mac.Token(NUM, Math.pow(args[0].value, args[1].value));
        },
        name: "pow",
        arity: 2
    },
    "floor": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== NUM) {
                mac.panic("Called floor with Arr");
            }
            return new mac.Token(NUM, Math.floor(args[0].value));
        },
        name: "floor",
        arity: 1
    },
    "rand": {
        func: function() {
            return new mac.Token(NUM, Math.random());
        },
        name: "rand",
        arity: 0
    },
    "length": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== ARR) {
                mac.panic("Called length with Num");
            }
            return new mac.Token(NUM, args[0].value.length);
        },
        name: "length",
        arity: 1
    },
    "goto": {
        func: function(args) {
            if (args[0].type !== VAR) {
                mac.panic("Called goto with something weird");
            } else if (!(args[0].value in mac.program.labels)) {
                mac.panic("Invalid label");
            }
            mac.program.stack.push(mac.currentTokenIndex);
            mac.currentTokenIndex = mac.program.labels[args[0].value];
            return null;
        },
        name: "goto",
        arity: 1
    },
    "return": {
        func: function() {
            if (mac.program.stack.length === 0) mac.currentTokenIndex = mac.program.tokens.length;
            mac.currentTokenIndex = mac.program.stack.pop();
        },
        name: "return",
        arity: 0
    },
    "time": {
        func: function() {
            return new mac.Token(NUM, new Date() / 1000);
        },
        name: "time",
        arity: 0
    },
    "wrap": {
        func: function(args) {
            args = mac.deref_vars(args);
            return new mac.Token(ARR, [args[0].value]);
        },
        name: "wrap",
        arity: 1
    },
    "unwrap": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== ARR) mac.panic("Called unwrap with Num");
            else if (args[0].value.length !== 1) mac.panic("Called unwrap with Arr of length != 1");

            var x = args[0].value[0];
            if (typeof x === "number") return new mac.Token(NUM, x);
            else if (x.constructor === Array) return new mac.Token(ARR, x);
            else mac.panic("something went horribly wrong");
        },
        name: "unwrap",
        arity: 1
    },
    "concat": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type !== ARR || args[1].type !== ARR)
                mac.panic("Called concat with Num");
            return new mac.Token(ARR, args[0].value.concat(args[1].value));
        },
        name: "concat",
        arity: 2
    }
}

mac.panic = function(msg) {
    throw msg
};

mac.tokenize = function(code) {
    var program = {tokens: [], labels: [], stack: []};
    var tokens = [];
    var token = "";
    for (var i=0; i < code.length; i++) {
        var ch = code[i];
        if (token[0] === '"') {
            token += ch;
            if (ch === '"') {
                tokens.push(token);
                token = "";
            }
        } else if (('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z') || ('0' <= ch && ch <= '9') || ch === '-' || ch === '_') {
            token += ch;
        } else if (ch === ' ' || ch === '\n' || ch === '\t') {
            if (token) {
                tokens.push(token);
                token = "";
            }
        } else if (ch === '"' && !token) {
            token += ch;
        } else {
            mac.panic("Illegal character");
        }
    }

    if (token) tokens.push(token);

    for (var i=0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token.split('').every(function(v, i) { return ('0' <= v && v <= '9') || (v === '-' && i === 0);}))
            program.tokens.push(new mac.Token(NUM, +token));
        else if (token[0] === '"')        program.tokens.push(new mac.Token(ARR, token.slice(1,-1).to_a()));
        else if (token in mac.operators) program.tokens.push(new mac.Token(OP, mac.operators[token]));
        else if (token === "label")       program.labels[tokens[++i]] = program.tokens.length - 1;
        else                             program.tokens.push(new mac.Token(VAR, token));

    }

    return program;
};

mac.run_tokens = function() {
    while (mac.currentTokenIndex < mac.program.tokens.length) {
        if (mac.program.tokens[mac.currentTokenIndex].type === OP) {
            mac.execute_op();
        }
        mac.currentTokenIndex++;
    }
}

mac.execute_op = function() {
    var t = mac.program.tokens[mac.currentTokenIndex];
    if (t.type !== OP) mac.panic("bro u dun goofed big time");
    var func = t.value.func;
    var arity = t.value.arity;
    var args = [];
    while (args.length < t.value.arity) {
        var token = mac.program.tokens[++mac.currentTokenIndex];
        if (!token) {
            mac.panic("Not enough arguments for operator " + t.value.name);
        } else if (token.type === OP) {
            args.push(mac.execute_op());
        } else args.push(token);
    }
    return func(args);
}
