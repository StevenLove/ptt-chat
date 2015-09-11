var PartOfSpeecher = function(){
  var querystring = require('querystring');
  var request = require('request');

  

  var PartOfSpeechify = function(text, options, callback){
    ConsumePartOfSpeechAPI(
      text,
      function(err, response, body){
        var success = {};
        if(!err){
          var sentence = ParseTextProcessingAPI(body);
          success = sentence;
        }
        callback(err,success);
      }
    );
  }

    // Convert the API response into text, and parse that text
  var ParseTextProcessingAPI = function(body){
    var obj = JSON.parse(body);
    var tagged_text = obj["text"];
    return ParsePartOfSpeechTaggedText(tagged_text);
  }

  var ConsumePartOfSpeechAPI = function(text, callback){
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

  // Parse POS tagged text into three corresponding arrays of
  // words: the original tokens split on whitespace
  // penn_parts: the abbreviation of the POS attributed to that token
  // lay_parts: a fuller description of the POS attributed to that token
  var ParsePartOfSpeechTaggedText = function(text){
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
  var ToLayPartOfSpeech = function(penn_pos){
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

  this.PartOfSpeechify = PartOfSpeechify;
}

module.exports = PartOfSpeecher;