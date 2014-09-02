(function(swtr) {

  /* Model for Image Annotation Sweets */
  var ImgAnnoSwt = Backbone.Model.extend({
    defaults: {
      'who': '',
      'what': 'img-anno',
      'where': '',
      'how': {}
    },
    initialize: function() {
    }
  });

  /* Collection to hold all multiple ImgAnnoSwt */
  swtr.ImgAnnoSwts = Backbone.Collection.extend({
    model: ImgAnnoSwt,
    url: function() {
      return swtr.swtstoreURL() + '/sweets';
    },
    // get all sweets/annotations of type #img-anno for a particular URI
    // (where)
    // @options is a javascript object,
    // @options.where : URI of the resource for which swts to be fetched
    // @options.who: optional username to filter sweets
    // @options.success: success callback to call
    // @options.error: error callback to call
    getAll: function(options) {
      // error checking
      if(!options.where) {
        throw Error('"where" option must be passed to get sweets of a URI');
        return false;
      }
      // setting up params
      var where = options.where,
    who = options.who || null;
      url = swtr.swtstoreURL() + swtr.endpoints.get + '?where=' +
        encodeURIComponent(where);// '&access_token=' + swtr.access_token;
      if(who) {
        url += '&who=' + who;
      }
      // get them!
      this.sync('read', this, {
        url: url,
        success: function() {
          if(typeof options.success === 'function') {
            options.success.apply(this, arguments);
          }
        },
        error: function() {
          if(typeof options.error === 'function') {
            options.error.apply(this, arguments);
          }
        }
      });
    },
    // post newly created sweets to a sweet store
    // @options is a javascript object,
    // @options.where : URI of the resource for which swts to be fetched
    // @options.who: optional username to filter sweets
    // @options.success: success callback to call
    // @options.error: error callback to call,
    post: function(options) {
      var new_sweets = this.getNew();
      var dummy_collection = new Backbone.Collection(new_sweets);

      if(!swtr.access_token) {
        throw new Error('Access Token is required to sweet');
        return;
      }

      var url = swtr.swtstoreURL() + swtr.endpoints.post +
        '?access_token=' + swtr.access_token;

      this.sync('create', dummy_collection, {
        url: url,
        success: function() {
          if(typeof options.success === 'function') {
            options.success.apply(this, arguments);
          }
        },
        error: function() {
          if(typeof options.error === 'function') {
            options.error.apply(this, arguments);
          }
        }
      });
    },
    // return newly created models from the collection
    getNew: function() {
      var new_models = [];
      this.each(function(model) {
        if(model.isNew()) {
          new_models.push(model);
        }
      });
      return new_models;
    },
    // update part of the collection after a save on the server
    update: function() {
    }
  });

  swtr.ImgAnnoView = Backbone.View.extend({
    el: $('#img-annotation-wrapper'),
    events: {
      'change #custom-dropdown': 'getFormValue',
      'click #toggle-anno-areas': 'toggleAnnoAreas'
    },
    initialize: function(options) {
      this.$el = $('#img-annotation-wrapper');
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
      }
      if(!options.helpview) {
        //TODO: figure out a better way so that everyone can communicate with
        //helpview independently
        throw new Error('Image annotation view must be passed a reference to the helpview');
      }
      this.helpview = options.helpview;
      //console.log('initing img annoview; helpview in opts', options.helpview);
      this.setImage(options.url);
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
      self.helpview.step(3);
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
      //console.log(url);
      if(this.$img.attr('src') === this.imgURL) {
        return;
      }
      anno.reset();
      swtr.appView.$overlay.show();
      this.helpview.step(7);
      this.$img.attr('src', this.imgURL);
    },
    imageLoaded: function(event) {
      var self = event.data;
      console.log('image loaded', self);
      swtr.appView.$overlay.hide();
      // reset the collection
      swtr.sweets.reset();
      anno.makeAnnotatable(swtr.imgAnnoView.img);
      self.getExistingAnnotations();
    },
    // when image fails to load - could be because of broken URL or network
    // issues
    onImageLoadError: function(event) {
      var self = event.data;
      console.log('error while loading image');
      swtr.appView.$overlay.hide();
      self.helpview.step(8);
    },
    initImageAnno: function() {
      // img is a jquery object which annotorious doesn't accept; instead it
      // takes the native object returned by a browser API; fortunately, jqeury
      // stores a copy of the native object too!

      this.getExistingAnnotations();

    },
    getExistingAnnotations: function() {
      var self = this;
      this.helpview.step(0);
      swtr.appView.$overlay.show();
      swtr.sweets.getAll({
        where: this.imgURL,
        success: function(data) {
          if(_.isArray(data)) {
            swtr.sweets.add(data);
            swtr.appView.$overlay.hide();
            self.helpview.step(2);
          }
        },
        error: function(jqxhr, error, statusText) {
          if(jqxhr.status === 404) { //annotations don't exist for this image
            console.log('annotations don\'t exist for this image. Create one!');
          }
          swtr.appView.$overlay.hide();
          self.helpview.step(2);
        }
      });
    },
    toggleAnnoAreas: function() {
      if($('#toggle-anno-areas').is(':checked')) {
        $('.annotorious-item-unfocus').css('opacity',  '0.5');
      }
      else {
        $('.annotorious-item-unfocus').css('opacity', '0');
      }
    }
  });
})(swtr);
