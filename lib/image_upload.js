/*

USAGE
=====

The following creates a new FS.Collection named "myImages" with four sizes:
1. The original image
2. "thumbnail" at 300x300
3. "normal" at 800x400
4. "superGiant" at 4096x4096

ImageUpload.configure({
  accessKeyId: myAccessKeyId,
  secretAccessKey: mySecretAccessKey,
  bucketName: myBucketName,
});

// add your collection here. you can also use Meteor.users
BlogPosts = new Mongo.Collection("blogPosts");

MyImages = ImageUpload.createCollection("myImages", BlogPosts, {
  thumbnail: [300, 300],
  normal: [800, 400],
  superGiant: [4096, 4096]
});

ImageUpload can also have the images served directly from S3:

ImageUpload.configure({
  accessKeyId: myAccessKeyId,
  secretAccessKey: mySecretAccessKey,
  bucketName: myBucketName,
  publicRead: true,
  bucketUrl: 'https://your-bucket.s3.amazonaws.com/' // URL for your specific bucket
});

*/

ImageUpload = (function ImageUploadClosure() {
  var imageUpload = this;
  var obj = {};
  obj.collections = {};
  var MAX_UPLOAD_SIZE = 20; // 20 MB
  var accessKeyId, secretAccessKey, bucketName, options;
  var bucketUrl, maxUploadSize;

  //Set Cache Control headers so we don't overload our meteor server with http requests
  FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);

  function postConfigure() {
    if (bucketUrl) {
      // strip trailing slash so we only have one case when we generate
      // public file URLs
      bucketUrl = bucketUrl.replace(/\/$/, '');
    }
    setupPublicRead();
  }

  function setupPublicRead() {
    // Save the old url method
    FS.File.prototype._url = FS.File.prototype.url;

    // New direct-to-S3 url method
    FS.File.prototype.url = function(options) {
      var self = this;
      var store = options && options.store;
      var primaryStore = self.getCollection().primaryStore;

      // Use the old url() method to reactively show S3 URL only when file is stored and publicRead is true.
      // TODO: figure out a less hacky way. Use hasStored()?
      if (primaryStore.publicRead && bucketUrl) {
        if (self._url(options)) {
          var fileKey = store + '/' + self.collectionName + '/' + self._id + '-' + self.name();
          return bucketUrl + '/' + fileKey;
        }
        return null;
      } else if (primaryStore.defaultPermissions && !Meteor.userId()) {
        return null;
      } else {
        // if publicRead is not true then use old url() as normal
        return self._url(options);
      }
    };
  }

  /*
   * Automatically set up publish/subscribe for the client for their
   * image collection.
   *
   * imageCollection: an FS.Collection object which holds our file metadata
   * baseCollection: a Meteor.Collection object which is referenced by `imageCollection`
   * imageCollectionName: a String name of the image collection, used as pub/sub key
   */
  function setupClientSubscription(imageCollection, baseCollection, imageCollectionName) {
    if (Meteor.isServer) {
      Meteor.publish("associated-images-" + imageCollectionName, function(associatedObjectIds) {
        check(associatedObjectIds, Match.Optional([String]));
        if (associatedObjectIds === undefined || associatedObjectIds === null || associatedObjectIds.length === 0) {
          return;
        }
        return imageCollection.find({ associatedObjectId: { $in: associatedObjectIds } });
      });
      Meteor.publish("single-image-" + imageCollectionName, function(imageId) {
        check(imageId, Match.Where(function (id) {
          if (id === null) {
            check(id, null);
            return true;
          } else {
            check(id, String);
            return true;
          }
        }));
        return imageCollection.find({ _id: imageId });
      });
    }
    if (Meteor.isClient) {
      Tracker.autorun(function() {
        var associatedObjectIds = baseCollection.find({}, {fields: { _id: 1 }}).map(function(doc) { return doc._id; });
        Meteor.subscribe("associated-images-" + imageCollectionName, associatedObjectIds);
        Meteor.subscribe("single-image-" + imageCollectionName, Session.get("lastImageId-" + imageCollectionName));
      });
    }
  }

  obj.getImageCollection = function getImageCollection(imageCollectionName){
    var coll = ImageUpload.collections[imageCollectionName];
    if(coll){
      return coll;
    } else {
      throw new Error("Cannot find image collection with name "+imageCollectionName+".");
    }
  };

  obj.configure = function configure(options) {
    if (bucketName !== undefined) {
      console.warn("ImageUpload.configure() has previously been called!");
    }
    if ( _.has(options,'publicRead') ) {
      throw new Error("ImageUpload no longer supports publicRead in ImageUpload.configure(). publicRead is now set in the image collection options.")
    }
    accessKeyId = options.accessKeyId;
    secretAccessKey = options.secretAccessKey;
    bucketName = options.bucketName;
    bucketUrl = options.bucketUrl;
    maxUploadSize = options.maxUploadSize;
    postConfigure();
  };

  // sizes looks like {thumbnail: [100, 100], normal: [200,300]}
  // there will also be one named "original" containing the original image at
  // full size
  obj.createCollection = function createCollection(collectionName, baseCollection, options) {
    var self = this;
    var acl = options.publicRead ? 'public-read' : 'private';
    if (Meteor.isServer && bucketName === undefined) {
      console.warn("ImageUpload.configure() has not yet been called!");
    }
    var stores = [];

    stores.push(
      new FS.Store.S3(collectionName + "-original", {
        bucket: bucketName,
        folder: collectionName + "-original",
        ACL: acl,
        publicRead: options.publicRead,
        defaultPermissions: options.defaultPermissions,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey
      })
    );

    _.each(options.sizes, function (dimensions, sizeName) {
      var x, y, store;

      x = dimensions[0];
      y = dimensions[1];

      store = new FS.Store.S3 ((collectionName + "-" + sizeName), {
        bucket: bucketName, //required
        folder: collectionName + "-" + sizeName,
        ACL: acl,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,

        //Create the thumbnail as we save to the store.
        transformWrite: function (fileObj, readStream, writeStream) {
          /* Use graphicsmagick to create a XXxYY square thumbnail at 100% quality,
           * orient according to EXIF data if necessary and then save by piping to the
           * provided writeStream */
          if (gm.isAvailable) {
            gm(readStream, fileObj.name)
              .resize(x,y,"^")
              .gravity('Center').
              crop(x, y).
              quality(100).
              autoOrient().
              stream().pipe(writeStream);
          } else {
            console.warn("GraphicsMagick/ImageMagick not available");
          }
        }
      });
      stores.push(store);
    });

    self.collections[collectionName] = new FS.Collection (collectionName, {
      stores: stores,
      filter: {
          maxSize: (maxUploadSize || MAX_UPLOAD_SIZE) * 1024 * 1024,
          allow: {
              contentTypes: ['image/*'],
              extensions: ['png', 'jpg', 'jpeg', 'gif']
          },
          onInvalid: function (message) {
              if(Meteor.isClient){
                  alert(message);
              }else{
                  console.warn(message);
              }
          }
      }
    });

    // ===============================================
    // Default Permissions for Image Collections
    // ===============================================
    //
    // Default permissions: user images are viewable by that user only,
    // all other images require to be logged in.
    if(options.defaultPermissions) {
      self.collections[collectionName].allow({
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
        download: function (userId, fileObj) {
          if (options.publicRead) {
            return true;
          } else {
            return fileObj.addedBy === userId;
          }
        }
      });
    }

    self.collections[collectionName].on('error', function(error, fileObj, store) {
      /*
       * TODO: Better error handling than just console logging
       */
      console.error(error.message);
      fileObj.on('error', function(store) {
        /*
         * fileObj.emit doesn't pass useful information here, so do nothing.
         * Errors should have been handled by the store's error handler.
         * https://github.com/CollectionFS/Meteor-cfs-collection/blob/64a0fc6e6a95468c5ff8dc9e81a9c56ecf9aeb6a/common.js#L94
         */
      });
    });

    if (Meteor.isServer) {
      self.collections[collectionName].files._ensureIndex({associatedObjectId: 1});
    }

    setupClientSubscription(self.collections[collectionName], baseCollection, collectionName);

    return self.collections[collectionName];
  };

  return obj;
})();
