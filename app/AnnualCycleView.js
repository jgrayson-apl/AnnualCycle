/**
 *
 * AnnualCycleView
 *  - Annual Cycle View
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/9/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "calcite",
  "esri/core/Accessor",
  "esri/core/Evented",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/Map",
  "esri/WebMap",
  "esri/layers/Layer",
  "esri/layers/GroupLayer",
  "esri/views/MapView",
  "moment/moment"
], function(calcite, Accessor, Evented, watchUtils, promiseUtils,
            EsriMap, WebMap, Layer, GroupLayer, MapView, moment){

  const AnnualCycleView = Accessor.createSubclass({
    declaredClass: "AnnualCycleView",

    _evented: new Evented(),

    properties: {
      emit: { aliasOf: '_evented.emit' },
      on: { aliasOf: '_evented.on' },
      container: {
        type: HTMLDivElement
      },
      week: {
        type: Number,
        value: 1.0,
      },
      species: {
        type: String
      },
      individualsLayer: {
        type: Layer
      },
      occurrenceLayer: {
        type: Layer
      },
      webMap: {
        type: WebMap
      },
      groupLayer: {
        type: GroupLayer,
        dependsOn: ['webMap'],
        set: function(groupLayer){
          this._set("groupLayer", groupLayer);
          this.initializeMapView();
        }
      },
      view: {
        type: MapView
      },
      weekLabel: {
        type: HTMLDivElement
      },
      expandEnabled: {
        type: Boolean,
        value: true
      },
      expandBtn: {
        type: HTMLDivElement
      }
    },

    constructor: function(){
      calcite.init();
    },

    /**
     *
     * @returns {*}
     */
    initializeMapView: function(){

      const mapLayers = [this.groupLayer];
      if(this.occurrenceLayer){
        mapLayers.push(this.occurrenceLayer);
      }
      if(this.individualsLayer){
        mapLayers.push(this.individualsLayer);
      }

      // CLEAR PREVIEW //
      this.container.innerHTML = '';
      this.container.style.cursor = 'wait';
      this.container.classList.add('animate-fade-in');

      // CREATE MAP VIEW //
      this.view = new MapView({
        container: this.container,
        ui: { components: [] },
        constraints: { snapToZoom: false },
        map: new EsriMap({
          basemap: this.webMap.basemap,
          layers: mapLayers
        }),
        extent: this.groupLayer.layers.find(layer => layer.title.endsWith('Extent')).fullExtent
      });
      return this.view.when(() => {

        this.weekLabel = document.createElement('div');
        this.weekLabel.title = 'toggle animation...';
        this.weekLabel.classList.add(...'week-label font-size-0 icon-ui-play esri-interactive'.split(' '));
        this.view.ui.add(this.weekLabel, 'top-left');

        if(this.expandEnabled){
          this.expandBtn = document.createElement('div');
          this.expandBtn.title = 'expand map view...';
          this.expandBtn.classList.add(...'expand-btn font-size-0 icon-ui-zoom-out-fixed icon-ui-flush esri-interactive'.split(' '));
          this.view.ui.add(this.expandBtn, 'top-right');
          this.expandBtn.addEventListener('click', () => {
            this.emit('expand-click', {});
          });

          this.screenshotBtn = document.createElement('div');
          this.screenshotBtn.title = 'take screenshot...';
          this.screenshotBtn.classList.add(...'screenshot-btn font-size-0 icon-ui-media icon-ui-flush esri-interactive'.split(' '));
          this.view.ui.add(this.screenshotBtn, 'top-right');
          this.screenshotBtn.addEventListener('click', () => {
            this.takeScreenshot();
          });
        }

        const start = moment('1000-01-01 00:00:00+00:00').utc();
        const currentMonth = () => {
          return (start.clone().add(this.week, 'w')).format('MMM');
        }

        watchUtils.whenFalseOnce(this.view, 'updating', () => {

          if(this.occurrenceLayer){ this.occurrenceLayer.visible = true; }
          if(this.individualsLayer){ this.individualsLayer.visible = true; }

          this.initializeAnimation();
          this.startAnimation();
          this.weekLabel.addEventListener('click', evt => { this.toggleAnimation(); });
        });

        watchUtils.init(this, 'week', week => {
          // WEEK LABEL //
          this.weekLabel.innerHTML = currentMonth();

          // ANIMATED LAYERS //
          if(this.individualsLayer){ this.individualsLayer.week = week; }
          if(this.occurrenceLayer){ this.occurrenceLayer.week = week; }

        });

        this.groupLayer.visible = true;
      });
    },

    /**
     *
     */
    initializeAnimation: function(){

      let fps = 30;
      let animating = false;
      const oneDay = (1 / 7);

      const animate = () => {
        if(animating){

          this.week = (this.week + oneDay);
          if(this.week >= 53.0){ this.week = 0.0; }
          setTimeout(() => {
            requestAnimationFrame(animate);
          }, (1000 / fps));
        }
      }

      this.toggleAnimation = () => {
        if(animating){
          this.stopAnimation();
        } else {
          this.startAnimation();
        }
      }

      this.startAnimation = () => {
        this.view.container.style.cursor = 'pointer';
        this.weekLabel.classList.replace("icon-ui-play", "icon-ui-pause");
        animating = true;
        animate();
      }
      this.stopAnimation = () => {
        this.view.container.style.cursor = 'default';
        this.weekLabel.classList.replace("icon-ui-pause", "icon-ui-play");
        animating = false;
      }
    },

    /**
     *
     * @returns {{dtaUrl:String, data: ImageData}}
     */
    takeScreenshot: function(){

      const screenshotImage = document.getElementById('screenshot-img');
      const screenshotLink = document.getElementById('screenshot-link');
      screenshotLink.classList.add('btn-disabled');

      this.view.takeScreenshot({
        format: 'png',
        width: this.view.width * window.devicePixelRatio,
        height: this.view.height * window.devicePixelRatio
      }).then(screenshot => {
        screenshotImage.src = screenshot.dataUrl;

        screenshotLink.download = `${this.species}.png`;
        screenshotLink.href = screenshot.dataUrl;
        screenshotLink.classList.remove('btn-disabled');

        calcite.bus.emit('modal:open', { id: 'screenshot-dialog' });
      });
    }

  });
  AnnualCycleView.version = "0.0.1";

  return AnnualCycleView;
});
