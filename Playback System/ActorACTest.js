//var debug = Script.require('https://debug.midnightrift.com/files/hifi/debug.min.js');
//debug.connect('fumbleland');

var MESSAGE_CHANNEL_STAGEHAND = "Actor->Stagehand";

var MESSAGE_CHANNEL_OUT = "Actor->Director";

var MESSAGE_CHANNEL_IN = "Director->Actor";

var ACID = 'actor-' + Uuid.generate().match(/\w+/)[0];

Script.resolvePath('').replace(/\bid=([-.\w]+)/, function (_, _id) {
    ACID = _id + "-" + Date.now();
});

var playbackData = null;

var stopRecordingTimer = null;

var playTimeout;

Script.unhandledException.connect(function (err) {
    try {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: ACID,
            msg: "ERROR", error: err, now: new Date
        }));
    } catch (e) {
        //
    }
});

function stopRecording(force) {

    var dataCheck = false;
    if (playbackData !== null) {
        dataCheck = (Recording.playerElapsed() > (playbackData.endTrim / 1000) && playbackData.endTrim > 1);
    }

    if (force || !Recording.isPlaying() || dataCheck) {
        // debug.send({color: 'blue'}, "playback END" + force + "," + !Recording.isPlaying() + "," + dataCheck);
        playbackData = null;
        if (playTimeout) {
            Script.clearTimeout(playTimeout);
            playTimeout = null;
        }
        if (Recording.isPlaying()) {
            Recording.stopPlaying();
        }
        if (stopRecordingTimer) {
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                type: "STATUS",
                id: ACID,
                status: "STOPPED",
                forced: force
            }));
            // debug.send({color: 'black'}, JSON.stringify({type: "STATUS", id: ACID, status: "STOPPED", forced: force}));
            Script.clearInterval(stopRecordingTimer);
            stopRecordingTimer = null;
        }
        Avatar.position = {x: 0, y: -10, z: 0};
        Agent.isAvatar = false;
    }
}

function loaded(successful) {
    if (successful) {
        // debug.send({color: 'black'}, JSON.stringify({type: "STATUS", id: ACID, status: "LOADED"}));
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({type: "STATUS", id: ACID, status: "LOADED"}));
    } else {
        // debug.send({color: 'red'}, JSON.stringify({type: "STATUS", id: ACID, status: "ERROR"}));
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "STATUS",
            id: ACID,
            status: "ERROR",
            playbackData: playbackData
        }));
    }
}

function play() {
    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
        type: "DEBUG",
        id: ACID,
        msg: "PLAYING", now: new Date
    }));
    Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
        type: "COMMAND",
        cmd: "ADDACTOR",
        id: Agent.sessionUUID,
        name: playbackData.name
    }));
    /* debug.send({color: 'black'}, JSON.stringify({
        type: "DEBUG",
        id: ACID,
        msg: "PLAYING", now: new Date
    }));*/
    Users.disableIgnoreRadius();

    Agent.isAvatar = true;
    Avatar.skeletonModelURL = "https://highfidelity.com/api/v1/commerce/entity_edition/7fe80a1e-f445-4800-9e89-40e677b03bee.fst";
    Avatar.scale = 1;

    AvatarList.getAvatarIdentifiers().forEach(function (id) {
        Users.ignore(id, true);
        Script.setTimeout(function () {
            Users.ignore(id, false);
            Avatar.sendIdentityPacket();
        }, 250);
    });

    Recording.setPlayerUseDisplayName(true);
    Recording.setPlayFromCurrentLocation(false);
    Recording.setPlayerUseHeadModel(false);
    Recording.setPlayerUseAttachments(true);
    Recording.setPlayerLoop(false);
    Recording.setPlayerUseSkeletonModel(true);

    Recording.setPlayerTime(playbackData.startTrim / 1000);
    // debug.send({color: 'blue'}, "playbackData.startTrim " + playbackData.startTrim);
    Recording.startPlaying();
    Avatar.setBlendshape("JawOpen", 0);
    Avatar.setBlendshape("LipsFunnel", 0);
    if (stopRecordingTimer) {
        Script.clearInterval(stopRecordingTimer);
        stopRecordingTimer = null;
    }
    stopRecordingTimer = Script.setInterval(stopRecording, 100);
}

