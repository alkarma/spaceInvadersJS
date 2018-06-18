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
    var gameScore = 0;
    var gameScoreDisp = document.createElement('span');
    gameScoreDisp.className = "game_score";
    openSpace.appendChild(gameScoreDisp);
    gameScoreDisp.innerHTML = gameScore;


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
            var getAlien = document.querySelector(".aliens");
            var alienPos = getAlien.getBoundingClientRect();
            rocketPosY = rocketPosY + 2;
            if(rocketPos.top<0){
                openSpace.removeChild(shootingRocket);
            } else if(rocketPos.top < alienPos.bottom && rocketPos.left > alienPos.left && rocketPos.right < alienPos.right){
                openSpace.removeChild(shootingRocket);
                openSpace.removeChild(getAlien);
                createAlien();
                gameScore++;
                gameScoreDisp.innerHTML = gameScore;
            }

                    // console.log(alienPos);
        },1);
            setInterval(fireRockets, 1);
        });

    //ALIENS
        function random(){
            return Math.floor(Math.random() * (screenWidth - 61 + 1)) + 1;
        }
        function createAlien(){
            var newAlien = document.createElement('div');
            newAlien.className = "aliens";
            newAlien.style.left = random()+'px';
            openSpace.appendChild(newAlien);
    //MOVE THE ALIEN
            var statusX = 'right';
            var getAlien = document.querySelector(".aliens");
            var alienPos = getAlien.getBoundingClientRect();
            var alienY = alienPos.y;
            var alienX= alienPos.x;
            var moveAlienX = getAlien.offsetLeft;
            var moveAlienY = getAlien.offsetTop;
            function moveAlien () {

            
            setInterval(function(){
                if(statusX == 'right'){
                moveAlienX = moveAlienX + 4;
                }else if(statusX == 'left'){
                moveAlienX = moveAlienX -4;
                }
                if (moveAlienX >= screenWidth - 60){
                    statusX = 'left';
                }else if (moveAlienX <= 0){
                    statusX = 'right';
                }
                moveAlienY++;
                getAlien.style.left = moveAlienX + 'px';
                getAlien.style.top = moveAlienY + 'px';
            },10);}
            moveAlien ();
        }
        createAlien();
            



});
});