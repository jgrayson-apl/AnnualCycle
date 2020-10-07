/**
 *
 * AnnualCycleModal
 *  - Annual Cycle Modal Dialog
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/9/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "calcite",
  "esri/core/watchUtils",
  "esri/core/Accessor",
  "esri/views/MapView",
  "moment/moment",
  "app/AnnualCycleSection"
], function(calcite, watchUtils, Accessor,
            MapView, moment, AnnualCycleSection){

  const AnnualCycleModal = Accessor.createSubclass({
    declaredClass: "AnnualCycleModal",

    properties: {
      container: {
        type: HTMLDivElement,
        value: document.getElementById('species-big-view')
      },
      titleNode: {
        type: HTMLDivElement,
        value: document.getElementById('species-big-title')
      },
      closeBtn: {
        type: HTMLDivElement,
        value: document.getElementById('species-big-close')
      },
      playBtn: {
        type: HTMLButtonElement,
        value: document.getElementById('species-big-btn')
      },
      currentDateLabel: {
        type: HTMLDivElement,
        value: document.getElementById('current-date-label')
      },
      moreDetailsBtn: {
        type: HTMLDivElement,
        value: document.getElementById('species-big-more-details-btn')
      },
      annualCycleSection: {
        type: AnnualCycleSection
      },
      species:{
        type: String,
        aliasOf: 'annualCycleSection.species'
      },
      week: {
        type: Number,
        aliasOf: 'annualCycleSection.annualCycleView.week'
      },
      view: {
        type: MapView
      }
    },

    constructor: function(){
      calcite.init();

      this.initializeAnimation();
      this.initializeCurrentDate();

    },

    /**
     *
     * @param annualCycleSection
     */
    open: function(annualCycleSection){

      this.annualCycleSection = annualCycleSection;

      this.titleNode.innerHTML = this.annualCycleSection.species;

      this.annualCycleSection.annualCycleView.individualsLayer.setRendererBySize('large');
      this.annualCycleSection.annualCycleView.occurrenceLayer.setRendererBySize('large');

      this.view = new MapView({
        container: this.container,
        ui: { components: [] },
        constraints: { snapToZoom: false },
        map: this.annualCycleSection.annualCycleView.view.map,
        extent: this.annualCycleSection.annualCycleView.view.extent
      });
      this.view.when(() => {

        // watchUtils.init(this.annualCycleSection.annualCycleView, 'week', week => {
        //   this.updateCurrentDateLabel(week);
        // });

        watchUtils.init(this, 'week', week => {
           this.updateCurrentDateLabel(week);
        });

        this.moreDetailsBtn.addEventListener('click', () => {
          window.open(`./index_big.html?species=${this.species}&week=${this.week}`);
        });

        calcite.bus.emit('modal:open', { id: 'species-dialog' });
      });

    },

    /**
     *
     */
    initializeCurrentDate: function(){
      const start = moment('1000-01-01 00:00:00+00:00').utc();
      const currentDate = (week) => {
        return (start.clone().add(week, 'w')).format('MMM Do');
      }
      this.updateCurrentDateLabel = (week) => {
        this.currentDateLabel.innerHTML = currentDate(week);
      }
    },

    /**
     *
     * @param view
     */
    /*addHillshade: function(view){

      const hillshadeLayerId = 'bf4560325aba4d33bcb2a8582be23972'
      Layer.fromPortalItem({ portalItem: { id: hillshadeLayerId } }).then(layer => {
        view.map.basemap.baseLayers.add(layer, 0);
      });

    },*/

    /**
     *
     */
    close: function(){
      if(this.annualCycleSection){
        this.annualCycleSection.annualCycleView.individualsLayer.setRendererBySize('small');
        this.annualCycleSection.annualCycleView.occurrenceLayer.setRendererBySize('small');
      }
    },

    /**
     *
     */
    initializeAnimation: function(){

      let animating = false;
      const toggleAnimation = () => {
        if(animating){
          stopAnimation();
        } else {
          startAnimation();
        }
      }
      const startAnimation = () => {
        this.playBtn.classList.remove('icon-ui-play');
        this.playBtn.classList.add('icon-ui-pause');
        animating = true;
        this.annualCycleSection && this.annualCycleSection.annualCycleView.startAnimation();
      }
      const stopAnimation = () => {
        this.playBtn.classList.add('icon-ui-play');
        this.playBtn.classList.remove('icon-ui-pause');
        animating = false;
        this.annualCycleSection && this.annualCycleSection.annualCycleView.stopAnimation();
      }

      this.playBtn.addEventListener('click', () => {
        toggleAnimation();
      });

      this.closeBtn.addEventListener('click', () => {
        stopAnimation();
        this.close();
      });
    }

  });
  AnnualCycleModal.version = "0.0.1";

  return AnnualCycleModal;
});
