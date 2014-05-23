annotorious.plugin.CustomFields = function(opt_config_options) {


annotorious.plugin.CustomFields.prototype.onInitAnnotator = function(annotorious) {
      var textTemplate= _.template($('#button-template').html());
                    annotorious.editor.addField(textTemplate);
      var popupTemplate = _.template($('#popup-template').html());
        annotorious.popup.addField(function(annotation){
          var container = document.createElement('div');
         var el = document.createElement('span');
         el.href = '#';
         el.className = 'annotorious-popup-text';
         console.log(annotation.text);
         el.innerHTML= annotation.text; 
         container.appendChild(el);
         return container;          
         
        });
        }
}
