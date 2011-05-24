// Constants
// Keys for HTML5 Local Storage API.
var CURRENT_LEVEL_KEY = "name.nanek.lastcallforgoogleio.currentLevel";
var HIGHEST_LEVEL_KEY = "name.nanek.lastcallforgoogleio.highestLevel";
var LOWEST_TIME_KEY = "name.nanek.lastcallforgoogleio.lowestTime";
var SOUND_AND_MUSIC_ENABLED_KEY = "name.nanek.lastcallforgoogleio.soundAndMusicEnabled";
// Messages shown to the user.
var ATTENDEE_MESSAGES = [
	// Show the generic message most of the time, but sneak in a funnier one occasionally.
	"Oops! \"Excuse me.\"", // I'm Robby JR.
	"Oops! \"Excuse me.\"", 
	"Oops! \"Excuse me.\"", 
	"Oops! \"Excuse me.\"", 
	"Oops! \"Excuse me.\"", 
	"Oops! \"Excuse me.\"", 
	"Oops! \"Excuse me.\"", 
	"Oops! \"Where's the bathroom?\"", 
	"Oops! \"Have you seen the next SCVNGR clue?\"" // Is it going to be like that again? Neat.
];
var GRAZING_MESSAGES = [
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Whoa! Close call.", 
	"Happy feet!", 
	"Living in the border between life and death." // This game is no Touhou, unfortunately.
];
// Success messages are the most common and the most important feedback.
// Alternate between two disjoint arrays to make sure we don't get the same message twice,
// which can make it look like nothing new was said on the second success.
var SUCCESS_MESSAGES_1 = [
	"Nice!", 
	"Nice!", 
	"Nice!", 
	"Nice!", 
	"Nice!", 
	"Nice!", 
	"Nice!", 
	"Eeeeeeeexcellent." // I couldn't afford a nuclear reactor, so you'll have to settle for Mr. Burns.
];
var SUCCESS_MESSAGES_2 = [
	"Good job.", 
	"Good job.", 
	"Good job.", 
	"Good job.", 
	"Good job.", 
	"Good job.", 
	"Good job.",  
	"I'm making a note here: HUGE SUCCESS!" // Now you're thinking with portals.
];
var MAX_LEVEL = 25;
var TOP_PADDING = 16 * 3;
var TEXT_PADDING = 16;
var DANCE_STEP_DURATION_MS = 175;
// Don't kill the player on a grazing hit, especially without pixel perfect collision detection.
var SKATE_LEFT_DIE_GRAZING = 13;
var SKATE_RIGHT_DIE_GRAZING = 13;
var SKATE_TOP_DIE_GRAZING = 3;
var SKATE_BOTTOM_DIE_GRAZING = 5;

// Sprites
var player;
var logoParts;
var attendees;
var inGameAttendees;

// Images
var imageBackground;
var imageLogo;
var imageSkate1;
var imageSkate2;
var imageSkate3;

// Resources	
var canvas;
var ctx;
var won;
var gameStatus;
var oopsCount = 0;
var lastActiveTime;
var elapsedTime;
var paused = true;
var autoRedrawSetIntervalId;
var level = getCurrentLevelNumber(1);
var lowestTime = getLowestTime(null);
var highestLevel = getHighestLevelNumber(level);
var wasGrazingDeath = false;

// Music and sound.
// XXX loop property doesn't seem to work in Firefox, only Chrome. Go Chrome!
var audioCollect = new Audio("audio_collect.ogg");
audioCollect.volume = 0.8;
var audioScatter = new Audio("audio_scatter.ogg");
audioScatter.volume = 0.8;
var audioGrazing = new Audio("audio_grazing.ogg");
audioGrazing.volume = 0.8;
var audioWin = new Audio("audio_win.ogg");
audioWin.volume = 0.2;
audioWin.loop = true;
var audioMusic = new Audio("audio_music.ogg");
audioMusic.volume = 0.2;
audioMusic.loop = true;
var soundAndMusicEnabled = getSoundAndMusicEnabled(true);

