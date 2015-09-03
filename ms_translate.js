var ms_translate = function(client_secret){

  var querystring = require('querystring');
  var request = require('request');

  var self = this;
  self.access_token = undefined;
  self.client_secret = client_secret;
  const NO_ERROR = null;
  const NO_RETURN = null;

  self.KNOWN_LANGUAGE_CODES = ["ar", "bs-Latn", "bg", "ca", "zh-CHS", "zh-CHT", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "ht", "he", "hi", "mww", "hu", "id", "it", "ja", "tlh", "tlh-Qaak", "ko", "lv", "lt", "ms", "mt", "no", "fa", "pl", "pt", "otq", "ro", "ru", "sr-Cyrl", "sr-Latn", "sk", "sl", "es", "sv", "th", "tr", "uk", "ur", "vi", "cy", "yua"];

  /*
  This function is the only one exported from this module.  It translates text from one language to another and then invokes a callback on the resulting translated text.  It makes use of the Microsoft Translator API featured on the Microsoft Azure Marketplace
  
  Parameters
  from: string, source language's code
  to:   string, target language's code
  text: string, text to be translated from one language to another
  translated_text_callback: a function called on the translated text
  
  language code examples: {en: English, es: Spanish, fr: French}
  complete list of language codes at https://msdn.microsoft.com/en-us/library/hh456380.aspx

  Output
  translated_text_callback will be called with two arguments
  1) error: 
    a.  If there are no errors: undefined
    b.  If there are errors: an object with key "error" and value that describes the error(s)
  2) translated_text: an object with 
    key "text" and string value that is the translated text

  */
  self.Translate = function(from, to, text, translated_text_callback){
    var success_object;

    // Check for reasons to not even attempt translation
    if(IsRequestMalformed(from,to,text)){
      var malformed_request_error_object = HowIsRequestMalformed(from,to,text);
      translated_text_callback(malformed_request_error_object, NO_RETURN);
      return;
    }

    if(NotWorthTranslating(from, to, text)){
      console.log("\"" + text + "\" not worth translating from " + from + " to " + to);
      var success_object = {"text": text}
      translated_text_callback(NO_ERROR, success_object);
      return;
    }
    // Okay we'll translate your dirty message
    GetAccessToken(
      function(token_error, token){
        if(token_error){
          translated_text_callback(token_error,NO_RETURN);
          return;
        }
        else{
          ConsumeTranslationAPI(
            text,
            from,
            to,
            token,
            function(api_error, translated_text){
              if(api_error){
                translated_text_callback(api_error, NO_RETURN);
                return;
              }
              else{
                translated_text = translated_text.trim().slice(1,-1);
                console.log("\"" + text + "\" translated to \"" + translated_text+"\"");
                success_object = {"text":translated_text}
                translated_text_callback(NO_ERROR, success_object);
                return;
              }
            }
          );
        }
      }
    );
  }

  var IsRequestMalformed = function(from, to, text){
    if((!text) ||
      (!to)||
      (!from) ||
      (!IsKnownTranslatorLanguageCode(to)) ||
      (!IsKnownTranslatorLanguageCode(from))){
      return true;
    }
    return false;
  }

  var HowIsRequestMalformed = function(from,to,text){
    var error_object = {}
    var error_text = "";
    if(!text){
      error_text += "You must provide the \"text\" parameter (the text you want translated).  ";
    }
    if(!from){
      error_text += "You must provide the \"from\" parameter (the language of the text you provide).  ";
    }
    else if(!IsKnownTranslatorLanguageCode(from)){
      error_text += "The \"from\" parameter must be a known language code.  Known language codes: " + JSON.stringify(self.KNOWN_LANGUAGE_CODES) + ".  You supplied: \"" + from +"\".  ";
    }
    if(!to){
      error_text += "You must provide the \"to\" parameter (the language you want your text to be translated to).  ";
    }
    else if(!IsKnownTranslatorLanguageCode(to)){
      error_text += "The \"to\" parameter must be a known language code.  Known language codes: " + JSON.stringify(self.KNOWN_LANGUAGE_CODES) + ".  You supplied: \"" + to +"\".  ";
    }
    if(!error_text){
      error_object = undefined;
    }
    else{
      error_object = {"error": error_text};
    }
    return error_object;
  }

  var IsKnownTranslatorLanguageCode = function(code){
    return self.KNOWN_LANGUAGE_CODES.some(function(known_code){
      if(code === known_code){
        return true;
      }
    });
    return false;
  }

  var NotWorthTranslating = function(from, to, text){
    var stripped_text = text.replace(/[^a-zA-Z]/g, ''); // remove all non-alphabet characters
    if(!stripped_text){
      return true;
    }
    if(from === to){
      return true;
    }
    return false;
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
          api_response_callback({"error":"error from translate api"}, NO_RETURN);
        }
        else{
          // Since the API doesn't return JSON, I can't tell if it liked the call or not.  This means that we will think that the translated text is something like "ArgumentOutOfRangeException: 'to' must be a valid language..."  I don't expect us to validate every parameter here, though.
          api_response_callback(NO_ERROR, body);
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
      active_token_callback(NO_ERROR, self.access_token);
      return;
    }
    else{
      GenerateNewAccessToken(active_token_callback);
    }
  }

  var GenerateNewAccessToken = function(active_token_callback){
    ConsumeAccessTokenAPI(
      function(err, token_api_response){
        if(err){
          active_token_callback(err, NO_RETURN);
          return;
        }
        else{
          var new_token = ParseAccessTokenAPI(token_api_response);
          self.access_token = new_token;
          active_token_callback(NO_ERROR, new_token);
        }
      }
    );
  }

  var ParseAccessTokenAPI = function(api_response){
    var token_object = JSON.parse(api_response);
    var token_body = token_object["access_token"];
    var new_access_token = new AccessToken(token_body);
    return new_access_token;
  }
  var ConsumeAccessTokenAPI = function(api_response_callback){
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
          api_response_callback({"error":"failed to get a new token.  Is your client_secret correct? You provided \""+self.client_secret+"\""}, NO_RETURN);
          return;
        }
        else{
          api_response_callback(NO_ERROR,body);
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
  }

  var RemoveQuotesAroundString = function(string){
    if(string && string.length >=2){
      string = string.trim().slice(1,-1);
    }
    return string;
  }
};

module.exports = ms_translate;