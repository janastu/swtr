(function(window) {
  window.swtr = window.swtr || {};

  swtr.init = function() {
    this.annotator = new Annotator(document.body);
    this.annotator.addPlugin("Tags");
    //this.annotator.addPlugin("AnnotoriousImagePlugin");
    this.annotator.subscribe("annotationCreated", swtr.updateParent);
    this.annotator.subscribe("annotationUpdated", swtr.updateParent);
    console.log('inited annotator');
  };

  swtr.updateParent = function(annotation) {
    /* Notify the parent winow about the annotation  */
    delete(annotation['highlights']);
    var payload = {
      event: 'annotationUpdated',
      data: annotation
    };
    console.log('updateParent');
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
    console.log(images.length + ' images found in this page');
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
