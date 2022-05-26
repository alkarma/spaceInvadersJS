$(function(){
	var startBtn = $(".start_button");
	var cross = $("#cross");
	var spaceShip = $("#spaceship");
	var openSpace = document.querySelector("#container");
	var screenWidth = $("#container").width();
	var screenHeight = $("#container").height();
	var gameOverIn = $(".gameover");
	var scoreIn = document.querySelector(".yourscore");
	var mainMusic = new Audio("audio/main_theme.mp3");
	var gameScore = 0;
	var shipX = 50;

	startBtn.on("click", function() {
		game();
	});

	function getRndInteger(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function createAlienObject() {
		var newAlien = document.createElement("div");
		newAlien.className = "aliens";
		$('#container').append(newAlien);
	}

	function uLoose() {
		gameOverIn.show();
		scoreIn.innerHTML = "YOUR SCORE: " + gameScore;
		mainMusic.pause();
	}

	function game() {
		startBtn.hide();
		cross.show();
		var gameScoreDisp = document.createElement("span");
		gameScoreDisp.className = "game_score";
		openSpace.appendChild(gameScoreDisp);
		gameScoreDisp.innerHTML = gameScore;
		var ammo = 30;
		var ammoDisp = document.createElement("span");
		ammoDisp.className = "ammo";
		openSpace.appendChild(ammoDisp);
		ammoDisp.innerHTML = ammo;
		var uWin = $(".youwin");
		mainMusic.play();
		mainMusic.loop = true;

		openSpace.style.cursor = "none";

		//SPACESHIP MOVE

		//MOUSE MOVE
		   document.addEventListener("mousemove", function(e){
					shipX = e.clientX;
		       var mouseX = e.clientX;
					 var mouseY = e.clientY;
					 function moveShip() {
						spaceShip.css("left", shipX - 50);
						cross.css("left", mouseX - 15);
						cross.css("top", mouseY - 15);
				 	}
					 moveShip();
		   });

		//KEYBOARDMOVE

		// document.addEventListener("keydown", (event) => {
		// 	if (event.key == "ArrowRight") {
		// 		if (shipX < screenWidth) {
		// 			shipX += 30;
		// 			spaceShip.css("left", shipX - 50);
		// 		}
		// 	} else if (event.key == "ArrowLeft") {
		// 		if (shipX > 0) {
		// 			shipX -= 30;
		// 			spaceShip.css("left", shipX - 50);
		// 		}
		// 	}
		// });

		//NEW ROCKETS

		openSpace.addEventListener("click", function () {
			if (ammo < 0) {
				ammoDisp.innerHTML = 0;
			}
			if (ammo > 0) {
				var shootingSound = new Audio("audio/shoot-01.wav");
				shootingSound.play();
				ammo--;
				ammoDisp.innerHTML = ammo;
				var newRocket = document.createElement("div");
				newRocket.className = "rocket";
				newRocket.style.left = shipX + "px";
				openSpace.appendChild(newRocket);
				var rocketPosY = 0;
				var rockets = document.querySelectorAll(".rocket");
				for (var i = 0; i < rockets.length; i++) {
					var shootingRocket = rockets[i];
					rocketPosY = 50;
				}

				//SHOOTING

				function fireRockets() {
					shootingRocket.style.bottom = rocketPosY + "px";
				}
				setInterval(function () {
					var rocketPos = shootingRocket.getBoundingClientRect();
					var getAlien = document.querySelector(".aliens");
					var alienPos = getAlien.getBoundingClientRect();
					if (rocketPos.top > 0) {
						rocketPosY = rocketPosY + 10;

						if (rocketPosY >= screenHeight - 10) {
							openSpace.removeChild(shootingRocket);
							rocketPosY = 0;
						} else if (
							rocketPos.top < alienPos.bottom &&
							rocketPos.left > alienPos.left &&
							rocketPos.right < alienPos.right &&
							rocketPos.bottom > alienPos.top
						) {
							openSpace.removeChild(shootingRocket);
							openSpace.removeChild(getAlien);
							var expSound = new Audio("audio/explosion-02.wav");
							expSound.play();
							createAlien();
							gameScore++;
							var bonusSound = new Audio("audio/pickup-01.wav");
							if (gameScore == 10) {
								ammo += 30;
								ammoDisp.innerHTML = ammo + " +30";
								bonusSound.play();
							}
							if (gameScore == 20) {
								ammo += 25;
								ammoDisp.innerHTML = ammo + " +25";
								bonusSound.play();
							}
							if (gameScore == 30 || gameScore == 40) {
								ammo += 20;
								ammoDisp.innerHTML = ammo + " +20";
								bonusSound.play();
							}
							if (gameScore == 50) {
								ammo += 10;
								ammoDisp.innerHTML = ammo + " +10";
								bonusSound.play();
							}
							if (gameScore == 60) {
								ammo += 45;
								ammoDisp.innerHTML = ammo + " +45";
								bonusSound.play();
							}
							gameScoreDisp.innerHTML = gameScore;
							delete moveAlienY;
							var scoreCount = localStorage.getItem("0");
							scoreCount++;
							localStorage.setItem(0, scoreCount);
							var getScore = localStorage.getItem(0, scoreCount);
							// console.log(getScore);
						}
					}
					// console.log(alienPos);
				}, 1);
				setInterval(fireRockets, 1);
			}
		});

		//ALIENS

		function createAlien() {
			createAlienObject();
			var alien = $(".aliens");
			var randomPosition = getRndInteger(1, screenWidth - 61);
			alien.css("left", randomPosition);

			//MOVE THE ALIEN
			var directionX = randomPosition % 2 ? "right" : "left";
			var alienPosX = alien.offset().left;

			function moveAlien() {
				var interval = setInterval(move, 2);
				function move() {
					var randIndex = getRndInteger(1, 4);
					alienPosY = alien.offset().top;
					if (directionX == "right") {
						alienPosX = alienPosX + randIndex;
					} else if (directionX == "left") {
						alienPosX = alienPosX - randIndex;
					}
					if (alienPosX >= screenWidth - 60) {
						directionX = "left";
					} else if (alienPosX <= 0) {
						directionX = "right";
					}
					if (alienPosY > screenHeight) {
						clearInterval(interval);
					}
					alien.on("change", function() {
						console.log('remove');
					});
				// console.log(alienPosY, screenHeight);

					alienPosY++;
					alien.css("left", alienPosX);
					alien.css("top", alienPosY);
				}
			}
			moveAlien();
		}
		createAlien();

		// GAMEOVER
		function gameStatus() {
			var interval = setInterval(checkOver, 100);
			function checkOver() {
				var alienPos = $('.aliens').offset().top;
				if (gameScore == 1) {
					uWin.show();
					scoreIn.innerHTML = "YOUR SCORE: " + gameScore;
					clearInterval(interval);
				}
				if (alienPos > screenHeight) {
					uLoose();
					clearInterval(interval);
				}
			}
		}
		gameStatus();
	}
});
