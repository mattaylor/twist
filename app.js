/*!
 * twist/app.js is An implmentation of a multi user 2 way twitter phone gateway
 *
 * Copyright(c) 2011 Mat Taylor.
 * MIT Licensed
 *
 * @author mattaylor
 */

var agents = require('./twist').init();

agents.forEach(function (agent) { 
    agent.scan();
});
