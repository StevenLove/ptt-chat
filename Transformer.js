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
    console.log(text);
    console.log(options);
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
    }
    f(text,options,callback);

    // }
    // if(options.mode === "translate"){
    //   Translate(text,options,callback);
    // }
    // if(options.mode === "paraphrase"){
    //   Paraphrase(text,options,callback);
    // }
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

  function GetBigHugeSynonymList(word, callback){
    const api_url_base ="http://words.bighugelabs.com/api/2/";
    const api_key = ***REMOVED***;
    const format = "json";
    var api_url = api_url_base+api_key+"/"+word+"/"+format;


    var options = {
      url: api_url,
    }

    var api_callback = function(err, response, body) {
      if(err) {
        console.log(err);
        return;
      }
      console.log("Synonym Get response: " + response.statusCode);
      if(!body){
        var empty_array = [];
        success_callback(empty_array);
      }
      else{
        success_callback(JSON.parse(body));
      }
    }

    request(
      options, api_callback
    );
  }


  var Synonymize = function(text, options, callback){
    GetBigHugeSynonymList(
      text,
      function(bighugeresult){
        if(bighugeresult){
          synonyms = [];
          synonyms.unshift(req.query.word);
            Object.keys(bighugeresult).forEach(function(part_of_speech){
              var results = GetSamePosSynonyms(bighugeresult,part_of_speech);
                console.log(results);
                synonyms = synonyms.concat(results);
            });
          res.write(JSON.stringify(synonyms));
        }
        res.end("");
      }
    );
  }

    // else if(mode == "synonym"){
    //   GetBigHugeSynonymList(req.query.word,
    //     function(bighugeresult){
    //       if(bighugeresult){
    //         synonyms = [];
    //         synonyms.unshift(req.query.word);
    //         // if(Object.keys(bighugeresult)){
    //           Object.keys(bighugeresult).forEach(function(part_of_speech){
    //             var results = GetSamePosSynonyms(bighugeresult,part_of_speech);
    //             // bighugeresult[part_of_speech]["syn"].forEach(function(one_synonym){
    //               console.log(results);
    //               synonyms = synonyms.concat(results);
    //             // });
    //           });
    //         // }
    //         // var result = GetRandomElement(synonyms);
    //         res.write(JSON.stringify(synonyms));
    //       }
    //     res.end("");
    //   });
    // }
  //   else if(mode == "pos"){
  //     GetPartsOfSpeech(req.query.sentence,function(result){
  //       var sentence = ParsePartOfSpeechTaggedText(result);
  //       res.write(JSON.stringify(sentence));
  //       res.end("");
  //     });
  //   }
  //   else if(mode == "smartsynonym"){
  //     GetPartsOfSpeech(req.query.sentence,function(result){
  //       var sentence = ParsePartOfSpeechTaggedText(result);
  //       console.log(sentence);
  //       GetSynonymLists(sentence, function(synonym_lists){
  //         res.end(JSON.stringify(synonym_lists));
  //       })
  //     });
  //   }
  //   else{
  //     console.log("not doing anything");
  //     res.end("not doing anything.");
  //   }

  // });

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

  function GetSynonymLists(sentence, callback){
    var synonym_lists = [];
    var counter = sentence.words.length;
    sentence.words.forEach(function(word, index){
      var lay_part = sentence.lay_parts[index];
      GetBigHugeSynonymList(word, function(bighugeresult){
        // console.log(bighugeresult);
        var syn_list = GetSamePosSynonyms(bighugeresult, lay_part);
        syn_list.unshift(word);
        // console.log(syn_list);
        synonym_lists[index]=syn_list;
        // synonym_lists[index] = GetSamePosSynonyms(bighugeresult, lay_part);
        --counter;
        if(counter == 0){
          callback(synonym_lists);
        }
      })
    });
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
  function GetPartsOfSpeech(sentence, callback){
    const api_url = "http://text-processing.com/api/tag/";
    const params = querystring.stringify({
      'text': sentence,
      'output': "tagged"
    });
    const options = {
      url: api_url,
      body: params
    }
    const api_callback = function(error, response, body){
      if(error) {
        console.log(error);
        return;
      }
      var parts_of_speech = JSON.parse(body)["text"];
      callback(parts_of_speech);
    }
    request.post(options,api_callback);

  }

  function ParsePartOfSpeechTaggedText(text){
  // "This/DT is/VBZ a/DT sample/NN input/NN ./.. There/EX might/MD be/VB two/CD sentences/NNS ./.. And/CC even/RB a/DT misspellign/NN ?/."
    var sentence = {};
    var words = [];
    var penn_parts = [];
    var lay_parts = [];
    var word;
    var pos_abbreviation;
    var tokens = text.split(" ");
    tokens.forEach(function(token){
      sidesOfSlash = token.split("/");
      word = sidesOfSlash[0];
      pos_abbreviation = sidesOfSlash[1];
      words.push(word);
      penn_parts.push(pos_abbreviation);
      lay_parts.push(ToLayPartOfSpeech(pos_abbreviation));
    });

    sentence["words"] = words;
    sentence["penn_parts"] = penn_parts;
    sentence["lay_parts"] = lay_parts;
    return sentence;
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