var controller = Script.require('../controller.js#'+Date.now()),
    actors = controller.actors,
    director = controller.director;

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system"),
    button = tablet.addButton({
        //icon: SVG(),
        text: '(kill)\n'+controller.version,
    });
Script.scriptEnding.connect(function() {
    tablet.removeButton(button);
});

function refresh() {
    button.editProperties({
        text: 'KILL\n'+[
            'acks: '+controller._pinged,
            'killed: '+controller._killed,
            'dir: '+controller._directors+'/ act:'+controller._actors,
        ].filter(Boolean).join('\n')
    });
}

director
    .on('ready', refresh);

controller
    .on('killed', refresh)
    .on('director', refresh)
    .on('actor', refresh);

button.clicked.connect(controller, 'kill');

try { module.exports = button; } catch(e) {
    // standalone mode -- monitor pingbacks
    controller.on('ping', function(event) {
        console.info('ONPING', event.channel, event.id, event.now);
    });
    director.ping({ script: Script.resolvePath('') });
}
