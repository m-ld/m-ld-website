'use strict'

var aedes = require('aedes')();
var server = require('net').createServer(aedes.handle);
var httpServer = require('http').createServer();
var ws = require('websocket-stream');
var mqttPort = 1883;
var httpPort = 8888;

server.listen(mqttPort, function () {
  console.log('mqtt server listening on port', mqttPort)
});

ws.createServer({
  server: httpServer
}, aedes.handle);

httpServer.listen(httpPort, function () {
  console.log('websocket server listening on port', httpPort)
});

aedes.on('clientError', function (client, err) {
  console.log('client error', client.id, err.message, err.stack)
});

aedes.on('connectionError', function (client, err) {
  console.log('client error', client, err.message, err.stack)
});

aedes.on('publish', function (packet, client) {
  if (client) {
    console.log('message from client', client.id)
  }
});

aedes.on('subscribe', function (subscriptions, client) {
  if (client) {
    console.log('subscribe from client', subscriptions, client.id)
  }
});

aedes.on('client', function (client) {
  console.log('new client', client.id)
});
