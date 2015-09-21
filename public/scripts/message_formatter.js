define([
  'scripts/fb.js',
  'scripts/image_formatter.js',
  'scripts/synthesis.js'
  ],
  function(
    fb_ref,
    image_formatter_ref,
    synthesis_ref
  ){
    var message_formatter = function(){


      var facebook = new fb_ref();
      var image_formatter = new image_formatter_ref();
      var synthesis = new synthesis_ref();




      /* Template HTML */
      var GenerateNewMessageLine = function(chat_message){
        var line = $("<li class='clearfix' name='line'></li>");
        line.append(GenerateLabelColumnHTML(chat_message));
        line.append(GenerateMsgGroupHTML());
        return line;
      }
      var GenerateLabelColumnHTML = function(chat_message){
        var column = $("<div name='label-column' class='well label-column col-xs-2'></div>");
        column.attr("data-toggle","tooltip");
        column.attr("title",LabelText(chat_message));
        column.append(Label(chat_message));
        return column;
      }
      var GenerateLabelHTML = function(){
        return $("<div name='label' class = 'label'></div>");
      }
      var GenerateMsgGroupHTML = function(){
         var msg = $("<div name='msg_group' class=' msg-group'></div>");
         return msg;
      }
      var GenerateMsgHTML = function(){
        var msg = $("<div name='msg'></div>");
        return msg;
      }





        /* Labels */

      function Label(chat_message){
        var label_pic = LabelPicture(chat_message);
        return label_pic;
      }

      function LabelPicture(chat_message){
        var url;
        if(chat_message.author_facebook_id){
          url = facebook.FacebookProfilePicture(chat_message.author_facebook_id);
        }
        else{
          url = RobohashURL(chat_message.author_id);
        }
        var pic = $("<img class='label-img'></img>").attr("src", url).width(50);
        return pic;
      }

      function LabelText(chat_message){
        var time = "(" + new Date(chat_message.timestamp).toLocaleTimeString() + ")";
        var author = chat_message.author_name;
        var label_text = author + " " + time;
        return label_text;
      }

      var RobohashURL = function(ip){
        var base = "https://robohash.org/"
        return base+ip+"?set=any&bgset=any";
      }







      /* Building Chat Line HTML/CSS */

      function IsSameSentence(prev_message, next_message){
      return (
        BothExist(prev_message,next_message) &&
        SameAuthor(prev_message,next_message)
        //  &&
        // AreCloseEnough(prev_message,next_message)
          );
      }
      function BothExist(cm1,cm2){
        return(cm1 && cm2);
      }

      function SameAuthor(cm1,cm2){
        if(!cm1 || !cm2){
          return false;
        }
        var author1 = cm1.author_id;
        var author2 = cm2.author_id;
        return (author1 == author2);
      }


      function ChatMessageContainer(chat_message){
        var prev_container = $("#messages").children().last();
        var container;

        if(IsSameSentence(document.prev_chat_message,chat_message)){
          container = prev_container;
        }
        else{
          container = GenerateNewMessageLine(chat_message);
          $("#messages").append(container);
        }
        document.prev_chat_message = chat_message;
        container.children().eq(1).append(Msg(chat_message));
        ScrollDown();
      }



      /* Message Creation */

      var LocalSpeakMessage = function(chat_message){
        if(!IsRecap(chat_message)){
          if(synthesis.CanSpeakLocal()){
            synthesis.SpeakLocal(chat_message);
          }
        }
        var $msg = GenerateMsgHTML();
        $msg.append(synthesis.GenerateLocalAudioPlayer(chat_message));
        return $msg;
      }

      var SpeakMessage = function(chat_message){
        var $msg = GenerateMsgHTML();
        var url = chat_message["url"];
        if(IsRecap(chat_message)){
          $msg.append(synthesis.GenerateAudioPlayer(url));
        }
        else{
          $msg.append(synthesis.GenerateAutoplayAudioPlayer(url));
        }
        return $msg;
      }

      var TextMsg = function(chat_message){
        var msg = GenerateMsgHTML();
        msg.text(chat_message.text);
        return msg;
      }

      var LocalImageMsg = function(chat_message){
        var $msg = GenerateMsgHTML();
        $msg.append(image_formatter.LocalImageMsg(chat_message));
        return $msg;
      }

      var ServerImageMsg = function(chat_message){
        var $msg = GenerateMsgHTML();
        $msg.append(image_formatter.ServerImageMsg(chat_message));
        return $msg;
      }




      /* Messages Determination */

      var Msg = function(chat_message){
        if(IsLocalSpeakMessage(chat_message)){
          return LocalSpeakMessage(chat_message);
        }
        if(IsSpeakMessage(chat_message)){
          return SpeakMessage(chat_message);
        }
        if(IsTextMessage(chat_message)){
          return TextMsg(chat_message);
        }
        if(IsLocalImageMessage(chat_message)){
          return LocalImageMsg(chat_message);
        }
        if(IsServerImageMessage(chat_message)){
          return ServerImageMsg(chat_message);
        }
      }

      var IsLocalSpeakMessage = function(chat_message){
        return chat_message["type"] === "LocalSpeak";
      }
      var IsSpeakMessage = function(chat_message){
        return chat_message["type"] === "Speak";
      }
      var IsLocalImageMessage = function(chat_message){
        return chat_message["type"] === "LocalGoogleImages";
      }
      var IsServerImageMessage = function(chat_message){
        return chat_message["type"] === "ServerImages";
      }
      var IsTextMessage = function(chat_message){
        return chat_message["type"] === "Text";
      }






      /* Misc */

      var IsRecap = function(chat_message){
        return chat_message["recap"] == true;
      }

      function ScrollDown(){
        var div = $("#messages");
        var height = div.prop("scrollHeight");
        div.scrollTop(height);
      }

      this.ChatMessageContainer = ChatMessageContainer;

    };
    return message_formatter;
  }
);