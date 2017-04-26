/**
 * Created by stephenw on 2017/4/25.
 */
module.exports = function (locals) {
  var links = this.config.friendlink
  return {
    path: 'friend/index.html',
    data: {'friendlink': links},
    layout: 'friend'
  }
}