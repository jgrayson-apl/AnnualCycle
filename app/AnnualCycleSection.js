/**
 *
 * AnnualCycleSection
 *  - Annual Cycle Map
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  9/8/2020 - 0.0.1 -
 * Modified:
 *
 */
define([
  "esri/core/Accessor",
  "esri/core/watchUtils",
  "esri/core/promiseUtils",
  "esri/WebMap",
  "esri/layers/GroupLayer",
  "app/AnnualCycleView",
  "app/AnnualCycleIndividualsLayer",
  "app/AnnualCycleOccurrenceLayer"
], function(Accessor, watchUtils, promiseUtils, WebMap, GroupLayer,
            AnnualCycleView, AnnualCycleIndividualsLayer, AnnualCycleOccurrenceLayer){

  const AnnualCycleSection = Accessor.createSubclass({
    declaredClass: "AnnualCycleSection",

    properties: {
      panel: {
        type: HTMLDivElement,
        set: function(panel){
          this._set("panel", panel);
          this.UI = {
            imageNode: this.panel.querySelector('.species-image'),
            titleNode: this.panel.querySelector('.species-name'),
            viewNode: this.panel.querySelector('.species-small-view')
          };
        }
      },
      UI: {
        type: Object
      },
      species: {
        type: String,
        set: function(species){
          this._set("species", species);
          this.UI.titleNode.innerHTML = this.species;
        }
      },
      week: {
        type: Number,
        value: 0.0
      },
      webMap: {
        type: WebMap,
        dependsOn: ['species'],
        set: function(value){
          this._set('webMap', value);

          // const webMap = WebMap.fromJSON(value.resourceInfo);
          // webMap.loadAll().then(webMap => {
          //this._set("webMap", webMap);
          this.groupLayer = this.webMap.layers.find(layer => layer.title === this.species);
          // });
        }
      },
      groupLayer: {
        type: GroupLayer,
        dependsOn: ['panel'],
        set: function(groupLayer){
          this._set("groupLayer", groupLayer);
          this.initializeStartup();
        }
      },
      annualCycleView: {
        type: AnnualCycleView
      },
      expandEnabled: {
        type: Boolean,
        value: true
      }
    },


    /**
     *
     */
    initializeStartup: function(){

      const previewNode = document.createElement('img');
      previewNode.title = 'Click to load animated map...';
      previewNode.src = `./assets/species/${this.species}.png`;
      previewNode.classList.add(..."species-preview animate-fade-in".split(' '));
      this.UI.viewNode.appendChild(previewNode);

      previewNode.addEventListener('click', () => {
        this.groupLayer.loadAll().then(() => {
          this.initializeLayers().then(sourceLayerInfos => {
            this.initializeView(sourceLayerInfos);
          });
        });
      });

    },

    /**
     *
     */
    initializeLayers: function(){
      return promiseUtils.create((resolve, reject) => {

        /*
          Tagging Locations
          Pathway Segments
          Pathway Segments Gaps
          Individual Pathways
          Occurrence Areas
          Ranges
          Extent
         */

        const sourceLayerInfos = {
          individualsSourceLayers: [],
          occurrenceSourceLayer: null
        };

        // LAYERS TO ANIMATE //
        this.groupLayer.layers.forEach(layer => {
          if(layer.title.endsWith('Pathway Segments')){
            sourceLayerInfos.individualsSourceLayers.push(layer);
          }
          if(layer.title.endsWith('Pathway Segments Gaps')){
            sourceLayerInfos.individualsSourceLayers.push(layer);
          }
          if(layer.title.endsWith('Occurrence Areas')){
            sourceLayerInfos.occurrenceSourceLayer = layer;
          }
        });

        resolve(sourceLayerInfos);
      });
    },

    /**
     *
     */
    initializeView: function(sourceLayerInfos){

      if(sourceLayerInfos.individualsSourceLayers.length){

        const individualsLayer = new AnnualCycleIndividualsLayer({
          title: `${this.species} Individuals`,
          visible: false,
          week: this.week,
          renderer: AnnualCycleIndividualsLayer.rendererSmall
        });
        individualsLayer.initializeSourcesLayers(sourceLayerInfos.individualsSourceLayers);

        sourceLayerInfos.individualsLayer = individualsLayer
      }

      if(sourceLayerInfos.occurrenceSourceLayer){

        const occurrenceLayer = new AnnualCycleOccurrenceLayer({
          title: `${this.species} Occurrence`,
          visible: false,
          week: this.week,
          renderer: AnnualCycleOccurrenceLayer.rendererSmall
        });
        occurrenceLayer.initializeSourcesLayers([sourceLayerInfos.occurrenceSourceLayer]);

        sourceLayerInfos.occurrenceLayer = occurrenceLayer;
      }

      // CREATE MAP VIEW //
      this.annualCycleView = new AnnualCycleView({
        container: this.UI.viewNode,
        week: this.week,
        species: this.species,
        expandEnabled: this.expandEnabled,
        individualsLayer: sourceLayerInfos.individualsLayer,
        occurrenceLayer: sourceLayerInfos.occurrenceLayer,
        webMap: this.webMap,
        groupLayer: this.groupLayer
      });
      watchUtils.whenTrueOnce(this.annualCycleView, 'groupLayer.visible', visible => {

        /*if(sourceLayerInfos.occurrenceSourceLayer){
          this.annualCycleView.view.whenLayerView(sourceLayerInfos.occurrenceSourceLayer).then(occurrenceSourceLayerView => {
            // watchUtils.whenFalseOnce(occurrenceSourceLayerView, 'updating', () => {
              watchUtils.init(this.annualCycleView, 'week', week => {
                occurrenceSourceLayerView.filter = {
                  where: `(week = ${Math.floor(week)})`
                };
              });
            // });
          });
        }*/

        this.panel.classList.remove('btn-disabled');
      });

    }

  });
  AnnualCycleSection.version = "0.0.1";

  return AnnualCycleSection;
});
