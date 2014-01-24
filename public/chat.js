$(document).ready(function() {
	var messages = [];
	var socket = io.connect('http://'+location.host);
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
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

	socket.on('displayVote', function (data) {
		if (data) {
			selectArea.style.display = 'inline';
		} else {
			selectArea.style.display = 'none';
		}
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

	sendButton.onclick = sendMessage = function() {
		if(name.value == ""){
			alert("Enter a name.");
		} else {
			var text = field.value;
			socket.emit('send', { message: text, username: name.value });
			field.value = "";
		}
	};

	vote.onclick = function() {
		socket.emit('vote', { message: select.value });
	}
});
