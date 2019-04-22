var ents = Entities.findEntities(Camera.position, 20);

var propsToChange = {
    "visible": false
// locked: true
};

var partialMatch = true;

var namePartialToMatch = "Kasen";
var urlPartialToMatch = "";
var overrideLocked = true;

var moveOffset = {x: 0, y: 0, z: 0};

ents.forEach(function (value) {
    var entProps = Entities.getEntityProperties(value);
    if (partialMatch) {
        if (entProps.name.toLowerCase().search(namePartialToMatch.toLowerCase()) !== -1 && namePartialToMatch !== "") {
//            print("Changed by name");
            changeProps(value, entProps);
        }
        if (entProps.modelURL) {
            if (entProps.modelURL.toLowerCase().search(urlPartialToMatch.toLowerCase()) !== -1 && urlPartialToMatch !== "") {
//                print("Changed by url");
                changeProps(value, entProps);
            }
        }
    } else {
//        print("Changed by all");
        changeProps(value, entProps);
    }
});

function changeProps(uuid, entProps) {
    if (overrideLocked && entProps.locked) {
        Entities.editEntity(uuid, {locked: false});
    }
    if (Vec3.length(moveOffset) > 0) {
        propsToChange.position = Vec3.sum(entProps.position, moveOffset);
    }
    Entities.editEntity(uuid, propsToChange);
    if (overrideLocked && entProps.locked) {
        Script.setTimeout(function () {
            Entities.editEntity(uuid, {locked: true});
        }, 100);
    }
}


var ents = Entities.findEntitiesByName("PPencil!", Camera.position, 10000000);
var props = [];
ents.forEach(function (value, a, b) {
    var entProps = Entities.getEntityProperties(value);

    var obj = {
        "name": "Pencil" + a,
        "action": "REZ",
        "props": {
            "dimensions": entProps.dimensions,
            "lifetime": 300,
            "modelURL": entProps.modelURL,
            "name": entProps.name,
            "position": entProps.position,
            "rotation": entProps.rotation,
            "type": "Model",
            "userData": "{\"grabbableKey\":{\"grabbable\":false}}"
        }
    };

    props.push(obj);

});


print(JSON.stringify(props));

JSON.stringify(Script.require("atp:/PlaybackSystem/0305.json?" + Date.now()));

function rezPosition(CREATE_DISTANCE) {
    var position;
    if (Camera.mode === "entity" || Camera.mode === "independent") {
        position = Vec3.sum(Camera.position, Vec3.multiply(Quat.getForward(Camera.orientation), CREATE_DISTANCE));
    } else {
        position = Vec3.sum(MyAvatar.position, Vec3.multiply(Quat.getForward(MyAvatar.orientation), CREATE_DISTANCE));
        position.y += 0.5;
    }
    return position;
}

function importEntity(props, local) {
    local = local ? true : props.clientOnly;
    if (props.parentJointIndex) {
        var type = typeof props.parentJointIndex;
        if (type === "string") {
            props.parentJointIndex = MyAvatar.getJointIndex(props.parentJointIndex);
        }
    }
    if (props.rotation) {
        props.rotation = Quat.getForward(Camera.orientation);
    }
    if (props.position) {
        props.position = rezPosition(1 * MyAvatar.scale);
    }
    return Entities.addEntity(props, local);
}


function getJointLetter(prop, joint) {
    var uuid = AvatarManager.findRayIntersection(Camera.computePickRay(Reticle.position.x, Reticle.position.y)).avatarID;
    if (uuid) {
        var av = AvatarManager.getAvatar(uuid);
        var entProps = Entities.getEntityProperties(prop);
        var pos = av.getJointPosition(av.getJointIndex(joint));
        var rot = av.getJointRotation(av.getJointIndex(joint));
        var a = Vec3.subtract(pos, entProps.position);
        var b = Vec3.multiplyQbyV(Quat.inverse(rot), a);
        return JSON.stringify(b);
    }
}

function freezeAv() {
    var uuid = AvatarManager.findRayIntersection(Camera.computePickRay(Reticle.position.x, Reticle.position.y)).avatarID;
    if (uuid) {
        var av = AvatarManager.getAvatar(uuid);
        console.log("Freezing " + av.sessionDisplayName);
        var jointRots = [];
        var jointRotsSet = [];
        av.getJointNames().forEach(function (joint) {
            jointRots.push(av.getJointRotation(av.getJointIndex(joint)));
            jointRotsSet.push(true);
        });

        var props = {
            "name": av.sessionDisplayName + " Clone",
            "type": "Model",
            "modelURL": av.skeletonModelURL,
            "position": av.position,
            "rotation": Quat.multiply(av.orientation, {"x": 0, "y": 1, "z": 0, "w": 0}),
            "jointRotations": jointRots,
            "jointRotationsSet": jointRotsSet,
            "collisionless": true,
            "lifetime": 10
        };
        Entities.addEntity(props);
    } else {
        console.log("Unable to find avatar!");
    }
}

