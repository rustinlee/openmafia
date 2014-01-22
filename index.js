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

function checkNumPlayers() {
	var clients = io.sockets.clients().length;
	var reqPlayers = 7;
	if(clients >= reqPlayers) {
		io.sockets.emit('announcement', { message: 'Required number of players reached'});
		//start the game loop here
	} else {
		io.sockets.emit('announcement', { message: 'Waiting on ' + (reqPlayers - clients) + ' more players'});
	}
}

io.sockets.on('connection', function (socket) {
	socket.emit('message', { message: 'Welcome to the lobby.' });
	io.sockets.emit('message', { message: 'A new client has connected.' });

	checkNumPlayers();

	socket.on('disconnect', function() {
		io.sockets.emit('message', { message: 'A client has disconnected.' });
		setTimeout(function() {
			checkNumPlayers();
		}, 1000);
	})

	socket.on('send', function (data) {
		io.sockets.emit('message', data);
	});
});
