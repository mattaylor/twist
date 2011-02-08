
= Intro 

'Twist.js' is a node application that implements a multi-user 2 way phone gateway to twitter

Twist was inspired by the issues faced recently by Egypt when internet access to the enture country goes 'offline'

Twist creates a number of user agents, each of which will watch twitter for tweets containing one or more keywords and then call a designated number and play out the message. 
The user will also be prompted to record a reply to this message which will be transcribed to text and post as a direct message to the origaal poster.
This tweet will be accompanied by a link to the recorded message.

= Install  

1. install node and npm [http://node.js]

2. install express and outh packages

> npm install express
> npm install OAuth

3. npm install 'express'

5. Get the code..
> git clone git@github.com:mattaylor/node-twilio.git
> git clone git@github.com:mattaylor/twist.git

= Config 

To configure twist you will need to copy 
> cd twist
> cp config-sample.json config.json

* Your host name
* Google App Key (if you have one)

== Twilio ==

To use Twist you need a valid Twilio account with an application and inbound number..

* accountSID
* accessToken
* Inbound Number

== Twitter ==


* Twitter App ID
* Master Twitter Account and Password

== Agents ==

For each user you would like to track you will also need:

* Twitter user name 
* Access token and secret to post to this account.
* Phone number for this user agent.
* Keywords to be tracked for this agent

Note: Only Tweets which contain mentions of this user AND the keywords listed will be tracked

To Track global keywords the 'agent.track' property should be prefixed by a ',' eg.. 
> agent.track:',Egypt'  // will track all tweets mentioning the agents name OR 'Egypt'
> agent.track:'Egypt'   // will track all tweets menitioned the agents twitter name AND 'Egypt'

