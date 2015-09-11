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
  var PartOfSpeecher = require('./PartOfSpeecher.js');
  var part_of_speecher = new PartOfSpeecher();

  /* Exposed Functions */



  var Synonymize = function(sentence, options, callback){
    var words = GenerateWordItems(sentence);
    SynonymizeWordItemList(words,options,callback);
  }

  var SmartSynonymize = function(text, options, output_callback){
    console.log(part_of_speecher);
    async.waterfall(
      [
        async.apply(part_of_speecher.PartOfSpeechify, text, options),
        function(sentence, callback) {
            SynonymizeWordItemList(sentence, options, callback);
        }
      ],
      output_callback
    );
  }


  /* Successive Layers of Callbacks */

  var SynonymizeWordItemList = function(word_items, options, callback){
    async.map(
      word_items,
      function(word_item, async_cb){
        SynonymizeWordItem(
          word_item,
          options,
          async_cb
        );
      },
      function(err, response){ 
        callback(err, {"words":response});
      }
    );
  }

  var SynonymizeWordItem = function(word_item, options, callback){
   SynonymizeRawWord(
      word_item["word"],
      GenerateOptionsFromWordItem(word_item, options),
      function(err, response){
        var result = GenerateResultFromWordItem(word_item,response)
        callback(err, result);
      }
    );
  }

  var SynonymizeRawWord = function(word, options, callback){
    console.log("Synonymizing " + word + " with options " + JSON.stringify(options));
    ConsumeBigHugeSynonymAPI(
      word,
      function(err, response, body){
        var result = {};
        if(!err){
          result = ParseBody(body,options);
        }
        callback(err,result);
      }
    );
  }

  /* Internal Format of Input*/

  var GenerateWordItems = function(text){
    return text.split(" ").map(function(raw_word){
      return WordItem(raw_word);
    });
  }

  var WordItem = function(text, penn_pos){
    var item = {"word": text};
    if(penn_pos){
      item["tagged"] = true;
      item["penn_pos"] = penn_pos;
      item["lay_pos"] = ToLayPartOfSpeech(penn_pos);
    }
    return item;
  }

  var GenerateOptionsFromWordItem = function(word_item, preset_options){
    var options = Clone(preset_options);
    options["pos"] = word_item["lay_pos"];
    return options;
  }

  var GenerateResultFromWordItem = function(word_item, list){
    return {
      "original": word_item["word"],
      "list": list
    };
  }

  /* Parsing the API */

  // raw: just return the output of the bighugethesaurus API
  // pos: only words in this part of speech will be returned
  // ant: only antonyms will be returned
  var ParseBody = function(body, options){
    var body_obj;
    if(IsEmpty(body)){
      return [];
    } 
    if(options.raw){
      return body;
    }
    var body_obj = JSON.parse(body);
    var get_function = (options.ant)? GetAntonyms : GetSynonymsAndSimilars;
    var item_list = GetWordListFromAPIBody(get_function, body_obj, options.pos);
    var result = RemoveDuplicatesAndFalsies(item_list);
    return result;
  }

  var GetWordListFromAPIBody = function(get_function, body, optional_pos){
    var results;
    if(optional_pos){
      if(IsEmpty(body[optional_pos])){
        results = [];
      }
      else{
        results = get_function(body,optional_pos);
      }
    }
    else{
      results = FlattenArrayOnce(
        Object.keys(body).map(
          function(pos){
            return get_function(body,pos);
          }
        )
      );
    }
    return results;
  }

  var GetSynonymsAndSimilars = function(body,pos){
    var syn = [], sim = [];
    if(body[pos]["syn"]){
      syn = body[pos]["syn"];
    }
    if(body[pos]["sim"]){
      sim = body[pos]["sim"];
    }
    return syn.concat(sim);
  }

  var GetAntonyms = function(body,pos){
    if(!body[pos]["ant"]){
      return []
    }
    else{
      return body[pos]["ant"];
    }
  }

  /* Consuming the API */

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

  /* Part of Speech */

  // var PartOfSpeechify = function(text, options, callback){
  //   ConsumePartOfSpeechAPI(
  //     text,
  //     function(err, response, body){
  //       var success = {};
  //       if(!err){
  //         var sentence = ParseTextProcessingAPI(body);
  //         success = sentence;
  //       }
  //       callback(err,success);
  //     }
  //   );
  // }

  //   // Convert the API response into text, and parse that text
  // var ParseTextProcessingAPI = function(body){
  //   var obj = JSON.parse(body);
  //   var tagged_text = obj["text"];
  //   return ParsePartOfSpeechTaggedText(tagged_text);
  // }

  // function ConsumePartOfSpeechAPI(text, callback){
  //   const api_url = "http://text-processing.com/api/tag/";
  //   const params = querystring.stringify({
  //     'text': text,
  //     'output': "tagged"
  //   });
  //   const options = {
  //     url: api_url,
  //     body: params
  //   }
  //   request.post(options,callback);
  // }

  // // Parse POS tagged text into three corresponding arrays of
  // // words: the original tokens split on whitespace
  // // penn_parts: the abbreviation of the POS attributed to that token
  // // lay_parts: a fuller description of the POS attributed to that token
  // function ParsePartOfSpeechTaggedText(text){
  // // "This/DT is/VBZ a/DT sample/NN input/NN ./.. There/EX might/MD be/VB two/CD sentences/NNS ./.. And/CC even/RB a/DT misspellign/NN ?/."
  //   var tokens = text.split(" ");
  //   var tagged_words = [];
  //   tokens.forEach(function(token){
  //     var sides_of_slash = token.split("/");
  //     var word = sides_of_slash[0];
  //     var penn = sides_of_slash[1];
  //     tagged_words.push({
  //       "word":word, 
  //       "penn_pos":penn,
  //       "lay_pos":ToLayPartOfSpeech(penn)
  //     });
  //   });
  //   return tagged_words;
  // }

  // // Convert three-letter-acronyms for Penn part-of-speech tagging into more general terms like 'verb', 'noun', 'adverb', and 'adjective'.
  // // Using http://cs.nyu.edu/grishman/jet/guide/PennPOS.html as a guide
  // function ToLayPartOfSpeech(penn_pos){
  //   var result;
  //   var first_two = penn_pos.slice(0,2);
  //   if(first_two ==="VB"){
  //     result = "verb";
  //   }
  //   else if( first_two ==="NN"){
  //     result = "noun";
  //   }
  //   else if(first_two == "RB" || penn_pos === "WRB"){
  //     result = "adverb";
  //   }
  //   else if(first_two == "JJ"){
  //     result = "adjective";
  //   }
  //   else{
  //     result = "other";
  //   }
  //   return result;
  // }

  /* Helpers */

  var IsEmpty = function(arg){
    if(!arg)return true;
    if(typeof arg === "object"){
      return Object.keys(arg).length <= 0
    }
  }

  var FlattenArrayOnce = function(array){
    var merged = [];
    merged = merged.concat.apply(merged,array);
    return merged;
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

    self.Synonymize = Synonymize;
  self.SmartSynonymize = SmartSynonymize;

}

module.exports = Synonymizer;