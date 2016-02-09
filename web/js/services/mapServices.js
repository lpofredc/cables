app = angular.module('mapServices');

/*
 * * #1 - configuration des types couches de bases == voir js/resource
 */
app.factory('LeafletServices', ['$http', function($http) {
    return {

        // changement du nom de "layer" en "couche"
        couche : {},

        loadData : function(layerdata) {
            this.couche = {};
            this.couche.name = layerdata.name; // nom de la couche
            this.couche.active = layerdata.active; // true ou false pour activer le fond par default

            if (layerdata.type == 'tileLayer' || layerdata.type == 'ign') {
                if ( layerdata.type == 'ign') {
                    url = 'https://gpp3-wxs.ign.fr/' + layerdata.key + '/geoportail/wmts?LAYER='+layerdata.layer+'&EXCEPTIONS=text/xml&FORMAT=image/jpeg&SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetTile&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}';
                }
                else {
                    url = layerdata.url;
                }
                this.couche.map = new L.TileLayer(url,layerdata.options);
            }
            else if (layerdata.type == 'wms') {
                this.couche.map = L.tileLayer.wms(layerdata.url,layerdata.options);
            }
            return this.couche;
        }
    };
}]);

/*
 * * #2 - Service cartographique
 */
app.service('mapService', function($rootScope, $routeParams, $loading, $q, $timeout, configServ, dataServ, LeafletServices, defaultColorService, changeColorService, storeFlag, selectedItemService) {

    /*
     * Private variables or functions
     */

    var map;

    var geom;

    var geoms = [];

    var empriseInit;

    var tileLayers = {}; // couche pour les fonds de référence

    var currentSel;

    var currentBaseLayer = null;

    var editLayer;

    var self;

    /*
     * Récupération de l'url de données avec getUrl de configServ
     * Url fourni dans les contôles des base (exemple : cablesControllers.js)
     */
    var loadMapConfig = function() {
        configServ.getUrl('js/resources/defaultMap.json', function(res) {
            resource = res[0];
            //Chargement des fonds de référence : layers ==> baselayers définis defaultMap.json
            configServ.get('map:currentLayer', function(_curlayer){
                currentBaseLayer = _curlayer;
            });

            // Ajout des couches sur la carte
            resource.layers.baselayers.forEach(function(_layer, name){
                var layerData = LeafletServices.loadData(_layer);
                tileLayers[layerData.name] = layerData.map;
                if(currentBaseLayer){
                    if(layerData.name == currentBaseLayer){
                        layerData.map.addTo(map);
                    }
                } else {
                    if(layerData.active){
                        layerData.map.addTo(map);
                        currentBaseLayer = layerData.map;
                    }
                }
            });

            // Vue par défaut de la carte
            empriseInit = [resource.center.lat, resource.center.lng]

            // Vue au premier chargement de l'appli
            map.setView(empriseInit, resource.center.zoom);
        });
    };

    /*
     * Ajout des controls (zoom, scale, etc.) à la carte.
     */
    var addControls = function() {

        // Ajout d'un panneau de type sidebar pour contenir la légende
        var sidebar = L.control.sidebar('legendblock', {
            closeButton: true,
            position: 'left'
        });
        map.addControl(sidebar);

        // bouton pour revenir à l'emprise de départ
        L.easyButton({
            position:"topright",
            states: [{
                icon: 'glyphicon glyphicon-home',
                title: 'Emprise initiale',
                onClick: function(control) {
                    map.setView(empriseInit, 8);
                }
            }]
        }).addTo(map);

        // Légende Leaflet
        layerControl = L.control.layers(tileLayers, null, { collapsed: false});

        // Ajout de la légende Leaflet sur la carte
        layerControl.addTo(map);
        // Suppression du conteneur de la légande Leaflet par défaut
        layerControl._container.remove();
        // Mise en place des couches dans la légende personnalisée : voir template-url ==> map.htm
        document.getElementById('baselayers').appendChild(layerControl.onAdd(map));

        //Ajout d'une l'échelle
        L.control.scale().addTo(map);
    };

    /*
     * Changement de couleur lorsqu'un élément est sélectionné sur la carte et la liste
     * Parameters :
     * - item : un élément (géométrique et attributaire) d'un ensemble de données métier
     * - _status : booléen pour changement de couleur et d'icônes sur sélection de l'objet
     */
    var changeColorItem = function(item, _status) {
        // Récupération des couleurs et icons initiales
        var iconElec             = defaultColorService.iconElec();               // 1- mortalités par électrocution
        var iconPerc             = defaultColorService.iconPerc();               // 2- mortalités par percussion
        var zs1                  = defaultColorService.zs1();                    // 3- zones sensibles : niveau  sensibilité 1
        var zs2                  = defaultColorService.zs2();                    // 4- zones sensibles : niveau  sensibilité 2
        var zs3                  = defaultColorService.zs3();                    // 5- zones sensibles : niveau  sensibilité 3
        var poRisqueEleve        = defaultColorService.poteauxErdfRisqueEleve();          // 6- poteaux à risques élevés
        var poRisqueSecondaire   = defaultColorService.poteauxErdfRisqueSecondaire();     // 7- poteaux à risques secondaires
        var poNonRisque          = defaultColorService.poteauxErdfPeuPasRisque();            // 8- poteaux à non risques
        var eqPoteau             = defaultColorService.eqPoteau();               // 9- équipements poteaux
        var eqTroncon            = defaultColorService.eqTroncon();              // 10- équipements tronçons
        var tronRisqueEleve      = defaultColorService.tronRisqueEleve();        // 11- tronçons risques élevés
        var tronRisqueSecondaire = defaultColorService.tronRisqueSecondaire();   // 12 - tronçons risques secondaires
        var tronNonRisque        = defaultColorService.tronNonRisque();          // 13 - tronçons non risques
        var zOffset              = 0;

var iconelecpink;
                                                    // position de l'élément avant click
        if (_status) {
            // Changement de couleurs et icons au click
            iconElec             = changeColorService.iconElec();
            // iconelecpink = iconElec;
            iconPerc             = changeColorService.iconPerc();
            zs1                  = changeColorService.zs1();
            zs2                  = changeColorService.zs2();
            zs3                  = changeColorService.zs3();
            poRisqueEleve        = changeColorService.poRisqueEleve();
            poRisqueSecondaire   = changeColorService.poRisqueSecondaire();
            poNonRisque          = changeColorService.poNonRisque();
            eqPoteau             = changeColorService.eqPoteau();
            eqTroncon            = changeColorService.eqTroncon();
            tronRisqueEleve      = changeColorService.tronRisqueEleve();
            tronRisqueSecondaire = changeColorService.tronRisqueSecondaire();
            tronNonRisque        = changeColorService.tronNonRisque();
            zOffset              = 1000;
        } try {
            if(item.feature.properties.cause_mortalite === 'électrocution') {
                item.setIcon(iconElec);
            }
            else if(item.feature.properties.cause_mortalite === 'percussion') {
                item.setIcon(iconPerc);
            }
            else if(item.feature.properties.risquePoteau === 'Risque élevé') {
                item.setIcon(poRisqueEleve);
            }
            else if(item.feature.properties.risquePoteau === 'Risque secondaire') {
                item.setIcon(poRisqueSecondaire);
            }
            else if(item.feature.properties.risquePoteau === 'Peu ou pas de risque') {
                item.setIcon(poNonRisque);
            }
            if(item.feature.properties.cat === 'eqpoteauxerdf') {
                item.setIcon(eqPoteau);
            }
            if(item.feature.properties.cat === 'eqtronconserdf'){
                item.setStyle(eqTroncon);
            }
            if(item.feature.properties.cat === 'zonessensibles'){
                switch (item.feature.properties.niveau_sensibilite) {
                    case 1:
                        item.setStyle(zs1);
                    break;
                    case 2:
                        item.setStyle(zs2);
                    break;
                    case 3:
                        item.setStyle(zs3);
                    break;
                }

            }
            switch(item.feature.properties.risqueTroncon){
                case 'Risque élevé':
                    item.setStyle(tronRisqueEleve);
                break;
                case 'Risque secondaire':
                    item.setStyle(tronRisqueSecondaire);
                break;
                case 'Peu ou pas de risque':
                    item.setStyle(tronNonRisque);
                break;
            }

            item.setZIndexOffset(zOffset);
        }
        catch(e){
        }
    };

    /*
     * Chargement des données métiers
     * Parameters:
     * - category : la catégorie métier
     * - force : si on veut forcer le rechargement de la couche métier
     */
    var loadCategoryData = function(subLayer, category, force) {
        $loading.start('map-loading');
        var deferred = $q.defer();
        if (this.tabThemaData[category].loaded) { // loaded est une propriété booléenne du feature
            // s'assurer que la fonction a retourné la promise avant que la promise soit résolue = $timeout
            $timeout(function() {
                deferred.resolve();
            }, 0);
        } else {
            this.tabThemaData[category].loaded = true;
            if (force !== undefined) {
                // suppression de toutes les layers dans un featureGroup donné
                this.clear(category);
            }
            dataServ.get("cables/" + category,
                angular.bind(this, function(resp) {
                    resp.forEach(angular.bind(this, function(item) {
                        // addGeom est une fn publique. Si privée supprimé le angular.bind
                        this.addGeom(item, subLayer, category);
                    }));
                    deferred.resolve();
                }),
                function() {
                    // en cas d'erreur remettre le loaded à false
                },
                force
            );

        }
        return deferred.promise;
    };

    return {
        /*
         * Public properties or methods
         */

        /*
         * Tableau des couches métier
         */
        tabThemaData : {
            "zonessensibles" : L.featureGroup(),
            "mortalites" : L.featureGroup(),
            "tronconserdf": L.featureGroup(),
            "poteauxerdf": L.featureGroup(),
            "eqtronconserdf": L.featureGroup(),
            "eqpoteauxerdf": L.featureGroup(),
            "nidifications": L.featureGroup(),
            "obsClasse2": L.featureGroup(),
            "obsClasse3": L.featureGroup(),
            "observations": L.featureGroup(),
            "erdfappareilcoupure": L.featureGroup(),
            "erdfconnexionaerienne": L.featureGroup(),
            "erdfparafoudre": L.featureGroup(),
            "erdfposteelectrique": L.featureGroup(),
            "erdfremonteeaerosout": L.featureGroup(),
            "erdftronconaerien": L.featureGroup(),
            "ogmcablesremonteesmecaniques": L.featureGroup(),
            "ogmdomainesskiables": L.featureGroup(),
            "ogmtronconsdangereux": L.featureGroup(),
            "ogmtronconsvisualises": L.featureGroup(),
            "ogmtronconsvisualisesdangereux": L.featureGroup(),
            "rtelignes": L.featureGroup(),
            "rtepostes": L.featureGroup(),
            "rtepoteaux": L.featureGroup(),
            "communes": L.featureGroup()
        },

        /*
         * Tableau de gestion de la visibilité des couches et sous-couches dans légende
         */
        pictoLayer : {
                "communes": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdfappareilcoupure": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdfconnexionaerienne": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdfparafoudre": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdfposteelectrique": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdfremonteeaerosout": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "erdftronconaerien": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "ogmcablesremonteesmecaniques": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "ogmdomainesskiables": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "ogmtronconsdangereux": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "ogmtronconsvisualises": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "ogmtronconsvisualisesdangereux": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "rtelignes": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "rtepostes": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "rtepoteaux": {
                    "mainLayer": "css/img/couche_non_visible.png"
                },
                "zonessensibles": {
                    "mainLayer": "css/img/couche_visible.png"
                },
                "mortalites": {
                    "mainLayer": "css/img/couche_non_visible.png",
                    "subLayer": {
                        "mortalitesPercussions": "css/img/couche_non_visible.png",
                        "mortalitesElectrocutions": "css/img/couche_non_visible.png"
                    }
                },
                "tronconserdf": {
                    "mainLayer": "css/img/couche_visible.png",
                    "subLayer": {
                        "tronconsErdfRisqueEleve": "css/img/couche_visible.png",
                        "tronconsErdfRisqueSecondaire": "css/img/couche_visible.png",
                        "tronconsErdfPeuPasRisque": "css/img/couche_visible.png"
                    }
                },
                "poteauxerdf": {
                    "mainLayer": "css/img/couche_visible.png",
                    "subLayer": {
                        "poteauxErdfRisqueEleve": "css/img/couche_visible.png",
                        "poteauxErdfRisqueSecondaire": "css/img/couche_visible.png",
                        "poteauxErdfPeuPasRisque": "css/img/couche_visible.png"
                    }
                },
                "equipementstronconserdf": {
                    "mainLayer": "css/img/couche_visible.png"
                },
                "equipementspoteauxerdf": {
                    "mainLayer": "css/img/couche_visible.png"
                },
                "nidifications": {
                    "mainLayer": "css/img/couche_visible.png",
                    "subLayer": {
                        "nidificationsGypaete": "css/img/couche_non_visible.png",
                        "nidificationsAigle": "css/img/couche_non_visible.png",
                        "nidificationsGrandDuc": "css/img/couche_non_visible.png",
                        "nidificationsFaucon": "css/img/couche_non_visible.png"
                    }
                },
                "observations": {
                    "mainLayer": "css/img/couche_non_visible.png",
                    "subLayer": {
                        "observationsNombre020": "css/img/couche_non_visible.png",
                        "observationsNombre2040": "css/img/couche_non_visible.png",
                        "observationsSup40": "css/img/couche_non_visible.png"
                    }
                }
            },

        /*
         * Initialisation et affichage de la carte avec tout ce qu'elle contient
         * Parameters :
         * - elementId : nom de la div contenant la carte
         */
        initMap: function(elementId) {
            map = L.map(elementId, {
                maxZoom: 18,
                fullscreenControl:true,
                // Ajout de l'option plein écran
                fullscreenControlOptions:{
                    position:'topright',
                    title: 'Afficher en plein écran !'
                }
            });

            loadMapConfig();
            addControls();

            // detect any change in selection, then zoom on item and highlight
            // it
            $rootScope.$watchCollection(function() {
                return selectedItemService;
            }, angular.bind(this, function(newVal, oldVal) {
                // don't take first call into account
                if (newVal == oldVal) {
                    return;
                }
                if (newVal) {
                    this.zoomAndHighlightItem(selectedItemService[0]);
                }
            }));

            return map;
        },

        /*
         * Récupération des couches visibles après filtre depuis tableau de données
         */
        getVisibleItems: function() {
            var bounds = map.getBounds();
            var visibleItems = [];
            geoms.forEach(function(item){
                try{
                    var _coords = item.getLatLng();
                }
                catch(e){
                    var _coords = item.getLatLngs();
                }
                try{
                    if(bounds.intersects(_coords)){
                        visibleItems.push(item.feature.properties.id);
                    }
                }
                catch(e){
                    if(bounds.contains(_coords)){
                        visibleItems.push(item.feature.properties.id);
                    }
                }
            });

            return visibleItems;
        },

        /*
         * Mise en service des couches de référence raster
         */
        getTileLayers: function() {
            return tileLayers;
        },

        /*
         * Mise en service des couches métiers
         */
        getLayer:  function(layer) {
            return this.tabThemaData[layer];
        },

        /*
         * Mise en service des contrôles de la carte
         */
        getLayerControl: function() {
            return layerControl;
        },

        /*
         * Mise en service de la carte
         */
        getMap: function() {
            return map;
        },

        /*
         * Mise en service du tableau de couches Leaflet GeoJSON
         * *** A SUPPRIMER *** => voir issue #110
         */
        getGeoms: function() {
            return geoms;
        },

        /*
         * Ajout (affichage) des couches métiers sur la carte
         * Parameters :
         * - layer : Couche métier
         */
        showLayer: function(subLayer, category, force) {
            var deferred = $q.defer();
            var promise = loadCategoryData.call(this, subLayer, category, force);
            promise.then(
                angular.bind(this, function() {
                    map.addLayer(this.tabThemaData[category]);
                    if (subLayer === 'mortalites' || 'poteauxerdf' || 'tronconserdf' || 'nidifications' || 'observations') {
                        this.changeVisibilityLayer(category, subLayer);
                    }
                    // map.addLayer(this.tabThemaData[category]);
                    deferred.resolve();
                    $loading.finish('map-loading');
                })
            );
            return deferred.promise;
        },

        /*
         * Suppression (désaffichage) des couches métiers sur la carte
         * Parameters :
         * - layer : Couche métier
         */
        hideLayer: function(layer) {
            map.removeLayer(this.tabThemaData[layer]);
        },

        /*
         * Vérification de l'affichage des couches métiers sur la carte
         * Parameters :
         * - layer : Couche métier
         */
        layerIsVisible: function(layer) {
            return map.hasLayer(this.tabThemaData[layer]);
        },

        /*
         * Visibilité - Interaction entre les objets sur la carte et les sous-couches dans la légende
         * La visibilité des objets est appliquée au niveau des styles des objets
         * Parameters :
         * - category : nom de la catégorie métier de chaque sous-couche
         * - subLayer : nom de la sous-couche sur laquelle joue la visibilité des objets associés
         */
        changeVisibilityLayer: function(category, subLayer) {
            self = this;
            var res = this.tabThemaData[category].getLayers();
            res.forEach(function(item) {
                // MORTALITES
                switch (item.feature.properties.cause_mortalite) {
                    case 'percussion':
                        configServ.get('legendLayer:mortalites:mortalitesPercussions:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.poNoVisible());
                                item.options.clickable = false;
                            }
                            // else {
                            //     item.setIcon(defaultColorService.iconPerc());
                            //     item.options.clickable = true;
                            // }
                        });
                    break;
                    case 'électrocution':
                        configServ.get('legendLayer:mortalites:mortalitesElectrocutions:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.poNoVisible());
                            }
                            // else {
                            //     if (selectedItemService[0] !== undefined) {
                            //         if (item.feature.properties.id === selectedItemService[0].feature.properties.id) {
                            //             item.setIcon(changeColorService.iconElec());
                            //         }
                            //         else {
                            //             console.log('dans électrocution 1e else');
                            //             item.setIcon(defaultColorService.iconElec());
                            //         }
                            //     }
                            //     else {
                            //         console.log('dans électrocution 2e else');
                            //         item.setIcon(defaultColorService.iconElec());
                            //     }
                            // }
                        });
                    break;
                }

                // TRONCONS ERDF
                switch(item.feature.properties.risqueTroncon){
                    case 'Risque élevé':
                        configServ.get('legendLayer:tronconserdf:tronconsErdfRisqueEleve:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.tronNoVisible());
                            }
                            else {
                                item.setStyle(defaultColorService.tronRisqueEleve());
                            }
                        });
                    break;
                    case 'Risque secondaire':
                        configServ.get('legendLayer:tronconserdf:tronconsErdfRisqueSecondaire:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.tronNoVisible());
                            }
                            else {
                                item.setStyle(defaultColorService.tronRisqueSecondaire());
                            }
                        });
                    break;
                    case 'Peu ou pas de risque':
                        configServ.get('legendLayer:tronconserdf:tronconsErdfPeuPasRisque:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.tronNoVisible());
                            }
                            else {
                                item.setStyle(defaultColorService.tronNonRisque());
                            }
                        });
                    break;
                }
                // POTEAUX ERDF
                switch (item.feature.properties.risquePoteau) {
                    case 'Risque élevé':
                        configServ.get('legendLayer:poteauxerdf:poteauxErdfRisqueEleve:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.poNoVisible());
                            }
                            else {
                                item.setIcon(defaultColorService.poteauxErdfRisqueEleve());
                            }
                        });
                    break;
                    case 'Risque secondaire':
                        configServ.get('legendLayer:poteauxerdf:poteauxErdfRisqueSecondaire:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.poNoVisible());
                            }
                            else {
                                item.setIcon(defaultColorService.poteauxErdfRisqueSecondaire());
                            }
                        });
                    break;
                    case 'Peu ou pas de risque':
                        configServ.get('legendLayer:poteauxerdf:poteauxErdfPeuPasRisque:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.poNoVisible());
                            }
                            else {
                                item.setIcon(defaultColorService.poteauxErdfPeuPasRisque());
                            }
                        });
                    break;
                }
                // NIDIFICATIONS RAPACES
                switch (item.feature.properties.nom_espece) {
                    case 'Gypaète barbu':
                        configServ.get('legendLayer:nidifications:nidificationsGypaete:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.noPolyStyle());
                            }
                            else {
                                item.setStyle(angular.extend({color:'#FC7F3C'}, defaultColorService.polyStyle()));
                            }
                        });
                    break;
                    case 'Aigle royal':
                        configServ.get('legendLayer:nidifications:nidificationsAigle:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.noPolyStyle());
                            }
                            else {
                                item.setStyle(angular.extend({color:'#F4FF3A'}, defaultColorService.polyStyle()));
                            }
                        });
                    break;
                    case 'Grand Duc d\'Europe':
                        configServ.get('legendLayer:nidifications:nidificationsGrandDuc:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.noPolyStyle());
                            }
                            else {
                                item.setStyle(angular.extend({color:'#D400FF'}, defaultColorService.polyStyle()));
                            }
                        });
                    break;
            		   case 'Faucon pélerin':
                        configServ.get('legendLayer:nidifications:nidificationsFaucon:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setStyle(defaultColorService.noPolyStyle());
                            }
                            else {
                                item.setStyle(angular.extend({color:'#EFA0FF'}, defaultColorService.polyStyle()));
                            }
                        });
                    break;
                }

                // OBSERVATIONS VAUTOURS
                var nb = item.feature.properties.nombre;
                switch (true) {
                    case (nb<20):
                        configServ.get('legendLayer:observations:observationsNombre020:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.noObs());
                            }
                            else {
                                item.setIcon(defaultColorService.obsClasse1());
                            }
                        });
                    break;
                    case (nb>=20 && nb<40):
                        configServ.get('legendLayer:observations:observationsNombre2040:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.noObs());
                            }
                            else {
                                item.setIcon(defaultColorService.obsClasse2());
                            }
                        });
                    break;
                    case (nb>=40):
                        configServ.get('legendLayer:observations:observationsSup40:visibility', function(visibility){
                            if(visibility === 'novisible'){
                                item.setIcon(defaultColorService.noObs());
                            }
                            else {
                                item.setIcon(defaultColorService.obsClasse3());
                            }
                        });
                    break;
                }
            });
        },

        /*
         * Permet de zoomer sur un objets quel que soit son type (point, ligne et polygone)
         * Parameters :
         * - item : un élément (géométrique et attributaire) d'un ensemble de données métier
         */    
        zoomToItem: function(item) {
            try {
                // centre la carte sur l'objet point sélectionné
                map.setView(item.getLatLng(), Math.max(map.getZoom(), 13));
            }
            catch(e) {
                // centre la carte sur l'objet ligneou polygone sélectionné
                map.fitBounds(item.getBounds());
            }
        },

        /*
         * Actions faites (zoom et couleur de sélection) sur la sélection d'un élément sur la carte ou dans un tableau
         * Parameters :
         * - item : la géométrie à mettre en évidence dans la carte
         */
        zoomAndHighlightItem: function(item) {
            // sélection courante = pas de changement de couleur
            if (currentSel) {
                changeColorItem(currentSel, false);
            }
            currentSel = item;
            this.zoomToItem(item);
            // changement de couleur sur item sélectionné
            changeColorItem(item, true);
            return item;
        },

        /*
         * Création des couches Leaflet (featureGroup) depuis le json renvoyé par Symfony pour une catégorie métier
         * Parameters :
         * - jsonData : Json utilisé pour créer la couche métier Leaflet
         * - categoryData : nom de la catégorie métier utilisée qui va être créée
         */
        addGeom: function(jsonData, filter, categoryData) {
            // console.log('addgeom');
            var geom = L.GeoJSON.geometryToLayer(jsonData); // la couche GeoJSON
            geom.feature = jsonData;
            var cat = jsonData.properties.cat; // récupération de la catégorie

            // Au click: Zoom et affiche le label de la couche s'il y'en a
            geom.on('click', function(e){
                $rootScope.$apply(function() {
                    selectedItemService.length = 0;
                    selectedItemService.push(geom);
                });
            });
            if(jsonData.properties.geomLabel){
                geom.bindPopup(jsonData.properties.geomLabel);
            }
            try{
                geom.setZIndexOffset(0);
            }
            catch(e){}
            /*
             * Distribution des couleurs aux différentes couches
             */

             // Distributions des styles pour les couches non gérées
             switch (jsonData.properties.cat) {
                case'erdfappareilcoupure':
                    geom.setIcon(defaultColorService.erdfac())
                    break;
                case'erdfconnexionaerienne':
                    geom.setIcon(defaultColorService.erdfca())
                    break;
                case'erdfposteelectrique':
                    geom.setIcon(defaultColorService.erdfpe())
                    break;
                case'erdfremonteeaerosout':
                    geom.setIcon(defaultColorService.erdfra())
                    break;
                 case'erdfparafoudre':
                    geom.setIcon(defaultColorService.erdfp())
                    break;
                case'erdftronconaerien':
                    geom.setStyle(defaultColorService.erdfta())
                    break;
                case'ogmcablesremonteesmecaniques':
                    geom.setStyle(defaultColorService.ogmrm())
                    break;
                case'ogmtronconsdangereux':
                    geom.setStyle(defaultColorService.ogmtd())
                    break;
                case'ogmtronconsvisualises':
                    geom.setStyle(defaultColorService.ogmtv())
                    break;
                case'ogmtronconsvisualisesdangereux':
                    geom.setStyle(defaultColorService.ogmtvd())
                    break;
                case'rtelignes':
                    geom.setStyle(defaultColorService.rtel())
                    break;
                case'rtepostes':
                    geom.setIcon(defaultColorService.rtep())
                    break;
                case'rtepoteaux':
                    geom.setIcon(defaultColorService.rtepot())
                    break;
                case'communes':
                    geom.setStyle(defaultColorService.com())
                    break;
             }

            // Zones sensibles: Couleurs en fonctions du niveau de sensibilité
            if(jsonData.properties.cat === 'zonessensibles'){
                switch (jsonData.properties.niveau_sensibilite) {
                    case 1:
                        geom.setStyle(angular.extend(defaultColorService.zs1(), defaultColorService.zsStyle()))
                    break;
                    case 2:
                        geom.setStyle(angular.extend(defaultColorService.zs2(), defaultColorService.zsStyle()))
                    break;
                    case 3:
                        geom.setStyle(angular.extend(defaultColorService.zs3(), defaultColorService.zsStyle()))
                    break;
                }
                geom.bindLabel(jsonData.properties.nom_zone_sensible, { noHide: true });
            }

// MORTALITES
            // MORTALITES ELECTROCUTION
            // geom.feature.properties.selection = true;
            if(jsonData.properties.cause_mortalite === 'électrocution'){
                // 1 - page avec tableau = URL avec catégorie SANS id objet
                if ($routeParams.id === undefined) {
                    // console.log('addgeom 1');
                    // 2 - pas d'objet sélection = selectedItemService[0] vide
                    // => tous les objets avec couleur par défaut
                    if (selectedItemService[0] === undefined) {
                        // console.log('addgeom 2');
                        geom.setIcon(defaultColorService.iconElec());
                    }
                    // 2' - objet sélectionné = selectedItemService[0] rempli
                    else {
                        // console.log('addgeom 2\'');
                        // 3 - objet dans tabThemaData = objet dans selectedItemService[0]
                        // => l'objet avec couleur de sélection
                        if (geom.feature.properties.id === selectedItemService[0].feature.properties.id) {
                            // console.log('addgeom 3');
                            selectedItemService.length = 0;
                            selectedItemService.push(geom);
                            geom.setIcon(changeColorService.iconElec());
                        }
                        // 3' - tous les autres objets avec couleur par défaut
                        else {
                            // console.log('addgeom 3\'');
                            geom.setIcon(defaultColorService.iconElec());
                        }
                    }
                }
                // 1' - page Détail ou Edition = URL avec catégorie AVEC id objet             
                else {
                    // console.log('addgeom 1\'');
                    // 4 - objet dans tabThemaData = objet avec id dans URL
                    // => l'objet avec couleur de sélection
                    if (geom.feature.properties.id === parseInt($routeParams.id)) {
                        // console.log('addgeom 4');
                        selectedItemService.length = 0;
                        selectedItemService.push(geom);
                        geom.setIcon(changeColorService.iconElec());
                    }
                    // 4' - tous les autres objets avec couleur par défaut
                    else {
                        // console.log('addgeom 4\'');
                        geom.setIcon(defaultColorService.iconElec());
                    }
                }
            }

            // MORTALITES PERCUSSION
            else if(jsonData.properties.cause_mortalite === 'percussion'){
                // 1 - page avec tableau = URL avec catégorie SANS id objet
                if ($routeParams.id === undefined) {
                    // console.log('addgeom 1');
                    // 2 - pas d'objet sélection = selectedItemService[0] vide
                    // => tous les objets avec couleur par défaut
                    if (selectedItemService[0] === undefined) {
                        // console.log('addgeom 2');
                        geom.setIcon(defaultColorService.iconPerc());
                    }
                    // 2' - objet sélectionné = selectedItemService[0] rempli
                    else {
                        // console.log('addgeom 2\'');
                        // 3 - objet dans tabThemaData = objet dans selectedItemService[0]
                        // => l'objet avec couleur de sélection
                        if (geom.feature.properties.id === selectedItemService[0].feature.properties.id) {
                            // console.log('addgeom 3');
                            geom.setIcon(changeColorService.iconPerc());
                        }
                        // 3' - tous les autres objets avec couleur par défaut
                        else {
                            // console.log('addgeom 3\'');
                            geom.setIcon(defaultColorService.iconPerc());
                        }
                    }
                }
                // 1' - page Détail ou Edition = URL avec catégorie AVEC id objet             
                else {
                    // console.log('addgeom 1\'');
                    // 4 - objet dans tabThemaData = objet avec id dans URL
                    // => l'objet avec couleur de sélection
                    if (geom.feature.properties.id === parseInt($routeParams.id)) {
                        // console.log('addgeom 4');
                        selectedItemService.length = 0;
                        selectedItemService.push(geom);
                        geom.setIcon(changeColorService.iconPerc());
                    }
                    // 4' - tous les autres objets avec couleur par défaut
                    else {
                        // console.log('addgeom 4\'');
                        geom.setIcon(defaultColorService.iconPerc());
                    }
                }
            }

// TRONCONS A RISQUE
            if(jsonData.properties.cat === 'tronconserdf'){
                switch (jsonData.properties.risqueTroncon) {
                    case 'Risque élevé':
                        geom.setStyle(angular.extend({color:'#DE0101', weight: 7}, defaultColorService.lineStyle()))
                    break;
                    case 'Risque secondaire':
                        geom.setStyle(angular.extend({color:'#ECA500', weight: 7}, defaultColorService.lineStyle()))
                    break;
                    case 'Peu ou pas de risque':
                        geom.setStyle(angular.extend({color:'#2B4EDC', weight: 7}, defaultColorService.lineStyle()))
                    break;
                }
            };
            // Poteaux à risque: Couleur en fonction du niveau de risque
            if(jsonData.properties.cat === 'poteauxerdf'){
                switch (jsonData.properties.risquePoteau) {
                    case 'Risque élevé':
                        geom.setIcon(defaultColorService.poteauxErdfRisqueEleve())
                    break;
                    case 'Risque secondaire':
                        geom.setIcon(defaultColorService.poteauxErdfRisqueSecondaire())
                    break;
                    case 'Peu ou pas de risque':
                        geom.setIcon(defaultColorService.poteauxErdfPeuPasRisque())
                    break;
                }
            };

           // Equipements tronçons
            if(jsonData.properties.cat === 'eqtronconserdf'){
                geom.setStyle(defaultColorService.eqTroncon());
            }
            // Equipements poteaux
            if(jsonData.properties.cat === 'eqpoteauxerdf'){
                geom.setIcon(defaultColorService.eqPoteau())
            }

            // Sites de nidification: Couleur en fonction de l'espece
            if(jsonData.properties.cat === 'nidifications'){
               switch (jsonData.properties.nom_espece) {

                    case 'Aigle royal':
                        geom.setStyle(angular.extend({color:'#F4FF3A'}, defaultColorService.polyStyle()))
                    break;
                    case 'Grand Duc d\'Europe':
                        geom.setStyle(angular.extend({color:'#D400FF'}, defaultColorService.polyStyle()))
                    break;
                    case 'Faucon pélerin':
                        geom.setStyle(angular.extend({color:'#EFA0FF'}, defaultColorService.polyStyle()))
                    break;
                    case 'Gypaète barbu':
                        geom.setStyle(angular.extend({color:'#FC7F3C'}, defaultColorService.polyStyle()))
                    break;
                }
            }

            // observations : classes en fonction du nb d'individus
            if(jsonData.properties.cat === 'observations'){
                var nb = jsonData.properties.nombre;
                switch (true) {
                    case (nb<20):
                        geom.setIcon(defaultColorService.obsClasse1())
                    break;
                    case (nb>=20 && nb<40):
                        geom.setIcon(defaultColorService.obsClasse2())
                    break;
                    case (nb>=40):
                        geom.setIcon(defaultColorService.obsClasse3())
                    break;
                }
            };

            // Ajout des couches dans le tableau des couches geoms
            // A SUPPRIMER A TERME => voir issue #110
            geoms.push(geom);

            // Ajout des couches GeoJSON dans les couches métiers
            this.tabThemaData[categoryData].addLayer(geom);

            return geom;
        },

        /*
         * Suppression de tous les objets dans un featureGroup donné
         * Parameters :
         * - category : nom de la catégorie métier utilisée pour la suppression des objets associés
         */
        clear: function(category) {
            this.tabThemaData[category].clearLayers();
        },

        /*
         * Suppression de la couche temporaire d'édition des objets des différentes catégories métier
         * Parameters :
         */
        clearEditLayer: function() {
            if(editLayer)
            {
                map.removeLayer(editLayer);
            }
        },

        /*
         * Récupération de la catégorie de la couche temporaire d'édition en cours
         * Parameters :
         * - EditLayerCat : nom de la catégorie métier en cours d'édition
         */
        setEditLayer: function(EditLayerCat) {
            editLayer = EditLayerCat;
        },

        /*
         * Chargement des couches sur la carte depuis tableau de données (clique sur onglet)
         * FIXME
         * Parameters :
         * - pTabClickedValue : valeur de l'nglet sur lequel on a cliqué (=catégorie donnée métier)
         */
        setTabThemaData: function(pTabClickedValue){
            map.addLayer(tabThemaData[pTabClickedValue]);
            document.getElementById(pTabClickedValue).checked = true;
        },

        /*
         * Gestion des couches de référence raster
         * FIXME
         * Parameters :
         * - baseLayer : valeur de l'nglet sur lequel on a cliqué (=catégorie donnée métier)
         */
        setBaseLayer: function(baseLayer) {
            if (currentBaseLayer) {
                map.removeLayer(currentBaseLayer);
            }
            currentBaseLayer = baseLayer;
            baseLayer.addTo(map);
        }
    };
});

 /*
  * * #3 - Directive pour la gestion de la carte Leaflet et des couches
  */
