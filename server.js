var http = require('http');
var path = require('path');
var mime = require('mime');
var fs = require('fs');
var cache = {};
//服务器功能模块
function send404(res) {
  res.writeHead(404,{'Content-Type':'text/palin'});
  res.write('Error 404:resource not found.');
  res.end();
}

function sendFile(res,filePath,fileContents) {
  res.writeHead(
    200,
    {"Content-Type": mime.lookup(path.basename(filePath))}
  );
  res.end(fileContents);
}

function serverStatic(res,cache,absPath) {
  console.log(absPath);
  if(cache[absPath]){
    sendFile(res,absPath,cache[absPath]);
  }else{
    fs.exists(absPath,function (exists) {
    if(exists){
      fs.readFile(absPath,function (err,data) {
        if(err){
          console.log(err);
          send404(res);
        }else{
          cache[absPath] = data;
          sendFile(res,absPath,data);
        }
      });
    } else {
      send404(res);
    }
    });
  }
}

var server = http.createServer(function(req,res){
  var filePath = false;
  console.log(res.url);
  if(res.url == '/'){
    
    filePath = 'public/index.html';
  }else{
    if(req.url.indexOf('socket') != "-1"){
      filePath = 'node_modules' +req.url;
    }else{
      filePath = 'public' + req.url;
    } 
  }
  var absPath = './' + filePath;
  serverStatic(res,cache,absPath);
});

server.listen(3000,function () {
  console.log("Server listening on port 3000");
});

//聊天功能模块加载
var chatServer = require('./lib/chat_server');

//启动socket.io服务器，跟server服务器共享同TCP/IP端口
chatServer.listen(server);
