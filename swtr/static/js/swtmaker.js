(function(swtr) {

  //TODO: find a better way to init.
  //Find a better way to do closure
  //Remove script code from the HTML page
  swtr.init = function() {
    this.sweets = new ImgAnnoSwts();
    this.appView = new AppView();
    this.who = 'Guest';

    $.ajaxSetup({
      xhrFields: {
        // we need this to send cookies to cross-domain requests
        withCredentials: true
      },
      //some browsers won't make cross-domain ajax until it is explicitly set
      crossDomain: true
    });
    this.handleOAuth();
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
          how: JSON.stringify(this.getHumanReadableParts(swt.get('how')))
        }));
      }, this);
      $(this.el).fadeIn(300);
    },
    getHumanReadableParts: function(how) {
      var human_readable_json = {};
      if(how.comment) {
        human_readable_json['comment'] = how.comment;
      }
      if(how.title) {
        human_readable_json['title'] = how.title;
      }
      if(how.tags) {
        human_readable_json['tags'] = how.tags;
      }
      if(how.link) {
        human_readable_json['link'] = how.link;
      }
      return human_readable_json;
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
      console.log("postSWr");
      var appView = swtr.appView;
      appView.helpview.step(5);
      appView.$overlay.show();
      try {
        this.collection.post({
          success: function(collection, response) {
            console.log(collection, response);
            swtr.sweets.set(collection);
            //TODO: move this to a annotation view or something
//            anno.removeAll();
            // _.each(swtr.sweets.models, function(swt) {
            //   if(!_.has(swt.get('how'), 'editable')) {
            //     swt.get('how')['editable'] = false;
            //     //console.log(swt.get('how').text.Comment);
            //     swt.get('how').text = swtr.imgAnnoView.createPopupText(swt.get('how'));
            //     //console.log(swt.get('how'));
            //     swt.get('how').text += '\n - by ' + swt.get('who');
            //   }
            //   //console.log(swt.get('how'));
            //   anno.addAnnotation(swt.get('how'));
            // });
            //console.log(swtr.sweets.toJSON());
            swtr.appView.$overlay.hide();
            swtr.appView.helpview.step(6);
          },
          error: function(jqxhr, error, text) {
            console.log(jqxhr, error, text);
            swtr.appView.$overlay.hide();
            swtr.appView.helpview.step(10);
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

  var FilterView = Backbone.View.extend({
    el: $('#filter-div'),
    events: {
      'click #filter-user-div input': 'filter',
      'click #filter-tags-div input': 'filter'
    },
    initialize: function() {
      this.filter_users_template = _.template($('#filter-users').html());
      this.filter_tags_template = _.template($('#filter-tags').html());
      this.render();
    },
    render: function() {
      //console.log(this.collection);
      // pluck uniq authors of sweets
      var authors = _.uniq(this.collection.pluck('who'));
      // render them as filter controls
      _.each(authors, function(author) {
        $('#filter-user-div').append(this.filter_users_template({
          who: author
        }));
      }, this);

      // pluck uniq tags of sweets
      var tags = _.chain(this.collection.pluck('how')).pluck('tags').uniq().
        value();
      // render them as filter controls
      _.each(tags, function(tag) {
        if(tag) {
          $('#filter-tags-div').append(this.filter_tags_template({
            tag: tag
          }));
        }
      }, this);

      //this.delegateEvents();
    },
    filter: function(event) {
      // get id of div - parent to parent to the clicked input
      var target_id = $(event.currentTarget).parent().parent().attr('id');
      // find out user/tag div
      var which = target_id.split('-')[1];

      var selected = [];
      $('#'+target_id + ' input:checked').each(function() {
        selected.push($(this).attr('name'));
      });

      if(which === 'user') {
        this.filterUsers(selected);
      }
      else if(which === 'tags') {
        this.filterTags(selected);
      }
    },
    filterUsers: function(users) {
      if(!users.length) {
        return;
      }
      var filtered_swts = this.collection.filter(function(model) {
        if(_.indexOf(users, model.get('who')) > -1) {
          return model;
        }
      });
      if(filtered_swts.length) {
        anno.removeAll();
        _.each(filtered_swts, function(swt) {
          anno.addAnnotation(swt.get('how'));
        });
      }
    },
    filterTags: function(tags) {
      if(!tags.length) {
        return;
      }
      var filtered_swts = this.collection.filter(function(model) {
        _.each(model.get('how').tags, function(tag) {
          if(_.indexOf(tags, tag) > -1) {
            return model;
          }
        });
      });
      if(filtered_swts.length) {
        anno.removeAll();
        _.each(filtered_swts, function(swt) {
          anno.addAnnotation(swt.get('how'));
        });
      }
    },
    filterSweet: function(event) {
      /*if(!event.currentTarget.checked) {
        var results = this.collection.filter(function(model) {
          if(model.get('who') != event.currentTarget.name)
            return model;
        });
        if(results.length) {
          _.each(results, function(result) {
            anno.removeAnnotation(result.get('how'));
          });
        }
        else { // if results is empty then remove all anno.
          anno.removeAll();
        }
      }
      else {
        results = this.collection.filter(function(model) {
          if(model.get('who') == event.currentTarget.name)
            return model;
        });
        _.each(results, function(result) {
          anno.addAnnotation(result.get('how'));
        });

      }
      // if(results) {
      //   anno.removeAll();
      // }
      // swtr.annoView.collection = results;
      // swtr.annoView.renderWith();*/
    }
  });

  var AppView = Backbone.View.extend({
    el: $('#swtr-root'),
    events: {
      'click #user-input-submit': 'submitUserInput',
      'click #sweet': 'sweet',
      'click #sign-in': 'signIn',
      'click #ocd-source': 'sourceChanged'
      //'mouseup .annotorious-editor-button-save': 'addnew_anno'
    },
    initialize: function() {
      // initialize components
      this.source = 'none';
      this.helpview = new HelpView();
      this.sweetsview = new SweetsView({collection: swtr.sweets});

      // cache jquery selected elements which are used frequently
      this.$overlay = $('#app-overlay');
      this.$img = $('#annotatable-img');

      this.helpview.step(1);
      // initialize the oauth stuff
      this.oauth = new Oauth({
        app_id: swtr.app_id,
        endpoint: swtr.swtstoreURL() + swtr.endpoints.auth,
        redirect_uri: swtr.oauth_redirect_uri,
        scopes: 'email,sweet'
      });
    },
    submitUserInput: function(event) {
      event.preventDefault();
      var input = $('#user-input').val();
      if(this.source === 'ocd') {
        this.loadOCDSearch(input);
      }
      else if (this.source === 'none') {
        this.loadURL(input);
      }
    },
    // load a URL for annotation (can be of image or html resource for now)
    loadURL: function(url, type) {
      //console.log('loadURL()');
      if(this.source !== 'ocd') {
        $('#ocd-results').hide();
      }
      $('#img-annotation-wrapper').show();
      if(!url || !url.match(/http/)) {
        this.helpview.step(13);
        return false;
      }
      // if type is given explicitly; we load it as such.
      if(type === 'image') {
        if(swtr.imgAnnoView) {
          swtr.imgAnnoView.setImage(url);
        }
        else {
          swtr.imgAnnoView = new swtr.ImgAnnoView({collection:swtr.sweets,
                                                   img: this.$img[0],
                                                   $img: this.$img,
                                                   url: url});
        }
        return false;
      }
      // else try to find what resource is the URL..
      // if url has an image extension then load the image annotation
      if(url.match(/.jpg|.jpeg|.png|.gif|.bmp|.svg/)) {
        if(swtr.imgAnnoView) {
          swtr.imgAnnoView.setImage(url);
        }
        else {
          swtr.imgAnnoView = new swtr.ImgAnnoView({collection:swtr.sweets,
                                                   img: this.$img[0],
                                                   $img: this.$img,
                                                   url: url});
        }

        return false;
      }
      // else check with our /media-type endpoint to see what type of resource
      // it is
      else {
        this.helpview.step(12);
        this.$overlay.show();
        var self = this;
        $.get('/media-type', {where: url}, function(response) {
          //console.log(response);
          self.$overlay.hide();
          if(response.type === 'image') {
            if(swtr.imgAnnoView) {
              swtr.imgAnnoView.setImage(url);
            }
            else {
              swtr.imgAnnoView = new swtr.ImgAnnoView({collection:swtr.sweets,
                                                       img: self.$img[0],
                                                       $img: self.$img,
                                                       url: url});
            }
          }
          else {
            window.location.href = '/annotate?where=' + url;
          }
        });
      }
    },
    getSweets: function() {
      var annos = _.filter(anno.getAnnotations(), function(anno) {
        return (!_.has(anno, 'editable') || anno.editable === true);
      });

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
      this.sweetsview.render();
    },
    sweet: function() {
      this.getSweets();
      this.showSweets();
      return false;
    },
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
    },
    changeURLInputPlaceholder: function(source) {
      switch (source) {
        case 'ocd'  : $('#user-input').attr('placeholder', 'Enter search query');
                      break;
        case 'none' : $('#user-input').attr('placeholder', 'Enter URL of image or web page');
                      break;
      }
    },
    // function to change the source in the application and update the UI
    changeSource: function(source) {
      switch (source) {
        case 'ocd'  : this.source = 'ocd';
                      this.helpview.step(11);
                      this.changeURLInputPlaceholder('ocd');
                      break;
        case 'none' : this.source = 'none';
                      this.helpview.step(1);
                      this.changeURLInputPlaceholder('none');
                      break;
      }
    },
    // event handler to capture control panel UI change of source
    sourceChanged: function(event) {
      if($('#ocd-source').is(':checked')) {
        this.changeSource('ocd');
      }
      else {
        this.changeSource('none');
      }
    },
    loadOCDSearch: function(input) {
      var self = this;
      $('#img-annotation-wrapper').hide();
      $('#ocd-results').show();
      $('#ocd-results').html('<h4 style="text-align: center;">Loading..</h4>');
      $.ajax({
        type: 'GET',
        url: '/search/ocd',
        data: {query: input},
        success: function(data) {
          self.ocdView = new OCDView({
            query: input,
            data: data,
            model: data.hits.hits
          });
        }
      });
    }
  });

  var OCDView = Backbone.View.extend({
    el: $('#ocd-view'),
    events: {
      'click .ocd-item a': 'onImgClick',
      'click .pager li': 'onPagerClick'
    },
    initialize: function(opts) {
      this.data = opts.data || {};
      this.query = opts.query || '';
      this.size = 9; // num of items per page
      this.page = 0;
      this.item_template = _.template($('#ocd-item-template').html());
      this.base_template = _.template($('#ocd-view-base-template').html());
      this.render();
    },
    render: function() {
      var $row_el;
      this.$el.html('');
      if(!this.model.length) {
        this.$el.html('No results could be found from your query.');
        return;
      }
      this.$el.html(this.base_template());
      var $el = $('#ocd-results');
      _.each(this.model, function(item, idx) {
        // put every 3 items in a row
        if(idx % 3 === 0) {
          $row_el = $('<div class="row"></div>');
          $el.append($row_el);
        }
        $row_el.append(this.item_template({
          title: item._source.title,
          media_url: item._source.media_urls[0].url,
          authors: item._source.authors
        }));
      }, this);
      this.resolveOCDURLs();
      this.appendTotal();
    },
    appendTotal: function() {
      $('#ocd-total-results').html(this.data.hits.total + ' results found.');
    },
    // resolve the OCD media URLs
    resolveOCDURLs: function() {
      var self = this;
      $('.ocd-item').each(function(idx, elem) {
        var temp_arr = self.model[idx]._source.media_urls[0].url.split('/');
        var media_hash = temp_arr[temp_arr.length - 1];
        $.get('/resolve-ocd-media', {hash: media_hash}, function(resp) {
          $(elem).find('img').attr('src', resp.url);
        });
      });
    },
    rerender: function(data) {
      this.data = data;
      this.model = data.hits.hits;
      this.render();
    },
    onPagerClick: function(event) {
      event.preventDefault();
      var elem = $(event.currentTarget);
      var self = this;
      if(elem.hasClass('next')) {
        if((this.page + 1) * this.size >= this.data.hits.total) {
          console.log('no next page to go to');
          return false;
        }
        console.log('clicked next');
        this.search({
          query: this.query,
          from: (this.page + 1) * this.size
        }, function(resp) {
          console.log('reached next page');
          self.page = self.page + 1;
          self.rerender(resp);
        });
      }
      else if (elem.hasClass('previous')) {
        if(this.page <= 0) {
          console.log('no prev page to go to');
          return false;
        }
        console.log('clicked prev');
        this.search({
          query: this.query,
          from: (this.page - 1) * this.size
        }, function(resp) {
          console.log('reached prev page');
          self.page = self.page - 1;
          self.rerender(resp);
        });
      }
      return false;
    },
    onImgClick: function(event) {
      event.preventDefault();
      // TODO: init the image anno
      var url = $(event.currentTarget).find('img').attr('src');
      swtr.appView.loadURL(url, 'image');
      return false;
    },
    search: function(data, cb) {
      swtr.appView.$overlay.show();
      var self = this;
      $.ajax({
        type: 'GET',
        url: '/search/ocd',
        data: data,
        success: function(resp) {
          swtr.appView.$overlay.hide();
          cb(resp);
        }
      });
    }
  });

  var HelpView = Backbone.View.extend({
    el: $('#helpview'),
    events: {
    },
    initialize: function() {
      this.$text_el = $('#helpview-text');
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
      case 1: text = 'Enter URL of an image or web page below, and start annotating!';
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
      case 10: text = 'Oops! Something went wrong. We couldn\'t publish the sweets. Try again.'
               break;
      case 11: text = 'Search in <a href="http://www.opencultuurdata.nl/">Open Cuultur Data API</a>';
               break;
      case 12: text = 'Analyzing the resource type..';
               break;
      case 13: text = 'This does not seem to be a URL. Please enter a valid URL.';
               break;
      }
      $(this.$text_el).html(text);
      $(window).scrollTop(0, 0);
    }
  });


  // utilities and helper functions to go here
  swtr.utils = {
    linkify: function(link) {
      if(link.match('http')) {
        return link;
      }
      else {
        return 'http://' + link;
      }
    }
  };

  //swtr.AppView = AppView;

})(swtr);
