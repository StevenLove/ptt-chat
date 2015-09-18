define([], function(){

  var synthesis = function(){
    /* SpeakLocal */
    var SpeakLocal = function(chat_message){
      var text = chat_message["original_text"];
      if(!text){
        return;
      }
      console.log("speaking this: " + text + ".");
      var msg = new SpeechSynthesisUtterance(text);
      var voices = window.speechSynthesis.getVoices();

      if(chat_message["author_id"] === "f6d4afd83e34564d"){
        console.log("the message was from a bot");
        msg["pitch"] = 0.6;
        msg["rate"] = 0.9;
        msg.voice = ChooseFemaleVoice();
      }
      else{
        msg.voice = voices[$("#voicelist").val()];
      }

      window.speechSynthesis.speak(msg);
      
    }


    var ChooseFemaleVoice = function(){
      var result = undefined;
      speechSynthesis.getVoices().forEach(function(voice, index) {
        if(voice.name.indexOf("emale") >  -1){
          result = window.speechSynthesis.getVoices()[index];
        }
      });
      if(!result){
        console.log("I couldn't find a female voice for the bot");
        return window.speechSynthesis.getVoices()[0];
      }
      else{
        console.log("I found a female voice for the bot");
        return result;
      }
    }
    var SetupSpeechSynthesis = function(){
      if(window.speechSynthesis){
        window.speechSynthesis.onvoiceschanged = function() {
          console.log("ON VOICES CHANGED");
          document.socket.emit('speech synthesis', true);
          UpdateVoiceDropdown();
        }
      }
    }

    var UpdateVoiceDropdown = function(){
      
      if(VoicesExistInDropdown()){
        console.log("voices exist");
        var current_selected = $("#voicelist").val();
        var $voicelist = BuildVoiceDropdown();
        $voicelist.val(current_selected);
      }
      else{
        console.log("voices don't exist");
        var $voicelist = BuildVoiceDropdown();
      }
      $("#voicelist").replaceWith($voicelist);
    }

    var BuildVoiceDropdown = function(){
      var $voicelist = $('<select id = "voicelist"></select>');
      speechSynthesis.getVoices().forEach(function(voice, index) {
        var $option = $('<option>')
        .val(index)
        .html(voice.name + (voice.default ? ' (default)' :''));
        $voicelist.append($option);
      });
      return $voicelist;
    }

    var VoicesExistInDropdown = function(){
      return $("#voicelist").children().length > 0
    }

    var CanSpeakLocal = function(){
      return (window.speechSynthesis != undefined);
    } 

    var GenerateLocalAudioPlayer = function(chat_message){
      var $btn = $('<a href="#" class="btn btn-default"></a>');
      var $icon = $('<span class="glyphicon glyphicon-volume-up" aria-hidden="true"></span>');
      var $div = $('<div> </div>');
      $btn.text("Play ").click(function(){
        SpeakLocal(chat_message);
      });
      $btn.append($icon);
      $div.append($btn);
      return $div;
    }

    var GenerateAudioPlayer = function(src){
      var $html = $("<audio controls><source id = 'audio_source' src='"+src+"'</audio>");
      return $html;
    }

    var GenerateAutoplayAudioPlayer = function(src){
      var $audio = GenerateAudioPlayer(src);
      $audio.attr("autoplay","true");
      return $audio;
    }

    this.LocalSpeakMessage = function(chat_message){
      if(!IsRecap(chat_message)){
        if(CanSpeakLocal()){
          SpeakLocal(chat_message);
        }
      }
      var $msg = GenerateMsgHTML();
      $msg.append(GenerateLocalAudioPlayer(chat_message));
      return $msg;
    }

    this.SpeakMessage = function(chat_message){
      var $msg = GenerateMsgHTML();
      var url = chat_message["url"];
      if(IsRecap(chat_message)){
        $msg.append(GenerateAudioPlayer(url));
      }
      else{
        $msg.append(GenerateAutoplayAudioPlayer(url));
      }
      return $msg;
    }

/* DONT BELONG HERE */
    var IsRecap = function(chat_message){
      return chat_message["recap"] == true;
    }

    var GenerateMsgHTML = function(){
      var msg = $("<div name='msg'></div>");
      return msg;
    }
/* DONT BELONG HERE */

    $(document).ready(function(){
      SetupSpeechSynthesis();
    });
    // this.LocalSpeakMessage = LocalSpeakMessage;
    // this.SpeakMessage = SpeakMessage;
  }

  return synthesis;

});
