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

	if(!game.state()){
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
		if (!game.state()) {
			io.sockets.emit('message', data);
		} else {
			game.filterMessage(socket, data);
		}
	});
});