// Sprite type used for collision detection and drawing. Matches the size of an image.
function Sprite(image, firstLeft, firstTop) {
	this.image = image;
	this.move = function(newLeft, newTop) {
		this.left = newLeft;
		this.top = newTop;
		this.right = newLeft + this.image.width;
		this.bottom = newTop + this.image.height;
		this.vitalArea = new Object();
		this.vitalArea.left = this.left + SKATE_LEFT_DIE_GRAZING;
		this.vitalArea.top = this.top + SKATE_TOP_DIE_GRAZING;
		this.vitalArea.right = this.right - SKATE_RIGHT_DIE_GRAZING;
		this.vitalArea.bottom = this.bottom - SKATE_BOTTOM_DIE_GRAZING;
		this.breathingSpace = new Object();
		this.breathingSpace.left = this.left - SKATE_LEFT_DIE_GRAZING;
		this.breathingSpace.top = this.top - SKATE_TOP_DIE_GRAZING;
		this.breathingSpace.right = this.right + SKATE_RIGHT_DIE_GRAZING;
		this.breathingSpace.bottom = this.bottom + SKATE_BOTTOM_DIE_GRAZING;
		// Yum, copy and paste inheritance. I really need a separate Rectangle class or something later, I guess.
	}
	this.move(firstLeft, firstTop);
}

function setSoundAndMusicEnabled(enabled) {
	soundAndMusicEnabled = enabled;
	saveSoundAndMusicEnabled(soundAndMusicEnabled);
	if (!enabled) {
		audioCollect.pause();
		audioScatter.pause();
		audioWin.pause();
		audioMusic.pause();	
	}
}

function playSoundOrMusic(audio) {
	if (!soundAndMusicEnabled) {
		return;
	}
	audio.play();
}

function handleLoad() {
	// Make the sound and music enabled checkbox match our setting in case it is from HTML5 Local Storage.
	var soundAndMusicCheckbox = document.getElementById('soundAndMusicCheckbox');
	soundAndMusicCheckbox.checked = soundAndMusicEnabled;

	// Similarly update the stats.
	document.getElementById('highestLevel').innerHTML = "Highest level: " + highestLevel;
	if ( null == lowestTime ) {
		document.getElementById('lowestTime').innerHTML = "Lowest time: None";
	} else {
		document.getElementById('lowestTime').innerHTML = "Lowest time: " + formatTime(lowestTime);
	}
	
	loadGame();
}

function loadGame(newPlayerLeft, newPlayerTop) {

	lastActiveTime = new Date().getTime();
	elapsedTime = 0;
	wasGrazingDeath = false;
	won = false;
	canvas = document.getElementById('gameCanvas');
	ctx = canvas.getContext('2d');
	gameStatus = document.getElementById('gameStatus');
	imageBackground = document.getElementById('background');
	imageLogo = document.getElementById('logo');

	imageSkate1 = document.getElementById('skate1_color0');
	imageSkate2 = document.getElementById('skate2_color0');
	imageSkate3 = document.getElementById('skate3_color0');	
	var newPlayerImage = imageSkate1;
	// Accept start position so Bugdroid doesn't jump between center and current mouse position...
	if (typeof newPlayerLeft == "undefined") {
		newPlayerLeft = canvas.width / 2 - newPlayerImage.width / 2;
	}
	if (typeof newPlayerTop == "undefined") {
		newPlayerTop = canvas.height / 2 - newPlayerImage.height;
	}
	player = new Sprite(newPlayerImage, newPlayerLeft, newPlayerTop);
	
	inGameAttendees = new Array();
	for(var i = 0; i < level; i++) {
		loadInGameAttendee(i);
	}
	
	logoParts = new Array();
	for(var i = 0; i < 7; i++) {
		loadLogoPart(i, 'logo_index' + i + '_rotation' + getLogoPartRotation());
	}
	
	attendees = new Array();
	for(var i = 0; i < level; i++) {
		loadAttendee(i, 1 + getRandomNumber(3));
	}
	
	draw();
}

// Attendees move faster horizontally at higher levels and always move at least a little.
function getInGameAttendeeXSpeed() {
	var maxSpeed = Math.min(4 + level, 8);
	return (1 + getRandomNumber(maxSpeed)) / 50;
}

