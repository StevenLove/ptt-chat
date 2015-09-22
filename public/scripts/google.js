  /* Local Google Images */
define([], function(){

  var googler = function(){
    var LoadAPI = function(){
      google.load('search', '1', {
        callback: function(){
          console.log(google.search.Search);
          // google.setOnLoadCallback(function(){
          google.search.Search.getBranding('google_branding');
          // });
          PerformSearchesInQueue();
        }
      });
    }
    LoadAPI();
    // No clue why, but if I try to call this in $(document).ready the whole page is blank.
    // SetupGoogleSearch();
    // So leave it here for now!

    var search_queue = [];

    var GoogleSearch = function(string, callback){
      if(IsLoaded()){
        GoogleSearchNow(string,callback);
      }
      else{
        QueueUpGoogleSearch(string,callback);
      }
    }

    var IsLoaded = function(){
      return google.search.ImageSearch != undefined;
    }

    var QueueUpGoogleSearch = function(string, callback){
     search_queue.push({
        "string": string, 
        "callback": callback
      });
    }

    var PerformSearchesInQueue = function(){
      search_queue.forEach(
        function(search, index){
          GoogleSearchNow(search["string"],search["callback"]);
        }
      );
    }

    var GoogleSearchNow = function(string, callback){
      var my_search = new google.search.ImageSearch();
      my_search.setSearchCompleteCallback(
        this, 
        function(){
          callback(null,my_search.results);
        }
      );
      my_search.setResultSetSize(8);
      my_search.execute(string);
    }

    this.GoogleSearch = GoogleSearch;

  };
  return googler;
});