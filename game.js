var state = 0; //-1: starting, 0: not yet started, 1: night, 2: day, 3: finished

var dayStart = false;

var dayDuration = 60,
	nightDuration = 30;

var dayCount = 0,
	nightCount = 0;

//role definitions, to be moved to a JSON file at some point in the near future
var role_villager = {
	name: 'villager', //the role's reported name (ex: paranoid cops will still be named 'cop')
	group: 'village', //group players assigned the role are affiliated with
	power: false //does the role have any special actions at nighttime
};

var role_cop = {
	name: 'cop',
	group: 'village',
	power: true,
	powerFunc: function (socket, chosenPlayer) { //investigates a player during the night and reports their group affiliation
		socket.emit('message', { message: 'It appears that ' + chosenPlayer.game_nickname + ' is affiliated with the ' + chosenPlayer.game_role.group + '.'});
	}
};

var role_doctor = {
	name: 'doctor',
	group: 'village',
	power: true,
	powerFunc: function (socket, chosenPlayer) { //chooses a player to visit during the night to protect from dying overnight
		if (chosenPlayer.game_dying) {
			socket.emit('message', { message: 'When you open the door to ' + chosenPlayer.game_nickname + '\'s house, you see them face down in a pool of blood! You quickly patch them up before any permanent damage is done.'});
			chosenPlayer.game_immunity = true;
		} else {
			socket.emit('message', { message: 'You pay ' + chosenPlayer.game_nickname + ' a visit right before dawn breaks, only to find them already in perfect health.'});
		}
	}
};

var role_mafioso = {
	name: 'mafioso',
	group: 'mafia',
	power: false
};
//end role definitions

var playerRoles = [
	role_villager,
	role_villager,
	role_villager,
	role_cop,
	role_doctor,
	role_mafioso,
	role_mafioso
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
			players[i].game_role = playerRoles[i];
			players[i].join(playerRoles[i].group);
			players[i].emit('message', { message: 'You have been assigned the role of ' + playerRoles[i].name + '. You are affiliated with the ' + playerRoles[i].group + '.' });
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
		io.sockets.emit('message', { message: socket.game_nickname + ', the ' + socket.game_role.name + ', was killed in the night!'});
	} else if (state == 2) {
		io.sockets.emit('message', { message: socket.game_nickname + ', the ' + socket.game_role.name + ', was lynched by the town!'});
	}

	socket.emit('disableField', false);
	socket.emit('displayVote', true);
	socket.emit('disableVote', true);

	socket.game_role = null;
	socket.leave('village');
	socket.leave('mafia');
	socket.join('spectator');
}

function endGame (winner) {
	state = 3;
	io.sockets.emit('header', { message: 'Game over' });
	io.sockets.emit('announcement', { message: winner + ' wins the game!' });0
	io.sockets.clients('alive').forEach(function (socket) {
		killPlayer(socket);
	});
}

