var path = "atp:/scripts/";
var ac = "";
Script.resolvePath('').replace(/\bac=(\w+)/, function (_, id) {
    ac = id;
});
var req = path + ac + '.js?' + Date.now();
print("Requiring " + req);
Script.require(req);