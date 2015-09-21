// define(['facebook'],function(){
  define([],function(){

  var facebooker = function(){
    var self = this;
    self.logged_in = false;

    function LoadFacebookSDK(){
    // Load the SDK asynchronously
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "//connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    }

    var SetCallback = function(app_id){
      window.fbAsyncInit = function() {
        FB.init({
          "appId"      : app_id,
          "cookie"     : true,  // enable cookies to allow the server to access the session
          "xfbml"      : true,  // parse social plugins on this page
          "version"    : 'v2.2' // use version 2.2
        });
        checkLoginState();
      };
    }

    function SetFacebookInitCallback(){
      SetCallback('1457862287849906');
    }
    function SetFacebookInitCallbackDev(){
      SetCallback('1457940754508726');
    }





    // This is called with the results from from FB.getLoginStatus().
    function statusChangeCallback(response) {
      // The response object is returned with a status field that lets the
      // app know the current login status of the person.
      // Full docs on the response object can be found in the documentation
      // for FB.getLoginStatus().
      if (response.status === 'connected') {
        document.getElementById('facebook_status').innerHTML = "You are logged in to Facebook.";

        // Logged into your app and Facebook.
        FacebookLoggedInCallback();
      } else if (response.status === 'not_authorized') {
        // The person is logged into Facebook, but not your app.
        document.getElementById('facebook_status').innerHTML = 'Please log ' +
          'into this app.';
      } else {
        // The person is not logged into Facebook, so we're not sure if
        // they are logged into this app or not.
        document.getElementById('facebook_status').innerHTML = 'Log into Facebook.';
        FacebookLoggedOutCallback();
      }
    }

    function FacebookProfilePicture(user_id){
     return "http://graph.facebook.com/" + user_id + "/picture?type=normal"
    }

    function SetupFacebook(){
      LoadFacebookSDK();
      // For now, control use of the dev version or public version
      // by commenting out one of the two lines below
      //*********************************************
      // SetFacebookInitCallback();
      SetFacebookInitCallbackDev();
      // *********************************************
    }

    // Here we run a very simple test of the Graph API after login is
    // successful.  See statusChangeCallback() for when this call is made.
    function FacebookLoggedInCallback() {
      FB.api('/me', function(response) {
        self.response = response;
        self.name = response.name;
        self.id = response.id;
        self.logged_in = true;
        document.socket.emit("facebook login", response);
      });
    }


    var FacebookLoggedOutCallback = function(){
      self.logged_in = false;
      self.name = "";
      document.socket.emit("facebook logout", self.id);
      self.id = "";
    }


    
    function GetFacebookID(){
      if(self.logged_in){
        return self.id;
      }
      else{
        return undefined;
      }
    }

        // This function is called when someone finishes with the Login
    // Button.  See the onlogin handler attached to it in the sample
    // code below.
    var checkLoginState = function() {
      FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
      });
    }

    var AddButton = function(){
      var $btn = $('<fb:login-button scope="public_profile,email" size="large" data-auto-logout-link="true"></fb:login-button>');

      $btn.attr("onlogin","checkLoginState");
      window.facebook={};
      window.facebook.checkLoginState = checkLoginState;
      $("#facebook_button").replaceWith($btn);
    };

    $(document).ready(function(){
      SetupFacebook();
      AddButton();
    })


    // <fb:login-button scope="public_profile,email" size="large" onlogin="checkLoginState();" data-auto-logout-link="true">
    //                 </fb:login-button>

    self.GetFacebookID = GetFacebookID;
    self.FacebookProfilePicture = FacebookProfilePicture;
    self.checkLoginState = checkLoginState;

  }
  return facebooker;
});
