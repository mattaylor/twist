/*!
 * twist/app.js is An implmentation of a multi user 2 way twitter phone gateway
 *
 * Copyright(c) 2011 Mat Taylor.
 * MIT Licensed
 *
 * @author mattaylor
 */

/* Module dependencies */
var Twilio = require('twilio').Client,
    Twiml = require('../node-twilio').Twiml,
    OAuth = require('oauth').OAuth,
    http = require('http'),
    files = require('fs'),
    sys = require('sys');

/* Globals */    
var conf = JSON.parse(files.readFileSync(__dirname + '/config.json')),
    twil = new Twilio(conf.twilio.accSID, conf.twilio.token, conf.hostUrl),
    phone = twil.getPhoneNumber(conf.twilio.inTel),
    twit = new OAuth(conf.twitter.reqUrl, conf.twitter.accUrl, 
        conf.twitter.conKey, conf.twitter.conSec, "1.0A", conf.twitter.callBack, "HMAC-SHA1");    
    debug = true,
    agents = [],
    filter = new Filter({ host:'stream.twitter.com', path:'/1/statuses/filter.json',
        head: { 'Connection': 'Keep-Alive' },user: conf.twitter.username , pass: conf.twitter.password
    });

exports.twit = twit;
exports.Agent = Agent;

/* Initiatise Agents */
exports.init = function() {
    conf.agents.forEach(function(creds) { 
        agents.push(new Agent(creds));
    });
    return agents
}

function Agent(props) { 
    var my = this;
    ['accTok', 'accSec', 'telNo', 'name', 'twitId', 'credit'].forEach(function(key) {
        if (props[key]) my[key] = props[key];
        else throw new Error('Missing Required Property : '+ key);
    });
    my.track = my.twitId;
    if (props.track) my.track += ' '+ props.track;
    
    this.scan = function(track) {
        if (track) my.track +=' '+ track;
        bug(my.track, 'watching '+my.telNo);
        filter.start(my.track, my.call);
    }
    
    this.call = function(tweet) {
        if (my.credit < 1) throw new Error('No Credit '+my.telNo);
        bug(tweet.text, 'calling '+my.telNo);
        call(my.telNo, my.name, tweet, my.post);
        my.credit -= 1;
    }
    
    this.post = function(status) {
        bug(status, 'post status');
        if ((typeof status == 'object') && (status.user.screen_name != my.twitId)) my.post(status.text);
        else twit.post('http://api.twitter.com/1/statuses/update.json', my.accTok, my.accSec, {'status':status});          
    }

    this.stop = function() { 
        bug(my.telNo, 'pause watching');
        filter.stop(my.track);
    }
    
    this.save = function() { 
    }
}

// initalise the twilio call Handler. If tweet is defined then an call will be made.
function call(telNo, name, tweet, callBack) { 
    phone.setup(function() {
        var record = new Twiml.Record({transcribe:true, timeout:10, maxLength:120, finishOnKey:'1234567890*#'}); 
        
        var greet = function(reqParams, res) {
            res.append(new Twiml.Say('Hey '+ name +' '+conf.prompts.welcome));
            if (tweet) { 
                res.append(new Twiml.Say('You have a new message on Twitter from '+tweet.user.name));
                res.append(new Twiml.Pause(2));
                res.append(new Twiml.Say(clean(tweet.text)));
                res.append(new Twiml.Say('If you would like to reply then '));
            }
            res.append(new Twiml.Say(conf.prompts.record));
            res.append(record);
            res.send();
        }
        
        record.on('recorded', function(reqParams, res) {
            res.append(new Twiml.Say(conf.prompts.goodbye));
            res.append(new Twiml.Hangup());
            res.send();
        });
        
        record.on('transcribed', function(reqParams, res) { 
            var msgTxt = reqParams.TranscriptionText;
            if (tweet) msgTxt = '@'+tweet.user.screen_name +' '+ msgTxt;
            short(reqParams.RecordingUrl, function(uri) { 
                callBack(msgTxt +' '+ uri);
            });
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

// URL shortening service invocation using Google. CallBack should handle the shorted URL
function short(url, callBack) { 
    getJSON({ host: 'www.googleapis.com', path: '/urlshortener/v1/url?key='+conf.googKey
        , port: 443, head: {'Content-Type':'application/json'}, post: '{"longUrl":"'+url+'"}'
        }, function(res) { callBack(res.id) }
    );
}

function Filter(opts) { 
    var my = this;
    my.tracks = {};
    
    this.start = function(track, callBack) { 
        if (track) my.tracks[track] = callBack;
        if (my.request) my.request.close;
        opts.post = 'track='+Object.keys(my.tracks);
        bug(opts.post, 'tracking');
        my.request = getJSON(opts, my.route);
    }
    
    this.stop = function(track) {
        delete my.tracks[track];
        this.start();
    }
    
    this.route = function(tweet) {
        for (track in my.tracks) {
            try { 
                if (tweet.text.match(new RegExp(track.replace(/\s+/, '\.\*')))) my.tracks[track](tweet);
            } catch(e) {
                bug(e, 'Unable to Route '+ tweet.text);
            }
        }
    }
    
    this.close = function() { 
        if (my.request) my.request.close();
    }
}

//callsBacks json objects
function getJSON(req, callBack) { 
    ['host', 'path'].forEach(function(key) {
        if (!req[key]) throw new Error('Missing Required Property : '+ key);
    });
    var client, request;
    if (req.port) client = http.createClient(req.port, req.host, req.port=443);
    else client = http.createClient(80, req.host);
    if (!req.head) req.head ={};
    if (req.user) req.head['Authorization'] = 'Basic ' + new Buffer(req.user + ':' + req.pass).toString('base64');
    req.head['Host'] = req.host;
    
    if (req.post) { 
        if (!req.head['Content-Type']) req.head['Content-Type']  = 'application/x-www-form-urlencoded';
        request= client.request('POST', req.path, req.head);
        request.write(req.post, encoding='utf8');
    } else request= client.request('GET', req.path, req.head);
    request.end();
    
    if (callBack) request.on('response', function (response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) { 
            try {
                if(String(chunk).trim()) callBack(JSON.parse(chunk)); 
            } catch(e) {
                bug(chunk, 'json error');
            }
        });
    });
    return request;
}

function bug(data, label) {
    if (!label) label=' ';
    if (debug) try {
        sys.debug(label +': '+sys.inspect(data));
    } catch(e) {
        bug(e);
    }
}
