var express = require("express");
var app = express();
var port = process.env.PORT || 8080;

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
	res.render("index");
});

app.use(express.static(__dirname + '/public'));

var io = require('socket.io').listen(app.listen(port));
console.log("Listening on port " + port);

var gameState = 0; //0: not yet started, 1: running

playerRoles = [
	{role: 'villager', group: 'village'},
	{role: 'villager', group: 'village'},
	{role: 'villager', group: 'village'},
	{role: 'cop', group: 'village'},
	{role: 'doctor', group: 'village'},
	{role: 'mafioso', group: 'mafia'},
	{role: 'mafioso', group: 'mafia'}
];

function shuffle(array) {
	var m = array.length, t, i;

	while (m) {
		i = Math.floor(Math.random() * m--);

		t = array[m];
		array[m] = array[i];
		array[i] = t;
	}

	return array;
}

function assignRoles() {
	var players = [];
	io.sockets.clients().forEach(function (socket) {
		players.push(socket);
	});
	players = shuffle(players);

	for (var i = 0; i < players.length; i++) {
		if (i <= playerRoles.length - 1) {
			players[i].join(playerRoles[i].role);
			players[i].join(playerRoles[i].group);
			players[i].emit('message', { message: 'You have been assigned the role of ' + playerRoles[i].role + '. You are affiliated with the ' + playerRoles[i].group + '.' });
		} else {
			players[i].join('spectator');
			players[i].emit('message', { message: 'Since the roles are full, you have been assigned the role of spectator.' });
		}
	}
}

function initializeGame() {
	assignRoles();
	gameState = 1;
}

function startingCountdown(duration, ticks) {
	ticksLeft = duration - ticks;
	if (ticksLeft) {
		io.sockets.emit('announcement', { message: 'Game starting in ' + ticksLeft + ' second(s)'});
		setTimeout(startingCountdown, 1000, duration, ticks + 1);
	} else {
		io.sockets.emit('announcement', { message: 'Game starting now'});
		initializeGame();
	}
}

function checkNumPlayers() {
	var clients = io.sockets.clients().length;
	var reqPlayers = playerRoles.length;
	if(clients >= reqPlayers) {
		io.sockets.emit('announcement', { message: 'Required number of players reached'});
		setTimeout(startingCountdown, 1000, 10, 0);
	} else {
		io.sockets.emit('announcement', { message: 'Waiting on ' + (reqPlayers - clients) + ' more players'});
	}
}

io.sockets.on('connection', function (socket) {
	socket.emit('message', { message: 'Welcome to the lobby.' });
	io.sockets.emit('message', { message: 'A new client has connected.' });

	if(!gameState){
		checkNumPlayers();
	} else {
		socket.emit('message', { message: 'The game you are trying to join has already started.' });
	}

	socket.on('disconnect', function() {
		io.sockets.emit('message', { message: 'A client has disconnected.' });
		if(!gameState){
			setTimeout(function() {
				checkNumPlayers();
			}, 1000);
		}
	});

	socket.on('send', function (data) {
		io.sockets.emit('message', data);
	});
});
