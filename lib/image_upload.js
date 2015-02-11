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

MyImages = ImageUpload.createCollection("myImages", {
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
  var MAX_FILE_SIZE = 1024 * 1024 * 10; // 10 MB
  var accessKeyId, secretAccessKey, bucketName, options;
  var bucketUrl, publicRead, acl;

  //Set Cache Control headers so we don't overload our meteor server with http requests
  FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);

  function postConfigure() {
    acl = publicRead ? 'public-read' : 'private';
    setupPublicRead();
  }

  function setupPublicRead() {
    if (publicRead && bucketUrl) {
      // Save the old url method
      FS.File.prototype._url = FS.File.prototype.url;

      // New direct-to-S3 url method
      FS.File.prototype.url = function(options) {
        var self = this;

        var store = options && options.store;

        // Use the old url() method to reactively show S3 URL only when file is
        // is stored.
        // TODO: figure out a less hacky way. Use hasStored()?
        if (self._url(options)) {
          var fileKey = store + '/' + self.collectionName + '/' + self._id + '-' + self.name();
          return bucketUrl + fileKey;
        }
        return null;
      }
    }
  }

  obj.configure = function configure(options) {
    if (acl !== undefined) {
      console.warn("ImageUpload.configure() has previously been called!");
    }
    accessKeyId = options.accessKeyId;
    secretAccessKey = options.secretAccessKey;
    bucketName = options.bucketName;
    bucketUrl = options.bucketUrl;
    publicRead = options.publicRead;
    postConfigure();
  };

  // sizes looks like {thumbnail: [100, 100], normal: [200,300]}
  // there will also be one named "original" containing the original image at
  // full size
  obj.createCollection = function createCollection(collectionName, sizes) {
    if (acl === undefined) {
      console.warn("ImageUpload.configure() has not yet been called!");
    }
    var stores = [];

    stores.push(
      new FS.Store.S3(collectionName + "-original", {
        bucket: bucketName,
        folder: collectionName + "-original",
        ACL: acl,
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      })
    );

    _.each(sizes, function (dimensions, sizeName) {
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

    var collection = new FS.Collection (collectionName, {
      stores: stores,
      filter: {
          maxSize: MAX_FILE_SIZE,
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

    return collection;
  };

  return obj;
})();
