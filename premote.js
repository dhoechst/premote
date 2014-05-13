var act = {"Id":"a0gJ0000002oRRIIA2","Subject__c":"Modified yet again Benj","Type__c":"Progress Note"};

/*global Q:false, Visualforce:false, define:false */

(function(root, Q, Visualforce) {
  "use strict";

  var Premote = {};

  // Wrap a javascript remoting function in a promise
  // Only works if function is properly `bind`ed to the remoting manager. This
  // method is private to ensure that we pass in properly bound methods.
  function wrapFunction (func, options) {
    return function() {
      var args;
      var deferred = Q.defer();

      if(arguments.length) {
        args = Array.prototype.slice.apply(arguments);
      } else {
        args = [];
      }
      
      var cb = function(result, event) {
        if(event.status) {
          deferred.resolve(result);
        } else {
          var err = new Error(event.message);
          err.result = result;
          if(event.type === 'exception') {
            err.apexStackTrace = event.where;
          }
          deferred.reject(err);
        } 
      };

      args.push(cb);

      if(options) {
        args.push(options);
      }
      
      func.apply(null, args);
      return deferred.promise;
    };
  }
  
  // public interface.  Can either wrap a string remoting name ('namespace.className.remoteMethod')
  // or a javascript remoting class (`className`)
  // if provided, `options` will be appended to the promises's run-time arguments 
  Premote.wrap = function(remoteAction, options) {

    if(options && typeof options !== 'object') {
      throw new Error('options must be an object');
    }

    // if remoteAction is an object, wrap each of its members
    if (typeof remoteAction === 'object') {
      var ret = {};
      for (var prop in remoteAction) {
        if (remoteAction.hasOwnProperty(prop) &&
            typeof remoteAction[prop] === 'function') {
          var func = remoteAction[prop];
          var boundFunc = func.bind(remoteAction);
          ret[prop] = wrapFunction(boundFunc, options);
        }
      }
      return ret;
    
    // if remoteAction is a string, turn it into a function
    } else if (typeof remoteAction === 'string') {

      // validate the string format
      var namespace, controller, method;
      var parts = remoteAction.split('.');

      if(parts.length === 3) {
        namespace = parts[0];
        controller = parts[1];
        method = parts[2];
      } else if(parts.length === 2) {
        controller = parts[0];
        method = parts[1];
      } else {
        throw new Error('invalid remote action supplied: ' + remoteAction);
      }

      var Manager = Visualforce.remoting.Manager;

      var bound = function () {
        var args;

        if(arguments.length) {
          args = Array.prototype.slice.apply(arguments);
        } else {
          args = [];
        }

        args.splice(0, 0, remoteAction);
        
        Manager.invokeAction.apply(Manager, args);
      };

      return wrapFunction(bound, options);
    
    // remoteAction was neither an object nor a string
    } else {
      throw new Error('invalid remote action supplied: ' + remoteAction);
    }
  };


  // amd and requirejs support
  if(typeof define === 'function' && define.amd) {
    define(Premote);
  }

  // create the global
  root.Premote = Premote;

}(this, Q, Visualforce));