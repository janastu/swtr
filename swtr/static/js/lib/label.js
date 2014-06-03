
annotorious.plugin.CustomFields.prototype._EditField = function (annotorious) { 
  //Container for custom fields
      var container = document.createElement('div');
      container.className = "btn-group";
      console.log (container);


      window.container = container;

      var textTemplate= _.template($('#button-template').html());
                    console.log($(textTemplate));
                    annotorious.editor.addField(textTemplate);
}
