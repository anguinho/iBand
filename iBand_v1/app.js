var createError = require('http-errors')
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose')

require('./authentication/aut')

var adminRouter = require('./routes/index')
var APIRouter = require('./routes/index')
var mainRouter = require('./routes/index')

var app = express();

// Ligação à BD
mongoose.connect('mongodb://127.0.0.1:27017/i_band', {useNewUrlParser: true})

.then(() => console.log('Mongo ready: ' + mongoose.connection.readyState))
.catch(() => console.log('Erro na conexão à BD'))

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin', adminRouter)
app.use('/api', APIRouter)
app.use('/', mainRouter)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;