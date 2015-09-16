var express = require('express');
var app = express();
var http = require('http');
var app_http = http.Server(app);
var io = require('socket.io')(app_http);
var phonetic = require('phonetic');
var request = require('request');

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
  }
});








  /* Sockets */

function OnChatMessage(chat_message){
    chat_message = JSON.parse(JSON.stringify(chat_message));
    if(IsDirectedAtBot(chat_message)){
      EmitChatbotResponseToAll(chat_message.original_text);
    }
    Transform(chat_message["transform_list"][0],chat_message);
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
    "name": random_name
  };
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


  /* Callbacks */
/*
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
      chat_message["type"] = "Text";
      EmitAndStoreChatMessage(chat_message);
    }
  }
}
*/

/*
var SpeakCallback = function(chat_message){
  return function(err, response){
    chat_message["url"] = ParseSpeak(response);;
    chat_message["type"] = "Speak";
    EmitAndStoreChatMessage(chat_message);
  }
}

var LogCallback = function(err, response){
  console.log("ERROR: " + JSON.stringify(err));
  console.log("RESPO: " + JSON.stringify(response));
}



var ParsePartsOfSpeech = function(response){
  return response.map(
            function(tagged_word){
              return tagged_word["penn_pos"];
            }
          ).join(" ");
}

var ParseSpeak = function(response){
  return response["url"];
}
var ParseDetectLanguage = function(response){
  return response["language"];
}






var TransformLocalGoogleImages = function(chat_message){
  chat_message["type"] = "LocalGoogleImages";
  return chat_message;
}

var TransformServerGoogleImages = function(chat_message){
  transformer.GoogleImages(
    chat_message.original_text,
    {}, // options
    ServerImagesCallback(chat_message)
  )
}

var ServerImagesCallback = function(chat_message){
  return function(err, response){
    if(err){
      console.log(err);
    }else{
      chat_message.image_url_lists = ParseImageSet(response);
      chat_message["type"] = "ServerImages";
      EmitAndStoreChatMessage(chat_message);
    }
  }
}




function Transform(chat_message){
  var mode = chat_message.transform_list[0];
  var text = chat_message.original_text;
  var options = {};

  console.log("PERFORMING TRANSFORM");
  console.log("  " + text);
  console.log("  " + mode);

  if(mode === "LocalGoogleImages" || mode ==="Images" || mode === "PugImages"){
    chat_message["type"]="LocalGoogleImages";
    EmitAndStoreChatMessage(chat_message);
  }


  else if(mode === "ServerGoogleImages"){
    transformer.GoogleImages(
      text, 
      options, 
      ServerImagesCallback(chat_message)
    );
  }
  else if (mode === "ServerBingImages"){
    transformer.BingImages(
      text,
      options,
      ServerImagesCallback(chat_message)
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
      if(err){
        console.log(JSON.stringify(err));
      }
      else{
        console.log("LANGUAGE DETECTED: " + JSON.stringify(result));
        transformer.Speak(
          text,
          result["language"],
          SpeakCallback(chat_message)
        );
      }
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
          chat_message["type"] = "Text";
          EmitAndStoreChatMessage(chat_message);
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
        chat_message["type"] = "Text";
        EmitAndStoreChatMessage(chat_message);
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

*/

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



const SPANISH = "Spanish";
const IMAGES = "Images";
const SPEAK = "Speak";


// var Transform = function(mode, chat_message){
// }

var Transform = function(mode, chat_message){

  var f;
  var options = {};
  var create;

  console.log(mode + " Transform");

  switch(mode){
    case SPANISH:
      options = {
        "text" : chat_message["original_text"],
        "from" : "en",
        "to" : "es"
      };
      f = transformer.Translate;
      create = CreateTranslated;
      break;

    case IMAGES:
      chat_message["type"] = "LocalGoogleImages";
      EmitAndStoreChatMessage(chat_message);
      f = function(){};
      break;

    case SPEAK:
      options = chat_message["original_text"];
      f = transformer.AutoSpeak;
      create = CreateSpeak;
      break;

    default:
      console.error("Unrecognized Transform: " + mode);

    break;
  }

  var callback = function(err, response){
    if(err){
      console.error("ERROR: " + JSON.stringify(err));
    }
    else{
      var result = create(chat_message, response);
      EmitAndStoreChatMessage(result);
    }
  }

  f(
    options,
    callback
  )
}



// Receive chat_message
// Emit a placeholder chat_message with an ID
// Determine which transform to apply
// Ask Transformer.js to apply the transform
// parse the response
// emit the transformed chat message to replace the placeholder chat_message







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