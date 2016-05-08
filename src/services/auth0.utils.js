
    angular.module('auth0.utils', [])
        .provider('authUtils', function() {
            var Utils = {
                capitalize: function(string) {
                    return string ? string.charAt(0).toUpperCase() + string.substring(1).toLowerCase() : null;
                },
                fnName : function(fun) {
                    var ret = fun.toString();
                    ret = ret.substr('function '.length);
                    ret = ret.substr(0, ret.indexOf('('));
                    return ret ? ret.trim() : ret;
                }
            };

            angular.extend(this, Utils);

            this.$get = ["$rootScope", "$q", function($rootScope, $q) {
                var authUtils = {};
                angular.extend(authUtils, Utils);

                authUtils.safeApply = function(fn) {
                    var phase = $rootScope.$root.$$phase;
                    if(phase === '$apply' || phase === '$digest') {
                        if(fn && (typeof(fn) === 'function')) {
                            fn();
                        }
                    } else {
                        $rootScope.$apply(fn);
                    }
                };

                authUtils.callbackify = function (nodeback, success, error, self) {
                    if (angular.isFunction(nodeback)) {
                        return function (args) {
                            args = Array.prototype.slice.call(arguments);
                            var callback = function (err, response, etc) {
                                if (err) {
                                    error && error(err);
                                    return;
                                }
                                // if more arguments then turn into an array for .spread()
                                etc = Array.prototype.slice.call(arguments, 1);
                                success && success.apply(null, etc);
                            };
                            if (success || error) {
                                args.push(authUtils.applied(callback));
                            }
                            nodeback.apply(self, args);
                        };
                    }
                };

                authUtils.promisify = function (nodeback, self) {
                    if (angular.isFunction(nodeback)) {
                        return function (args) {
                            args = Array.prototype.slice.call(arguments);
                            var dfd = $q.defer();
                            var callback = function (err, response, etc) {
                                if (err) {
                                    dfd.reject(err);
                                    return;
                                }
                                // if more arguments then turn into an array for .spread()
                                etc = Array.prototype.slice.call(arguments, 1);
                                dfd.resolve(etc.length > 1 ? etc : response);
                            };

                            args.push(authUtils.applied(callback));
                            nodeback.apply(self, args);
                            // spread polyfill only for promisify
                            dfd.promise.spread = dfd.promise.spread || function (fulfilled, rejected) {
                                    return dfd.promise.then(function (array) {
                                        return Array.isArray(array) ? fulfilled.apply(null, array) : fulfilled(array);
                                    }, rejected);
                                };
                            return dfd.promise;
                        };
                    }
                };

                authUtils.applied = function(fn) {
                    // Adding arguments just due to a bug in Auth0.js.
                    return function (err, response) {
                        // Using variables so that they don't get deleted by UglifyJS
                        err = err;
                        response = response;
                        var argsCall = arguments;
                        authUtils.safeApply(function() {
                            fn.apply(null, argsCall);
                        });
                    };
                };

                return authUtils;
            }];



        });
