# Image Upload for Meteor

Image Upload makes it super easy for you to setup a photo input field along with all the trimmings (S3, collections, permissions, templates, etc.). Under the hood you will find ImageUpload is just a sugary wrapper around [collectionFS](https://atmospherejs.com/cfs).

To get familiar with ImageUpload take a look at the rest of this read me as well as our example:
 
[Example app live](https://ok-image-upload-demo.herokuapp.com/)
 
[Example app source](https://github.com/okgrow/meteor-image-upload/blob/master/examples/app)

DISCLAIMER - ***This package is under active development***. We currently use this in our production apps but be aware there may be future API changes. If you'd like to help out, drop us a message at hello@okgrow.com or send a PR.

## One-time Setup

### Prerequisites

1. [AWS S3](http://aws.amazon.com/s3/) account for cloud file storage.

2. [GraphicsMagick](http://www.graphicsmagick.org/) or [ImageMagick](http://www.imagemagick.org/) on your local machine *and* deployment server for image manipulation.

  -	**OS X:** `brew install imagemagick` or `brew install graphicsmagick`

  -	**Modulus.io:** supports ImageMagick no setup needed

  -	**Heroku, DigitalOcean, AWS EC2:** requires manual ImageMagick/GraphicsMagick installation.
  
  - **Meteor.com free hosting** does *not* support ImageMagick/GraphicsMagick, sorry no way around it :(


### Install & Configure

Install from your terminal `meteor add okgrow:image-upload`.

Configure in common code (*server* and *client* ).

API: ` ImageUpload.configure( options ) `

Example
```javascript
ImageUpload.configure({
  accessKeyId: YOUR_ACCESS_KEY_ID,
  secretAccessKey: YOUR_SECRET_ACCESS_KEY,
  bucketName: YOUR_BUCKET_NAME,
  bucketUrl: YOUR_BUCKET_URL, //"https://your_bucket_name.s3.amazonaws.com/"
  publicRead: true
});
```

You can omit `publicRead` and `bucketUrl` if you don't want to serve images
directly from S3.

**WARNING** You should never store your keys publicly, instead use [Meteor.settings](http://docs.meteor.com/#/full/meteor_settings). Start your app using `meteor --settings settings.json`

### Creating Image Collections

The images you upload will be stored in separate *Image Upload* collections. You will probably have more than one Image Upload collection. The Image Upload collections are created differently from Meteor collections, we show you how to make these special collections below. 

Each Image Upload collection will reference and index it's documents to one of your app's data collections as specified, only one app data collection can be referenced per each Image Upload collection. We show you how to query by reference ids in [templating](#display-image)
below.

API: `ImageUpload.createCollection( name, reference, { [options] } )`

Options: 

| Name                   | Optional | Description |
| ---                    | :---:    | ---         |
| **defaultPermissions** | optional | Enables default Allow rules on your image collection, see [Security Rules](#allowdeny-security-rules) to see the rules |
| **sizes**              | optional | Let ImageMagick create multiple different sizes of each image automatically. Specify a size name as the key followed by an array for X,Y px lengths |
| **maxUploadSize**      | optional | The maximum allowed file size in MB. Default is 20. |

The following creates an image collection called `userImages` which will be associated with the `Meteor.users` collection with images stored in four sizes:

1. The original image
2. "thumbnail": 200x200 px
3. "normal": 800x800 px
4. "large:": 1200x1200 px

```javascript
UserImages = ImageUpload.createCollection("userImages", Meteor.users, {
  defaultPermissions: true,
  maxUploadSize: 30,
  sizes: {
  thumbnail: [200, 200],
    normal: [800,800],
    large: [1200, 1200]
  }
});
```


### Allow/Deny Security Rules

Please add your own **allow/deny** rules and/or enable ImageUpload's `defaultPermissions` when creating the ImageUpload collection.

defaultPermissions if enabled:
```javascript
ImageCollection.allow({
  insert: function(userId, doc) {
    // Any authenticated user can create images
    return !!userId;
  },
  update: function(userId, doc) {
     // User can update their own image only
    return doc && doc.addedBy === userId;
  },
  remove: function(userId, doc) {
     // User can remove their own image only
    return doc && doc.addedBy === userId;
  },
  download: function (userId, fileObj) {
    // If publicRead has been set anyone can download, otherwise users
    // can only download images that they uploaded
    if (publicRead) {
      return true;
    } else {
      return fileObj.addedBy === userId;
    }
  }
});
```

*Note:* Since the image collection is based on `CollectionFS`, we use their `allow`
and `deny` system. You can view their documentation here:

https://github.com/CollectionFS/Meteor-CollectionFS#security


## Client-side Templating

### Upload Image Template

You want a nice upload button with everything wired up for you? We got ya covered.

API: `{{> uploadImage imageCollection=collectionName [option=option] }}`

Examples:
```html
{{> uploadImage imageCollection="userImages" size="thumbnail" doc=currentUser classImage="tiny-img round"}}

{{> uploadImage imageCollection="postImages" name="post-image" size="banner" }}
```

Attributes:

| Name | Optional | Description |
| --- | :---: | --- |
| **imageCollection** | required | Specify the Image Upload collection images go to.  *hint: This was the first parameter when creating the Image Upload collection.* |
| **doc** | optional | When adding a new image to an existing document you can pass the existing document and we will make the reference for you. We pull the reference `_id` from the supplied object. |
| **size** | optional | Specify the image size you want displayed when upload completes. By default this partial template displays the original uploaded image once complete. *hint: You made these sizes when creating your Image Upload collection.* |
| **name** | optional | Specify a custom input element name. This overwrites the default input name attribute, `image` |
| **classInput** | optional | Specify custom CSS class(es) for the input element. Included class is `image-file-picker` |
| **classImage** | optional | Specify custom CSS class(es) for the image when it displays after upload completes. Included class is`uploaded-image` |


### Display Image

To display a stored image, you can

```html
<template name="yourTemplate">
  <img src="{{image}}"/>
</template>
```

Which uses a helper which loads a document from the image collection:

```javascript
Template.yourTemplate.helpers({
  image: function() {
    var doc = Template.parentData(1);
    var image = yourImageCollection.findOne({associatedObjectId: doc._id});
    if (image) {
      return image.url({store: "userImages-thumbnail"});
    }
  }
});
```

## Roadmap / TODO

In order of fuzzy priority:

- Less configuration to setup
- Better error handling
- Default upload progress bar
- In-browser image cropping/resizing with darkroom.js
- Upload files from a URL

### Direct Uploads to S3?

At this point we don't have plans to support uploading files directly from
the browser's client to AWS's S3. We may add this in the future, but there we
will probably wait until CollectionFS supports this (they have it in the
works). Pull requests welcome.


Enjoy!
