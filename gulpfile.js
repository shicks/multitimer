const gulp = require('gulp');
const closureCompiler = require('google-closure-compiler').gulp();

gulp.task('js', () =>
    gulp.src(['timer.js', 'externs.js'])
          .pipe(closureCompiler({
            compilation_level: 'ADVANCED',
            warning_level: 'VERBOSE',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            output_wrapper: '(function(){\n%output%\n}).call(this)',
            js_output_file: 'timer-transpiled.js'}))
          .pipe(gulp.dest('./dist')));

gulp.task('copy', () =>
    gulp.src(['index.html', 'timer.css'])
          .pipe(gulp.dest('./dist')));

gulp.task('default', gulp.series(['js', 'copy'], () => Promise.resolve()));
