/**
 * Created by stephenw on 2017/4/25.
 */

module.exports = function (locals) {
  var config = this.config.multiauthor
  var authors = config.authors
  return authors.map(function (author) {
    var userid = Object.keys(author)[0]
    var posts = locals.posts.filter(function (post) {
      return post.author == userid
    })
    return {
      path: 'author/'+userid+'/index.html',
      data: {'author': author, 'posts': posts},
      layout: 'author'
    }
  })
}