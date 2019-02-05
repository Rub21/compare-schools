'use strict';

const turf = require('@turf/turf');
const _ = require('underscore');
const rbush = require('rbush');

module.exports = function(tileLayers, tile, writeData, done) {
  let mlBboxes = [];
  let schoolBboxes = [];
  const mlLayers = tileLayers.ml.ml;
  const schoolsLayers = tileLayers.schools.schools;
  const threshold = global.mapOptions.threshold;
  const pattern = global.mapOptions.pattern;
  const mlFeatures = {};
  const schoolsFeatures = {};

  for (let i = 0; i < mlLayers.features.length; i++) {
    const mlFeature = mlLayers.features[i];
    if (mlFeature.properties.p1 >= threshold) {
      const mlId = `m${i}`;
      mlFeatures[mlId] = mlFeature;
      mlBboxes.push(objBbox(mlFeature, mlId));
    }
  }

  for (let d = 0; d < schoolsLayers.features.length; d++) {
    const schoolFeture = schoolsLayers.features[d];
    if (schoolFeture.properties.dc_has_pattern_school === pattern) {
      const schoolId = `s${d}`;
      schoolsFeatures[schoolId] = schoolFeture;
      schoolBboxes.push(objBbox(schoolFeture, schoolId));
    }
  }

  const bboxes = [].concat(mlBboxes).concat(schoolBboxes);
  const tree = rbush(bboxes.length);
  tree.load(bboxes);
  let results = {};

  for (let z = 0; z < mlBboxes.length; z++) {
    const bbox = mlBboxes[z];
    const overlaps = tree.search(bbox);
    for (let k = 0; k < overlaps.length; k++) {
      const overlap = overlaps[k];
      if (bbox.id !== overlap.id && overlap.id.charAt(0) === 's') {
        results[bbox.id] = mlFeatures[bbox.id];
        results[overlap.id] = schoolsFeatures[overlap.id];
      }
    }
  }

  results = _.values(results);
  if (results.length > 0) {
    writeData(JSON.stringify(turf.featureCollection(results)) + '\n');
  }
  done(null, null);
};

function objBbox(obj, id) {
  const bboxExtent = ['minX', 'minY', 'maxX', 'maxY'];
  let bbox = { id };
  const valBbox = turf.bbox(obj);
  for (var d = 0; d < valBbox.length; d++) {
    bbox[bboxExtent[d]] = valBbox[d];
  }
  return bbox;
}
