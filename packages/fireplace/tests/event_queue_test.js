(function(){

  var queue;

  module("FP.FirebaseEventQueue", {
    setup: function() {
      queue = new FP.FirebaseEventQueue();
    }
  });

  // TODO - how to test this happens inside the runloop?

  test("runs enqueued items in the right context", function(){
    expect(2);

    var context = function() {};

    queue.enqueue(function() {
      ok(true, "called the queued function");
      ok(this === context, "executes in the assigned context");
    }, context);
  });

  test("runs entries queued whilst flushing", function(){
    expect(1);

    queue.enqueue(function() {
      queue.enqueue(function() {
        ok(true, "called the nested function");
      });
    });
  });

})();