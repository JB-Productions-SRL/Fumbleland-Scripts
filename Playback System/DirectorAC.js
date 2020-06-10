/* var debug = Script.require('https://// debug.midnightrift.com/files/hifi/// debug.min.js');
// debug.connect('fumbleland');*/

var version = "0.9";

var playing = false;

var MESSAGE_CHANNEL_IN = "Actor->Director";

var MESSAGE_CHANNEL_OUT = "Director->Actor";

var MESSAGE_CHANNEL_STAGEHAND = "Director->Stagehand";

var start = Date.now();
var basename = Script.resolvePath('').split(/[#?]/)[0].split('/').pop();
var id = 'director-' + Uuid.generate().match(/\w+/)[0];

Script.resolvePath('').replace(/\bid=([-.\w]+)/, function (_, _id) {
    id = _id;
});

var actorACs = {};

var jsonToLoad = "test.json";

var playbackJSON;

function sendIdentity() {
    Messages.sendMessage('node.identity', JSON.stringify({
        sessionUUID: Agent.sessionUUID,
        script: basename,
        now: Date.now(),
        uptime: (Date.now() - start) / 1000,
    }));
}

var playbackReady = false;

Script.setTimeout(sendIdentity, 1000);

function checkForPlaybackness() {
    var ready = true;
    Object.keys(playbackJSON).forEach(function (layer) {
        if (!playbackJSON[layer].ready) {
            ready = false;
        }
    });
    if (ready) {
        playbackReady = true;
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "OUTPUT", command: "READY", now: new Date
        }));
    }
}

function checkForStoppedness() {
    // debug.send({color: 'black'}, "Ping2");
    var ready = false;
    Object.keys(playbackJSON).forEach(function (layer) {
        if (playbackJSON[layer].ready) {
            // debug.send({color: 'black'}, "Ping3");
            ready = true;
        }
    });
    if (!ready) {
        // debug.send({color: 'black'}, "Ping4");
        playing = false;
        playbackReady = false;
        /* debug.send({color: 'black'}, JSON.stringify({
            type: "OUTPUT", command: "ALLSTOPPED", now: new Date
        }));*/
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "OUTPUT", command: "ALLSTOPPED", now: new Date
        }));
    }
}

var pingLoopTimer = null;

function pingLoop() {
    if (Object.keys(actorACs).length < 1) {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({type: "SessionPing"}));
    } else {
        Script.clearInterval(pingLoopTimer);
        pingLoopTimer = null;
        load();
    }
}

function getActorAt(index) {
    return actorACs[Object.keys(actorACs)[index]];
}

function load() {
    Object.keys(playbackJSON).forEach(function (layer, index) {
        var actor = getActorAt(index);
        actor.status = "LOADING";
        actor.data = playbackJSON[layer];
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "COMMAND",
            id: actor.id,
            cmd: "LOAD",
            data: actor.data
        }));
    });
    Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
        type: "COMMAND",
        cmd: "LOAD",
        playOffset: 0,
        now: new Date
    }));
}

