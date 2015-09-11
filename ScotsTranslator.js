var ScotsTranslator = function(){
  var request = require('request');
  var querystring = require('querystring');

  var Translate = function(text, options, callback){
    ConsumeScoTranslateAPI(
      text,
      function(err, response, body){
        var result = {};
        if(!err){
          result = GenerateReturnObject(body);
        }
        callback(err, result);
      }
    );
  }

  var ConsumeScoTranslateAPI = function(text, callback){
    var url = "http://www.scotranslate.com/Translation/Translate";
    var params = querystring.stringify({
      "SourceId": '11',
      "RegionId": '1007',
      "InputString": text
    });
    var options = {
      "url": url,
      "body": params,
      "headers": {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    };
    request.post(options,callback);
  }

  var ParseAPIBody = function(body){
    if(IsEmpty(body)){
      return "";
    }
    var body_obj = JSON.parse(body);
    console.log(body_obj);
    var translated = body_obj["Translation"];
    return translated;
  }

  var GenerateReturnObject = function(body){
    var translated = ParseAPIBody(body);
    return {"text": translated};
  }

  /* Helpers */

  var IsEmpty = function(arg){
    if(!arg)return true;
    if(typeof arg === "object"){
      return Object.keys(arg).length <= 0
    }
  }

  this.Translate = Translate;
}
module.exports = ScotsTranslator;