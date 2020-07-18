var close = document.getElementById("close");
var userExpand = document.getElementById("userExpand");
close.addEventListener("click", () => {
	userExpand.style.display = "none";
	document.getElementById('signup').style.display = 'none';
	document.getElementById('login').style.display = 'none';
});

//setTimeout(() => {
//	userExpand.style.display = "inline-block";
//}, 5000);

function onSignIn(googleUser) {
	var profile = googleUser.getBasicProfile();
	console.log('ID: ' + profile.getId());
	console.log('Name: ' + profile.getName());
	console.log('Image URL: ' + profile.getImageUrl());
	console.log('Email: ' + profile.getEmail());
}

let keysPressed = {};
let mouseIsPressed = false;


document.addEventListener('keydown', (e) => {
	keysPressed[e.key] = true;
});

document.addEventListener('keyup', (e) => {
	keysPressed[e.key] = false;
});

let touchX = 0;
let touchY = 0;

document.addEventListener('mouseup', (e) => {
	mouseIsPressed = true;
	touchX = e.clientX;
	touchY = e.clientY;
});

document.addEventListener('mousedown', (e) => {
	mouseIsPressed = false;
	touchX = e.clientX;
	touchY = e.clientY;
});

let touch = false;

document.body.addEventListener('touchstart', function(e) {
	touch = true;
	touchX = e.touches[0].clientX;
	touchY = e.touches[0].clientY;
}, false);

document.body.addEventListener('touchend', function(e) {
	touch = false;
});

document.body.addEventListener('touchmove', function(e) {
	touch = true;
	touchX = e.touches[0].clientX;
	touchY = e.touches[0].clientY;
	e.preventDefault();
});

var socket;
var x = 0,y = 0;

document.body.addEventListener("mousemove", function(e) {
	x = e.clientX;
	y = e.clientY;
});

//document.getElementById("play").addEventListener("click", function() {
//this.style.display = "none";
socket = io();
socket = io.connect(window.location.href);
var id;
var elements = [];

//var elem = document.getElementById('game');
//var two = new Two({fullscreen: true}).appendTo(elem);
//
var players = {};
var flags = [];

const app = new PIXI.Application({
width:innerWidth,
height:innerHeight,
antialias: true,
});
document.body.appendChild(app.view);
window.onresize = function() {
	app.renderer.resize(innerWidth, innerHeight);
}

PIXI.Loader.shared
.load(setup);
function setup() {
	//Create the cat sprite
	//	cat = new PIXI.Sprite(PIXI.Loader.shared.resources["oof.jpg"].texture);
	//	cat.x = innerWidth*0.5;
	//	cat.y = innerHeight*0.5;
	//	cat.anchor.x = 0.5;
	//	cat.anchor.y = 0.5;
	//	cat.rotation = 0.5;
	//Add the cat to the stage
	//app.stage.addChild(cat);
	app.ticker.add(delta => gameLoop(delta));
}
let flagContainer = new PIXI.Container();
flagContainer.zIndex = 0;
let playerContainer = new PIXI.Container();
playerContainer.zIndex = 1;
let bullets = [];

socket.on("state", (data) => {
	if(id) {
		for(var i in data.players) {
			if(!players[i]) {
				players[i] = new PIXI.Graphics();
				players[i].beginFill(data.players[i].side == "red" ? 0xFF0000 : 0x3377FF);
				players[i].drawCircle(0, 0, 20);
				players[i].x = data.players[i].x;
				players[i].y = data.players[i].y;
				players[i].endFill();
				app.stage.addChild(players[i]);
			}
			players[i].tX = data.players[i].x;
			players[i].tY = data.players[i].y;
			players[i].width = data.players[i].radius*2;
			players[i].height = data.players[i].radius*2;
			players[i].side = data.players[i].side;
			players[i].hasFlag = data.players[i].hasFlag;
		}
		for(var i = 0; i < data.bullets.length; i++) {
			bullets.push(data.bullets[i]);
		}
		if(!flags[0]) {
			flags[0] = new PIXI.Graphics();
			flags[0].lineStyle(4, 0xFF0000, 1);
			flags[0].drawCircle(0,0,22);
			app.stage.addChild(flags[0]);
			flags[0].x = data.flags[0].x;
			flags[0].y = data.flags[0].y;
			flags[1] = new PIXI.Graphics();
			flags[1].lineStyle(4, 0x3377FF, 1);
			flags[1].drawCircle(0,0,22);
			app.stage.addChild(flags[1]);
			flags[1].x = data.flags[1].x;
			flags[1].y = data.flags[1].y;
		}
	}
});

