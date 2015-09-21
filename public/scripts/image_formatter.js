define(['scripts/google.js'], function(google_ref){

  var image_formatter = function(){

    var googler = new google_ref();

    var LocalImageMsg = function(chat_message){
      var msg = GenerateMsgHTML();
      var img_containers = [];

      if(chat_message.transform_list.indexOf("PugImages")>-1){
        chat_message.transformed_text = PuggifySentence(chat_message.original_text);
      }
      else{
        chat_message.transformed_text = chat_message.original_text;
      }

      var words = chat_message.transformed_text.split(" ");
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
        msg.append(img_containers[index]);
      });
      return msg;
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
      var msg = GenerateMsgHTML();
      chat_message["image_url_lists"].forEach(
        function(url_list){
          var cycling_images = CombineImages(url_list);
          msg.append(cycling_images);
        }
      );
      return msg;
    }

    // DOESNT BELONG HERE
    var GenerateMsgHTML = function(){
      var msg = $("<div name='msg'></div>");
      return msg;
    }
    function ScrollDown(){
      var div = $("#messages");
      var height = div.prop("scrollHeight");
      div.scrollTop(height);
    }
    

    this.CombineImages = CombineImages;
    this.LocalImageMsg = LocalImageMsg;
    this.ServerImageMsg = ServerImageMsg;

  }
  return image_formatter;

});