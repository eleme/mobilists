const fs = require('fs'),
      path = require('path'),
      superagent = require('superagent'),
      cheerio = require('cheerio'),
      yaml = require('js-yaml')

module.exports = {
  user: function () {
    var currentuser = fs.existsSync(`${__dirname}/currentuser.json`)
    if (currentuser) {
      var userinfo = fs.readFileSync(`${__dirname}/currentuser.json`)
      return (JSON.parse(userinfo))
    } else {
      var userinfo = fs.readFileSync(`${__dirname}/user.json`)
      return JSON.parse(userinfo)
    }
  },
  updateUser: function (info) {
    var user = this.user()
    Object.keys(info).forEach(key => {
      user[key] = info[key]
    })
    user['valid'] = true
    fs.writeFileSync(`${__dirname}/currentuser.json`, JSON.stringify(user))
    this.updateSiteMultiUser(info)
  },
  avatar: function (github_id) {
    return superagent.get(`https://github.com/${github_id}`)
      .timeout({
        response: 10000,
        deadline: 60000
      })
      .then(response => {
        return new Promise((resolve, reject) => {
          var $ = cheerio.load(response.text)
          var avatars = $('.avatar.width-full.rounded-2')
          if (avatars.length == 0) {
            console.log('failed')
            reject('error')
          } else {
            resolve(avatars[0].attribs['src'])
          }
        })
      })
  },
  updateSiteMultiUser: function (info) {
    var dir = `${__dirname}/../../_config.yml`
    var content = fs.readFileSync(dir)
    var config = yaml.safeLoad(content)
    var users = config.multiauthor.authors
    var finded = false
    var newusers = users.map(user => {
      var userid = Object.keys(user)[0]
      if (userid == info.github_id) {
        finded = true
        var newuser = {}
        newuser[userid] = {
          'displayname': user[userid].displayname,
          'avatar': info.avatar
        };
        return newuser
      } else {
        return user
      }
    })
    if (!finded) {
      var userid = info.github_id
      var newuser = {}
      newuser[userid] = {
        'displayname': userid,
        'avatar': info.avatar
      };
      newusers.push(newuser)
    }
    config.multiauthor.authors = newusers
    fs.writeFileSync(dir, yaml.safeDump(config, {
      'noCompatMode': true
    }))
  }
}