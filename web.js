var express = require('express');
var app = express();
var Twit = require("twit");
var Q = require('q');
var request = require("request");
var EMBEDLY_KEY = '8c394ac3008745d48fe82133e6acc577';
app.use(express.logger());

//makes embedly request, send accepted URLs
var summarize = function(url) {
  var deferred = Q.defer();
  request("https://api.embed.ly/1/extract", {
     qs: {url: url, key: EMBEDLY_KEY}
   }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      deferred.resolve(JSON.parse(body));
    } else {
      deferred.reject(error);
    }
   });
  return deferred.promise;
};

app.get('/lookup', function(request, response) {
  var T = new Twit({
      consumer_key:         'i7lsLu4dOv66EEDzCWEifyoXd',
      consumer_secret:      '3I7NQsQsjQpCsadhN8t1Ry9Xb3oglUsDTzME6Cc0EGLvrVmZQB',
      access_token:         '1067293915-gXahWnpOxPZydxkzAO4YzWNfhaSkZp8Nz6KfW4L',
      access_token_secret:  '1e8Y0rCaLlz9SkdlIqBuMsBbEJvDY1SUb9ZClh6WNkmim',
  });
   
  var tweets = [];
  var urls = [];
  var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/

  T.get('statuses/user_timeline', { 'screen_name' : request.query.username, 'count': 20 }, function(err, reply) {
    for (i in reply){
      tweet = reply[i].text;
   
      if (urlPattern.test(tweet)){
        tweets.push(tweet);
        var urlRegex = /(https?:\/\/[^\s]+)/g;
        tweet.replace(urlRegex, function(tweet) {
          console.log("heres a URL",tweet)
          urls.push(tweet);
        })
      }
    }
    
    var summaryPromises = urls.map(function(url) {
      return summarize(url);
    });

    Q.allSettled(summaryPromises).then(function(results) {
      var acceptedSummaries = results.filter(function(result) {
        return result.state == 'fulfilled';
      }).map(function(result) {
        return result.value;
      }).filter(function(summary) {
        //omits URLs from picture sites
        var filtered = !(/twitpic|imgur|instagra|status/.test(summary.url));
        var blank = !(summary.description == null);
        return ( ! filtered && ! blank);
      }).map(function(summary) {
        return {
          url: summary.url,
          title: summary.title,
          image: summary.images[0].url,
          description: summary.description
        }
      });
      console.log('summary Results', acceptedSummaries);
      if (request.query.callback){
        var json = JSON.stringify(acceptedSummaries);
        response.send(request.query.callback+'('+json+')');
      } else {
        response.send(acceptedSummaries);
      } 
    });
  });
  
  
});

app.get('/', function(request, response) {
  response.send('Hello World!');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

