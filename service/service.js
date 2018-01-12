var io = require('socket.io')(3538);

io.on('connection', (socket) => {
	socket.on('sendKeyToServerQuestion', (contentHtmlString) => {
		console.log('监听到了nodeClient发过来的sendKeyToServer事件');
		io.emit('webClientQuestion', contentHtmlString);
	});
	
	socket.on('sendKeyToServerAnswer', (obj) => {
		console.log('监听到了nodeClient发过来的sendKeyToServerAnswer事件');
		io.emit('webClientAnswer', obj);
	});
});