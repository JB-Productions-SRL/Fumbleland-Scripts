var controller = Script.require('../controller.js#'+Date.now()),
    actors = controller.actors,
    director = controller.director;

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
    button = tablet.addButton({
        //icon: SVG(),
        text: '(load)\n'+controller.version,
    });
Script.scriptEnding.connect(function() {
    tablet.removeButton(button);
});

actors
    .on('loaded', function(event) {
        button.editProperties({ text: 'loading ['+director.loaded+']' });
    });

director
    .on('ready', function() {
        button.editProperties({ text: 'LOADED ['+director.loaded+']' });
    })
    .on('stopping', function() {
        button.editProperties({ text: 'load\n(stopped)' });
    })
    .on('loading', function() {
        button.editProperties({ text: 'load\n(loading)' });
    });

button.clicked.connect(director, 'load');

try { module.exports = button; } catch(e) {
    // standalone mode -- monitor pingbacks
    controller.on('ping', function(event) {
        console.info('ONPING', event.channel, event.id, event.now);
    });
    director.ping({ script: Script.resolvePath('') });
}
