const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', express.static('public'));

app.post('/', (req, res) => {
	console.log(req.body);
	res.sendStatus(200);
});

var gameOver = false;
const speed = 10;
const elements = [0,1,10,1009,
				  1,0,2009,10,
				  0,1000,2009,10,
				  2000,0,10,1009,
				  300,100,100,100,
				  300,800,100,100,
				  300,450,100,100,
				  500,200,10,200,
				  500,600,10,200,
				  700,495,250,10,
				  1600,100,100,100,
				  1600,800,100,100,
				  1600,450,100,100,
				  1490,200,10,200,
				  1490,600,10,200,
				  1050,495,250,10,
				  ];

const gameState = {
players:{},
flags:[],
red:0,
blue:0,
numPlayers:0,
bullets:[]
}

server.listen(process.env.PORT || 8080);

io.on('connection', socket => {
	socket.on('join', (data, response) => {
		if(gameState.numPlayers == 0 || !gameState.flags[0]) {
			gameState.flags[0] = {x:50, y:500};
			gameState.flags[1] = {x:1950, y:500};
		}
		console.log('Client connected...');
		response(socket.id);
		gameState.players[socket.id] = {
		x: (gameState.red > gameState.blue) ? 1550 : 450,
		y: 500,
		radius: 20,
		lastMoved: new Date(),
		pX: 0,
		pY: 0,
		side:(gameState.red > gameState.blue) ? "blue" : "red",
		respawnTimer:0,
		hasFlag:false,
		bulletDelay:20
		}
		if(gameState.red > gameState.blue) {
			gameState.blue++;
		} else {
			gameState.red++;
		}
		gameState.numPlayers++;
	});
	socket.on('getElements', (data, response) => {
		response(elements);
	});
	socket.on('move', (data) => {
		try {
			now = new Date();
			var direction = getDirection(data);
			if(now - gameState.players[socket.id].lastMoved >= 17) {
				gameState.players[socket.id].x += direction[0] * speed;
				gameState.players[socket.id].y += direction[1] * speed;
			} else {
				gameState.players[socket.id].x += direction[0] * speed*(now - gameState.players[socket.id].lastMoved) / 17;
				gameState.players[socket.id].y += direction[1] * speed*(now - gameState.players[socket.id].lastMoved) / 17;
			}
			gameState.players[socket.id].lastMoved = new Date();
			for(var i = 0; i < elements.length; i+=4) {
				if(Math.abs(elements[i]+elements[i+2]*0.5-gameState.players[socket.id].x) < elements[i+2] * 0.5 + gameState.players[socket.id].radius && Math.abs(elements[i+1]+elements[i+3]*0.5-gameState.players[socket.id].y) < elements[i+3] * 0.5 + gameState.players[socket.id].radius) {
					var lineValueX = lineCollision(gameState.players[socket.id].x, gameState.players[socket.id].y, gameState.players[socket.id].pX, gameState.players[socket.id].pY, elements[i] - gameState.players[socket.id].radius, elements[i+1] - gameState.players[socket.id].radius, elements[i] - gameState.players[socket.id].radius, elements[i+1] + elements[i+3] + gameState.players[socket.id].radius) || lineCollision(gameState.players[socket.id].x, gameState.players[socket.id].y, gameState.players[socket.id].pX, gameState.players[socket.id].pY, elements[i] + elements[i+2] + gameState.players[socket.id].radius, elements[i+1] - gameState.players[socket.id].radius, elements[i] + elements[i+2] + gameState.players[socket.id].radius, elements[i+1] + elements[i+3] + gameState.players[socket.id].radius);
					var lineValueY = lineCollision(gameState.players[socket.id].x, gameState.players[socket.id].y, gameState.players[socket.id].pX, gameState.players[socket.id].pY, elements[i] - gameState.players[socket.id].radius, elements[i+1] - gameState.players[socket.id].radius, elements[i] + elements[i+2] + gameState.players[socket.id].radius, elements[i+1] - gameState.players[socket.id].radius) || lineCollision(gameState.players[socket.id].x, gameState.players[socket.id].y,gameState.players[socket.id].pX, gameState.players[socket.id].pY, elements[i] - gameState.players[socket.id].radius, elements[i+1] + elements[i+3] + gameState.players[socket.id].radius, elements[i] + elements[i+2] + gameState.players[socket.id].radius, elements[i+1] + elements[i+3] + gameState.players[socket.id].radius);
					if(lineValueX) {
						gameState.players[socket.id].x = lineValueX[0];
					}
					if(lineValueY) {
						gameState.players[socket.id].y = lineValueY[1];
					}
				}
			}
			if(Math.hypot(gameState.players[socket.id].x - gameState.flags[gameState.players[socket.id].side == "blue" ? 0:1].x, gameState.players[socket.id].y - gameState.flags[gameState.players[socket.id].side == "blue" ? 0:1].y) < 20) {
				gameState.players[socket.id].hasFlag = true;
				gameState.players[socket.id].radius = 24;
			}
			gameState.players[socket.id].pX = gameState.players[socket.id].x;
			gameState.players[socket.id].pY = gameState.players[socket.id].y;
		} catch(e) {
			console.log("Uh oh: " + e.stack);
		}
	});
	
	socket.on("fired", (data) => {
		try{
		var direction = getDirection(data);
		if(gameState.players[socket.id].bulletDelay < 0) {
			gameState.bullets.push[{x:data[0], y:data[1], vX: direction[0]*20, vY: direction[1]*20}];
		}
		}catch(e){
			console.log(e);
		}
	});
	
	socket.on('disconnect', () => {
		gameState.numPlayers--;
		if(gameState.numPlayers == 0) {
			gameState.players = {};
		}
	});
});
var prevT = new Date();

setInterval(() => {
	for(var i in gameState.players) {
		gameState.players[i].bulletDelay--;
	}
	for(var i = 0; i < gameState.bullets.length; i++) {
		gameState.bullets[i].x += gameState.bullets[i].vX;
		gameState.bullets[i].y += gameState.bullets[i].vY;
	}
	io.sockets.emit('state', gameState);
	console.log(prevT - new Date());
	prevT = new Date();
}, 30);

const getDirection = (data) => {
	var length = Math.sqrt(data[0]*data[0]+data[1]*data[1]);
	return [data[0]/length || 0, data[1]/length || 0];
}

const lineCollision = (x1, y1, x2, y2, x3, y3, x4, y4) => {
	var a = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
	var b = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
	if (a >= 0 && a <= 1 && b >= 0 && b <= 1) return [x1 + (a * (x2-x1)), y1 + (a * (y2-y1))];
	return undefined;
};