function messageReceived(chan, msg, id) {
    if (chan === MESSAGE_CHANNEL_IN) {
        var msgJSON = JSON.parse(msg);
        if (msgJSON.type === "STATUS") {
            var actor = actorACs[id];
            actor.status = msgJSON.status;
            if (msgJSON.status === "LOADED") {
                actor.data.ready = true;
                checkForPlaybackness();
            }
            if (msgJSON.status === "ERROR") {
                //
            }
            if (msgJSON.status === "STOPPED" && !msgJSON.forced) {

                // debug.send({color: 'black'}, "Ping0");
                if (actorACs[id].layerID !== "NULL") {
                    // debug.send({color: 'black'}, "Ping1");
                    playbackJSON[actorACs[id].layerID].ready = false;
                }
                actorACs[id].status = "UNLOADED";
                actorACs[id].layerID = "NULL";
                checkForStoppedness();
            }
        }
        if (msgJSON.type === "COMMAND") {
            if (msgJSON.cmd === "LOADJSON") {
                console.log("LOADJSON " + msgJSON.data)
                actorACs = {};
                jsonToLoad = msgJSON.data + ".json";

                try {
                    playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
                } catch (e) {
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        id: id,
                        msg: "ERROR", error: e, json: jsonToLoad, now: new Date
                    }));
                }

                Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({type: "SessionPing"}));
                Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
                    type: "COMMAND",
                    cmd: "LOADJSON",
                    data: msgJSON.data
                }));
            }
            if (msgJSON.cmd === "LOAD") {

                try {
                    playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
                } catch (e) {
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        id: id,
                        msg: "ERROR", error: e, json: jsonToLoad, now: new Date
                    }));
                }

                if (Object.keys(actorACs).length < 6) {
                    if (!pingLoopTimer) {
                        pingLoopTimer = Script.setInterval(pingLoop, 1000);
                    }
                } else {
                    load();
                }
            }
            if (msgJSON.cmd === "PLAY") {
                if (playbackReady && !playing) {
                    playing = true;
                    Object.keys(playbackJSON).forEach(function (layer, i) {
                        actorACs[Object.keys(actorACs)[i]].status = "PLAYING";
                        actorACs[Object.keys(actorACs)[i]].layerID = layer;
                        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                            type: "COMMAND",
                            id: actorACs[Object.keys(actorACs)[i]].id,
                            cmd: "PLAY",
                            playOffset: 0,
                            data: playbackJSON[layer], now: new Date
                        }));
                    });
                    Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
                        type: "COMMAND",
                        cmd: "PLAY",
                        playOffset: 0,
                        now: new Date
                    }));
                }
            }
            if (msgJSON.cmd === "STOP") {
                playbackReady = false;
                playing = false;
                Object.keys(actorACs).forEach(function (actorAC) {
                    if (actorACs[actorAC].layerID !== "NULL") {
                        playbackJSON[actorACs[actorAC].layerID].ready = false;
                    }
                    actorACs[actorAC].status = "UNLOADED";
                    actorACs[actorAC].layerID = "NULL";
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "COMMAND",
                        id: actorACs[actorAC].id,
                        cmd: "STOP"
                    }));
                });
                Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
                    type: "COMMAND",
                    cmd: "STOP"
                }));
            }
        }

        if (msgJSON.type === "ReturnPing") {
            if (Object.keys(actorACs).indexOf(msgJSON.id) === -1) {
                actorACs[id] = {id: msgJSON.id, status: "UNLOADED", layerID: "NULL"};
            }
        }
        if (msgJSON.type === "SessionPing") {
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({type: "SessionPing", id: "abc", now: new Date}));
        }
        if (msgJSON.type === "DEBUGCONNECT") {
            // debug.connect('fumbleland');
        }
        if (msgJSON.type === "CELLDEATH") {

            Object.keys(actorACs).forEach(function (actorAC) {
                console.log("Sending CELLDEATH to " + actorACs[actorAC].id + "+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
                Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                    type: "COMMAND",
                    id: actorACs[actorAC].id,
                    cmd: "CELLDEATH"
                }));
            });
            Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
                type: "COMMAND",
                cmd: "CELLDEATH"
            }));
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                type: "DEBUG",
                msg: "KILLINGSELF",
                id: id,
                now: new Date
            }));
            console.log("Director CELLDEATH+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
            Script.setTimeout(function () {
                location.deleteLater();
                Script.stop();
            }, 10000);
        }
    }
}


function init() {

    try {
        playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
    } catch (e) {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: id,
            msg: "ERROR", error: e, now: new Date
        }));
    }

    Messages.subscribe(MESSAGE_CHANNEL_IN);
    Messages.subscribe(MESSAGE_CHANNEL_OUT);
    Messages.messageReceived.connect(messageReceived);

    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
        type: "SessionPing",
        id: id,
        now: new Date,
        init: true, version: version
    }));

    Messages.sendMessage(MESSAGE_CHANNEL_STAGEHAND, JSON.stringify({
        type: "SessionPing",
        id: id,
        now: new Date,
        init: true, version: version
    }));

    Agent.isAvatar = true;
    Script.setTimeout(function () {
        Avatar.position = {x: 0, y: -10, z: 0};
        Agent.isAvatar = false;
    }, 1000);
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

Script.setTimeout(init, 10000); // delay directorAC by 10secs


Script.unhandledException.connect(function (err) {
    try {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: id,
            msg: "ERROR", error: err, now: new Date
        }));
    } catch (e) {
        //
    }
});