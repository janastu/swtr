annotorious.plugin.CustomFields = function(opt_config_options) {

  annotorious.plugin.CustomFields.prototype.onInitAnnotator = function(annotorious) {
    var dropDownTemplate= _.template($('#dropdown-template').html()); // creates the HTML element for dropdown - from template in index.html
    annotorious.editor.addField(dropDownTemplate);  // add dropdown to editor UI widget
    annotorious.popup.addField( function(annotation){
      var popupTemplate = _.template($('#popup-template').html()); //created a popup template - yet to find how to bind it to newanno
      console.log(annotation.text1);
      if(annotation.text1 != undefined) {
        //console.log(annotation.text1.Comment); annotation.text is Obj - can
        //access each element Comment, tags, links..
        return popupTemplate(annotation.text1);
      }
      else {
        return '';
      }
    });
  };
};
