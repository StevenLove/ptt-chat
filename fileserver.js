var express = require('express');
var app = express();
var http = require('http');
var querystring = require('querystring');
var request = require('request');


// app.get('/*', function(req,res){
//   res.header('Access-Control-Allow-Origin', "*");
//   res.end()

// });



app.listen(8287,function(){
  console.log('listening on *:8287');
});

app.use(express.static('lib'));