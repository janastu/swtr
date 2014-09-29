(function(window) {
  window.swtr = window.swtr || {};

  swtr.init = function() {
    this.annotator = new Annotator(document.body);
    this.annotator.addPlugin("Tags");
    //this.annotator.addPlugin("AnnotoriousImagePlugin");
    this.annotator.subscribe("annotationCreated", swtr.tellParentCreate);
    this.annotator.subscribe("annotationUpdated", swtr.tellParentUpdate);
    console.log('inited annotator');
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent, function(e) {
      var key = e.message ? "message" : "data";
      var data = e[key];
      //run function//
      console.log(data + " from iframe");
      var annos = JSON.parse(data);
      annos.forEach(function(anno) {
        swtr.annotator.createAnnotation(anno.how);
        swtr.annotator.setupAnnotation(anno.how);
      });
    },false);

  };

  swtr.tellParentCreate = function(annotation) {
    /* Notify the parent winow about the creation of annotation  */
    delete(annotation['highlights']);
    var payload = {
      event: 'annotationCreated',
      data: annotation
    };
    console.log('createParent');
    parent.postMessage(JSON.stringify(payload), '*');
  };
  swtr.tellParentUpdate = function(annotation) {
    /* Notify the parent winow about the update of annotation  */
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