// Attendees move faster vertically at higher levels, but sometimes none at all, and usually less than horizontally.
function getInGameAttendeeYSpeed() {
	var maxSpeed = Math.min(3 + level, 6);
	return (0 + getRandomNumber(maxSpeed)) / 50;
}

// Rotate the logo parts more ways with each level.
function getLogoPartRotation() {
	var maxRotation = Math.min(level, 4);
	return getRandomNumber(maxRotation);
}

function playAgain() {
	if (won) {
		oopsCount = 0;
		setGameStatus("");
		loadGame(player.left, player.top);
	}
}

// Duplicate code smell ahoy! Maybe I can refactor after the contest.
function loadInGameAttendee(index) {
	var color = 1 + getRandomNumber(3);
	do {
		var newAttendeeImage = document.getElementById('skate1_color' + color);
		var newAttendeeLeft = getRandomNumber(canvas.width - newAttendeeImage.width);
		var newAttendeeTop = TOP_PADDING + getRandomNumber(canvas.height - newAttendeeImage.height - TOP_PADDING);
		inGameAttendee = inGameAttendees[index] = new Sprite(newAttendeeImage, newAttendeeLeft, newAttendeeTop);
		inGameAttendee.color = color;	
		inGameAttendee.xSpeed = getInGameAttendeeXSpeed();
		inGameAttendee.xDirection = getRandomNumber(2) == 0 ? -1 : 1;
		inGameAttendee.ySpeed = getInGameAttendeeYSpeed();
		inGameAttendee.yDirection = getRandomNumber(2) == 0 ? -1 : 1;
	} while ( checkForInGameAttendeeOverlap(index) );
}

function checkForInGameAttendeeOverlap(index) {
	if ( collisionCheckSprites(inGameAttendees[index].breathingSpace, player.breathingSpace) ) {
		return true;
	}
	for(var previousIndex = 0; previousIndex < index; previousIndex++) {
		if ( collisionCheckSprites(inGameAttendees[index], inGameAttendees[previousIndex]) ) {
			return true;
		}
	}
	return false;
}

function loadAttendee(index, color) {
	var attendee
	do {
		var newAttendeeImage = document.getElementById('skate1_color' + color);
		var newAttendeeLeft = getRandomNumber(canvas.width - newAttendeeImage.width);
		var newAttendeeTop = TOP_PADDING + getRandomNumber(canvas.height - newAttendeeImage.height - TOP_PADDING);
		var attendee = attendees[index] = new Sprite(newAttendeeImage, newAttendeeLeft, newAttendeeTop);
		attendee.color = color;	
		attendee.remainingDanceStepDurationMs = DANCE_STEP_DURATION_MS;
		attendee.danceStep = 1 + getRandomNumber(3);
		attendee.danceDirection = getRandomNumber(2) == 0 ? -1 : 1;
	} while ( checkForAttendeeOverlap(index) );
}

function checkForAttendeeOverlap(index) {
	if ( collisionCheckSprites(attendees[index], player) ) {
		return true;
	}
	for(var previousIndex = 0; previousIndex < index; previousIndex++) {
		if ( collisionCheckSprites(attendees[index], attendees[previousIndex]) ) {
			return true;
		}
	}
	return false;
}

function loadLogoPart(index, id) {
	var logoPart
	do {
		var newLogoPartImage = document.getElementById(id);
		var newLogoPartLeft = getRandomNumber(canvas.width - newLogoPartImage.width);
		var newLogoPartTop = TOP_PADDING + getRandomNumber(canvas.height - newLogoPartImage.height - TOP_PADDING);
		var logoPart = logoParts[index] = new Sprite(newLogoPartImage, newLogoPartLeft, newLogoPartTop);
		logoPart.collected = false;	
	} while ( checkForLogoPartOverlap(index) );
}

function checkForLogoPartOverlap(index) {
	if ( collisionCheckSprites(logoParts[index], player.breathingSpace) ) {
		return true;
	}
	for(var previousIndex = 0; previousIndex < index; previousIndex++) {
		if ( collisionCheckSprites(logoParts[index], logoParts[previousIndex].breathingSpace) ) {
			return true;
		}
	}
	return false;

}

