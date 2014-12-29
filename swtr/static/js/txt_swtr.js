(function(window) {
  window.swtr = window.swtr || {};

  swtr.init = function() {
    this.annotator = new Annotator(document.body);
    this.annotator.addPlugin("Tags");
    this.annotator.addPlugin("Permissions", {'admin': ['__nobody__'] });
    this.annotator.addPlugin("Unsupported");
    //this.annotator.addPlugin("Markdown");
    //this.annotator.addPlugin("AnnotoriousImagePlugin");

    this.annotator.subscribe("annotationCreated", swtr.tellParentCreate);
    this.annotator.subscribe("annotationUpdated", swtr.tellParentUpdate);
    //console.log('inited annotator');

    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    // Listen to message from child window
    eventer(messageEvent, function(e) {
      var key = e.message ? "message" : "data";
      var data = e[key];
      //run function//
      //console.log(data + " from iframe");

      var annos = JSON.parse(data);

      if(annos && annos.length) {
        annos.forEach(function(anno) {
          //console.log(anno);
          anno.how.permissions = {'read': [],
                                  'update': ['__nobody__'],
                                  'admin': ['__nobody__'],
                                  'delete': ['__nobody__']};
          swtr.annotator.createAnnotation(anno.how);
          swtr.annotator.setupAnnotation(anno.how);
        });
      }
    }, false);

  };

  swtr.tellParentCreate = function(annotation) {
    /* Notify the parent winow about the creation of annotation  */
    delete(annotation['highlights']);
    var payload = {
      event: 'annotationCreated',
      data: annotation
    };
    //console.log('createParent');
    parent.postMessage(JSON.stringify(payload), '*');
  };

  swtr.tellParentUpdate = function(annotation) {
    /* Notify the parent winow about the update of annotation  */
    delete(annotation['highlights']);
    var payload = {
      event: 'annotationUpdated',
      data: annotation
    };
    //console.log('updateParent');
    parent.postMessage(JSON.stringify(payload), '*');
  };

  // scan page and prepare images so that they can be annotated when a user
  // clicks on them..
  swtr.prepareImgs = function() {
    var images = [];
    $('*').each(function(elem, idx) {
      if($(this).is('img')) {
        // attach event handlers..
        $(this).on('click', swtr.imgClicked);
        $(this).css('cursor', 'pointer');

        // trying to see if the image has a parent 'a' element..
        // then hook on the click handler to that element..
        if($(this).parent('a').length) {
          $(this).parent('a').on('click', swtr.imgClicked);
        }
        // push the image to a cache..
        images.push($(this).attr('src'));
      }
      /*else {
        var back_img = $(this).css('background-image');
        if(back_img !== 'none') {
          images.push(back_img);
        }
      }*/
    });
    //console.log(images.length + ' images found in this page');
  };

  swtr.imgClicked = function(event) {
    event.preventDefault();
    var img_src = $(event.currentTarget).attr('src');
    var payload = {
      event: 'imgClicked',
      data: {url: img_src}
    };
    //console.log('imgClicked:: posting to parent..');
    parent.postMessage(JSON.stringify(payload), '*');
    return false;
  };

  window.onload = function() {
    swtr.init();
    swtr.prepareImgs();
  };

})(window);
