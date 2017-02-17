/**
 * Created by stephenw on 2017/2/9.
 */
var child = require('child_process'),
    fs = require('fs'),
    yaml = require('js-yaml')
var server = null
module.exports = {
  hexo_server: function () {
    if (server == null) {
      server = child.spawn('hexo', ['s'])
    }
    return server
  },
  hexo_new_post: function (postname) {
    var dir = `${__dirname}/../../source/_posts/${postname}.md`
    if (fs.existsSync(dir)) {
      return
    }
    child.spawnSync('hexo', ['new', 'post', postname])
  },
  create_post: function (postname, tags, category,cb) {
    var dir = `${__dirname}/../../source/_posts/${postname}.md`
    var user = require('../store').user()
    if (!fs.existsSync(dir)) {
      cb('http://localhost:4000/404.html')
      return
    }
    var LBLReader = require('line-by-line')
    lr = new LBLReader(dir)
    var configs = '';
    var content = '';
    var isMeta = true
    lr.on('line', line => {
      if (line == '---') {
        isMeta = false
      } else if (isMeta) {
        configs += line + '\n';
      } else {
        content += line + '\n';
      }
    })
    lr.on('end', function () {
      var doc = yaml.safeLoad(configs, 'utf-8')
      if (tags && tags.length > 0) {
        doc.tags = tags
      }
      doc.category = category
      doc['author'] = user.github_id
      doc['author_avatar'] = user.avatar
      let year = doc.date.getUTCFullYear()
      let month = doc.date.getUTCMonth() + 1
      let day = doc.date.getUTCDate()
      let fullstr = `${year}/${month >= 10 ? month : '0'+month}/${day >= 10 ? day : '0'+day}`
      configs = yaml.safeDump(doc)
      var all = configs + '\n---\n' + content;
      fs.writeFileSync(dir, all)
      cb(encodeURI(`http://localhost:4000/${fullstr}/${postname}/`))
    })
  },
  updatePost: function (postname, tags, category,newcontent) {
    var dir = `${__dirname}/../../source/_posts/${postname}.md`
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(dir)) {
        return reject('not found')
      }
      var LBLReader = require('line-by-line')
      lr = new LBLReader(dir)
      var configs = '';
      var isMeta = true
      lr.on('line', line => {
        if (line == '---') {
          isMeta = false
          lr.close()
        } else if (isMeta) {
          configs += line + '\n';
        }
      })
      lr.on('end', function () {
        var doc = yaml.safeLoad(configs, 'utf-8')
        if (tags && tags.length > 0) {
          doc.tags = tags
        }
        doc.category = category
        configs = yaml.safeDump(doc)
        var all = configs + '\n---\n' + newcontent;
        fs.writeFileSync(dir, all)
        resolve(true)
      })
    })
  },
  hexo_deploy: function () {
    return child.spawn('hexo', ['d'])
  }
}