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
			html += '<b>' + data[i] + '</b> votes for <i id="' + data[i] + '_vote"></i><br>';
		}
		votingPlayers.innerHTML = html;
	});

	socket.on('playerVote', function (data) {
		var element = document.getElementById(data.username + "_vote");
		if (data.message) {
			element.innerHTML = data.message;
		} else {
			element.innerHTML = 'no one';
		}
	});

	socket.on('validTarget', function (data) {
		var option = document.createElement("option");
		option.value = option.innerHTML = data;
		select.add(option, select.length - 1);
	});

	var blankOption = document.createElement("option");
	blankOption.innerHTML = 'no one';
	blankOption.value = '';
	socket.on('clearTargets', function () {
		select.innerHTML = '';
		select.add(blankOption);
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
