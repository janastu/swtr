window.swtr = window.swtr || {};
(function(swtr) {

  swtr.handleOAuth = function() {
    if(swtr.access_token) {
      $('#signinview').html('Signing you in..');
      $.ajax({
        url: swtr.swtstoreURL()+'/api/users/me?access_token='+
          swtr.access_token,
        success: function(data) {
          $('#signinview').html('Signed in as ' + data.username);
          swtr.who = data.username;
          $("#sign-in").hide();
        },
        error: function() {
          // $('#signinview').html('Error signing in! Please try again');
          $("#sign-in").show();
        }
      });
    } else {
      $('#signinview').html('Please sign in.');
    }
  };

  var TxtAnnoSwt = Backbone.Model.extend({
    defaults:  {
      'who': '',
      'what': 'txt-anno',
      'where': '',
      'how': {}
    },
    initialize: function(options) {
      this.set(options);
    }
  });

  var TxtAnnoSwts = Backbone.Collection.extend({
    model: TxtAnnoSwt,
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

  var TxtAnnoView = Backbone.View.extend({
    initialize: function() {
      this.annotator = new Annotator(document.body);
      swtr.anno = this.annotator;
      this.annotator.addPlugin("Tags");
      this.annotator.addPlugin("AnnotoriousImagePlugin");
      this.listenTo(this.collection, "add", this.loadAnno);
      this.annotator.subscribe("annotationCreated", this.storeAnno);
    },
    storeAnno: function(annotation) {
      var pageURL = window.location.search.split("=")[1];
      if(!(swtr.who)) {
        swtr.who = "Guest";
      }
      // Removing the highlights key value pair from annotation object.
      var tempAnnotation = _.omit(annotation, 'highlights');
      swtr.TxtAnnoSwts.add(new TxtAnnoSwt({how: tempAnnotation,
                                           where: pageURL,
                                           who: swtr.who}));
      if($("#show-sweets").attr('disabled')) {
        $("#show-sweets").removeAttr('disabled');
      }
    },
    loadAnno: function(annotation) {
      if(!(annotation.isNew())) {
        swtr.anno.createAnnotation(annotation.get('how'));
        swtr.anno.setupAnnotation(annotation.get('how'));
      }
    }
  });

  var AppView = Backbone.View.extend({
    el: document.body,
    events: {
      "click #show-sweets": 'showSweets',
      "click #sweet-cancel": 'cancelSweet',
      "click #post-sweet": 'postSweet',
      "click #sign-in": 'signIn'
    },
    oauth: new Oauth({
        app_id: swtr.app_id,
        app_secret: swtr.app_secret,
        endpoint: swtr.swtstoreURL() + swtr.endpoints.auth,
        redirect_uri: swtr.oauth_redirect_uri,
        scopes: 'email,sweet'
    }),
    sweetTemplate: '<div id="sweet-list-wrapper">'+
      '<h4>These are your sweet annotations!</h4>'+
      '<ul id="sweet-list"></ul>'+
      '<div class="btn-grp">'+
      '<button class="btn btn-default" id="sweet-cancel">Cancel</button>'+
      '<button class="btn btn-primary" id="post-sweet">Sweet</button>'+
      '</div>'+
      '</div>'+
      '</div>',
    initialize: function() {
      swtr.TxtAnnoSwts = new TxtAnnoSwts();
      var txtAnnoView = new TxtAnnoView({collection: swtr.TxtAnnoSwts});
      swtr.TxtAnnoSwts.getAll({where: window.location.search.split("=")[1],
                               success: function(data) {
                                 swtr.TxtAnnoSwts.add(data);
                               }});
      swtr.handleOAuth();
      $(this.el).append(this.sweetTemplate);
      this.loadOverlayBar();
    },
    loadOverlayBar: function() {
      var template = "<div id='overlayBar' class='navbar'>"+
            "<a class='navbar-brand'>Swtr - Text Annotation</a>" +
            "<div class='navbar-inner'><div class='container-fluid'>" +
            "<button id='sign-in' class='btn btn-default navbar-btn"+
            " pull-right'>Sign In</button>" +
            "<button id='show-sweets' disabled='true' class='btn "+
            "btn-primary navbar-btn'>Sweet</button>" +
            "<a href='/' class='btn btn-default navbar-btn nav-btn'>"+
            "Try a different website</a>"+
            "<span id='signinview' class='pull-right'></span>" +
            "</div></div></div>";

      $(document.body).append(template);
    },
    signIn: function(e) {
      this.oauth.authorize();
      swtr.handleOAuth();
    },
    showSweets: function(e) {
      $("#sweet-list-wrapper").show();
      swtr.TxtAnnoSwts.each(function(model){
        console.log(model, model.isNew());
        var templateStr ='<li class="sweet">'+
              '<a href="#">@<%= who %></a> <strong>#<%= what %></strong> '+
              '<a href="<%= where %>"><%= where.substr(0, 30) + "..." %></a> '+
              '<p><%= how %></p>'+
              '</li>';
        var template = _.template(templateStr);
        if(model.isNew()) {
          $("#sweet-list").append(template({
            'who': swtr.who,
            'what': 'txt-anno',
            'where': window.location.search.split("=")[1],
            'how': JSON.stringify(model.get('how'))
          }));
        }
      }, this);
      $("#sweet-list-wrapper").focus();

    },
    cancelSweet: function(e) {
      $("#sweet-list-wrapper").hide();
      $("#sweet-list").html('');
    },
    postSweet: function(e) {
      swtr.TxtAnnoSwts.post({success: function(collection, data) {
        swtr.TxtAnnoSwts.set(collection);
        $("#sweet-list").html('');
        alert("Your SWeets are posted!!");
      },
      error: function(data) {
        alert("Failed to post your SWeets, please try again.");
      }
      });
    }
  });
  new AppView;

})(swtr);
