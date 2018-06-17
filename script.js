document.addEventListener("DOMContentLoaded", function () {
   let startBtn = document.querySelector(".start_button");
startBtn.addEventListener("click", function () {
    startBtn.style.display = 'none';
    var openSpace = document.querySelector('#container');
    var screenSize = openSpace.getBoundingClientRect();
        var screenWidth = screenSize.width;
        var screenHeight = screenSize.height;
    var spaceShip = document.getElementById('spaceship');
    var shipX = 50;

    openSpace.style.cursor = 'none';

    //SPACESHIP MOVE

    document.addEventListener("mousemove", function(e){
        shipX = e.clientX
    });
        function moveShip(){
        spaceShip.style.left = shipX - 50 + 'px';
    }
    setInterval(moveShip, 1);

    //NEW ROCKETS

    openSpace.addEventListener("click", function () {
        var newRocket = document.createElement('div');
        newRocket.className = "rocket";
        newRocket.style.left = shipX + 'px';
        openSpace.appendChild(newRocket);

        var rockets = document.querySelectorAll('.rocket');
        for (var i = 0; i < rockets.length; i++) {
                var shootingRocket = rockets[i];
                var rocketPosY = 50;
            }

    //SHOOTING

        function fireRockets () {
                shootingRocket.style.bottom = rocketPosY + 'px';
            }
            setInterval(function () {
            var rocketPos = shootingRocket.getBoundingClientRect();
            rocketPosY++;
            if(rocketPos.top<0){
                openSpace.removeChild(shootingRocket);
            }
        },1);
            setInterval(fireRockets, 1);
        });

    //ALIENS
        function random(){
            return Math.floor(Math.random() * (screenWidth - 1 + 1)) + 1;
        }


        for (var i = 0; i < 10; i++) {
        var newAlien = document.createElement('div');
        newAlien.className = "aliens";
        newAlien.style.left = random()+'px';
        openSpace.appendChild(newAlien);
        var allAliens = document.querySelectorAll(".aliens");
        }


});
});