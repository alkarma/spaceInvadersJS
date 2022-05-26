$(function(){
	var universe = $('.space-wrap');
	var startMenu = $("#start_menu");
	var controls = $('#select_control');
	var cross = $("#cross");
	var spaceShip = $("#spaceship");
	var openSpace = $("#open_space");
	var screenWidth = $("#open_space").width();
	var screenHeight = $("#open_space").height();
	var gameOverScreen = $(".gameover");
	var scoreIn = document.querySelector(".yourscore");
	var mainMusic = new Audio("audio/main_theme.mp3");
	var gameScore = 0;
	var shipX = 0;
	var health = 1;
	var gameIsRunning = false;
	var controlType = localStorage.getItem('controls');

	startMenu.addClass('active');

	$('.button.play').on("click", function() {
		controlType ? game() : selectControl();
	});

	$('.button.options').on("click", function() {
		selectControl();
	});

	$('.button.back').on("click", function() {
		location.reload();
	});

	function selectControl() {
		startMenu.removeClass('active');
		controls.addClass('active');
		if (controlType == 'mouse') {
			$('.button.mouse').addClass('active');
		}
		if (controlType == 'keyboard') {
			$('.button.keyboard').addClass('active');
		}
		$('.button.keyboard').on("click", function() {
			localStorage.setItem('controls', 'keyboard');
			controlType = "keyboard";
			$('.button.keyboard').addClass('active');
			$('.button.mouse').removeClass('active');
		});
		$('.button.mouse').on("click", function() {
			localStorage.setItem('controls', 'mouse');
			controlType = "mouse";
			$('.button.mouse').addClass('active');
			$('.button.keyboard').removeClass('active');
		});
	}

	function explosion(c) {
		var exp = document.createElement("div");
		var id = 'exp-' + Date.now();
		exp.classList.add('explosion');
		exp.setAttribute('id', id);
		openSpace.append(exp);
		$('#'+id).css(c);
		function removeExp() {
			$('#'+id).remove();
		}
		setTimeout(removeExp, 1000);
	}

	function getRndInteger(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function createAlienObject() {
		var newAlien = document.createElement("div");
		newAlien.className = "aliens";
		$('#open_space').append(newAlien);
	}

	function gameOver(status) {
		gameOverScreen.addClass('active');
		status == 'win' ? gameOverScreen.addClass('win') : gameOverScreen.addClass('fail');
		scoreIn.innerHTML = "YOUR SCORE: " + gameScore;
		mainMusic.pause();
	}

	function checkHealth() {
		$('.health_display').empty();
		for(let i = 0; i < health ; i++) {
			var healthItem = document.createElement("span");
			healthItem.className = "health_item";
			$('.health_display').append(healthItem);
		}
	}

	function game() {
		gameIsRunning = true;
		controls.removeClass('active');
		startMenu.removeClass('active');
		openSpace.addClass('we-are-in-open-space-now');
		universe.addClass('fight');
		spaceShip.show();
		shipX = spaceShip.offset().left + 50;
		cross.show();
		mainMusic.play();
		mainMusic.loop = true;
		var gameScoreDisp = document.createElement("span");
		gameScoreDisp.className = "game_score";
		gameScoreDisp.innerHTML = gameScore;
		var ammo = 100;
		var ammoDisp = document.createElement("span");
		ammoDisp.className = "ammo";
		ammoDisp.innerHTML = ammo;
		var healthDisp = document.createElement("span");
		healthDisp.className = "health_display";
		openSpace.append(ammoDisp);
		openSpace.append(gameScoreDisp);
		openSpace.append(healthDisp);
		checkHealth();
		
		// PAUSE
		$('body').on("keydown", (e) => {
			if (e.key == 'Escape') {
				alert('Game on pause. Click "OK" to continue.');
			}
		});

		//SPACESHIP MOVE

		//MOUSE MOVE
		if(controlType == 'mouse') {
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
		}
		
		//KEYBOARDMOVE

		if(controlType == 'keyboard') {
			cross.css("top", 100);
			document.addEventListener("keydown", (event) => {
				if (event.key == "ArrowRight") {
					if (shipX < screenWidth) {
						shipX += 30;
						spaceShip.css("left", shipX - 50);
						cross.css("left", shipX - 15);
					}
				} else if (event.key == "ArrowLeft") {
					if (shipX > 0) {
						shipX -= 30;
						spaceShip.css("left", shipX - 50);
						cross.css("left", shipX - 15);
					}
				}
			});
		}

		//NEW ROCKETS

		universe.on("mousedown", function () {
			if (ammo < 0) {
				ammoDisp.innerHTML = 0;
			}
			if (ammo > 0 && gameIsRunning == true) {
				var shootingSound = new Audio("audio/shoot-01.wav");
				shootingSound.play();
				ammo--;
				ammoDisp.innerHTML = ammo;
				var uniqueId = 'rocket-' + Date.now();
				var newRocket = document.createElement("div");
				newRocket.id = uniqueId;
				newRocket.className = "rocket";
				newRocket.style.left = shipX + "px";
				openSpace.append(newRocket);
				var rocketPosY = 50;
				var shootingRocket = $('#'+uniqueId);

				//SHOOTING
				var flightInterval = setInterval(rocketFlight, 1);
				var shootingInterval = setInterval(shooting, 1);
				function rocketFlight() {
					rocketPosY += 2;
					shootingRocket.css("bottom", rocketPosY);
				}
				function shooting() {
					var rocketPos = shootingRocket.offset();
					var rocketWidth = shootingRocket.width();
					var rockerHeight = shootingRocket.height();
					var alien = $(".aliens");
					var alienPos = alien.offset() ? alien.offset() : {"top": -1000, "left": 0} ;
					var alienWidth = alien.offset() ? alien.width() : 0;
					var alienHeight = alien.offset() ? alien.height() : 0;
					if (rocketPos.top > 0) {
						if (
							rocketPos.top <= alienPos.top + alienHeight &&
							rocketPos.left >= alienPos.left &&
							rocketPos.left + rocketWidth <= alienPos.left + alienWidth &&
							rocketPos.top + rockerHeight >= alienPos.top
						) {
							shootingRocket.remove();
							explosion(alienPos);
							alien.remove();
							clearInterval(shootingInterval);
							clearInterval(flightInterval);
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
						}
					} else {
						shootingRocket.remove();
						clearInterval(shootingInterval);
						clearInterval(flightInterval);
					}
				}
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
			var moveInterval = setInterval(move, 1);
			var randIndex = getRndInteger(1, 4);
			function move() {
				alienPosY = alien.offset().top;
				if (directionX == "right") {
					alienPosX = alienPosX + randIndex / 2;
				} else if (directionX == "left") {
					alienPosX = alienPosX - randIndex / 2;
				}
				if (alienPosX >= screenWidth - 60) {
					directionX = "left";
				} else if (alienPosX <= 0) {
					directionX = "right";
				}
				if (alienPosY > screenHeight) {
					health--;
					checkHealth();
					clearInterval(moveInterval);
					alien.remove();
					health > 0 ? createAlien() : '';
				}
				alienPosY++;
				alien.css("left", alienPosX);
				alien.css("top", alienPosY);
			}
		}
		createAlien();

		// GAMEOVER
		function gameStatus() {
			var statusInterval = setInterval(checkOver, 1);
			function checkOver() {
				if (gameScore == 100) {
					gameIsRunning = false;
					gameOver("win");
					clearInterval(statusInterval);
				}
				if (health == 0) {
					gameIsRunning = false;
					gameOver("fail");
					clearInterval(statusInterval);
				}
			}
		}
		gameStatus();
	}
});
