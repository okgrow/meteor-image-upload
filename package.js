Package.describe({
  summary: "Easily create CollectionFS collections for images"
});

Package.on_use(function (api) {
  api.add_files('lib/easy_cfs_images.js', ['server', 'client']);
  api.export('ImageCollectionFactory');
  api.imply([
    'collectionFS',
    'cfs-s3',
    'cfs-tempstore',
    'cfs-filesystem',
    'cfs-graphicsmagick'
  ]);
});
