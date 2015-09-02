var ms_translate = function(client_secret){

  var querystring = require('querystring');
  var request = require('request');

  var self = this;
  self.access_token = undefined;
  self.client_secret = client_secret;

  /*
  This function is the only one exported from this module.  It translates text from one language to another and then invokes a callback on the resulting translated text.  It makes use of the Microsoft Translator API featured on the Microsoft Azure Marketplace
  
  from: string, source language's code
  to:   string, target language's code
  text: string, text to be translated from one language to another
  translated_text_callback: a function called on the translated text
  
  language code examples: {en: English, es: Spanish, fr: French}
  complete list of language codes at https://msdn.microsoft.com/en-us/library/hh456380.aspx
  */
  self.Translate = function(from, to, text, translated_text_callback){
    // Check for reasons to not even attempt translation
    if(NotWorthTranslating(text)){
      console.log("\"" + text + "\" not worth translating");
      translated_text_callback(text);
      return;
    }
    if(!from || !to){
      translated_text_callback({"error": "You must specify the from and to parameters"})
      return;
    }
    GetAccessToken(
      function(token_error, token){
        if(token_error){
          translated_text_callback(token_error);
          return;
        }
        ConsumeTranslationAPI(
          text,
          from,
          to,
          token,
          function(err, translated_text){
            translated_text = RemoveQuotesAroundString(translated_text);
            console.log("\"" + text + "\" translated to \"" + translated_text+"\"");
            translated_text_callback(null, translated_text);
          }
        );
      }
    );
  }

  var NotWorthTranslating = function(text){
    if(!text){ //undefined or ""
      return true;
    }
    var stripped_text = text.replace(/[^a-zA-Z]/g, '');
    if(!stripped_text){
      return true;
    }
  }

  var ConsumeTranslationAPI = function(text,from,to,access_token,api_response_callback){
    const api_url = 'http://api.microsofttranslator.com/V2/Ajax.svc/Translate';
    const auth_prefix = "Bearer ";
    var GET_params = {
      from: from,
      to: to, 
      text: text
    };
    var options = {
      url: api_url,
      qs: GET_params,
      headers:{
        'Authorization': auth_prefix+access_token.body
      }
    }
    request(
      options,
      function(err, response, body){
        var return_text;
        if(HasErrors(err,response,body)){
          ReportErrors("Translation of " + text,err,response,body);
          api_response_callback({"error":"error from translate api"});
        }
        else{
          // Since the API doesn't return JSON, I can't tell if it liked the call or not.  This means that we will think that the translated text is something like "ArgumentOutOfRangeException: 'to' must be a valid language..."  I don't expect us to validate every parameter here, though.
          return_text = body;
          api_response_callback(null, return_text);
        }
        return;
      }
    );
  }

/* Access Tokens */

  var AccessToken = function(token_body){
    var self = this;
    self.time_to_live = 10*60*1000; // 10 minutes in milliseconds
    self.time_of_creation = new Date();
    self.body = token_body;

    self.IsUpToDate = function(){
      var now = new Date(); // in ms
      var lifetime = now - self.time_of_creation; // in ms
      return(lifetime <= self.time_to_live);
    }
    self.ToString = function(){
      return "\"" + token_body.slice(0,40) + "...\""
    }
    console.log("New access token: " + self.ToString());

  }
  var GetAccessToken = function(active_token_callback){
    if(self.access_token && self.access_token.IsUpToDate()){
      active_token_callback(null, self.access_token);
    }
    else{
      ConsumeAccessTokenAPI(active_token_callback);
    }
  }
  var ConsumeAccessTokenAPI = function(active_token_callback){
    console.log("Retrieving new token...");
    const api_url = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13";
    const params = querystring.stringify({
      'client_id': "uant-ptt",
      'client_secret': client_secret,
      'scope': "http://api.microsofttranslator.com",
      'grant_type': "client_credentials"
    });
    const options = {
      url: api_url,
      body: params
    }
    request.post(
      options,
      function(err, response, body){
        if(HasErrors(err,response,body)){
          ReportErrors("acquiring access token",err,response,body);
          active_token_callback({"error":"failed to get a new token"});
          return;
        }
        else{
          var token_object = JSON.parse(body);
          var token_body = token_object["access_token"];
          var new_access_token = new AccessToken(token_body);
          self.access_token = new_access_token;
          active_token_callback(null, new_access_token);
        }
      }
    );
  }

/* Misc */

  var HasErrors = function(err, response, body){
    var errors_occurred = false;
    if( err || (response.statusCode!=200)){
      errors_occurred = true;
    }
    return errors_occurred;
  }
  var ReportErrors = function(description, err, response, body){
    const ERROR_TAG = "ERROR: ";
    const WARN_TAG = "WARNING: ";

    console.error("Some errors occurred ------------");

    if(err){
      console.error(ERROR_TAG + "Outright error performing " + description + ".");
    }
    if(!response){
      console.error(ERROR_TAG + "No response");
    }
    if(response && response.statusCode != 200){
      console.error(WARN_TAG + "HTTP status code " + response.statusCode + " received while performing " + description +".");
    }
    if(!body){
      console.error(ERROR_TAG + "No body");
    }

    console.error(body);
    console.error("------------");
  }

  var RemoveQuotesAroundString = function(string){
    if(string && string.length >=2){
      string = string.trim().slice(1,-1);
    }
    return string;
  }
};

module.exports = ms_translate;