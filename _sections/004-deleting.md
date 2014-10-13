---
title: "Deleting"
permalink: deleting
---

Simply call `delete` on a model to delete it.

As with saving, we return a promise so you can wait for Firebase to confirm that the save succeeded.

Likewise with saving, `Model#delete` is syntactic sugar for `Store#deleteRecord`.
