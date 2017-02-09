const fs = require('fs'),
      path = require('path'),
      superagent = require('superagent'),
      cheerio = require('cheerio')
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
    return fs.writeFileSync(`${__dirname}/currentuser.json`, JSON.stringify(user))
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
  }
}