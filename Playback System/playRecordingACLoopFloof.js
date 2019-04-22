//
//  playRecordingAC.js
//
//  Created by David Rowe on 7 Apr 2017.
//  Copyright 2017 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

var MESSAGE_CHANNEL_OUT = "Director->Actor";

Script.unhandledException.connect(function (err) {
    try {
        Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
            type: "DEBUG",
            id: "RECORDERPLAYBACK",
            msg: "ERROR", error: err, now: new Date
        }));
    } catch (e) {
        //
    }
});

var APP_NAME = "PLAYBACK",
    HIFI_RECORDER_CHANNEL = "HiFi-Recorder-Channel",
    RECORDER_COMMAND_ERROR = "error",
    HIFI_PLAYER_CHANNEL = "HiFi-Player-Channel",
    PLAYER_COMMAND_PLAY = "play",
    PLAYER_COMMAND_STOP = "stop",
    heartbeatTimer = null,
    HEARTBEAT_INTERVAL = 3000,
    scriptUUID,

    Player;

function log(message) {
    print(APP_NAME + " " + scriptUUID + ": " + message);
}

Player = (function () {
    // Recording playback functions.
    var userID = null,
        isPlayingRecording = false,
        recordingFilename = "",
        autoPlayTimer = null,
        playRecording;

    function error(message) {
        // Send error message to user.
        Messages.sendMessage(HIFI_RECORDER_CHANNEL, JSON.stringify({
            command: RECORDER_COMMAND_ERROR,
            user: userID,
            message: message
        }));
    }

    function play(user, recording, position, orientation) {


        userID = user;

        log("Play recording " + recording);
        isPlayingRecording = true; // Immediate feedback.
        recordingFilename = recording;
        playRecording(recordingFilename, position, orientation, true);
    }

    playRecording = function (recording, position, orientation, isManual) {
        Recording.loadRecording(recording, function (success) {
            var errorMessage;

            if (success) {
                Users.disableIgnoreRadius();

                Agent.isAvatar = true;
                Avatar.skeletonModelURL = "https://highfidelity.com/api/v1/commerce/entity_edition/7fe80a1e-f445-4800-9e89-40e677b03bee.fst";
                Avatar.scale = 1;

                Recording.setPlayerUseDisplayName(true);
                Recording.setPlayFromCurrentLocation(false);
                Recording.setPlayerUseHeadModel(false);
                Recording.setPlayerUseAttachments(true);
                Recording.setPlayerLoop(true);
                Recording.setPlayerUseSkeletonModel(true);

                Recording.setPlayerTime(0);
                // debug.send({color: 'blue'}, "playbackData.startTrim " + playbackData.startTrim);
                Recording.startPlaying();
                Avatar.setBlendshape("JawOpen", 0);
                Avatar.setBlendshape("LipsFunnel", 0);

                UserActivityLogger.logAction("playRecordingAC_play_recording");
            } else {

                Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
                    type: "STATUS",
                    id: "recorderPlayback",
                    status: "ERROR",
                    playbackData: {"error":"Recording failed to load!","file":recording}
                }));

                errorMessage = "Could not load recording " + recording.slice(4); // Remove leading "atp:".
                log(errorMessage);
                error(errorMessage);

                isPlayingRecording = false;
                recordingFilename = "";
            }
        });
    };

    function stop() {
        log("Stop playing " + recordingFilename);

        if (Recording.isPlaying()) {
            Recording.stopPlaying();
            Avatar.position = {x: 0, y: -10, z: 0};
            Agent.isAvatar = false;
        }
        isPlayingRecording = false;
        recordingFilename = "";


        Agent.isAvatar = true;
        Avatar.position = {x: 0, y: -10, z: 0};
        Script.setTimeout(function () {
            Agent.isAvatar = false;
        }, 1000);
    }

    function isPlaying() {
        return isPlayingRecording;
    }

    function recording() {
        return recordingFilename;
    }

    function tearDown() {
        if (autoPlayTimer) {
            Script.clearTimeout(autoPlayTimer);
            autoPlayTimer = null;
        }
    }

    return {
        play: play,
        stop: stop,
        isPlaying: isPlaying,
        recording: recording,
        tearDown: tearDown
    };
}());

function sendHeartbeat() {
    Messages.sendMessage(HIFI_RECORDER_CHANNEL, JSON.stringify({
        playing: Player.isPlaying(),
        recording: Player.recording()
    }));
}

function onHeartbeatTimer() {
    sendHeartbeat();
    heartbeatTimer = Script.setTimeout(onHeartbeatTimer, HEARTBEAT_INTERVAL);
}

function startHeartbeat() {
    onHeartbeatTimer();
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        Script.clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function onMessageReceived(channel, message, sender) {
    if (channel !== HIFI_PLAYER_CHANNEL) {
        return;
    }

    message = JSON.parse(message);
    if (message.player === scriptUUID) {
        switch (message.command) {
            case PLAYER_COMMAND_PLAY:
                if (!Player.isPlaying()) {
                    Player.play(sender, message.recording, message.position, message.orientation);
                } else {
                    log("Didn't start playing " + message.recording + " because already playing " + Player.recording());
                }
                sendHeartbeat();
                break;
            case PLAYER_COMMAND_STOP:
                Player.stop();
                sendHeartbeat();
                break;
        }
    }
}

function debug(msg){

    Messages.sendMessage(MESSAGE_CHANNEL_OUT, JSON.stringify({
        type: "DEBUG",
        id: "acRec",
        msg: "ERROR", error: {"message":msg}, now: new Date
    }));
}

function setUp() {

    scriptUUID = Agent.sessionUUID;

    Messages.messageReceived.connect(onMessageReceived);
    Messages.subscribe(HIFI_PLAYER_CHANNEL);

    startHeartbeat();

    UserActivityLogger.logAction("playRecordingAC_script_load");


    Agent.isAvatar = true;
    Avatar.position = {x: 0, y: -10, z: 0};
    Script.setTimeout(function () {
        Agent.isAvatar = false;
    }, 1000);
}

function tearDown() {
    stopHeartbeat();
    Player.stop();

    Messages.messageReceived.disconnect(onMessageReceived);
    Messages.unsubscribe(HIFI_PLAYER_CHANNEL);

    Player.tearDown();
}

setUp();
Script.scriptEnding.connect(tearDown);