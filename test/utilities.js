import * as chai from '../index.js';

describe('utilities', function () {
  const expect = chai.expect;

  after(function() {
    // Some clean-up so we can run tests in a --watch
    delete chai.Assertion.prototype.eqqqual;
    delete chai.Assertion.prototype.result;
    delete chai.Assertion.prototype.doesnotexist;
  });

  it('_obj', function () {
    let foo = 'bar'
      , test = expect(foo);

    expect(test).to.have.property('_obj', foo);

    let bar = 'baz';
    test._obj = bar;

    expect(test).to.have.property('_obj', bar);
    test.equal(bar);
  });

  it('transferFlags', function () {
    let foo = 'bar'
      , test = expect(foo).not;

    chai.use(function (_chai, utils) {
      let obj = {};
      utils.transferFlags(test, obj);
      expect(utils.flag(obj, 'object')).to.equal(foo);
      expect(utils.flag(obj, 'negate')).to.equal(true);
    });
  });

  it('transferFlags, includeAll = false', function () {
    let foo = 'bar';

    chai.use(function (_chai, utils) {
      let target = {};
      let test = function() {};

      let assertion = new chai.Assertion(target, "message", test, true);
      let flag = {};
      utils.flag(assertion, 'flagMe', flag);
      utils.flag(assertion, 'negate', true);
      let obj = {};
      utils.transferFlags(assertion, obj, false);

      expect(utils.flag(obj, 'object')).to.equal(undefined);
      expect(utils.flag(obj, 'message')).to.equal(undefined);
      expect(utils.flag(obj, 'ssfi')).to.equal(undefined);
      expect(utils.flag(obj, 'lockSsfi')).to.equal(undefined);
      expect(utils.flag(obj, 'negate')).to.equal(true);
      expect(utils.flag(obj, 'flagMe')).to.equal(flag);
    });
  });

  it('transferFlags, includeAll = true', function () {
    let foo = 'bar';

    chai.use(function (_chai, utils) {
      let target = {};
      let test = function() {};

      let assertion = new chai.Assertion(target, "message", test, true);
      let flag = {};
      utils.flag(assertion, 'flagMe', flag);
      utils.flag(assertion, 'negate', true);
      let obj = {};
      utils.transferFlags(assertion, obj, true);

      expect(utils.flag(obj, 'object')).to.equal(target);
      expect(utils.flag(obj, 'message')).to.equal("message");
      expect(utils.flag(obj, 'ssfi')).to.equal(test);
      expect(utils.flag(obj, 'lockSsfi')).to.equal(true);
      expect(utils.flag(obj, 'negate')).to.equal(true);
      expect(utils.flag(obj, 'flagMe')).to.equal(flag);
    });
  });

  describe('addMethod', function() {
    let assertionConstructor, utils;

    before(function() {
      chai.use(function(_chai, _utils) {
        utils = _utils;
        assertionConstructor = _chai.Assertion;

        expect(_chai.Assertion).to.not.respondTo('eqqqual');
        _chai.Assertion.addMethod('eqqqual', function (str) {
          let object = utils.flag(this, 'object');
          new _chai.Assertion(object).to.be.eql(str);
        });

        _chai.Assertion.addMethod('result', function () {
          return 'result';
        })

        _chai.Assertion.addMethod('returnNewAssertion', function () {
          utils.flag(this, 'mySpecificFlag', 'value1');
          utils.flag(this, 'ultraSpecificFlag', 'value2');
        });

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.eqqqual;

      delete chai.Assertion.prototype.result;

      delete chai.Assertion.prototype.returnNewAssertion;
      delete chai.Assertion.prototype.checkFlags;
    });

    it('addMethod', function () {
      expect(chai.Assertion).to.respondTo('eqqqual');
      expect('spec').to.eqqqual('spec');
    });

    it('addMethod returning result', function () {
      expect(expect('foo').result()).to.equal('result');
    });

    it('addMethod returns new assertion with flags copied over', function () {
      let assertion1 = expect('foo');
      let assertion2 = assertion1.to.returnNewAssertion();

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a method to guarantee it's not a function's
      // `length`. Note: 'instanceof' cannot be used here because the test will
      // fail in IE 10 due to how addChainableMethod works without __proto__
      // support. Therefore, test the constructor property of length instead.
      let anAssertion = expect([1, 2, 3]).to.be.an.instanceof(Array);
      expect(anAssertion.length.constructor).to.equal(assertionConstructor);

      let anotherAssertion = expect([1, 2, 3]).to.have.a.lengthOf(3).and.to.be.ok;
      expect(anotherAssertion.length.constructor).to.equal(assertionConstructor);
    });

    it('addMethod sets `ssfi` when `lockSsfi` isn\'t set', function () {
      let origAssertion = expect(1);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      let newAssertion = origAssertion.eqqqual(1);
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.not.equal(newSsfi);
    });

    it('addMethod doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect(1);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.eqqqual(1);
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  describe('overwriteMethod', function () {
    let assertionConstructor, utils;

    before(function() {
      chai.config.includeStack = false;

      chai.use(function(_chai, _utils) {
        assertionConstructor = _chai.Assertion;
        utils = _utils;

        _chai.Assertion.addMethod('four', function() {
          this.assert(this._obj === 4, 'expected #{this} to be 4', 'expected #{this} to not be 4', 4);
        });

        _chai.Assertion.overwriteMethod('four', function(_super) {
          return function() {
            utils.flag(this, 'mySpecificFlag', 'value1');
            utils.flag(this, 'ultraSpecificFlag', 'value2');

            if (typeof this._obj === 'string') {
              this.assert(this._obj === 'four', 'expected #{this} to be \'four\'', 'expected #{this} to not be \'four\'', 'four');
            } else {
              _super.call(this);
            }
          }
        });

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.four;
      delete chai.Assertion.prototype.checkFlags;
      delete chai.Assertion.prototype.eqqqual;
      delete chai.Assertion.prototype.doesnotexist;
      delete chai.Assertion.prototype.doesnotexistfail;
    });

    it('overwriteMethod', function () {
      chai.use(function (_chai, utils) {
        _chai.Assertion.addMethod('eqqqual', function (str) {
          let object = utils.flag(this, 'object');
          new _chai.Assertion(object).to.be.eql(str);
        });

        _chai.Assertion.overwriteMethod('eqqqual', function (_super) {
          return function (str) {
            let object = utils.flag(this, 'object');
            if (object == 'cucumber' && str == 'cuke') {
              utils.flag(this, 'cucumber', true);
            } else {
              _super.apply(this, arguments);
            }
          };
        });
      });

      let vege = expect('cucumber').to.eqqqual('cucumber');
      expect(vege.__flags).to.not.have.property('cucumber');
      let cuke = expect('cucumber').to.eqqqual('cuke');
      expect(cuke.__flags).to.have.property('cucumber');

      chai.use(function (_chai, _) {
        expect(_chai.Assertion).to.not.respondTo('doesnotexist');
        _chai.Assertion.overwriteMethod('doesnotexist', function (_super) {
          expect(_super).to.be.a('function');
          return function () {
            _.flag(this, 'doesnt', true);
          }
        });
      });

      let dne = expect('something').to.doesnotexist();
      expect(dne.__flags).to.have.property('doesnt');

      chai.use(function (_chai, _) {
        expect(_chai.Assertion).to.not.respondTo('doesnotexistfail');
        _chai.Assertion.overwriteMethod('doesnotexistfail', function (_super) {
          expect(_super).to.be.a('function');
          return function () {
            _.flag(this, 'doesnt', true);
            _super.apply(this, arguments);
          }
        });
      });

      let dneFail = expect('something');
      let dneError;
      try { dneFail.doesnotexistfail(); }
      catch (e) { dneError = e; }
      expect(dneFail.__flags).to.have.property('doesnt');
      expect(dneError.message).to.eql('doesnotexistfail is not a function');
    });

    it('overwriteMethod returning result', function () {
      chai.use(function (_chai, _) {
        _chai.Assertion.overwriteMethod('result', function (_super) {
          return function () {
            return 'result';
          }
        });
      });

      expect(expect('foo').result()).to.equal('result');
    });

    it('calling _super has correct stack trace', function() {
      try {
        expect(5).to.be.four();
        expect(false, 'should not get here because error thrown').to.be.ok;
      } catch (err) {
        // not all browsers support err.stack
        // Phantom does not include function names for getter exec
        if ('undefined' !== typeof err.stack && 'undefined' !== typeof Error.captureStackTrace) {
          expect(err.stack).to.include('utilities.js');
          expect(err.stack).to.not.include('overwriteMethod');
        }
      }
    });

    it('overwritten behavior has correct stack trace', function() {
      try {
        expect('five').to.be.four();
        expect(false, 'should not get here because error thrown').to.be.ok;
      } catch (err) {
        // not all browsers support err.stack
        // Phantom does not include function names for getter exec
        if ('undefined' !== typeof err.stack && 'undefined' !== typeof Error.captureStackTrace) {
          expect(err.stack).to.include('utilities.js');
          expect(err.stack).to.not.include('overwriteMethod');
        }
      }
    });

    it('should return a new assertion with flags copied over', function () {
      let assertion1 = expect('four');
      let assertion2 = assertion1.four();

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a method to guarantee it is not a function's `length`
      expect('four').to.be.a.four().length.above(2);

      // Ensure that foo returns an Assertion (not a function)
      expect(expect('four').four()).to.be.an.instanceOf(assertionConstructor);
    });

    it('overwriteMethod sets `ssfi` when `lockSsfi` isn\'t set', function () {
      let origAssertion = expect(4);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      let newAssertion = origAssertion.four();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.not.equal(newSsfi);
    });

    it('overwriteMethod doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect(4);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.four();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  describe('addProperty', function() {
    let assertionConstructor = chai.Assertion;
    let utils;

    before(function() {
      chai.use(function (_chai, _utils) {
        utils = _utils;
        assertionConstructor = _chai.Assertion;

        _chai.Assertion.addProperty('tea', function () {
          utils.flag(this, 'tea', 'chai');
        });

        _chai.Assertion.addProperty('result', function () {
          return 'result';
        })

        _chai.Assertion.addProperty('thing', function () {
          utils.flag(this, 'mySpecificFlag', 'value1');
          utils.flag(this, 'ultraSpecificFlag', 'value2');
        });

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.tea;
      delete chai.Assertion.prototype.thing;
      delete chai.Assertion.prototype.checkFlags;
      delete chai.Assertion.prototype.result;
    });

    it('addProperty', function () {
      let assert = expect('chai').to.be.tea;
      expect(assert.__flags.tea).to.equal('chai');
    });

    it('addProperty returning result', function () {
      expect(expect('foo').result).to.equal('result');
    });

    it('addProperty returns a new assertion with flags copied over', function () {
      let assertion1 = expect('foo');
      let assertion2 = assertion1.is.thing;

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // If it is, calling length on it should return an assertion, not a function
      expect([1, 2, 3]).to.be.an.instanceof(Array);

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a property to guarantee it is not a function's `length`
      expect([1, 2, 3]).to.be.a.thing.with.length.above(2);
      expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

      expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
      expect(expect([1, 2, 3]).thing).to.be.an.instanceOf(assertionConstructor);
    });

    it('addProperty sets `ssfi` when `lockSsfi` isn\'t set', function () {
      let origAssertion = expect(1);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      let newAssertion = origAssertion.to.be.tea;
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.not.equal(newSsfi);
    });

    it('addProperty doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect(1);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.to.be.tea;
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  describe('overwriteProperty', function () {
    let assertionConstructor, utils;

    before(function() {
      chai.config.includeStack = false;

      chai.use(function(_chai, _utils) {
        assertionConstructor = _chai.Assertion;
        utils = _utils;

        _chai.Assertion.addProperty('tea', function () {
          utils.flag(this, 'tea', 'chai');
        });

        _chai.Assertion.overwriteProperty('tea', function (_super) {
          return function () {
            let act = utils.flag(this, 'object');
            if (act === 'matcha') {
              utils.flag(this, 'tea', 'matcha');
            } else {
              _super.call(this);
            }
          }
        });

        _chai.Assertion.overwriteProperty('result', function (_super) {
          return function () {
            return 'result';
          }
        });

        _chai.Assertion.addProperty('four', function() {
          this.assert(this._obj === 4, 'expected #{this} to be 4', 'expected #{this} to not be 4', 4);
        });

        _chai.Assertion.overwriteProperty('four', function(_super) {
          return function() {
            if (typeof this._obj === 'string') {
              this.assert(this._obj === 'four', 'expected #{this} to be \'four\'', 'expected #{this} to not be \'four\'', 'four');
            } else {
              _super.call(this);
            }
          }
        });

        _chai.Assertion.addProperty('foo');

        _chai.Assertion.overwriteProperty('foo', function (_super) {
          return function blah () {
            utils.flag(this, 'mySpecificFlag', 'value1');
            utils.flag(this, 'ultraSpecificFlag', 'value2');
            _super.call(this);
          };
        });

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.tea;
      delete chai.Assertion.prototype.four;
      delete chai.Assertion.prototype.result;
      delete chai.Assertion.prototype.foo;
      delete chai.Assertion.prototype.checkFlags
    });

    it('overwriteProperty', function () {
      let matcha = expect('matcha').to.be.tea;
      expect(matcha.__flags.tea).to.equal('matcha');
      let assert = expect('something').to.be.tea;
      expect(assert.__flags.tea).to.equal('chai');
    });

    it('overwriteProperty returning result', function () {
      expect(expect('foo').result).to.equal('result');
    });

    it('calling _super has correct stack trace', function() {
      try {
        expect(5).to.be.four;
        expect(false, 'should not get here because error thrown').to.be.ok;
      } catch (err) {
        // not all browsers support err.stack
        // Phantom does not include function names for getter exec
        if ('undefined' !== typeof err.stack && 'undefined' !== typeof Error.captureStackTrace) {
          expect(err.stack).to.include('utilities.js');
          expect(err.stack).to.not.include('overwriteProperty');
        }
      }
    });

    it('overwritten behavior has correct stack trace', function() {
      try {
        expect('five').to.be.four;
        expect(false, 'should not get here because error thrown').to.be.ok;
      } catch (err) {
        // not all browsers support err.stack
        // Phantom does not include function names for getter exec
        if ('undefined' !== typeof err.stack && 'undefined' !== typeof Error.captureStackTrace) {
          expect(err.stack).to.include('utilities.js');
          expect(err.stack).to.not.include('overwriteProperty');
        }
      }
    });

    it('should return new assertion with flags copied over', function() {
      let assertion1 = expect('foo');
      let assertion2 = assertion1.is.foo;

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // If it is, calling length on it should return an assertion, not a function
      expect([1, 2, 3]).to.be.an.foo.length.below(1000);

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a property to guarantee it is not a function's `length`
      expect([1, 2, 3]).to.be.a.foo.with.length.above(2);
      expect([1, 2, 3]).to.be.an.instanceOf(Array).and.have.length.below(4);

      expect(expect([1, 2, 3]).be).to.be.an.instanceOf(assertionConstructor);
      expect(expect([1, 2, 3]).foo).to.be.an.instanceOf(assertionConstructor);
    });

    describe('when useProxy is false', function () {
      before(function () {
        chai.config.useProxy = false;
      });

      after(function () {
        chai.config.useProxy = true;
      });

      it('overwriteProperty sets `ssfi` when `lockSsfi` isn\'t set', function () {
        let origAssertion = expect(4);
        let origSsfi = utils.flag(origAssertion, 'ssfi');

        let newAssertion = origAssertion.to.be.four;
        let newSsfi = utils.flag(newAssertion, 'ssfi');

        expect(origSsfi).to.not.equal(newSsfi);
      });
    });

    it('overwriteProperty doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect(4);
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.to.be.four;
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  it('getMessage', function () {
    chai.use(function (_chai, _) {
      expect(_.getMessage({}, [])).to.equal('');
      expect(_.getMessage({}, [null, null, null])).to.equal('');

      let obj = {};
      _.flag(obj, 'message', 'foo');
      expect(_.getMessage(obj, [])).to.contain('foo');
    });
  });

  it('getMessage passed message as function', function () {
    chai.use(function (_chai, _) {
      let obj = {};
      let msg = function() { return "expected a to eql b"; }
      let negateMsg = function() { return "expected a not to eql b"; }
      expect(_.getMessage(obj, [null, msg, negateMsg])).to.equal("expected a to eql b");
      _.flag(obj, 'negate', true);
      expect(_.getMessage(obj, [null, msg, negateMsg])).to.equal("expected a not to eql b");
    });
  });

  it('getMessage template tag substitution', function () {
    chai.use(function (_chai, _) {
      let objName = 'trojan horse';
      let actualValue = 'an actual value';
      let expectedValue = 'an expected value';
      [
          // known template tags
          {
              template: 'one #{this} two',
              expected: 'one \'' + objName + '\' two'
          },
          {
              template: 'one #{act} two',
              expected: 'one \'' + actualValue + '\' two'
          },
          {
              template: 'one #{exp} two',
              expected: 'one \'' + expectedValue + '\' two'
          },
          // unknown template tag
          {
              template: 'one #{unknown} two',
              expected: 'one #{unknown} two'
          },
          // repeated template tag
          {
              template: '#{this}#{this}',
              expected: '\'' + objName + '\'\'' + objName + '\''
          },
          // multiple template tags in different order
          {
              template: '#{this}#{act}#{exp}#{act}#{this}',
              expected: '\'' + objName + '\'\'' + actualValue + '\'\'' + expectedValue + '\'\'' + actualValue + '\'\'' + objName + '\''
          },
          // immune to string.prototype.replace() `$` substitution
          {
              objName: '-$$-',
              template: '#{this}',
              expected: '\'-$$-\''
          },
          {
              actualValue: '-$$-',
              template: '#{act}',
              expected: '\'-$$-\''
          },
          {
              expectedValue: '-$$-',
              template: '#{exp}',
              expected: '\'-$$-\''
          }
      ].forEach(function (config) {
          config.objName = config.objName || objName;
          config.actualValue = config.actualValue || actualValue;
          config.expectedValue = config.expectedValue || expectedValue;
          let obj = {_obj: config.actualValue};
          _.flag(obj, 'object', config.objName);
          expect(_.getMessage(obj, [null, config.template, null, config.expectedValue])).to.equal(config.expected);
      });
    });
  });

  it('inspect with custom stylize-calling inspect()s', function () {
    chai.use(function (_chai, _) {
      let obj = {
        outer: {
          inspect: function (depth, options) {
            return options.stylize('Object content', 'string');
          }
        }
      };
      expect(_.inspect(obj)).to.equal('{ outer: Object content }');
    });
  });

  it('inspect with custom object-returning inspect()s', function () {
    chai.use(function (_chai, _) {
      let obj = {
        outer: {
          inspect: function () {
            return { foo: 'bar' };
          }
        }
      };

      expect(_.inspect(obj)).to.equal('{ outer: { foo: \'bar\' } }');
    });
  });

  it('inspect negative zero', function () {
    chai.use(function (_chai, _) {
      expect(_.inspect(-0)).to.equal('-0');
      expect(_.inspect([-0])).to.equal('[ -0 ]');
      expect(_.inspect({ hp: -0 })).to.equal('{ hp: -0 }');
    });
  });

  it('inspect Symbol', function () {
    chai.use(function (_chai, _) {
      expect(_.inspect(Symbol())).to.equal('Symbol()');
      expect(_.inspect(Symbol('cat'))).to.equal('Symbol(cat)');
    });
  });

  it('inspect BigInt', function () {
    chai.use(function (_chai, _) {
      expect(_.inspect(BigInt(0))).to.equal('0n');
      expect(_.inspect(BigInt(1234))).to.equal('1234n');
      expect(_.inspect(BigInt(-1234))).to.equal('-1234n');
    });
  });

  it('inspect every kind of available TypedArray', function () {
    chai.use(function (_chai, _) {
      let arr = [1, 2, 3]
        , exp = 'Array[ 1, 2, 3 ]'
        , isNode = true;

      if (typeof window !== 'undefined') {
        isNode = false;
      }

      // Checks if engine supports common TypedArrays
      if ((!isNode && 'Int8Array' in window) ||
          isNode && typeof 'Int8Array' !== undefined) {
        // Typed array inspections should work as array inspections do
        expect(_.inspect(new Int8Array(arr))).to.include(exp);
        expect(_.inspect(new Uint8Array(arr))).to.include(exp);
        expect(_.inspect(new Int16Array(arr))).to.include(exp);
        expect(_.inspect(new Uint16Array(arr))).to.include(exp);
        expect(_.inspect(new Int32Array(arr))).to.include(exp);
        expect(_.inspect(new Uint32Array(arr))).to.include(exp);
        expect(_.inspect(new Float32Array(arr))).to.include(exp);
      }

      // These ones may not be available alongside the others above
      if ((!isNode && 'Uint8ClampedArray' in window) ||
          isNode && typeof 'Uint8ClampedArray' !== undefined) {
        expect(_.inspect(new Uint8ClampedArray(arr))).to.include(exp);
      }

      if ((!isNode && 'Float64Array' in window) ||
          isNode && typeof 'Float64Array' !== undefined) {
        expect(_.inspect(new Float64Array(arr))).to.include(exp);
      }
    });
  });

  it('inspect an assertion', function () {
    chai.use(function (_chai, _) {
      let assertion = expect(1);
      let anInspectFn = function() {
        return _.inspect(assertion);
      };

      expect(anInspectFn).to.not.throw();
    });
  });

  it('truncate long TypedArray', function () {
    chai.use(function (_chai, _) {

      let arr = []
        , exp = 'Int8Array[ 1, 2, 3, 4, 5, 6, 7, …(993) ]'
        , isNode = true;

      // Filling arr with lots of elements
      for (let i = 1; i <= 1000; i++) {
        arr.push(i);
      }

      if (typeof window !== 'undefined') {
        isNode = false;
      }

      if ((!isNode && 'Int8Array' in window) ||
          isNode && typeof 'Int8Array' !== undefined) {
        expect(_.inspect(new Int8Array(arr))).to.include(exp);
      }
    });
  });

  describe('addChainableMethod', function() {
    let assertionConstructor, utils;

    before(function() {
      chai.use(function (_chai, _utils) {
        assertionConstructor = _chai.Assertion;
        utils = _utils;

        _chai.Assertion.addChainableMethod('x',
          function () {
            new chai.Assertion(this._obj).to.be.equal('x');
          }
        , function () {
            if (this._obj === Object(this._obj)) {
              this._obj.__x = 'X!'
            }
          }
        );

        _chai.Assertion.addChainableMethod('foo', function(str) {
          utils.flag(this, 'mySpecificFlag', 'value1');
          utils.flag(this, 'ultraSpecificFlag', 'value2');

          let obj = utils.flag(this, 'object');
          new _chai.Assertion(obj).to.be.equal(str);
        });

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.x;
      delete chai.Assertion.prototype.foo;
      delete chai.Assertion.prototype.checkFlags;
    });

    it('addChainableMethod', function () {
      expect("foo").x.to.equal("foo");
      expect("x").x();

      expect(function () {
        expect("foo").x();
      }).to.throw(chai.AssertionError);

      // Verify whether the original Function properties are present.
      // see https://github.com/chaijs/chai/commit/514dd6ce4#commitcomment-2593383
      let propertyDescriptor = Object.getOwnPropertyDescriptor(chai.Assertion.prototype, "x");
      expect(propertyDescriptor.get).to.have.property("call", Function.prototype.call);
      expect(propertyDescriptor.get).to.have.property("apply", Function.prototype.apply);
      expect(propertyDescriptor.get()).to.have.property("call", Function.prototype.call);
      expect(propertyDescriptor.get()).to.have.property("apply", Function.prototype.apply);

      let obj = {};
      expect(obj).x.to.be.ok;
      expect(obj).to.have.property('__x', 'X!');
    });

    it('addChainableMethod should return a new assertion with flags copied over', function () {
      chai.config.proxyExcludedKeys.push('nodeType');

      let assertion1 = expect('bar');
      let assertion2 = assertion1.foo('bar');

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a method to guarantee it is not a function's `length`
      expect('bar').to.be.a.foo('bar').length.above(2);

      // Ensure that foo returns an Assertion (not a function)
      expect(expect('bar').foo('bar')).to.be.an.instanceOf(assertionConstructor);
    });

    it('addChainableMethod sets `ssfi` when `lockSsfi` isn\'t set', function () {
      let origAssertion = expect('x');
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      let newAssertion = origAssertion.to.be.x();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.not.equal(newSsfi);
    });

    it('addChainableMethod doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect('x');
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.to.be.x();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  describe('overwriteChainableMethod', function() {
    let assertionConstructor;
    let utils;

    before(function() {
      chai.use(function (_chai, _utils) {
        assertionConstructor = _chai.Assertion;
        utils = _utils;

        _chai.Assertion.addChainableMethod('x',
          function () {
            new chai.Assertion(this._obj).to.be.equal('x');
          }
        , function () {
            if (this._obj === Object(this._obj)) {
              this._obj.__x = 'X!'
            }
          }
        );

        _chai.Assertion.overwriteChainableMethod('x',
          function(_super) {
            return function() {
              utils.flag(this, 'mySpecificFlag', 'value1');
              utils.flag(this, 'ultraSpecificFlag', 'value2');

              if (utils.flag(this, 'marked')) {
                new chai.Assertion(this._obj).to.be.equal('spot');
              } else {
                _super.apply(this, arguments);
              }
            };
          }
        , function(_super) {
            return function() {
              utils.flag(this, 'message', 'x marks the spot');
              _super.apply(this, arguments);
            };
          }
        );

        _chai.Assertion.addMethod('checkFlags', function() {
          this.assert(
              utils.flag(this, 'mySpecificFlag') === 'value1' &&
              utils.flag(this, 'ultraSpecificFlag') === 'value2' &&
              utils.flag(this, 'message') === 'x marks the spot'
            , 'expected assertion to have specific flags'
            , "this doesn't matter"
          );
        });
      });
    });

    after(function() {
      delete chai.Assertion.prototype.x;
      delete chai.Assertion.prototype.checkFlags;
    });

    it('overwriteChainableMethod', function () {
      // Make sure the original behavior of 'x' remains the same
      expect('foo').x.to.equal("foo");
      expect("x").x();
      expect(function () {
        expect("foo").x();
      }).to.throw(chai.AssertionError);
      let obj = {};
      expect(obj).x.to.be.ok;
      expect(obj).to.have.property('__x', 'X!');

      // Test the new behavior of 'x'
      let assertion = expect('foo').x.to.be.ok;
      expect(utils.flag(assertion, 'message')).to.equal('x marks the spot');
      expect(function () {
        let assertion = expect('x');
        utils.flag(assertion, 'marked', true);
        assertion.x()
      }).to.throw(chai.AssertionError);
    });

    it('should return a new assertion with flags copied over', function () {
      let assertion1 = expect('x');
      let assertion2 = assertion1.x();

      chai.config.proxyExcludedKeys.push('nodeType');

      // Checking if a new assertion was returned
      expect(assertion1).to.not.be.equal(assertion2);

      // Check if flags were copied
      assertion2.checkFlags();

      // Checking if it's really an instance of an Assertion
      expect(assertion2).to.be.instanceOf(assertionConstructor);

      // Test chaining `.length` after a method to guarantee it is not a function's `length`
      expect('x').to.be.x().length.above(0);

      // Ensure that foo returns an Assertion (not a function)
      expect(expect('x').x()).to.be.an.instanceOf(assertionConstructor);

      if (typeof Object.setPrototypeOf === 'function') {
        expect(expect('x').x).to.be.an.instanceOf(assertionConstructor);
      }
    });

    it('overwriteChainableMethod sets `ssfi` when `lockSsfi` isn\'t set', function () {
      let origAssertion = expect('x');
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      let newAssertion = origAssertion.to.be.x();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.not.equal(newSsfi);
    });

    it('overwriteChainableMethod doesn\'t set `ssfi` when `lockSsfi` is set', function () {
      let origAssertion = expect('x');
      let origSsfi = utils.flag(origAssertion, 'ssfi');

      utils.flag(origAssertion, 'lockSsfi', true);

      let newAssertion = origAssertion.to.be.x();
      let newSsfi = utils.flag(newAssertion, 'ssfi');

      expect(origSsfi).to.equal(newSsfi);
    });
  });

  it('compareByInspect', function () {
    chai.use(function (_chai, _) {
      let cbi = _.compareByInspect;

      // "'c" is less than "'d"
      expect(cbi('cat', 'dog')).to.equal(-1);
      expect(cbi('dog', 'cat')).to.equal(1);
      expect(cbi('cat', 'cat')).to.equal(1);

      // "{ cat: [ [ 'dog', 1" is less than "{ cat [ [ 'dog', 2"
      expect(cbi({'cat': [['dog', 1]]}, {'cat': [['dog', 2]]})).to.equal(-1);
      expect(cbi({'cat': [['dog', 2]]}, {'cat': [['dog', 1]]})).to.equal(1);

      // "Symbol(c" is less than "Symbol(d"
      expect(cbi(Symbol('cat'), Symbol('dog'))).to.equal(-1);
      expect(cbi(Symbol('dog'), Symbol('cat'))).to.equal(1);
    });
  });

  describe('getOwnEnumerablePropertySymbols', function () {
    let gettem;

    beforeEach(function () {
      chai.use(function (_chai, _) {
        gettem = _.getOwnEnumerablePropertySymbols;
      });
    });

    it('returns an empty array if no symbols', function () {
      let obj = {}
        , cat = 'cat';

      obj[cat] = 42;

      expect(gettem(obj)).to.not.include(cat);
    });

    it('returns enumerable symbols only', function () {
      let cat = Symbol('cat')
        , dog = Symbol('dog')
        , frog = Symbol('frog')
        , cow = 'cow'
        , obj = {};

      obj[cat] = 'meow';
      obj[dog] = 'woof';

      Object.defineProperty(obj, frog, {
        enumerable: false,
        value: 'ribbit'
      });

      obj[cow] = 'moo';

      expect(gettem(obj)).to.have.same.members([cat, dog]);
    });
  });

  describe('getOwnEnumerableProperties', function () {
    let gettem;

    beforeEach(function () {
      chai.use(function (_chai, _) {
        gettem = _.getOwnEnumerableProperties;
      });
    });

    it('returns enumerable property names if no symbols', function () {
      let cat = 'cat'
        , dog = 'dog'
        , frog = 'frog'
        , obj = {};

      obj[cat] = 'meow'
      obj[dog] = 'woof';

      Object.defineProperty(obj, frog, {
        enumerable: false,
        value: 'ribbit'
      });

      expect(gettem(obj)).to.have.same.members([cat, dog]);
    });

    it('returns enumerable property names and symbols', function () {
      let cat = Symbol('cat')
        , dog = Symbol('dog')
        , frog = Symbol('frog')
        , bird = 'bird'
        , cow = 'cow'
        , obj = {};

      obj[cat] = 'meow';
      obj[dog] = 'woof';
      obj[bird] = 'chirp';

      Object.defineProperty(obj, frog, {
        enumerable: false,
        value: 'ribbit'
      });

      Object.defineProperty(obj, cow, {
        enumerable: false,
        value: 'moo'
      });

      expect(gettem(obj)).to.have.same.members([cat, dog, bird]);
    });
  });

  describe('proxified object', function () {
    let proxify;

    beforeEach(function () {
      chai.use(function (_chai, _) {
        proxify = _.proxify;
      });
    });

    it('returns property value if an existing property is read', function () {
      let pizza = proxify({mushrooms: 42});

      expect(pizza.mushrooms).to.equal(42);
    });

    it('returns property value if an existing property is read when nonChainableMethodName is set', function () {
      let bake = function () {};
      bake.numPizzas = 2;

      let bakeProxy = proxify(bake, 'bake');

      expect(bakeProxy.numPizzas).to.equal(2);
    });

    it('throws invalid property error if a non-existent property is read', function () {
      let pizza = proxify({});

      expect(function () {
        pizza.mushrooms;
      }).to.throw('Invalid Chai property: mushrooms');
    });

    it('throws invalid use error if a non-existent property is read when nonChainableMethodName is set', function () {
      let bake = proxify(function () {}, 'bake');

      expect(function () {
        bake.numPizzas;
      }).to.throw('Invalid Chai property: bake.numPizzas. See docs for proper usage of "bake".');
    });

    it('suggests a fix if a non-existent prop looks like a typo', function () {
      let pizza = proxify({foo: 1, bar: 2, baz: 3});

      expect(function () {
        pizza.phoo;
      }).to.throw('Invalid Chai property: phoo. Did you mean "foo"?');
    });

    it('doesn\'t take exponential time to find string distances', function () {
      let pizza = proxify({veryLongPropertyNameWithLotsOfLetters: 1});

      expect(function () {
        pizza.extremelyLongPropertyNameWithManyLetters;
      }).to.throw(
        'Invalid Chai property: extremelyLongPropertyNameWithManyLetters'
      );
    });

    it('doesn\'t suggest properties from Object.prototype', function () {
      let pizza = proxify({string: 5});
      expect(function () {
        pizza.tostring;
      }).to.throw('Invalid Chai property: tostring. Did you mean "string"?');
    });

    it('doesn\'t suggest internally properties', function () {
      let pizza = proxify({flags: 5, __flags: 6});
      expect(function () {
        pizza.___flags; // 3 underscores; closer to '__flags' than 'flags'
      }).to.throw('Invalid Chai property: ___flags. Did you mean "flags"?');
    });

    // .then is excluded from property validation for promise support
    it('doesn\'t throw error if non-existent `then` is read', function () {
      let pizza = proxify({});

      expect(function () {
        pizza.then;
      }).to.not.throw();
    });
  });

  describe('addLengthGuard', function () {
    let fnLengthDesc = Object.getOwnPropertyDescriptor(function () {}, 'length');
    if (!fnLengthDesc.configurable) return;

    let addLengthGuard;

    beforeEach(function () {
      chai.use(function (_chai, _) {
        addLengthGuard = _.addLengthGuard;
      });
    });

    it('throws invalid use error if `.length` is read when `methodName` is defined and `isChainable` is false', function () {
      let hoagie = addLengthGuard({}, 'hoagie', false);

      expect(function () {
        hoagie.length;
      }).to.throw('Invalid Chai property: hoagie.length. See docs for proper usage of "hoagie".');
    });

    it('throws incompatible `.length` error if `.length` is read when `methodName` is defined and `isChainable` is true', function () {
      let hoagie = addLengthGuard({}, 'hoagie', true);

      expect(function () {
        hoagie.length;
      }).to.throw('Invalid Chai property: hoagie.length. Due to a compatibility issue, "length" cannot directly follow "hoagie". Use "hoagie.lengthOf" instead.');
    });
  });

  describe("isProxyEnabled", function () {
    let origUseProxy, isProxyEnabled;

    before(function () {
      chai.use(function (_chai, _) {
        isProxyEnabled = _.isProxyEnabled;
      });

      origUseProxy = chai.config.useProxy;
    });

    beforeEach(function () {
      chai.config.useProxy = true;
    });

    after(function () {
      chai.config.useProxy = origUseProxy;
    });

    it("returns true if Proxy and Reflect are defined, and useProxy is true", function () {
      expect(isProxyEnabled()).to.be.true;
    });

    it("returns false if Proxy and Reflect are defined, and useProxy is false", function () {
      chai.config.useProxy = false;

      expect(isProxyEnabled()).to.be.false;
    });
  });

  describe('getOperator', function() {
    it('Must return operator if the "operator" flag is set', function() {
      chai.use(function(_chai, _) {
        expect(_.getOperator({}, [])).to.equal(undefined);
        expect(_.getOperator({}, [null, null, null])).to.equal(undefined);

        let obj = {};
        _.flag(obj, 'operator', 'my-operator');
        expect(_.getOperator(obj, [])).to.equal('my-operator');
      });
    });

    it('Must return undefined if message is partial assertions', function() {
      chai.use(function(_chai, _) {
        expect(
          _.getOperator({}, [null, 'to have the same ordered', null, 'test'])
        ).to.equal(undefined);
      });
    });

    it('Must return deepStrictEqual if "expected" is a object and assertion is for equal', function() {
      chai.use(function(_chai, _) {
        let expected = Object.create({
          dummyProperty1: 'dummyProperty1',
          dummyProperty2: 'dummyProperty2',
          dummyProperty3: 'dummyProperty3'
        });

        let obj = {};
        _.flag(obj, 'negate', false);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('deepStrictEqual');
      });
    });

    it('Must return deepStrictEqual if "expected" is a function and assertion is for equal', function() {
      chai.use(function(_chai, _) {
        /**
         *
         */
        function expected () {
          this.prop = 'prop';
        }

        let obj = {};
        _.flag(obj, 'negate', false);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('deepStrictEqual');
      });
    });

    it('Must return deepStrictEqual if "expected" is an array and assertion is for equal', function() {
      chai.use(function(_chai, _) {
        let expected = [
          'item 1'
        ];

        let obj = {};
        _.flag(obj, 'negate', false);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('deepStrictEqual');
      });
    });

    it('Must return strictEqual if "expected" is a string and assertion is for equal', function() {
      chai.use(function(_chai, _) {
        let expected = 'someString';

        let obj = {};
        _.flag(obj, 'negate', false);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} equal to #{exp}',
            'expect #{this} not equal to #{exp}',
            expected
          ])
        ).to.equal('strictEqual');
      });
    });

    it('Must return notDeepStrictEqual if "expected" is a object and assertion is for inequality', function() {
      chai.use(function(_chai, _) {
        let expected = Object.create({
          dummyProperty1: 'dummyProperty1',
          dummyProperty2: 'dummyProperty2',
          dummyProperty3: 'dummyProperty3'
        });

        let obj = {};
        _.flag(obj, 'negate', true);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('notDeepStrictEqual');
      });
    });

    it('Must return notDeepStrictEqual if "expected" is a function and assertion is for inequality', function() {
      chai.use(function(_chai, _) {
        /**
         *
         */
        function expected () {
          this.prop = 'prop';
        }

        let obj = {};
        _.flag(obj, 'negate', true);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('notDeepStrictEqual');
      });
    });

    it('Must return notDeepStrictEqual if "expected" is an array and assertion is for inequality', function() {
      chai.use(function(_chai, _) {
        let expected = [
          'item 1'
        ];

        let obj = {};
        _.flag(obj, 'negate', true);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} deep equal to #{exp}',
            'expect #{this} not deep equal to #{exp}',
            expected
          ])
        ).to.equal('notDeepStrictEqual');
      });
    });

    it('Must return notStrictEqual if "expected" is a string and assertion is for inequality', function() {
      chai.use(function(_chai, _) {
        let expected = 'someString';

        let obj = {};
        _.flag(obj, 'negate', true);

        expect(
          _.getOperator(obj, [
            null,
            'expect #{this} equal to #{exp}',
            'expect #{this} not equal to #{exp}',
            expected
          ])
        ).to.equal('notStrictEqual');
      });
    });
  });

  describe('eventEmitter', function() {
    let eventHandler = null;

    beforeEach(function() {
      if (eventHandler) {
        chai.util.events.removeEventListener("addMethod", eventHandler);
        chai.util.events.removeEventListener("addProperty", eventHandler);
      }
      eventHandler = null;
      delete chai.Assertion.prototype.eqqqual;
      delete chai.Assertion.prototype.tea;
    });

    it('emits addMethod', function () {
      let calledTimes = 0;

      chai.use(function(_chai, _utils) {
        const eqqqual = function (str) {
          let object = _utils.flag(this, 'object');
          new _chai.Assertion(object).to.be.eql(str);
        }
        chai.util.events.addEventListener("addMethod", eventHandler = function({ name, fn }) {
          if (name === 'eqqqual' && fn === eqqqual)
            calledTimes++;
        });
        _chai.Assertion.addMethod('eqqqual', eqqqual);
      });

      expect(calledTimes).to.equal(1);
    });

    it('emits addProperty', function () {
      let calledTimes = 0;

      chai.use(function(_chai, _utils) {
        const getter = function () {
          return 'chai';
        }
        chai.util.events.addEventListener("addProperty", eventHandler = function({ name, fn }) {
          if (name === 'tea' && fn === getter)
            calledTimes++;
        });
        _chai.Assertion.addProperty('tea', getter);

      });

      expect(calledTimes).to.equal(1);
    });

    it('emits addChainableMethod', function () {
      let calledTimes = 0;

      chai.use(function(_chai, _utils) {
        const method = function () {
          new chai.Assertion(this._obj).to.be.equal('x');
        }
        const _chainingBehavior = function () {
          if (this._obj === Object(this._obj)) {
            this._obj.__x = 'X!'
          }
        }

        chai.util.events.addEventListener("addChainableMethod", eventHandler = function({ name, fn, chainingBehavior }) {
          if (name === 'x' && fn === method && chainingBehavior === _chainingBehavior)
            calledTimes++;
        });
        _chai.Assertion.addChainableMethod('x',
          method
        , _chainingBehavior
        )

      });

      expect(calledTimes).to.equal(1);
    });
  });
});
