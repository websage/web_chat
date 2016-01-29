var socketio = require('socket.io');
var io;

//初始化聊天状态变量
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

/*
	连接处理逻辑
*/
exports.listen = function (server){
	//启动socketIO服务器，语序它搭载在已有的HTTP服务器上
	io = socketio.listen(server);

	io.set('log level',1);
	//定义每个用户连接的处理逻辑
	io.sockets.on('connection',function(socket){
		//用户连接时赋予访客名
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);

		//用户连接时默认进入聊天室Lobby
		joinRoom(socket,'Lobby');
		//handle*函数处理消息和命令
		handleMessageBroadcasting(socket,nickNames);

		handleNameChangeAttempts(socket,nickNames,namesUsed);

		handleRoomJoining(socket);
		//用户发出请求时，向其提供已经被占用的聊天室的列表
		socket.on('rooms',function(){
			socket.emit('rooms',io.sockets.manager.rooms);
		});

		//用户断开连接后的清除方法
		handleClientDisconnection(socket,nickNames,namesUsed);
	});
};
/***************		连接处理逻辑end		*******************************/

//分配访客昵称函数
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
	var name = 'Guest' + guestNumber;	//生成新昵称
	//关联用户昵称和客户端ID
	nickNames[socket.id] = name;

	//显示用户当前昵称
	socket.emit('nameResult',{
		success:true,
		name: name
	});
	namesUsed.push(name);	//存放已经使用昵称
	return  guestNumber + 1;
}


//加入房间逻辑
function joinRoom(socket,room){
	socket.join(room);	//让用户进入房间
	currentRoom[socket.id] = room;	//记录用户当前房间
	socket.emit('joinResult',{room: room});	//显示当前进入房间名

	//广播新用户进入房间
	socket.broadcast.to(room).emit('message',{
		text:nickNames[socket.id] + 'has joined' + room +"."
	});
	var usersInRoom = io.sockets.clients(room);	//确定房间里有哪些用户
	if(usersInRoom.length>1){
		//汇总当前房间的用户
		var usersInRoomSummary = 'Users currrently in' + room + ":";
		for(var index in usersInRoom){
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id){
				if(index >0 ){
					usersInRoomSummary += ',';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		//将房间里其他用户的汇总发送给当前用户
		socket.emit('emssage',{text:usersInRoomSummary});
	}
}

//更名请求处理逻辑
function handleNameChangeAttempts(socket,nickNames,namesUsed){
	socket.on('nameAttempt',function(name){		//nameAttempt事件监听
		if(name.indexOf('Guset') == 0){	//开头不能以Guest命名
			socket.emit('nameResult',{
				success: false,
				message: 'Names cannot begin with "guest".'
			});
		}else{
			if(namesUsed.indexOf(name) == -1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult',{
					success: true,
					name:name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text:previousName = 'is now known as' +name +'.'
				});
			}else{
				socket.emit('nameResult',{
					success: false,
					message: 'That name is alerady in use.'
				})
			}
		}
	})
}

function handleMessageBroadcasting(socket){
	socket.on('message',function (message){
		//boradcast:信息出书对象为所有client,排除当前socket对应client
		//emit:信息传输对象为当前socket对应的client
		socket.broadcast.to(message.room).emit('message',{
			text: nickNames[socket.id] + ':' + message.text
		});
	});
}

function handleRoomJoining(socket){
	socket.on('join',function (room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket){
	socket.on('disconnect',function (){
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}