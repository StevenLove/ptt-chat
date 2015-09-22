 console.log("")

 // require.config({
 //   shim: {
 //     'facebook' : {
 //       exports: 'FB'
 //     }
 //   },
 //   paths: {
 //     'facebook': '//connect.facebook.net/en_US/sdk'
 //   }
 // })
 // require(['fb']);


 requirejs(
   [
   'scripts/fb.js',
   'scripts/synthesis.js',
   'scripts/image_formatter.js',
   'scripts/message_formatter.js'
   ],
   function(
     fb_ref,
     synthesis_ref,
     image_formatter_ref,
     message_formatter_ref
   ){
     var synthesis = new synthesis_ref();
     var image_formatter = new image_formatter_ref();
     var message_formatter = new message_formatter_ref();
     var facebook = new fb_ref();

     window.checkLoginState = facebook.checkLoginState;


    var SetupSockets = function(){
      document.socket = io();
      document.socket.on('chat message', ReceiveChatMessage);
      document.socket.on('random name', SetRandomName);
      document.socket.on('ip', SetIP);
      document.socket.on('chatbot message', ReceiveChatbotChatMessage);
      document.socket.on('update users', UpdateUsers);
      SocketInit();
    }

    var ReceiveChatMessage = function(chat_message){
      message_formatter.ChatMessageContainer(chat_message);
    }
    var ReceiveChatbotChatMessage = function(chat_message){
      console.log(chatbot_message);
      var msg = ParseChatbotMessage(chatbot_message);
      message_formatter.ChatMessageContainer(msg);
    }
    var SetRandomName = function(rn){
      document.random_name = rn;
    }
    var SetIP = function(ip){
      document.ip_address = ip;
    }
    var UpdateUsers = function(user_list){
      ClearUserDropdown();
      PopulateUserDropdown(user_list);
    }
    var SocketInit = function(){
      document.socket.emit('init');
    } 


    window.num_transforms = 1;
    window.num_transforms_max = 2;

    var EnableAddTransformButton = function(){
      $("#add_transform_button").click(function(){
        console.log("CLICK!");
        if(window.num_transforms < window.num_transforms_max){
          window.num_transforms++;
          var $dropdown = GetTransformDropdown(window.num_transforms-1);
          $dropdown.show();
        }
      });
    }
    var EnableToggleCreditsButton = function(){
      $("#toggle_credits_button").click(function(){
        console.log("CLICK!");
        $("#credits_list").toggle();
      });
    }

    var GetTransformDropdown = function(index){
      return $("#transform_dropdown_"+index);
    }

    var PopulateTransformDropdown = function(){
      CreateTransformDropdowns();
    }

    var CreateTransformDropdowns = function(){
      var options = ["None", "Images", "Synonymize", "Antonymize", "SmartSynonymize" , "Paraphrase", "Spanish", "Scots", "German", "Speak", "PugImages", "LocalSpeak", "AutoSpeak"];

      var $select0 = CreateTransformDropdown(0,options);
      var $select1 = CreateTransformDropdown(1,options);
      $select1.hide();

      $("#transform_dropdown_0").replaceWith($select0);
      $("#transform_dropdown_1").replaceWith($select1);
    }

    var CreateTransformDropdown = function(index, list){
      var $select = $("<select id ='transform_dropdown_"+index+"' class='form-control'></select>");
      list.forEach(
        function(option){
          $select.append("<option value='" + option +"'>"+option + "</option>");
        }
      );
      $select.change(function(){
        var selected = $("#transform_dropdown_"+index + " option:selected").val();
        document.transforms[index] = selected;
      });
      return $select;
    }


    var SetupTransforms = function(){
      document.transforms = ["None"];
      PopulateTransformDropdown();
    }

    const EVERYONE_ID = 1;
    const EVERYONE_AND_LAUREN_ID = 2;
    // const JUST_LAUREN_ID = 3;
    function PopulateUserDropdown(user_list){
      AddUserToDropdown(EVERYONE_ID,"Everyone");
      AddUserToDropdown(EVERYONE_AND_LAUREN_ID, "Everyone + Chatbot Lauren");
      // AddUserToDropdown(JUST_LAUREN_ID, "Chatbot Lauren");
      for(var index in user_list){
        var user = user_list[index];
        var name = user.name
        if(user.socket_id == document.socket.id){
          name = name + " (You)";
        }
        AddDisabledUserToDropdown(user.socket_id, name);
      }
    }

    function ClearUserDropdown(){
      $("#user_dropdown").empty();
    }
    function AddUserToDropdown(id,name){
      $("#user_dropdown").append("<option value = " + id + ">" + name + "</option>");
    }
    function AddDisabledUserToDropdown(id,name){
      $("#user_dropdown").append("<option class='disabled' value = " + id + " disabled >" + name + "</option>");
    }

    function ParseChatbotMessage(chat_message){
      var xml_string = chat_message.text;
      var xml_doc = $.parseXML(xml_string);
      $xml = $(xml_doc);
      $bot_response = $xml.find("that");
      var bot_response = $bot_response.text();
      console.log(bot_response);
      chat_message.text = bot_response;
      return chat_message;
    }


    /* Initialization */

    $(document).ready(function(){
      SetupSockets();
      EnableScrollDownOnResize();
      EnableSendButton();
      SetupTransforms();
      EnableTooltips();
      EnableAddTransformButton();
      EnableToggleCreditsButton();
    });

    function EnableTooltips(){
      $('[data-toggle="tooltip"]').tooltip(); 
    }

    function EnableSendButton(){
      $("#send_button").click(function(){
        HitSend();
      });
      EnableEnterToSend();
    }

    function HitSend(){
      var input = GetInput();
      if(input && input.length > 0){
        ClearInput();
        console.log("sending " + input);
        console.log(document.transforms);
        document.socket.emit('chat message', new ChatMessage(input));
      }
      return false;
    }
    function GetInput(){
      var input = $('#m').val();
      return input;
    }

    function ClearInput(){
      $('#m').val('');
    }

    function EnableEnterToSend(){
      $("#m").keydown(function(event){
        if(event.keyCode == 13) {
          event.preventDefault();
          HitSend();
          return false;
        }
      });
    }

    function ChatMessage(message){
      var directed_at_bot = $("#user_dropdown").val() == EVERYONE_AND_LAUREN_ID;

      this.author_id = GetMyID();
      this.author_facebook_id = facebook.GetFacebookID();
      this.author_name = GetMyName();
      this.timestamp = new Date().getTime();
      this.target = (directed_at_bot)? "Everyone" : "Humans";
      this.original_text = this.text = message;
      this.transform_list = document.transforms;
      this.tts_voice = synthesis.GetChosenVoiceURI();
    }

    

    function ScrollDown(){
      var div = $("#messages");
      var height = div.prop("scrollHeight");
      div.scrollTop(height);
    }

    function EnableScrollDownOnResize(){
      $(window).resize(function(){
        ScrollDown();
      })
    }

    function GetMyName(){
      if(facebook.logged_in){
        return facebook.name;
      }
      else{
        return "Anonymous " + document.random_name;
      }
    }


    function GetMyID(){
     if(facebook.logged_in){
        return facebook.id;
      }
      else{
        return document.ip_address;
      }
    }

  
});