"use strict";

var assert = require("assert");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;
var Signal = require("../../services/signal");

// Register models used during testing

var BoardModel = mongoose.model("Board1", {
  title: { type: String, default: "Board title" },
  description: { type: String, default: "Hello Javascript" }
});

var CardModel = mongoose.model("Card1", {
  title: { type: String, default: "Card title" },
  description: { type: String, default: "Hello card" }
});

var ListModel = mongoose.model("List1", {
  title: { type: String, default: "List title" },
  createOn: { type: Date, default: Date.now() }
});

describe("Test interface of signal services.", function() {

  it("Test constructor", function() {
    var signal = new Signal();
    assert(signal._providing_args instanceof Array,
      "Without arguments, _providing_args should default to an object of Array");
    assert.equal(signal._providing_args.length, 0,
      "Without arguments, _providing_args should default to an empty array.");

    signal = new Signal({});
    assert.equal(signal._providing_args.length, 0,
      "Without arguments, _providing_args should default to an empty array.");

    var providing_args = ["socket", "model"];
    signal = new Signal({providing_args: providing_args});
    for (var i = 0; i < signal._providing_args.length; i++) {
      var argToCheck = signal._providing_args[i];
      assert(providing_args.indexOf(argToCheck) >= 0,
        argToCheck + " does not in expected arguments.");
    }
  });

  it("Test constructor with providing_args",  function() {
    var expected_providing_args = ["name", "stage"];
    var before_test = new Signal({
      providing_args: expected_providing_args
    });

    for (var i = 0; i < before_test._providing_args.length; i++) {
      var arg = before_test._providing_args[i];
      assert(expected_providing_args.indexOf(arg) >= 0,
        arg + " does not exist in expected providing_args.");
    }
  });

});

describe("Test interface connect", function() {
  var receiver1, receiver2, receiver3;
  var signal;

  beforeEach(function() {
    receiver1 = function(sender) {};
    receiver2 = function(sender) {};
    receiver3 = function(sender, args) {};
    signal = new Signal();
  });

  afterEach(function() {
    receiver1 = null, receiver2 = null, receiver3 = null;
  });

  it("Test connect interface receiver", function() {

    assert.throws(function() {
      signal.connect("dummy string", BoardModel);
    }, TypeError);
    assert.throws(function() {
      signal.connect(receiver1, {});
    }, TypeError);

    signal = new Signal();
    signal.connect(BoardModel, receiver1);
    signal.connect(BoardModel, receiver2);
    signal.connect(ListModel, receiver3);

    var modelReceivers = signal._receivers[BoardModel.modelName];
    assert.notEqual(modelReceivers, undefined, "Receivers for model1 should exist.");
    assert.equal(modelReceivers.length, 2, "There are only two receivers connected for model1");

    // Prepare for function existence test
    var functionStrings = [];
    for (var i = 0; i < modelReceivers.length; i++)
      functionStrings.push(modelReceivers[i].toString());

    assert(functionStrings.indexOf(receiver1.toString()) >= 0,
      "receiver1 for model1 should exist.");
    assert(functionStrings.indexOf(receiver2.toString()) >= 0,
      "receiver2 for model1 should exist.");

    modelReceivers = signal._receivers[ListModel.modelName];
    assert.equal(modelReceivers.length, 1, "There are only two receivers connected for model2");
    assert.strictEqual(modelReceivers[0].toString(), receiver3.toString(),
      "There is only one receiver connected for model2, however it is not the receiver3.");
  });

});

describe("Test interface disconnect", function() {
  var receiver1, receiver2, receiver3;
  var signal;

  beforeEach(function() {
    receiver1 = function(sender) {};
    receiver2 = function(sender) {};
    receiver3 = function(sender, args) {};
    signal = new Signal();
    signal.connect(BoardModel, receiver1);
    signal.connect(BoardModel, receiver2);
    signal.connect(ListModel, receiver3);
  });

  afterEach(function() {
    signal = null;
    receiver1 = null, receiver2 = null, receiver3 = null;
  });

  it("Test disconnect all receviers", function() {
    signal.disconnect();
    assert.equal(signal._receivers.toString(), {}.toString(),
      "After disconnect al receivers, internal _receivers should be empty.");
  });

  it("Test disconnect sender's all receivers", function() {
    signal.disconnect(BoardModel);
    var receivers = signal._receivers[BoardModel.modelName]
    assert(receivers instanceof Array && receivers.length === 0,
      "All receivers for model1 are removed, and internal _receivers should be empty.");
  });

  it("Test disconnect a receiver of specific sender", function() {
    signal.disconnect(BoardModel, receiver1);
    var receivers = signal._receivers[BoardModel.modelName];
    assert(receivers.indexOf(receiver1) < 0, "receiver1 should not exist now.");
  });

});

describe("Test send signal", function(done) {
  var receiver1, receiver2, receiver3;
  var signal;

  beforeEach(function() {
    receiver1 = function(sender, args, done) {
      done(null, true);
    };
    receiver2 = function(sender, args, done) {
      done(new Error(), null);
    };
    receiver3 = function(sender, args, done) {
      done(null, false);
    };
  });

  afterEach(function() {
    receiver1 = null, receiver2 = null, receiver3 = null;
  });

  it("Test send signal with providing_args",  function(done) {
    var signal = new Signal({
      providing_args: ["name"]
    });
    signal.connect(BoardModel, receiver1);
    signal.connect(BoardModel, receiver2);
    signal.connect(BoardModel, receiver3);
    var board = new BoardModel();
    signal.send(board, {name: "Model 1"}, function(err, results) {
      assert(results instanceof Array,
        "Result of signal.send should be an Array object.");
      assert(results.length === 3,
        "There are 3 receivers get execution. So, the length of results should be 3.");
      for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result.reciever === receiver1) {
          assert(result.err === undefined || result.err === null,
            "receiver1 does not generate any error, so this error is not expected.");
          assert(result.result, "receiver1 should run all as expected.");
        } else if (result.receiver === receiver2) {
          assert(typeof result.err === "object" && result.err instanceof Error,
            "receiver2 throws an TypeError, which is not detected here.");
          assert(result.result === null,
            "When there is error from receiver, this result should be false.");
        } else if (result.receiver === receiver3) {
          assert(result.err === undefined || result.err === null,
            "receiver3 does not generate any error, so this error is not expected.");
          assert.equal(result.result, false, "receiver3 should run all as expected.");
        }
      }
      done();
    });
  });

  it("Test send signal with providing_args and missing args passed", function() {
    var signal = new Signal({
      providing_args: ["name"]
    });
    var board = new BoardModel();
    signal.send(board, function(err, results) {
      assert(err instanceof Error, "Argument name is not provided when send signal.");
    });
  });

  it("Test send signal with providing_args and providing partial args", function() {
    var signal = new Signal({
      providing_args: ["name", "socket"]
    });
    var list = new ListModel();
    signal.send(list, {name: "Model"}, function(err, results) {
      assert(err instanceof Error, "Arguments are not provided enough, send should fail.");
    });
  });

  it("Test not provide callback to send method", function() {
    var sendArgs = {name: "NodeJS"};
    var signal = new Signal({providing_args: ["name"]})
    signal.connect(ListModel, function(sender, args, done) {
      assert.strictEqual(args.name, sendArgs.name);
      done(null, true);
    });
    var list = new ListModel();
    signal.send(list, sendArgs);
  });

});