function messageReceived(chan, msg, id) {
    if (chan === MESSAGE_CHANNEL_IN) {
        var msgJSON = JSON.parse(msg);
        if (msgJSON.type === "COMMAND") {
            if (msgJSON.id === ACID) {
                if (msgJSON.cmd === "LOAD") {
                    if (playbackData !== null) {
                        stopRecording(true);
                        playbackData = null;
                    }
                    playbackData = msgJSON.data;
                    Recording.loadRecording(playbackData.url + "?" + Date.now(), loaded);
                }
                if (msgJSON.cmd === "PLAY" && !Recording.isPlaying() && playbackData && !playTimeout) {
                    if (playbackData.timeOffset > 0) {
                        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                            type: "DEBUG",
                            id: ACID,
                            msg: "WAITING", now: new Date
                        }));
                        /* debug.send({color: 'black'}, JSON.stringify({
                            type: "DEBUG",
                            id: ACID,
                            msg: "WAITING", now: new Date
                        }));*/
                        playTimeout = Script.setTimeout(play, playbackData.timeOffset);
                    } else {
                        play();
                    }
                    // play
                }
                if (msgJSON.cmd === "STOP") {
                    stopRecording(true);
                    // STOP
                }
            }
            if (msgJSON.cmd === "CELLDEATH") {
                if (msgJSON.id === ACID) {
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        msg: "KILLINGSELF",
                        id: ACID,
                        now: new Date
                    }));
                    Script.setTimeout(function () {
                        Avatar.getAbsoluteJointTranslationInObjectFrame(0);
                        Script.stop();
                    }, 1500);
                } else if (msgJSON.id.replace(/-[0-9]+$/, '') === ACID.replace(/-[0-9]+$/, '')) {
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        msg: "INVALID CELLDEATH ID! " + msgJSON.id,
                        id: ACID,
                        now: new Date
                    }));
                }
                // STOP DAMNIT!
            }
        }
        if (msgJSON.type === "SessionPing") {

            Agent.isAvatar = true;
            Avatar.position = {x: 0, y: -10, z: 0};
            Script.setTimeout(function () {
                Avatar.position = {x: 0, y: -10, z: 0};
                Agent.isAvatar = false;
            }, 1000);

            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({type: "ReturnPing", id: ACID, now: new Date}));
            // debug.send({color: 'black'}, JSON.stringify({type: "ReturnPing", id: ACID, now: new Date}));
        }
    }
}


function init() {
    var uuid = Agent.sessionUUID;
    Agent.isAvatar = true;
    Avatar.position = {x: 0, y: -10, z: 0};
    Script.setTimeout(function () {
        Avatar.position = {x: 0, y: -10, z: 0};
        Agent.isAvatar = false;
    }, 1000);

    Script.setInterval(function () {
        if (Agent.sessionUUID !== uuid) {
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                type: "DEBUG",
                msg: "KILLINGSELF",
                id: ACID,
                now: new Date
            }));
            Script.setTimeout(function () {
                Avatar.getAbsoluteJointTranslationInObjectFrame(0);
                Script.stop();
            }, 1500);
        }
    }, 1000);
    Messages.subscribe(MESSAGE_CHANNEL_IN);
    Messages.subscribe(MESSAGE_CHANNEL_OUT);
    Messages.messageReceived.connect(messageReceived);
    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
        type: "ReturnPing",
        id: ACID,
        now: new Date,
        init: true
    }));
    // debug.send({color: 'black'}, JSON.stringify({type: "ACTORINIT", id: ACID, now: new Date}));
}

function shutdown() {
    try {
        Messages.messageReceived.disconnect(messageReceived);
    } catch (e) {
        // empty
    }

}

Script.scriptEnding.connect(function () {
    shutdown();
});

Script.resolvePath('').replace(/\bid=(\w+)/, function (_, id) {
    print('id:', id);
});

Script.setTimeout(init, 10000);


var port = 49975;

var _ws;

if (isFinite(port)) {
    print('>>> starting WebSocketServer on port', port);
    try {
        var wss = new WebSocketServer({port: port, serverName: "RoombaWS"});
        wss.newConnection.connect(function (ws) {
            _ws = ws;
            print('socket connected', ws.url);

            print(Object.keys(ws).sort().join('\n'));

            log("Roomba Connected!", true, false);
            ws.onmessage = function (event) {
                console.log(JSON.stringify(event));
                onMessage(ws, event.data);
            };
        });
        print('WebSocketServer:' + wss, wss.url, JSON.stringify(wss));
    } catch (e) {
        print('ERROR:' + e);
    }
}

function log(message, debug, verbose) {
    // var message = [].slice.call(arguments).join(' ');
    if (verbose) {
        console.log(message); // print to AC log
    }
    _ws && _ws.send(JSON.stringify({type: 'log', message: message, "debug": debug})); // log to last connected socket
}


function onMessage(ws, message) {
    log(message, false, true);
    log(JSON.stringify(message), false, true);
    var jsonData = JSON.parse(message);
    if (!jsonData.user) {
        return;
    } else if (jsonData.user !== "Fluffy") {
        return;
    }

    if (jsonData.msg === "KILL") {
        log("Roomba kill command received!", true, true);
        Script.stop();
    }

    if (jsonData.msg === "console") {
        var result = "error";

        try {
            log("cmd " + jsonData.cmd, true, true);
            result = eval(jsonData.cmd);
        } catch (e) {
            result = e;
        }
        if (result !== undefined) {
            result = result.toString();
        }
        log(result, false, true);
        _ws && _ws.send(JSON.stringify({"type": "console", "result": result})); // log to last connected socket
    }
}