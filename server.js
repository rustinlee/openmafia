var express = require("express");
var app = express();
var port = process.env.PORT || 8080;

var game = require('./game');

app.set('views', __dirname + '/views');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
	res.render("index");
});

app.use(express.static(__dirname + '/public'));

io = require('socket.io').listen(app.listen(port));
io.set('log level', 2);
console.log("Listening on port " + port);

io.sockets.on('connection', function (socket) {
	socket.emit('message', { message: 'Welcome to the lobby.' });
	socket.broadcast.emit('message', { message: 'A new client has connected.' });

	socket.game_alive = false;

	if(!game.state()){
		socket.emit('message', { message: 'Please pick a nickname to register as a player.' });
		game.checkNumPlayers();
	} else {
		socket.emit('message', { message: 'The game you are trying to join has already started.' });
	}

	socket.on('disconnect', function() {
		io.sockets.emit('message', { message: 'A client has disconnected.' });
		if(!game.state()){
			setTimeout(function() {
				game.checkNumPlayers();
			}, 1000);
		}
	});

	socket.on('send', function (data) {
		if (socket.game_nickname) {
			data.username = socket.game_nickname;
			if (!game.state()) {
				io.sockets.emit('message', data);
			} else {
				game.filterMessage(socket, data);
			}
		} else {
			socket.emit('alert', { message: 'Please set a nickname.'});
		}
	});

	socket.on('vote', function (data) {
		game.vote(socket, data);
	});

	socket.on('changeNick', function (data) {
		if (data) {
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
