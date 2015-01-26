Package.describe({
  name:    "okgrow:easy-cfs-images",
  version: "0.4.1",
  summary: "Easily create CollectionFS collections for images",
  git:     "https://github.com/okgrow/meteor-easy-cfs-images/"
});

Package.onUse(function (api) {
  api.use([
    'cfs:standard-packages',
    'cfs:filesystem',
    'cfs:graphicsmagick',
    'cfs:s3@0.1.1',
    'cfs:tempstore',
    'cfs:power-queue',
    'session',
    'spacebars',
    'templating'
  ]);
  api.addFiles('lib/easy_cfs_images.js', ['server', 'client']);
  api.addFiles('server/methods.js', 'server');
  api.addFiles(
    [
      'client/views/display-image.html',
      'client/views/display-image.js',
      'client/views/upload-image.html',
      'client/views/upload-image.js'
    ],
    'client');
  api.export('ImageCollectionFactory');
  api.export('EasyImages');
});
