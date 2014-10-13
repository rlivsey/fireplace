---
title: "Introduction"
permalink: introduction
---

Fireplace is an [Ember.js](http://emberjs.com) addon for [Firebase](http://firebase.com).

[![Build Status](https://travis-ci.org/rlivsey/fireplace.svg?branch=master)](https://travis-ci.org/rlivsey/fireplace)

## Installation

Install as an Ember CLI addon:

`npm install --save-dev fireplace`

Then run the generator to install dependencies (Firebase from Bower):

`ember generate fireplace`

## Getting Started

Setup your Firebase root path by extending the default Store.

{% highlight javascript %}
// app/stores/main.js
import {Store} from 'fireplace';
export default Store.extend({
  firebaseRoot: "https://your-firebase.firebaseio.com"
});
{% endhighlight %}
