annotorious.plugin.CustomFields = function(opt_config_options) {

  var editorTemplate = _.template($('#customEdit-template').html()); //returns the HTML string for the editor

  annotorious.plugin.CustomFields.prototype.onInitAnnotator = function(annotorious) {
    annotorious.editor.addField(editorTemplate);

    annotorious.popup.addField(function(annotation) {
      return (annotation.title) ? '<h4>' + annotation.title + '</h4>' : '';
    });
    annotorious.popup.addField(function(annotation) {
      return (annotation.comment) ? '<p>' + annotation.comment + '</h4>' : '';
    });
    annotorious.popup.addField(function(annotation) {
      return (annotation.link) ? '<p><a target="blank" href="' +
              swtr.utils.linkify(annotation.link) + '">' + annotation.link +
              '</a></p>' : '';
    });
    annotorious.popup.addField(function(annotation) {
      return (annotation.tags && annotation.tags.length) ? '<p>[' +
        annotation.tags + ']</p>' : '';
    });
  }
};
