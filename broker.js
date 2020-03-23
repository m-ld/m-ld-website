'use strict'

const persistence = require('aedes-persistence')();
const aedes = require('aedes')({ persistence });
const server = require('net').createServer(aedes.handle);
const httpServer = require('http').createServer();
const ws = require('websocket-stream');
const mqttPort = 1883;
const httpPort = 8888;
var keypress = require('keypress');

// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin);

// listen for the "keypress" event
process.stdin.on('keypress', function (_, key) {
  if (key && key.name == 'd') {
    console.log('Blanking persistence...');
    // Hack, re-apply the constructor
    require('aedes-persistence').apply(persistence);
  }
});
if (process.stdin.isTTY)
  process.stdin.setRawMode(true);
process.stdin.resume();

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
    const { topic, qos, retain } = packet;
    console.log('message from client', client.id, { topic, qos, retain }, packet.payload.toString())
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
