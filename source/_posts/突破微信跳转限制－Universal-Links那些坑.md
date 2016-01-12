title: 突破微信跳转限制－Universal Links那些坑
date: 2016-01-10 21:43:29
author: Bryan
tags:
- iOS
- Universal Links
- Wechat
category: iOS


---

微信屏蔽了在其内部webview中大部分URL Scheme跳转（除了一个白名单比如点评），目前突破这个限制有两种方案

- WXAppExtendObject: 这个用法自查
- Universal Links: 文档在[这里](https://developer.apple.com/library/ios/documentation/General/Conceptual/AppSearch/UniversalLinks.html) ，工作原理，如何实现，直接参考官方文档即可

但是我们按照文档支持了Universal Links，却在iOS9.2开始发现不work了，那么下面开始尝试解决问题

## App Search API Validation Tool
---

apple官方有出一个工具－[App Search API Validation Tool](https://search.developer.apple.com/appsearch-validation-tool/)，这个工具可以测试网站对iOS9 search API的支持，其中包括了对Universal Links的配置检查

但是这个工具对我们网站检查的结果是 `passed`

## iOS端表现分析
---

iOS 9.2开始具体变现如下：

- Safari中点击符合条件的Link，没有跳转App，但是长按链接能弹出用饿了么打开链接的选项
- 信息app内点击指定Link，works
- 微信中打开对应的web，点击符合条件的Link，没有跳转App

看起来iOS 9.2肯定是有修改相关的机制，但是Apple并没有提供相应的修改说明（反正我们没有搜到），这个也符合apple一贯的作风

## 答案

感谢 [Branch Metrics](https://dev.branch.io)，我在[这里](https://dev.branch.io/recipes/branch_universal_links/ios/#which-appsbrowsers-support-universal-links)找到了答案

贴上所有的注意点

* Universal Links will not work if you paste the link into the browser URL field.
* Universal Links work with a user driven `<a href="...">` element click across domains. Example: if there is a Universal Link on google.com pointing to bnc.lt, it will open the app.
* Universal Links will not work with a user driven `<a href="...">` element click on the same domain. Example: if there is a Universal Link on google.com pointing to a different Universal Link on google.com, it will not open the app.
* Universal Links cannot be triggered via Javascript (in window.onload or via a .click() call on an `<a>` element), unless it is part of a user action.

也就是从iOS 9.2开始，在相同的domain内Universal Links是不work的，必须要跨域才生效，我们实测值需要跨子域名即可，比如 m.domain.com 跳转 o.domain.com 是可以触发跳转App


Written by 饿了么iOS组 － Bryan


