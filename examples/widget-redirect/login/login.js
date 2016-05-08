angular.module( 'sample')
.controller( 'LoginCtrl', function ( $scope, auth, $rootScope) {
console.log($rootScope.profile);
  $scope.auth = auth;

});
