Package.describe({
  name:    "okgrow:easy-cfs-images",
  version: "0.3.0",
  summary: "Easily create CollectionFS collections for images",
  git:     "https://github.com/okgrow/meteor-easy-cfs-images/"
});

Package.onUse(function (api) {
  api.use([
    'cfs:standard-packages',
    'cfs:filesystem',
    'cfs:graphicsmagick',
    'cfs:s3',
    'cfs:tempstore',
    'cfs:power-queue',
    'session',
    'spacebars',
    'templating'
  ]);
  api.addFiles('lib/easy_cfs_images.js', ['server', 'client']);
  api.addFiles(
    [
      'client/views/display-image.html',
      'client/views/display-image.js',
      'client/views/upload-image.html',
      'client/views/upload-image.js'
    ],
    'client');
  api.export('ImageCollectionFactory');
});
