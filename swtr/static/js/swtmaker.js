(function(swtr) {

  //TODO: find a better way to init.
  //Find a better way to do closure
  //Remove script code from the HTML page
  swtr.init = function() {
    swtr.sweets = new ImgAnnoSwts();
    swtr.appView = new AppView();
    swtr.who = 'Guest';

    $.ajaxSetup({
      xhrFields: {
        // we need this to send cookies to cross-domain requests
        withCredentials: true
      },
      //some browsers won't make cross-domain ajax until it is explicitly set
      crossDomain: true
    });
    swtr.handleOAuth();
  };

  swtr.handleOAuth = function() {
    if(swtr.access_token) {
      $('#signinview').html('Signing you in..');
      $.ajax({
        url: swtr.swtstoreURL()+'/api/users/me?access_token='+
          swtr.access_token,
        success: function(data) {
          swtr.appView.userLoggedIn(data.username);
        },
        error: function() {
          $('#signinview').html('Error signing in! Please try again');
        }
      });
    }
  };

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
  var ImgAnnoSwts = Backbone.Collection.extend({
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
      /*if(!swtr.access_token) {
        throw new Error('Access Token required to get query that API');
      }*/
      // setting up params
      var where = options.where,
          who = options.who || null;
          url = swtr.swtstoreURL() + swtr.endpoints.get + '?where=' +
            encodeURIComponent(where) + '&access_token=' + swtr.access_token;
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

  var SweetsView = Backbone.View.extend({
    el: $('#sweet-list-wrapper'),
    events: {
      'click #sweet-cancel': 'cancelSweeting',
      'click #post-sweet': 'postSweets'
    },
    initialize: function() {
      this.template = _.template($('#sweet-template').html());
    },
    render: function() {
      $('#sweet-list').html('<h4>These are your sweet annotations!</h4>');
      _.each(this.collection.models, function(swt) {
        if(swt.has('id')) {
          return false;
        }
        $('#sweet-list').append(this.template({
          who: swt.get('who'),
          what: swt.get('what'),
          where: swt.get('where'),
          how: JSON.stringify(swt.get('how').text)
        }));
      }, this);
      $(this.el).fadeIn(300);
    },
    cancelSweeting: function() {
      this.removeSwtsNotPosted();
      this.cleanUp();
    },
    removeSwtsNotPosted: function() {
      var notPosted = this.collection.filter(function(model) {
        return !model.has('id');
      });
      this.collection.remove(notPosted);
    },
    postSweets: function() {
      var appView = swtr.appView;
      appView.helpview.step(5);
      appView.$overlay.show();
      try {
        this.collection.post({
          success: function(collection, response) {
            console.log(collection, response);
            swtr.sweets.update(collection);
            //TODO: move this to a annotation view or something
            anno.removeAll();
            _.each(swtr.sweets.models, function(swt) {
              if(!_.has(swt.get('how'), 'editable')) {
                swt.get('how')['editable'] = false;
                swt.get('how').text += '\n - by ' + swt.get('who');
              }
              console.log(swt.get('how'));
              anno.addAnnotation(swt.get('how'));
            });
            //console.log(swtr.sweets.toJSON());
            appView.overlay.hide();
            appView.helpview.step(6);
          },
          error: function(jqxhr, error, text) {
            console.log(jqxhr, error, text);
          }
        });
      } catch(e) {
        if(e.message == 'Access Token is required to sweet') {
          appView.$overlay.hide();
          appView.helpview.step(9);
        }
      }
      this.cleanUp();
      return false;
    },
    cleanUp: function() {
      //console.log('cleaning up');
      $(this.el).hide();
    }
  });

  var AppView = Backbone.View.extend({
    el: $('#swt-maker'),
    events: {
      'click #img-url-load': 'setImage',
      'click #img-url-submit': 'setImage',
      'click #sweet': 'sweet',
      'click #sign-in': 'signIn',
      'click #setbox': 'showHide',
      'change .form-control': 'button_custom',
      'mouseup .annotorious-editor-button-save': 'add_new_anno'
    },
    initialize: function() {
      // initialize components
      this.helpview = new HelpView();
      this.sweetsview = new SweetsView({collection: swtr.sweets});

      //register handlers for annotorious events
      anno.addHandler('onAnnotationCreated', this.showSwtHelp);
      anno.addHandler('onAnnotationUpdated', this.showSwtHelp);
      anno.addHandler('onSelectionStarted', function(annotation) {
        anno.hideAnnotations();});
      anno.addHandler('onSelectionCompleted', function(annotation) {
        anno.showAnnotations();
      });
      anno.addPlugin('CustomFields', {});
      anno.addHandler('onSelectionCompleted', this.setShape);

      // cache jquery selected elements which are used frequently
      this.$overlay = $('#app-overlay');
      this.$img = $('#annotatable-img');

      // attach a load event handler, whenever an image is loaded..
      this.$img.on('load', this, this.imageLoaded);
      this.$img.on('error', this, this.onImageLoadError);

      // check if already an image is provided at load time..
      this.imgURL = this.$img.attr('src');
      if(this.imgURL) {
        this.initImageAnno();
        $('#img-url-input').val(this.imgURL);
      }
      else {
        this.helpview.step(1);
      }

      // initialize the oauth stuff
      this.oauth = new Oauth({
        app_id: swtr.app_id,
        app_secret: swtr.app_secret,
        endpoint: swtr.swtstoreURL() + swtr.endpoints.auth,
        redirect_uri: swtr.oauth_redirect_uri,
        scopes: 'email,sweet'
      });
    },
    setImage: function(event) {
      event.preventDefault();
      this.imgURL = $('#img-url-input').val();
      if(!this.imgURL) {
        return false;
      }
      anno.reset();
      var self = this;
      this.$overlay.show();
      this.helpview.step(7);
      this.$img.attr('src', this.imgURL);
      return false;
    },
    imageLoaded: function(event) {
      var self = event.data;
      console.log('image loaded');
      self.$overlay.hide();
      self.initImageAnno();
    },
    // when image fails to load - could be because of broken URL or network
    // issues
    onImageLoadError: function(event) {
      var self = event.data;
      console.log('error while loading image');
      self.$overlay.hide();
      self.helpview.step(8);
    },
    initImageAnno: function() {
      // img is a jquery object which annotorious doesn't accept; instead it
      // takes the native object returned by a browser API; fortunately, jqeury
      // stores a copy of the native object too!
      anno.makeAnnotatable(this.$img[0]);
      this.getExistingAnnotations();
    },
    getExistingAnnotations: function() {
      var self = this;
      this.helpview.step(0);
      this.$overlay.show();
      //console.log('getting existing annotations of ', this.imgURL);
      swtr.sweets.getAll({
        where: this.imgURL,
        success: function(data) {
          console.log(data);
          if(_.isArray(data)) {
            console.log('data is array');
            swtr.sweets.add(data);
            _.each(data, function(swt) {
              swt.how['editable'] = false;
              swt.how.text += '\n - by ' + swt.who;
              anno.addAnnotation(swt.how);
              console.log('swt.how = ', swt.how);
            });
            self.$overlay.hide();
            self.helpview.step(2);
          }
        },
        error: function(jqxhr, error, statusText) {
          if(jqxhr.status === 404) { //annotations don't exist for this image
            console.log('annotations don\'t exist for this image. Create one!');
          }
          self.$overlay.hide();
          self.helpview.step(2);
        }
      });
    },
    showSwtHelp: function(annotation) {
      var self = swtr.appView;//TODO: figure out how we can bind the scope when this func is called as a callback
      self.helpview.step(3);
      $('#sweet').show();
    },
    getSweets: function() {
      var annos = _.filter(anno.getAnnotations(), function(anno) {
        return (!_.has(anno, 'editable') || anno.editable === true);
      });

      _.each(annos, function(anno) {
        swtr.sweets.add({
          who: swtr.who,
          where: anno.src,
          how: newanno  //mysterious link to create the sweet with new anno attributes, tags, links, labels
        });
      });
    },
    showSweets: function() {
      this.sweetsview.render();
    },
    sweet: function() {
      this.getSweets();
      this.showSweets();
      return false;
    },
    showHide: function() {
      if($("input:checked").length) {
        //$("p").toggle();
        $('.annotorious-item-unfocus').css("opacity",  "0.5");
      }
      else {
        //$("p").toggle();
        $('.annotorious-item-unfocus').css("opacity", "0");
      }
    },
    //annotorious editor widget - custom with options
    //to obtain shapes object, declaring annotation in global scope - TODO refactor
    //code to find better way to do this.
    setShape: function(annotation) {
      $('.annotorious-editor-text').hide();
      $('.annotorious-editor').css("width", "100%");
      window.annotation=annotation;
      annotation.text = [];
    },
    //to create new annotation object
    inputStore: function(opt) {
      var temp = opt;
      var src = $('#img-url-input').val();
      this.newanno = {'src':src, 'text':temp, 'shapes': [{'type':annotation.shape.type, 'geometry':{'x':annotation.shape.geometry.x, 'y':annotation.shape.geometry.y, 'width':annotation.shape.geometry.width, 'height':annotation.shape.geometry.height}},], 'context':window.location.origin};

    },

    //to add the final annotation

    //save button - event bind
    add_new_anno: function(event) {
      var $selected = $('select option:selected');
      var tempinput = $selected.text()+': '+$('.annotorious-editor textarea').val();
      this.newanno.text.push(tempinput);
      var newinput = this.newanno.text.toString();
      this.newanno.text = newinput;
      console.log('this.newanno = ', this.newanno);
      //this.to_Add(this.newanno);
      var newanno = this.newanno;
      window.newanno = newanno;
    },
    //dropdown event
    button_custom: function(event) {
      $('.annotorious-editor-text').show();
      var $selected = $('select option:selected');
      var tempinput = $selected.prev().text()+ ': '+$('.annotorious-editor-text').val();
      if(tempinput === "Choose an Option: "){
        console.log('');
      }
      else {
      annotation.text.push(tempinput);
      }
      this.inputStore(annotation.text);
      $('.annotorious-editor-text:first').val("");
      $('.annotorious-editor-text:first').attr('placeholder', 'Add a '+$selected.text());
    },
    // to sign in the user to swtstore..just make a call to the oauth endpoint
    signIn: function(event) {
      event.preventDefault();
      this.oauth.authorize();
      return false;
    },
    userLoggedIn: function(username) {
      swtr.who = username;
      var text = 'You are signed in as <b>' + swtr.who + '</b>';
      $('#signinview').html(text);
    },
    userLoggedOut: function() {
      swtr.who = 'Guest';
      $('#signinview').html('Logged out');
    }
  });

  var HelpView = Backbone.View.extend({
    el: $('#helpview'),
    events: {
    },
    initialize: function() {
    },
    //TODO: move from number based steps to something else. number based steps
    //implicitly imply sequential processing..which does not happen in this
    //case..
    //following helps can be async..
    step: function(n) {
      var text = '';
      switch (n) {
        case 0 : text = 'Getting annotations..';
                 break;
        case 1: text = 'Enter the URL of an image below, and start annotating!';
                break;
        case 2: text = 'Annotate the image, or see other annotations';
                break;
        case 3: text = 'Now you can sweet this annotation, or add more annotations';
                break;
        case 4: text = 'Click Sweet button to publish these annotations to the Sweet Store';
                break;
        case 5: text = 'Publishing your sweets';
                break;
        case 6: text = 'Sweets successfully posted';
                break;
        case 7: text = 'Fetching your image..';
                break;
        case 8: text = 'Oops! Seems like the image URL is wrong! Or we couldn\'t fetch the image.';
                break;
        case 9: text = 'You have to be <i>signed in</i> to sweet store to post sweets';
                break;
      }
      $(this.el).html(text);
      $(window).scrollTop(0, 0);
    }
  });

  // utilities and helper functions to go here
  swtr.utils = {};

  //swtr.AppView = AppView;

})(swtr);
