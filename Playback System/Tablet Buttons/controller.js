var exports = module.exports = {
    version: '0.0.1j',

    _directors: 0,
    _pinged: 0,
    _actors: 0,
    _killed: 0,

    events: [ 'error', 'director', 'actor', 'ping', 'killed' ],
    onerror: function(event) { console.error('onerror', JSON.stringify(event, 0, 2)); },
    ping: function(stuff) { this.director.ping(stuff); },
    kill: function() {
        this.director.sendObject({ type: 'CELLDEATH', from: Account.username,  });
    },

    actors: {
        channel: 'Director->Actor',
        events: [ 'loaded', 'waiting', 'killed', 'playing', 'message'],
        // onmessage: function(event) { console.info(this.channel, 'onmessage', JSON.stringify(event, 0, 2)); },
        sendObject: function(obj) {
            Messages.sendMessage(this.channel, JSON.stringify(obj));
        },

        _onmessage: function(event) {
            if (event.type === 'OUTPUT' && event.command === 'READY') {
                //this.onready(event);
                module.exports.director.onready(event);
            }
            else if (event.type === 'OUTPUT' && event.command === 'ALLSTOPPED') {
                module.exports.director.onfinished(event);
            }
            else if (event.type === 'DEBUG' && event.msg === 'ERROR') {
                exports.channel = this.channel;
                exports.onerror(event);
            }
            else if (event.type === 'DEBUG' && event.msg === 'KILLINGSELF') {
                this.onkilled(event);
                exports._killed++;
                exports.onkilled(event);
                if (event.id === 'DIRECTOR') {
                    exports._directors = exports._actors = exports._pinged = 0;
                    exports.director._reset();
                    exports.onping({});
                }
            }
            else if (event.type === 'SessionPing') {
                exports._pinged++;
                event.channel = this.channel;
                exports.onping(event);
                if (event.init || !exports._directors) {
                    exports._directors++;
                    exports.ondirector(event);
                }
            }
            else if (event.type === 'COMMAND') {
                ; // snarf to avoid verbose logging output
            }
            else this.onmessage(event);
        },
    },

    director: {
        channel: 'Actor->Director',

        events: [ 'stopping', 'finished', 'playing', 'loading', 'ready', 'message'],
        // onmessage: function(event) { console.info(this.channel, 'onmessage', JSON.stringify(event, 0, 2)); },

        play: function() {
            this.sendObject({ type: "COMMAND", cmd: "PLAY" });
        },
        load: function() {
            this.sendObject({ type: "COMMAND", cmd: "LOAD" });
        },
        stop: function() {
            this.sendObject({ type: "COMMAND", cmd: "STOP" });
        },
        sendObject: function(obj) {
            Messages.sendMessage(this.channel, JSON.stringify(obj));
        },

        _reset: function() {
            this.loaded = this.waiting = this.playing = 0;
            exports._pinged = exports._killed = 0;
        },
        _onmessage: function(event) {
            if (event.type === 'COMMAND' && event.cmd === 'STOP') {
                this._reset();
                this.onstopping(event);
            }
            else if (event.type === 'COMMAND' && event.cmd === 'PLAY') {
                this.onplaying(event);
            }
            else if (event.type === 'COMMAND' && event.cmd === 'LOAD') {
                this._reset();
                this.onloading(event);
            }
            else if (event.type === 'DEBUG' && event.msg === 'WAITING') {
                this.waiting++;
                exports.actors.onwaiting(event);
            }
            else if (event.type === 'DEBUG' && event.msg === 'PLAYING') {
                this.playing++;
                exports.actors.onplaying(event);
            }
            else if (event.type === 'DEBUG' && event.msg === 'KILLINGSELF') {
                exports._killed++;
                this.onstopping(event);
                exports.onkilled(event);
            }
            else if (event.type === 'STATUS' && event.status === 'LOADED') {
                this.loaded++;
                event.channel = this.channel;
                exports.actors.onloaded(event);
            }
            else if (event.type === 'STATUS' && event.status === 'ERROR') {
                event.channel = this.channel;
                exports.onerror(event);
            }
            else if (event.type === 'ReturnPing') {
                exports._pinged++;
                event.channel = this.channel;
                exports.onping(event);
                if (event.init) {
                    exports._actors++;
                    exports.onactor(event);
                }
            }
            else if (event.type === 'SessionPing') {
                ; // snartf to avoid verbose log messages
            }
            else this.onmessage(event);
        },
        ping: function(stuff) {
            stuff = stuff || {};
            var obj = { type: 'SessionPing', username: Account.username, now: new Date };
            for (var p in stuff) {
                obj[p] = stuff[p];
            }
            this.sendObject(obj);
        },
    },
    cleanup: function() {
        try { Messages.messageReceived.disconnect(players, 'onMessageReceived'); } catch(e) {}
        var self = Script.resolvePath('');
        var others = ScriptDiscoveryService.getRunning().filter(function(s) {
            return /app-fumbleland/.test(s.url);
        });
        if (others.length > 1) {
            console.info('seeing other app-fumbleland scripts, not unsubscribing');
            players.forEach(function(o) { Messages.unsubscribe(o.channel); });
        }
    },
};    

var eventProto = {
    on: function(name, handler) {
        var method = 'on'+name;
        if (typeof this[method] !== 'function') {
            throw new Error('unrecognized '+this.channel+' event: ' + name);
        }
        this[method].handlers = this[method].handlers || [];
        this[method].handlers.push(handler);
        return this;
    },
    mixin: function(ob) {
        ob.on = this.on;
        ob.events.forEach(function(name) {
            var method = 'on' + name;
            var handlers = [];
            if (method in ob) {
                handlers.push(ob[method]);
            }
            // console.info('eventProto ', ob.channel, method, handlers.length);
            function handler(event) {
                var method = 'on'+name;
                var args = [].slice.call(arguments);
                var self = this;
                handlers.forEach(function(f) {
                    try { f.apply(self, args); } catch(e) { console.error('error in handler', name, e); }
                });
            }
            Object.defineProperty(ob, method, { enumerable: true, get: function() { return handler; }, set: function(nv) { throw new Error('use on("'+name+'", ...)'); } });
            ob[method].handlers = handlers;
        });
        return ob;
    },
};

eventProto.mixin(exports);
eventProto.mixin(exports.actors);
eventProto.mixin(exports.director);

var players = [ exports.actors, exports.director ];
players.forEach(function(o) { Messages.subscribe(o.channel); });
players.onMessageReceived = function(c,m,s,l) {
    this.forEach(function(o) { o.channel === c && o._onmessage(JSON.parse(m)); });
};
players.onDomainChanged = function(domain) {
    if (!domain) {
        exports.director._reset();
        exports._directors = exports._actors = exports._pinged = 0;
        exports.director.onfinished({ domainChanged: domain });
        exports.onping({});
    }
};
module.exports._players = players;

Messages.messageReceived.connect(players, 'onMessageReceived');
Window.domainChanged.connect(players, 'onDomainChanged');
Script.scriptEnding.connect(exports, 'cleanup');
