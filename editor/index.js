const express = require('express'),
      app = express(),
      store = require('./store'),
      path = require('path'),
      bodyParser = require('body-parser'),
      hexo_runtime = require('./hexo-runtime')

app.use(express.static(path.join(__dirname, 'html')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.get('/', (req, res) => {
  res.redirect('/index.html')
})

app.get('/user', (req, res) => {
  res.send(store.user())
})

app.get('/github/:githubid', (req, res) => {
  let githubId = req.params.githubid
  store.avatar(githubId)
    .then(url => {
      res.send({
        'avatar': url
      })
    })
    .catch(errmsg => {
      res.status(404).send(errmsg)
    })
})

app.post('/github/confirm', (req, res) => {
  store.updateUser(req.body)
  res.send(store.user())
})

app.post('/post/create/:postname', (req, res) => {
  hexo_runtime.hexo_new_post(req.params.postname)
  hexo_runtime.create_post(req.params.postname, req.body.tags, req.body.category, function (url) {
    res.send(url)
  })
})

app.post('/post/update/:postname', (req, res) => {
  hexo_runtime.updatePost(req.params.postname, req.body.tags, req.body.category,req.body.content)
    .then(success => {
      res.send(success)
    })
    .catch(e => {
      res.status(400).send(e)
    })
})


console.log('hexo server is running on port:4000 and pid is: ' + require('./hexo-runtime').hexo_server())
app.listen(8090, () => {
  console.log('Editor is running on http://localhost:8090')
})