app = angular.module('mapServices');

/*
 * * #1 - configuration des types couches de bases == voir js/resource
 */
app.factory('LeafletServices', ['$http', function($http) {
    return {

    /* changement du nom de "layer" en "couche" 
    */
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
app.factory('mapService', function(){
    return {};
});

 /*
  * * #3 - Directive pour la gestion de la carte Leaflet et des couches s
  */
app.directive('leafletMap', function(){
    return {
        restrict: 'A',
        scope: {
            data: '=',
        },
        templateUrl: 'js/templates/display/map.htm',
        controller: function($scope, $filter, $q, $rootScope, LeafletServices, mapService,  configServ, dataServ, $timeout, $loading, $routeParams, userServ, storeFlag, loadDataSymf, defaultColorService, changeColorService){
                  

            // Variables globales dans la directive leafletMap
            var map = null; // la carte 
            var zonessensibles = null; // couche de données "Zones sensibles"
            var mortalites = null; // couche de données "mortalités"
            var tronconserdf = null; // couche de données "Tronçons ERDF"
            var poteauxerdf = null; // couche de données "Tronçons ERDF"
            var eqtronconserdf = null; // couche de données "Equipements tronçons ERDF"
            var eqpoteauxerdf = null; // couche de données "Equipements tronçons ERDF"
            var nidifications = null; // couche de données "Sites de nidification"
            var test = null; // couche de données "Observations"
            var obsClasse2 = null; // couche de données "Observations"
            var obsClasse3 = null; // couche de données "Observations"
            var erdfappareilcoupure = null; // couche de référence ERDF
            var erdfconnexionaerienne = null; // couche de référence ERDF
            var erdfparafoudre = null; // couche de référence ERDF
            var erdfposteelectrique = null; // couche de référence ERDF
            var erdfremonteeaerosout = null; // couche de référence ERDF
            var erdftronconaerien = null; // couche de référence ERDF
            var ogmcablesremonteesmecaniques = null; // couche de référence ERDF
            var ogmdomainesskiables = null; // couche de référence ERDF
            var ogmtronconsdangereux = null; // couche de référence ERDF
            var ogmtronconsvisualises = null; // couche de référence ERDF
            var ogmtronconsvisualisesdangereux = null; // couche de référence ERDF
            var rtelignes = null; // couche de référence ERDF
            var rtepostes = null; // couche de référence ERDF
            var rtepoteaux = null; // couche de référence ERDF
            var communes = null; // couche de référence ERDF
            var tileLayers = {}; // couche pour les fonds de référence
            var geoms = []; // tableau des couches Leaflet GeoJSON créées 
            var geom = []; // couche Leaflet GeoJSON
            var currentSel = null; // la géometrie séléctionnée en détail
            var layerControl = null; // couches de contrôle pour la légende Leaflet
            var resource = null;  // couches  de référence dans la carte                    
            
            // Tableau des couches métier             
            var tabThemaData = {
                "zonessensibles" : L.featureGroup(), 
                "mortalites" : L.markerClusterGroup(), 
                "tronconserdf": L.featureGroup(),
                "poteauxerdf": L.featureGroup(),
                "eqtronconserdf": L.featureGroup(),
                "eqpoteauxerdf": L.featureGroup(),
                "nidifications": L.featureGroup(),
                "test": L.polygon([
				        [51.509, -0.08],
				        [51.503, -0.06],
				        [51.51, -0.047]
				    ]),
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
            };
            // Ajout du tableau dans le mapService pour la gestion de l'accrochage des couches ** voir FormDirectives **
            mapService.tabThemaData = tabThemaData 
            
            //Initialisation de la carte et de ses contrôles            
            var initializeCarte = function(configUrl){ 
                var dfd = $q.defer();
                try{
                    map = L.map('mapd', { 
                            maxZoom: 18,
                            fullscreenControl:true, 
                            // Ajout de l'option plein écran 
                            fullscreenControlOptions:{
                                position:'topright',
                                title: 'Afficher en plein écran !',
                            }                           
                          });

                    // Ajout des couches sur la carte
                    for(var key in tabThemaData){
                        tabThemaData[key].addTo(map);
                    }    

                   
                    /* Récupération de l'url de données avec getUrl de configServ
                     * Url fourni dans les contôles des base (exemple : cablesControllers.js)
                     */
                    configServ.getUrl(configUrl, function(res){
                        resource = res[0];
                        //Chargement des fonds de référence : layers ==> baselayers définis defaultMap.json                     
                        var curlayer = null;
                        configServ.get('map:currentLayer', function(_curlayer){
                            curlayer = _curlayer
                        });

                        // Ajout des couches sur la carte
                        resource.layers.baselayers.forEach(function(_layer, name){
                            var layerData = LeafletServices.loadData(_layer);
                            tileLayers[layerData.name] = layerData.map;
                            if(curlayer){
                                if(layerData.name == curlayer){
                                    layerData.map.addTo(map);
                                }
                            }
                            else{
                                if(layerData.active){
                                    layerData.map.addTo(map);
                                }
                            }
                        });

                        // Récupération du fond de référence choisi quand on change de page
                        map.on('baselayerchange', function(ev){
                            $rootScope.$apply(function(){
                                configServ.put('map:currentLayer', ev.name);
                            })
                        });

                        // Vue par défaut de la carte
                        var empriseInit = [resource.center.lat, resource.center.lng] 
                        
                        // Vue au premier chargement de l'appli
                        map.setView(empriseInit, resource.center.zoom);

                        // Ajout d'un panneau de type sidebar pour contenir la légende
                        var sidebar = L.control.sidebar('legendblock', {
                            closeButton: true,
                            position: 'left', 
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

                        // Mise en cache de la vue actuelle 
                        if (!map.restoreView()) {
                            map.setView(empriseInit, resource.center.zoom);
                        }          
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
                        
                        $timeout(function(){
                            $rootScope.$broadcast('map:ready');
                        }, 0);

                        // Fonction qui rempplie le Flag de la couche en fonction de la légende                        
                        $scope.layerToggle = function(){
                            layerClickedValue = event.currentTarget.value;
                            // NOUVELLE FONCTIONNALITE (NF1) : si décision mettre check ou oeil sur onglet dans bloc 'Tableau' pour gérer affichage couche dans carte
                            // Attention : Cette fonctionnalité est développée en partie
                            // var idCheckTab = layerClickedValue+"_tab";
                            if (storeFlag.getFlagLayer(layerClickedValue) === "noLoaded"){
                                loadDataSymf.getThemaData(layerClickedValue);
                                storeFlag.setFlagLayer(layerClickedValue, "cacheChecked");
                            }
                            else if (storeFlag.getFlagLayer(layerClickedValue) === "cacheChecked"){
                                map.removeLayer(tabThemaData[layerClickedValue]);
                                storeFlag.setFlagLayer(layerClickedValue, "cacheUnchecked");
                                // NF1
                                // document.getElementById(idCheckTab).checked = false;
                            }
                            else if (storeFlag.getFlagLayer(layerClickedValue) === "cacheUnchecked"){
                                map.addLayer(tabThemaData[layerClickedValue]);
                                storeFlag.setFlagLayer(layerClickedValue, "cacheChecked");
                            } 
                            // nouvelle méthode pour les sous couches
                            if (storeFlag.getFlagLayer(layerClickedValue) === "subLayer"){
                                storeFlag.setFlagLayer(layerClickedValue, "cacheChecked");
                            }                           
                        };
                       


                        dfd.resolve();
                    });

                }
                catch(e){
                                    
                    geoms.splice(0);
                    dfd.resolve();
                }

                // Récupération des couches visibles après filtre depuis tableau de données
                var getVisibleItems = function(){
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
                };
                mapService.getVisibleItems = getVisibleItems;

                // Mise en service (mapService ) des contrôles de la carte
                var getLayerControl = function(){
                    return layerControl;
                };
                mapService.getLayerControl = getLayerControl;

                // Mise en service (mapService ) des couches métiers 
                var getLayer = function(couches){
                    return tabThemaData[couches];
                };
                mapService.getLayer = getLayer;
              
                // Mise en service (mapService ) de la carte
                var getMap = function(){
                    return map;
                }
                mapService.getMap = getMap;

                // Mise en service (mapService ) du tableau de couches Leaflet GeoJSON           
                var getGeoms = function(){
                    return geoms;
                }
                mapService.getGeoms = getGeoms;

                // Filtres des données depuis tableau
                // Affiche ou masque les couches 
                // var filterData = function(ids){
                //     angular.forEach(geoms, function(geom){                     
                //         if(ids.indexOf(geom.feature.properties.id) < 0){                                    
                //             geom.feature.$shown = false;
                //             for(key in tabThemaData){ 
                //                 if(geom.feature.properties.cat === key) {
                //                     if(tabThemaData[key].hasLayer(geom)){
                //                         tabThemaData[key].removeLayer(geom);
                //                         geom.feature.leafletLayer = key;
                //                     }
                //                 }                                 
                                
                //             }                           
                //         }
                //         else{
                //             if(geom.feature.$shown === false){
                //                 geom.feature.$shown = true;
                //                 if(geom.feature.leafletLayer){
                //                     tabThemaData[geom.feature.leafletLayer].addLayer(geom);
                //                 }
                //             }
                //         }
                //     });
                // };
                // mapService.filterData = filterData;

                // Recentrage des objets (emprise et zoom) quand on clique sur un objet sur la carte
                var getItem = function(_id, pThemaData){
                    var res = geoms.filter(function(item){
                        if (pThemaData !== undefined){
                            if (item.feature.properties.cat == pThemaData){
                                return item.feature.properties.id == _id;
                            }
                        }
                        else{
                            return item.feature.properties.id == _id;
                        } 
                    });             
                    if(res){
                        try{
                            /*
                             * centre la carte sur le point sélectionné
                             */
                            map.setView(res[0].getLatLng(), Math.max(map.getZoom(), 13));
                            return res[0];
                        }
                        catch(e){
                            /*
                             * centre la carte sur la figure sélectionnée
                             */
                            map.fitBounds(res[0].getBounds());
                            return res[0];
                        }
                    }
                    return null;
                };               
                mapService.getItem = getItem;
 
                // Changement de couleur lorsqu'un élément est sélectionné sur la carte et la liste
                var changeColorItem = function(item, _status){
                    // Récupération des couleurs et icons initiales
                    var iconElec             = defaultColorService.iconElec();               // 1- mortalités par électrocution
                    var iconPerc             = defaultColorService.iconPerc();               // 2- mortalités par percussion
                    var zs1                  = defaultColorService.zs1();                    // 3- zones sensibles : niveau  sensibilité 1 
                    var zs2                  = defaultColorService.zs2();                    // 4- zones sensibles : niveau  sensibilité 2 
                    var zs3                  = defaultColorService.zs3();                    // 5- zones sensibles : niveau  sensibilité 3 
                    var poRisqueEleve        = defaultColorService.poRisqueEleve();          // 6- poteaux à risques élevés
                    var poRisqueSecondaire   = defaultColorService.poRisqueSecondaire();     // 7- poteaux à risques secondaires
                    var poNonRisque          = defaultColorService.poNonRisque();            // 8- poteaux à non risques
                    var eqPoteau             = defaultColorService.eqPoteau();               // 9- équipements poteaux
                    var eqTroncon            = defaultColorService.eqTroncon();              // 10- équipements tronçons
                    var tronRisqueEleve      = defaultColorService.tronRisqueEleve();        // 11- tronçons risques élevés 
                    var tronRisqueSecondaire = defaultColorService.tronRisqueSecondaire();   // 12 - tronçons risques secondaires
                    var tronNonRisque        = defaultColorService.tronNonRisque();          // 13 - tronçons non risques
                    var zOffset              = 0;                                            // position de l'élément avant click
                    if(_status){
                        // Changement de couleurs et icons au click
                        iconElec             = changeColorService.iconElec();                   
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
                    }
                    try{
                        if(item.feature.properties.cause_mortalite === 'électrocution'){
                            item.setIcon(iconElec);  
                        }
                        else if(item.feature.properties.cause_mortalite === 'percussion'){
                            item.setIcon(iconPerc); 
                        }
                        else if(item.feature.properties.risquePoteau === 'Risque élevé'){
                            item.setIcon(poRisqueEleve); 
                        }
                        else if(item.feature.properties.risquePoteau === 'Risque secondaire'){
                            item.setIcon(poRisqueSecondaire); 
                        }
                        else if(item.feature.properties.risquePoteau === 'Peu ou pas de risque'){
                            item.setIcon(poNonRisque); 
                        }
                        if(item.feature.properties.cat === 'eqpoteauxerdf'){
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
                mapService.changeColorItem = changeColorItem

                // Applique le changement de couleur (changeColorItem) et le recentrage (getItem)
                var selectItem = function(_id, pThemaData){
                    // alert("dans selectitem");
                    var sel = getItem(_id, pThemaData);
                                        
                    if(currentSel){
                        changeColorItem(currentSel, false);
                    }
                    
                    changeColorItem(sel, true);
                    currentSel = sel;
                    return sel;

                };
                mapService.selectItem = selectItem;

                // Fonction pour créer les couches Leaflet GeoJSON
                addGeom = function(jsonData, layer){
                    var geom = L.GeoJSON.geometryToLayer(jsonData); // la couche GeoJSON
                    geom.feature = jsonData; 
                    var cat = jsonData.properties.cat; // récupération de la catégorie

                    // Au click: Zoom et affiche le label de la couche s'il y'en a
                    geom.on('click', function(e){
                        $rootScope.$apply(
                            $rootScope.$broadcast('mapService:itemClick', geom, cat)    
                        );
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

                    // Mortalités: Couleur des especes en fonction de la cause mortalité
                    if(jsonData.properties.cause_mortalite === 'électrocution'){
                        geom.setIcon(defaultColorService.iconElec());
                    }
                    else if(jsonData.properties.cause_mortalite === 'percussion'){
                        geom.setIcon(defaultColorService.iconPerc());
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

                    // Tronçons à risque: Couleur en fonction du niveau de risque
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

                   // Equipements tronçons
                    if(jsonData.properties.cat === 'eqtronconserdf'){
                        geom.setStyle(defaultColorService.eqTroncon());
                    }
                    // Equipements poteaux
                    if(jsonData.properties.cat === 'eqpoteauxerdf'){
                        geom.setIcon(defaultColorService.eqPoteau())
                    }

                    // Poteaux à risque: Couleur en fonction du niveau de risque
                    if(jsonData.properties.cat === 'poteauxerdf'){
                        switch (jsonData.properties.risquePoteau) {
                            case 'Risque élevé':
                                geom.setIcon(defaultColorService.poRisqueEleve())
                            break;
                            case 'Risque secondaire':
                                geom.setIcon(defaultColorService.poRisqueSecondaire())
                            break;
                            case 'Peu ou pas de risque':
                                geom.setIcon(defaultColorService.poNonRisque())
                            break;
                        }
                    };

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
                    geoms.push(geom);

                    // Ajout des couches GeoJSON dans les couches métiers
                    tabThemaData[layer].addLayer(geom);

                    return geom;
                };
                mapService.addGeom = addGeom;

               

                // Fonction qui vérifie et ajoute la couche si elle est cochée depuis la légende
                displayGeomData = function(pLayerThemaData, pDetails) {
                    var tabFlagLayer = null;
                    tabFlagLayer = storeFlag.getTabFlagLayer();
                    if (pLayerThemaData === "allThemaDataLayer"){
                        for(var key1 in tabFlagLayer){
                            if (tabFlagLayer[key1] === "firstLoad" || tabFlagLayer[key1] === "cacheChecked"){
                                document.getElementById(key1).checked = true;
                                loadDataSymf.getThemaData(key1);
                            }
                            else if (tabFlagLayer[key1] === "cacheUnchecked"){
                                loadDataSymf.getThemaData(key1);
                                document.getElementById(key1).checked = false;
                                map.removeLayer(tabThemaData[key1]);
                                storeFlag.setFlagLayer(key1, "cacheUnchecked");
                            }
                        };
                    }
                    else{
                        for(var key2 in tabFlagLayer){
                            if (key2 !== pLayerThemaData){
                                if (tabFlagLayer[key2] === "cacheChecked"){
                                    // console.log("dans displayGeomData - cacheChecked");
                                    document.getElementById(key2).checked = true;
                                    loadDataSymf.getThemaData(key2);
                                }
                                else if (tabFlagLayer[key2] === "cacheUnchecked"){                                
                                    // console.log("dans displayGeomData - cacheUnchecked");
                                    loadDataSymf.getThemaData(key2);
                                    document.getElementById(key2).checked = false;
                                    map.removeLayer(tabThemaData[key2]);
                                    storeFlag.setFlagLayer(key2, "cacheUnchecked");
                                }
                            }
                        };
                    }
                    // quand on clique sur le détail d'une zone sensible
                    if(pLayerThemaData === 'zonessensibles' && pDetails === 'details'){
                        // si la couche 'poteaux' n'est pas chargée, elle est chargée pour qu'elle apparaisse sur le détail d'une zone sensible
                        if (storeFlag.getFlagLayer("poteauxerdf") === "noLoaded" || "cacheUnchecked"){
                            loadDataSymf.getThemaData('poteauxerdf');
                            map.addLayer(tabThemaData['poteauxerdf']);
                        };
                        // si la couche 'tronçons' n'est pas chargée, elle est chargée pour qu'elle apparaisse sur le détail d'une zone sensible
                        if (storeFlag.getFlagLayer("tronconserdf") === "noLoaded" || "cacheUnchecked"){
                            loadDataSymf.getThemaData('tronconserdf');
                            map.addLayer(tabThemaData['tronconserdf']);
                        };
                    }
                };
                mapService.displayGeomData = displayGeomData;
                    
                // Permet de créer rapidement une couche depuis un controleur ou une directive ::: Edition de données
                var dataLoad = function(deferred, pThemaData){
                    return function(resp){
                        resp.forEach(function(item){
                            addGeom(item, pThemaData);
                        });
                        $rootScope.$broadcast('mapService:dataLoaded');
                        $loading.finish('map-loading');
                        deferred.resolve();
                    };
                };
                var loadData = function(url, pThemaData){
                    var defd = $q.defer();
                    $loading.start('map-loading');
                    dataServ.get(url, dataLoad(defd, pThemaData));
                    return defd.promise;
                };
                mapService.loadData = loadData;            

                return dfd.promise;
            };
            // Fin de la fonction initializeCarte
            mapService.initializeCarte = initializeCarte;

            // Chargement des couches sur la carte depuis tableau de données (clique sur onglet)
            var setTabThemaData = function(pTabClickedValue){
                map.addLayer(tabThemaData[pTabClickedValue]);
                document.getElementById(pTabClickedValue).checked = true;
            }
            mapService.setTabThemaData = setTabThemaData;

            // Destruction de la carte 
            $scope.$on('$destroy', function(evt){
                if(map){
                    map.remove();
                    geoms = [];
                }
            });
        }
    };
});

/*
 * * #4 - Directive qui gère les évenements entre la carte et le tableau de données
 */
app.directive('maplist', function($rootScope, $timeout, mapService){
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
                
                // Click sur la carte                
                scope.$on('mapService:itemClick', function(ev, item, cat){
                    mapService.selectItem(item.feature.properties.id, cat);
                    $rootScope.$broadcast(target + ':select', item.feature.properties, cat);
                });

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