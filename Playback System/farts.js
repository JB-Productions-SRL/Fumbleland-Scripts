(function () {
    var entityUUID, rotations, entProps, count, timer;

    function interval(func, time) {
        var t = {func: func, time: time, id: 0};
        t.id = Script.setInterval(function () {
            t.func();
        }, t.time);
        Script.scriptEnding.connect(function () {
            try {
                Script.clearInterval(t.id);
            } catch (e) {/**/
            }
        });
        return t;
    }


    this.preload = function (entityID) {
        entityUUID = entityID;
        rotations = [{w: 0.999, x: 0, y: 0.035, z: 0}, {w: 0.528, x: 0, y: -0.848, z: 0}, {
            w: 0.781,
            x: 0,
            y: -0.623,
            z: 0
        }, {w: 0.197, x: 0, y: -0.98, z: 0}, {w: 0.926, x: 0, y: -0.375, z: 0}, {
            w: 0.987,
            x: 0,
            y: -0.157,
            z: 0
        }, {w: 0.997, x: 0, y: -0.744, z: 0}, {w: 0.873, x: 0, y: -0.486, z: 0}];
        entProps = Entities.getEntityProperties(entityUUID);
        count = 0;

        timer = interval(function () {
            Entities.addEntity({
                "type": "Model",
                "name": 'LemonFartFart',
                "collisionless": true,
                "modelURL": 'http://vr.fumbleland.com/objects/Flatulence_A_v009.fbx',
                "dimensions": {x: 0.7225, y: 0.6438, z: 0.6698},
                "position": entProps.position,
                "rotation": (rotations[count]),
                "userData": '{"grabbableKey":{"grabbable":false}}',
                "animation": {
                    "currentFrame": 1,
                    "firstFrame": 1,
                    "fps": 20,
                    "lastFrame": 100,
                    "running": true,
                    "url": "http://vr.fumbleland.com/objects/Flatulence_A_v009.fbx"
                },
                "lifetime": 5
            });
            count = count + 1;
            if (count >= 8) {
                Script.clearInterval(timer.id);
            }
        }, 100);
    };
    this.unload = function (entityID) {
        Script.scriptEnding();
    };
});