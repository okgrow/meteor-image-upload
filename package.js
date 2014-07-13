Package.describe({
  summary: "Easily create CollectionFS collections for images"
});

Package.on_use(function (api) {
  api.use([
    'cfs-filesystem',
    'cfs-graphicsmagick',
    'cfs-s3',
    'cfs-tempstore',
    'collectionFS',
    'session',
    'spacebars',
    'templating'
  ]);
  api.add_files('lib/easy_cfs_images.js', ['server', 'client']);
  api.add_files(
    [
      'client/views/display-image.html',
      'client/views/display-image.js',
      'client/views/upload-image.html',
      'client/views/upload-image.js'
    ],
    'client');
  api.export('ImageCollectionFactory');
});
