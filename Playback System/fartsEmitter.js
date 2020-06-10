// updated http://vr.fumbleland.com/scripts/fartsEmitter.js
// written by Fluffy
// patched by humbletim 2020.05.07
(function () {
    var entityUUID, entProps, count, timer;

    var damping = 0.6;
    var lifetime = 30; //in seconds

    this.preload = function (entityID) {
        entityUUID = entityID;
        print('preload', entityUUID);
        timer = interval(function () {
                fart(
                    /*direction of farts (mostly towards the direction the cube is facing on the Z*/
                    {x: (random(0.6)), y: 0, z: (Math.random(0.6)+0.5)},
                    /*offset position of farts randomly*/
                    {x:random(0),y:random(0.5),z:random(0)},
                    /*force upwards*/
                    1);
            },
            /* once a second (1*1000) twice a second (0.5*1000) etc*/
            3.5*1000);
    };

    function random(a) {
        var b = a * 2;
        return Math.random() * b - a;
    }

    function fart(dir,pos,grav) {
        pos = Vec3.sum(pos,{y:1});
        entProps = Entities.getEntityProperties(entityUUID);
        var rail = Entities.addEntity({
            'type': 'Sphere',
            'name': 'FartRail',
            'dimensions': {x: 256, y: 256, z: 256},
            'position': Vec3.sum(entProps.position,pos),
            'rotation': entProps.rotation,
            'userData': '{"grabbableKey":{"grabbable":false}}',
            'lifetime': lifetime,
            'gravity': Vec3.multiplyQbyV(entProps.rotation,dir),
            'velocity': {y:grav},
            'dynamic': true,
            'damping': damping,
            'collisionless': true,
            'visible': false,
            'ignorePickIntersection': true,
            //"shapeType": "simple-hull"
        });
        var t = Entities.addEntity({
            'type': 'Model',
            'name': 'Fart',
            'modelURL': 'http://vr.fumbleland.com/objects/fart10.fbx?0',
            'dimensions': {x: 25, y: 25, z: 25},
            // "animation": {
            //     "currentFrame": 1,
            //     "firstFrame": 1,
            //     "fps": 10,
            //     "lastFrame": 300,
            //     "running": true,
            //     "hold": true,
            //     "url": "http://vr.fumbleland.com/objects/Flatulence_A_v009.fbx"
            // },
            // 'position': Vec3.sum(entProps.position,pos),
            // 'rotation': entProps.rotation,
            localPosition: Vec3.ZERO,
            localRotation: Quat.IDENTITY,
            'userData': '{"grabbableKey":{"grabbable":false}}',
            'lifetime': lifetime,
            // 'gravity': Vec3.multiplyQbyV(entProps.rotation,dir),
            // 'velocity': {y:grav},
            'dynamic': false,
            // 'damping': damping,
            'collisionless': true,
            'parentID': rail,
            //"shapeType": "simple-hull"
        });
    }

    function interval(func, time) {
        var t = {func: func, time: time, id: 0};
        t.id = Script.setInterval(function () {
            t.func();
        }, t.time);
        return t;
    }

    this.unload = function (entityID) {
        try {
            Script.clearInterval(timer.id);
        } catch (e) {/**/
        }
    };
});