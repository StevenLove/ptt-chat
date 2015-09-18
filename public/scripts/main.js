 console.log("")

 requirejs(['scripts/facebook.js', 'scripts/synthesis.js'],function(fb_ref, synthesis_ref){

   var synthesis = new synthesis_ref();


   function SetupFacebook(){
    LoadFacebookSDK();
    // For now, control use of the dev version or public version
    // by commenting out one of the two lines below
    //*********************************************
    SetFacebookInitCallback();
    // SetFacebookInitCallbackDev();
    // *********************************************
  }

  // Here we run a very simple test of the Graph API after login is
  // successful.  See statusChangeCallback() for when this call is made.
  function FacebookLoggedInCallback() {
    FB.api('/me', function(response) {
      // document.getElementById('status').innerHTML =
        // 'Thanks for logging in, ' + response.name + '!';
      document.facebook.response = response;
      document.facebook.name = response.name;
      document.facebook.id = response.id;
      document.facebook.logged_in = true;
      document.socket.emit("facebook login", response);
    });
  }

  var FacebookLoggedOutCallback = function(){
    document.facebook.logged_in = false;
    document.facebook.name = "";
    document.socket.emit("facebook logout", facebook.id);
    document.facebook.id = "";
  }

  $(document).ready(function(){
    SetupFacebook();
  })

// });
 // requirejs(['scripts/synthesis.js'],function(synthesis){

   console.log(synthesis);

      function SetupSockets(){
        document.socket = io();
        // console.log(JSON.stringify(socket));
        document.socket.on('chat message', function(chat_message){
          ChatMessageContainer(chat_message);
        });
        document.socket.on('random name', function(rn){
          document.random_name = rn;
        });
        document.socket.on('ip', function(ip){
          document.ip_address = ip;
        });
        document.socket.on('chatbot message', function(chatbot_message){
          console.log(chatbot_message);
          var msg = ParseChatbotMessage(chatbot_message);
          ChatMessageContainer(msg);
        });
        // document.socket.on('connection message', function(con_msg){
        //   $("#user_dropdown").append("<option value = " + con_msg.user_id + ">" + con_msg.user_name + "</option>");
        // });
        // document.socket.on('disconnection message', function(dis_msg){
        //   $("#user_dropdown").children("option[value='" + dis_msg.user_id + "']").remove();
        // });
        document.socket.on('update users', function(user_list){
          ClearUserDropdown();
          PopulateUserDropdown(user_list);
        });

        SocketInit();
      }


      function SocketInit(){
        document.socket.emit('init');
      }

      // function NotifyServerAboutSpeechSynthesis = function(){
      //   if( CanSpeakLocal() ){
      //     document.socket.emit("canspeaklocal")
      //   }
      // }


      function PopulateTransformDropdown(){
        var options = ["None", "Images", "Synonymize", "Antonymize", "SmartSynonymize" , "Paraphrase", "Spanish", "Scots", "German", "Speak", "PugImages", "LocalSpeak", "AutoSpeak"];
        options.forEach(function(option){
          $("#transform_dropdown").append("<option value = " + option +">" + option + "</option>");
        });
        $("#transform_dropdown").change(function(){
          document.transforms = [$("#transform_dropdown option:selected").val()];
        });
      }

      function EnableTransformButton(){
        $("#transform_button").click(function(){
          var transform = $("#transform_dropdown").val();
          document.transforms = [transform];
        });
      }

      function SetupTransforms(){
        document.transforms = [];
        EnableTransformButton();
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
        var xml_string = chat_message.original_text;
        var xml_doc = $.parseXML(xml_string);
        $xml = $(xml_doc);
        $bot_response = $xml.find("that");
        var bot_response = $bot_response.text();
        console.log(bot_response);
        chat_message.original_text = bot_response;
        return chat_message;
      }


      /* Initialization */

      $(document).ready(function(){
        // SetupFacebook();
        // SetupGoogleSearch();
        SetupSockets();
        EnableScrollDownOnResize();
        EnableSendButton();
        SetupTransforms();
        EnableTooltips();
        // SetupSpeechSynthesis();

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
        this.author_facebook_id = GetFacebookID();
        this.author_name = GetMyName();
        this.timestamp = new Date().getTime();
        this.target = (directed_at_bot)? "Everyone" : "Humans";
        this.original_text = message;
        this.is_images = false;
        //transformed_text
        //image_url_lists
        this.transform_list = document.transforms;
        this.one_word_at_a_time = true;
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
        if(document.facebook.logged_in){
          return document.facebook.name;
        }
        else{
          return "Anonymous " + document.random_name;
        }
      }

      function GetFacebookID(){
        if(document.facebook.logged_in){
          return document.facebook.id;
        }
        else{
          return undefined;
        }
      }
      function GetMyID(){
       if(document.facebook.logged_in){
          return document.facebook.id;
        }
        else{
          return document.ip_address;
        }
      }

      function RandomWord(){
        var requestStr = "http://randomword.setgetgo.com/get.php";
        $.ajax({
            type: "GET",
            url: requestStr,
            dataType: "jsonp",
            jsonpCallback: 'RandomWordComplete'
        });
      }
      function RandomWordComplete(data){
        document.random_word = data.Word;
      }
      RandomWord();

      function ISaid(chat_message){
        var my_id = GetMyID();
        var msg_id = chat_message.author_id;
        return (my_id == msg_id);
      }

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
      function AreCloseEnough(cm1, cm2){
        // times are in ms
        var time1 = cm1.timestamp;
        var time2 = cm2.timestamp;
        return AreWithin(time1,time2,1000);
      }
      function AreWithin(a,b,range){
        var diff = Math.abs(b-a);
        return diff <= range;
      }

      function SameAuthor(cm1,cm2){
        if(!cm1 || !cm2){
          return false;
        }
        var author1 = cm1.author_id;
        var author2 = cm2.author_id;
        return (author1 == author2);
      }

  /* Building Chat Line HTML/CSS */

  function ChatMessageContainer(chat_message){
    // var cur_author = chat_message.author_id;
    var prev_container = $("#messages").children().last();
    // var prev_author = prev_container.attr("name");
    var container;

    if(IsSameSentence(document.prev_chat_message,chat_message)){
      container = prev_container;
    }
    else{
      container = GenerateNewMessageLine(chat_message);//chat_message);
      $("#messages").append(container);
      // container.children().eq(0).append(Label(chat_message));
      // container.append(Label(chat_message));
    }
    document.prev_chat_message = chat_message;
    container.children().eq(1).append(Msg(chat_message));
    ScrollDown();
  }

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
    // var label = $("<a href='#' data-toggle='tooltip' title='Hooray!'>");
    // var label_text = LabelText(chat_message);
    var label_pic = LabelPicture(chat_message);
    // label.append(label_pic);
    // var label = GenerateLabelHTML();
    // var text = $("<p>").text(label_text);
    // var time = $("<p>").text(new Date(chat_message.timestamp).toLocaleString());
    // label.append(label_pic);

    // label.append(text);
    // label.append(time);
    // return label;
    return label_pic;
  }
  function LabelText(chat_message){
    var time = "(" + new Date(chat_message.timestamp).toLocaleTimeString() + ")";
    var author = chat_message.author_name;
    var label_text = author + " " + time;
    return label_text;
  }
  function LabelPicture(chat_message){
    var url;
    if(chat_message.author_facebook_id){
      url = FacebookProfilePicture(chat_message.author_facebook_id);
    }
    else{
      url = RobohashURL(chat_message.author_id);
    }
    var pic = $("<img class='label-img'></img>").attr("src", url).width(50);
    return pic;
  }

  var RobohashURL = function(ip){
    // console.log("robohash ip: " + ip);
    var base = "https://robohash.org/"
    // var last_digit = parseInt(ip.slice(-1));
    // var next_to_last_digit = parseInt(ip.slice(-2,-1));
    // var set = (last_digit < 4)? 1 : 
    //           (last_digit < 8)? 2 : 
    //           3;
    // var bgset = (next_to_last_digit < 5)? 1 : 2;
    // return base + ip +"?set=set"+set+"&bgset=bg"+bgset;
    return base+ip+"?set=any&bgset=any";
  }



  /* Messages */

  var Msg = function(chat_message){
    if(IsLocalSpeakMessage(chat_message)){
      return synthesis.LocalSpeakMessage(chat_message);
    }
    if(IsSpeakMessage(chat_message)){
      return synthesis.SpeakMessage(chat_message);
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
  // var IsPugImageMessage = function(chat_message){
  //   return chat_message.transformation_list =]
  // }
  var IsLocalSpeakMessage = function(chat_message){
    return chat_message["type"] === "LocalSpeak";
  }

  var IsSpeakMessage = function(chat_message){
    return chat_message["type"] === "Speak";
  }

  var IsLocalImageMessage = function(chat_message){
    return chat_message["type"] === "LocalGoogleImages";
    // return chat_message.is_images && !chat_message.image_url_lists;
  }
  var IsServerImageMessage = function(chat_message){
    return chat_message["type"] === "ServerImages";
    // return chat_message.is_images && chat_message.image_url_lists;
  }
  var IsTextMessage = function(chat_message){
    return chat_message["type"] === "Text";
  }

  var TextMsg = function(chat_message){
    var msg = GenerateMsgHTML();
    msg.text(chat_message.transformed_text);
    return msg;
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

      GoogleSearch(
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

  var PuggifySentence = function(text){
    var words = text.split(" ");
    var result = words.map(function(word){
      return "pug."+word;
    }).join(" ");
    return result;
  }

  /* Displaying Images */

  var CombineImages = function(url_list){
    var container = $("<div>");
    url_list.forEach(
      function(url){
        var img = ResultImage(url);
        container.append(img);
        container.css('display','inline-block');
      }
    );
    CycleThroughImages(container);
    return container;
  }

  function ResultImage(url){
    var img = $("<img>");
    img.on("load", function(){
      ScrollDown();
      img.parent().show();
    });
    
    // img.css('display','inline-block');
    // img.hide();
    img.css('width',150);
    img.css('height',150);
    img.attr('src', url);
    
    return img;
  }

  function CycleThroughImages(container){
    ShowNextImage(container,0);
  }
      
  function ShowNextImage(container,index){
    index = parseInt(index);
    var max = container.children().length;
    // console.log("max: " + max);
    index = (index >= max)? 0 : index;
    ShowOneImage(container,index);
    setTimeout(function(){
      ShowNextImage(container,index+1);
    },3000);
  }
  function ShowOneImage(container,index){
    container.children().hide();
    var index_from_1 = parseInt(index) + 1;
    container.children('img:nth-child('+index_from_1+')').show();
  }
  function ShowAllImages(container){
    container.children().show();
  }

  /* Local Google Images */

  function SetupGoogleSearch(){
    google.load('search', '1', {
      callback: function(){
        console.log(google.search.Search);
        google.setOnLoadCallback(function(){
          google.search.Search.getBranding('branding');
        });
      }
    });
  }
  SetupGoogleSearch();
  // No clue why, but if I try to call this in $(document).ready the whole page is blank.
  // SetupGoogleSearch();
  // So leave it here for now!

  var GoogleSearch = function(string, callback){
     // Create an Image Search instance.
    var my_search = new google.search.ImageSearch();
    // Set searchComplete as the callback function when a search is 
    // complete.  The imageSearch object will have results in it.
    my_search.setSearchCompleteCallback(
      this, 
      function(){
        callback(null,my_search.results);
      }
    );
    my_search.setResultSetSize(8);
    my_search.execute(string);
  }

});