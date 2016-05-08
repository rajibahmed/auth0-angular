
    angular.module('auth0', ['auth0.service', 'auth0.utils'])
        .run(["auth", function(auth) {
            auth.hookEvents();
        }]);

