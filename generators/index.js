/**
 * Created by stephenw on 2017/4/25.
 */

'use strict';
//multi author generator
if (hexo.config.multiauthor && hexo.config.multiauthor.authors) {
  hexo.extend.generator.register('author', require('./lib/multiauthor'))
}

//friend link
if (hexo.config.friendlink && hexo.config.friendlink instanceof Array) {
  hexo.extend.generator.register('friendlink', require('./lib/friendlink'))
}

hexo.extend.generator.register('about', function (locals) {
  var data = {};
  if (this.config.multiauthor) {
    var authors = this.config.multiauthor.authors
    data.authors = authors.filter(function (author) {
      var userid = Object.keys(author)[0]
      var info = author[userid]
      if (info.hidden == 'undefined') {
        return true
      }
      return !info.hidden
    })
  }
  return {
    path: '/about/index.html',
    data: data,
    layout: 'about'
  }
})