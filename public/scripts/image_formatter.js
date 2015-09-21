define(['scripts/google.js'], function(google_ref){

  var image_formatter = function(){

    var googler = new google_ref();

    var LocalImageMsg = function(chat_message){
      var $div = $("<div></div>");
      var img_containers = [];

      var txt= chat_message["text"];
      if(chat_message.transform_list.indexOf("PugImages")>-1){
        txt = PuggifySentence(txt);
      }

      var words = txt.split(" ");
      words.forEach(function(word,index){
        img_containers[index] = $("<div>");
        img_containers[index].css('display','inline-block');

        googler.GoogleSearch(
          word,
          function(err,google_results){
            var url_list = [];
            google_results.forEach(function(result){
              url_list.push(result.tbUrl);
            });
            img_containers[index].append(CombineImages(url_list));
          }
        );
        $div.append(img_containers[index]);
      });
      return $div;
    }

     /* Displaying Images */

    var CombineImages = function(url_list){
      var $container = $("<div>");
      url_list.forEach(
        function(url){
          var $img = ResultImage(url);
          $container.append($img);
          $container.css('display','inline-block');
        }
      );
      CycleThroughImages($container);
      return $container;
    }

    var ResultImage = function(url){
      var $img = $("<img>");
      $img.on("load", function(){
        ScrollDown();
        $img.parent().show();
      });
      
      // img.css('display','inline-block');
      // img.hide();
      $img.css('width',150);
      $img.css('height',150);
      $img.attr('src', url);
      
      return $img;
    }

    var CycleThroughImages = function(container){
      ShowNextImage(container,0);
    }
        
    var ShowNextImage = function(container,index){
      index = parseInt(index);
      var max = container.children().length;
      // console.log("max: " + max);
      index = (index >= max)? 0 : index;
      ShowOneImage(container,index);
      setTimeout(function(){
        ShowNextImage(container,index+1);
      },3000);
    }
    var ShowOneImage = function(container,index){
      container.children().hide();
      var index_from_1 = parseInt(index) + 1;
      container.children('img:nth-child('+index_from_1+')').show();
    }
    var ShowAllImages = function(container){
      container.children().show();
    }

    var ServerImageMsg = function(chat_message){
      var $div = $("<div></div>");
      chat_message["image_url_lists"].forEach(
        function(url_list){
          var cycling_images = CombineImages(url_list);
          $div.append(cycling_images);
        }
      );
      return $div;
    }

    // DOESNT BELONG HERE
    function ScrollDown(){
      var div = $("#messages");
      var height = div.prop("scrollHeight");
      div.scrollTop(height);
    }

    var PuggifySentence = function(text){
      var words = text.split(" ");
      var result = words.map(function(word){
        return "pug."+word;
      }).join(" ");
      return result;
    }

    

    this.CombineImages = CombineImages;
    this.LocalImageMsg = LocalImageMsg;
    this.ServerImageMsg = ServerImageMsg;

  }
  return image_formatter;

});