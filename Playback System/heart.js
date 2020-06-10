(function () {
    var entityUUID, entProps, count, timer;

    function random(a) {
        var b = a * 2;
        return Math.random() * b - a;
    }

    function heart(dir) {
        entProps = Entities.getEntityProperties(entityUUID);
        Entities.addEntity({
            'type': 'Model',
            'name': 'Heart',
            'modelURL': 'http://vr.fumbleland.com/objects/Cartoon_heart_v003.fbx?1',
            'dimensions': {x: 0.09, y: 0.09, z: 0.06},
            'position': entProps.position,
            'rotation': entProps.rotation,
            'userData': '{"grabbableKey":{"grabbable":false}}',
            'lifetime': 2,
            'velocity': dir,
            'dynamic': true
        });
        count = count + 1;
        if (count >= 10) {
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
            heart({x: (random(0.6)), y: 0.6, z: (random(0.6))});
        }, 200);
    };
    this.unload = function (entityID) {
        Script.scriptEnding();
    };
});