app.directive('leafletMap', function(){
    return {
        restrict: 'A',
        scope: {
            data: '=',
            name: '='
        },
        templateUrl: 'js/templates/display/map.htm',
        controller: function($scope, configServ, mapService, storeFlag) {
            var map = mapService.initMap('mapd');
            var tabThemaData = mapService.tabThemaData;

            $scope.tileLayers = mapService.getTileLayers();

            $scope.selectBaseLayer = function(layer) {
                mapService.setBaseLayer(layer);
            }

            var pictoLayerVisible = "css/img/couche_visible.png";
            var pictoLayerNoVisible = "css/img/couche_non_visible.png";
            var category = $scope.category;
            var filter = $scope.filter;

            // Affectation des pictos de chaque couche à un objet du scope qui sera utilisé dans le template
            $scope.pictoLayer = mapService.pictoLayer;
            
            // gestion affichage des couches et des pictos associés
            $scope.getVisibility = function(category, subLayer){
                // Clic sur le picto oeil VISIBLE de la couche principale (métier) = Passage oeil NON VISIBLE
                if (subLayer === undefined && $scope.pictoLayer[category]["mainLayer"] === pictoLayerVisible) {
                	// Passage couche principale en NON VISIBLE
                	$scope.pictoLayer[category]["mainLayer"] = pictoLayerNoVisible;
                    configServ.put('legendLayer:'+category+':main:visibility', "novisible");
                	mapService.hideLayer(category);

                	// Passage toutes les sous-couches de la catégorie en NON VISIBLE
                    var subLayer = $scope.pictoLayer[category]["subLayer"];
                    for(item in subLayer) {
                        $scope.pictoLayer[category]["subLayer"][item] = pictoLayerNoVisible;
                        configServ.put('legendLayer:'+category+':'+item+':visibility', "novisible");
                    };
                }

                // Clic sur le picto oeil NON VISIBLE de la couche principale (métier) => Passage oeil VISIBLE
                else if (subLayer === undefined && $scope.pictoLayer[category]["mainLayer"] === pictoLayerNoVisible) {
                	// Passage couche principale en VISIBLE
                	$scope.pictoLayer[category]["mainLayer"] = pictoLayerVisible;
                    configServ.put('legendLayer:'+category+':main:visibility', "visible");
                	mapService.showLayer(null, category);

                	// Passage toutes les sous-couches de la catégorie en VISIBLE
                    var subLayer = $scope.pictoLayer[category]["subLayer"];
                    for(item in subLayer) {
                        $scope.pictoLayer[category]["subLayer"][item] = pictoLayerVisible;
                        configServ.put('legendLayer:'+category+':'+item+':visibility', "visible");
                    };
                }

                // Clic sur le picto oeil VISIBLE d'une sous-couche' = Passage oeil NON VISIBLE
                else if (subLayer !== undefined && $scope.pictoLayer[category]["subLayer"][subLayer] === pictoLayerVisible){
                    $scope.pictoLayer[category]["mainLayer"] = pictoLayerNoVisible;
                    configServ.put('legendLayer:'+category+':main:visibility', "novisible");
                    // mapService.hideLayer(category);
                    $scope.pictoLayer[category]["subLayer"][subLayer] = pictoLayerNoVisible;
                    configServ.put('legendLayer:'+category+':'+subLayer+':visibility', "novisible");
                    mapService.showLayer(subLayer, category);
                    // configServ.put('cables/'+category+':ngTable:Filter', '{risquePoteau: "Risque secondaire"}');
                }

                // Clic sur le picto oeil NON VISIBLE d'une sous-couche' = Passage oeil VISIBLE
                else if (subLayer !== undefined && $scope.pictoLayer[category]["subLayer"][subLayer] === pictoLayerNoVisible){
                    $scope.pictoLayer[category]["subLayer"][subLayer] = pictoLayerVisible;
                    configServ.put('legendLayer:'+category+':'+subLayer+':visibility', "visible");
                    mapService.showLayer(null, category);

                    var i = true;
                    var subLayer2 = $scope.pictoLayer[category]["subLayer"];
                    for (item in subLayer2) {
                        if ($scope.pictoLayer[category]["subLayer"][item] !== pictoLayerVisible) {
                            i = false;
                            break;
                        }
                    }
                    // S'il reste une sous-couche non visible la couche principale reste non visible sinon elle s'affiche
                    if (i === false){
                        $scope.pictoLayer[category]["mainLayer"] = pictoLayerNoVisible;
                        configServ.put('legendLayer:'+category+':main:visibility', "novisible");
                    }
                    else {
                    	$scope.pictoLayer[category]["mainLayer"] = pictoLayerVisible;
                        configServ.put('legendLayer:'+category+':main:visibility', "visible");
                    }                  
                }
            }
        }
    };
});

 /*
 * * #5 - Directive qui gère les évenements entre la carte et le tableau de données métier
 */
