var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");
var button = tablet.addButton({
    text: "ResetSensors"
});

function onClicked() {
    MyAvatar.resetSensorsAndBody();
}

button.clicked.connect(onClicked);