/**
 *
 * AnnualCycleOccurrenceLayer
 *  - Annual Cycle Occurrence Layer
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/14/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "esri/Color",
  "esri/core/Accessor",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/geometry/Polygon",
  "esri/geometry/geometryEngine",
  "esri/layers/Layer",
  "esri/views/2d/layers/BaseLayerViewGL2D",
  "addons/audubon/simple-api"
], function(Color, Accessor, watchUtils, promiseUtils,
            Polygon, geometryEngine,
            Layer, BaseLayerViewGL2D, audubon){

  const AbundanceLayerView2D = BaseLayerViewGL2D.createSubclass({

    _audubon: null,

    properties: {
      assetInfos: {
        type: Object,
        value: {
          'bird': {
            //url: 'textures/osprey.png',
            url: 'textures/osprey-no-outline.png',
            imageIndex: 0,
            flap: true
          },
          'circle': {
            url: 'textures/full-circle.png',
            imageIndex: 1,
            flap: false
          }
        }
      },
      flockInfos: {
        type: Array.of(Object)
      }
    },

    /**
     *
     */
    constructor: function(){
      this.flockInfos = [];
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

      watchUtils.whenDefinedOnce(this.layer, 'flockSources', flockSources => {
        flockSources.forEach(flockSource => {

          const flockInfo = this._audubon.createPolygonalFlock([this.assetInfos.bird.url, this.assetInfos.circle.url], flockSource.geometry, flockSource.count);
          flockInfo.week = flockSource.week;
          flockInfo.turnRadius = 3;

          this.flockInfos.push(flockInfo);
        });
        this.updateRenderer();
      });

      watchUtils.init(this.view, 'zoom', zoom => {
        this.flockInfos.forEach(flockInfo => {
          flockInfo.size = Math.min(this.layer.renderer.birdSize, (zoom * 2.2));
          flockInfo.turnRadius = (zoom * 2.2);
        });
      });

      this.layer.watch('week', week => {
        this.requestRender();
      });

      this.layer.watch('renderer', renderer => {
        this.updateRenderer();
        this.requestRender();
      });

    },

    /**
     *
     */
    detach: function(){},

    /**
     *
     */
    updateRenderer: function(){

      const renderer = this.layer.renderer;
      const assetInfo = this.assetInfos[renderer.birdSymbolType];

      this.flockInfos.forEach(flockInfo => {
        flockInfo.imageIndex = assetInfo.imageIndex;
        flockInfo.flap = assetInfo.flap;
        flockInfo.size = renderer.birdSize
        flockInfo.color = renderer.birdColorWGL;
      });

    },

    /**
     *
     * @param renderParams
     */
    render: function(renderParams){

      const week = this.layer.week;
      const speed = 4.0; // 1 - 7 //

      this.flockInfos.forEach(flockInfo => {

        let alpha = 0.0;
        // if(Math.abs(flockInfo.week - week) < 4.0){
        //if(flockInfo.week === Math.floor(week)){
        //flockInfo.color = [flockInfo.color[0], flockInfo.color[1], flockInfo.color[2], 1.0];
        alpha = Math.exp(-speed * (week - flockInfo.week) * (week - flockInfo.week));
        // }

        flockInfo.color = [flockInfo.color[0], flockInfo.color[1], flockInfo.color[2], alpha];
      });

      this._audubon.setViewState(renderParams.state);
      this._audubon.render();

    }
  });

  /**
   *
   */
  const AnnualCycleOccurrenceRenderer = Accessor.createSubclass({
    declaredClass: "AnnualCycleOccurrenceRenderer",

    properties: {
      birdSymbolType: {
        type: String,
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
      }
    }
  });

  const AnnualCycleOccurrenceLayer = Layer.createSubclass({
    declaredClass: "AnnualCycleOccurrenceLayer",

    properties: {
      week: {
        type: Number,
        value: 1.0
      },
      renderer: {
        type: AnnualCycleOccurrenceRenderer
      },
      flockSources: {
        type: Array.of(Object)
      }
    },

    /**
     *
     */
    constructor: function(){
      this.renderer = AnnualCycleOccurrenceLayer.rendererSmall;
    },

    /**
     *
     * @param sourceLayer
     * @returns {Promise}
     */
    getSourcesFeatures: function(sourceLayer){
      return promiseUtils.create((resolve, reject) => {
        //console.info(this.title, sourceLayer.title, sourceLayer.fields.map(f => f.name).join(' | '));

        const allFeaturesQuery = sourceLayer.createQuery();
        allFeaturesQuery.set({
          where: `1=1`, outFields: ['week', 'SUM_COUNT'], orderByFields: ['week ASC'], maxRecordCountFactor: 5
        });
        sourceLayer.queryFeatures(allFeaturesQuery).then(allFeaturesFS => {
          resolve({ features: allFeaturesFS.features });
        }).catch(console.error);
      });
    },

    /**
     *
     * @param rings
     * @returns {Number}
     * @private
     */
    _getArea: function(rings){
      return geometryEngine.geodesicArea(new Polygon({ spatialReference: { wkid: 3857 }, rings: rings }));
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

          const flockSources = [];

          sourceInfosFromLayers.forEach(sourceInfo => {
            sourceInfo.features.forEach(feature => {

              const totalCount = feature.attributes.SUM_COUNT;
              const totalArea = this._getArea(feature.geometry.rings);

              feature.geometry.rings.forEach(ring => {

                const countForRing = ((this._getArea([ring]) / totalArea) * totalCount);
                const ringCoords = ring.map(coords => { return { coords: coords }; });

                flockSources.push({
                  week: (feature.attributes.week - 1),
                  count: countForRing,
                  geometry: ringCoords
                });
              });

            });
          });

          this.flockSources = flockSources;

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
          this.renderer = AnnualCycleOccurrenceLayer.rendererSmall;
          break;
        case 'large':
          this.renderer = AnnualCycleOccurrenceLayer.rendererLarge;
          break;
        default:
          this.renderer = AnnualCycleOccurrenceLayer.rendererXLarge;
      }
    },

    /**
     *
     * @param view
     * @returns {*}
     */
    createLayerView: function(view){
      if(view.type === "2d"){
        return new AbundanceLayerView2D({ view: view, layer: this });
      }
    }

  });
  AnnualCycleOccurrenceLayer.version = "0.0.1";

  // DEFAULT RENDERER FOR SMALL VIEWS //
  AnnualCycleOccurrenceLayer.rendererSmall = new AnnualCycleOccurrenceRenderer({
    birdSymbolType: 'circle',
    birdColor: '#a6a6a6',
    birdSize: 3
  });

  // DEFAULT RENDERER FOR LARGE VIEWS //
  AnnualCycleOccurrenceLayer.rendererLarge = new AnnualCycleOccurrenceRenderer({
    birdSymbolType: 'circle',
    birdColor: '#b3b3b3',
    birdSize: 6
  });

  // DEFAULT RENDERER FOR EXTRA LARGE VIEWS //
  AnnualCycleOccurrenceLayer.rendererXLarge = new AnnualCycleOccurrenceRenderer({
    birdSymbolType: 'bird',
    birdColor: '#cccccc',
    birdSize: 12
  });

  return AnnualCycleOccurrenceLayer;
});