app.directive('maplist', function($rootScope, $timeout, mapService) {
    return {
        restrict: 'A',
        transclude: true,
        template: '<div><ng-transclude></ng-transclude></div>',
        link: function(scope, elem, attrs){
            // Récupération de l'identificateur d'événements de la liste
            var target = attrs['maplist'];

            // var cat = target.split("/")[1];

            var filterTpl = '<div class="mapFilter"><label> filtrer avec la carte <input type="checkbox" onchange="filterWithMap(this);"/></label></div>';
            scope.mapAsFilter = false;
            scope.toolBoxOpened = true;
            var visibleItems = [];
            /*
             * Initialisation des listeners d'évenements carte
             */
            var connect = function(){

                scope.$on('mapService:pan', function(ev){
                    scope.filter();
                });

                scope.filter = function(){
                    visibleItems = mapService.getVisibleItems();
                    $rootScope.$broadcast(target + ':filterIds', visibleItems, scope.mapAsFilter);
                }

                // Sélection dans la liste
                scope.$on(target + ':ngTable:ItemSelected', function(ev, item, cat){
                    $timeout(function(){
                        try{
                            var geom = mapService.selectItem(item.id, cat);
                            geom.openPopup();
                        }
                        catch(e){}
                    }, 0);
                });

                // Filtrage avec le tableau
                scope.$on(target + ':ngTable:Filtered', function(ev, data){
                    ids = [];
                    data.forEach(function(item){
                        ids.push(item.id);
                    });
                    if(mapService.filterData){
                        mapService.filterData(ids);
                    }
                });

            };

            var _createFilterCtrl = function(){
                var filterCtrl = L.control({position: 'topright'});
                filterCtrl.onAdd = function(map){
                    this._filtCtrl = L.DomUtil.create('div', 'filterBtn');
                    this.update();
                    return this._filtCtrl;
                };
                filterCtrl.update = function(){
                    this._filtCtrl.innerHTML = filterTpl;
                };
                filterCtrl.addTo(mapService.getMap());
            }

            // Fitre avec la carte
            document.filterWithMap = function(elem){
                $rootScope.$apply(function(){
                    scope.mapAsFilter = elem.checked;
                    scope.filter();
                });
            };

            $timeout(function(){
                connect();
            }, 0);

        }
    };
});
