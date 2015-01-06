(function(window) {
  window.swtr = window.swtr || {};

  var PlayAreaView = Backbone.View.extend({
    id: 'play-page-container',
    events: {
      'click #user-input-submit': 'submitUserInput',
      'click #sweet': 'sweet'
    },
    initialize: function(args) {
      this.params = args || {};
      console.log('got params', this.params);
      var self = this;
      this.template = _.template($('#play-page-template').html());
      this.helpview = new swtr.HelpView();
      // create a cache to store the text annos coming from the child iframe
      this.txt_anno_swts = new swtr.ImgAnnoSwts();

      this.render();
      this.sweetsview = new swtr.SweetsView({
        el: $('#sweet-list-wrapper'),
        collection: swtr.sweets,
        helpview: this.helpview
      });
      this.$img = $('#annotatable-img');
      this.$img_wrapper = $('#img-annotation-wrapper');
      this.$txt_wrapper = $('#txt-anno-wrapper');
      this.$txt = $('#txt-anno-frame');

      //this.sweetsview.on('postedSweets', this.rerenderAnnos);
      this.helpview.step(1);

      var eventMethod = window.addEventListener ? 'addEventListener' :
        'attachEvent';
      var messageEvent = eventMethod == 'attachEvent' ? 'onmessage' :
        'message';
      var eventer = window[eventMethod];

      // Listen to message from child window
      eventer(messageEvent, function(e) {
        var key = e.message ? 'message' : 'data';
        var data = e[key];
        //run function//
        console.log(data + ' from postMessage');
        data = JSON.parse(data);

        if(data['event'] === 'annotationCreated') {
          self.updateTextAnnos(data);
        }
        if(data['event'] === 'imgClicked') {
          self.imgClickedFrmTxtAnno(data);
        }
        if(data['event'] === 'updatedURL') {
          self.updateURLs(data.data.url);
        }
      }, false);

      // if params are passed..load the component to that state..
      if(this.params.url) {
        this.loadURL(decodeURIComponent(this.params.url), this.params.type);
      }
    },
    render: function() {
      this.$el.html(this.template());
      $('#play-page').html(this.$el);
    },
    submitUserInput: function(event) {
      event.preventDefault();
      var input = $('#user-input').val();
      this.loadURL(input);
    },
    getSweets: function() {
      //console.log('getSweets');
      // check if text anno swts exist..
      if(this.txt_anno_swts.length) {
        this.txt_anno_swts.each(function(swt) {
          //console.log('swt in txt anno swts', swt);
          swtr.sweets.add(swt);
        });
      }

      // get image anno swts from annotorious
      var annos = _.filter(anno.getAnnotations(), function(anno) {
        return (!_.has(anno, 'editable') || anno.editable === true);
      });
      //console.log(annos);

      _.each(annos, function(anno) {
        swtr.sweets.add({
          who: swtr.who,
          where: anno.src,
          // remove the text field; we don't want to store that in the sweets
          how: _.omit(anno, 'text')
        });
      });
    },
    showSweets: function() {
      //console.log('showSweets');
      this.sweetsview.render();
    },
    sweet: function(event) {
      event.preventDefault();
      console.log('sweeting');
      this.getSweets();
      this.showSweets();
      return false;
    },
    // function to update the urls in the UI if an image is loaded internally
    // and not from user UI.
    updateURLs: function(url) {
      $('#user-input').val(url);
      swtr.app_router.navigate('play?url=' + encodeURIComponent(url));
    },
    // load a URL for annotation (can be of image or html resource for now)
    loadURL: function(url, type) {
      console.log('loadURL(' + url + ',' + type + ')');
      if(!url) {
        this.helpview.step(13);
        return false;
      }
      if(!url.match(/http/)) {
        url = 'http://' + url;
      }
      this.loaded_url = url;

      // if type is given explicitly; we load it as such.
      if(type) {
        if(type === 'image') {
          this.initImageAnno(url);
        }
        else if(type === 'text') {
          this.initTextAnno(url);
        }
      }
      // else try to find what resource is the URL..
      else {
        // if url has an image extension then load the image annotation
        if(url.match(/.jpg|.jpeg|.png|.gif|.bmp|.svg/)) {
          this.initImageAnno(url);
        }
        // else check with our /media-type endpoint to see what type of resource
        // it is
        else {
          this.helpview.step(12);
          swtr.appView.$overlay.show();
          var self = this;
          $.ajax({
            type: 'GET',
            url: '/media-type',
            data: {where: url},
            success: function(response) {
              //console.log(response);
              swtr.appView.$overlay.hide();
              if(response.type === 'image') {
                self.initImageAnno(url);
              }
              else {
                self.initTextAnno(url);
              }
            },
            error: function(error) {
              console.log('error');
              swtr.appView.$overlay.hide();
              self.helpview.step(13);
            }
          });
        }
      }
      this.updateURLs(url);
    },
    initImageAnno: function(url) {
      this.$txt_wrapper.hide();
      this.$img_wrapper.show();

      if(swtr.imgAnnoView) {
        swtr.imgAnnoView.setImage(url);
      }
      else {
        swtr.imgAnnoView = new swtr.ImgAnnoView({
          collection: swtr.sweets,
          img: this.$img[0],
          $img: this.$img,
          url: url,
          helpview: this.helpview
        });
      }
    },
    initTextAnno: function(url) {
      this.$img_wrapper.hide();
      this.$txt_wrapper.show();

      // the current url is already loaded..
      if(this.$txt.attr('src') !== url) {
        var txt_anno_endpoint = swtr.endpoints.annotate_webpage +
          '?where=' + url;

        var box_width = this.$txt_wrapper.css('width').split('px')[0];
        box_width = box_width - 30;

        this.$txt.attr('src', txt_anno_endpoint);
        this.$txt.attr('width', box_width);
        var self = this;

        // Load txt anno swts of current url
        swtr.sweets.getAll({
          where: url,
          what: 'txt-anno',
          success: function(data) {
            swtr.sweets.add(data);
            self.$txt.on('load', function() {
              console.log(this);
              this.contentWindow.postMessage(JSON.stringify(data), '*');
              console.log("posted");
            });
          },
          error: function(data, response) {
            console.log("error while getting swts of txt anno" +
                data + ", " + response);
          }
        });
      }
      this.helpview.step(14);
    },
    updateTextAnnos: function(payload) {
      // Create a object of swt with required values.
      var annotation = payload.data;
      var swt = {};
      swt.how = annotation;
      swt.what = 'txt-anno';
      swt.who = swtr.who;
      swt.where = this.$txt.attr('src').split('where=')[1];

      // add the swt to the cache
      this.txt_anno_swts.add(swt);
      this.helpview.step(3);
      $('#sweet').show();
    },
    imgClickedFrmTxtAnno: function(payload) {
      var url = payload.data.url;
      this.loadURL(url);
    },
    destroy: function() {
      this.helpview.remove();
      this.remove();
    }
  });

  swtr.PlayAreaView = PlayAreaView;
})(window);
