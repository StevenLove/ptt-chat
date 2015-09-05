var idilia_paraphrase = function(key){
  var request = require('request');
  var async = require('async');
  var self = this;
  self.KEY = key;
  /** Modify these params if you want **/
  self.params = {
    "customerId": undefined,
    "disambiguationRecipe": undefined,
    "filters": undefined,
    "key": key,
    "maxCount": 20, // how many paraphrases are generated
    "minWeight": 0.0, // from 0 to 1
    "notificationURI": undefined,
    "paraphrasingRecipe": undefined,
    "requestID": undefined,
    "resultURI": undefined,
    "textMime": "text/query; charset=utf8",
    "timeout": undefined, // units of 0.1 seconds
    "transformations": "synonymy,association,specialization,syntax",
    "wsdMime": undefined,
    "superfluousAdjectives": undefined,
    "adjectives": undefined,
    "adverbs": undefined,
    "verbs": undefined,
    "nouns": undefined
  };
  const NO_ERROR = null;
  const NO_RETURN = null;
  const SELECT_ALL = "all";
  const SELECT_FIRST = "first";
  const SELECT_LAST = "last";
  const SELECT_RANDOM = "random";
  const SELECT_RANDOM_WEIGHTED = "random_weighted";
  self.SELECTOR = SELECT_RANDOM_WEIGHTED;
  self.api_start_time;
  // The API only allows 8-token phrases to be paraphrased.
  // We make repeated calls to this function to kind of paraphrase any sentences with more than 8 tokens.
  ParaphraseShort = function(input_sentence, paraphrased_text_callback){
    ConsumeParaphraseAPI(input_sentence,
      function(err,response,body){
        if(err){
          paraphrased_text_callback(err,NO_RETURN);
          return;
        }
        var body_obj = JSON.parse(body);
        if(body_obj["status"] != 200){
          var err_msg = body_obj["errorMsg"];
          paraphrased_text_callback(body_obj,NO_RETURN);
          return;
        }
        var paraphrases = ParseAPIResponse(body);
        var output_sentence;
        if(IsEmpty(paraphrases)){
          output_sentence = input_sentence;
        }
        else{
          output_sentence = SelectAppropriateParaphrase(paraphrases);
        }
        paraphrased_text_callback(NO_ERROR, output_sentence);
      }
    );
  }
  // We split up sentences of more than 8 tokens and make repeated calls to the API, since it accepts a max of 8 tokens.
  self.Paraphrase = function(text,paraphrased_text_callback){
    var query_list = SplitToParaphraseQueries(text);
    var paraphrased_chunks = [];
    async.forEachOf(
      query_list,
      function(query, query_index, callback){
        ParaphraseShort(
          query, 
          function(err, paraphrased_chunk){
            if(err) return callback(err);
            paraphrased_chunks[query_index] = paraphrased_chunk;
            console.log("chunk: " +paraphrased_chunk);
            callback(NO_ERROR);
          }
        );
      },
      function( err ){
        if(err){
          console.error(err)
          paraphrased_text_callback(err,NO_RETURN);
        }
        else{
          var paraphrased_entirety = paraphrased_chunks.join(" ");
          var success_object = {"text":paraphrased_entirety};
          paraphrased_text_callback(NO_ERROR,success_object);
        }
      }
    );
  }
  var SelectAppropriateParaphrase = function(paraphrases){
    var paraphrase_obj;
    switch(self.SELECTOR){
      case SELECT_FIRST: 
        paraphrase_obj = SelectFirst(paraphrases);
        break;
      case SELECT_LAST: 
        paraphrase_obj = SelectLast(paraphrases);
        break;
      case SELECT_RANDOM: 
        paraphrase_obj = SelectRandom(paraphrases);
        break;
      case SELECT_RANDOM_WEIGHTED: 
        paraphrase_obj = SelectRandomWeighted(paraphrases);
        break;
      default:
        console.error("No recognized selector chosen");
    }
    return paraphrase_obj;
  }
  var SelectRandomWeighted = function(paraphrases){
    weights = [];
    surfaces = [];
    paraphrases.forEach(function(paraphrase){
      surfaces.push(paraphrase["surface"]);
      weights.push(paraphrase["weight"]);
    });
    return GetRandomElementWeighted(surfaces,weights);
  }
  var SelectRandom = function(paraphrases){
    var max = paraphrases.length;
    var index = Math.floor(Math.random()*max);
    return paraphrases[index]["surface"];
  }
  var SelectFirst = function(paraphrases){
    return paraphrases[0]["surface"];
  }
  var SelectLast = function(paraphrases){
    return paraphrases[1]["surface"];
  }
  var ConsumeParaphraseAPI = function(text, api_response_callback){
    const api_url = "https://api.idilia.com/1/text/paraphrase.json";
    const params = self.params;
    params["text"] = text;
    const options = {
      url: api_url,
      qs: params,
    }
    self.api_start_time = new Date();
    request(
      options,
      function(err, response, body){
        console.log(body);
        // console.log(JSON.parse(body)["paraphrases"]);
        LogAPITime();
        api_response_callback(err,response, body);
      }
    );
  }
  var ParseAPIResponse = function(body){
    var response_object = JSON.parse(body);
    var paraphrases = response_object["paraphrases"];
    if(paraphrases){
      paraphrases.forEach(function(paraphrase_object,paraphrase_index){
        paraphrase_object["surface"] = paraphrase_object["surface"].replace(/\"/g, "");
      });
    }
    return paraphrases;
  }
  var LogAPITime = function(){
    var api_end_time = new Date();
    var elapsed_ms = api_end_time-self.api_start_time;
    const MS_IN_SECOND = 1000;
    var elapsed_seconds = elapsed_ms/MS_IN_SECOND;
    console.log("It took " + elapsed_seconds + " seconds for the API to respond.");
  }
  var SplitToParaphraseQueries = function(string){
    var sentences = SplitByClauses(string);
    var query_list = [];
    console.log(sentences);
    sentences.forEach(
      function(sentence){
        var token_lists = SplitToListsOfEightTokens(sentence);
        token_lists.forEach(
          function(token_list){
            var query = token_list.join(" ");
            query_list.push(query);
          }
        );
      }
    );
    return query_list;
  }
  var SplitByClauses = function(string){
    // Regex: any characters (non-greedy) that are followed by at least one claus-ending punctuation (;!.?), and that punctuation is followed by a space or the end of the line.  This means that "3.14" won't be separated, nor will "don;t" or "why?not!!".
    var tokens =  string.match(/.*?[;!\.\?]+( |$)/g).filter(function(token){
      return token.length>0;
    });
    return tokens;
  }
  var Tokenize = function(string){
    var tokens = string.split(" ").filter(function(token){
      return token.length>0;
    });
    return tokens;
  }
  var ChunkifyArray = function(array, chunk_size){
    var next_chunk;
    var unchunkified = array;
    var result = [];
    do{
      next_chunk = unchunkified.slice(0,chunk_size);
      result.push(next_chunk);
      unchunkified = unchunkified.slice(8);
    }while(unchunkified.length>0);
    return result;
  }
  var SplitToListsOfEightTokens = function(string){
    return ChunkifyArray(Tokenize(string),8);
  }
  var IsEmpty= function(item){
    return (!item || item.length < 1);
  }
  var GetRandomElementWeighted = function(array, weights){
    var total_weight = weights.reduce(function(running_total, cur, index){
      return running_total+cur;
    });
    var total_distance = total_weight*Math.random();
    var distance = total_distance
    var chosen_index;
    for(var loop_index = 0; loop_index < weights.length; ++loop_index){
      var weight = weights[loop_index];
      if(distance <= weight){
        chosen_index = loop_index;
        break;
      }
      else{
        distance -= weight;
      }
    }
    return array[chosen_index];
  }
}
module.exports = idilia_paraphrase;
