(function(){
    var size = {"x":1.89406418800354,"y":0.13747021555900574,"z":1.5560922622680664};
    var scale = 0.0;
    var timer = null;
    var entityID = "";

    function cubicOut(t) {
        return --t * t * t + 1;
    }

    this.preload = function(entID){
        entityID = entID;
        Script.setTimeout(function(){
            timer = Script.setInterval(grow,10);
        },500);
    };

    function grow(){
        scale+=0.01;
        Entities.editEntity(entityID,{"dimensions":Vec3.multiply(cubicOut(scale),size)});
        if(scale>=1){
            Script.clearInterval(timer);
        }
    }
});