
    angular.module('auth0.service', ['auth0.utils'])
        .provider('auth', ['authUtilsProvider', function(authUtilsProvider) {
            'ngInject';
            var defaultOptions = {
                callbackOnLocationHash: true
            };
            var config = this;

            var innerAuth0libraryConfiguration = {
                'Auth0': {
                    signin: 'login',
                    signinOnly: 'signinOnly',
                    signup: 'signup',
                    reset: 'changePassword',
                    validateUser: 'validateUser',
                    library: function() {
                        return config.auth0js;
                    },
                    parseOptions: function(options) {
                        var retOptions = angular.copy(options);
                        if (retOptions.authParams) {
                            angular.extend(retOptions, retOptions.authParams);
                            delete retOptions.authParams;
                        }
                        return retOptions;
                    }
                },
                'Auth0Lock': {
                    signin: 'show',
                    signinOnly: 'showSignin',
                    signup: 'signup',
                    reset: 'showReset',
                    library: function() {
                        return config.auth0lib;
                    },
                    parseOptions: function(options) {
                        return angular.copy(options);
                    }
                }
            };

            /*
             *
             * DESCRIPTION: Get a method from the libraries
             *
             * INPUT: method name (string), library name (string)
             * OUTPUT: String
             *
             * */

            function getInnerLibraryMethod(name, libName) {
                libName = libName || config.lib;
                var library = innerAuth0libraryConfiguration[libName].library();
                return library[innerAuth0libraryConfiguration[libName][name]];
            }

            /*
             *
             * DESCRIPTION: Get a config from the libraries
             *
             * INPUT: config name (string), library name (string)
             * OUTPUT: String
             *
             * */
            function getInnerLibraryConfigField(name, libName) {
                libName = libName || config.lib;
                return innerAuth0libraryConfiguration[libName][name];
            }

            /*
             *
             * DESCRIPTION: Returns a constructor: Defaults to a function if provided.
             * Defaults to a Lock if library is included and function is not provided
             *
             * INPUT: function
             * OUTPUT: object
             *
             * */
            function constructorName(fun) {
                if (fun) {
                    return {
                        lib: authUtilsProvider.fnName(fun),
                        constructor: fun
                    };
                }

                /* jshint ignore:start */
                if (null != window.Auth0LockPasswordless) {
                    return {
                        lib: 'Auth0LockPasswordless',
                        constructor: window.Auth0LockPasswordless
                    };
                }
                
                if (null != window.Auth0Lock) {
                    return {
                        lib: 'Auth0Lock',
                        constructor: window.Auth0Lock
                    };
                }

                if (null != window.Auth0) {
                    return {
                        lib: 'Auth0',
                        constructor: window.Auth0
                    };
                }


                if (typeof Auth0Widget !== 'undefined') {
                    throw new Error('Auth0Widget is not supported with this version of auth0-angular' +
                        'anymore. Please try with an older one');
                }

                throw new Error('Cannot initialize Auth0Angular. Auth0Lock or Auth0 must be available');
                /* jshint ignore:end */
            }

            /*
             *
             * DESCRIPTION: Configures provider with provided options
             *
             * INPUT: option (object) and constructor
             *
             * */
            this.init = function(options, Auth0Constructor) {
                if (!options) {
                    throw new Error('You must set options when calling init');
                }
                this.loginUrl = options.loginUrl;
                this.loginUrlParams = options.loginUrlParams;
                this.loginState = options.loginState;
                this.loginStateParams = options.loginStateParams;
                this.clientID = options.clientID || options.clientId;
                var domain = options.domain;
                this.domain = domain;
                this.sso = options.sso;

               
                var constructorInfo = constructorName(Auth0Constructor);
                this.lib = constructorInfo.lib;

                if (constructorInfo.lib === 'Auth0LockPasswordless') {
                    this.auth0lib = new constructorInfo.constructor(this.clientID, domain);
                } else if (constructorInfo.lib === 'Auth0Lock') {
                    this.auth0lib = new constructorInfo.constructor(this.clientID, domain, angular.extend(defaultOptions, options));
                    if(this.auth0lib.getClient) {
                        this.auth0js = this.auth0lib.getClient();
                    }
                    this.isLock = true;
                } else {
                    this.auth0lib = new constructorInfo.constructor(angular.extend(defaultOptions, options));
                    this.auth0js = this.auth0lib;
                    this.isLock = false;
                }


                this.initialized = true;
            };


            this.eventHandlers = {};

            this.on = function(anEvent, handler) {
                if (!this.eventHandlers[anEvent]) {
                    this.eventHandlers[anEvent] = [];
                }
                this.eventHandlers[anEvent].push(handler);
            };


            var events = ['loginSuccess', 'loginFailure', 'logout', 'forbidden', 'authenticated'];
            // var lockEvents = ['show', 'hide'];

            angular.forEach(events, function(anEvent) {
                config['add' + authUtilsProvider.capitalize(anEvent) + 'Handler'] = function(handler) {
                    config.on(anEvent, handler);
                };
            });

            this.$get =
                ['$rootScope', '$q', '$injector', '$window', '$location', 'authUtils', function($rootScope, $q, $injector, $window, $location, authUtils) {
                var auth = {
                    isAuthenticated: false
                };

                $rootScope.isAuthenticated = false;

                var getHandlers = function(anEvent) {
                    return config.eventHandlers[anEvent];
                };

                var callHandler = function(anEvent, locals) {
                    $rootScope.$broadcast('auth0.' + anEvent, locals);
                    angular.forEach(getHandlers(anEvent) || [], function(handler) {
                        $injector.invoke(handler, auth, locals);
                    });
                };


                // SignIn

                var onSigninOk = function(idToken, accessToken, state, refreshToken, profile, isRefresh) {

                  idToken = idToken || (profile ? profile.idToken : null);
                  accessToken = accessToken || (profile ? profile.accessToken : null);
                  state = state || (profile ? profile.state : null);
                  refreshToken = refreshToken || (profile ? profile.refreshToken : null);

                    var profilePromise = auth.getProfile(idToken);

                    var response = {
                        idToken: idToken,
                        accessToken: accessToken,
                        state: state,
                        refreshToken: refreshToken,
                        profile: profile,
                        isAuthenticated: true
                    };

                    $rootScope.isAuthenticated = true;

                    angular.extend(auth, response);
                    callHandler(!isRefresh ? 'loginSuccess' : 'authenticated', angular.extend({
                        profilePromise: profilePromise
                    }, response));

                    return profilePromise;
                };

                function forbidden() {
                    if (config.loginUrl) {
                        $location.path(config.loginUrl, config.loginUrlParams);
                    } else if (config.loginState) {
                        $injector.get('$state').go(config.loginState, config.loginStateParams);
                    } else {
                        callHandler('forbidden');
                    }
                }

                // Redirect mode
                $rootScope.$on('$locationChangeStart', function() {
                    if (!config.initialized) {
                        return;
                    }

                    var hashResult = config.auth0lib.parseHash($window.location.hash);
                    if (!auth.isAuthenticated) {
                        if (hashResult && (hashResult.idToken || hashResult.id_token)) {
                            onSigninOk(hashResult.idToken || hashResult.id_token, hashResult.accessToken || hashResult.access_token, hashResult.state, hashResult.refreshToken || hashResult.refresh_token);
                            return;
                        }
                    }
                });

                $rootScope.$on('auth0.forbiddenRequest', function() {
                    forbidden();
                });

                if (config.loginUrl) {
                    $rootScope.$on('$routeChangeStart', function(e, nextRoute) {
                        if (!config.initialized) {
                            return;
                        }

                        verifyRoute(
                            (nextRoute.$$route && nextRoute.$$route.requiresLogin),
                            e,
                            function(){
                                return JSON.stringify({
                                    redirect_to: {
                                        path: $location.path()
                                    }
                                });
                            },
                            function(){
                                $location.path(config.loginUrl, config.loginUrlParams);
                            }
                        );
                    });
                }


                if (config.loginState) {
                    $rootScope.$on('$stateChangeStart', function(e, to, toParams) {
                        if (!config.initialized) {
                            return;
                        }


                        verifyRoute(
                            (to.data && to.data.requiresLogin),
                            e,
                            function() {
                                return JSON.stringify({
                                    redirect_to: {
                                        state: to.name,
                                        params: toParams
                                    }
                                });
                            },
                            function() {
                                 $injector.get('$state').go(config.loginState, config.loginStateParams);
                            }
                        );
                    });
                }

                    /*jshint latedef: nofunc */

                function verifyRoute(requiresLogin, e, getState, redirectToLogin) {
                    if (!auth.isAuthenticated && !auth.refreshTokenPromise) {
                        if (config.sso) {
                            if (requiresLogin) {e.preventDefault();}
                            config.auth0js.getSSOData(authUtils.applied(function(err, ssoData) {
                                if (ssoData.sso) {
                                    var loginOptions = {
                                        popup: false,
                                        callbackOnLocationHash: true,
                                        connection: ssoData.lastUsedConnection.name,
                                        authParams: {
                                            state: getState()
                                        }
                                    };
                                    callHandler('ssoLogin', { loginOptions: loginOptions });
                                    auth.signin(loginOptions, null, null, 'Auth0');
                                } else if (requiresLogin) {
                                    e.preventDefault();
                                    redirectToLogin();
                                }
                            }));
                        } else if (requiresLogin) {
                            e.preventDefault();
                            redirectToLogin();
                        }
                    }
                }

                // Start auth service

                auth.config = config;

                var checkHandlers = function(options, successCallback) {
                    var successHandlers = getHandlers('loginSuccess');
                    if (!successCallback && !options.username && !options.email && (!successHandlers || successHandlers.length === 0) && config.lib !== 'Auth0Lock') {
                        throw new Error('You must define a loginSuccess handler ' +
                            'if not using popup mode or not doing ro call because that means you are doing a redirect');
                    }
                };


                auth.hookEvents = function() {
                    // Does nothing. Hook events on application's run
                };


                auth.init = angular.bind(config, config.init);

                auth.lockOn = function (event, handler) {
                    var lockEvents = ['show', 'hide', 'error', 'authenticated', 'authorization_error'];
                    if(config.lib === 'Auth0Lock') {
                        if(lockEvents.indexOf(event) !== -1) {
                            var lib = innerAuth0libraryConfiguration[config.lib].library();
                            lib.on(event, handler);
                        } else {
                            throw new Error ('Event \'' + event + '\' does not exist in Lock');
                        }
                    } else {
                        throw new Error ('Lock events are only applicable when using Lock: https://github.com/auth0/lock');
                    }
                };

                /*
                 *
                 * DESCRIPTION: Fetch a delegation token
                 * INPUT: Config object
                 * OUTPUT: Promise
                 *
                 * */
                auth.getToken = function(options) {
                    options = options || { scope: 'openid' };

                    if (!options.id_token && !options.refresh_token) {
                        options.id_token = auth.idToken;
                    }

                    var getDelegationTokenAsync = authUtils.promisify(config.auth0js.getDelegationToken, config.auth0js);

                    return getDelegationTokenAsync(options);
                };

                /*
                 *
                 * DESCRIPTION: Refresh Token
                 * INPUT: token (string)
                 * OUTPUT: Promise
                 *
                 * */
                auth.refreshIdToken = function(refresh_token) {
                    var refreshTokenAsync = authUtils.promisify(config.auth0js.refreshToken, config.auth0js);

                    auth.refreshTokenPromise = refreshTokenAsync(refresh_token || auth.refreshToken).then(function (delegationResult) {
                        return delegationResult.id_token;
                    })['finally'](function() {
                        auth.refreshTokenPromise = null;
                    });

                    return auth.refreshTokenPromise;
                };

                /*
                 *
                 * DESCRIPTION: Renew user's token
                 * INPUT: token (string)
                 * OUTPUT: Promise
                 *
                 * */
                auth.renewIdToken = function(id_token) {
                    var renewIdTokenAsync = authUtils.promisify(config.auth0js.renewIdToken, config.auth0js);

                    return renewIdTokenAsync(id_token || auth.idToken).then(function (delegationResult) {
                        return delegationResult.id_token;
                    });
                };

                /*
                 *
                 * DESCRIPTION: Sign a user in
                 * INPUT: config options, success callback fxn, err callback fxn, library name
                 * The Library name is either 'Auth0' or 'Auth0Lock'
                 *
                 * */
                    
                auth.signin = function(options, successCallback, errorCallback, libName) {
                    options = options || {};
                    checkHandlers(options, successCallback, errorCallback);
                    options = getInnerLibraryConfigField('parseOptions', libName)(options);

                    var signinMethod = getInnerLibraryMethod('signin', libName);
                    var successFn = !successCallback ? null : function(profile, idToken, accessToken, state, refreshToken) {

                        idToken = idToken || profile.idToken;
                        accessToken = accessToken || profile.accessToken;
                        state = state || profile.state;
                        refreshToken = refreshToken || profile.refreshToken;

                        if (!idToken && !angular.isUndefined(options.loginAfterSignup) && !options.loginAfterSignup) {
                            successCallback();
                        } else {
                            onSigninOk(idToken, accessToken, state, refreshToken, profile).then(function(profile) {
                                if (successCallback) {
                                    successCallback(profile, idToken, accessToken, state, refreshToken);
                                }
                            });
                        }
                    };

                    var errorFn = function(err) {
                        callHandler('loginFailure', { error: err });
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    };

                    var signinCall = authUtils.callbackify(signinMethod, successFn, errorFn , innerAuth0libraryConfiguration[libName || config.lib].library());

                    signinCall(options);
                };

                auth.signinOnly = function(options, successCallback, errorCallback, libName) {
                    options = options || {};
                    checkHandlers(options, successCallback, errorCallback);
                    options = getInnerLibraryConfigField('parseOptions', libName)(options);

                    var signinMethod = getInnerLibraryMethod('signinOnly', libName);
                    var successFn = !successCallback ? null : function(profile, idToken, accessToken, state, refreshToken) {
                      if (!idToken && !angular.isUndefined(options.loginAfterSignup) && !options.loginAfterSignup) {
                        successCallback();
                      } else {
                        onSigninOk(idToken, accessToken, state, refreshToken, profile).then(function(profile) {
                          if (successCallback) {
                            successCallback(profile, idToken, accessToken, state, refreshToken);
                          }
                        });
                      }
                    };

                    var errorFn =  function(err) {
                      callHandler('loginFailure', { error: err });
                      if (errorCallback) {
                        errorCallback(err);
                      }
                    };

                    var signinCall = authUtils.callbackify(signinMethod, successFn, errorFn , innerAuth0libraryConfiguration[libName || config.lib].library());

                    signinCall(options);
                };

                /*
                 *
                 * DESCRIPTION: Sign's up a user
                 * INPUT: config options, success callback fxn, err callback fxn
                 *
                 * */

                auth.signup = function(options, successCallback, errorCallback) {
                    options = options || {};
                    checkHandlers(options, successCallback, errorCallback);
                    options = getInnerLibraryConfigField('parseOptions')(options);

                    var successFn = function(profile, idToken, accessToken, state, refreshToken) {
                        if (!angular.isUndefined(options.auto_login) && !options.auto_login) {
                            successCallback();
                        } else {
                            onSigninOk(idToken, accessToken, state, refreshToken, profile).then(function(profile) {
                                if (successCallback) {
                                    successCallback(profile, idToken, accessToken, state, refreshToken);
                                }
                            });
                        }
                    };

                    var errorFn = !errorCallback ? null : function(err) {
                        callHandler('loginFailure', { error: err });
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    };

                    // var auth0lib = config.auth0lib;
                    var signupCall = authUtils.callbackify(getInnerLibraryMethod('signup'),successFn , errorFn, innerAuth0libraryConfiguration[config.lib].library());


                    signupCall(options);
                };

                auth.magicLink = function (successCallback, errorCallback) {
                    var successFn = !successCallback ? null : function(email) {

                        successCallback(email);

                    };

                    var errorFn = !errorCallback ? null : function(err) {
                        callHandler('loginFailure', { error: err });
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    };

                    var magicLinkCall = authUtils.callbackify(config.auth0lib.magiclink, successFn , errorFn, config.auth0lib);

                    magicLinkCall();
                };

                auth.emailCode = function (successCallback, errorCallback) {

                    var successFn = !successCallback ? null : function(profile, id_token, access_token, state, refresh_token) {

                        successCallback(profile, id_token, access_token, state, refresh_token);

                    };

                    var errorFn = !errorCallback ? null : function(err) {
                        callHandler('loginFailure', { error: err });
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    };

                    var emailCodeCall = authUtils.callbackify(config.auth0lib.emailcode, successFn , errorFn, config.auth0lib);

                    emailCodeCall();
                };

                auth.sms = function (successCallback, errorCallback) {

                    var successFn = !successCallback ? null : function(profile, idToken) {

                      successCallback(profile, idToken);

                    };

                    var errorFn = !errorCallback ? null : function(err) {
                        callHandler('loginFailure', { error: err });
                        if (errorCallback) {
                            errorCallback(err);
                        }
                    };

                    var smsCall = authUtils.callbackify(config.auth0lib.sms,successFn , errorFn, config.auth0lib);

                    smsCall();
                };

                /*
                 *
                 * DESCRIPTION: Performs forgot your password flow
                 *
                 * INPUT: config options (object), Callbacks
                 *
                 *
                 * */

                auth.reset = function(options, successCallback, errorCallback) {
                    options = options || {};

                    options = getInnerLibraryConfigField('parseOptions')(options);
                    var auth0lib = config.auth0lib;
                    var resetCall = authUtils.callbackify(getInnerLibraryMethod('reset'), successCallback, errorCallback, auth0lib);

                    resetCall(options);
                };

                auth.validateUser = function(options, successCallback, errorCallback) {
                    options = options || {};

                    options = getInnerLibraryConfigField('parseOptions')(options);
                    var auth0lib = config.auth0lib;
                    var validateUserCall = authUtils.callbackify(getInnerLibraryMethod('validateUser'), successCallback, errorCallback, auth0lib);

                    validateUserCall(options);
                };

                /*
                 *
                 * DESCRIPTION: Sign user out
                 *
                 *
                 * */
                auth.signout = function() {
                    auth.isAuthenticated = false;
                    auth.profile = null;
                    auth.profilePromise = null;
                    auth.idToken = null;
                    auth.state = null;
                    auth.accessToken = null;
                    auth.tokenPayload = null;
                    $rootScope.isAuthenticated = false;
                    callHandler('logout');
                };

                auth.authenticate = function(profile, idToken, accessToken, state, refreshToken) {
                    return onSigninOk(idToken, accessToken, state, refreshToken, profile, true);
                };

                /*
                 *
                 * DESCRIPTION: Fetch user profile
                 *
                 * INPUT: token (string)
                 * OUTPUT: Promise
                 *
                 * */
                auth.getProfile = function(idToken) {
                    var getProfilePromisify = authUtils.promisify(config.auth0lib.getProfile, config.auth0lib);
                    auth.profilePromise = getProfilePromisify(idToken || auth.idToken);
                    return auth.profilePromise.then(function(profile) {
                        auth.profile = profile;
                        return profile;
                    });
                };

                auth.hide = function(callback) {
                    config.auth0lib.hide(callback);
                };

                return auth;
            }];
        }]);
