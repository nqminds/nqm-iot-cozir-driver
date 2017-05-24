// Created by Ivan May 2017
module.exports = (function() {
  "use strict";
  const EventEmitter = require("events").EventEmitter;
  const Promise = require("bluebird");
  const serialModule = require("serialport");

  const delimiter = "\r\n";

  class CozirDriver extends EventEmitter {
    constructor(config) {
      super();
      this.config = config;
      this.serialPort = null;
      this.timer = 0;
      this.cor2 = 0;
      this.temperature = 0;
      this.humidity = 0;
    }

    start() {
      this.serialPort = new serialModule.SerialPort(
        this.config.port,
        {
          parser: serialModule.parsers.readline(delimiter),
          baudrate: 9600,
        },
        false
      );
    }
  }

  return CozirDriver;
}());
