var ms_translate = function(){
  var self = this;
  var most_recent_access_token_date;
  var most_recent_access_token;
  var querystring = require('querystring');
  var request = require('request');


  PerformTranslation = function(from, to, text, callback){
    if(!IsAccessTokenUpToDate()){
      RetrieveNewAccessToken();
    }

    TranslateOnceTokenIsUpToDate(
      text,
      from,
      to,
      function(translated_string){
        translated_string = RemoveQuotesAroundString(translated_string);
        console.log("("+from+") " + text + " -> " + translated_string + " (" + to + ")");
        callback(translated_string);
      }
    );
  }

  TranslateOnceTokenIsUpToDate = function(text,from,to,callback){
    InvokeFunctionAWhenFunctionBIsTrue(
      function(){
        Translate(text,from,to,callback);
      },
      function(){
        return IsAccessTokenUpToDate();
      },
      1500,10);
  }

  RecordNewAccessToken = function(token){
    console.log("translation access token: " + token)
    most_recent_access_token = token;
    most_recent_access_token_date = new Date();
  }

  IsAccessTokenUpToDate = function(){
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

  RetrieveNewAccessToken = function(){
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
  Translate = function(text, from_language, to_language, success_callback){
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


  InvokeFunctionAWhenFunctionBIsTrue = function(a,b,delay,tries){
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

  RemoveQuotesAroundString = function(string){
    if(string && string.length >=2){
      string = string.trim().slice(1,-1);
    }
    return string;
  }




  self.PerformTranslation = PerformTranslation;
};
module.exports = ms_translate;