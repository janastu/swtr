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
      console.log('swts to be posted', dummy_collection.toJSON());

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
      'keydown .annotorious-editor-button-save': 'getFormValue',
      'mousedown .annotorious-editor-button-save': 'getFormValue',
      'click #toggle-anno-areas': 'toggleAnnoAreas',
      // HACK: hook to the annotorious editing via the UI :(
      'click .annotorious-popup-button-edit': 'editAnno'
    },
    initialize: function(options) {
      this.$el = $('#img-annotation-wrapper');
      this.listenTo(this.collection, 'add', this.render);
      // this.listenTo(this.collection, 'change', this.render);
      var self = this;

      // attach event handlers to the anno object
      anno.addHandler('onAnnotationCreated', this.showSwtHelp);
      anno.addHandler('onAnnotationCreated', this.updateNewAnno);
      anno.addHandler('onAnnotationUpdated', this.updateNewAnno);
      anno.addHandler('onSelectionStarted', function(annotation) {
        anno.hideAnnotations();
      });
      anno.addHandler('onSelectionCompleted', function(annotation) {
        anno.showAnnotations();
      });

      // save the current anno in a cache when a user hovers over an anno
      // TODO: this is part of a hack to hook into annotorious' edit event
      // state and get the current editing annotation
      anno.addHandler('onMouseOverAnnotation', function(event) {
        self.current_anno = event['$annotation$'];
      });
      anno.addHandler('onMouseOutOfAnnotation', function(event) {
        self.current_anno = undefined;
      });

      anno.addPlugin('CustomFields', {});
      anno.addHandler('onSelectionCompleted', _.bind(this.hideOriginalEditor, this));

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
      console.log('rendering swt as anno', swt);
      //anno.removeAnnotation(swt.how);
      swt.how['editable'] = false;
      //swt.how.text = this.createPopupText(swt.how);
      //swt.how.text += '\n - by ' + swt.who;
      console.log('adding anno to torious', swt.how);
      anno.addAnnotation(swt.how);
    },
    renderWith: function() {
      this.collection.each(this.render, this);
    },
    showSwtHelp: function(annotation) {
      var self = swtr.imgAnnoView;
      //TODO: figure out how we can bind the scope when this func is called as a callback
      self.helpview.step(3);
      $('#sweet').show();
    },
    updateNewAnno: function(annotation) {
      //console.log('updateNewAnno()');
      var self = swtr.imgAnnoView;
      self.new_anno.comment = annotation.text;
      //self.new_anno.text = self.createPopupText(self.new_anno);
      // update the annotorious annotation object with the new values
      if(self.new_anno.comment) {
        annotation.comment = annotation.text;
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
      annotation.text = '';
      //annotation.text = self.new_anno.text;
      //console.log(self.new_anno, annotation);
    },
    // hide the original editor window, when user has completed selecting part
    // of the image to annotate..
    hideOriginalEditor: function(annotation) {
      //console.log('hideOriginalEditor()');
      this.new_anno = {};
      this.initBSTags([], this.tags_suggestions);
      //self.getSuggestionsForTags();
      //$('.annotorious-editor-text').hide();
      //$('.annotorious-editor').css('width', '100%');
    },
    // initialize the bootstrap tags component..
    initBSTags: function(initial_tags, suggested_tags) {
      $('#tags-input').tags({
        tagSize: 'md',
        promptText: 'Add tags: type a word (and press enter)',
        caseInsensitive: true,
        tagData: (initial_tags && initial_tags.length) ?
          initial_tags : [],
        suggestions: (suggested_tags && suggested_tags.length) ?
          suggested_tags : []
      });
    },
    getFormValue: function(event) {
      //console.log('getFormValue()');
      var comment = $('.annotorious-editor-text[placeholder="Add a Comment..."]').val();
      if(comment) {
        this.new_anno['comment'] = comment;
      }
      var title = $('#title-input').val();
      if(title) {
        this.new_anno['title'] = title;
      }
      var link = $('#link-input').val();
      if(link) {
        this.new_anno['link'] = link;
      }
      var tags = $('#tags-input').tags().getTags();
      if(tags.length) {
        this.new_anno['tags'] = tags;
      }

      /*$('.annotorious-editor-text').each(function(index, element) {
        if( index === 0) {
          self.new_anno['comment'] = $(element).text();
        console.log(index, $(element).text() );
        }
        else if ( index === 1) {
          self.new_anno['title'] = $(element).val();
        console.log(index, $(element).val() );
        }
        else if (index === 2) {
          self.new_anno['link'] = $(element).val();
        console.log(index, $(element).val() );
        }
        else {
          self.new_anno['tags'] = $(element).tags().getTags();
          console.log(index, $('#tags-input').tags().getTags() );
        }
      });*/
    },
    editAnno: function(event) {
      //console.log('edit anno');
      if(this.current_anno.comment) {
        $('.annotorious-editor-text[placeholder="Add a Comment..."]').val(this.current_anno.comment);
      }
      if(this.current_anno.title) {
        $('#title-input').val(this.current_anno.title);
      }
      if(this.current_anno.link) {
        $('#link-input').val(this.current_anno.link);
      }
      if(this.current_anno.tags) {
        this.initBSTags(this.current_anno.tags, this.tags_suggestions);
      }
      else {
        this.initBSTags([], this.tags_suggestions);
      }
    },
    createPopupText: function(annotation) {
      // title
      var text = (annotation.title) ? '<h4>' + annotation.title + '</h4>' : '';

      // comment
      text += (annotation.comment) ? '<p>' + annotation.comment + '</p>' : '';

      // link
      text += (annotation.link) ? '<p><a target="blank" href="' +
        swtr.utils.linkify(annotation.link) + '">' + annotation.link +
        '</a></p>' : '';

      // tags
      if(annotation.tags) {
        text += (annotation.tags.length) ? '<p>[' + annotation.tags + ']</p>' : '';
      }

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
      //console.log('image loaded', self);
      swtr.appView.$overlay.hide();
      self.showImgAnnoControls();
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
    showImgAnnoControls: function() {
      $('#img-anno-controls').show();
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
            //self.renderWith();
            swtr.appView.$overlay.hide();
            self.toggleAnnoAreas();
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
