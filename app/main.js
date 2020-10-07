/*
  https://codepen.io/dawken/pen/NWNYoyr
  https://codepen.io/dawken/pen/gOrKZoG
*/

require([
  "esri/core/watchUtils",
  "esri/WebMap",
  "app/AnnualCycleModal",
  "app/AnnualCycleSection"
], function(watchUtils, WebMap, AnnualCycleModal, AnnualCycleSection){


  // SPECIES CONTAINER //
  const speciesContainer = document.getElementById('species-container');

  // CREATE SPECIES PANEL //
  const createSpeciesPanel = () => {

    const speciesPanel = document.createElement('div');
    speciesPanel.classList.add(..."species-panel panel panel-white panel-no-border".split(' '));
    speciesContainer.appendChild(speciesPanel);

    const speciesImagePanel = document.createElement('div');
    speciesImagePanel.classList.add(..."species-image-panel panel panel-white panel-no-border".split(' '));
    speciesPanel.appendChild(speciesImagePanel);

    const speciesImageNode = document.createElement('img');
    speciesImageNode.src = `./assets/species/default.png`;
    speciesImageNode.classList.add(..."species-image".split(' '));
    speciesImagePanel.appendChild(speciesImageNode);

    const speciesTitleNode = document.createElement('div');
    speciesTitleNode.innerHTML = "NAME";
    speciesTitleNode.classList.add(..."species-name panel panel-white panel-no-border font-size-1 avenir-demi".split(' '));
    speciesPanel.appendChild(speciesTitleNode);

    const speciesButtonsNode = document.createElement('div');
    speciesButtonsNode.classList.add("species-view-buttons");
    speciesPanel.appendChild(speciesButtonsNode);

    const speciesBtn_annualCycle = document.createElement('button');
    speciesBtn_annualCycle.innerHTML = "Annual Cycle";
    speciesBtn_annualCycle.classList.add(..."btn btn-grouped btn-small btn-white".split(' '));
    speciesButtonsNode.appendChild(speciesBtn_annualCycle);

    const speciesBtn_connections = document.createElement('button');
    speciesBtn_connections.innerHTML = "Connections";
    speciesBtn_connections.classList.add(..."btn btn-grouped btn-small btn-white".split(' '));
    speciesButtonsNode.appendChild(speciesBtn_connections);

    const speciesBtn_threats = document.createElement('button');
    speciesBtn_threats.innerHTML = "Threats";
    speciesBtn_threats.classList.add(..."btn btn-grouped btn-small btn-white".split(' '));
    speciesButtonsNode.appendChild(speciesBtn_threats);

    const speciesViewNode = document.createElement('div');
    speciesViewNode.classList.add(..."species-small-view panel panel-white panel-no-border".split(' '));
    speciesPanel.appendChild(speciesViewNode);

    return speciesPanel;
  }

  // WEB MAP //
  const webMap = new WebMap({ portalItem: { id: "8e1e31a7b20241a78cbd6246fb5b5bb6" } });
  webMap.load().then(webMap => {
    //console.info(webMap);

    // LARGE MAP VIEW IN MODAL DIALOG //
    const annualCycleViewModal = new AnnualCycleModal();

    // EACH GROUP LAYER REPRESENTS A DIFFERENT SPECIES //
    const speciesGroupLayers = webMap.layers.filter(layer => layer.type === 'group');
    speciesGroupLayers.forEach(speciesGroupLayer => {

      // INITIAL WEEK FOR THIS SPECIES //
      const speciesInitialWeek = 0.0; // Math.floor(1 + (Math.random() * 51));

      // SPECIES ANNUAL CYCLE SECTION //
      const speciesAnnualCycleSection = new AnnualCycleSection({
        panel: createSpeciesPanel(),
        species: speciesGroupLayer.title,
        week: speciesInitialWeek,
        webMap: webMap
      });
      watchUtils.whenDefinedOnce(speciesAnnualCycleSection, 'annualCycleView.view', view => {

        speciesAnnualCycleSection.annualCycleView.on('expand-click', () => {
          speciesAnnualCycleSection.annualCycleView.stopAnimation();
          annualCycleViewModal.open(speciesAnnualCycleSection);
        });

      });
    });

  }).catch(console.error);

});
