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
	var currentGamer = localStorage.getItem('activeGamer');
	var greetingText = '';

	startMenu.addClass('active');

	if (currentGamer && currentGamer != 'Anon') {
		$('.login_wrapper').addClass('logged-in');
		$('.login_wrapper input#nickname').val(currentGamer);
	}

	$('.button.play').on("click", function() {
		currentGamer = localStorage.getItem('activeGamer');
		if (currentGamer && currentGamer != 'Anon') {
			controlType ? game() : selectControl();
		} else {
			$('.greeting-text').text('Who are you? Login first!');
			$('.greeting-text').addClass('active');
		}
	});

	$('.button.options').on("click", function() {
		selectControl();
	});

	$('.button.back').on("click", function() {
		location.reload();
	});

	$('.login_wrapper .nickname_submit').on("click", login);

	$('.login_wrapper .button.logout').on("click", logout);

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

	function login() {
		var logWrap = $('.login_wrapper');
		var nickInput = $('.login_wrapper input#nickname');
		var greeting = $('.greeting-text');
		var nick = nickInput.val();
		var checkNick = localStorage.getItem(nick);
		if (nick == '') {
			logWrap.addClass('error');
			greetingText = 'Type something, you moron...';
			console.error('Type something, you moron...');
		} else if (checkNick && checkNick == 'nickname') {
			localStorage.setItem('activeGamer', nick);
			logWrap.removeClass('error');
			logWrap.addClass('logged-in');
			greetingText = 'Welcome back, ' + nick;
			console.log('Welcome back, ' + nick);
		} else if (checkNick) {
			logWrap.addClass('error');
			greetingText = 'Fuck you, asshole!';
			console.error('Fuck you, asshole!');
		} else {
			localStorage.setItem(nick, 'nickname');
			localStorage.setItem('activeGamer', nick);
			logWrap.removeClass('error');
			logWrap.addClass('logged-in');
			greetingText = 'Good to see you, ' + nick + '! Come on in!';
			console.log('Good to see you, ' + nick + '! Come on in!');
		}
		greeting.text(greetingText);
		greeting.addClass('active');
		nickInput.on("change", function() {
			greeting.removeClass('active');
			logWrap.removeClass('error');
			logWrap.removeClass('logged-in');
		});
	}

	function logout() {
		localStorage.setItem('activeGamer', 'Anon');
		$('.login_wrapper').removeClass('logged-in');
		$('.greeting-text').removeClass('active');
		$('.login_wrapper input#nickname').val('');
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
		var userName = document.createElement("span");
		userName.className = "nick_display";
		userName.innerHTML = currentGamer;
		openSpace.append(userName);
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
