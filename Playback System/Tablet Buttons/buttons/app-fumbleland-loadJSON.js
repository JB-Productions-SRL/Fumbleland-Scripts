var MESSAGE_CHANNEL_STAGEHAND = "Actor->Director";

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
var activeButton = tablet.addButton({
    text: "LOADJSON"
});

Script.scriptEnding.connect(function () {
    tablet.removeButton(activeButton);
});

var toggle = function () {
    var text = Window.prompt("Type the name of the JSON here.", "");
    if (!!text) {
        Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
            type: "COMMAND",
            cmd: "LOADJSON",
            data: text
        }));
    }
};

activeButton.clicked.connect(toggle);

Script.scriptEnding.connect(function () {
    activeButton.clicked.disconnect(toggle);
    tablet.removeButton(activeButton);
});