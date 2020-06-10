var ROOT = Script.resolvePath('').split("guidePlayer.js")[0];

var appHTML = ROOT + "guidePlayer.html";
var appUUID = Uuid.generate();

var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
var button = tablet.addButton({
    text: "guidePlayer"
});

var textProps = {
    "type": "Text",
    "name": "PlayerLocation",
    "dimensions": {
        "x": 1.2760,
        "y": 0.7992,
        "z": 0.009999999776482582
    },
    "grab": {
        "grabbable": false
    },
    "collisionless": true,
    "billboardMode": "yaw",
    "text": "Guide Player",
    "lineHeight": 0.25,
    "unlit": true,
    "faceCamera": true,
    "isFacingAvatar": false,
    "lifetime": 18000
};

var guideURL = Settings.getValue("guidePlayer/url", "");
var textID = "";
var soundInjector = null;
var volume = Settings.getValue("guidePlayer/volume", 0.2);
var sound;
var playerState = 0;

Script.scriptEnding.connect(function () { // So if anything errors out the tablet/toolbar button gets removed!
    tablet.removeButton(button);
});

var isOpen = false;

function onClicked() {
    if (isOpen) {
        tablet.gotoHomeScreen();
    } else {
        tablet.gotoWebScreen(appHTML + "?appUUID=" + appUUID + "&" + Date.now(), {});
    }
}

function onScreenChanged(type, url) {
    isOpen = (url === appHTML);
}

button.clicked.connect(onClicked);
tablet.screenChanged.connect(onScreenChanged);

function init() {
    sound = SoundCache.getSound(guideURL);
    try {
        tablet.webEventReceived.connect(onWebEventReceived);
    } catch (e) {
        print("connectWebHandler: error connecting: " + e);
    }
}

function emitScriptEvent(obj) {
    obj.appUUID = appUUID;
    tablet.emitScriptEvent(JSON.stringify(obj));
}

function setText(volume, playerState) {
    emitScriptEvent({type: "CMD", cmd: "playerState", playerState: playerState});
    emitScriptEvent({type: "CMD", cmd: "volume", volume: volume});
    if (textID === "") {
        return;
    }
    var state = "Stopped";
    if (playerState === 1) {
        state = "Playing";
    }
    Entities.editEntity(textID, {"text": "Guide Player\nVolume:" + (volume * 5).toFixed(2) + "\n" + state});
}

function play() {
    if (soundInjector === null && textID !== "") {
        playerState = 1;
        soundInjector = Audio.playSound(sound, {
            position: textProps.position,
            volume: volume,
            loop: true
        });
        setText(volume, playerState);
    }
}

function onWebEventReceived(event) {
    event = JSON.parse(event);
    if (event.appUUID === appUUID) {
        if (event.type === "ready") {
            emitScriptEvent({type: "CMD", cmd: "guideURL", url: guideURL});
            setText(volume, playerState);
        }
        if (event.type === "CMD") {
            console.log("PING!");
            if (event.cmd === "guideURL") {
                var url = Window.prompt("Please paste guide url", guideURL);
                if (url !== null) {
                    guideURL = url.trim();
                    sound = SoundCache.getSound(guideURL);
                    Settings.setValue("guidePlayer/url", guideURL);
                    emitScriptEvent({type: "CMD", cmd: "guideURL", url: guideURL});
                }
            }
            if (event.cmd === "setPos") {
                if (textID !== "") {
                    Entities.deleteEntity(textID);
                }
                textProps.position = Vec3.sum(MyAvatar.getJointPosition(MyAvatar.getJointIndex("Head")), {y: 1});
                var state = "Stopped";
                if (playerState === 1) {
                    state = "Playing";
                }
                var text = "Guide Player\nVolume:" + (volume * 5).toFixed(2) + "\n" + state;
                textProps.text = text;
                textID = Entities.addEntity(textProps, "avatar");
                if (soundInjector !== null) {
                    soundInjector.setOptions({position: textProps.position, volume: volume});
                }
            }
            if (event.cmd === "clearPos") {
                if (textID !== "") {
                    Entities.deleteEntity(textID);
                    textID = "";
                }
                if (soundInjector !== null) {
                    playerState = 0;
                    soundInjector.stop();
                    soundInjector = null;
                }
                setText(volume, playerState);
            }
            if (event.cmd === "play") {
                play();
            }
            if (event.cmd === "stop") {
                if (soundInjector !== null) {
                    playerState = 0;
                    soundInjector.stop();
                    soundInjector = null;
                    setText(volume, playerState);
                }
            }
            if (event.cmd === "replay") {
                if (soundInjector !== null) {
                    soundInjector.stop();
                    soundInjector = null;
                    play();
                }
            }
            if (event.cmd === "volUp") {
                volume += 0.01;
                if (volume > 0.2) {
                    volume = 0.2;
                }
                console.log("volume", volume);
                Settings.setValue("guidePlayer/volume", volume);
                if (soundInjector !== null) {
                    soundInjector.setOptions({volume: volume});
                }
                setText(volume, playerState);
            }
            if (event.cmd === "volDown") {
                volume -= 0.01;
                if (volume < 0) {
                    volume = 0;
                }
                console.log("volume", volume);
                Settings.setValue("guidePlayer/volume", volume);
                if (soundInjector !== null) {
                    soundInjector.setOptions({volume: volume});
                }
                setText(volume, playerState);
            }
        }
    }
}

function shutdown() {
    if (textID !== "") {
        Entities.deleteEntity(textID);
    }
    if (soundInjector !== null) {
        soundInjector.stop();
    }
    try {
        tablet.webEventReceived.disconnect(onWebEventReceived);
    } catch (e) {
        print("disconnectWebHandler: error disconnecting web handler: " + e);
    }
    button.clicked.disconnect(onClicked);
    tablet.screenChanged.disconnect(onScreenChanged);
}

init();

Script.scriptEnding.connect(shutdown);
