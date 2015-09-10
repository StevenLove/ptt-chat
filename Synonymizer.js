var Synonymizer = function(){
  var self = this;
  var async = require('async');
  var request = require('request');
  var querystring = require('querystring');

  var Synonymize = function(text, options, callback){
    var result = {"words":[]};
    var words = text.split(" ");

    async.forEachOf(
      words,
      function(word, index, cb){
        ShortSynonymize(
          word,
          options,
          function(err,succ){
            if(err) cb(err);
            result["words"][index] = {};
            result["words"][index]["original"] = word;
            result["words"][index]["list"] = succ;
            cb();
          }
        );
      },
      function(err){
        callback(err,result);
      }
    );
  }
  
  var ConsumeBigHugeSynonymAPI = function(word, callback){
    const api_url_base ="http://words.bighugelabs.com/api/2/";
    const api_key = ***REMOVED***;
    const format = "json";
    var api_url = api_url_base+api_key+"/"+word+"/"+format;
    request(
      {"url": api_url},
      callback
    );
  }


  // raw: just return the output of the bighugethesaurus API
  // pos: only words in this part of speech will be returned
  // ant: only antonyms will be returned
  var ApplySynonymizeOptions = function(body, options){
    var results = [];
    if(body){ body = JSON.parse(body); } 
    else{ return []; }
    if(options.raw){
      results = body;
      return results;
    }
    var syn = [];
    var sim = [];
    var ant = [];
    var candidates = [];
    if(options.pos){
      if(body[options.pos]){
        syn = syn.concat(body[options.pos]["syn"]);
        sim = sim.concat(body[options.pos]["sim"]);
        ant = ant.concat(body[options.pos]["ant"]);
      }
    }
    else{
      Object.keys(body).forEach(function(pos){
        syn = syn.concat(body[pos]["syn"]);
        sim = sim.concat(body[pos]["sim"]);
        ant = ant.concat(body[pos]["ant"]);
      });
    }
    candidates = (options.ant)? ant : syn.concat(sim);
    results = RemoveDuplicatesAndFalsies(candidates);
    return results;
  }

  var ShortSynonymize = function(text, options, callback){
    console.log("Synonymizing " + text + " with options " + JSON.stringify(options));

    ConsumeBigHugeSynonymAPI(
      text,
      function(err, result, body){
        var success = {};
        if(!err){
          success = ApplySynonymizeOptions(body,options);
        }
        callback(err,success);
      }
    );
  }

  function ToLayPartOfSpeech(penn_pos){
    var result;
    var first_two = penn_pos.slice(0,2);

    if(first_two ==="VB"){
      result = "verb";
    }
    else if( first_two ==="NN"){
      result = "noun";
    }
    else if(first_two == "RB" || penn_pos === "WRB"){
      result = "adverb";
    }
    else if(first_two == "JJ"){
      result = "adjective";
    }
    else{
      result = "other";
    }
    return result;
  }

  var ParseTextProcessingAPI = function(body){
    var obj = JSON.parse(body);
    var tagged_text = obj["text"];
    return ParsePartOfSpeechTaggedText(tagged_text);
  }

  function ParsePartOfSpeechTaggedText(text){
  // "This/DT is/VBZ a/DT sample/NN input/NN ./.. There/EX might/MD be/VB two/CD sentences/NNS ./.. And/CC even/RB a/DT misspellign/NN ?/."
    var words = [];
    var penn_parts = [];
    var tokens = text.split(" ");
    tokens.forEach(function(token){
      var sidesOfSlash = token.split("/");
      words.push(sidesOfSlash[0]);
      penn_parts.push(sidesOfSlash[1]);
    });
    var lay_parts = penn_parts.map(function(penn_part){
      return ToLayPartOfSpeech(penn_part);
    })
    return { "words": words,
      "penn_parts": penn_parts,
      "lay_parts": lay_parts };
  }

  function ConsumePartOfSpeechAPI(text, callback){
    const api_url = "http://text-processing.com/api/tag/";
    const params = querystring.stringify({
      'text': text,
      'output': "tagged"
    });
    const options = {
      url: api_url,
      body: params
    }
    request.post(options,callback);
  }

  var PartOfSpeechify = function(text, options, callback){
    ConsumePartOfSpeechAPI(
      text,
      function(err, response, body){
        console.log(body);
        var success = {};
        if(!err){
          var sentence = ParseTextProcessingAPI(body);
          success = sentence;
        }
        callback(err,success);
      }
    );
  }


  function GetSynonymLists(sentence, options, callback){
    var synonym_lists = [];
    var count_current = 0;
    var count_total = sentence.words.length;
    var result = {"words": []};
    var synonym_options_list = [];
    async.forEachOf(
      sentence.words,
      function(word, index, cb){
        var lay_part = sentence.lay_parts[index];
        synonym_options_list[index] = Clone(options);
        synonym_options_list[index]["pos"] = lay_part;
        synonym_options_list[index]["text"] = word;
        ShortSynonymize(
          word,
          synonym_options_list[index],
          function(err, success){
            if(err){
              cb(err);
            }
            else{
              synonym_lists[index] = success;
            }
            cb();
          }
        );
      },
      function(err){
        sentence.words.forEach(function(word,index){
          result["words"][index] = {};
          result["words"][index]["original"] = word;
          result["words"][index]["list"] = synonym_lists[index];
        });
        callback(err,result);
      }
    );
  }

  // make this less verbose
  var SmartSynonymize = function(text, options, output_callback){
    async.waterfall(
      [
        function(callback) {
            PartOfSpeechify(text, options, callback);
        },
        function(sentence, callback) {
            GetSynonymLists(sentence, options, callback);
        }
      ],
      function(err, result){
        output_callback(err,result);
      }
    );
  }

  /* Helpers */

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

  var Clone = function(obj){
    var result = {};
    Object.keys(obj).forEach(function(key){
      result[key] = obj[key];
    });
    return result;
  }

  var RemoveDuplicatesAndFalsies = function(array){
    dict = {};
    array.forEach(function(value){
      if(value)dict[value] = true;
    });
    return Object.keys(dict);
  }


  self.PartOfSpeechify = PartOfSpeechify;
  self.Synonymize = Synonymize;
  self.SmartSynonymize = SmartSynonymize;

}

module.exports = Synonymizer;