function getRandomNumber(max) {
	return Math.floor(Math.random() * max);
}

function collisionCheckSprites(a, b) {
	if ( null == a || null == b ) {
		return false;
	}
	return (a.left <= b.right &&
		b.left <= a.right &&
		a.top <= b.bottom &&
		b.top <= a.bottom)
}

function draw() {
	// Failed attempt to turn off music when leaving screen via alt-tab. 
	// window.onblur doesn't seem to trigger until you come back in Chrome.
	// This didn't work either, though, for some reason. Make sure is getting called by setInterval in that situation?
	//if (!window.screenX || !window.screenY) {
	//	pause();
	//}

	var currentTime = new Date().getTime();
	var timeDeltaMs = currentTime - lastActiveTime; 
	lastActiveTime = currentTime;
		
	ctx.drawImage(imageBackground, 0, 0);

	if (won) {
	
		ctx.drawImage(imageLogo, canvas.width / 2 - imageLogo.width / 2, canvas.height / 2 - imageLogo.height);
		
		for( var i in attendees ) {
			var attendee = attendees[i];
			
			attendee.remainingDanceStepDurationMs -= timeDeltaMs;
			while ( attendee.remainingDanceStepDurationMs < 0 ) {
				attendee.remainingDanceStepDurationMs += DANCE_STEP_DURATION_MS;
				attendee.danceStep += attendee.danceDirection;
				if (attendee.danceStep > 3) {
					attendee.danceStep = 1;
				} else if (attendee.danceStep < 1) {
					attendee.danceStep = 3;
				}
				attendee.image = document.getElementById('skate' + attendee.danceStep + '_color' + attendee.color);
			}
			
			ctx.drawImage(attendee.image, attendee.left, attendee.top);
		}
	} else {

		for( var i in logoParts ) {
			var logoPart = logoParts[i];
			if ( logoPart.collected ) {
				continue;
			}
			ctx.drawImage(logoPart.image, logoPart.left, logoPart.top);
		}	
		
		for( var i in inGameAttendees ) {	
			var inGameAttendee = inGameAttendees[i];
		
			var newLeft = inGameAttendee.left + inGameAttendee.xSpeed * inGameAttendee.xDirection * timeDeltaMs;
			if (newLeft < 0) {
				newLeft = inGameAttendee.left;
				inGameAttendee.xDirection *= -1;
			} else if (newLeft + inGameAttendee.image.width > canvas.width) {
				newLeft = inGameAttendee.left;
				inGameAttendee.xDirection *= -1;
			}

			var newTop = inGameAttendee.top + inGameAttendee.ySpeed * inGameAttendee.yDirection * timeDeltaMs;
			if (newTop < 0) {
				newTop = inGameAttendee.top;
				inGameAttendee.yDirection *= -1;
			} else if (newTop + inGameAttendee.image.height > canvas.height) {
				newTop = inGameAttendee.top;
				inGameAttendee.yDirection *= -1;
			}

			inGameAttendee.move(newLeft, newTop);
		
			ctx.drawImage(inGameAttendee.image, inGameAttendee.left, inGameAttendee.top);
		}
	}

	ctx.drawImage(player.image, player.left, player.top);

	// Draw oops count text.
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.font = "bold x-large sans-serif";
	ctx.fillStyle = "white";
	ctx.fillText("Oopses: " + oopsCount, TEXT_PADDING, TEXT_PADDING);

	// Draw level count text.
	ctx.textAlign = "center";
	var levelText = (MAX_LEVEL == level) ? 'Max' : level;
	ctx.fillText("Level: " + levelText, canvas.width / 2, TEXT_PADDING);

	// Update time if needed.	
	if (!won && !paused) {
		elapsedTime += timeDeltaMs;
	}

	// Draw time text.
	ctx.textAlign = "right";
	ctx.fillText("Time: " + formatTime(elapsedTime), canvas.width - TEXT_PADDING, TEXT_PADDING);
		
	if ( won ) {
 		return;
	}

	// Check if won level.		
	var firstUncollectedIndex = getFirstUncollectedIndex();
	if ( -1 == firstUncollectedIndex ) {
		won = true;
		level++;
		if (level > MAX_LEVEL) {
			level = MAX_LEVEL;
		}
		saveCurrentLevelNumber();
		if ( level > highestLevel ) {
			highestLevel = level;
			saveHighestLevelNumber(highestLevel);
			document.getElementById('highestLevel').innerHTML = "Highest level: " + highestLevel;
		}
		if ( null == lowestTime || elapsedTime < lowestTime) {
			lowestTime = elapsedTime;
			saveLowestTime(lowestTime);
			document.getElementById('lowestTime').innerHTML = "Lowest time: " + formatTime(lowestTime);
		}
		audioMusic.pause();
		playSoundOrMusic(audioWin);
		setGameStatus("You win! <a href=\"javascript:playAgain()\">Click to continue to the next level.</a>");
		return;
	}
	
	// Ran into part of the logo.
	for(var i in logoParts) {
		var logoPart = logoParts[i];		
		if ( !logoPart.collected && collisionCheckSprites(logoPart, player.vitalArea) ) {
			// Got part in right order.
			if ( i == firstUncollectedIndex ) {
				var messages = i % 2 == 0 ? SUCCESS_MESSAGES_1 : SUCCESS_MESSAGES_2;
				var messageIndex = getRandomNumber(messages.length);
			 	setGameStatus(messages[messageIndex]);
				logoPart.collected = true;
				playSoundOrMusic(audioCollect);
				draw();
				return;
			// Lose level if got part in wrong order.
			} else {
			 	oops("Oops! Wrong order!");
				return;
			}
		}
	}
	
	// Lose level if ran into an attendee.
	for( var i in inGameAttendees ) {	
		var inGameAttendee = inGameAttendees[i];
		if ( collisionCheckSprites(inGameAttendee.vitalArea, player.vitalArea) ) {
			oops(getAttendeeMessage());
			return;
		}
	}
	
	var isGrazingDeath = false;	
	// Check if grazing an attendee.
	for( var i in inGameAttendees ) {	
		var inGameAttendee = inGameAttendees[i];
		if ( collisionCheckSprites(inGameAttendee.vitalArea, player) ) {
			isGrazingDeath = true;
			break;
		}
	}
	// Check if grazing wrong part of the logo.
	if ( !isGrazingDeath ) {
		for(var i in logoParts) {
			var logoPart = logoParts[i];		
			if ( !logoPart.collected && i != firstUncollectedIndex && collisionCheckSprites(logoPart, player) ) {
				isGrazingDeath = true;
				break;
			}
		}	
	}
	// Now we can do something cool if they escaped.
	if ( wasGrazingDeath && !isGrazingDeath ) {
		var messageIndex = getRandomNumber(GRAZING_MESSAGES.length);
		setGameStatus(GRAZING_MESSAGES[messageIndex]);
		playSoundOrMusic(audioGrazing);
	}
	wasGrazingDeath = isGrazingDeath;
}

