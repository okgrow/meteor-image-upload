Image Upload for Meteor
=======================

Installation
============

GraphicsMagick is required. Currently Meteor.com's deployment enviroment doesn't
support this. We use Heroku.

To install on OS X: `brew install graphicsmagick`

Usage
=====

There are a lot of steps to set this up. We're working on cutting this down
considerably. Any help is welcome.

Configure Image Upload
----------------------

Image Upload needs your AWS credentials and S3 bucket in order to upload files
to your S3 bucket. You can provide this information in two ways:
### Initializing Image Upload ###

In **common** code (**server** and **client**):

```javascript
ImageUpload.configure({
  accessKeyId: YOUR_ACCESS_KEY_ID,
  secretAccessKey: YOUR_SECRET_ACCESS_KEY,
  bucketName: YOUR_BUCKET_NAME,
  publicRead: true,
  bucketUrl: "https://your_bucket_name.s3.amazonaws.com/"
});
```

You can omit `publicRead` and `bucketUrl` if you don't want to serve images
directly from S3.

### Creating a collection of images ###

You can use `ImageUpload.createCollection` to create a collection to hold your
images. For example:

```javascript
UserImages = ImageUpload.createCollection("userImages", Meteor.users, {
  normal: [800,800],
  thumbnail: [200, 200]
});
```

You must pass in an associated collection (ex. `Meteor.users` above). Entries
in the created collection will point to entries in the associated collection,
and this is how we set up subscriptions automatically.

### Letting a User Upload an Image ###

In a template:

```html
<template name="uploadButton">
  {{> uploadImage imageCollection=userImage store="userImages-thumbnail" associatedObject=currentUser}}
</template>
```

Note: the `store` value in the above helper refers to the name of the
collection (given above as 'userImages'), followed by which image size to use.
This combined "collection-size" combo is used to display the image beside the
upload button after a user has uploaded it. You'll likely want to use something
small, like 'thumbnail'.

Which uses the following template helper to provide the collection:
```javascript
Template.uploadButton.helpers({
  userImage: function() {
    return UserImages;
  }
});
```

### Displaying a stored image ###

To display a stored image, you can

```html
<template name="userAvatar">
  <img src="{{image}}"/>
</template>
```

Which uses a helper which loads a document from the image collection:

```javascript
Template.userAvatar.helpers({
  image: function() {
    var image = UserImages.findOne({associatedObjectId: currentUser});
    if (image) {
      return image.url({store: "userImages-thumbnail"});
    }
  }
});
```


Demo App
========

We have a demo app that you can use an example of how you can use this package
in your own app. It shows how to let users have avatars, as well as attach
images to a simple chat message.

[Image Upload Demo App](https://ok-image-upload-demo.herokuapp.com/)

The source code is available here: [Image Upload Demo sourcecode](https://github.com/okgrow/meteor-image-upload-demo)

Roadmap / TODO
==============

In order of fuzzy priority:

- Less configuration to setup
- Better error handling
- Default upload progress bar
- In-browser image cropping/resizing with darkroom.js
- Upload files from a URL

Direct Uploads to S3?
---------------------

At this point we don't have plans to support uploading files directly from
the browser's client to AWS's S3. We may add this in the future, but there we
will probably wait until CollectionFS supports this (they have it in the
works). Pull requests welcome.

=========

Not Hard Coding Your Info
-------------------------

### Using environment variables (recommended) ###

Use `dotenv` package:

`meteor add pauldowman:dotenv`

Add a file named `.env` in your project directory:

```shell
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
S3_BUCKET_NAME=your_s3_bucket_name
```

On the **server**:

```javascript
var accessKeyId = process.env.AWS_ACCESS_KEY_ID
var secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
var bucketName = process.env.S3_BUCKET_NAME;
```

### Using Meteor `settings.json` ###

```javascript
var accessKeyId = Meteor.settings.AWS_ACCESS_KEY_ID
var secretAccessKey = Meteor.settings.AWS_SECRET_ACCESS_KEY
var bucketName = Meteor.settings.S3_BUCKET_NAME;
```

Create a file named `settings.json` in your project directory. It should look
something like this:

```json
{
  "AWS_ACCESS_KEY_ID": "your_aws_access_key_id",
  "AWS_SECRET_ACCESS_KEY": "your_aws_secret_access_key",
  "S3_BUCKET_NAME": "your_s3_bucket_name"
}
```

If you use `settings.json`, you will need to start your app using `meteor --settings settings.json`
