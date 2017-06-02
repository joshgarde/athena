#!/bin/env node

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const url = require('url');
const socks = require('socksv5');

// Config
const ALGORITHM = 'aes-256-ctr';
const PASSWORD = 'ChangeMe!';
const PORT = 1080;

const STOP = Buffer.from('stop', 'utf8');

socks.createServer(connectionListener).useAuth(socks.auth.None()).listen(PORT, 'localhost', function() {
  console.log('AthenaV2 started!');
  console.log('Connect to the SOCKSv5 server @ localhost:' + PORT);
});

function connectionListener(info, accept, deny) {
  var socket;
  var cipher = crypto.createCipher(ALGORITHM, PASSWORD);
  var decipher = crypto.createDecipher(ALGORITHM, PASSWORD);
  var options = {
    hostname: 'coronahs.org',
    path: '/',
    method: 'POST',
    port: 80,
    potocol: 'http:',
    headers: {'Transfer-Encoding': 'chunked'}
  }
  var proxy_request = http.request(options, function(response) {
    var data = [];
    switch (response.statusCode) {
      case 302:
        console.error('Captive portal detected. Login first.');
        process.exit(0);
        break;
      case 200:
        if (socket = accept(true)) {
          response.on('data', function(chunk) {
            var decryptedChunk = decipher.update(chunk);
            if (decryptedChunk.equals(STOP)) {
              socket.write(Buffer.concat(data));
              data = [];
            } else {
              data.push(decryptedChunk);
            }
          });
          response.on('end', function() {
            socket.end();
          });
          response.on('close', function() {
            socket.end();
          });
          response.on('error', function() {
            socket.end();
          });
          socket.on('data', function(chunk) {
            proxy_request.write(cipher.update(chunk)), 'utf8', function() {
              proxy_request.write(cipher.update(STOP));
            });
          });
          socket.on('end', function() {
            proxy_request.end();
          });
          socket.on('close', function() {
            proxy_request.end();
          });
          socket.on('error', function() {
            proxy_request.end();
          });
        } else {
          proxy_request.end();
        }
        break;
      default:
        console.error(`Connection failed - ${info.dstAddr}:${info.dstPort}`);
        console.info('Proxy server may be offline');
        deny();
    }
  });

  // Send connection info
  var conn_info = {
    host: info.dstAddr,
    port: info.dstPort
  }

  var infoBuffer = Buffer.from(JSON.stringify(conn_info), 'utf8');
  proxy_request.write(cipher.update(infoBuffer));
}

process.on('uncaughtException', function(err) {
    console.log(err)
})
