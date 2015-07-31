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

var active_users = {};

function AddUser(user){
  active_users.push(user);
}
function RemoveUser(socket_id){
  for(var index in active_users){
    var user = active_users[index];
    var cur_id = user.socket_id;
    if(socket_id==cur_id){
      active_users.splice(index,1);
      return;
    }
  }
}

app.get('/', function(req,res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/facebook.js',function(req,res){
  res.sendFile(__dirname + '/facebook.js');
});

function ListUsers(socket){
  for(var index in active_users){
    var user = active_users[index];
    socket.emit("connection message", user);
  }
}



io.on('connection', function(socket){

  // console.log('a user connected');

  // ListUsers(socket);

  // var ip = socket.request.connection.remoteAddress;
  // var random_name = phonetic.generate({seed: ip});
  // socket.emit('ip',ip);
  // socket.emit('random name', random_name);

  // var this_user = {};
  // active_users[socket_id] = this_user;
  // this_user.socket_id = socket.id;
  // this_user.ip = ip;
  // this_user.random_name = random_name;

  if(TooManyUsers()){
    // some sort of warning or error or apology
    return;
  }


   RegisterUser(socket);

  // this.id = ip;
  // this.name = random_name

  // var this_user = {user_id: this.id, user_name: this.name};
  // AddUser(this_user);
  // io.emit("connection message",this_user);

  socket.on('facebook login', function(fresponse){
    // console.log('facebook login');
    // console.log(fresponse);
    var fid = fresponse.id;
    var fname = fresponse.name;
    RegisterFacebookUser(socket,fid,fname);
    // RemoveUser(this.id);
    // AddUser(new_user);
    // this.id = new_user.user_id;
    // io.emit("disconnection message", {user_id:this.id, user_name: this.name});
    // io.emit("connection message",new_user);
  });

  socket.on('splittable chat message', function(unsplit_chat_message){
    OnSplittableMessage(unsplit_chat_message);
    if(IsDirectedAtBot(unsplit_chat_message)){
      EmitChatbotResponseTo(socket, unsplit_chat_message.msg);
    }
  });

  socket.on('chat message', function(msg){
    OnChatMessage(msg);
  });

  socket.on('disconnect', function(){
    Disconnect(socket);
  });

  socket.on('init',function(){
    RecapMessagesInBuffer(socket);
  });

});


app_http.listen(3000,function(){
  console.log('listening on *:3000');
});

function UpdateUserList(){
  console.log(NumUsers());
  console.log(active_users);
  io.emit("update users", active_users);
}

function RecapMessagesInBuffer(socket) {
  if(buffer.array.length){
    for( var key in buffer.array){
      var msg = buffer.array[key];
      console.log(msg);
      socket.emit('chat message', msg);
    }
  }
};

function Disconnect(socket){
  console.log('user disconnected');
  DeregisterUser(socket);
}

function RegisterUser(socket){
  var ip = socket.request.connection.remoteAddress;
  var sid = socket.id;

  socket.emit('ip',ip);
  socket.emit('random name', random_name);

  var this_user = {};
  this_user.socket_id = sid;
  this_user.ip = ip;
  var random_name = GenerateName(this_user);
  this_user.random_name = random_name;
  this_user.name = random_name;
  active_users[sid] = this_user;
  UpdateUserList();
}

function RegisterFacebookUser(socket, fid, fname){
  active_users[socket.id].fid = fid;
  active_users[socket.id].fname = fname;
  active_users[socket.id].name = fname;
  UpdateUserList();
}

function DeregisterUser(socket){
  delete active_users[socket.id];
  UpdateUserList();
}

function GenerateName(user){
  var ip = user.ip;
  var sid = user.socket_id;
  var random_first_name = phonetic.generate({seed: ip, syllables: 2, phoneticSimplicity: 10, compoundSimplicity: 10});
  var random_last_name = phonetic.generate({seed: sid, syllables: 1, phoneticSimplicity: 10, compoundSimplicity: 10});
  var random_name = random_first_name + "-" + random_last_name;
  return random_name;
}

function NumUsers(){
  return Object.keys(active_users).length;
}
function TooManyUsers(){
  var num_users = NumUsers();
  // console.log(num_users + " users");
  if(num_users > 100){
    return true;
  }
  return false;
}

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

function IsDirectedAtBot(unsplit_chat_message){
  var result = false;
  if(unsplit_chat_message.directed_at_bot){
    result = true;
  }
  return result;
}

function ParseChatbotXML(xml_string){
  console.log(xml_string);
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

  // console.log(parsed);
  return parsed;
}

function EmitChatbotResponseTo(socket, message){
  const BOTID = "f6d4afd83e34564d";
  var encoded_message = encodeURIComponent(message);

  var url_prefix = "http://www.pandorabots.com/pandora/talk-xml";
  var url_botid = "botid="+BOTID;
  var url_custid = "custid=" + socket.id;
  var url_msg = "input="+encoded_message;
  var url_args = url_botid + "&" + url_custid + "&" + url_msg;
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