var io = require('socket.io')(3538);

io.on('connection', function (socket) {
	socket.on('sendKeyToServer', function (obj, data) {
		console.log('webClient' + obj.question);
		io.emit('webClient', obj);
	});
	
	socket.on('sendKeyToServerAnswer', function (obj, data) {
		io.emit('webClientAnswer', obj);
	});
});