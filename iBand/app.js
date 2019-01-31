var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fs=require('fs')
var mongoose = require('mongoose');
var uuid = require('uuid/v4')
var session = require('express-session')
var FileStore = require('session-file-store')(session)
var passport = require('passport')
var StreamZip =require('node-stream-zip')
const del = require('del')

var APIRouter   = require('./routes/api/index')
var adminRouter = require('./routes/Admin/index')
var frontRouter = require('./routes/Front/index')
var homeRouter = require('./routes/index')

const zip = new StreamZip({
  file:'./sheets.zip',
  storeEntries:true
})

require('./authentic/aut');

var app = express();

// Base de dados
mongoose.connect('mongodb://127.0.0.1:27017/iBand', {useNewUrlParser: true})
      .then(()=> {
        mongoose.connection.db.dropCollection('works', (err,result)=>{
          if(err) console.log(err)
          else console.log('apagado')
        })
        console.log("Mongo ready: " + mongoose.connection.readyState)
      })
      .catch(erro => console.log("Erro de conexão: " + erro))

var WorkController=require('./controllers/workController')
zip.close()
zip.on('ready', () => {
  let jsonLinks = zip.entryDataSync('sheets/json/iBanda-SIP.json')
  var files = JSON.parse(jsonLinks).files
  if(files!=null)
    files.forEach((file)=>{
      const data = zip.entryDataSync(`sheets/json/${file}.json`);
      var instrData = JSON.parse(data)
      WorkController.getByTitle(instrData.titulo)
        .then(res => {
          if(res==null){
            var obj = {
              title:instrData.titulo,
              type:instrData.tipo,
              composer:instrData.compositor,
              arrangement:instrData.arranjo,
              instruments:[]
            }
            instrData.instrumentos.forEach((instr)=>{
              var ipp =instr.partitura.path
              var pasta = ipp.split('-')[0]
              var fpath = `sheets/iBanda-PDFs/${pasta}/${ipp}`
              var ex = zip.entry(fpath) != undefined ? true : false
              var ins = {
                name: instr.nome,
                filename: ipp,
                path: 'sheets/'+pasta+'/'+ipp,
                voz:instr.partitura.voz,
                exists: ex
              }
              obj.instruments.push(ins)
            })
            WorkController.insert(obj)
          }
      })
        .catch(err=> console.log(err))
    })
    if(fs.existsSync('public/sheets/')){
      del.sync(['public/sheets/**'])
      console.log('deleted')
    }
    fs.mkdirSync('public/sheets/')
    zip.extract('sheets/iBanda-PDFs/', './public/sheets', err => {
      console.log(err ? err : 'Extracted');
      zip.close();
    });
});

//Passport Autentication
app.use(session({
  genid: req => {
    return uuid()},
  store: new FileStore(),
  secret: 'O meu segredo',
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


//Use of Routes
app.use('/api',APIRouter)
app.use('/admin', adminRouter);
app.use('/', homeRouter);
app.use('/user',frontRouter)

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