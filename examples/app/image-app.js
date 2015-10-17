var bucketUrl = Meteor.settings.public.bucketUrl;

Posts = new Mongo.Collection("posts");

if (Meteor.isServer) {
  var accessKeyId = Meteor.settings.accessKeyId;
  var secretAccessKey = Meteor.settings.secretAccessKey;
  var bucketName = Meteor.settings.bucketName;

  Meteor.publish("users", function() {
    return Meteor.users.find({});
  });

  Meteor.publish("posts", function() {
    return Posts.find({});
  });

}

ImageUpload.configure({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  bucketName: bucketName,
  bucketUrl: bucketUrl
});

UserImages = ImageUpload.createCollection("userImages", Meteor.users, {
  defaultPermissions: true,
  publicRead: true,
  sizes: {
    normal: [800,800],
    thumbnail: [200, 200],
    avatar: [50, 50]
  }
});

PostImages = ImageUpload.createCollection("postImages", Posts, {
  defaultPermissions: true,
  sizes: {
    normal: [300,300],
    thumbnail: [100, 100],
    avatar: [50, 50]
  }
});

if (Meteor.isServer) {
  Posts.allow({
    insert: function(userId, text) {
      return !!userId;
    },
    update: function(userId, doc) {
      /*
       * Posts can't be edited after they're created
       */
      return doc && doc.user._id === userId;
    }
  });

  UserImages.allow({
    insert: function(userId, doc) {
      return !!userId;
    },
    update: function(userId, doc) {
      /*
       * User can update their own image only
       */
      return doc && doc.addedBy === userId;
    },
    remove: function(userId, doc) {
      /*
       * User can remove their own image only
       */
      return doc && doc.addedBy === userId;
    },
    download: function(userId, fsFile) {
      /*
       * Anyone can see a user's avatar
       */
      return true;
    }
  });

  PostImages.allow({
    insert: function(userId, doc) {
      return true;
    },
    update: function(userId, doc) {
      /*
       * Creator can update. Not that this is required because a PostImage
       * is created immediately after the upload is completed, but before
       * an associated Post document is created. In order to create the
       * association, the user must be able to update their message. There
       * are work arounds that go beyond the scope of this demo.
       */
      return doc && doc.addedBy === userId;
    },
    remove: function(userId, doc) {
      /*
       * Can't be deleted, ever
       */
      return false;
    },
    download: function(userId, fsFile) {
      /*
       * Must be signed in
       * Note that if `publicRead` is set for ImageUpload, download is
       * implicitly permitted, even if this function would return false.
       */
      return userId;
    }
  });

}

if (Meteor.isClient) {

  Meteor.subscribe("posts");
  Meteor.subscribe("users");
  Session.set("formTemplate", "makeAPost");
  Session.set("formData", undefined);
  Session.set("lastImageId-postImages", undefined);

  Template.body.helpers({
    formTemplate: function () {
      return Session.get("formTemplate");
    },
    formData: function () {
      return Session.get("formData");
    }
  });

  Template.profile.helpers({
    imageUploadConfig: function() {
      return {
        imageCollection: UserImages,
        store: "userImages-thumbnail"
      };
    },
    coll: function() {
      return UserImages;
    },
    handle: function() {
      return Meteor.user().profile.name;
    }
  });

  Template.users.helpers({
    users: function() {
      return Meteor.users.find({});
    }
  });

  Template.user.helpers({
    id: function() {
      return this.profile.name;
    },
    avatar: function() {
      return UserImages.findOne({associatedObjectId: this._id});
    },
    imageUrl: function() {
      return UserImages.findOne({associatedObjectId: this._id}).url({store: "userImages-avatar"});
    }
  });

  Template.posts.helpers({
    posts: function() {
      return Posts.find({});
    }
  });

  Template.post.helpers({
    text: function() {
      return this.text;
    },
    user: function() {
      return this.user.profile.name;
    },
    image: function() {
      var image = PostImages.findOne({associatedObjectId: this._id});
      if (image) {
        return image.url({store: "postImages-thumbnail"});
      }
    }
  });

  Template.post.events({
    "click [data-action=post-edit]": function (event) {
      var image = PostImages.findOne({associatedObjectId:this._id});
      Session.set("formTemplate", "editAPost");
      Session.set("formData", this);
      if (image && image._id) {
        Session.set("lastImageId-postImages", image._id);
      }
    }
  });

  Template.makeAPost.events({
    "submit [data-action=submit-post]": function(event) {
      event.preventDefault();
      var text = event.target.text.value;
      if (!Meteor.user()) {
        return false;
      }
      var imgId = Session.get("lastImageId-postImages");
      Session.set("lastImageId-postImages", undefined);
      Posts.insert({
          text: text,
          user: Meteor.user()
        },
        function(error, postId) {
          if (error) {
            throw new Meteor.Error(error);
          }
          PostImages.update(imgId, {$set: { associatedObjectId: postId }});
        }
      );
      $("form[data-action=submit-post]").get(0).reset();
      return false;
    }
  });

  Template.editAPost.events({
    "click [data-action=cancel-edit-post]": function () {
      $("form[data-action=edit-post]").get(0).reset();
      Session.set("formTemplate", "makeAPost");
      Session.set("lastImageId-postImages", undefined);
    },
    "submit [data-action=edit-post]": function(event) {
      event.preventDefault();
      var text = event.target.text.value;
      if (!Meteor.user()) {
        return false;
      }
      var imgId = Session.get("lastImageId-postImages");
      Session.set("lastImageId-postImages", undefined);
      Posts.update({_id: this._id},{ $set: {
            text: text,
            user: Meteor.user()
          }
        }, function () {
          Session.set("formTemplate", "makeAPost");
        }
      );
      $("form[data-action=edit-post]").get(0).reset();
      return false;
    }
  });
}

if (Meteor.isServer) {
  /*
   * Purge data every hour
   */
  Meteor.setInterval(function purge() {
    PostImages.remove({});
    UserImages.remove({});
    Posts.remove({});
    Meteor.users.remove({});
  }, 1000 * 60 * 60);
}
