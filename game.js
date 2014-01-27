var state = 0; //0: not yet started, 1: night, 2: day

var dayStart = false;

var dayDuration = 60,
	nightDuration = 30;

var dayCount = 0,
	nightCount = 0;

var playerRoles = [
	{role: 'villager', group: 'village'},
	{role: 'villager', group: 'village'},
	{role: 'villager', group: 'village'},
	{role: 'cop', group: 'village'},
	{role: 'doctor', group: 'village'},
	{role: 'mafioso', group: 'mafia'},
	{role: 'mafioso', group: 'mafia'}
];

function shuffle (array) {
	var m = array.length, t, i;

	while (m) {
		i = Math.floor(Math.random() * m--);

		t = array[m];
		array[m] = array[i];
		array[i] = t;
	}

	return array;
}

function assignRoles () {
	var players = [];
	io.sockets.clients().forEach(function (socket) {
		players.push(socket);
	});
	players = shuffle(players);

	for (var i = 0; i < players.length; i++) {
		if (i <= playerRoles.length - 1) {
			players[i].game_alive = true;
			players[i].join('alive');
			players[i].join(playerRoles[i].role);
			players[i].join(playerRoles[i].group);
			players[i].emit('message', { message: 'You have been assigned the role of ' + playerRoles[i].role + '. You are affiliated with the ' + playerRoles[i].group + '.' });
		} else {
			players[i].game_alive = false;
			players[i].join('spectator');
			players[i].emit('message', { message: 'Since the roles are full, you have been assigned the role of spectator.' });
		}
	}
}

function killPlayer (socket) {
	socket.game_alive = false;
	socket.leave('alive');

	if (state == 1) {
		io.sockets.emit('message', { message: socket.game_nickname + ' was killed in the night!'});
	} else if (state == 2) {
		io.sockets.emit('message', { message: socket.game_nickname + ' was lynched by the town!'});
	}

	socket.emit('disableField', false);
	socket.emit('displayVote', true);
	socket.emit('disableVote', true);

	socket.leave('village');
	socket.leave('mafia');
	socket.join('spectator');
}

var endDay = false;

function dayLoop(duration, ticks) {
	var ticksLeft = duration - ticks;
	if (ticksLeft && !endDay) {
		io.sockets.emit('announcement', { message: 'Day ends in ' + ticksLeft + ' second(s)'});
		setTimeout(dayLoop, 1000, duration, ticks + 1);
	} else {
		nightCount++;
		io.sockets.emit('header', { message: 'Night ' + nightCount });
		io.sockets.emit('announcement', { message: 'It is now nighttime'});

		io.sockets.in('mafia').emit('clearTargets');

		io.sockets.clients('village').forEach(function (socket) {
			socket.emit('disableField', true);
			socket.emit('displayVote', false);
			io.sockets.in('mafia').emit('validTarget', socket.game_nickname);
		});

		var votingPlayers = [];
		io.sockets.clients('mafia').forEach(function (socket) {
			votingPlayers.push(socket.game_nickname);

			socket.game_voted = false;
		});

		io.sockets.in('mafia').emit('votingPlayers', votingPlayers);

		setTimeout(nightLoop, 1000, nightDuration, 0);
		state = 1;
		endDay = false;
	}
}

function nightLoop(duration, ticks) {
	var ticksLeft = duration - ticks;
	if (ticksLeft && !endDay) {
		io.sockets.emit('announcement', { message: 'Night ends in ' + ticksLeft + ' second(s)'});
		setTimeout(nightLoop, 1000, duration, ticks + 1);
	} else {
		dayCount++;
		io.sockets.emit('header', { message: 'Day ' + dayCount });
		io.sockets.emit('announcement', { message: 'It is now daytime'});

		io.sockets.emit('disableField', false);
		io.sockets.emit('displayVote', true);

		io.sockets.emit('clearTargets');

		io.sockets.clients('alive').forEach(function (socket) {
			io.sockets.in('alive').emit('validTarget', socket.game_nickname);
		});

		var votingPlayers = [];
		io.sockets.clients('alive').forEach(function (socket) {
			votingPlayers.push(socket.game_nickname);

			socket.game_voted = false;
		});

		io.sockets.emit('votingPlayers', votingPlayers);

		setTimeout(dayLoop, 1000, dayDuration, 0);
		state = 2;
		endDay = false;
	}
}

