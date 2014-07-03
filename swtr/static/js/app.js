(function() {
  $(document).ready(function() {
    var annotator = new Annotator(document.body);
    annotator.addPlugin("Tags");
    annotator.addPlugin("Filter");
  });
})();
