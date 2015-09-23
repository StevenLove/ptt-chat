var Transformer = function(){
  var self = this;

  var app = require('express')();
  var async = require('async');
  var secrets = require('./secrets.js');

  var ms_translation_secret = secrets.ms_translation_secret;
  var bing_image_key = secrets.bing_image_key;
  var idilia_secret = secrets.idilia_secret;
  var bighuge_api_key = secrets.bighuge_api_key;


  var ImageSearch = require('./ImageSearch.js');
  var image_search = new ImageSearch(bing_image_key);

  var ms_translate = require('./ms_translate.js');
  var ms_translate_instance = new ms_translate(ms_translation_secret);

  var idilia_paraphrase = require('./idilia_paraphrase.js');
  var idilia_paraphrase_instance = new idilia_paraphrase(idilia_secret);

  var Synonymizer = require('./Synonymizer.js');
  var synonymizer = new Synonymizer(bighuge_api_key);

  var PartOfSpeecher = require('./PartOfSpeecher.js');
  var part_of_speecher = new PartOfSpeecher();

  var ScotsTranslator = require('./ScotsTranslator.js');
  var scots_translator = new ScotsTranslator();

  const NO_ERROR = null;
  const NO_RETURN = null;

  self.BeAServer = function(){
    app.get('/*', function(req,res){
      res.header('Access-Control-Allow-Origin', "*");
      var mode = req.query.mode;
      console.log(req.url);

      var options = req.query;
      self.Transform(options.text,options,function(err,succ){
        res.write("ERROR: " + JSON.stringify(err) + "\n");
        res.end("SUCCESS: " + JSON.stringify(succ));
      });
    });

    app.listen(8286,function(){
      console.log('listening on *:8286');
    });
  }

  String.prototype.hashCode = function(){
      var hash = 0;
      if (this.length == 0) return hash;
      for (i = 0; i < this.length; i++) {
          char = this.charCodeAt(i);
          hash = ((hash<<5)-hash)+char;
          hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
  }



  var Transform = function(text, options, callback){
    var f;
    switch(options.mode){
      case "Translate":
        f = Translate;
        break;
      case "Paraphrase":
        f = Paraphrase;
        break;
      case "Picture": 
        f = self.GoogleImages;
        break;
      case "GoogleImages": 
        f = self.GoogleImages;
        break;
      case "BingImages": 
        f = self.BingImages;
        break;
      case "Synonymize": 
        f = self.Synonymize;
        break;
      case "PartsOfSpeech": // yet to be memoized
        f = self.PartOfSpeechify;
        break;
      case "SmartSynonymize":
        f = self.SmartSynonymize;
        break;
      case "Scots": 
        f = self.Scots;
        break;
      // case "Rhyme":
      //   f = self.Rhyme;
      //   break;
      default :
        console.log("DOING NOTHING");
        f = DoNothing;
        break;
    }
    f(text,options,callback);
  }

  self.Transform = async.memoize(
    Transform,
    function(text,options){
      var str = options.mode+":"+text;
      var hash = str.hashCode();
      console.log(str + " hashed to " + hash);
      return hash;
    }
  );

  var DoNothing = function(text, callback){
    callback(null,text);
  };

  var Translate = function(options, callback){
    ms_translate_instance.Translate(
      options.from, 
      options.to, 
      options.text,
      callback
    );
  }

  self.Paraphrase = idilia_paraphrase_instance.Paraphrase;
  self.BingImages = image_search.BingImages;
  self.GoogleImages = image_search.GoogleImages;
  self.Synonymize = synonymizer.Synonymize;

  self.Antonymize = function(text, options, callback){
    options["ant"] = true;
    self.Synonymize(text,options,callback);
  }

  self.SmartSynonymize = synonymizer.SmartSynonymize;
  self.PartOfSpeechify = part_of_speecher.PartOfSpeechify;
  self.Speak = ms_translate_instance.Speak;
  self.AutoSpeak = ms_translate_instance.AutoSpeak;
  self.Scotranslate = scots_translator.Translate;
  self.DetectLanguage = ms_translate_instance.DetectLanguage;

  // self.RhymeOnce = function(text, callback){
  //   var api_key = secrets["wordnik_api_key"];
  //   var word = text;
  //   var url = 'http://api.wordnik.com:80/v4/word.json/'+word+'/relatedWords?useCanonical=true&relationshipTypes=rhyme&limitPerRelationshipType=10&api_key=' + api_key;
  //   var request = require('request');
  //   request(
  //     url,
  //     function(err,response,body){
  //       var body_obj = JSON.parse(body);
  //       body_obj["original"] = text;
  //       callback(err, body_obj);
  //     }
  //   );
  // }

  // self.Rhyme = function(word_items, callback){
  //   var words = text.split(" ");
  //   var results = [];
  //   async.forEachOf(
  //     words,
  //     function(word, index, async_cb){
  //       RhymeOnce(word,options,)

  //       async_cb();
  //     },
  //     function(err){
  //       if(err) console.error(err);
  //       callback(err,)
  //     }
  //   )
  // }

  /* Helpers */

  var RemoveDuplicatesAndFalsies = function(array){
    dict = {};
    array.forEach(function(value){
      if(value)dict[value] = true;
    });
    return Object.keys(dict);
  }

  var Clone = function(obj){
    var result = {};
    Object.keys(obj).forEach(function(key){
      result[key] = obj[key];
    });
    return result;
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
  self.Translate = Translate;
  self.DoNothing = DoNothing;
}
module.exports = Transformer;

var transformer = new Transformer();
transformer.BeAServer();