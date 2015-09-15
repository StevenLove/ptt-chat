var express = require('express');
var app = express();
var http = require('http');
var app_http = http.Server(app);
var io = require('socket.io')(app_http);
var phonetic = require('phonetic');
var request = require('request');

var Transformer = require('./Transformer.js');
var transformer = new Transformer();


var buffer = {};
buffer.array = [];
buffer.max = 50;
buffer.push = function(msg){
  buffer.array.push(msg);
  if(buffer.array.length > buffer.max){
    buffer.array.shift();
  }
}

var active_users = {};

var cust_id;
// Lauren
const BOTID = "f6d4afd83e34564d";
// Chomsky
// const BOTID = "b0dafd24ee35a477";



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
  res.sendFile(__dirname + '/newindex.html');
});

// app.get('/facebook.js',function(req,res){
//   res.sendFile(__dirname + '/facebook.js');
// });

// app.get('/css/')
app.use(express.static('public'));

function ListUsers(socket){
  for(var index in active_users){
    var user = active_users[index];
    socket.emit("connection message", user);
  }
}

console.log("IO: " + io);


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
    var fid = fresponse.id;
    var fname = fresponse.name;
    FacebookUserLogin(socket,fid,fname);
  });
  socket.on('facebook logout', function(){
    FacebookUserLogout(socket);
  });

  socket.on('splittable chat message', function(unsplit_chat_message){
    OnSplittableMessage(unsplit_chat_message);
    if(IsDirectedAtBot(unsplit_chat_message)){
      EmitChatbotResponseToAll(unsplit_chat_message.original_text);
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
  var this_user = {};
  this_user.socket_id = sid;
  this_user.ip = ip;
  var random_name = GenerateName(this_user);
  this_user.random_name = random_name;
  this_user.name = random_name;
  active_users[sid] = this_user;
  UpdateUserList();

  socket.emit('ip',ip);
  socket.emit('random name', random_name);
}

function FacebookUserLogin(socket, fid, fname){
  active_users[socket.id].fid = fid;
  active_users[socket.id].fname = fname;
  active_users[socket.id].name = fname;
  UpdateUserList();
}

function FacebookUserLogout(socket){
  active_users[socket.id].fid = undefined;
  active_users[socket.id].fname = undefined;
  active_users[socket.id].name = active_users[socket.id].random_name;
  UpdateUserList();
}

function DeregisterUser(socket){
  delete active_users[socket.id];
  UpdateUserList();
}

function GenerateName(user){
  var ip = user.ip;
  var sid = user.socket_id;
  var random_first_name = phonetic.generate({seed: ip, syllables: 3, phoneticSimplicity: 10, compoundSimplicity: 10});
  // var random_last_name = phonetic.generate({seed: sid, syllables: 1, phoneticSimplicity: 10, compoundSimplicity: 10});
  var random_name = random_first_name;//+ "-" + random_last_name;
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
    console.log(chat_message);
    chat_message = JSON.parse(JSON.stringify(chat_message));
    if(IsDirectedAtBot(chat_message)){
      EmitChatbotResponseToAll(chat_message.original_text);
    }
    Transform(chat_message);
}




function GetRandomElement(array){
  var max = array.length;
  if(max<1){
    return [];
  }
  else{
    var index = Math.floor(Math.random()*max);
    return array[index];
  }
}



var EmitChatMessage = function(chat_message){
  io.emit("chat message", chat_message);
  buffer.push(chat_message);
}

var EmitImageChatMessage = function(chat_message){
  chat_message.is_images = true;
  EmitChatMessage(chat_message);
}


var ServerBingImagesCallback = function(chat_message){
  return function(err, response){
    if(err){
      console.log(err);
    }else{
      chat_message.image_url_lists = ParseImageSet(response);
      EmitImageChatMessage(chat_message);
    }
  }
}

var ServerGoogleImagesCallback = function(chat_message){
  return function(err, response){
    if(err){
      console.log(err);
    }else{
      chat_message.image_url_lists = ParseImageSet(response);
      EmitImageChatMessage(chat_message);
    }
  }
}

var PartsOfSpeechCallback = function(chat_message){
  return function(err, response){
    if(err){
      console.log(err);
    }else{
      chat_message.transformed_text = 
      response.map(
        function(tagged_word){
          return tagged_word["penn_pos"];
        }
      ).join(" ");
      EmitChatMessage(chat_message);
    }
  }
}

var TranslatedCallback = function(chat_message){
  return function(err, response){
    var result = response["text"];
    chat_message.transformed_text = result;
    io.emit("chat message", chat_message);
    buffer.push(chat_message);
    // EmitChatMessage(chat_message);
  }
}

var SpeakCallback = function(chat_message){
  return function(err, response){
    console.log("RESPONSE: \"" + response+ "\"");
    // chat_message.transformed_text = response;
    chat_message["url"] = response;
    chat_message["type"] = "Speak";
    console.log(chat_message);
    EmitChatMessage(chat_message);
  }
}

var LogCallback = function(err, response){
  console.log("ERROR: " + JSON.stringify(err));
  console.log("RESPO: " + JSON.stringify(response));
}

function Transform(chat_message){
  var mode = chat_message.transform_list[0];
  var text = chat_message.original_text;
  var options = {};

  console.log("PERFORMING TRANSFORM");
  console.log("  " + text);
  console.log("  " + mode);

  if(mode === "LocalGoogleImages" || mode ==="Images" || mode === "PugImages"){
    EmitImageChatMessage(chat_message);
  }
  else if(mode === "ServerGoogleImages"){
    transformer.GoogleImages(
      text, 
      options, 
      ServerGoogleImagesCallback(chat_message)
    );
  }
  else if (mode === "ServerBingImages"){
    transformer.BingImages(
      text,
      options,
      ServerBingImagesCallback(chat_message)
    );
  }
  else if (mode === "PartsOfSpeech"){
    transformer.PartOfSpeechify(
      text,
      options,
      PartsOfSpeechCallback(chat_message)
    );
  }
  else if (mode === "Speak"){
    console.log("SPEAK");
    transformer.DetectLanguage(text, function(err, result){
      transformer.Speak(text, result["language"], SpeakCallback(chat_message));
    })
  }
  else if (mode === "Scots"){
    transformer.Scotranslate(
      text,
      options,
      TranslatedCallback(chat_message)
    );
  }
  else if(mode === "DetectLanguage"){
    transformer.DetectLanguage(text,LogCallback);
  }
  else if(mode === "Spanish"){
    transformer.Transform(
      text,
      {"mode": "Translate", "from":"en", "to":"es"},
      TranslatedCallback(chat_message)
    );
  }
  else if(mode === "German"){
    transformer.Transform(
      text,
      {"mode": "Translate", "from":"en", "to":"de"},
      TranslatedCallback(chat_message)
    );
  }
  else if(mode === "Antonymize"){
    transformer.Transform(
      text,
      {"mode":"Synonymize","ant":true},
      function(err,succ){
        var result = {};
        if(!err){
          result = ParseSmartSynonymize(succ);
          chat_message.transformed_text = result;
          io.emit("chat message", chat_message);
          buffer.push(chat_message);
        }
        else{
          console.log(err);
        }
      }
    );
  }
  else{
    transformer.Transform(
      text,
      {"mode": mode},
      function(err,succ){
        console.log(err);
        console.log(succ);
        var result = succ;
        if(mode === "Paraphrase"){
          result = ParseParaphrased(succ);
        }
        if(mode === "Synonymize"){
          result = ParseSmartSynonymize(succ);
        }
        if(mode === "SmartSynonymize"){
          result = ParseSmartSynonymize(succ);
        }
        chat_message.transformed_text = result;
        io.emit("chat message", chat_message);
        buffer.push(chat_message);
      }
    );
  }

}
var ParseImageSet = function(success){
  var results = [];
  success.forEach(function(set){
    results.push(set["urls"]);
  })
  return results;
}

var ParseParaphrased = function(success){
  return success["text"];
}
var ParseSmartSynonymize = function(success){
  var sentence = "";
  var result = success["words"].reduce(
    function(prev,curr){
      var chosen_word;
      if(curr["list"].length>0){
        chosen_word = GetRandomElement(curr["list"]);
      }
      else{
        chosen_word = curr["original"];
      }
      return prev + chosen_word + " ";
    },
    ""
  );
  return result.trim();
}







function IsDirectedAtBot(unsplit_chat_message){
  var result = false;
  if(unsplit_chat_message.target === "Everyone"){
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

function BuildURL(message){
  var encoded_message = encodeURIComponent(message);
  var url_prefix = "http://www.pandorabots.com/pandora/talk-xml";
  var url_botid = "botid="+BOTID;
  var url_msg = "input="+encoded_message;
  var url_args;
  if(cust_id){
    var url_custid = "custid=" + cust_id;
    url_args = url_botid + "&" + url_custid + "&" + url_msg;
  }
  else{
    url_args = url_botid + "&" + url_msg;
  }
  url = url_prefix + "?" + url_args;
  return url;
}

function EmitChatbotResponseToAll(message){
  var url = BuildURL(message);
  // console.log(url);
  // Send GET request to pandora bots Lauren
  http.get(url, function(pb_response) {
    var body = '';

    pb_response.on('data', function(chunk) {
      body += chunk;
    });
    pb_response.on('end', function() {
      var bot_response_object = ParseChatbotXML(body);
      var bot_text = bot_response_object.that;
      if(!cust_id){
        cust_id = bot_response_object.custid;
      }

      var chatbot_chat_message = {
        msg: bot_text,
        timestamp: new Date().getTime(),
        author_name: "Chatbot Lauren",
        author_id: BOTID,
        transform_list: ["Speak"],
        taget: "Humans",
        original_text: bot_text,
        is_images: true,
      }

      OnChatMessage(chatbot_chat_message);
    });
  }).on('error', function(e) {
      console.log("PB GET Got error: ", e);
  });
}