function initialize () {
	assignRoles();
	if (dayStart) {
		nightLoop(0, 0);
	} else {
		io.sockets.in('mafia').emit('displayVote', true);
		dayLoop(0, 0);
	}
}

var startingCountdownTimer = null;
function startingCountdown (duration, ticks) {
	var ticksLeft = duration - ticks;
	if (ticksLeft) {
		io.sockets.emit('announcement', { message: 'Game starting in ' + ticksLeft + ' second(s)'});
		startingCountdownTimer = setTimeout(startingCountdown, 1000, duration, ticks + 1);
	} else {
		io.sockets.emit('announcement', { message: 'Game starting now'});
		initialize();
	}
}

function countVotes (arr) {
	var a = [], b = [], prev;

	arr.sort();
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] !== prev) {
			a.push(arr[i]);
			b.push(1);
		} else {
			b[b.length-1]++;
		}
		prev = arr[i];
	}

	var results = [];

	for (var i = 0; i < a.length; i++) {
		results.push({'username': a[i], 'votes': b[i]});
	};

	results.sort(function (a, b) {
		return (b.votes - a.votes);
	});

	return results; //todo: randomize results if 2 players tie (currently sorts alphabetically)
}

var votes = [];
function checkVotes () {
	var votedFlag = true;
	if (state == 1) {
		io.sockets.clients('mafia').forEach(function (socket) {
			if (!socket.game_voted) {
				votedFlag = false;
			}
		});
	} else if (state == 2) {
		io.sockets.clients('alive').forEach(function (socket) {
			if (!socket.game_voted) {
				votedFlag = false;
			}
		});
	}

	if (votedFlag) {
		endDay = true;
		var results = countVotes(votes);
		io.sockets.clients().forEach(function (socket) {
			if (socket.game_nickname == results[0].username) {
				killPlayer(socket);
			}
		});
		votes = [];
	}
}

module.exports = {
	checkNumPlayers: function() {
		var validClients = io.sockets.clients();
		validClients = validClients.filter(function (socket) {
			return (socket.game_nickname);
		});
		var numClients = validClients.length;
		var reqPlayers = playerRoles.length;
		if(numClients >= reqPlayers) {
			io.sockets.emit('announcement', { message: 'Required number of players reached'});
			startingCountdownTimer = setTimeout(startingCountdown, 1000, 10, 0);
		} else {
			io.sockets.emit('announcement', { message: 'Waiting on ' + (reqPlayers - numClients) + ' more players'});
			clearTimeout(startingCountdownTimer);
		}
		io.sockets.emit('header', { message: 'Pre-game Lobby' });
	},
	filterMessage: function(socket, data) {
		var clientRooms = io.sockets.manager.roomClients[socket.id];
		if (clientRooms['/spectator'] || !socket.game_alive) {
			data.message = '<font color="red">' + data.message + '</font>';
			io.sockets.in('spectator').emit('message', data);
		} else if (state == 1) {
			if (clientRooms['/mafia']) {
				io.sockets.in('mafia').emit('message', data);
			}
		} else {
			io.sockets.emit('message', data);
		}
	},
	vote: function(socket, data) {
		data.username = socket.game_nickname;

		var isValid = true;
		var clientRooms = io.sockets.manager.roomClients[socket.id];
		if (state == 1 && clientRooms['/mafia']) {
			io.sockets.in('mafia').emit('playerVote', data);
		} else if (state == 2) {
			io.sockets.emit('playerVote', data);
		} else {
			isValid = false;
		}

		if (isValid) {
			socket.game_voted = true;
			votes.push(data.message);
			checkVotes();
		}
	},
	state: function() {
		return state;
	}
};
