var app = angular.module('poteauxErdfCtrl');


/*
 * configuration des routes
 */
app.config(function($routeProvider){
    $routeProvider
        .when('/:appName/edit/poteauxerdf', {
            controller: 'poteauxErdfEditCtrl',
            templateUrl: 'js/templates/poteauxErdf/edit.htm'
        })
        .when('/:appName/edit/poteauxerdf/:id', {
            controller: 'poteauxErdfEditCtrl',
            templateUrl: 'js/templates/poteauxErdf/edit.htm'
        })
        .when('/:appName/poteauxerdf/:id', {
            controller: 'poteauxErdfDetailCtrl',
            templateUrl: 'js/templates/poteauxErdf/detail.htm'
        });
});


/*
 * controleur pour l'affichage basique des détails 
 */
app.controller('poteauxErdfDetailCtrl', function($scope, $rootScope, $routeParams, $location, $filter, dataServ, mapService, configServ, userMessages, storeFlag){

    $scope._appName = $routeParams.appName;
    $scope.schemaUrl = $scope._appName + '/config/poteauxerdf/detail';
    $scope.dataUrl = $scope._appName + '/poteauxerdf/' + $routeParams.id;
    $scope.dataId = $routeParams.id;
    $scope.updateUrl = '#/' + $scope._appName + '/edit/poteauxerdf/' + $routeParams.id;

    $scope.$on('display:init', function(ev, data){
        mapService.selectItem(parseInt($routeParams.id), 'poteauxerdf');
        $scope.title = 'Poteau de type ' + data.type_poteau_erdf;
    });

    // Ajout la possibilité de supprimer un élément en mode détail
    if($routeParams.id){
        $scope.saveUrl = $scope._appName + '/poteauxerdf/' + $routeParams.id;
    }
    else{
        $scope.saveUrl = $scope._appName + '/poteauxerdf';
        $scope.data = {}
    } 
    $scope.$on('form:delete', function(ev, data){

        userMessages.successMessage = 'le poteau  ' + data.id + ' a été supprimé.'
        dataServ.forceReload = true;
        $location.url($scope._appName + '/poteauxerdf/');
    });

});

/*
 * controleur pour l'édition 
 */
app.controller('poteauxErdfEditCtrl', function($scope, $rootScope, $routeParams, $location, $filter, dataServ, mapService, configServ, userMessages, storeFlag){

    $scope._appName = $routeParams.appName;
    $scope.configUrl = $scope._appName + '/config/poteauxerdf/form';

    if($routeParams.id){
        $scope.saveUrl = $scope._appName + '/poteauxerdf/' + $routeParams.id;
        $scope.dataUrl = $scope._appName + '/poteauxerdf/' + $routeParams.id;
        $scope.data = {__origin__: {geom: $routeParams.id}};
    }
    else{
        $scope.saveUrl = $scope._appName + '/poteauxerdf';
        $scope.data = {}
    }

    $scope.$on('form:init', function(ev, data){
        if(data.id){
        $scope.title = "Modification du poteau n° " + data.id;
        }
        else{
            $scope.title = "Nouveau poteau";
        }
    });

    $scope.$on('form:cancel', function(ev, data){
        $location.url($scope._appName + '/poteauxerdf/');
    });

    $scope.$on('form:create', function(ev, data){
        userMessages.successMessage = 'le poteau ERDF de type ' + data.type_poteau_erdf + ' a été créé avec succès.'
        $location.url($scope._appName + '/poteauxerdf/' + data.id);
    });

    $scope.$on('form:update', function(ev, data){
        userMessages.successMessage = 'le poteau ERDF de type ' + data.type_poteau_erdf + ' a été mis à jour avec succès.'
        $location.url($scope._appName + '/poteauxerdf/' + data.id);
    });

    $scope.$on('form:delete', function(ev, data){
        userMessages.successMessage = 'le poteau ERDF ' + data.type_poteau_erdf + ' a été supprimé.'
        dataServ.forceReload = true;
        $location.url($scope._appName + '/poteauxerdf/');
    });
});

