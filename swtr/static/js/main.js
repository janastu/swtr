(function(swtr) {

  //TODO: find a better way to init.
  //Find a better way to do closure
  //Remove script code from the HTML page
  swtr.init = function() {
    this.sweets = new swtr.ImgAnnoSwts();
    this.appView = new AppView();
    this.who = 'Guest';

    this.app_router = new AppRouter();
    Backbone.history.start();
    this.app_router.start();

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

  var SweetsView = Backbone.View.extend({
    el: $('#sweet-list-wrapper'),
    events: {
      'click #sweet-cancel': 'cancelSweeting',
      'click #post-sweet': 'postSweets'
    },
    initialize: function(opts) {
      this.template = _.template($('#sweet-template').html());
      this.helpview = opts.helpview;
      //this.setElement(opts.el);
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
      this.$el.fadeIn(300);
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
      var appView = swtr.appView;
      var self = this;
      this.helpview.step(5);
      appView.$overlay.show();
      try {
        this.collection.post({
          success: function(collection, response) {
            console.log(collection, response);
            swtr.sweets.set(collection);
            appView.$overlay.hide();
            self.helpview.step(6);
          },
          error: function(jqxhr, error, text) {
            console.log(jqxhr, error, text);
            appView.$overlay.hide();
            self.helpview.step(10);
          }
        });
      } catch(e) {
        if(e.message == 'Access Token is required to sweet') {
          appView.$overlay.hide();
          self.helpview.step(9);
        }
      }
      this.cleanUp();
      return false;
    },
    cleanUp: function() {
      //console.log('cleaning up');
      this.$el.hide();
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
      var tags = _.chain(this.collection.pluck('how')).pluck('tags').flatten().
        uniq().value();

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
        //TODO: find a better way of doing this..
        var flag = false;
        _.each(model.get('how').tags, function(tag) {
          if(_.indexOf(tags, tag) > -1) {
            flag = true;
          }
        });
        if(flag === true) {
          return model;
        }
      });
      if(filtered_swts.length) {
        anno.removeAll();
        _.each(filtered_swts, function(swt) {
          anno.addAnnotation(swt.get('how'));
        });
      }
    }
  });

  var AppView = Backbone.View.extend({
    el: $('body'),
    events: {
      'click #sign-in': 'signIn',
      //'mouseup .annotorious-editor-button-save': 'addnew_anno'
    },
    initialize: function() {
      // initialize components
      this.source = 'none';
      //this.helpview = new HelpView();

      // cache jquery selected elements which are used frequently
      this.$overlay = $('#app-overlay');

      //this.helpview.step(1);
      // initialize the oauth stuff
      this.oauth = new Oauth({
        app_id: swtr.app_id,
        endpoint: swtr.swtstoreURL() + swtr.endpoints.auth,
        redirect_uri: swtr.oauth_redirect_uri,
        scopes: 'email,sweet'
      });
    },
    signIn: function(event) {
      event.preventDefault();
      if(swtr.who === 'Guest') {
        this.oauth.authorize();
      }
      return false;
    },
    userLoggedIn: function(username) {
      swtr.who = username;
      var text = 'Signed in as <b><u>' + swtr.who + '</u></b>';
      $('#signinview').html(text);
    },
    userLoggedOut: function() {
      swtr.who = 'Guest';
      $('#signinview').html('Logged out');
    }
  });

  var PlayAreaView = Backbone.View.extend({
    id: '#play-page-container',
    events: {
      'click #user-input-submit': 'submitUserInput',
      'click #sweet': 'sweet'
    },
    initialize: function() {
      this.template = _.template($('#play-page-template').html());
      this.helpview = new HelpView();
      this.render();
      this.sweetsview = new SweetsView({
        el: $('#sweet-list-wrapper'),
        collection: swtr.sweets,
        helpview: this.helpview
      });
      this.$img = $('#annotatable-img');
      this.helpview.step(1);
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
      console.log('getSweets');
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
      console.log('showSweets');
      this.sweetsview.render();
    },
    sweet: function() {
      console.log('sweeting');
      this.getSweets();
      this.showSweets();
      return false;
    },
    // function to update the urls in the UI if an image is loaded internally
    // and not from user UI.
    updateURLs: function(url) {
      $('#user-input').val(url);
    },
    // load a URL for annotation (can be of image or html resource for now)
    loadURL: function(url, type) {
      //console.log('loadURL()');
      if(!url || !url.match(/http/)) {
        this.helpview.step(13);
        return false;
      }
      // if type is given explicitly; we load it as such.
      if(type === 'image') {
        this.initImageAnno(url);
        this.updateURLs(url);
        return false;
      }
      // else try to find what resource is the URL..
      // if url has an image extension then load the image annotation
      if(url.match(/.jpg|.jpeg|.png|.gif|.bmp|.svg/)) {
        this.initImageAnno(url);
        return false;
      }
      // else check with our /media-type endpoint to see what type of resource
      // it is
      else {
        this.helpview.step(12);
        swtr.appView.$overlay.show();
        var self = this;
        $.get('/media-type', {where: url}, function(response) {
          //console.log(response);
          self.appView.$overlay.hide();
          if(response.type === 'image') {
           this.initImageAnno(url);
          }
          else {
            window.location.href = '/annotate?where=' + url;
          }
        });
      }
    },
    initImageAnno: function(url) {
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
    destroy: function() {
      this.helpview.remove();
      this.remove();
    }
  });

  var SearchView = Backbone.View.extend({
    id: 'search-page-container',
    events: {
      'click #search-user-input-submit': 'userInputSubmit'
    },
    initialize: function() {
      this.template = _.template($('#search-page-template').html());
      this.helpview = new HelpView();
      this.render();
      this.helpview.step(11);
    },
    render: function() {
      this.$el.html(this.template());
      $('#search-page').html(this.$el);
    },
    userInputSubmit: function(event) {
      event.preventDefault();
      var input = $('#search-user-input').val();
      this.loadSearch(input);
      return false;
    },
    loadSearch: function(input) {
      var self = this;
      this.$el.append('<div id="ocd-view"></div>');
      $('#ocd-view').html('<h4 style="text-align: center;">Loading..</h4>');
      $.ajax({
        type: 'GET',
        url: '/search/ocd',
        data: {query: input},
        success: function(data) {
          self.ocd_view = new OCDView({
            el: $('#ocd-view'),
            query: input,
            data: data,
            model: data.hits.hits
          });
        }
      });
    },
    destroy: function() {
      this.helpview.remove();
      this.remove();
    },
  });

  var OCDView = Backbone.View.extend({
    el: $('#ocd-view'),
    events: {
      'click .ocd-item a': 'onImgClick',
      'click .ocd-item-cover .close': 'onCoverCloseClick',
      'click .ocd-item-mark': 'onMarkClick',
      'click .pager li': 'onPagerClick'
    },
    initialize: function(opts) {
      this.data = opts.data || {};
      this.query = opts.query || '';
      this.size = 9; // num of items per page
      this.page = 0;
      this.item_template = _.template($('#ocd-item-template').html());
      this.base_template = _.template($('#ocd-view-base-template').html());
      this.cover_template = _.template($('#ocd-item-cover-template').html());
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
          authors: item._source.authors,
          description: item._source.description
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
      //console.log('onImgClick');
      event.preventDefault();
      // TODO: init the image anno
      this.drawCoverOnImg(event);
      //swtr.appView.loadURL(url, 'image');
      return false;
    },
    drawCoverOnImg: function(event) {
      //console.log('highlightImg');
      var elem = $(event.currentTarget).parent().parent();
      // if .ocd-item-cover exists return
      if(elem.find('.ocd-item-cover').length) {
        $(elem.find('.ocd-item-cover')[0]).slideDown();
        return;
      }
      //console.log(elem);
      elem.prepend(this.cover_template());
      $(elem.find('.ocd-item-cover')[0]).slideDown();
    },
    onCoverCloseClick: function(event) {
      var elem = $(event.currentTarget).parent();
      elem.slideUp();
    },
    onMarkClick: function(event) {
      var url = $(event.currentTarget).parent().parent().
        find('img').attr('src');
      //TODO: load the image in the play area/workbench
      console.log('load image anno', url);
      swtr.app_router.loadPlayArea(url, 'image');
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
    id: 'helpview-wrapper',
    events: {
    },
    initialize: function() {
      this.template = _.template($('#helpview-template').html());
      this.render();
      this.$text_el = $('#helpview-text');
    },
    render: function() {
      $('#helpview-container').html(this.$el);
      this.$el.html(this.template({}));
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
      case 3: text = 'Now you can publish this annotation, or add more annotations';
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
      this.$text_el.html(text);
      $(window).scrollTop(0, 0);
    }
  });

  var DummyView = Backbone.View.extend({
    intialize: function() {
      this.render();
    },
    render: function() {
      $('#swtr-root').append('dummy view');
    },
    destroy: function() {
      this.remove();
      this.undelegateEvents();
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
  var LDSwts = Backbone.Collection.extend({
    getAll: function(options) {
      //get all sweets of ocd-anno type
      // error checking
      if(!options.what) {
        throw Error('"what" option must be passed to get sweets of a URI');
        return false;
      }
      // setting up params
      var what = options.what;
      url = swtr.swtstoreURL() + swtr.endpoints.get + '?what=' +
        encodeURIComponent(what) + '&access_token=' + swtr.access_token;
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
    }
  });

  var LDView = Backbone.View.extend({
    id: 'linked-data-container',
    initialize: function() {
      var self = this;
      if(!swtr.LDs) {
        swtr.LDs = new LDSwts();
      }
      if(!swtr.LDs.length) {
        console.log(swtr.LDs);
        this.loader_template = _.template($("#loader-template").html());
        $("#linked-data-page").prepend(this.loader_template());
        swtr.LDs.getAll({
          what: 'img-anno',
          success: function(data) {
            swtr.LDs.add(data);
            if(!swtr.tagCloudView) {
              $("#spinner").remove();
              swtr.tagCloudView = new TagCloudView({collection: swtr.LDs});
            }
          }
        });
      }
    },
    destroy: function() {
      this.cleanUp();
      this.remove();
    },
    cleanUp: function() {
      if(!$("#tag-cloud").is(':visible')) {
        $("#gallery").hide();
        $("#tag-cloud").show();
      }
    }
  });

  var TagCloudView = Backbone.View.extend({
    el: $('#tag-cloud'),
    events: {
      "click #user-tag-cloud li p": "userTagClicked",
      "click #tags-tag-cloud li p": "tagsTagClicked"
    },
    initialize: function() {
      this.user_tag_el = $('#user-tag-cloud');
      this.tags_tag_el = $('#tags-tag-cloud');
      this.template = _.template($("#linked-data-list-template").html());
      this.render();
    },
    userTagClicked: function(e) {
      var user = $(e.currentTarget).text();
      var swts = swtr.LDs.filter(function(swt) {
        if(swt.get('who') == user) {
          return swt;
        }
      });
      swts = _.uniq(swts,'how'.src);
      this.setGalleryView(swts);
      // $(this.el).hide();
    },
    tagsTagClicked: function(e) {
      var tag = $(e.currentTarget).text();
      var swts = swtr.LDs.filter(function(swt) {
        if(swt.get('how').tags){
          if(_.contains(swt.get('how').tags, tag)) {
              return swt;
            }
        }
      });
      this.setGalleryView(swts);
      // $(this.el).hide();
    },
    setGalleryView: function(swts) {
      if(this.galleryView) {
        //set the collection of galleryView to new set of swts to be displayed.
        this.galleryView.collection = swts;
        this.galleryView.render();
      }
      else {
        this.galleryView = new GalleryView({collection: swts});
      }
    },
    render: function() {
      $(this.el).show();
      this.renderUserTagCloud();
      this.renderTagsTagCloud();
    },
    renderUserTagCloud: function() {
      // var words = _.uniq(swtr.LDs.pluck('who'));
      var weights = swtr.LDs.countBy('who');
      _.each(weights, function(weight, who) {
        $(this.user_tag_el).append(this.template({weight: weight, who: who}));
      }, this);
    },
    renderTagsTagCloud: function() {
      var sweetsWithTags = swtr.LDs.filter(function(k) {
        if(k.get('how').tags) {
          return k;
        }
      });
      var tags = [];
      _.each(sweetsWithTags, function(sweet) {
        tags.push(sweet.get('how').tags);
      });
      tags = _.countBy(_.flatten(tags));
      _.each(tags, function(weight, who) {
        $(this.tags_tag_el).append(this.template({weight: weight, who: who}));
      }, this);

    }
  });

  var GalleryView = Backbone.View.extend({
    el: $("#gallery"),
    events: {
      "click img":"onImgClick"
    },
    initialize: function() {
      this.template = _.template($("#gallery-item-template").html());
      this.cover_template = _.template($("#ocd-item-cover-template").html());
      this.render();
    },
    render: function() {
      this.setUp();
      _.each(this.collection, function(model) {
        $(this.el).append(this.template(model.toJSON()));
      }, this);
      $('html, body').animate({
        scrollTop: $("#gallery").offset().top
      }, 1000);
    },
    setUp: function() {
      $("#tag-list").collapse('hide');
      $("#user-list").collapse('hide');
      if(!$(this.el).is(':visible')) {
        $(this.el).show();
      }
      $(this.el).html('');

    },
    onImgClick: function(e){
      var swts = swtr.LDs.filter(function(k) {
        if(k.get('where') == $(e.currentTarget).attr('src')) {
          return k;
        }
      });
      anno.makeAnnotatable($(e.currentTarget)[0]);
      _.each(swts, function(swt) {
        var anno_obj = swt.get('how');
        anno_obj['editable'] = false;
        anno.addAnnotation(anno_obj);
      });
      this.$(".annotorious-item-unfocus").css("opacity", '0.6');
    }
  });

  var AppRouter = Backbone.Router.extend({
    routes: {
      'home': 'home',
      'linked-data': 'linkedData',
      'play': 'play',
      'search': 'search'
    },
    components: {
      'linked-data': LDView,
      'play': PlayAreaView,
      'search': SearchView
    },
    home: function() {
      this.hideAll();
      this.show('home-page');
    },
    linkedData: function() {
      this.hideAll();
      this.show('linked-data-page');
    },
    play: function() {
      this.hideAll();
      this.show('play-page');
    },
    search: function() {
      this.hideAll();
      this.show('search-page');
    },
    hideAll: function() {
      $('.page').hide();
    },
    show: function(id) {
      if(this.mounted_component) {
        this.mounted_component.destroy();
      }
      if(id !== 'home-page') {
        var component = id.split('-page')[0];
        this.mounted_component = new this.components[component];
      }
      $('#' + id).show();
      this.highlight(id);
      console.log('shown', id);
    },
    highlight: function(id) {
      $('#swtr-navbar-collapse li').removeClass('active');
      var href = id.split('-page')[0];
      var selector = '#swtr-navbar-collapse a[href="#/' + href + '"]';
      $(selector).parent('li').addClass('active');
    },
    start: function() {
      var fragment = window.location.hash.split('#')[1];
      if(!fragment) {
        this.navigate('home', {trigger: true});
        return;
      }
      var route = fragment.split('/')[1];
      if(_.indexOf(_.keys(this.routes), route) > -1) {
        this.navigate(fragment, {trigger: true});
      }
    },
    loadPlayArea: function(url, type) {
      this.navigate('play', {trigger: true});
      this.mounted_component.loadURL(url, type);
    }
  });

})(swtr);
