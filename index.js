var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var phonetic = require('phonetic');

var buffer = {};
buffer.array = [];
buffer.max = 20;
buffer.push = function(msg){
  buffer.array.push(msg);
  if(buffer.array.length > buffer.max){
    buffer.array.shift();
  }
}



app.get('/', function(req,res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/facebook.js',function(req,res){
  res.sendFile(__dirname + '/facebook.js');
});

io.on('connection', function(socket){
  console.log('a user connected');

  var ip = socket.request.connection.remoteAddress;
  var random_name = phonetic.generate({seed: ip});
  socket.emit('random name', random_name);

  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
    buffer.push(msg);
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('init',function(){
    if(buffer.array.length){
      for( var key in buffer.array){
        var msg = buffer.array[key];
        console.log(msg);
        socket.emit('chat message', msg);
      }
    }
  });

  // for(var val of buffer.array){
   
  // }

});


http.listen(3000,function(){
  console.log('listening on *:3000');
});