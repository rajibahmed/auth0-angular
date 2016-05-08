
angular.module('auth0.directives', ['auth0.service'])
    .directive('ifUser', ["$rootScope", function($rootScope){
        return {
            link: function(scope, element){
                $rootScope.$watch('profile',function(userProfile){
                    if(userProfile){
                        element.removeClass('ng-hide');
                    }else{
                        element.addClass('ng-hide');
                    }
                });
            }
        };
    }]);

