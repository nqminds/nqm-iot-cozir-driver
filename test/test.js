const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
const COZIRDriver = require("../lib/cozir-driver");

chai.should();

chai.use(chaiAsPromised);

const testConfig = {
  "feedId": "SJepT1uSb-",
  "cozirPollInterval": 1,
  "port": "/dev/ttyUSB0",
  "type": "COZIR",
  "id": "c/t/h",
};

const cozirDriver = new COZIRDriver(testConfig);

describe("Start", function() {
  this.timeout(10000);
  it("Should start", function() {
    return cozirDriver.start().should.eventually.be.fulfilled;
  });
});

describe("Emit", function() {
  this.timeout(10000);
  it("Should emit data", function() {
    return new Promise((resolve, reject) => {
      cozirDriver.on("data", (feedId, data) => {
        if (feedId === testConfig.feedId) {
          resolve();
        } else {
          reject();
        }
      });
    }).should.eventually.be.fulfilled;
  });
});

describe("Stop", function() {
  it("Should stop", function() {
    return cozirDriver.stop().should.eventually.be.fulfilled;
  });
});
