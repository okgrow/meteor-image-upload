Template.displayImage.helpers({
  thumbnail: function () {
    var doc = Template.parentData(1);
    var store = doc.imageCollection + "-original";
    if(doc.size){
      store = doc.imageCollection + "-" + doc.size;
    }
    return this.url({store: store});
  }
});

Template.displayImage.events({
  "click [data-action=delete-image]": function () {
    this.collection.remove(this._id);
  }
});
