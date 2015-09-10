// learn about javascript prototyping
// maybe I should have many instances of synonymizers
// as long as i only duplicate what is stored like the options
// this came up because i was wondering if options should be STATE of the obj
// so I don't have to pass it up and down everything.
// otherwise I probably want to combine text into options

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
    if(body){
      body = JSON.parse(body);
    } 
    else{
      return [];
    }
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


// [
//   {"word": w, "penn": x, "lay": y}
//   ,{}
//   ,{}
//   ,...
// ]

  var GenerateTaggedWordOptions = function(tagged_word, preset_options){
    var options = Clone(preset_options);
    options["pos"] = tagged_word["lay_pos"];
    return options;
  }

  // Smart Synonymize one word
  var SmartSynonymizeShort = function(tagged_word, options, callback){

  }

  function GetSynonymLists(tagged_words, options, callback){
    // Build a skeleton of the results, missing the lists of synonyms
    var result = {"words": 
      tagged_words.map(
        function(tagged_word){
          return {"original": tagged_word["word"]};
        }
      )
    };
    // Get an array of outputs from ShortSynonymize, one for each tagged_word
    async.map(
      tagged_words,
      function(tagged_word, async_cb){
        ShortSynonymize(
          tagged_word["word"],
          GenerateTaggedWordOptions(tagged_word, options),
          function(err, response){
            async_cb(err,response);
          }
        );
      },
      // Stick those responses in the results skeleton and call back
      function(err, response){ //async_cb
        console.log("result: " + JSON.stringify(result));
        response.forEach(function(list,index){
          result["words"][index]["list"] = list;
        });
        callback(err, result);
      }
    )
  }

  var SmartSynonymize = function(text, options, output_callback){
    async.waterfall(
      [
        async.apply(PartOfSpeechify, text, options),
        function(sentence, callback) {
            GetSynonymLists(sentence, options, callback);
        }
      ],
      function(err, result){
        output_callback(err,result);
      }
    );
  }


  /* Part of Speech */

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

  // Convert the API response into text, and parse that text
  var ParseTextProcessingAPI = function(body){
    var obj = JSON.parse(body);
    var tagged_text = obj["text"];
    return ParsePartOfSpeechTaggedText(tagged_text);
  }

  // Parse POS tagged text into three corresponding arrays of
  // words: the original tokens split on whitespace
  // penn_parts: the abbreviation of the POS attributed to that token
  // lay_parts: a fuller description of the POS attributed to that token
  function ParsePartOfSpeechTaggedText(text){
  // "This/DT is/VBZ a/DT sample/NN input/NN ./.. There/EX might/MD be/VB two/CD sentences/NNS ./.. And/CC even/RB a/DT misspellign/NN ?/."
    var tokens = text.split(" ");
    var tagged_words = [];
    tokens.forEach(function(token){
      var sides_of_slash = token.split("/");
      var word = sides_of_slash[0];
      var penn = sides_of_slash[1];
      tagged_words.push({
        "word":word, 
        "penn_pos":penn,
        "lay_pos":ToLayPartOfSpeech(penn)
      });
    });
    return tagged_words;
  }

  // Convert three-letter-acronyms for Penn part-of-speech tagging into more general terms like 'verb', 'noun', 'adverb', and 'adjective'.
  // Using http://cs.nyu.edu/grishman/jet/guide/PennPOS.html as a guide
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