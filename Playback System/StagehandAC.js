/* eslint-disable no-redeclare */

var debugMode = false;
var debug;

if (debugMode) {
    debug = Script.require('https://debug.midnightrift.com/files/hifi/debug.min.js');
    debug.connect('fumbleland');
} else {
    debug = {
        send: function (color, msg) {
            // do nothing
        }
    };
}


var MESSAGE_CHANNEL_OUT = "Stagehand->Director";

var MESSAGE_CHANNEL_DIRECTOR = "Director->Stagehand";

var MESSAGE_CHANNEL_ACTOR = "Actor->Stagehand";

var ents = {};

var actors = {};

// Fetches and parses an FST model -- humbletim 2018
function getJointIndex(url, name) {
    function getFST(fst) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fst, false);
        xhr.send();
        if (xhr.status !== 200) {
            throw new Error(xhr.statusText || 'xhr error:' + xhr.status);
        }
        var lines = xhr.responseText.split(/[\r\n]/);
        return lines.reduce(function (out, line) {
            line = line.split(/\s*=\s*/);
            out[line[0]] = line[1];
            return out;
        }, {});
    }

    var fstURL = "http://vr.fumbleland.com/avatars/" + url + ".fst";
    var filename = getFST(fstURL).filename;
    var a = fstURL.substring(0, fstURL.lastIndexOf("/")) + "/" + filename;
    return AnimationCache.getAnimation(a).jointNames.indexOf(name);
}

// End module


function timeout(func, time) {
    var t = {
        func: func,
        time: time,
        id: 0
    };
    t.id = Script.setTimeout(function () {
        t.func();
        Script.clearTimeout(t.id);
    }, t.time);
    return t;
}

function debugLog(msg) {
    if (debugMode) {
        debug.send({color: 'black'}, msg);
    }
}

function prop(id) {
    var p = {
        id: id,
        setParent: function (uuid, joint, position, rotation) {
            rotation = Quat.fromVec3Degrees(rotation);
            debugLog("Ping4!");
            debugLog("Ping5! " + uuid + " " + joint + " " + this.id);
            if (uuid === "") {
                debugLog("NOUUID");
                var pos = Entities.getEntityProperties(this.id).position;
                debugLog("POSITION " + JSON.stringify(pos));
                debugLog(Entities.editEntity(this.id, {"parentID": "", "parentJointIndex": 65535, "position": pos}));
                // debugLog(Entities.editEntity(this.id, {"serverScripts": "(" + generateSource(this.id, uuid, joint, position, rotation) + ")"}));
            } else {
                debug.send({color: 'black'}, "Ping1");
                debugLog(Entities.editEntity(this.id, {
                    "parentID": uuid,
                    "parentJointIndex": joint,
                    "localPosition": position,
                    "localRotation": rotation
                }));
                timeout(function () {
                    Entities.editEntity(this.id, {
                        "localPosition": position,
                        "localRotation": rotation
                    });
                }, 100);
                debugLog(JSON.stringify({
                    "parentID": uuid,
                    "parentJointIndex": joint,
                    "localPosition": position,
                    "localRotation": rotation
                }));
                debug.send({color: 'black'}, "Ping2");
                // debugLog(Entities.editEntity(this.id, {"serverScripts": "(" + generateSource(this.id, uuid, joint, position, rotation) + ")"}));
            }

        },
        edit: function (props) {
            Entities.editEntity(this.id, props);
        },
        del: function () {
            Entities.deleteEntity(this.id);
        }
    };
    return p;
}

var jsonToLoad = "test_SH.json";

var playbackJSON;

var timeOuts = [];

function t1(set, time) {
    timeOuts.push(
        timeout(function () {
            set.forEach(function (data) {
                if (data.action === "REZ") {
                    ents[data.name] = prop(Entities.addEntity(data.props));
                } else if (data.action === "PARENT") {

                    if (!actors[data.target]) {
                        var avatars = AvatarList.getAvatarIdentifiers();
                        var found = false;
                        var _avatar = null;
                        avatars.forEach(function (avatar) {
                            var temp = AvatarList.getAvatar(avatar);
                            if (!found && temp.displayName.toLowerCase() === data.target.toLowerCase()) {
                                _avatar = temp;
                                found = true;
                            }
                        });
                        if (found) {
                            ents[data.name].setParent(_avatar.sessionUUID, data.jointIndex, data.jointPosition, data.jointRotation);
                        }
                    } else {
                        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                            type: "DEBUG",
                            id: "Stagehand",
                            msg: "DEBUG", debug: data, now: new Date
                        }));
                        var temp = AvatarList.getAvatar(actors[data.target]);

                        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                            type: "DEBUG",
                            id: "Stagehand",
                            msg: "DEBUG2", debug: {"data.jointIndex": data.jointIndex}, now: new Date
                        }));

                        ents[data.name].setParent(temp.sessionUUID, data.jointIndex, data.jointPosition, data.jointRotation);
                    }
                } else if (data.action === "UNPARENT") {
                    ents[data.name].setParent("", 65535);
                } else if (data.action === "EDIT") {
                    ents[data.name].edit(data.props);
                } else if (data.action === "DELETE") {
                    ents[data.name].del();
                    delete ents[data.name];
                }
            });
        }, time)
    );
}

