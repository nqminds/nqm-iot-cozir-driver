// Created by Ivan May 2017
module.exports = (function() {
  "use strict";
  const EventEmitter = require("events").EventEmitter;
  const Promise = require("bluebird");
  const SerialPort = require("serialport");
  const output = require("nqm-databot-utils").output;

  const delimiter = "\r\n";

  class CozirDriver extends EventEmitter {
    constructor(config) {
      super();
      this.config = config;
      this.polling = false;
      this.co2 = 0;
      this.temperature = 0;
      this.humidity = 0;

      this.serialPort = new SerialPort(
        this.config.port,
        {
          autoOpen: false,
          baudrate: 9600,
          parser: SerialPort.parsers.readline(delimiter),
        }
      );
    }

    handleCO2(data) {
      const co2 = parseInt(data.substr(2));
      if (co2 !== this.co2) {
        this.co2 = co2;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), co2});
      }
    }

    handleHumidity(data) {
      const humidity = parseInt(data.substr(2)) / 10;
      if (humidity !== this.humidity) {
        this.humidity = humidity;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), humidity});
      }
    }

    handleTemperature(data) {
      const temperature = (parseInt(data.substr(2)) - 1000) / 10;
      if (temperature !== this.temperature) {
        this.temperature = temperature;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), temperature});
      }
    }

    onDataReceived(data) {
      switch (data[1]) {
        case "Z":
          this.handleCO2(data);
          break;
        case "T":
          this.handleTemperature(data);
          break;
        case "H":
          this.handleHumidity(data);
          break;
        case "K":
          this.startPolling();
          break;
        default:
          output.debug(`Ignoring data: ${data}`);
          return;
      }
    }

    openPort() {
      output.debug("opening port");
      return new Promise((resolve, reject) => {
        this.serialPort.open((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    poll() {
      output.debug("Polling");
      Promise.delay(500)
      .then(() => {
        this.serialPort.write("Z\r\n");
      })
      .delay(5000)
      .then(() => {
        this.serialPort.write("T\r\n");
      })
      .delay(5000)
      .then(() => {
        this.serialPort.write("H\r\n");
      })
      .delay(this.config.cozirPollInterval * 60 * 1000)
      .then(() => {
        this.poll();
      });
    }

    start() {
      return this.openPort()
      .then(() => {
        output.debug("Cozir - opened port");

        this.serialPort.on("error", (err) => {
          output.debug(`Cozir - port error - ${err.message}`);
        });

        this.serialPort.on("data", (data) => {
          if (typeof data !== "undefined" && data !== null) {
            this.onDataReceived(data);
          }
        });
      })
      .delay(1000)
      .then(() => {
        this.serialPort.write("*\r\n");
      })
      .delay(5000)
      .then(() => {
        this.serialPort.write("K 2\r\n");
        this.startPolling();
        return Promise.resolve();
      })
      .catch((err) => {
        output.debug(`Cozir - failed to open port ${this.config.port} - ${err.message}`);
      });
    }

    startPolling() {
      if (!this.polling) {
        this.polling = true;
        this.poll();
      }
    }

    stop() {
      if (this.serialPort !== null) {
        return this.serialPort.closeAsync()
        .then(() => {
          this.serialPort = null;
          return Promise.resolve();
        })
        .catch((err) => {
          return Promise.reject(`Cozir - failed closing port - ${err.message}`);
        });
      } else {
        return Promise.resolve();
      }
    }

  }

  return CozirDriver;
}());
