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


  socket.on('splittable chat message', function(unsplit_chat_message){
    OnSplittableMessage(unsplit_chat_message);
    EmitChatbotResponseTo(unsplit_chat_message.msg);
  });

  socket.on('chat message', function(msg){
    OnChatMessage(msg);
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

function OnChatMessage(chat_message){
    io.emit('chat message', chat_message);
    buffer.push(chat_message);
}

function OnSplittableMessage(unsplit_chat_message){
  var strings = unsplit_chat_message.msg.split(" ");
  for(var index in strings){
    var string = strings[index];
    var chat_message = JSON.parse(JSON.stringify(unsplit_chat_message));
    chat_message.msg = string;
    OnChatMessage(chat_message);
  }
}

function ParseChatbotXML(xml_string){
  var parsed = {};

  if(xml_string){
    var xmldoc = require('xmldoc');
    var doc = new xmldoc.XmlDocument(xml_string);
    var result = doc;
    var input = doc.childNamed("input");
    var that = doc.childNamed("that");
    // console.log(doc);
    parsed.status = result.attr.status;
    parsed.botid = result.attr.botid;
    parsed.custid = result.attr.custid
    parsed.input = input.val;
    parsed.that = that.val;
  }

  console.log(parsed);
  return parsed;
}

function EmitChatbotResponseTo(message){
  const BOTID = "f6d4afd83e34564d";
  var encoded_message = encodeURIComponent(message);

  var url_prefix = "http://www.pandorabots.com/pandora/talk-xml";
  var url_botid = "botid="+BOTID;
  var url_msg = "input="+encoded_message;
  var url_args = url_botid + "&" + url_msg;
  url = url_prefix + "?" + url_args;

  // Send GET request to pandora bots Lauren
  http.get(url, function(pb_response) {
    var body = '';

    pb_response.on('data', function(chunk) {
      body += chunk;
    });
    pb_response.on('end', function() {
      var bot_response_object = ParseChatbotXML(body);
      var bot_text = bot_response_object.that;

      var chatbot_chat_message = {
        msg: bot_text,
        timestamp: new Date().getTime(),
        author_name: "Chatbot Lauren",
        author_id: BOTID
      }
      OnSplittableMessage(chatbot_chat_message);
    });
  }).on('error', function(e) {
      console.log("PB GET Got error: ", e);
  });
}