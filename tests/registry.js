var assert = require('assert'),
    registry = require('../lib/registry'),
    mockery = require('mockery');


describe('registry', function () {
    describe('split()', function () {
        it('should sanitize bad version data.', function () {
            var shelljs = require('./shelljs');

            assert.ok(shelljs.versions['0.0.1alpha1']);
            assert.ok(shelljs.versions['0.0.2pre1']);
            assert.ok(shelljs.versions['0.0.4pre1']);
            assert.ok(shelljs.versions['0.0.5pre1']);
            assert.ok(shelljs.versions['0.0.5pre2']);
            assert.ok(shelljs.versions['0.0.5pre3']);
            assert.ok(shelljs.versions['0.0.5pre4']);

            var results = registry.split(shelljs);

            assert.ok(results.json.versions['0.0.1-alpha1']);
            assert.ok(results.json.versions['0.0.2-pre1']);
            assert.ok(results.json.versions['0.0.4-pre1']);
            assert.ok(results.json.versions['0.0.5-pre1']);
            assert.ok(results.json.versions['0.0.5-pre2']);
            assert.ok(results.json.versions['0.0.5-pre3']);
            assert.ok(results.json.versions['0.0.5-pre4']);
        });
    });

    describe('get()', function () {
        it('should retrieve valid data from the default registry', function (done) {
            registry.get({id: 'async'}, function (err, json, change) {
                assert.ok(!err);
                assert.equal(json.name, 'async');
                assert.deepEqual(change, {id: 'async'});
                done();
            });
        });
    });

    describe('get() retries', function () {
        var invocations = 0;
        var requestMock = {
            get: function(opts, cb) {
                invocations++

                assert.deepEqual(opts, {
                    url: 'https://replicate.npmjs.com/registry/async',
                    json: true,
                    headers: {
                        'user-agent': 'npm-registry-follower'
                    }
                });

                if (invocations === 1) {
                    return cb(new Error('Aaaargh'));
                }

                cb(null, null, require('./async.json'));
            }
        };

        before(function () {
            mockery.registerMock('request', requestMock);
            mockery.enable({
                useCleanCache: true,
                warnOnReplace: false,
                warnOnUnregistered: false
            });
            registry = require('../lib/registry');
        });

        after(function () {
            mockery.deregisterAll();
            mockery.disable();
        });

        it('should retry when getting data fails', function (done) {
            registry.get({id: 'async'}, function (err, json, change) {
                assert.ok(!err);
                assert.equal(json.name, 'async');
                assert.deepEqual(change, {id: 'async'});
                assert.equal(invocations, 2)
                done();
            }, 5);
        });
    })
});
