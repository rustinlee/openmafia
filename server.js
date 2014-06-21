var express = require("express");
var app = express();
global.argv = require ('optimist')
	.boolean('custom')
	.boolean('debug')
	.boolean('wills')
	.alias('t', 'countdown')
	.argv
;
var port = process.env.PORT || 8080;

var game = require('./game');
if(argv.wills)
	game.enableWills();

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
	res.render("index");
});

app.use(express.static(__dirname + '/public'));

global.io = require('socket.io').listen(app.listen(port));
console.log("Listening on port " + port);

var debug = argv.debug;
if (debug) {
	io.set('log level', 3);

	console.log('Arguments:\n' + JSON.stringify(argv, null, 2));
} else {
	io.set('log level', 2);
}

var defaultCountdownTime = debug ? 3 : 10;
game.countdownTime = argv.countdown || defaultCountdownTime;
console.log(game.countdownTime);

io.sockets.on('connection', function (socket) {
	socket.emit('message', { message: 'Welcome to the lobby.' });
	socket.broadcast.emit('message', { message: 'A new client has connected.' });

	//request announcement and header from the game
	socket.emit('announcement', { message: game.announcement() });
	socket.emit('header', { message: game.header() });

	socket.game_alive = false;

	socket.game_inventory = [];

	socket.last_msg_time = Date.now();

	if(!debug) {
		if(!game.state()){
			socket.emit('message', { message: 'Please pick a nickname to register as a player.' });
			game.checkNumPlayers();
		} else {
			socket.emit('message', { message: 'The game you are trying to join has already started.' });
		}
	} else {
		socket.game_nickname = socket.id;
		socket.emit('hideNameField');
		if(!game.state()){
			game.checkNumPlayers();
		}
	}

	socket.on('disconnect', function() {
		if (socket.game_nickname) {
			io.sockets.emit('message', { message: socket.game_nickname + ' has disconnected.' });
		} else {
			io.sockets.emit('message', { message: 'A client has disconnected.' });
		}

		if(!game.state()){
			setTimeout(function() {
				game.checkNumPlayers();
			}, 1000);
		}
	});

	socket.on('send', function (data) {
		if (socket.game_nickname) {
			if (data.message.length) {
				if (Date.now() - socket.last_msg_time > 1000) {
					data.username = socket.game_nickname;
					if (!game.state()) {
						io.sockets.emit('message', data);
					} else {
						game.filterMessage(socket, data);
					}

					socket.last_msg_time = Date.now();
				} else {
					socket.emit('message', { message: 'Please slow down your messages.'});
				}
			}
		} else {
			socket.emit('alert', { message: 'Please set a nickname.'});
		}
	});

	socket.on('vote', function (data) {
		game.vote(socket, data);
	});

	socket.on('itemUse', function (data) {
		game.itemUse(socket, data);
	});

	socket.on('changeNick', function (data) {
		if (data && !socket.game_nickname) {
			var isUnique = true;
			io.sockets.clients().forEach(function (socket) {
				if (data == socket.game_nickname) { //custom properties prefixed with game_ so as to not cause collisions
					isUnique = false;
				}
			});

			if (isUnique) {
				socket.game_nickname = data;
				socket.emit('hideNameField');
				if(!game.state()){
					game.checkNumPlayers();
				}
			} else {
				socket.emit('alert', { message: 'Nickname is not unique.'});
			}
		} else {
			socket.emit('alert', { message: 'Nickname is not valid.' });
		}
	});
});
