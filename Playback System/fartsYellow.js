(function () {
    var entityUUID, entProps, count, timer;

    function random(a) {
        var b = a * 2;
        return Math.random() * b - a;
    }

    function heart(dir) {
        entProps = Entities.getEntityProperties(entityUUID);
        var t = Entities.addEntity({
            'type': 'Model',
            'name': 'Heart',
            'modelURL': 'http://vr.fumbleland.com/objects/Flatulence_A_v009.fbx',
            'dimensions': {x: 0.3880, y: 0.3457, z: 0.3597},
            "animation": {
                "currentFrame": 1,
                "firstFrame": 1,
                "fps": 20,
                "lastFrame": 100,
                "running": true,
                "hold": true,
                "url": "http://vr.fumbleland.com/objects/Flatulence_A_v009.fbx"
            },
            'position': entProps.position,
            'rotation': entProps.rotation,
            'userData': '{"grabbableKey":{"grabbable":false}}',
            'lifetime': 5,
            'gravity': {'x': 0, 'y': 1, 'z': 0},
            'velocity': dir,
            'dynamic': true,
            'damping': 0.6,
            'collisionless': true,
            "shapeType": "simple-hull"
        });
        count = count + 1;
        if (count >= 10) {

            // Script.clearInterval(timer.id);
            Entities.deleteEntity(entityUUID);
        }
    }

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
        count = 0;
        timer = interval(function () {
            heart({x: (random(0.6)), y: -1.6, z: (random(0.6))});
        }, 400);
    };
    this.unload = function (entityID) {
        Script.scriptEnding();
    };
});