function cloneJoints() {
    var uuid = AvatarManager.findRayIntersection(Camera.computePickRay(Reticle.position.x, Reticle.position.y)).avatarID;
    if (uuid) {
        var av = AvatarManager.getAvatar(uuid);
        if (MyAvatar.skeletonModelURL !== av.skeletonModelURL) {
            MyAvatar.skeletonModelURL = av.skeletonModelURL;
        }
        console.log("Cloning " + av.sessionDisplayName);
        av.getJointNames().forEach(function (joint) {
            var jointIndex = MyAvatar.getJointIndex(joint);
            if (jointIndex !== -1) {
                var rot = av.getJointRotation(av.getJointIndex(joint));
                MyAvatar.setJointRotation(jointIndex, rot);
            }
        });
    } else {
        console.log("Unable to find avatar!");
    }
}


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

function setLetter(uuid, props) {
    Entities.editEntity(uuid, {
        "localPosition": props.jointPosition,
        "localRotation": Quat.fromVec3Degrees(props.jointRotation)
    });
}

function getLetter(uuid) {
    var props = Entities.getEntityProperties(uuid);
    delete props.localPosition.red;
    delete props.localPosition.green;
    delete props.localPosition.blue;
    props.localRotation = Quat.safeEulerAngles(props.localRotation);
    delete props.localRotation.red;
    delete props.localRotation.green;
    delete props.localRotation.blue;
    var obj = {
        "jointPosition": props.localPosition,
        "jointRotation": props.localRotation
    };
    print(JSON.stringify(obj, 0, 2));
}

function getProp(uuid) {
    var props = Entities.getEntityProperties(uuid);
    delete props.dimensions.red;
    delete props.dimensions.green;
    delete props.dimensions.blue;
    delete props.position.red;
    delete props.position.green;
    delete props.position.blue;
    var obj = {
        "dimensions": props.dimensions,
        "lifetime": 300,
        "modelURL": props.modelURL,
        "name": props.name,
        "position": props.position,
        "rotation": props.rotation,
        "type": "Model",
        "userData": "{\"grabbableKey\":{\"grabbable\":false}}"

    };
    print(JSON.stringify(obj, 0, 2));
    Window.copyToClipboard(JSON.stringify(obj, 0, 2));
}

function genLetters(word, dist) {
    dist = dist ? dist : 0.2;
    var chars = word.split("");
    var count = 0;
    var root = "";
    chars.forEach(function (_char) {
        var t = "";
        if (_char !== " ") {
            if (count === 0) {
                t = Entities.addEntity({
                    "lifetime": -1,
                    "modelURL": "http://vr.fumbleland.com/objects/Letter" + _char.toUpperCase() + ".fbx",
                    "name": "Schoolboard letter - " + _char,
                    "position": rezPosition(1 * MyAvatar.scale),
                    "rotation": Quat.getForward(Camera.orientation),
                    "type": "Model",
                    "userData": "{\"grabbableKey\":{\"grabbable\":false}}"
                });
                root = t;

            } else {
                t = Entities.addEntity({
                    "parentID": root,
                    "lifetime": -1,
                    "modelURL": "http://vr.fumbleland.com/objects/Letter" + _char.toUpperCase() + ".fbx",
                    "name": "Schoolboard letter - " + _char,
                    "localPosition": {x: dist * count, y: 0, z: 0},
                    "localRotation": Quat.IDENTITY,
                    "type": "Model",
                    "userData": "{\"grabbableKey\":{\"grabbable\":false}}"
                });
            }
            Script.setTimeout(function () {

                var fitted = false;
                while (!fitted) {

                    var d = Entities.getEntityProperties(t).dimensions;
                    if (d.x > 0.2045 || d.y > 0.2045) {
                        d.x *= 0.99;
                        d.y *= 0.99;
                    } else {
                        fitted = true;
                    }

                    d.z = 0.069;
                    Entities.editEntity(t, {dimensions: d});
                }
            }, 1000);
        }
        count++;
    });
}