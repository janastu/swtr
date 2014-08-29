(function(swtr) {
  swtr.ImgAnnoView = Backbone.View.extend({
    el: $("#img-annotation-wrapper"),
    events: {
      'change #custom-dropdown ': 'getFormValue',
      'click #setbox': 'showHide'
    },
    initialize: function(options) {
      this.listenTo(this.collection, 'add', this.render);
      // attach event handlers to the anno object
      anno.addHandler('onAnnotationCreated', this.showSwtHelp);
      anno.addHandler('onAnnotationCreated', this.updateNewAnno);
      anno.addHandler('onAnnotationUpdated', this.showSwtHelp);
      anno.addHandler('onSelectionStarted', function(annotation) {
        anno.hideAnnotations();
      });
      anno.addHandler('onSelectionCompleted', function(annotation) {
        anno.showAnnotations();
      });
      anno.addPlugin('CustomFields', {});
      anno.addHandler('onSelectionCompleted', this.hideOriginalEditor);
      if(options.img) {
        this.img = options.img;
        this.$img = options.$img;
        options.$img.on('load', this, this.imageLoaded);
        options.$img.on('error', this, this.onImageLoadError);
        this.setImage(options.url);
      }
    },
    render: function(model) {
      var swt = model.toJSON();
      swt.how['editable'] = false;
      swt.how.text = swtr.imgAnnoView.createPopupText(swt.how);
      swt.how.text += '\n - by ' + swt.who;
      anno.addAnnotation(swt.how);
    },
    renderWith: function() {
      _.each(this.collection, this.render);
    },
    showSwtHelp: function(annotation) {
      var self = swtr.imgAnnoView;//TODO: figure out how we can bind the scope when this func is called as a callback
      swtr.appView.helpview.step(3);
      $('#sweet').show();
    },
    updateNewAnno: function(annotation) {
      console.log('updateNewAnno()');
      var self = swtr.imgAnnoView;
      // get the final value/input from the editor
      var selected = $('select option:selected').text().toLowerCase();
      var text_input = $('.annotorious-editor-text').val();
      if( selected === "tags") {
        self.new_anno[selected] = $('#tags-input').tags().getTags();
      }
      else {
        // update it in our annotation object
        self.new_anno[selected] = text_input;
      }
      // prepare the text field
      self.new_anno.text = self.createPopupText(self.new_anno);
      // update the annotorious annotation object with the new values
      if(self.new_anno.comment) {
        annotation.comment = self.new_anno.comment;
      }
      if(self.new_anno.link) {
        annotation.link = self.new_anno.link;
      }
      if(self.new_anno.tags) {
        annotation.tags = self.new_anno.tags;
      }
      if(self.new_anno.title) {
        annotation.title = self.new_anno.title;
      }
      annotation.text = self.new_anno.text;
      console.log(self.new_anno, annotation);
    },
    // hide the original editor window, when user has completed selecting part
    // of the image to annotate..
    hideOriginalEditor: function(annotation) {
      console.log('hideOriginalEditor()');
      var self = swtr.imgAnnoView;
      self.new_anno = {};
      self.getSuggestionsForTags();
      //$('.annotorious-editor-text').hide();
      //$('.annotorious-editor').css('width', '100%');
    },
    getFormValue: function(event) {
      console.log('getFormValue()');

      var self = swtr.imgAnnoView;
      // show the editor field to input text
      var $anno_form = $('.annotorious-editor-text');
      //$anno_form.slideDown();
      // get the previous item entered
      var $selected = $('select option:selected');
      var text_input = $anno_form.val();

      // if there was a input and it was not tags..
      if(text_input && $selected.prev().text() !== 'Tags') {
        var field = $selected.prev().text().toLowerCase();
        // update it in our annotation object
        self.new_anno[field] = text_input;
      }
      // if it was tags..
      else if ($selected.prev().text() === 'Tags') {
        // directly save it..
        self.new_anno['tags'] = $('#tags-input').tags().getTags();
      }

      // if the current selected is tags
      if($selected.text() === 'Tags') {
        $('#tags-input').tags({
          tagSize: 'md',
          promptText: 'Type word (and press enter)..',
          caseInsensitive: true,
          suggestions: self.tags_suggestions
        });
        $('#tags-input').show();
        $('.annotorious-editor-text').hide();
      }
      else {
        $('#tags-input').hide();
        $('.annotorious-editor-text').show();
      }
      $anno_form.val('');
      $anno_form.attr('placeholder', 'Add ' + $selected.text());
      console.log(self.new_anno);
    },
    createPopupText: function(annotation) {
      // title
      var text = (annotation.title) ? '<h4>' + annotation.title + '</h4>' : '';

      // comment
      text += (annotation.comment) ? '<p>' + annotation.comment + '</p>' : '';

      // link
      text += (annotation.link) ? '<a target="blank" href="' +
        swtr.utils.linkify(annotation.link) + '">' + annotation.link +
        '</a>' : '';

      // tags
      text += (annotation.tags) ? '<p>' + annotation.tags + '</p>' : '';

      // if older annotation i.e w/o comment,title etc fields
      // add text field as text
      if(!text) {
        text = annotation.text;
      }
      return text;
    },
    // load the suggestions for the tag spraying..
    getSuggestionsForTags: function() {
      var self = swtr.imgAnnoView;
      $.ajax({
        url: '/static/data/tags_suggestions.json',
        success: function(data) {
          self.tags_suggestions = data;
        }
      });
    },
    setImage: function(url) {
      this.imgURL = url;
      console.log(url);
      if(this.$img.attr('src') === this.imgURL) {
        return;
      }
      anno.reset();
      var self = this;
      swtr.appView.$overlay.show();
      swtr.appView.helpview.step(7);
      this.$img.attr('src', this.imgURL);
    },
    imageLoaded: function(event) {
      var self = event.data;
      console.log('image loaded', self);
      swtr.appView.$overlay.hide();
      // reset the collection
      swtr.sweets.reset();
      anno.makeAnnotatable(swtr.imgAnnoView.img);
      swtr.imgAnnoView.getExistingAnnotations();
    },
    // when image fails to load - could be because of broken URL or network
    // issues
    onImageLoadError: function(event) {
      var self = event.data;
      console.log('error while loading image');
      swtr.appView.$overlay.hide();
      swtr.appView.helpview.step(8);
    },
    initImageAnno: function() {
      // img is a jquery object which annotorious doesn't accept; instead it
      // takes the native object returned by a browser API; fortunately, jqeury
      // stores a copy of the native object too!

      this.getExistingAnnotations();

    },
    getExistingAnnotations: function() {
      var self = this;
      swtr.appView.helpview.step(0);
      swtr.appView.$overlay.show();
      swtr.sweets.getAll({
        where: this.imgURL,
        success: function(data) {
          if(_.isArray(data)) {
            swtr.sweets.add(data);
            swtr.appView.$overlay.hide();
            swtr.appView.helpview.step(2);
          }
        },
        error: function(jqxhr, error, statusText) {
          if(jqxhr.status === 404) { //annotations don't exist for this image
            console.log('annotations don\'t exist for this image. Create one!');
          }
          swtr.appView.$overlay.hide();
          swtr.appView.helpview.step(2);
        }
      });
    },
    showHide: function() {
      if($("#setbox:checked").length) {
        $('.annotorious-item-unfocus').css("opacity",  "0.5");
      }
      else {
        $('.annotorious-item-unfocus').css("opacity", "0");
      }
    }
  });
})(swtr);
