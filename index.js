var app = require('express')();
var http = require('http');
var app_http = http.Server(app);
var io = require('socket.io')(app_http);
var phonetic = require('phonetic');
var request = require('request');

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
    // if(chat_message.one_word_at_a_time){
    //   var original_words = chat_message.original_text.split(/\s+/);
    //   var transformed_words = [];
    //   for(var index in original_words){
    //     var original_word = original_words[index];
    //     var transformed_word = original_word.toUpperCase();
    //     transformed_words.push(transformed_word);
    //   }
    //   chat_message.transformed_text = 
    // }
    // io.emit('chat message', chat_message);
    // buffer.push(chat_message);
    console.log(chat_message);
    chat_message = JSON.parse(JSON.stringify(chat_message));

    Transform(chat_message);
}

function PerformTransformation(tbuilder){

  if(tbuilder.transform_index >= tbuilder.chat_message.transform_list.length){
    var transformed_text = tbuilder.working_content.join(" ");
    tbuilder.chat_message.transformed_text = transformed_text;
    io.emit("chat message", tbuilder.chat_message);
    buffer.push(tbuilder.chat_message);
  }


  var transform_name = tbuilder.chat_message.transform_list[tbuilder.transform_index];

  var MakeCartonFullFunction = function(tbuilder){
    var f = function(){
      console.log("done!");
      tbuilder.working_content = tbuilder.carton.items;
      console.log("after spanish: " + tbuilder.working_content);
      tbuilder.transform_index++;
      PerformTransformation(tbuilder);
    }
    return f;
  }

  function MakeCartonCallback(carton_index, tbuilder){
    var callback = function(err, response, body){
      console.log(body);
      PutInCarton(tbuilder.carton, body ,carton_index, MakeCartonFullFunction(tbuilder));
    }
    return callback;
  }

  if (transform_name == "Split"){
    var placeholder = [];
    for(var content_index in tbuilder.working_content){
      var content = tbuilder.working_content[content_index];
      var words = content.split(/\s+/);
      for(word_index in words){
        var word = words[word_index];
        placeholder.push(word);
      }
    }
    tbuilder.working_content = placeholder;
    console.log("after split: " + tbuilder.working_content);
    tbuilder.working_content = tbuilder.working_content;
    tbuilder.transform_index++;
    PerformTransformation(tbuilder);
  }

  if (transform_name == "Spanish"){
    tbuilder.carton.counter = 0;
    tbuilder.carton.max = tbuilder.working_content.length;
    tbuilder.carton.items = [];
    for(var carton_index in tbuilder.working_content){
      var content = tbuilder.working_content[carton_index];
      ToSpanish(
        content,
        MakeCartonCallback(carton_index, tbuilder)
      )
    }
  }

  if (transform_name == "Reverse"){
    var placeholder = [];
    for(var index in tbuilder.working_content){
      var content = tbuilder.working_content[index];
      var reversed = content.split('').reverse().join('');
      placeholder.push(reversed);
    }
    console.log("after reverse: " + placeholder);
    tbuilder.working_content = placeholder;
    tbuilder.transform_index++;
    PerformTransformation(tbuilder);
  }

  if (transform_name == "Picture"){
    tbuilder.carton.counter = 0;
    tbuilder.carton.max = tbuilder.working_content.length;
    tbuilder.carton.items=[];
    for(var carton_index in tbuilder.working_content){
      var content = tbuilder.working_content[carton_index];
      ToImageURLs(content, MakePictureCallback(carton_index, tbuilder));
    }
  }

  if (transform_name == "Synonym"){
    tbuilder.carton.counter = 0;
    tbuilder.carton.max = tbuilder.working_content.length;
    tbuilder.carton.items = [];
    for(var carton_index in tbuilder.working_content){
      var content = tbuilder.working_content[carton_index];
      ToSynonym(content, MakeSynonymCallback(carton_index, tbuilder));
    }
  }

  if (transform_name == "SmartSynonym"){
    tbuilder.carton.counter = 0;
    tbuilder.carton.max = tbuilder.working_content.length;
    tbuilder.carton.items = [];
    for(var carton_index in tbuilder.working_content){
      var content = tbuilder.working_content[carton_index];
      ToSmartSynonym(content, MakeSmartSynonymCallback(carton_index, tbuilder));
    }
  }
}

