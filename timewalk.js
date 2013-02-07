// TODO(gregp): tests
// because this obviously hasn't been written a fucking thousand times before
// well, nodemon is huge and non-granular :-\
var fs = require('fs');
var glob = require('glob');

// TODO(gregp): keep a per-file lastModified?
//  probably not necessary - if we don't short circuit, and update our
//  lastModified time state object in the caller, we can replicate that.
// TODO(gregp): use statCache (sparingly!) to find new files in a directory
var timewalk = function(spec, cb, opt_startTime, opt_onChange) {
  var globber = glob.Glob(spec);
  // console.log();

  var time = opt_startTime || 0;
  // Needs to be an explicit closure since var time is not a pointer
  var done = function () {
    cb(null, time);
  };

  // wtf is this not getting called
  globber._afterStat = function (_f, abs, _cb, _er, stat) {
    // TODO(gregp): handle errors here
    var cur = +stat.mtime;
    if (cur > time) {
      // console.log('changed: ' + _f);
      // console.log(cur);
      time = cur;
      opt_onChange && opt_onChange(globber, _f, abs, stat);
    } else {
      // console.log('unchanged: ' + _f);
    }
    glob.Glob.prototype._afterStat.apply(this, arguments);
  }

  // wtf is this not getting called
  globber._afterReaddir = function (_f, abs, _cb, _er, _entries) {
    var callback = function () {
      if (_er && _er.code == 'ENOTDIR') {
        // So it's actually a function. If we didn't have this, we'd
        //  skip getting the full file info for performance.
        fs.stat(abs, this._afterStat.bind(this, _f, abs, _cb));
      } else {
        _cb.apply(this, arguments);
      }
    };
    glob.Glob.prototype._afterReaddir.call(this, _f, abs, callback, _er, _entries);
  }

  globber.on('end', done);
  globber.on('error', cb);
};

// Check whether any file in the directory has changed since time
timewalk.dirChangedSince = function(time, dir, cb) {
  var callback = function(err, walkTime) {
    cb(err, walkTime > time);
  };

  var onChange = function(globber) {
    globber.abort();
  };

  return timewalk(dir + '/**', callback, +time, onChange);
};

timewalk.walkMtime = function(dir, cb) {
  return timewalk(dir + '/**', cb)
};

module.exports = timewalk;
