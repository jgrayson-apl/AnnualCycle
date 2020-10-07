/**
 *
 * AnnualCycleIndividualsLayer
 *  - Annual Cycle Individuals Layer
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/10/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "esri/Color",
  "esri/core/Accessor",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/layers/Layer",
  "esri/views/2d/layers/BaseLayerViewGL2D",
  "addons/audubon/simple-api"
], function(Color, Accessor, watchUtils, promiseUtils,
            Layer, BaseLayerViewGL2D, audubon){

  /**
   *
   */
  const IndividualsLayerView2D = BaseLayerViewGL2D.createSubclass({

    _audubon: null,

    properties: {
      assetInfos: {
        type: Object,
        value: {
          'bird': {
            imageIndex: 0,
            //url: 'textures/osprey.png',
            url: 'textures/osprey-no-outline.png',
            flap: true
          },
          'circle': {
            imageIndex: 1,
            url: 'textures/full-circle.png',
            flap: false
          }
        }
      },
      pathwayInfos: {
        type: Array.of(Object)
      }
    },

    /**
     *
     */
    constructor: function(){
      this.pathwayInfos = [];
    },

    /**
     *
     */
    attach: function(){

      this._audubon = audubon.init({
        gl: this.context,
        assetsBase: "https://esri-audubon.s3-us-west-1.amazonaws.com/v1/apps/assets/",
        clear: false,
        basemap: false,
        renderLoop: false
      });

      watchUtils.whenDefinedOnce(this.layer, 'pathwaySources', pathwaySources => {
        pathwaySources.forEach((source, birdId) => {
          // AVOID SUSPECT DATA AND ONLY USE PATHS THAT START AT THE FIRST WEEK //
          if(source.geometry[0].time === 0.0){

            const bird = this._audubon.createMarker([this.assetInfos.bird.url, this.assetInfos.circle.url]);
            bird.id = source.id;

            const pathway = this._audubon.createPolyline(source.geometry);
            pathway.id = source.id;

            this.pathwayInfos.push({ id: source.id, pathway: pathway, bird: bird });
          }
        });
        this.updateRenderer();
      });

      this.layer.watch('week', week => {
        this.requestRender();
      });

      this.layer.watch('weekInGap', weekInGap => {
        this.updateRenderer();
        this.requestRender();
      });

      this.layer.watch('renderer', renderer => {
        this.updateRenderer();
        this.requestRender();
      });

      let viewClickHandle = null;
      watchUtils.init(this.layer, 'identifyEnabled', identifyEnabled => {
        if(identifyEnabled){
          viewClickHandle = this.view.on('click', this.identify.bind(this));
        } else {
          viewClickHandle && viewClickHandle.remove();
        }
      });

    },

    /**
     *
     */
    detach: function(){ },

    /**
     *
     */
    updateRenderer: function(){

      const weekInGap = this.layer.weekInGap;
      const renderer = this.layer.renderer;
      const assetInfo = this.assetInfos[renderer.birdSymbolType];

      this.pathwayInfos.forEach(pathwayInfo => {

        pathwayInfo.pathway.width = renderer.lineWidth;
        pathwayInfo.pathway.color = weekInGap ? renderer.gapColorWGL : renderer.lineColorWGL;
        pathwayInfo.pathway.cutoffTime = renderer.cutoffTime;
        pathwayInfo.pathway.opacityAtCutoff = renderer.opacityAtCutoff;

        pathwayInfo.bird.imageIndex = assetInfo.imageIndex;
        pathwayInfo.bird.flap = assetInfo.flap;
        pathwayInfo.bird.size = renderer.birdSize;
        pathwayInfo.bird.color = weekInGap ? renderer.gapColorWGL : renderer.birdColorWGL;

      });

    },

    /**
     *
     * @param renderParams
     */
    render: function(renderParams){

      // WEEK //
      const week = this.layer.week;

      this.pathwayInfos.forEach(pathwayInfo => {
        // PATHWAY //
        pathwayInfo.pathway.progress = week;
        // BIRD //
        const pos = pathwayInfo.pathway.getPositionAtTime(week);
        pathwayInfo.bird.position = pos.coords;
        pathwayInfo.bird.angle = pos.angle;
      });

      this._audubon.setViewState(renderParams.state);
      this._audubon.render();
    },

    /**
     *
     * @param clickEvt
     */
    identify: function(clickEvt){
      clickEvt.preventDefault();

      const selectionColor = [0, 1, 0, 1];

      const bird = this._audubon.hitTest(clickEvt.x, clickEvt.y);
      if(bird){
        const weekInGap = this.layer.weekInGap;
        const renderer = this.layer.renderer;

        this.pathwayInfos.forEach(pathwayInfo => {
          if(bird && (bird.id === pathwayInfo.id)){
            pathwayInfo.bird.size = (renderer.birdSize * 2.0);
            pathwayInfo.bird.color = selectionColor;
            pathwayInfo.pathway.color = selectionColor;
          } else {
            pathwayInfo.bird.size = renderer.birdSize;
            pathwayInfo.bird.color = weekInGap ? renderer.gapColorWGL : renderer.birdColorWGL;
            pathwayInfo.pathway.color = weekInGap ? renderer.gapColorWGL : renderer.lineColorWGL;
          }
        });

      } else {
        this.updateRenderer();
      }
    }

  });

  /**
   *
   */
  const AnnualCycleIndividualsRenderer = Accessor.createSubclass({
    declaredClass: "AnnualCycleIndividualsRenderer",

    properties: {
      birdSymbolType: {
        type: String
      },
      birdColor: {
        type: Color,
        set: function(value){
          this._set('birdColor', new Color(value));
          this.birdColorWGL = [
            (this.birdColor.r / 255),
            (this.birdColor.g / 255),
            (this.birdColor.b / 255),
            this.birdColor.a
          ];
        }
      },
      birdColorWGL: {
        type: Array.of(Number)
      },
      birdSize: {
        type: Number
      },
      lineColor: {
        type: Color,
        set: function(value){
          this._set('lineColor', new Color(value));
          this.lineColorWGL = [
            (this.lineColor.r / 255),
            (this.lineColor.g / 255),
            (this.lineColor.b / 255),
            this.lineColor.a
          ];
        }
      },
      lineColorWGL: {
        type: Array.of(Number)
      },
      lineWidth: {
        type: Number
      },
      gapColor: {
        type: Color,
        set: function(value){
          this._set('gapColor', new Color(value));
          this.gapColorWGL = [
            (this.gapColor.r / 255),
            (this.gapColor.g / 255),
            (this.gapColor.b / 255),
            this.gapColor.a
          ];
        }
      },
      gapColorWGL: {
        type: Array.of(Number)
      },
      cutoffTime: {
        type: Number
      },
      opacityAtCutoff: {
        type: Number
      }
    }
  });

  /**
   *
   */
  const AnnualCycleIndividualsLayer = Layer.createSubclass({
    declaredClass: "AnnualCycleIndividualsLayer",

    properties: {
      week: {
        type: Number,
        value: 1.0,
        set: function(value){
          this._set('week', value);
          this.weekInGap = this._isWeekInsGap();
        }
      },
      gapWeeks: {
        type: Array.of(Number)
      },
      weekInGap: {
        type: Boolean,
        value: false,
        dependsOn: ['week', 'gapWeeks']
      },
      renderer: {
        type: AnnualCycleIndividualsRenderer
      },
      pathwaySources: {
        type: Map
      },
      identifyEnabled: {
        type: Boolean,
        value: false
      }
    },

    /**
     *
     */
    constructor: function(){
      this.gapWeeks = [];
      this.renderer = AnnualCycleIndividualsLayer.rendererSmall;
    },

    /**
     *
     * @returns {boolean}
     * @private
     */
    _isWeekInsGap: function(){
      return this.gapWeeks && this.gapWeeks.length && this.gapWeeks.includes(Math.floor(this.week));
    },

    /**
     *
     * @param sourceLayer
     * @returns {Promise}
     */
    getSourcesFeatures: function(sourceLayer){
      return promiseUtils.create((resolve, reject) => {

        // sourceLayer.fields.find(f => f.name.includes('bird_id'));
        // bird_id | unq_bird_id_week | unq_bird_id //
        const birdIdField = 'bird_id';

        const allFeaturesQuery = sourceLayer.createQuery();
        allFeaturesQuery.set({
          where: `1=1`, outFields: [birdIdField, 'week'], orderByFields: [`${birdIdField} ASC`, 'week ASC'], maxRecordCountFactor: 5
        });
        sourceLayer.queryFeatures(allFeaturesQuery).then(allFeaturesFS => {
          resolve({ features: allFeaturesFS.features, isGap: sourceLayer.title.includes('Gap') });
        }).catch(console.error);
      });
    },

    /**
     *
     * @param sourceLayers
     * @returns {Promise}
     */
    initializeSourcesLayers: function(sourceLayers){
      return promiseUtils.create((resolve, reject) => {

        Promise.all(sourceLayers.map(sourceLayer => {
          return this.getSourcesFeatures(sourceLayer);
        })).then(sourceInfosFromLayers => {

          // PATHWAY SOURCE BY BIRD //
          const pathwaySourcesByBird = new Map();

          sourceInfosFromLayers.forEach(sourceInfo => {
            sourceInfo.features.forEach(feature => {

              // bird_id | unq_bird_id_week | unq_bird_id //
              const birdId = feature.attributes.bird_id;
              const week = (feature.attributes.week - 1);

              // GAP WEEKS FOR LAYER //
              if(sourceInfo.isGap){ this.gapWeeks.push(week); }

              // GET ALL COORDINATES FOR THIS WEEK //
              const pathwayGeom = feature.geometry.paths.reduce((geomCoords, path) => {
                const pathGeom = path.map(coords => {
                  return { coords: coords };
                });
                return geomCoords.concat(pathGeom);
              }, []);

              // SET TIME BASED ON ALL VERTICES IN THIS WEEK //
              pathwayGeom.forEach((coordsInfo, coordsInfoIdx) => {
                coordsInfo.time = (week + (coordsInfoIdx / pathwayGeom.length));
              });

              // FIND PATHWAY INFO FOR THIS BIRD //
              let pathwayInfo = pathwaySourcesByBird.get(birdId);
              if(pathwayInfo){
                pathwayInfo.geometry = pathwayInfo.geometry.concat(pathwayGeom);
              } else {
                pathwayInfo = { id: birdId, geometry: pathwayGeom };
              }

              pathwaySourcesByBird.set(birdId, pathwayInfo);
            });
          });

          // SORT COORDS BY TIME //
          pathwaySourcesByBird.forEach((pathwayInfo, birdId) => {
            pathwayInfo.geometry = pathwayInfo.geometry.sort((a, b) => {
              return (a.time - b.time);
            });
          });

          // SET PATHWAY SOURCES //
          this.pathwaySources = pathwaySourcesByBird;

          resolve();
        });
      });

    },

    /**
     *
     * @param size
     */
    setRendererBySize: function(size){
      switch(size){
        case 'small':
          this.renderer = AnnualCycleIndividualsLayer.rendererSmall;
          break;
        case 'large':
          this.renderer = AnnualCycleIndividualsLayer.rendererLarge;
          break;
        default:
          this.renderer = AnnualCycleIndividualsLayer.rendererXLarge;
      }
    },

    /**
     *
     * @param view
     * @returns {IndividualsLayerView2D}
     */
    createLayerView: function(view){
      if(view.type === "2d"){
        return new IndividualsLayerView2D({ view: view, layer: this });
      }
    }

  });
  AnnualCycleIndividualsLayer.version = "0.0.1";

  // DEFAULT RENDERER FOR SMALL VIEWS //
  AnnualCycleIndividualsLayer.rendererSmall = new AnnualCycleIndividualsRenderer({
    birdSymbolType: 'circle',
    birdColor: '#d9832e',
    birdSize: 7,
    lineColor: '#FFA200',
    lineWidth: 5,
    gapColor: 'gray',
    cutoffTime: 3.0,
    opacityAtCutoff: 0.1
  });

  // DEFAULT RENDERER FOR LARGE VIEWS //
  AnnualCycleIndividualsLayer.rendererLarge = new AnnualCycleIndividualsRenderer({
    birdSymbolType: 'bird',
    birdColor: '#d9832e',
    birdSize: 21,
    lineColor: '#FFA200',
    lineWidth: 7,
    gapColor: 'gray',
    cutoffTime: 2.5,
    opacityAtCutoff: 0.1
  });

  // DEFAULT RENDERER FOR EXTRA LARGE VIEWS //
  AnnualCycleIndividualsLayer.rendererXLarge = new AnnualCycleIndividualsRenderer({
    birdSymbolType: 'bird',
    birdColor: '#d9832e',
    birdSize: 28,
    lineColor: '#FFA200',
    lineWidth: 7,
    gapColor: 'gray',
    cutoffTime: 2.5,
    opacityAtCutoff: 0.1
  });

  return AnnualCycleIndividualsLayer;
});
