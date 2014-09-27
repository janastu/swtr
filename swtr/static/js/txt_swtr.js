(function(window) {
  window.swtr = window.swtr || {};

  swtr.init = function() {
    this.annotator = new Annotator(document.body);
    this.annotator.addPlugin("Tags");
    //this.annotator.addPlugin("AnnotoriousImagePlugin");
    this.annotator.subscribe("annotationCreated", swtr.updateParent);
    this.annotator.subscribe("annotationUpdated", swtr.updateParent);
    console.log('inited annotator');
  };

  swtr.updateParent = function(annotation) {
    /* Notify the parent winow about the annotation  */
    delete(annotation['highlights']);
    var payload = {
      event: 'annotationUpdated',
      data: annotation
    };
    console.log('updateParent');
    parent.postMessage(JSON.stringify(payload), '*');
  };

  window.onload = function() {
    swtr.init();
  };
})(window);