socket.on('connect', () => {
	if(!id) {
		socket.emit('join', '', (data) => {
			id = data;
		});
		socket.emit('getElements', '', (data) => {
			for(var i = 0; i < data.length; i+=4) {
				elements[i*0.25] = new PIXI.Graphics();
				elements[i*0.25].beginFill(0xaaaaaa);
				elements[i*0.25].drawRect(data[i], data[i+1],data[i+2], data[i+3]);
				elements[i*0.25].endFill();
				app.stage.addChild(elements[i*0.25]);
			}
		});
	}
});

function gameLoop(delta) {
	if(players[id]) {
		if(keysPressed['ArrowRight'] && keysPressed['ArrowDown']) socket.emit('move', [1,1]);
		else if(keysPressed['ArrowRight'] && keysPressed['ArrowUp']) socket.emit('move',  [1,-1]);
		else if(keysPressed['ArrowLeft'] && keysPressed['ArrowDown']) socket.emit('move',  [-1,1]);
		else if(keysPressed['ArrowLeft'] && keysPressed['ArrowUp']) socket.emit('move',  [-1,-1]);
		else if(keysPressed['ArrowRight']) socket.emit('move', [1,0]);
		else if(keysPressed['ArrowLeft']) socket.emit('move', [-1,0]);
		else if(keysPressed['ArrowDown']) socket.emit('move', [0,1]);
		else if(keysPressed['ArrowUp']) socket.emit('move', [0,-1]);
		else if(touch) socket.emit('move', [Math.abs(touchX-innerWidth*0.5) > 20 ? touchX-innerWidth*0.5 : 0, Math.abs(touchY-innerHeight*0.5) > 20 ? touchY-innerHeight*0.5 : 0]);
		for(var i in players) {
			players[i].x += (players[i].tX - players[i].x) * 0.16;
			players[i].y += (players[i].tY - players[i].y) * 0.16;
			if(players[i].hasFlag) {
				flags[players[i].side == "red" ? 1:0].x = players[i].x;
				flags[players[i].side == "red" ? 1:0].y = players[i].y;
			}
		}
		app.stage.setTransform(-players[id].x + innerWidth * 0.5, -players[id].y + innerHeight * 0.5);
		if(mouseIsPressed || touch) {
			socket.emit("fired", [touchX, touchY]);
		}
		console.log(delta);
	}
}

//collision = two.makeCircle(0,0,5);
//collision.fill = 'rgba(255,0,0,255)';
//
//two.bind('update', function(frameCount) {
//
//	for(var i in players) {
//		if(players[id]) {
//		if(!players[i].shape) players[i].shape = two.makeCircle(0,0,20);
//		//if(!players[i].shape2) players[i].shape2 = two.makeCircle(0,0,20);
//		players[i].x += (playersT[i].x - players[i].x) * 0.16;
//		players[i].y += (playersT[i].y - players[i].y) * 0.16;
//		players[i].shape.translation.set(players[i].x-players[id].x + innerWidth*0.5, players[i].y-players[id].y + innerHeight*0.5);
//		//players[i].shape2.translation.set(playersT[i].x, playersT[i].y);
//		}
//	}
//	if(players[id]) {
//		elementsG.translation.set(-players[id].x+innerWidth*0.5,-players[id].y+innerHeight*0.5);
//	}
//}).play();
