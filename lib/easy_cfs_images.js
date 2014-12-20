/*

USAGE
=====

The following creates a new FS.Collection named "myImages" with four sizes:
1. The original image
2. "thumbnail" at 300x300
3. "normal" at 800x400
4. "superGiant" at 4096x4096

var factory = new ImageCollectionFactory(myAccessKeyId, mySecretAccessKey, myBucketName);
MyImages = factory.createImageCollection("myImages", {
  thumbnail: [300, 300],
  normal: [800, 400],
  superGiant: [4096, 4096]
});

ImageCollectionFactory can optionally take an options parameter. If you want to
server images directly from S3 do the following:

var factory = new ImageCollectionFactory(
  myAccessKeyId,
  mySecretAccessKey,
  myBucketName,
  {
    publicRead: true,
    bucketUrl: 'https://your-bucket.s3.amazonaws.com/' // URL for your specific bucket
  }
);

*/

ImageCollectionFactory = function (accessKeyId, secretAccessKey, bucketName, options) {
  var MAX_FILE_SIZE = 1024 * 1024 * 10; // 10 MB
  var factory = this;

  //Set Cache Control headers so we don't overload our meteor server with http requests
  FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);

  var bucketUrl = options && options.bucketUrl;
  var publicRead = options && options.publicRead;
  var acl = publicRead ? 'public-read' : 'private';

  factory.stores = [];

  // sizes looks like {thumbnail: [100, 100], normal: [200,300]}
  // there will also be one named "original" containing the original image at
  // full size
  this.createImageCollection = function (collectionName, sizes) {
    factory.stores.push(
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
      factory.stores.push(store);
    });

    var collection = new FS.Collection (collectionName, {
      stores: factory.stores,
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

  if (publicRead && bucketUrl) {
    FS.File.prototype.url = function(options) {
      var store = options && options.store;

      var self = this;
      // Make sure the file object is mounted in a cfs
      if (self.isMounted()) {
        var fileKey = store + '/' + self.collectionName + '/' + self._id + '-' + self.name();
        return bucketUrl + fileKey;
      }
      return null;
    }
  }

};
