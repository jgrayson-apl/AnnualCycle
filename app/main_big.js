require([
  "esri/core/watchUtils",
  "esri/Map",
  "esri/WebMap",
  "esri/views/MapView",
  "app/AnnualCycleView",
  "app/AnnualCycleIndividualsLayer",
  "app/AnnualCycleOccurrenceLayer",
  "moment/moment"
], function(watchUtils, EsriMap, WebMap, MapView,
            AnnualCycleView, AnnualCycleIndividualsLayer,
            AnnualCycleOccurrenceLayer, moment){


  // URL SEARCH PARAMS //
  const urlParams = new URLSearchParams(location.search);

  let species = urlParams.get('species');

  let week = urlParams.get('week');
  if(week != null){
    week = Number(week);
  } else {
    week = 0.0;
  }

  const start = moment('1000-01-01 00:00:00+00:00').utc();
  const currentDate = (week) => {
    return (start.clone().add(week, 'w')).format('MMM Do');
  }

  const currentDateLabel = document.getElementById('current-date-label');
  this.updateCurrentDateLabel = (week) => {
    currentDateLabel.innerHTML = currentDate(week);
  }

  const speciesBigTitle = document.getElementById('species-big-title');
  const speciesBigView = document.getElementById('species-big-view');

  let fps = 30;
  let animating = false;
  const oneDay = (1.0 / 7.0);

  const animate = () => {
    if(animating){

      week = (week + oneDay);
      if(week >= 53.0){ week = 0.0; }
      this.updateAnimatedLayers();

      setTimeout(() => {
        requestAnimationFrame(animate);
      }, (1000 / fps));
    }
  }

  const toggleAnimation = () => {
    if(animating){
      stopAnimation();
    } else {
      startAnimation();
    }
  }

  const playBtn = document.getElementById('species-big-btn');
  const startAnimation = () => {
    animating = true;
    playBtn.classList.remove('icon-ui-play');
    playBtn.classList.add('icon-ui-pause');
    this.view && (this.view.container.style.cursor = 'wait');
    if(individualsLayer){ this.individualsLayer.identifyEnabled = false; }
    animate();
  }
  const stopAnimation = () => {
    animating = false;
    playBtn.classList.add('icon-ui-play');
    playBtn.classList.remove('icon-ui-pause');
    this.view && (this.view.container.style.cursor = 'pointer');
    if(individualsLayer){ this.individualsLayer.identifyEnabled = true; }
  }
  playBtn.addEventListener('click', () => { toggleAnimation(); });


  // WEB MAP //
  const webMap = new WebMap({ portalItem: { id: "8e1e31a7b20241a78cbd6246fb5b5bb6" } });
  webMap.load().then(webMap => {

    const speciesGroupLayer = (species != null)
      ? webMap.layers.find(layer => layer.title === species)
      : webMap.layers.getItemAt(0)

    if(species == null){ species = speciesGroupLayer.title; }
    speciesBigTitle.innerHTML = species;

    if(speciesGroupLayer){
      speciesGroupLayer.loadAll().then(() => {

        const pathwaySourceLayer = speciesGroupLayer.layers.find(layer => layer.title.endsWith('Pathway Segments'));
        const pathwayGapsSourceLayer = speciesGroupLayer.layers.find(layer => layer.title.endsWith('Pathway Segments Gaps'));
        const occurrenceSourceLayer = speciesGroupLayer.layers.find(layer => layer.title.endsWith('Occurrence Areas'));

        this.individualsLayer = null;
        this.occurrenceLayer = null;

        const mapLayers = [speciesGroupLayer];

        if(occurrenceSourceLayer){

          this.occurrenceLayer = new AnnualCycleOccurrenceLayer({
            title: `${species} Occurrence`,
            visible: false,
            week: week,
            renderer: AnnualCycleOccurrenceLayer.rendererXLarge
          });
          this.occurrenceLayer.initializeSourcesLayers([occurrenceSourceLayer]);

          mapLayers.push(this.occurrenceLayer);
        }

        if(pathwaySourceLayer){

          const individualsSourceLayers = [pathwaySourceLayer]
          if(pathwayGapsSourceLayer){
            individualsSourceLayers.push(pathwayGapsSourceLayer);
          }

          this.individualsLayer = new AnnualCycleIndividualsLayer({
            title: `${species} Individuals`,
            visible: false,
            week: week,
            identifyEnabled: true,
            renderer: AnnualCycleIndividualsLayer.rendererXLarge
          });
          this.individualsLayer.initializeSourcesLayers(individualsSourceLayers);

          mapLayers.push(this.individualsLayer);
        }

        this.view = new MapView({
          container: speciesBigView,
          ui: { components: [] },
          constraints: { snapToZoom: false },
          map: new EsriMap({
            basemap: webMap.basemap,
            layers: mapLayers
          }),
          extent: speciesGroupLayer.layers.find(layer => layer.title.endsWith('Extent')).fullExtent
        });
        this.view.when(() => {
          this.view.container.style.cursor = 'pointer';

          // MAKE GROUP LAYER AND ANIMATED LAYERS VISIBLE //
          speciesGroupLayer.visible = true;
          if(this.individualsLayer){ this.individualsLayer.visible = true; }
          if(this.occurrenceLayer){ this.occurrenceLayer.visible = true; }

          watchUtils.whenFalseOnce(this.view, 'updating', () => {
            this.updateAnimatedLayers = () => {
              this.updateCurrentDateLabel(week);
              if(this.individualsLayer){ this.individualsLayer.week = week; }
              if(this.occurrenceLayer){ this.occurrenceLayer.week = week; }
            }
            this.updateAnimatedLayers();
          });
        });

      });
    } else {
      alert(`Can't find layer for species: ${species}`);
    }
  }).catch(console.error);

});