function MakeSmartSynonymCallback(carton_index, tbuilder){
  callback = function(err, response, body){
    body = JSON.parse(body);
    var result = "";
    body.forEach(function(synonym_list){
      if(synonym_list.length>1){
        result+=(GetRandomElement(synonym_list.slice(1)) + " ");
      }
      else{
        result+=(synonym_list[0] + " ")
      }
    });
    result = result.trim();
    PutInCarton(tbuilder.carton,result,carton_index,MakeSmartSynonymDoneCallback(tbuilder));
  }
  return callback;
}
function MakeSmartSynonymDoneCallback(tbuilder){
  var f = function(){
     console.log("done!");
      tbuilder.working_content = tbuilder.carton.items;
      // tbuilder.chat_message.image_url_lists = tbuilder.working_content;
      console.log("after smart synonyms: " + tbuilder.working_content);
      tbuilder.transform_index++;
      PerformTransformation(tbuilder);
  }
  return f;
}

function MakePictureCallback(carton_index, tbuilder){
  callback = function(err, response, body){
    if(err){
      console.log(err);
    }
    else{
      body = JSON.parse(body);
    }
    // tbuilder.transform_index ++;
    // PerformTransformation(tbuilder);
    // console.log("after picture: " + body);

    PutInCarton(tbuilder.carton, body ,carton_index, MakePictureDoneFunction(tbuilder));
  }
  return callback;
}

function MakePictureDoneFunction(tbuilder){
    var f = function(){
      console.log("done!");
      tbuilder.working_content = tbuilder.carton.items;
      tbuilder.chat_message.image_url_lists = tbuilder.working_content;
      console.log("after picture: " + tbuilder.working_content);
      tbuilder.transform_index++;
      PerformTransformation(tbuilder);
    }
    return f;
}



function MakeSynonymCallback(carton_index, tbuilder){
  callback = function(err, response, body){
    var synonym_list = JSON.parse(body);
    var synonym;
    if(synonym_list.length > 1){
      synonym = GetRandomElement(synonym_list.slice(1));
    }
    else{
      synonym = synonym_list[0];
    }
    PutInCarton(tbuilder.carton, synonym ,carton_index, MakeSynonymDoneFunction(tbuilder));
  }
  return callback;
}

function MakeSynonymDoneFunction(tbuilder){
    var f = function(){
      console.log("done!");
      tbuilder.working_content = tbuilder.carton.items;
      console.log("after synonym: " + tbuilder.working_content);
      tbuilder.transform_index++;
      PerformTransformation(tbuilder);
    }
    return f;
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





function Transform(chat_message){
  var tbuilder = {};
  tbuilder.chat_message = chat_message;
  tbuilder.working_content = [chat_message.original_text];
  tbuilder.carton = {};
  tbuilder.carton.items = [];
  tbuilder.transform_index = 0;

  PerformTransformation(tbuilder);
}

function PutInCarton(carton, item, index, carton_full_function){
  carton.items[index] = item;
  carton.counter++;
  console.log("carton: " + carton.counter + " / " + carton.max + ": ");
  console.log(carton.items);
  if(carton.counter >= carton.max){
    carton_full_function();
  }
}
function ToSynonym(text, callback){
   const api_url = 'http://localhost:8286'
  var GET_params = {
    mode: "synonym",
    word: text
  };
  var options = {
    url: api_url,
    qs: GET_params
  }
  request(
    options, 
    callback
  );
}

function ToSmartSynonym(text, callback){
   const api_url = 'http://localhost:8286'
  var GET_params = {
    mode: "smartsynonym",
    sentence: text
  };
  var options = {
    url: api_url,
    qs: GET_params
  }
  request(
    options, 
    callback
  );
}

function ToImageURLs(text, callback){
  const api_url = 'http://localhost:8286'
  // const args = "mode=translate&from=en&to=es&text="+text;
  // const api_url = domain + "?" + args;
  var GET_params = {
    mode: "bing_image",
    search: text
  };
  var options = {
    url: api_url,
    qs: GET_params
  }
  request(
    options, 
    callback
  );
}

function ToSpanish(text, callback){

  const api_url = 'http://localhost:8286'
  // const args = "mode=translate&from=en&to=es&text="+text;
  // const api_url = domain + "?" + args;
  var GET_params = {
    mode: "translate",
    from: "en",
    to: "es", 
    text: text
  };
  var options = {
    url: api_url,
    qs: GET_params
  }
  request(
    options, 
    callback
  );
}






















function OnSplittableMessage(unsplit_chat_message){
  var strings = unsplit_chat_message.original_text.split(/\s+/);
  console.log("unsplit: " + unsplit_chat_message.original_text);
  for(var index in strings){
    var string = strings[index];
    console.log("STRING: " + string);
    var chat_message = JSON.parse(JSON.stringify(unsplit_chat_message));
    chat_message.original_text = string;
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
        author_id: BOTID
      }
      OnSplittableMessage(chatbot_chat_message);
    });
  }).on('error', function(e) {
      console.log("PB GET Got error: ", e);
  });
}