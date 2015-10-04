String.prototype.to_a = function() {
    return this.split('').map(function(v){return v.charCodeAt(0);});
}

Array.prototype.to_s = function() {
    return this.map(function(v){return String.fromCharCode(v)}).join('');
}

var mac = {};
mac.run = function(code) {

    mac.vars = {};
    var tokens = mac.tokenize(code);
    mac.program = tokens;
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
        if (v.type == VAR) {
            if (!(v.value in mac.vars)) return mac.Token(NUM, 0);
            return mac.vars[v.value];
        }
        return v;
    });
}

mac.operators = {
    "add": {
        func: function(args) {
            args = mac.deref_vars(args);
            if (args[0].type != NUM && args[1].type != NUM) {
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
            if (args[0].type != NUM && args[1].type != NUM) {
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
            if (args[0].type != ARR) {
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
            if (args[0].type != NUM && args[1].type != NUM) {
                mac.panic("i dont care about writing good error messages anymore");
            }
            return new mac.Token(ARR, args[0].value.toString(args[1].value).to_a());
        },
        name: "tobase",
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
            if (args[0].type != NUM && args[1].type != NUM) {
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
            if (args[0].type != NUM) {
                mac.panic("Called floor with Arr");
            }
            return new mac.Token(NUM, Math.floor(args[0].value));
        },
        name: "floor",
        arity: 1
    }
}

mac.panic = function(msg) {
    throw msg
};

mac.tokenize = function(code) {
    var tokens = [];
    var token = "";
    for (var i=0; i < code.length; i++) {
        var ch = code[i];
        if (token[0] == '"') {
            token += ch;
            if (ch == '"') {
                tokens.push(token);
                token = "";
            }
        } else if (('a' <= ch && ch <= 'z') || ('A' <= ch && ch <= 'Z') || ('0' <= ch && ch <= '9') || ch == '-' || ch == '_') {
            token += ch;
        } else if (ch == ' ' || ch == '\n' || ch == '\t') {
            if (token) {
                tokens.push(token);
                token = "";
            }
        } else if (ch == '"' && !token) {
            token += ch;
        } else {
            mac.panic("Illegal character");
        }
    }

    if (token) tokens.push(token);

    tokens = tokens.map(function(token, i) {
        if (token.split('').every(function(v, i) { return ('0' <= v && v <= '9') || (v == '-' && i == 0);})) {
            return new mac.Token(NUM, +token);
        } else if (token[0] == '"') {
            return new mac.Token(ARR, token.slice(1,-1).to_a());
        } else if (token in mac.operators) {
            return new mac.Token(OP, mac.operators[token]);
        } else {
            return new mac.Token(VAR, token);
        }

    })

    return tokens;
};

mac.run_tokens = function() {
    for (var i = 0; i < mac.program.length; i++) {
        if (mac.program[i].type == OP) {
            var ret = mac.execute_op(i);
            i = ret.i;
        }
    }
}

mac.execute_op = function(i) {
    var t = mac.program[i];
    var func = t.value.func;
    var arity = t.value.arity;
    if (t.type != OP) mac.panic("bro u dun goofed big time");
    var args = [];
    while (args.length < t.value.arity) {
        var token = mac.program[++i];
        if (!token) {
            mac.panic("Not enough arguments for operator " + t.value.name);
        } else if (token.type == OP) {
            var ret = mac.execute_op(i);
            args.push(ret.val);
            i = ret.i;
        } else
            args.push(token);
    }
    var result = func(args);
    return {val:result, i:i};
}
