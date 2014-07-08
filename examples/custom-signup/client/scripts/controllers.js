var myApp = angular.module('myApp');

myApp.controller('MenuCtrl', function ($scope, $location) {
  $scope.go = function (target) {
    $location.path(target);
  };
});

myApp.controller('MsgCtrl', function ($scope, auth) {
  $scope.message = '';
});

myApp.controller('RootCtrl', function (auth, $scope) {
  $scope.auth = auth;
});

myApp.controller('LoginCtrl', function (auth, $scope, $location, $http) {
  $scope.user = '';
  $scope.pass = '';

  function onLoginSuccess() {
    $location.path('/');
  }

  function onLoginFailed() {
    alert('Login failed');
  }

  $scope.signup = {user: '', pass: '', favColor: 'red'};
  $scope.doLogin = function () {
    $scope.loading = true;

    auth.signin({
      connection: 'Username-Password-Authentication',
      username:   $scope.user,
      password:   $scope.pass
    })
    .then(onLoginSuccess, onLoginFailed)
    .finally(function () {
      $scope.loading = false;
    });
  };

  $scope.doSignup = function () {
    $http({method: 'POST', url: '/custom-signup',
    data: {
      email:    $scope.signup.user,
      password:     $scope.signup.pass,
      favColor: $scope.signup.favColor
    }})
    .success(function (data, status, headers, config) {
      if (status === 200) {
        auth.signin({
          // Make sure that connection matches your server-side connection id
          connection: 'Username-Password-Authentication',
          username:   $scope.signup.user,
          password:   $scope.signup.pass
        })
        .then(onLoginSuccess, onLoginFailed)
        .finally(function () {
          $scope.loading = false;
        });
      }
    })
    .error(function (data, status, headers, config) {
      alert('Error creating account for user ' + $scope.signup.user + ': '  + data);
    });
  };
});

myApp.controller('LogoutCtrl', function (auth, $scope, $location) {
  auth.signout();
  $location.path('/login');
});
