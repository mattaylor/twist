var Twilio = require('twilio').Client,
    Twiml = require('/home/mat/node-twilio').Twiml,
    Twitter = require('/home/mat/evented-twitter/lib/evented-twitter'),
    OAuth = require('oauth').OAuth,
    http = require('http'),
    files = require('fs'),
    sys = require('sys');

var conf = JSON.parse(files.readFileSync(__dirname + '/config.json'));
var oauth = conf.oauth;
delete conf.oauth;
oauth.auth = 'oauth';
var twil = new Twilio(conf.twilSid, conf.twilTok, conf.hostUri);
var twit = new Twitter.TwitterStream(conf);
var phone = twil.getPhoneNumber(conf.source);
var auth = new OAuth(oauth.requestTokenURL, oauth.accessTokenURL, 
    oauth.consumerKey, oauth.consumerSecret, "1.0A", null, "HMAC-SHA1");    

agent = new Agent({name:'Magic Mat', phone:conf.matTel, token:oauth.accessToken, secret:oauth.accessTokenSecret, usrId:conf.twitUsr} );

function Agent(props) { 
    
    for (key in {token:'', secret:'', phone:'', name:'', usrId:''}) {
        if (props[key]) this[key] = props[key];
        else throw new Error('Missing Required Property : '+ key);
    }
    this.stream = {};
    
    this.watch = function(track, callBack) { 
        stream = twit.filter('json', {'track':'"'+this.usrId+'"' });
        if (track) stream = twit.filter('json', {'track':this.usrId +','+ track});
        start(stream, callBack);
    }
    
    this.alert = function(tweet) {
        call(this.phone, this.name, tweet, this.post); 
    }
    
    this.post = function(status, callBack) {
        if ((typeof status == object) && (status.user.screen_name != this.usrId)) this.post(status.text, callBack);
        else auth.post("http://api.twitter.com/1/statuses/update.json", this.token, this.secret, {"status":status}, callBack);          
    }

    this.pause = function() { 
        try { this.stream.close();
        } catch(e) {};
    }
    
    //this.watch(props.track, this.alert);
    //this.watch('sublime', this.alert);
    this.alert({text:'yo gabba gabba', user:{name:'The Jolly Green Giant', screen_name:''}});
}

function start(stream, callBack) { 
    
    stream.on('ready', function() {
        stream.on('tweet', function(tweet) {
            if(!String(tweet).trim()) return;
            try {
                tweet = JSON.parse(tweet);
                sys.log(sys.inspect(tweet));
                callBack(tweet);
            } catch(e) {
                sys.debug(sys.inspect(e));
            }
            stream.close();
        });
    });
    
    stream.on('complete', function(response) {
        stream.close();
    });
    
    stream.on('error', function(err) {
        sys.debug('got here');
        sys.debug(err.message);
    });
    
    stream.start();
}

function call(telNo, name, tweet, callBack) { 
    phone.setup(function() {
        
        sys.log('Calling '+ telNo);
        sys.log(sys.inspect(tweet));
        
        var record = new Twiml.Record({transcribe:true, timeout:10, maxLength:120, finishOnKey:'1234567890*#'}); 
        
        var greet = function(reqParams, res) {
            res.append(new Twiml.Say('Hey '+ name +' you rock - welcome to the phoneGate twitter Phone gateway.'));
            if (tweet) { 
                res.append(new Twiml.Say('We have found a new message on Twitter for you from '+tweet.user.name));
                res.append(new Twiml.Pause(2));
                res.append(new Twiml.Say(clean(tweet.text)));
                res.append(new Twiml.Say('If you would like respond then '));
            }
            res.append(new Twiml.Say('Please leave a message. This will be converted to text and posted to phoneGates twitter account. We will call you back if there are any replies. Press any key to hangup'));
            res.append(record);
            res.send();
        }
        
        record.on('recorded', function(reqParams, res) {
            res.append(new Twiml.Say('Thanks Buddy - we\'ll be in touch - This service brought to you by Mat Taylor inc'));
            res.append(new Twiml.Hangup());
            res.send();
        });
        
        record.on('transcribed', function(reqParams, res) { 
            var msgTxt = reqParams.TranscriptionText;
            if (tweet) msgTxt = '@'+tweet.user.screen_name + msgTxt;
            short(reqParams.RecordingUrl, function(uri) { callBack(msgTxt +' '+ uri) });
            sys.log(sys.inspect(reqParams));
        });
        
        if (tweet) phone.makeCall(telNo, null,  function(call) {
               call.on('answered', greet);    
        });
        
        phone.on('incomingCall', greet);
    });
}

// strip hashtags, screeNames, URI's and other unmentionables from text.
function clean(text) { 
    return text.replace(/http\S+/, '').replace(/@\S+/,'').replace(/#\S+/,'');
}

// URL shortening service invocation using Google
function short(url, callBack) { 
    var client = http.createClient(443, 'www.googleapis.com', secure=true);
    var request= client.request('POST','/urlshortener/v1/url?key='+conf.googKey, { 'Host':'www.googleapis.com', 'Content-Type':'application/json'});
    request.write('{ "longUrl":"'+url+'"}', encoding='utf8');
    request.end();
    request.on('response', function (response) {
        response.setEncoding('utf8');
        response.on('data', function (body) { callBack(JSON.parse(body).id); });
    });
}

var dump = function(err, data, res) {
    try { 
        if (data) sys.puts(sys.inspect(JSON.parse(data)));
    } catch (e) {
        sys.puts(e);
    }
    if (err) sys.puts(sys.inspect(err));
    if (res) sys.puts(sys.inspect(res));
}    