function messageReceived(chan, msg) {
    if (chan === MESSAGE_CHANNEL_ACTOR) {
        var msgJSON = JSON.parse(msg);
        if (msgJSON.type === "COMMAND") {
            if (msgJSON.cmd === "ADDACTOR") {
                actors[msgJSON.name] = msgJSON.id;
            }
        }
    }
    if (chan === MESSAGE_CHANNEL_DIRECTOR) {
        var msgJSON = JSON.parse(msg);
        if (msgJSON.type === "COMMAND") {
            if (msgJSON.cmd === "LOADJSON") {
                debugLog("LOADJSON " + msgJSON.data);
                actors = {};
                timeOuts = [];
                ents = [];
                jsonToLoad = msgJSON.data + "_SH.json";

                try {
                    playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
                } catch (e) {
                    playbackJSON = false;
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        id: "Stagehand",
                        msg: "ERROR", error: e, now: new Date
                    }));
                }
            }
            if (msgJSON.cmd === "LOAD") {
                actors = {};
                timeOuts = [];
                ents = [];

                try {
                    playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
                } catch (e) {
                    playbackJSON = false;
                    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                        type: "DEBUG",
                        id: "Stagehand",
                        msg: "ERROR", error: e, now: new Date
                    }));
                }
            }
            if (msgJSON.cmd === "PLAY" && playbackJSON != false) {
                timeOuts = [];
                ents = [];
                var list = Object.keys(playbackJSON);
                list.forEach(function (a) {
                    t1(playbackJSON[a], a);
                });

                timeOuts.push(
                    timeout(function () {
                        stop();
                    }, list[list.length - 1] + 500)
                );
            }
            if (msgJSON.cmd === "STOP" && playbackJSON != false) {
                stop();
            }
            if (msgJSON.cmd === "CELLDEATH" || msgJSON.cmd === "CELLDEATHSTAGEHAND") {

                timeout(function () {
                    debugLog("Stagehand CELLDEATH");
                    Script.stop();
                }, 3000);
                Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                    type: "DEBUG",
                    msg: "KILLINGSELF",
                    id: "Stagehand",
                    now: new Date
                }));
                stop();
                // STOP DAMNIT!
            }
        }
        if (msgJSON.type === "SessionPing") {
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                type: "ReturnPing",
                id: "Stagehand",
                now: new Date
            }));
            // debug.send({color: 'black'}, JSON.stringify({type: "ReturnPing", id: "Stagehand", now: new Date}));
        }
    }
}

function stop() {
    Object.keys(ents).forEach(function (a) {
        ents[a].del();
    });
    Object.keys(timeOuts).forEach(function (a) {
        // debug.send({color: 'black'},JSON.stringify(a));
        Script.clearTimeout(timeOuts[a].id);
    });
    timeOuts = [];
    ents = [];
}


function init() {

    try {
        playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
    } catch (e) {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: "Stagehand",
            msg: "ERROR", error: e, now: new Date
        }));
    }

    Agent.isAvatar = true;
    debugLog(Agent.sessionUUID);
    var uuid = Agent.sessionUUID;
    Script.setInterval(function () {
        if (Agent.sessionUUID !== uuid) {
            Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                type: "DEBUG",
                msg: "KILLINGSELF",
                id: "Stagehand",
                now: new Date
            }));
            timeout(function () {
                Script.stop();
            }, 1500);
        }
    }, 1000);
    Messages.subscribe(MESSAGE_CHANNEL_DIRECTOR);
    Messages.subscribe(MESSAGE_CHANNEL_ACTOR);
    Messages.subscribe(MESSAGE_CHANNEL_OUT);
    Messages.messageReceived.connect(messageReceived);
    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
        type: "ReturnPing",
        id: "Stagehand",
        now: new Date,
        init: true
    }));
    debug.send({color: 'black'}, JSON.stringify({type: "STAGEHANDINIT", id: "Stagehand", now: new Date}));

    Avatar.skeletonModelURL = "https://highfidelity.com/api/v1/commerce/entity_edition/7fe80a1e-f445-4800-9e89-40e677b03bee.fst";
    Avatar.displayName = "Stagehand";
    Avatar.position = {x: 0, y: -10, z: 0};
    debugLog(AvatarList.getAvatarIdentifiers());
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

timeout(init, 10000);

Script.unhandledException.connect(function (err) {
    try {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: "Stagehand",
            msg: "ERROR", error: err, now: new Date
        }));
    } catch (e) {
        //
    }
});