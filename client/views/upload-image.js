Template.uploadImage.helpers({
  image: function() {
    var self = this;
    var coll = ImageUpload.getImageCollection(self.imageCollection);
    var store = self.imageCollection;
    var image;

    if (self.doc) {
      // Look for image for associated object
      image = coll.findOne({associatedObjectId: self.doc._id});
    } else {
      // No associated object yet, check id of last image of this type in session
      imageId = Session.get("lastImageId-" + store);
      image = coll.findOne({_id: imageId});
    }
    return image;
  },
  inputName: function(){
    return this.name || "image";
  }
});

Template.uploadImage.events({
  "change [data-action=image-file-picker]": function(event, template) {
    var self = this;
    var file = event.target.files[0];
    var coll = ImageUpload.getImageCollection(self.imageCollection);
    if (file) {
      var newFile = new FS.File(file);
      newFile.addedBy = Meteor.userId();
      if (self.doc) {
        newFile.associatedObjectId = self.doc._id;
      }
      coll.insert(newFile, function (err, fileObj) {
        if (err) {
          console.log("Error: ", err);
        }
        // Inserted new doc with ID fileObj._id, and kicked off the data upload using HTTP
        if (!self.associatedObjectId) {
          // Save the ID of the newly inserted doc in the session so we can use it
          // until it's associated.
          Session.set("lastImageId-" + self.imageCollection, fileObj._id);
        }
      });
    }
  }
});
