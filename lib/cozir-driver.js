// Created by Ivan May 2017
module.exports = (function() {
  "use strict";
  const EventEmitter = require("events").EventEmitter;
  const Promise = require("bluebird");
  const SerialPort = require("serialport");
  const output = require("nqm-databot-utils").output;

  const delimiter = "\r\n";

  class CozirDriver extends EventEmitter {
    /**
     * Constructor for CozirDriver
     * @param {object} config - Configuration parameters
     */
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

    /**
     * Promise wrapper for serialport's close method
     */
    closePort() {
      output.debug("closing port");
      return new Promise((resolve, reject) => {
        this.serialPort.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    /**
     * Handles and emits a co2 data event
     * @param {string} data - String written to serial port on a co2 event
     */
    handleCO2(data) {
      const co2 = parseInt(data.substr(2));
      if (co2 !== this.co2) {
        this.co2 = co2;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), co2});
      }
    }

    /**
     * Handles and emits a humidity data event
     * @param {string} data - String written to serial port on a humidity event
     */
    handleHumidity(data) {
      const humidity = parseInt(data.substr(2)) / 10;
      if (humidity !== this.humidity) {
        this.humidity = humidity;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), humidity});
      }
    }

    /**
     * Handles and emits a temperature data event
     * @param {string} data - String written to serial port on a temperature event
     */
    handleTemperature(data) {
      const temperature = (parseInt(data.substr(2)) - 1000) / 10;
      if (temperature !== this.temperature) {
        this.temperature = temperature;
        this.emit("data", this.config.feedId, {timestamp: Date.now(), temperature});
      }
    }

    /**
     * Parses data from serial port and determines what type of event occurred
     * @param {string} data - String written to serial port by COZIR device
     */
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

    /**
     * Promise wrapper for serialport's open port method
     * This may require elevated privileges
     */
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

    /**
     * Continuously polls for each data type at intervals determined by config
     */
    poll() {
      if (this.polling) {
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
    }

    /**
     * Handles initialisation
     */
    start() {
      return this.openPort()
      .then(() => {
        output.debug("Cozir - opened port");

        this.serialPort.on("error", (err) => {
          output.debug(`Cozir - port error - ${err.message}`);
        });

        this.serialPort.on("data", (data) => { // Bind data handler
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
        this.startPolling(); // Begin regular polling
        return Promise.resolve();
      })
      .catch((err) => {
        return Promise.reject(new Error(`Cozir - failed to open port ${this.config.port} - ${err.message}`));
      });
    }

    /**
     * Checks to see if the driver is already polling if not begins polling
     */
    startPolling() {
      if (!this.polling) {
        this.polling = true;
        this.poll();
      }
    }

    /**
     * Disconnects from serial port and stops polling
     */
    stop() {
      if (this.serialPort !== null) {
        this.polling = false;
        return this.closePort()
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
