var controller = Script.require('../controller.js#'+Date.now()),
    actors = controller.actors,
    director = controller.director;

var CIRCLE = {
    icon: 'data:image/svg+xml;xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g transform="translate(16 32) scale(.75 .75)"><circle cx="64" cy="64" r="64" fill="white"/></g></svg>',
    colorize: function(c) { return this.icon.replace('white', c); },
};

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
    button = tablet.addButton({
        icon: CIRCLE.colorize('#333'),
        text: '(play)\n' + controller.version,
    });
Script.scriptEnding.connect(function() {
    tablet.removeButton(button);
});

controller
    .on('error', function(event) {
        button.editProperties({ icon: CIRCLE.colorize('red') });
        Window.alert(JSON.stringify(event,0,2));
    });

function refreshButton() {
    button.editProperties({ icon: CIRCLE.colorize(director.playing ? 'green' : 'blue'), text: 'PLAY\n['+[director.loaded, director.waiting, director.playing]+']' });
}

actors
    .on('waiting', refreshButton)
    .on('playing', refreshButton);

director
    .on('ready', refreshButton)
    .on('stopping', function() {
        button.editProperties({ icon: CIRCLE.colorize('#333'), text: 'play\n(stopped)' });
    })
    .on('finished', function() {
        button.editProperties({ icon: CIRCLE.colorize('#553'), text: 'play\n(finished)' });
    })
    .on('loading', function() {
        button.editProperties({ icon: CIRCLE.colorize('gray') });
        button.editProperties({ text: 'play\n(loading)' });
    });

button.clicked.connect(director, 'play');

try { module.exports = button; } catch(e) {
    // standalone mode -- monitor pingbacks
    controller.on('ping', function(event) {
        console.info('ONPING', event.channel, event.id, event.now);
    });
    director.ping({ script: Script.resolvePath('') });
}
