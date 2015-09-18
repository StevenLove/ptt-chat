var express = require('express');
var app = express();
var http = require('http');
var app_http = http.Server(app);
var io = require('socket.io')(app_http);
var phonetic = require('phonetic');
var request = require('request');

var async = require('async');

var Transformer = require('./Transformer.js');
var transformer = new Transformer();


  /* Hosting */

var HostFile = function(web_path, rel_fs_path){
  app.get(
    web_path,
    function(req,res){
      res.sendFile(__dirname + rel_fs_path);
    }
  );
}
var HostStaticFolder = function(folder){
  app.use(
    express.static(folder)
  );
}
var HostOnPort = function(port_no){
  app_http.listen(port_no,function(){
    console.log('listening on *:' + port_no);
  });
}

HostOnPort(3000);
HostFile('/','/newindex.html');
HostStaticFolder('public');




  /* Sockets */

io.on('connection', function(socket){


  if(TooManyUsers()){
    // some sort of warning or error or apology
    return;
  }
  else{
    Connect(socket);

    socket.on('facebook login', function(fresponse){
      FacebookUserLogin(socket,fresponse);
    });

    socket.on('facebook logout', function(){
      FacebookUserLogout(socket);
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

    socket.on('speech synthesis', function(available){
      RegisterSpeechSynthesisAvailability(socket, available);
    });
  }
});








  /* Sockets */

var RegisterSpeechSynthesisAvailability = function(socket, bool){
  var sid = GetID(socket);
  var user = GetUser(sid);
  user["speech_synthesis_available"] = bool;
  // socket["speech_synthesis_available"] = bool;
}

function OnChatMessage(chat_message){
  chat_message = JSON.parse(JSON.stringify(chat_message));
  if(IsDirectedAtBot(chat_message)){
    EmitChatbotResponseToAll(chat_message.original_text);
  }

  // Receive chat_message
  // Emit a placeholder chat_message with an ID
  // Determine which transform to apply
  // Ask Transformer.js to apply the transform
  // parse the response
  // emit the transformed chat message to replace the placeholder chat_message

  Transform(
    chat_message["transform_list"][0],
    chat_message,
    function(err, result){
      console.log(result);
      EmitAndStoreChatMessage(result);
    }
  );

  // TransformChain(null, chat_message, function(err, result){
  //     console.log(result);
  //     EmitAndStoreChatMessage(result);
  //   })
}

var EmitChatMessage = function(chat_message){
  io.emit("chat message", chat_message);
}

var EmitAndStoreChatMessage = function(chat_message){
  EmitChatMessage(chat_message);
  StoreChatMessage(chat_message);
}

var StoreChatMessage = function(chat_message){
  stored_messages.push(chat_message);
}

var GetIP = function(socket){
  return socket.request.connection.remoteAddress;
}
var GetID = function(socket){
  return socket.id;
}


/* User Management */

var active_users = {
  // socket_id: unique identifier
  // ip: user's IP address
  // random_name: randomly generated name
  // name: name to be displayed in that chat room
  // 
  // fid: unique facebook user id
  // fname: user's name on facebook
};

var User = function(sid,ip){
  var random_name = GenerateName(ip);
  return {
    "socket_id": sid,
    "ip": ip,
    "random_name": random_name,
    "name": random_name,
    "speech_synthesis_available": false
  };
}

var GetUser = function(sid){
  return active_users[sid];
}

var Connect = function(socket){

  var RegisterUser = function(socket){

    var EmitUserInfo = function(socket, user){
      socket.emit('ip', user["ip"]);
      socket.emit('random name', user["random_name"]);
    }

    var sid = GetID(socket);
    var ip = GetIP(socket);
    var user = User(sid, ip);
    active_users[sid] = user
    UpdateUserList();
    EmitUserInfo(socket,user);
  }

  console.log("user connected");
  RegisterUser(socket);
}

var Disconnect = function(socket){

  var DeregisterUser = function(socket){
    delete active_users[socket.id];
    UpdateUserList();
  }

  console.log('user disconnected');
  DeregisterUser(socket);
}

function FacebookUserLogin(socket, fresponse){
  var fid = fresponse.id;
  var fname = fresponse.name;
  var user = active_users[socket["id"]];
  user["fid"] = fid;
  user["fname"] = fname;
  user["name"] = fname;
  UpdateUserList();
}

function FacebookUserLogout(socket){
  var user = active_users[socket["id"]];
  user["fid"] = undefined;
  user["fname"] = undefined;
  user["name"] = user["random_name"];
  UpdateUserList();
}

function UpdateUserList(){
  console.log(NumUsers());
  console.log(active_users);
  io.emit("update users", active_users);
}

function TooManyUsers(){
  var num_users = NumUsers();
  // console.log(num_users + " users");
  if(num_users > 100){
    return true;
  }
  return false;
}

var NumUsers = function(){
  return Object.keys(active_users).length;
}

var EveryoneCanSynthesizeSpeech = function(){
  return Object.keys(active_users).reduce(function(prev, current){
    var this_user_can = active_users[current] && active_users[current]["speech_synthesis_available"];
    return prev && this_user_can;
  });
}


  /* Stored Messages */

var stored_messages = {};
stored_messages.buffer = [];
stored_messages.max = 10;

stored_messages.push = function(msg){
  msg["recap"] = true;
  stored_messages.buffer.push(msg);
  if(stored_messages.buffer.length > stored_messages.max){
    stored_messages.buffer.shift();
  }
}

function RecapMessagesInBuffer(socket) {
  if(stored_messages.buffer.length > 0){
    stored_messages.buffer.forEach(
      function(message){
        socket.emit('chat message', message);
      }
    );
  }
};



  /* Creators */
  /* These functions parse the response from the transformer and the original chat message to create the chat message to be sent out to the audience */

var CreateTranslated = function(chat_message, response){
  chat_message["type"] = "Text";
  chat_message["transformed_text"] = response["text"];
  return chat_message;
}
var CreateSpeak = function(chat_message, response){
  chat_message["url"] = response["url"];
  chat_message["type"] = "Speak";
  return chat_message;
}
var CreateImages = function(chat_message, response){
  chat_message["type"] = "LocalGoogleImages";
  return chat_message;
}

var CreateText = function(chat_message, response){
  chat_message["type"] = "Text";
  chat_message["transformed_text"] = chat_message["original_text"];
  return chat_message;
}

var CreatePugImages = function(chat_message, response){
  chat_message["type"] = "LocalGoogleImages";
  chat_message["original_text"] = 
    chat_message["original_text"]
    .split(" ")
    .map(
      function(word){
        return word+".pug";
      }
    )
    .join(" ");
  return chat_message;
}

var CreateSynonymize = function(chat_message, response){
  response["words"].forEach(function(word){
    console.log(JSON.stringify(word).slice(0,77) + "...");
  });
  chat_message["transformed_text"] = response["words"].map(
    function(word){
      word["list"].push(word["original"]);
      return word["list"][0];
    }
  ).join(" ");
  chat_message["type"] = "Text";
  return chat_message;
}

  /* Transforms */
  /* These functions determine the arguments for the transformer */

var SpanishTransform = function(chat_message){
  var result = {
    "options":{
      "text" : chat_message["original_text"],
      "from" : "en",
      "to" : "es"
    },
    "function": transformer.Translate,
    "creator": CreateTranslated
  };
  return result;
}

var GermanTransform = function(chat_message){
  var result = SpanishTransform(chat_message);
  result["options"]["to"] = "de";
  return result;
}

var ImagesTransform = function(chat_message){
  var result = {
    "options": {},
    "function":transformer.DoNothing,
    "creator": CreateImages
  };
  return result;
}

var SpeakTransform = function(chat_message){
 var result = {
    "options": chat_message["original_text"], 
    "function": transformer.AutoSpeak,
    "creator": CreateSpeak
  };
  var default_language = undefined;
  if(default_language != undefined){
    result["function"] = async.apply(transformer.Speak, default_language);
  }
  return result;
}

var SynonymizeTransform = function(chat_message){
  var result = {
    "options": {
      "text": chat_message["original_text"]
    },
    "function": transformer.Synonymize,
    "creator": CreateSynonymize
  }
  return result;
}

var AntonymizeTransform = function(chat_message){
  var result = SynonymizeTransform(chat_message);
  result["options"]["ant"] = true;
  return result;
}

var SmartSynonymizeTransform = function(chat_message){
  var result = {
    "options": {
      "text": chat_message["original_text"]
    },
    "function": transformer.SmartSynonymize,
    "creator": CreateSynonymize
  };
  return result;
}

var ParaphraseTransform = function(chat_message){
  var result = {
    "options": {
      "text": chat_message["original_text"]
    },
    "function": transformer.Paraphrase,
    "creator": CreateTranslated
  };
  return result;
}

var ScotsTransform = function(chat_message){
  var result = {
    "options": {
      "text": chat_message["original_text"]
    },
    "function": transformer.Scotranslate,
    "creator": CreateTranslated
  };
  return result;
}

var PugImagesTransform = function(chat_message){
  var result = {
    "options": {},
    "function": transformer.DoNothing,
    "creator": CreatePugImages
  };
  return result;
}

var DoNothingTransform = function(chat_message){
  var result = {
    "options": {
      "text": chat_message["original_text"]
    },
    "function": transformer.DoNothing,
    "creator": CreateText
  }
  return result;
}

var LocalSpeakTransform = function(chat_message){
  var result = DoNothingTransform(chat_message);
  result["creator"] = function(chat_message, response){
    chat_message["type"] = "LocalSpeak";
    chat_message["transformed_text"] = chat_message["original_text"];
    return chat_message;
  };
  return result;
}



const SPANISH = "Spanish";
const IMAGES = "Images";
const SPEAK = "Speak";
const GERMAN = "German";
const SYNONYMIZE = "Synonymize";
const ANTONYMIZE = "Antonymize";
const SMARTSYNONYMIZE = "SmartSynonymize";
const PARAPHRASE = "Paraphrase";
const SCOTS = "Scots";
const PUGIMAGES = "PugImages";


var ChooseTransform = function(mode){
  var transformation;
  switch(mode){
    case SPANISH:
      transformation = SpanishTransform;
      break;
    case GERMAN:
      transformation = GermanTransform;
      break;
    case IMAGES:
      transformation = ImagesTransform;
      break;
    case SPEAK:
      transformation = SpeakTransform;
      break;
    case SYNONYMIZE:
      transformation = SynonymizeTransform;
      break;
    case ANTONYMIZE:
      transformation = AntonymizeTransform;
      break;
    case SMARTSYNONYMIZE:
      transformation = SmartSynonymizeTransform;
      break;
    case PARAPHRASE:
      transformation = ParaphraseTransform;
      break;
    case SCOTS:
      transformation = ScotsTransform;
      break;
    case PUGIMAGES:
      transformation = PugImagesTransform;
      break;
    case "LocalSpeak":
      transformation = LocalSpeakTransform;
      break;
    case "None":
      transformation = DoNothingTransform;
      break;
    default:
      console.error("Unrecognized Transform: " + mode);
      transformation = DoNothingTransform;
      break;
  }
  return transformation;
}

var TransformChain = function(transform_list, chat_message, callback){
  async.waterfall([
    function(async_cb){
      Transform("Scots", chat_message, async_cb);
    },
    function(cm, async_cb){
      cm["original_text"] = cm["transformed_text"];
      async_cb(null, cm);
    },
    function(cm, async_cb){
      Transform("Speak", cm, async_cb);
    },
    function(cm, async_cb){
      callback(null, cm);
    }
  ]);
}

var Transform = function(mode, chat_message, callback){
  console.log("Can everyone speak?: " + EveryoneCanSynthesizeSpeech());
  if(mode == "AutoSpeak"){
    if(EveryoneCanSynthesizeSpeech()){
      console.log("Everyone CAN!");
      mode = "LocalSpeak";
    }
    else{
      mode = "Speak";
    }
  }

  var transformation = ChooseTransform(mode);
  console.log("\n");
  console.log(mode +" Transform on \"" + chat_message["original_text"] + "\"");
  var transform = transformation(chat_message);
  var func = transform["function"];
  var create = transform["creator"];
  var options = transform["options"];

  func(
    options,
    TransformCallback(chat_message, create, callback)
  );
}

var TransformCallback = function(chat_message, create, callback){
  var api_start_time = new Date();
  return function(err, response){
    LogAPITime(api_start_time);
    if(err){
      console.error("ERROR: " + JSON.stringify(err));
      callback(err,null);
    }
    else{
      var result = create(chat_message, response);
      callback(null, result);
    }
  }
}

var LogAPITime = function(api_start_time){
  var api_end_time = new Date();
  var elapsed_ms = api_end_time-api_start_time;
  const MS_IN_SECOND = 1000;
  var elapsed_seconds = elapsed_ms/MS_IN_SECOND;
  console.log("It took " + elapsed_seconds + " seconds for the API to respond.");
}








  /* Chatbot */

var cust_id;
// Lauren
const BOTID = "f6d4afd83e34564d";
// Chomsky
// const BOTID = "b0dafd24ee35a477";


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
        transform_list: ["AutoSpeak"],
        taget: "Humans",
        original_text: bot_text,
        is_images: true,
      }

      setTimeout(function(){
        OnChatMessage(chatbot_chat_message);
      }, 1800);
      


    });
  }).on('error', function(e) {
      console.log("PB GET Got error: ", e);
  });
}








  /* Helper */

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

var GetRandomElementBackup = function(array, backup){
  if(!array || array.length < 1 ){
    return backup;
  }
  else{
    return GetRandomElement(array);
  }
}

function GenerateName(seed){
  var phonetic_options = {
    "seed": seed,
    "syllables": 3,
    "phoneticSimplicity": 10,
    "compoundSimplicity": 10
  };
  var random_name = phonetic.generate(phonetic_options);
  return random_name;
}