function countedVotes (arr) {
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

function handleVotes () {
	var votes = [];
	(state == 1) ? votingGroup = 'mafia' : votingGroup = 'alive' ;
	io.sockets.clients(votingGroup).forEach(function (socket) {
		if (!socket.game_vote) {
			votes.push('');
		} else {
			votes.push(socket.game_vote);
		}
	});

	var results = countedVotes(votes);
	if (results[0].votes >= ((Math.floor(io.sockets.clients(votingGroup).length / 2)) + 1)) {
		io.sockets.clients().forEach(function (socket) {
			if (socket.game_nickname === results[0].username) {
				socket.game_dying = true;
			} else {
				socket.game_dying = false;
			}
		});
	}
}

function handlePowerVotes () {
	io.sockets.clients('alive').forEach(function (socket) {
		if (socket.game_powerVote && socket.game_role.power && socket.game_nickname != socket.game_powerVote) {
			io.sockets.clients().forEach(function (socket2) {
				if (socket.game_powerVote == socket2.game_nickname) {
					socket.game_role.powerFunc(socket, socket2);
					socket.game_powerVote = null;
				}
			});
		}
	});
}

var endDay = false;
function dayLoop(duration, ticks) {
	var villageVictory = (io.sockets.clients('mafia').length === 0);

	var ticksLeft = duration - ticks;
	if (ticksLeft && !endDay) {
		io.sockets.emit('announcement', { message: 'Day ends in ' + ticksLeft + ' second(s)'});
		setTimeout(dayLoop, 1000, duration, ticks + 1);
	} else if (villageVictory) {
		endGame('Village');
	} else {
		if (dayCount > 0 || nightCount > 0) {
			handleVotes();
			io.sockets.clients('alive').forEach(function (socket) {
				if (socket.game_dying) {
					killPlayer(socket);
				}
			});
		}

		nightCount++;
		io.sockets.emit('header', { message: 'Night ' + nightCount });
		io.sockets.emit('announcement', { message: 'It is now nighttime'});

		io.sockets.emit('clearTargets');

		io.sockets.clients('village').forEach(function (socket) {
			socket.emit('disableField', true);
			socket.emit('displayVote', false);
			io.sockets.in('mafia').emit('validTarget', socket.game_nickname);
		});

		var powerRoles = io.sockets.clients('alive').filter(function (socket) {
			return socket.game_role.power;
		});

		powerRoles.forEach(function (socket) {
			io.sockets.clients('alive').forEach(function (socket2) {
				if (socket.game_nickname != socket2.game_nickname) {
					socket.emit('validTarget', socket2.game_nickname);
				}
			});
			socket.emit('displayVote', true);
		});

		var votingPlayers = [];
		io.sockets.clients('mafia').forEach(function (socket) {
			votingPlayers.push(socket.game_nickname);

			socket.game_vote = null;
		});

		io.sockets.in('mafia').emit('votingPlayers', votingPlayers);

		setTimeout(nightLoop, 1000, nightDuration, 0);
		state = 1;
		endDay = false;
	}
}

function nightLoop(duration, ticks) {
	var mafiaVictory = (io.sockets.clients('mafia') >= io.sockets.clients('village'));

	var ticksLeft = duration - ticks;
	if (ticksLeft && !endDay) {
		io.sockets.emit('announcement', { message: 'Night ends in ' + ticksLeft + ' second(s)'});
		setTimeout(nightLoop, 1000, duration, ticks + 1);
	} else if (mafiaVictory) {
		endGame('Mafia');
	} else {
		if (dayCount > 0 || nightCount > 0) {
			handleVotes();
			handlePowerVotes();
			io.sockets.clients('alive').forEach(function (socket) {
				if (socket.game_dying) {
					if (socket.game_immunity) {
						socket.emit('message', { message: 'You wake up covered in bloodied bandages with a horrible headache, remembering nothing of the previous night.'});
							socket.game_dying = false;
					} else {
						killPlayer(socket);
					}
				}

				socket.game_immunity = false; //immunity only lasts the night it is given
			});
		}

		dayCount++;
		io.sockets.emit('header', { message: 'Day ' + dayCount });
		io.sockets.emit('announcement', { message: 'It is now daytime'});

		io.sockets.in('alive').emit('disableField', false);
		io.sockets.in('alive').emit('displayVote', true);

		io.sockets.in('alive').emit('clearTargets');

		io.sockets.clients('alive').forEach(function (socket) {
			io.sockets.in('alive').emit('validTarget', socket.game_nickname);
		});

		var votingPlayers = [];
		io.sockets.clients('alive').forEach(function (socket) {
			votingPlayers.push(socket.game_nickname);

			socket.game_vote = null;
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

function hasEveryoneVoted () {
	var votedFlag = true;
	if (state == 1) {
		io.sockets.clients('alive').forEach(function (socket) {
			if (socket.game_role.power && !socket.game_powerVote) {
				votedFlag = false;
			} else if (socket.game_role.group == 'mafia' && !socket.game_vote) {
				votedFlag = false;
			}
		});
	} else if (state == 2) {
		io.sockets.clients('alive').forEach(function (socket) {
			if (!socket.game_vote) {
				votedFlag = false;
			}
		});
	}

	return votedFlag;
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
			state = -1;
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
		if (!socket.game_role.power) {
			if (state == 1 && clientRooms['/mafia']) {
				io.sockets.in('mafia').emit('playerVote', data);
			} else if (state == 2) {
				io.sockets.emit('playerVote', data);
			} else {
				isValid = false;
			}
		} else {
			if (state == 1) {
				socket.game_powerVote = data.message;
			} else if (state == 2) {
				io.sockets.emit('playerVote', data);
			} else {
				isValid = false;
			}
		}

		if (isValid) {
			if (!socket.game_role.power || state == 2) {
				socket.game_vote = data.message; //this will have to be reworked once mafia power roles are introduced
			}

			if (hasEveryoneVoted()) {
				endDay = true;
			}
		}
	},
	state: function() {
		return state;
	}
};