function formatTime(timeMs) {
	var tenths = ((timeMs / 100) % 10) | 0;
	var seconds = (timeMs / 1000) | 0;
	var formatted = "" + seconds + "." + tenths + " s";
	return formatted;
}

function getAttendeeMessage() {
	var messageIndex = getRandomNumber(ATTENDEE_MESSAGES.length);
	return ATTENDEE_MESSAGES[messageIndex];
}

function oops(message) {
	setGameStatus(message);
	oopsCount++;
	level--;
	if (level < 1) {
		level = 1;
	}
	saveCurrentLevelNumber();
	playSoundOrMusic(audioScatter);
	loadGame(player.left, player.top);
}

function setGameStatus(message) {
	gameStatus.innerHTML = message;
}

function getFirstUncollectedIndex() {
	for(var i in logoParts) {
		var logoPart = logoParts[i];		
		if ( !logoPart.collected ) {
			return i;
		}
	}
	return -1;
}

// Phew, game logic done. Let's handle some events.

function handleClick() {
	playSoundOrMusic(audioMusic);
	audioWin.pause();
	playAgain();
}

function handleMouseOver() {
	unpause();
}

function unpause() {
	if (!paused) {
		return;
	}

	paused = false;
	resumeMusic();
	lastActiveTime = new Date().getTime();
	autoRedrawSetIntervalId = setInterval(draw, 32);
}

