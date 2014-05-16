/**
 * A plugin that adds 'Semantic Tagging' functionality to Annotorious.
 * While typing an annotation in the editor, the text is sent to the plugin's 
 * server counterpart for Named Entity Recognition (NER). Recognized entities
 * are suggested as possible tags, and the user can add them to the annotation
 * by clicking on them. Tags are Semantic Tags in the sense that they are not
 * just strings, but (underneath the hood) include a URI pointing to a concept
 * in a specific 'knowledge context', hosted at the server.
 * 
 * The config options for the plugin require a field named 'endpoint_url',
 * holding the URL of the server endpoint to use as the NER/tag-suggestion
 * service.
 *
 * @param {Object=} opt_config_options the config options
 */
annotorious.plugin.CustomFields = function(opt_config_options) {

  //Container for custom fields
     

  /** @private **/
  //this._tags = [];
 // this._link =[];
 // this._label= [];
 //annotorious.Annotation(tags);
 

  /** @private **/
/**  this._ENDPOINT_URI = opt_config_options['endpoint_url'];

  if (this._ENDPOINT_URI[this._ENDPOINT_URI.length - 1] != '/')
    this._ENDPOINT_URI += '/';

  this._ENDPOINT_URI += 
    'services/wikify?minProbability=0.1&disambiguationPolicy=loose&responseFormat=json&source='; **/
}

annotorious.plugin.CustomFields.prototype.onInitAnnotator = function(annotorious) {
     var container = document.createElement('div');
      container.className = "btn-group";
      console.log (container);

      var textTemplate= _.template($('#button-template').html());
                    console.log($(textTemplate));
                    annotorious.editor.addField(textTemplate);

  //this._EditField(annotorious);
  //this._popupField(annotator);
  //this._extendEditor(annotator);
}
