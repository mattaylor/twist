
'Twist.js' is a node application that implements a multi-user 2 way phone gateway to twitter

Twist was inspired by the issues faced recently by Egypt when internet access to the enture country goes 'offline'

Twist creates a number of user agents, each of which will watch twitter for tweets containing one or more keywords and then call a designated number and play out the message. 
The user will also be prompted to record a reply to this message which will be transcribed to text and post as a direct message to the origaal poster.
This tweet will be accompanied by a link to the recorded message.

## Install  

Install node (2.6) http://nodejs.org

    $ cd node
    $ ./configure
    $ make install 

Install npm 

    $ curl http://npmjs.org/install.sh | sudo sh

Install express and outh packages for node..

    $ npm install express
    $ npm install OAuth

Get the code..

    $ git clone git@github.com:mattaylor/node-twilio.git
    $ git clone git@github.com:mattaylor/twist.git

## Global Config 

To configure twist you will need to copy the sample config to 'config.json' and update it with values appropriate to your application.

    $ cd twist
    $ cp config-sample.json config.json

The following properites determine the voice to text prompts that are used when an inbound or outbound  call is initiated.

* 'record'
* 'welcome'
* 'goodbye'

To use Twist you need a valid Twilio account with an application and inbound number. These can be obtained by working throught the registration process as .

* accountSID
* accessToken
* Inbound Number

You must also create a Twilio App

* Twitter App ID
* Master Twitter Account and Password

## Twist Agents

For each user you would like to track you will also need:

* Twitter user name 
* Access token and secret to post to this account.
* Phone number for this user agent.
* Keywords to be tracked for this agent

Tane Piper has wrtten a usefull script for obtaining Twitter access tokens and secrets using Twitters OOB Oauth flow. Details can be found on his blog (http://blog.tanepiper.com/a-little-nodejs-twitter-oauth-script) and the the gist is availbale on https://gist.github.com/575303

Note: Only Tweets which contain mentions of this user AND the keywords listed will be tracked

To Track global keywords the 'agent.track' property should be prefixed by a ',' eg.. 

    agent.track:',Egypt'  // will track all tweets mentioning the agents name OR 'Egypt'
    agent.track: 'Egypt'   // will track all tweets menitioned the agents twitter name AND 'Egypt'

## Usage

Create a new file 'app.js' with the following..

    var agents = require('./twist').create();
    agents.forEach(function(agent) { 
        agent.scan();
    });

Then let node do it's thing..
    
    $ node app.js

## API

    init()                // Return an array of agents initialised from the config file
    Agent.scan(keywords)    // Watch Twitter streams for menitons which include 'keywords'
    Agent.call(tweet)       // Make call which plays back 'tweet'
    Agent.post(tweet)       // send a Message to Twitter
    Agent.stop()            // Stop the agent

## TODO

1. Add HTTP server for on demand Oauth Access token provisioning
2. Add Paypal Micropayments support for provisoning.
3. Save config and agents to mongo / persevere

Web app should use perstore model for 

