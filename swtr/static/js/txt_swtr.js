(function(window) {
  window.swtr = window.swtr || {};

  swtr.init = function() {
    this.annotator = new Annotator(document.body);
    this.annotator.addPlugin("Tags");
    //this.annotator.addPlugin("AnnotoriousImagePlugin");
    console.log('inited annotator');
  };

  window.onload = function() {
    swtr.init();
  };
})(window);
