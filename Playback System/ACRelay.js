var path = "http://vr.fumbleland.com/scripts/";
var ac = "";
Script.resolvePath('').replace(/\bac=(\w+)/, function (_, id) {
    ac = id;
});
Script.include(path+ac+'.js?'+Date.now());