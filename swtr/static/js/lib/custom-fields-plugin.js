annotorious.plugin.CustomFields = function(opt_config_options) {

  annotorious.plugin.CustomFields.prototype.onInitAnnotator = function(annotorious) {

    // creates the HTML element for dropdown - from template in index.html
    var dropDownTemplate= _.template($('#dropdown-template').html());

    // add dropdown to editor UI widget
    annotorious.editor.addField(dropDownTemplate);

    annotorious.popup.addField(function(annotation) {
      // created a popup template - yet to find how to bind it to newanno
      var popupTemplate = _.template($('#popup-template').html());

      if(annotation.text1 != undefined) {
        //console.log(annotation.text1.Comment); annotation.text is Obj - can
        //access each element Comment, tags, links..
        return popupTemplate(annotation.text1);
      }
      else {
        return '';
      }
    });
  }
}
