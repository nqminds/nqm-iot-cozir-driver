"use strict";

module.exports = (function() {
  var console = process.console ? process.console : global.console;
  var util = require("util");
  var serialModule = require("serialport");
  var delimiter = "\r\n";
  var eventEmitter = require('events').EventEmitter;

  function cozir(config) {
    eventEmitter.call(this);

    this._config = config;
    this._serialPort = null;
    this._timer = 0;
  }

  util.inherits(cozir, eventEmitter);

  cozir.prototype.start = function() {
    var self = this;

    this._serialPort = new serialModule.SerialPort(this._config.port, { parser: serialModule.parsers.readline(delimiter), baudrate: 9600}, false);

    this._serialPort.open(function(err) {
      if (typeof err !== "undefined" && err !== null) {
        console.log("cozir - failed to open port " + self._config.port + " - " + JSON.stringify(err));
      } else {
        console.log("cozir - opened port");

        self._serialPort.on("error", function(e) {
          console.log("cozir - port error: " + JSON.stringify(e));
        });

        self._serialPort.on("data", function (data) {
          if (typeof data !== "undefined" && data !== null) {
            console.log("cozir: " + data);
            onDataReceived.call(self, data);
          }
        });

        // Request configuration (sometimes required to get unit to listen to operating mode request.
        setTimeout(function() { self._serialPort.write("*\r\n"); }, 1000);

        // Set 'poll' operating mode.
        setTimeout(function() { self._serialPort.write("K 2\r\n"); }, 5000);
      }
    });
  };

  cozir.prototype.stop = function() {
    if (this._serialPort !== null) {
      this._serialPort.close();
      this._serialPort = null;
    }
  };

  var startPolling = function() {
    if (this._timer === 0) {
      this._timer = setInterval(poll.bind(this), this._config.cozirPollInterval*60*1000);
    }
  };

  var poll = function() {
    var self = this;

    // ToDo - review sequencing.
    setTimeout(function() { self._serialPort.write("Z\r\n"); }, 500);
    setTimeout(function() { self._serialPort.write("T\r\n"); }, 5500);
    setTimeout(function() { self._serialPort.write("H\r\n"); }, 10500);
  };

  var handleCO2 = function(data) {
    var co2 = data.substr(2);
    this.emit("data", { type: "co2", timestamp: Date.now(), value: parseInt(co2) });
  };

  var handleHumidity = function(data) {
    var humidity = data.substr(2);
    this.emit("data", { type: "humidity", timestamp: Date.now(), value: parseInt(humidity)/10 });
  };

  var handleTemperature = function(data) {
    var temp = data.substr(2);
    this.emit("data", { type: "temperature", timestamp: Date.now(), value: (parseInt(temp) - 1000)/10});
  };

  var onDataReceived = function(data) {
    switch (data[1]) {
      case "Z":
        handleCO2.call(this,data);
        break;
      case "T":
        handleTemperature.call(this,data);
        break;
      case "H":
        handleHumidity.call(this,data);
        break;
      case "K":
        startPolling.call(this);
        break;
      default:
        console.log("ignoring data: " + data);
        break;
    }
  };

  return cozir;
}());
