var debug = Script.require('https://debug.midnightrift.com/files/hifi/debug.min.js');
debug.connect('fumbleland');

var ACID = 'actor-' + Uuid.generate().match(/\w+/)[0]+" "+Script.resolvePath('');

debug.send({color: 'black'}, JSON.stringify({type: "ACTEST", id: ACID, now: new Date}));