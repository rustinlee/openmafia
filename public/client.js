$(document).ready(function() {
	var messages = [];
	var socket = io.connect('http://'+location.host);
	var field = document.getElementById("field");
	var sendButton = document.getElementById("send");
	var nameButton = document.getElementById("nick");
	var content = document.getElementById("content");
	var name = document.getElementById("name");
	var inventory = document.getElementById("inventory");
	var select = document.getElementById("select");

	socket.on('message', function (data) {
		if(data.message) {
			messages.push(data);
			var html = '';
			for(var i=0; i<messages.length; i++) {
				html += '<b>' + (messages[i].username ? messages[i].username : '<span style="color: red;">Server</span>') + ': </b>';
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
			selectArea.style.display = 'inline-block';
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

	socket.on('validTargets', function (data) {
		for (var i = 0; i < data.length; i++) {
			var option = document.createElement('option');
			option.value = option.text = data[i];
			select.add(option);
		}

		var inventoryItems = $('#inventory').children('.item').children('select');
		for (i = 0; i < inventoryItems.length; i++) {
			var selectClone = $(select).clone();
			$(inventoryItems[i]).replaceWith(selectClone);
		}
	});

	socket.on('displayInventory', function (data) {
		if (data) {
			inventory.style.display = 'inline-block';
		} else {
			inventory.style.display = 'none';
			$(inventory).children('.item').remove();
		}
	});

	socket.on('newInventoryItem', function (data) {
		var item = document.createElement("div");
		$(item).attr('id', 'item_' + data.index);
		$(item).data('itemID', data.index);
		$(item).addClass('item');
		$(item).append('<b>' + data.item.name + '</b><br />');
		$(item).append('<i>' + data.item.description + '</i>');

		if (data.item.power) {
			$(item).append('<select></select><input type="submit" value="' + data.item.actionName + '">');
			$(item).children('input').click(function() {
				var index = $(this).parent().data('itemID');
				var target = $(this).parent().children('select').val();
				socket.emit('itemUse', { index: index, target: target });
			});
		}

		$(inventory).append(item);
	});

	socket.on('removeInventoryItem', function (data) {
		$(inventory).children('#item_' + data).remove();
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

	socket.on('playerList', function (data) {
		var list = $('#player-list');

		for (var i = 0; i < data.length; i++) {
			list.append('<li>' + data[i] + '</li>');
		}
	});

	socket.on('playerDied', function (data) {
		var list = $('#player-list');

		list.find(':contains(\'' + data + '\')').css({
			'color': 'red',
			'text-decoration': 'line-through'
		});
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
