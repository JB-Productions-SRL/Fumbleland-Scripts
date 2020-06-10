(function () {
    var size = {"x": 1.89406418800354, "y": 0.13747021555900574, "z": 1.5560922622680664};
    var scale = 1;
    var timer = null;
    var entityID = "";

    function polyIn(t, e) {
        return 1 - Math.pow(1 - t, e);
    }

    this.preload = function (entID) {
        entityID = entID;
        timer = Script.setInterval(grow, 10);
    };

    function grow() {
        scale -= 0.005;
        Entities.editEntity(entityID, {"dimensions": Vec3.multiply(polyIn(scale, 3), size)});
        if (scale <= 0) {
            Script.clearInterval(timer);
        }
    }
});