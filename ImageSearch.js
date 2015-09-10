var ImageSearch = function(){
  var Bing = require('node-bing-api')({ accKey:"***REMOVED***"});
  var googleimages = require('google-images');
  var async = require('async');

  var self = this;

  const GOOGLE_PAGE_SIZE = 4;


  /* Exported */
 
  self.BingImages = function (text, options, callback){
    ApplyToList(BingImage, text.split(" "), options, callback);
  }

  self.GoogleImages = function(sentence, options, callback){
    console.log("Looking up google images on server");
    ApplyToList(GoogleImageTwoPages, sentence.split(" "), options, callback);
  }


  /* Bing */

  var BingImage = function(text, options, callback){
    var bing_options =  {top: 3, market: 'en-US'};
    Bing.images(
      text,
      bing_options,
      function(error, bing_response, body){
        var success = {};
        if(!error){
          success["urls"] = ParseBingResponse(body);
          console.log(success);
        }
        callback(error,success);
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
        async.apply(GoogleImageOnePage, text, 0),
        async.apply(GoogleImageOnePage, text, 1)
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

  var GoogleImageOnePage = function(text, page_num, callback){
    var num_imgs_to_skip = page_num * GOOGLE_PAGE_SIZE;
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
              if(err){
                console.log(err);
              }
              else{
                result[i] = succ;
              }
              cb();
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