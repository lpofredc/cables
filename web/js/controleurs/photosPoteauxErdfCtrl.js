var app = angular.module('photosPoteauxErdfCtrl');


/*
 * configuration des routes
 */
app.config(function($routeProvider){
    $routeProvider
        .when('/:appName/edit/photospoteauxerdf/:id', {
            controller: 'photosPoteauxErdfEditCtrl',
            templateUrl: 'js/templates/photosPoteauxErdf/edit.htm'
        })
        .when('/:appName/edit/poteauxerdf/photospoteauxerdf/:id_inventaire_poteau_erdf', {
            controller: 'photosPoteauxErdfEditCtrl',
            templateUrl: 'js/templates/photosPoteauxErdf/edit.htm'
        })
        .when('/:appName/photospoteauxerdf/:id', {
            controller: 'photosPoteauxErdfDetailCtrl',
            templateUrl: 'js/templates/photosPoteauxErdf/detail.htm'
        });
});

/*
 * controleur pour l'affichage basique des détails 
 */
app.controller('photosPoteauxErdfDetailCtrl', function($scope, $rootScope, $routeParams, $location, $filter, dataServ, mapService, configServ, userMessages, storeFlag){

    $scope._appName = $routeParams.appName;
    $scope.schemaUrl = $scope._appName + '/config/photospoteauxerdf/detail';
    $scope.dataUrl = $scope._appName + '/photospoteauxerdf/' + $routeParams.id;
    $scope.dataId = $routeParams.id;
    $scope.updateUrl = '#/' + $scope._appName + '/edit/photospoteauxerdf/' + $routeParams.id;

    $scope.$on('display:init', function(ev, data){
        $scope.title = 'Photo n°' + data.id + '  du poteau Enedis ' + data.inventaire_poteau_erdf;
        $scope.cheminPhoto = data.cheminPhoto;
    });

    // Affichage photo dans modal avec plugin colorbox (voir js/lib/colorbox-1.6.4)
    // Zoom et déplacement sur chaque photo avec plugin wheelzoom (voir js/lib/wheelzoom-master)
    $(document).ready(function () {
        console.log('ready');
        // Exécution colorbox sur objet du DOM avec attr class photo-detail
        $(".photo-detail-tronc").colorbox(
            {
                // Dimension de la modal
                width: '800px',
                height: '600px',
                // Sur chargement complet des photos dans modal
                onComplete: function(){
                    // Recherche des éléments du DOM dont attr class = cboxPhoto
                    // => doit ressortir que les photos dans la modal
                    var img = document.querySelector('[class*="cboxPhoto"]');
                    // Exécution du plugin wheelzoom pour zoom et déplacement dans image
                    wheelzoom(img);
                }
            }
        );
    });

    // Ajout la possibilité de supprimer un élément en mode détail
    if($routeParams.id){
        $scope.saveUrl = $scope._appName + '/photospoteauxerdf/' + $routeParams.id;
    }
    else{
        $scope.saveUrl = $scope._appName + '/photospoteauxerdf';
        $scope.data = {}
    } 
    $scope.$on('form:delete', function(ev, data){
        userMessages.successMessage = 'La photo du poteau Enedis ' + data.idInventairePoteauErdf + ' a été supprimée.'
        dataServ.forceReload = true;
        $location.url($scope._appName + '/photospoteauxerdf/');
    });

});

/*
 * controleur pour l'édition 
 */
app.controller('photosPoteauxErdfEditCtrl', function($scope, $rootScope, $routeParams, $location, FileUploader, $filter, dataServ, mapService, configServ,userServ, userMessages, storeFlag, FileUploader){
    $scope._appName = $routeParams.appName;
    $scope.configUrl = $scope._appName + '/config/photospoteauxerdf/form';
    if($routeParams.id){
        $scope.saveUrl = $scope._appName + '/photospoteauxerdf/' + $routeParams.id;
        $scope.dataUrl = $scope._appName + '/photospoteauxerdf/' + $routeParams.id;
        $scope.data = {};
    }
    else{
        $scope.saveUrl = $scope._appName + '/photospoteauxerdf';
        $scope.data = {
            idInventairePoteauErdf: $routeParams.id_inventaire_poteau_erdf            
        };
    }    
    
    $scope.$on('form:init', function(ev, data){
        if(data.id){
        $scope.title = "Modification de la photo" + data.id;
        
        }
        else{
            $scope.title = "Ajout d'une nouvelle photo";
        }
    });

    $scope.$on('form:cancel', function(ev, data){
        if(data.id){
            $location.url($scope._appName + '/poteauxerdf/' + data.id);
        }
        else{
            $location.url($scope._appName + '/poteauxerdf/' + data.idInventairePoteauErdf);
        }
    });

    $scope.$on('form:create', function(ev, data){
        userMessages.successMessage = 'La photo du poteau Enedis ' + data.idInventairePoteauErdf + ' a été créée avec succès.'
        $location.url($scope._appName + '/photospoteauxerdf/' + data.id);
    });

    $scope.$on('form:update', function(ev, data){
        userMessages.successMessage = 'La photo du poteau Enedis ' + data.idInventairePoteauErdf + ' a été mise à jour avec succès.'
        $location.url($scope._appName + '/photospoteauxerdf/' + data.id);
    });

    $scope.$on('form:delete', function(ev, data){
        userMessages.successMessage = 'La photo du poteau Enedis ' + data.idInventairePoteauErdf + ' a été supprimée.'
        dataServ.forceReload = true;
        $location.url($scope._appName + '/poteauxerdf/' + data.idInventairePoteauErdf);
    });
});
