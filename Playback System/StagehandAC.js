// var debug = Script.require('https://debug.midnightrift.com/files/hifi/debug.min.js');
// debug.connect('fumbleland');

var MESSAGE_CHANNEL_OUT = "Stagehand->Director";

var MESSAGE_CHANNEL_DIRECTOR = "Director->Stagehand";

var MESSAGE_CHANNEL_ACTOR = "Actor->Stagehand";

var ents = {};

var actors = {};

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

function prop(id) {
    var p = {
        id: id,
        setParent: function (uuid, joint, position, rotation) {
            console.log("Ping4!");
            console.log("Ping5! " + uuid + " " + joint + " " + this.id);
            if (uuid === "") {
                console.log("NOUUID");
                var pos = Entities.getEntityProperties(this.id).position;
                console.log("POSITION " + JSON.stringify(pos));
                // console.log(Entities.editEntity(this.id, {"parentID": "", "parentJointIndex": 65535, "position": pos}));
                console.log(Entities.editEntity(this.id, {"script": "(" + generateSource(this.id, uuid, joint, position, rotation) + ")"}));
            } else {
                console.log(Entities.editEntity(this.id, {"script": "(" + generateSource(this.id, uuid, joint, position, rotation) + ")"}));
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

function generateSource(entID, uuid, joint, position, rotation) {
    if (!position) {
        position = {
            "x": 0,
            "y": 0,
            "z": 0
        };
    }
    if (rotation) {
        rotation = Quat.fromVec3Degrees(rotation);
    }
    if (uuid === "") {
        return (function () {
            var d = DATA;
            var pos = Entities.getEntityProperties(d[0]).position;
            Script.setTimeout(function () {
                var pos = Entities.getEntityProperties(d[0]).position;
                Entities.editEntity(d[0], {"parentID": "", "parentJointIndex": 65535,"position": pos});
            }, 10);
        } + '').replace('DATA', JSON.stringify([entID, uuid]));
    } else {
        return (function () {
            var d = DATA;
            var props = {"parentID": d[1], "parentJointIndex": d[2], "localPosition": d[3]};
            if (d[4] !== null) {
                props.localRotation = d[4];
            }
            Entities.editEntity(d[0], props);
        } + '').replace('DATA', JSON.stringify([entID, uuid, joint, position, rotation]));
    }
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
                }
                if (data.action === "PARENT") {

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
                            ents[data.name].setParent(_avatar.sessionUUID, _avatar.getJointIndex(data.jointName), data.jointPosition, data.jointRotation);
                        }
                    } else {
                        var temp = AvatarList.getAvatar(actors[data.target]);
                        ents[data.name].setParent(temp.sessionUUID, temp.getJointIndex(data.jointName), data.jointPosition, data.jointRotation);
                    }
                }
                if (data.action === "UNPARENT") {
                    ents[data.name].setParent("", 65535);
                }
                if (data.action === "EDIT") {
                    ents[data.name].edit(data.props);
                }
                if (data.action === "DELETE") {
                    ents[data.name].del();
                    delete ents[data.name];
                }
            });
        }, time)
    );
}

function messageReceived(chan, msg, id) {
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
                console.log("LOADJSON "+msgJSON.data);
                actors = {};
                timeOuts = [];
                ents = [];
                jsonToLoad = msgJSON.data + "_SH.json";
                playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
            }
            if (msgJSON.cmd === "LOAD") {
                actors = {};
                timeOuts = [];
                ents = [];
                playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());
            }
            if (msgJSON.cmd === "PLAY") {
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
            if (msgJSON.cmd === "STOP") {
                stop();
            }
            if (msgJSON.cmd === "CELLDEATH") {

                Script.setInterval(function () {
                    console.log("I don't care. Stagehand");
                }, 1000);
                console.log("Stagehand CELLDEATH");
                timeout(function () {
                    Script.stop();
                }, 1500);
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

    playbackJSON = Script.require("atp:/PlaybackSystem/" + jsonToLoad + "?" + Date.now());

    Agent.isAvatar = true;
    Avatar.displayName = "Stagehand";
    console.log(Agent.sessionUUID);
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
    console.log(AvatarList.getAvatarIdentifiers());
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