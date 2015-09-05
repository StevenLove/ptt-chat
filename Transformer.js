var Transformer = function(){
  var self = this;

  var app = require('express')();
  var http = require('http');
  var querystring = require('querystring');
  var request = require('request');
  var googleimages = require('google-images');
  var WordNet = require('node-wordnet');
  var Bing = require('node-bing-api')({ accKey:"***REMOVED***"});

  var async = require('async');


  var ms_translate = require('./ms_translate.js');
  var translation_client_secret = "***REMOVED***";
  var ms_translate_instance = new ms_translate(translation_client_secret);

  var idilia_paraphrase = require('./idilia_paraphrase.js');
  var idilia_secret = "***REMOVED***";
  var idilia_paraphrase_instance = new idilia_paraphrase(idilia_secret);

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

  self.Transform = function(text, options, callback){
    console.log("TRANSFORM");
    console.log("  " + text);
    console.log("  " + JSON.stringify(options));
    var f;
    switch(options.mode){
      case "translate":
        f = Translate;
        break;
      case "paraphrase":
        f = Paraphrase;
        break;
      case "bingimage":
        f = BingImage;
        break;
      case "googleimage":
        f = GoogleImage;
        break;
      case "synonymize":
        f = Synonymize;
        break;
      case "partofspeech":
        f = PartsOfSpeechify;
        break;
      case "smartsynonymize":
        f = SmartSynonymize;
        break;
    }
    f(text,options,callback);
  }

  var Translate = function(text, options, callback){
    ms_translate_instance.Translate(
      options.from, 
      options.to, 
      text,
      callback
    );
  }
  var Paraphrase = function(text, options, callback){
    idilia_paraphrase_instance.Paraphrase(
      text,callback
    );
  }

  var ParseBingResponse = function(body){
    var results = body["d"]["results"];
    var thumb_urls = [];
    results.forEach(function(result, index){
      var thumb_url = result.Thumbnail.MediaUrl;
      thumb_urls.push(thumb_url);
    });
    return thumb_urls;
  }
  var BingImage = function(text, options, callback){
    var bing_options =  {top: 3, market: 'en-US'};
    Bing.images(
      text,
      bing_options,
      function(error, bing_response, body){
        var success = {};
        if(!error){
          success["urls"] = ParseBingResponse(body);
        }
        callback(error,success);
      }
    );
  }

  var GoogleSearchPage = function(text, page_num, callback){
    googleimages.search({
      "for": text, 
      "page": page_num, 
      "callback": function (err, images) {
        var success = {};
        if(!err){
          success = ParseGoogleImageResponse(images);
        }
        callback(err,success);
      }
    });
  }

  var ParseGoogleImageResponse = function(images){
    return images.map(function(image){
          return image.url;
        });
  }

  var FlattenArrayOnce = function(array){
    var merged = [];
    merged = merged.concat.apply(merged,array);
    return merged;
  }

  var GoogleImage = function(text, options, callback){
    async.parallel(
      [
        async.apply(GoogleSearchPage, text, 0),
        async.apply(GoogleSearchPage, text, 4)
      ],
      function(err, results){
        if(!err){
          results = FlattenArrayOnce(results);
        }
        callback(err,results);
      }
    );
  }

  var ConsumeBigHugeSynonymAPI = function(word, callback){
    const api_url_base ="http://words.bighugelabs.com/api/2/";
    const api_key = ***REMOVED***;
    const format = "json";
    var api_url = api_url_base+api_key+"/"+word+"/"+format;
    var options = {
      url: api_url,
    }
    request(
      options, callback
    );
  }

  var RemoveDuplicatesAndFalsies = function(array){
    dict = {};
    array.forEach(function(value){
      if(value)dict[value] = true;
    });
    return Object.keys(dict);
  }

  var ParseBigHugeSynonymList = function(body){
    if(!body){
      return [];
    }
    var results = JSON.parse(body);
    var total = [];
    Object.keys(results).forEach(
      function(part_of_speech){
        var pos_specified_word = results[part_of_speech]
        var syn = pos_specified_word["syn"];
        var sim = pos_specified_word["sim"];
        var both = syn.concat(sim);
        total = total.concat(both);
      }
    );
    var synonyms = RemoveDuplicatesAndFalsies(total);
    return synonyms;
  }

  var ApplySynonymizeOptions = function(body, options){
    var results = [];
    if(options.raw){

      results = (body)? JSON.parse(body) : {} ;
      // if(!body){
      //   results = {};
      // }
      // else{
      //   results = JSON.parse(body);
    }
    else{
      results = ParseBigHugeSynonymList(body);
      if(options.include_base){
        results.unshift(options.text);
      }
    }
    return results;
  }

  var Synonymize = function(text, options, callback){
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

  var PartsOfSpeechify = function(text, options, callback){
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

  function GetSynonymLists(sentence, callback){
    var synonym_lists = [];
    var counter = sentence["words"].length;

    async.forEachOf(
      sentence.words,
      function(word, index, callback){
        var lay_part = sentence.lay_parts[index];
        Synonymize(
          word, 
          {"raw":true, "text":word,"mode":"synonymize"},
          function(err, success){
            if(err){
              callback(err);
            }
            var syn_list = [];
            if(success[lay_part]){
              var syn_list = success[lay_part]["syn"];
            }
            syn_list.unshift(word);
            synonym_lists[index] = syn_list; 
            callback();
          }
        )
      },
      function(err){
        callback(err,synonym_lists);
      }
    );


    // sentence.words.forEach(function(word, index){
    //   var lay_part = sentence.lay_parts[index];

    //   GetBigHugeSynonymList(word, function(bighugeresult){
    //     // console.log(bighugeresult);
    //     // var syn_list = GetSamePosSynonyms(bighugeresult, lay_part);
    //     var syn = bighugeresult[lay_part];
    //     syn_list.unshift(word);
    //     // console.log(syn_list);
    //     synonym_lists[index]=syn_list;
    //     // synonym_lists[index] = GetSamePosSynonyms(bighugeresult, lay_part);
    //     --counter;
    //     if(counter == 0){
    //       callback(synonym_lists);
    //     }
    //   })
    // });
  }

  var SmartSynonymize = function(text, options, output_callback){
    async.waterfall(
      [
        function(callback) {
            console.log("async1");
            PartsOfSpeechify(text,options,callback);
            // callback(null, sentence)
        },
        function(sentence, callback) {
            console.log("async2" + JSON.stringify(sentence));
            GetSynonymLists(sentence, callback);
        }
      ],
      function(err, result){
        output_callback(err,result);
      }
    );
    // GetPartsOfSpeech(
    //   text,
      // function(result){
        // var sentence = ParsePartOfSpeechTaggedText(result);
        // console.log(sentence);
        // GetSynonymLists(sentence, function(synonym_lists){
        //   res.end(JSON.stringify(synonym_lists));
      //   })
      // }
    // );
  }

  function GetSamePosSynonyms(bighugeresult, lay_part){
    var word = bighugeresult[lay_part];
    var results=[];
    var synonyms;
    var similars;
    if(word){
      if(word["syn"]){
        synonyms = word["syn"];
      }
      else{
        synonyms = [];
      }
      if(word["sim"]){
        similars = word["sim"];
      }
      else{
        similars = [];
      }
      results = synonyms.concat(similars);
    }
    else{
      results = [];
    }

    // maybe i should remove duplicates

    return results;
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
  // function GetPartsOfSpeech(sentence, callback){
  //   const api_url = "http://text-processing.com/api/tag/";
  //   const params = querystring.stringify({
  //     'text': sentence,
  //     'output': "tagged"
  //   });
  //   const options = {
  //     url: api_url,
  //     body: params
  //   }
  //   const api_callback = function(error, response, body){
  //     if(error) {
  //       console.log(error);
  //       return;
  //     }
  //     var parts_of_speech = JSON.parse(body)["text"];
  //     callback(parts_of_speech);
  //   }
  //   request.post(options,api_callback);

  // }

  



  

  function GetWordnetSynonymList(word, callback){
      var wordnet = new WordNet();

      var syn_set = {};

      wordnet.lookup(word, function(results) {
          console.log(results[0]);
          results.forEach(
            function(result) {
              // console.log(result.lemma.count);
              result.synonyms.forEach(function(a_synonym){
                a_synonym = a_synonym.toLowerCase();
                syn_set[a_synonym] = "true";
              });
            }
          );
          delete syn_set[word];
          var synonyms = Object.keys(syn_set);
          console.log("word: " + word);
          synonyms.unshift(word);
          // res.write(JSON.stringify(synonyms));
          console.log(synonyms);
          // res.end("");
          wordnet.close();
          callback(synonyms);
      });
      // return synonyms;
  }
}
module.exports = Transformer;

var transformer = new Transformer();
transformer.BeAServer();