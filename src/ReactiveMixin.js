var log = console.log.bind(console, "ReactiveMixin =>");
/**
 * This mixin provides a way of binding reactive data sources to React
 * components. Components that use this mixin should implement a method
 * named `getReactiveState` and return an object from that method, much
 * like the standard `getInitialState`. Within the `getReactiveState`
 * function you must make sure to call on [reactive data sources](http://docs.meteor.com/#/full/reactivity)
 * or else the method won't rerun. See DDPMixin if you're trying to reactively
 * wait on DDP subscriptions to be ready
 *
 * If the subscriptions are ready immediately the `subsReady` state will be
 * updated synchronously, reflecting that state at `componentWillMount`
 */
ReactiveMixin = {

  getInitialState: function() {
    log("getInitialState");
    var self = this;
    if ( self.getReactiveState ) {
      var initState = {};
      Tracker.autorun( function(computation) {
        log("autorun");
        computation.onInvalidate( function() {
          log("autorun invalidated");
          log("computation is", computation.stopped ? 'stopped' : 'not stopped');
        });
        // Something in getReactiveState MUST be a reactive data source
        // in order for rerun
        var reactiveState = self.getReactiveState();
        if ( typeof reactiveState !== 'undefined' ) {
          if (computation.firstRun) {
              initState = reactiveState;
          } else if ( self.isMounted() ) {
            log("mounted, changing state");
            // can't call setState until component is mounted
            self.setState(reactiveState);
          } else { // it's not mounted and we need to wait to `setState`
            Tracker.afterFlush(function () {
              log("afterFlush");
              self.setState(reactiveState); // set async
            });
          }
        }
      });
      return initState;
    }
  },

  // componentWillMount: function() {
  //   log("componentWillMount");
  //   var self = this;
  //   if ( self.getReactiveState ) {
  //     var initState = {};
  //     Tracker.autorun( function(computation) {
  //       log("autorun");
  //       computation.onInvalidate( function() {
  //         log("autorun invalidated", self._reactInternalInstance.getName());
  //         log("computation is", computation.stopped ? 'stopped' : 'not stopped');
  //       });
  //       // Something in getReactiveState MUST be a reactive data source
  //       // in order for rerun
  //       var reactiveState = self.getReactiveState();
  //       if ( typeof reactiveState !== 'undefined' ) {
  //         log("setting state", reactiveState);
  //         self.setState(reactiveState); // set async
  //       }
  //     });
  //   }
  // },

  componentWillUnmount: function() {
    log("UNMOUNTING");
    if (this._reactiveStateComputation) {
      this._reactiveStateComputation.stop();
      this._reactiveStateComputation = null;
    }
  }

};