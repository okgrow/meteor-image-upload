Template.uploadImage.helpers({
  image: function() {
    var image;

    if (this.associatedObject) {
      // Look for image for associated object
      image = this.imageCollection.findOne({associatedObjectId: this.associatedObject._id});
    } else {
      // No associated object yet, check id of last image of this type in session
      imageId = Session.get("lastImageId-" + this.store);
      image = this.imageCollection.findOne({_id: Session.get("lastImageId-" + this.store)});
    }

    return image;
  }
});

Template.uploadImage.events({
  'change .image-file-picker': function(event, template) {
    var that = this;
    var file = event.target.files[0];
    if (file) {
      var newFile = new FS.File(file);
      newFile.addedBy = Meteor.userId();
      if (this.associatedObject) {
        newFile.associatedObjectId = this.associatedObject._id;
      }

      this.imageCollection.insert(newFile, function (err, fileObj) {
        if (err) {
          console.log("Error: ", err);
        }
        // Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP
        if (!that.associatedObjectId) {
          // Save the ID of the newly inserted doc in the session so we can use it
          // until it's associated.
          Session.set("lastImageId-" + that.store, fileObj._id);
        }
      });
    }
  },
});
