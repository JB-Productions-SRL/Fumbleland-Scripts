var controller = Script.require('../controller.js#'+Date.now()),
    actors = controller.actors,
    director = controller.director;

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
    button = tablet.addButton({
        //icon: SVG(),
        text: '(stop)\n'+controller.version,
    });
Script.scriptEnding.connect(function() {
    tablet.removeButton(button);
});

director
    .on('ready', function(event) {
        button.editProperties({ text: 'STOP ['+director.loaded+']' });
    })
    .on('stopping', function() {
        button.editProperties({ text: 'stop\n(stopped)' });
    })
    .on('loading', function() {
        button.editProperties({ text: 'stop\n(loading)' });
    });

button.clicked.connect(director, 'stop');

try { module.exports = button; } catch(e) {
    // standalone mode -- monitor pingbacks
    controller.on('ping', function(event) {
        console.info('ONPING', event.channel, event.id, event.now);
    });
    director.ping({ script: Script.resolvePath('') });
}
