var ImageSearch = function(){
  var Bing = require('node-bing-api')({ accKey:"***REMOVED***"});
  var googleimages = require('google-images');
  var async = require('async');

  var self = this;

  const GOOGLE_PAGE_SIZE = 4;


  /* Exported */
 
  self.BingImages = function (text, options, callback){
    ApplyToList(BingImageMemoizedSafe, text.split(" "), options, callback);
  }

  self.GoogleImages = function(sentence, options, callback){
    ApplyToList(GoogleImageTwoPages, sentence.split(" "), options, callback);
  }

  /* Bing */


  var BingImage = function(text, options, callback){
    var bing_options =  {top: 8, market: 'en-US'};
    console.log("Consuming Bing Image API for " + text);
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



  var BingImageMemoized = async.memoize(
    BingImage,
    function(text,options){
      var str = options.mode + ":" + text;
      return str.hashCode();
    }
  );

  var RemoveErrorsFromMemo = function(memo){
    Object.keys(memo).forEach(function(key){
      var result = memo[key];
      if(result[0]){
        delete memo[key];
      }
    })
  }

  var BingImageMemoizedSafe = function(text, options, callback){
    BingImageMemoized(
      text, 
      options, 
      function(err, result){
        if(err){
          var memo = BingImageMemoized["memo"];
          RemoveErrorsFromMemo(memo);
          BingImageMemoizedSafe(text, options, callback);
        }
        else{
          callback(err,result);
        }
      }
    );
  }





  // replace this foreach with a map
  var ParseBingResponse = function(body){
    var results = body["d"]["results"];
    var thumb_urls = [];
    results.forEach(function(result, index){
      var thumb_url = result.Thumbnail.MediaUrl;
      thumb_urls.push(thumb_url);
    });
    return thumb_urls;
  }

  /* Google */
  
  var GoogleImageTwoPages = function(text, options, callback){
    async.parallel(
      [
        async.apply(ConsumeGoogleAPIMemoized, text, 0),
        async.apply(ConsumeGoogleAPIMemoized, text, 1)
      ],
      function(err, results){
        var success = {};
        if(!err){
          success["urls"] = FlattenArrayOnce(results);
        }
        callback(err,success);
      }
    );
  }


  var ConsumeGoogleAPI= function(text, page_num, callback){
    var num_imgs_to_skip = page_num * GOOGLE_PAGE_SIZE;
    console.log("Consuming Google API, searching for " + text + " page " + page_num);
    googleimages.search({
      "for": text, 
      "page": num_imgs_to_skip, 
      "callback": function (err, images) {
        var success = {};
        if(!err){
          success = ParseGoogleImageResponse(images);
        }
        callback(err,success);
      }
    });
  }


  var ConsumeGoogleAPIMemoized = async.memoize(
    ConsumeGoogleAPI,
    function(
      text,
      page_num){
      var str = page_num+":"+text;
      return str.hashCode();
    }
  );

  var ParseGoogleImageResponse = function(images){
    return images.map(function(image){
          return image.url;
        });
  }



  /*  Helpers */

  var FlattenArrayOnce = function(array){
    var merged = [];
    merged = merged.concat.apply(merged,array);
    return merged;
  }

  // replace with a call to async.map ?
  // Invokes an asynchronous function on an array of items with shared information 'options' and a callback to call when it is completed
  var ApplyToList = function(fn, array, options, callback){
    var result = [];
    async.forEachOf(
      array,
      function(item, index, cb){
        fn(
          item,
          options,
          function(i){
            return function(err,succ){
              if(!err){
                result[i] = succ;
              }
              cb(err);
            }
          }(index)
        );
      },
      function(err){
        callback(err,result);
      }
    );
  }


}

module.exports = ImageSearch;