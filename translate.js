var app = require('express')();
var http = require('http');
var querystring = require('querystring');
var request = require('request');
var googleimages = require('google-images');


var most_recent_access_token_date;
var most_recent_access_token;



app.get('/*', function(req,res){
  res.header('Access-Control-Allow-Origin', "*");


  var mode = req.query.mode;
  
  console.log(req.url);

  if(mode == "translate"){
    var GET_params = {
      mode:req.query.mode,
      from:req.query.from,
      to:req.query.to,
      text:req.query.text
    }
    var success_callback = function(translated_string){
      translated_string = RemoveQuotesAroundString(translated_string);


      console.log("("+GET_params.from+") " + GET_params.text + " -> " + translated_string + " (" + GET_params.to + ")");

      res.end(translated_string);
    }



    if(!IsAccessTokenUpToDate()){
      RetrieveNewAccessToken();
    }
    TranslateOnceTokenIsUpToDate(GET_params.text,GET_params.from,GET_params.to, success_callback);
  }


  else if(mode == "image"){
    var urls = [];
    var searches_completed = 0;

    var search_term = req.query.search;
    googleimages.search({
      for: search_term, 
        page:0, 
        callback: function (err, images) {
          for( var i in images){
            var image = images[i];
            urls.push(image.url);
          }
          searches_completed++;
          if(searches_completed >= 2){
            res.write(JSON.stringify(urls));
            res.end("");
          }
        }
      }
    );
    googleimages.search({
      for: search_term, 
        page:4, 
        callback: function (err, images) {
          for( var i in images){
            var image = images[i];
            urls.push(image.url);
          }
          searches_completed++;
          if(searches_completed >= 2){
            res.write(JSON.stringify(urls));
            res.end("");
          }
        }
      }
    );
  }
  else{
    res.end("not doing anything.");
  }

});



app.listen(8286,function(){
  console.log('listening on *:8286');
});

function RemoveQuotesAroundString(string){
  if(string && string.length >=2){
    string = string.trim().slice(1,-1);
  }
  return string;
}

function TranslateOnceTokenIsUpToDate(text,from,to,callback){
  InvokeFunctionAWhenFunctionBIsTrue(
    function(){
      Translate(text,from,to,callback);
    },
    function(){
      return IsAccessTokenUpToDate();
    },
    1500,10);
}

function RecordNewAccessToken(token){
  most_recent_access_token = token;
  most_recent_access_token_date = new Date();
}

function IsAccessTokenUpToDate(){
  // console.log('checking token');
  const access_minutes = 10;
  const access_ms = access_minutes * 60 * 1000;

  var token_date = most_recent_access_token_date;
  if(!token_date){
    return false;
  }
  var now = new Date();
  var elapsed_ms = now-token_date;
  if(elapsed_ms > access_ms){
    return false;
  }
  
  return true;
}

function RetrieveNewAccessToken(){
  console.log("retrieving new token");
  const api_url = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13";
  const params = querystring.stringify({
    'client_id': "uant-ptt",
    'client_secret': "***REMOVED***",
    'scope': "http://api.microsofttranslator.com",
    'grant_type': "client_credentials"
  });
  const options = {
    url: api_url,
    body: params
  }
  const callback = function(error, response, body){
    if(error) {
      console.log(error);
      return;
    }
    var token_object = JSON.parse(body);
    var access_token = token_object["access_token"];
    RecordNewAccessToken(access_token);
  }
  request.post(options,callback);
}

// Assumes an up-to-date access token
function Translate(text, from_language, to_language, success_callback){
  const api_url = 'http://api.microsofttranslator.com/V2/Ajax.svc/Translate';
  const auth_prefix = "Bearer ";
  var access_token = most_recent_access_token;
  var GET_params = {
    from: from_language,
    to: to_language, 
    text: text
  };
  var options = {
    url: api_url,
    qs: GET_params,
    headers:{
      'Authorization': auth_prefix+access_token
    }
  }
  var callback = function(err, response, body) {
    if(err) {
      console.log(err);
      return;
    }
    console.log("Translation Get response: " + response.statusCode);
    success_callback(body);
  }
  request(
    options, callback
  );
}

function InvokeFunctionAWhenFunctionBIsTrue(a,b,delay,tries){
  if(tries > 0){
    if(b()){
      a();
    }
    else{
       // console.log("gonna try again");
       setTimeout(function(){
         InvokeFunctionAWhenFunctionBIsTrue(a,b,delay,tries-1);
       },
       delay);
    }
  }
}