function resumeMusic() {
	if (!won) {
		playSoundOrMusic(audioMusic);
	} else {
		playSoundOrMusic(audioWin);
	}
}

function handleMouseOut() {
	 pause();
}

function pause() {
	if (paused) {
		return;
	}
	paused = true;
	audioMusic.pause();
	audioWin.pause();
	clearInterval(autoRedrawSetIntervalId);
	if (!won) {
		setGameStatus("Oops! Crashed into a wall!");
		oopsCount++;
		playSoundOrMusic(audioScatter);
		loadGame(player.left, player.top);
	}
}

window.onblur = pause;

// Quick cheat to access the levels most people will see.
document.onkeydown = function handleKeyDown(event) {
	if (paused) {
		return;
	}
	
	event = event || window.event;
	var newLevel = event.keyCode - 48;
	if ( newLevel > 0 && newLevel < Math.min(10, MAX_LEVEL) ) {
		won = true;
		level = newLevel;
		saveCurrentLevelNumber();
		playAgain();
	}
}

function handleMouseMove(e) {
	unpause();
	
	// Convert mouse coordinates into canvas coordinates.
	var mouseX = e.clientX - canvas.offsetLeft + window.pageXOffset;
	var mouseY = e.clientY - canvas.offsetTop + window.pageYOffset;
	
	var newPlayerLeft = mouseX - player.image.width /2;
	var newPlayerTop = mouseY - player.image.height + 4;
	
	// Adjust player image based on direction moved.
	if ( player.left < newPlayerLeft ) {
		player.image = imageSkate1;
	} else {
		player.image = imageSkate2;
	}

	// Adjust player position.	
	player.move(newPlayerLeft, newPlayerTop);

	draw();
}

// Let's see, I've only been coding 16 hours straight now. It's time to add some HTML5 local storage! Yeah!

function checkForHTML5LocalStorageInWindow() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function saveCurrentLevelNumber() {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return;
	}
	localStorage.setItem(CURRENT_LEVEL_KEY, level);
}

function getCurrentLevelNumber(defaultValue) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return defaultValue;
	}
	var storedCurrentLevelNumber = localStorage.getItem(CURRENT_LEVEL_KEY);
	if ( null == storedCurrentLevelNumber ) {
		return defaultValue;
	}
	return parseInt(storedCurrentLevelNumber);
}

function saveHighestLevelNumber(highestLevel) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return;
	}
	localStorage.setItem(HIGHEST_LEVEL_KEY, highestLevel);
}

function getHighestLevelNumber(defaultValue) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return defaultValue;
	}
	var storedHighestLevelNumber = localStorage.getItem(HIGHEST_LEVEL_KEY);
	if ( null == storedHighestLevelNumber ) {
		return defaultValue;
	}
	return parseInt(storedHighestLevelNumber);
}

function saveLowestTime(newLowestTime) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return;
	}
	localStorage.setItem(LOWEST_TIME_KEY, newLowestTime);
}

function getLowestTime(defaultValue) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return defaultValue;
	}
	var storedLowestTime = localStorage.getItem(LOWEST_TIME_KEY);
	if ( null == storedLowestTime ) {
		return defaultValue;
	}
	return parseInt(storedLowestTime);
}

function saveSoundAndMusicEnabled(newSoundAndMusicEnabled) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return;
	}
	localStorage.setItem(SOUND_AND_MUSIC_ENABLED_KEY, newSoundAndMusicEnabled);
}

function getSoundAndMusicEnabled(defaultValue) {
	if ( !checkForHTML5LocalStorageInWindow() ) {
		return defaultValue;
	}
	var storedSoundAndMusicEnabled = localStorage.getItem(SOUND_AND_MUSIC_ENABLED_KEY);
	if ( null == storedSoundAndMusicEnabled ) {
		return defaultValue;
	}
	return "true" == storedSoundAndMusicEnabled;
}




