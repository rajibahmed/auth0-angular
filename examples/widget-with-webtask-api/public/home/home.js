angular.module( 'sample.home', [
'auth0'
])
.controller( 'HomeCtrl', function HomeController( $scope, auth, $http, $location, store ) {

  $scope.auth = auth;

  $scope.callApi = function (type) {
    // Just call the API as you'd do using $http
    $http({
      url: 'https://wt-dev2.it.auth0.com:8721/api/run/filearts/api/' + type + '/quote?webtask_no_cache=1',
      method: 'GET'
    }).then(function(res) {
      alert('Sending some Chuck your way.');
    }, function(response) {
      if (response.status == 0) {
        alert("Please download the API seed so that you can call it.");
      }
      else {
        alert(response.data);
      }
    });
  };

  $scope.logout = function() {
    auth.signout();
    store.remove('profile');
    store.remove('token');
    $location.path('/login');
  };

});
