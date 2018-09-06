var buttons = ['load','play','stop','kill'].map(function(n) {
    return Script.require(Script.resolvePath('./buttons/app-fumbleland-'+n+'.js')+'#'+Date.now());
});

Script.require(Script.resolvePath('./buttons/app-fumbleland-loadJSON.js')+'#'+Date.now());

console.info('loaded buttons: ', buttons.map(function(b) { return b.getProperties().text; }));

// set up logging for pingbacks and unhandled event messages
var controller = Script.require('./controller.js#'+Date.now());
controller.on('ping', function(event) {
    console.info('ONPING', event.channel, event.id, event.now);
});
controller.actors.on('message', function(event) {
    console.info(this.channel, JSON.stringify(event, 0, 2));
});
controller.director.on('message', function(event) {
    console.info(this.channel, JSON.stringify(event, 0, 2));
});

// send out a testing ping
controller.ping({ script: Script.resolvePath('') });
