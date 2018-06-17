document.addEventListener('DOMContentLoaded', function(event) {

    var openSpace = document.getElementById('container');
    var spaceShip = document.getElementById('spaceship');
    var rocket = document.getElementById('rocket');
    var alien = document.getElementsByClassName('aliens');
    var shipX = 0;
    var rocketY = -55;
    var startBtn = document.getElementById('start_button');
    var alienSet = [];

    function moveShip(){
        spaceShip.style.left = shipX - 50 + 'px';
    }
    document.addEventListener("mousemove", function(e){
        shipX = e.clientX
    }, false);
    setInterval(moveShip, 1);


    function fireRockets () {
        rocket.style.top = rocketY + 'px';
    }
    startBtn.addEventListener("click", function () {
        startBtn.style.display = 'none';
        openSpace.style.cursor = 'none';
        rocket.className += "shooting";
        setInterval(function () {
            var rocketPos = rocket.getBoundingClientRect();
            rocketY = rocketY -5;
            if(rocketPos.top<0){
                rocketY = -55;
            }
            console.log(rocketPos);
        },1);

        for (var i = 0; i < alien.length; i++) {
            console.log (alien[i]);

        }
    },);
    setInterval(fireRockets, 1);

    









});