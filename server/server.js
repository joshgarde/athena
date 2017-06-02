#!/bin/env node

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const net = require('net');

// Config
const ALGORITHM = 'aes-256-ctr';
const PASSWORD = 'DefaultPassword!';
const PORT = 80;

const STOP = Buffer.from('stop', 'utf8');

console.log('Starting AthenaV2 Server...');
http.createServer(requestHandler).listen(PORT);
console.log('Proxy started! Connect on :' + PORT);

function requestHandler(request, response) {
  if (request.method === 'POST') {
    var initalized = false;
    var cipher = crypto.createCipher(ALGORITHM, PASSWORD);
    var decipher = crypto.createDecipher(ALGORITHM, PASSWORD);
    var data = [];
    var srvSocket;

    request.on('data', function(chunk) {
      if (initalized) {
        var decryptedChunk = decipher.update(chunk);
        if (decryptedChunk.equals(STOP)) {
          srvSocket.write(Buffer.concat(data));
          data = [];
        } else {
          data.push(decryptedChunk);
        }
      } else {
        try {
          var raw_json = decipher.update(chunk).toString('utf8');
          var conn_info = JSON.parse(raw_json);
        } catch (error) {
          defaultHandler(request, response);
          return;
        }
        srvSocket = net.connect(conn_info.port, conn_info.host, function() {
          initalized = true;
          request.socket.setKeepAlive(true, 30 * 1000);
          response.writeHead(200, {
            'Transfer-Encoding': 'chunked'
          });
          response.socket.write(response._header);
          response._headerSent = true;

          srvSocket.on('data', function(chunk) {
            response.write(cipher.update(chunk), 'utf8', function() {
              response.write(cipher.update(STOP));
            });
          });

          srvSocket.on('end', function() {
            response.end();
          });

          srvSocket.on('error', function() {
            response.end();
          });

          request.on('end', function() {
            srvSocket.end();
          });

          request.on('error', function() {
            srvSocket.end();
          });
        });
      }
    });
  } else {
    defaultHandler(request, response);
  }
}

function defaultHandler(request, response) {
  // Do the default actions here!
  response.end();
}

process.on('uncaughtException', function(err) {
    console.log(err)
});
