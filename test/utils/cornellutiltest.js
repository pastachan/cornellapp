/**
 * @fileoverview Test file for the cornellutil.js util module.
 */

var assert = require('assert'),
	cornellutil = require('../../app/utils/cornellutil');

describe('cornellutil', function() {
	it('should have an fetchName method', function() {
		assert.equal(typeof cornellutil, 'object');
		assert.equal(typeof cornellutil.fetchName, 'function');
	});
	it('fetchName(\'\') should equal null', function(done) {
		cornellutil.fetchName('', function(name) {
			assert.equal(name, null);
			done();
		});
	});
	it('fetchName(\'8s2dw\') should equal null', function(done) {
		cornellutil.fetchName('8s2dw', function(name) {
			assert.equal(name, null);
			done();
		});
	});
	it('fetchName(\'adc237\') should equal \'Austin Dzan-Hei Chan\'',
		function(done) {
			cornellutil.fetchName('adc237', function(name) {
				assert.equal(name, 'Austin Dzan-Hei Chan');
				done();
			});
		});
	it('fetchName(\'jar475\') should equal \'Josh Richardson\'',
		function(done) {
			cornellutil.fetchName('jar475', function(name) {
				assert.equal(name, 'Josh Richardson');
				done();
			});
		});
});