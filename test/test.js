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

/*describe("Emit", function() {
  it("Should emit data", function() {

  });
});*/

describe("Stop", function() {
  it("Should stop", function() {
    return cozirDriver.stop().should.eventually.be.fulfilled;
  });
});
