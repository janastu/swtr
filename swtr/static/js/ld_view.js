(function(window) {
  window.swtr = window.swtr || {};

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
    },
  });


  var LDView = Backbone.View.extend({
    el: '#linked-data-page',
    events: {
      'click #context-menu>li': 'chooseContext'
    },
    initialize: function(args) {
      this.params = args || {};
      var self = this;
      if(!swtr.LDs) {
        swtr.LDs = new LDSwts();
      }
      if(swtr.LDs.length == 0) {
        this.loader_template = _.template($('#loader-template').html());
        $('#linked-data-page').prepend(this.loader_template());
        swtr.LDs.getAll({
          what: 'img-anno',
          success: function(data) {
            swtr.LDs.add(data);
            // COMMENT: does it need to be swtr.tagCloudView? can't it be
            // this.tagCloudView? does it have a reason to be in the global
            // scope?
            if(!swtr.tagCloudView) {
              $('#spinner').hide();
              swtr.tagCloudView = new TagCloudView({collection: swtr.LDs});
              if(!(_.isEmpty(self.params))) {
                // If the params are not empty then load the state.
                self.loadState(self.params);
              }
            }
          }
        });
      }
      // $.get(swtr.swtstoreURL() + swtr.endpoints.context, function(data) {
      //   var template = _.template($("#context-menu-template").html());
      //   data = JSON.parse(data);
      //   _.each(data, function(datum) {
      //     if(datum.name.startsWith('#')) {
      //       return false;
      //     }
      //     $("#context-menu").append(template(datum));
      //   });
      // });
    },
    loadState: function(params) {
      if(params.user) {
        swtr.tagCloudView.filterUser(params.user);
      }
      else if(params.tag) {
        swtr.tagCloudView.filterTag(params.tag);
      }
    },
    chooseContext: function(e) {
      if(_.contains(swtr.allowedContext, $(e.currentTarget).text().trim())) {
        $("#spinner").show();
        $("#no-view").hide();
        swtr.LDs.getAll({
          what: $(e.currentTarget).text().trim(),
          success: function(data) {
            $("#spinner").hide();
            swtr.LDs.reset();
            swtr.LDs.add(data);
          }
        });
      }
      else {
        $("#tag-cloud").hide();
        if($("#no-view").is(':hidden')) {
          $("#no-view").removeClass("hidden");
        }
        $("#no-view").show();
      }
    },
    destroy: function() {
      this.cleanUp();
      //this.remove();
    },
    cleanUp: function() {
      if(!$('#tag-cloud').is(':visible')) {
       // $('#gallery').hide();
        $('#tag-cloud').show();
      }
    }
  });


  var TagCloudView = Backbone.View.extend({
    el: $('#tag-cloud'),
    events: {
      'click #user-tag-cloud li p': 'userTagClicked',
      'click #tags-tag-cloud li p': 'tagsTagClicked'
    },
    initialize: function() {
      this.user_tag_el = $('#user-tag-cloud');
      this.tags_tag_el = $('#tags-tag-cloud');
      this.template = _.template($('#linked-data-list-template').html());
      this.render();
      this.listenTo(this.collection, "reset", this.render);
    },
    userTagClicked: function(e) {
      anno.reset();
      var user = $(e.currentTarget).text();
      this.filterUser(user);
    },
    filterUser: function(user) {
      var swts = swtr.LDs.filter(function(swt) {
        if(swt.get('who') == user) {
          return swt;
        }
      });
      swts = _.sortBy(_.uniq(swts, function(swt) {
        return swt.get('where');
      }), function(item) {
        return -Date.parse(item.get("created"));
      });
      this.setGalleryView(swts);
      // $(this.el).hide();
    },
    tagsTagClicked: function(e) {
      anno.reset();
      var tag = $(e.currentTarget).text();
      this.filterTag(tag);
    },
    filterTag: function(tag) {
      var swts = swtr.LDs.filter(function(swt) {
        if(swt.get('how').tags){
          if(_.contains(swt.get('how').tags, tag)) {
              return swt;
            }
        }
      });
      swts = _.sortBy(_.uniq(swts, function(swt) {
        return swt.get('where');
      }), function(item) {
        return - Date.parse(item.get('created'));
      });


      // this.setGalleryView(_.uniq(swts, 'where'));
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
      //var weights = swtr.LDs.countBy('who');
      var weights = _.map(swtr.LDs.countBy('who'), function(weight, who) {
        return ({weight:weight, who:who});
      });
      _.each(_.sortBy(weights, function(item) {
        return -item.weight; //returns sorted items in descending order of weights
      }),
          function(item) {
        $(this.user_tag_el).append(this.template(item));
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
      tags = _.map(_.countBy(_.flatten(tags)), function(weight, tag) {
        return ({weight: weight, who: tag});
      });
      console.log(tags);
    
      _.each(_.sortBy(tags, function(item) {
        return -item.weight; //returns sorted list in descending order by weight
      }), 
          function(item) {
        $(this.tags_tag_el).append(this.template(item));
      }, this);

    }
  });

  var GalleryView = Backbone.View.extend({
    el: $('#gallery'),
    events: {
      'click img': 'onImgClick',
      'mouseover img': 'sideAnno',
      'click .tag-item': 'tagsTagClicked',
      'click .swt-user': 'userClicked'
    
      //'mouseout img': 'cleanSideAnno'

    },
    setCustomField: false,
    initialize: function() {
      this.template = _.template($('#gallery-item-template').html());
      this.cover_template = _.template($('#ocd-item-cover-template').html());
      this.$sidePanel = $('#anno-list');
      this.side_panel_template = _.template($('#side-anno-template').html());
      this.render();
    },
    render: function() {
      this.setUp();
      _.each(this.collection, function(model) {
        var models = swtr.LDs.filter(function(swt) {
          if(swt.get('how').src == model.get('how').src) {
            return model;
          }
        });
        var tags = [];
        _.each(models, function(model) {
          if(model.get('how').tags) {
            tags.push(model.get('how').tags);
          }
        });

        tags = _.flatten(tags);

        $(this.el).append(this.template({
          'how': {
            'tags': tags,
          'src': model.get('how').src
          },
          'who':model.get('who'),
          'where': model.get('where')
        }));
      }, this);




      $('html, body').animate({
        scrollTop: $('#gallery').offset().top
      }, 1000);

     $(' [data-toggle="tooltip"]').tooltip(); // calling bootstrap tooltip for annotate button in gallery-item

    },
    setUp: function() {
      $('#tag-list').collapse('hide');
      $('#user-list').collapse('hide');

      if(!$(this.el).is(':visible')) {
        $(this.el).show();
      }

      $(this.el).html('');

    },
    sideAnno: function(e) {
      console.log(e.currentTarget, "testinghover");
      var swts = swtr.LDs.filter(function(k) {
        if(k.get('where') == $(e.currentTarget).attr('src')) {
          return k;
        }
      });
      if(!this.setCustomField) {
        anno.addPlugin("CustomFields", {});
        this.setCustomField = true;
      }
      this.$sidePanel.html('');
      _.each(swts, function(swt) {
        console.log(swt, this.$sidePanel);
        this.$sidePanel.append(this.side_panel_template(swt.toJSON()));
      }, this);
    },
    onImgClick: function(e){
      console.log("from click", e.currentTarget);
      var swts = swtr.LDs.filter(function(k) {
        if(k.get('where') == $(e.currentTarget).attr('src')) {
          return k;
        }
      });
      if(!this.setCustomField) {
        anno.addPlugin("CustomFields", {});
        this.setCustomField = true;
      }
      anno.makeAnnotatable($(e.currentTarget)[0]);
      _.each(swts, function(swt) {
        var anno_obj = swt.toJSON();
          anno_obj.how['editable'] = false;
          anno_obj.how['id'] = anno_obj.id;
          anno.addAnnotation(anno_obj.how);
      }, this);
      
      anno.hideSelectionWidget();
      this.$(".annotorious-item-unfocus").css("opacity", '0.6');

      //adds a list view of annotations 
     /* $('#anno-list li').remove();
      var template = _.template($('#anno-list-item').html());
      _.each(swts, function(swt) {
        $('#anno-list').append(template(swt.attributes));
      });*/
    },
    tagsTagClicked: function(e) {
      anno.reset();
      var tag = $(e.currentTarget).text();
      console.log(tag);
      swtr.tagCloudView.filterTag(tag);
    },
    userClicked: function(e) {
      anno.reset();
      var user = $(e.currentTarget).text().slice(8); //chopping the template text from data
      swtr.tagCloudView.filterUser(user);
    }
  });

  swtr.LDView = LDView;
})(window);
