$(document).ready(function() {
	var messages = [];
	var socket = io.connect('http://'+location.host);
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
	var nameButton = document.getElementById("nick");
	var content = document.getElementById("content");
	var name = document.getElementById("name");

	socket.on('message', function (data) {
		if(data.message) {
			messages.push(data);
			var html = '';
			for(var i=0; i<messages.length; i++) {
				html += '<b>' + (messages[i].username ? messages[i].username : 'Server') + ': </b>';
				html += messages[i].message + '<br />';
			}
			content.innerHTML = html;
			$("#content").scrollTop($("#content")[0].scrollHeight);
		} else {
			console.log("There is a problem:", data);
		}
	});

	socket.on('announcement', function (data) {
		announcement.innerHTML = '<b>' + data.message + '</b>';
	});

	socket.on('header', function (data) {
		header.innerHTML = '<h1>' + data.message + '</h1>';
	});

	socket.on('disableField', function (data) {
		field.disabled = data;
		send.disabled = data;
	});

	socket.on('hideNameField', function (data) {
		name.style.display = 'none';
		nameButton.style.display = 'none';
	});

	socket.on('displayVote', function (data) {
		if (data) {
			selectArea.style.display = 'inline';
			votingPlayers.innerHTML = '';
		} else {
			selectArea.style.display = 'none';
			votingPlayers.innerHTML = '';
		}
	});

	socket.on('disableVote', function (data) {
		if (data) {
			select.style.display = 'none';
			vote.style.display = 'none';
		} else {
			select.style.display = 'inline';
			vote.style.display = 'inline';
		}
	});

	socket.on('votingPlayers', function (data) {
		var html = '';
		for (var i = 0; i < data.length; i++) {
			html += '<b>' + data[i] + '</b> votes for <b id="' + data[i] + '_vote"></b><br>';
		}
		votingPlayers.innerHTML = html;
	});

	socket.on('playerVote', function (data) {
		document.getElementById(data.username + "_vote").innerHTML = data.message;
	});

	var validTargets = [];
	socket.on('validTarget', function (data) {
		validTargets.push(data);
		var html = '';
		for (var i = 0; i < validTargets.length; i++) {
			html += '<option>' + validTargets[i] + '</option>';
		}
		select.innerHTML = html;
	}); //may be able to optimize this function with HTML Select add() and remove() methods

	socket.on('clearTargets', function () {
		validTargets = [];
		select.innerHTML = '';
	});

	$("#field").keyup(function(e) {
		if(e.keyCode == 13) {
			sendMessage();
		}
	});

	socket.on('alert', function (data) {
		alert(data.message);
	});

	sendButton.onclick = sendMessage = function() {
		var text = field.value;
		socket.emit('send', { message: text });
		field.value = "";
	};

	nameButton.onclick = function() {
		socket.emit('changeNick', name.value);
	};

	vote.onclick = function() {
		socket.emit('vote', { message: select.value });
	};
});
