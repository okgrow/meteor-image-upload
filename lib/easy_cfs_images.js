/*

USAGE
=====

The following creates a new FS.Collection named "myImages" with three sizes:
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

*/

ImageCollectionFactory = function (accessKeyId, secretAccessKey, bucketName) {
  var MAX_FILE_SIZE = 1024 * 1024 * 10; // 10 MB
  var factory = this;

  //Set Cache Control headers so we don't overload our meteor server with http requests
  FS.HTTP.setHeadersForGet([['Cache-Control', 'public, max-age=31536000']]);

  factory.stores = [];

  // sizes looks like {thumbnail: [100, 100], normal: [200,300]}
  // there will also be one named "original" containing the original image at
  // full size
  this.createImageCollection = function (collectionName, sizes) {
    factory.stores.push(
      new FS.Store.S3(collectionName + "-original", {
        bucket: bucketName,
        folder: collectionName + "-original",
        ACL: 'private',
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      })
    );

    _.each(sizes, function (dimensions, sizeName) {
      var x, y, store;

      x = dimensions[0];
      y = dimensions[1];

      store = new FS.Store.S3((collectionName + "-" + sizeName), {
        bucket: bucketName, //required
        folder: collectionName + "-" + sizeName,
        ACL: 'private',
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,

        //Create the thumbnail as we save to the store.
        transformWrite: function(fileObj, readStream, writeStream) {
          /* Use graphicsmagick to create a XXxYY square thumbnail at 100% quality,
          * orient according to EXIF data if necessary and then save by piping to the
          * provided writeStream */
          gm(readStream, fileObj.name)
            .resize(x,y,"^")
            .gravity('Center').
            crop(x, y).
            quality(100).
            autoOrient().
            stream().pipe(writeStream);
        }
      });
      factory.stores.push(store);
    });

    var collection = new FS.Collection(collectionName, {
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
};
