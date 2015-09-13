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
    var words = GenerateWordItems(sentence,options);
    SynonymizeWordItemList(words,callback);
  }


  var MemoizedSynonymize = async.memoize(
    function(sentence, options, callback){
      Synonymize(
        sentence, 
        options, 
        function(err, result){

        }
      )
    },
    function(text,options){
      var str = text+":"+options.mode;
      return str.hashCode();
    }
  );

  // var MemoizedSynonymizeOneAtATime = function(sentence, options, callback){
  //   var words = sentence.split(" ");
  //   var synonymized = [];
  //   async.forEachOf(
  //     words,
  //     function(word,index,async_cb){
  //       MemoizedSynonymize(
  //         word,
  //         options,
  //         function(err, result){
  //           synonymized[index] = result;
  //           async_cb();
  //         }
  //       );
  //     },
  //     function(err){ //async_cb
  //       if(err) console.error(err);
  //       callback(err,CreateReturnObject(translated.join("")));
  //     }  
  //   );
  // }

  var SmartSynonymize = function(text, options, output_callback){
    async.waterfall(
      [
        async.apply(part_of_speecher.PartOfSpeechify, text, options),
        async.asyncify(ConvertTaggedWordsToWordItems),
        async.apply(SynonymizeWordItemList)
      ],
      output_callback
    );
  }

  /* Successive Layers of Callbacks */

  var SynonymizeWordItemList = function(word_items, callback){
    async.map(
      word_items,
      function(word_item, async_cb){
        SynonymizeWordItemMemoized(
          word_item,
          async_cb
        );
      },
      function(err, response){ 
        callback(err, {"words":response});
      }
    );
  }


  var SynonymizeWordItem = function(word_item, callback){
    console.log("Synonymizing " + word_item["word"] + " with options " + JSON.stringify(word_item["options"]));
    ConsumeBigHugeSynonymAPI(
      word_item["word"],
      function(err, response, body){
        var result = {};
        if(!err){
          list = ParseBody(body,word_item["options"]);
          result = GenerateResultFromWordItem(word_item,list);
        }
        callback(err,result);
      }
    );
  }

  var SynonymizeWordItemMemoized = async.memoize(
    SynonymizeWordItem,
    function(word_item){
      var str = JSON.stringify(word_item["options"])+":"+word_item["word"];
      return str.hashCode();
    }
  );


  /* Parsing the Input*/

  var ConvertTaggedWordsToWordItems = function(tagged_words){
    tagged_words.forEach(function(word){
      word["options"] = {};
    });
    return tagged_words;
  }

  var GenerateWordItems = function(text, options){
    return text.split(" ").map(function(raw_word){
      return WordItem(raw_word, options);
    });
  }

  var WordItem = function(text, options, penn_pos){
    var item = {"word": text, "options": options};
    if(penn_pos){
      item["tagged"] = true;
      item["penn_pos"] = penn_pos;
      item["lay_pos"] = ToLayPartOfSpeech(penn_pos);
      item["options"]["pos"] = ToLayPartOfSpeech(penn_pos);
    }
    return item;
  }

  var GenerateOptionsFromWordItem = function(word_item){
    // var options = Clone(preset_options);
    // options["pos"] = word_item["lay_pos"];
    // return options;
    return word_item["options"];
  }

  var GenerateResultFromWordItem = function(word_item, list){
    return {
      "original": word_item["word"],
      "list": list
    };
  }

  /* Parsing the API Output */

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