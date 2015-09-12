var ScotsTranslator = function(){
  var request = require('request');
  var querystring = require('querystring');
  var async = require('async');



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

  var MemoizedTranslate = async.memoize(
    Translate,
    function(text,options){
      var str = options.mode+":"+text;
      var hash = str.hashCode();
      console.log(str + " hashed to " + hash);
      return hash;
    }
  );

  var MemoizedTranslateOneAtATime = function(text, options, callback){
    var words = text.split(" ");
    var translated = [];
    async.forEachOf(
      words,
      function(word,index,async_cb){
        MemoizedTranslate(
          word,
          options,
          function(err, result){
            translated[index] = result["text"];
            async_cb();
          }
        );
      },
      function(err){ //async_cb
        if(err) console.error(err);
        callback(err,CreateReturnObject(translated.join("")));
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
    return CreateReturnObject(translated);
  }

  var CreateReturnObject = function(translated_text){
    return {"text": translated_text};
  }

  /* Helpers */

  var IsEmpty = function(arg){
    if(!arg)return true;
    if(typeof arg === "object"){
      return Object.keys(arg).length <= 0
    }
  }

  this.Translate = MemoizedTranslateOneAtATime;
}
module.exports = ScotsTranslator;