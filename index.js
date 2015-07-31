var app = require('express')();
var http = require('http');
var app_http = http.Server(app);
var io = require('socket.io')(app_http);
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
  socket.emit('ip',ip);
  socket.emit('random name', random_name);

  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
    buffer.push(msg);




    // var message = msg.msg;
    // const BOTID = "f6d4afd83e34564d";
    // var url_prefix = "http://www.pandorabots.com/pandora/talk-xml";
    // var url_botid = "botid="+BOTID;
    // var url_msg = "input="+message;
    // var url_args = url_botid + "&" + url_msg;
    // url = url_prefix + "?" + url_args;

    // // Send GET request to pandora bots Lauren
    // http.get(url, function(pb_response) {
    //   var body = '';

    //   pb_response.on('data', function(chunk) {
    //     body += chunk;
    //   });
    //   pb_response.on('end', function() {
    //     res.end(bot_response);
    //   });
    // }).on('error', function(e) {
    //     console.log("PB GET Got error: ", e);
    // });





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

});


app_http.listen(3000,function(){
  console.log('listening on *:3000');
});