Template.displayImage.helpers({
  thumbnail: function (store) {
    return this.url({store: store});
  },
});

Template.displayImage.events({
  'click .delete-image': function () {
    this.collection.remove(this._id);
  },
});
