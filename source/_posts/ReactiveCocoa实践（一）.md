title: ReactiveCocoa实践（一）
date: 2016-04-12 11:57:32
author: zhungxd
tags:
- iOS
- ReactiveCocoa
category: iOS
---

ReactiveCocoa(以下简称RAC)是iOS上函数响应式编程（Functional Reactive Programming，FRP）的框架，这个和我们平时面向对象（OOP）的编程方式有挺大的区别。本文通过在项目中使用RAC来实现一个小功能，让大家了解一下RAC。
# Introduction
有一个需求，在搜索页搜索时，需要先判断输入内容是否合法（2个字符以上），同时需要500毫秒的延迟，减少用户输入过程中频繁发起请求。这个功能非常适合用RAC来实现。FRP的核心是信号（signal），而输入框文本变化实质是一种信号，我们可以通过对信号的处理来完成这个功能。
# Signal
RAC中最核心的类RACSignal，是一系列可以被监测的数据流。

* 信号类(RACSignal)，只是表示当数据改变时，信号内部会发出数据.
* 默认一个信号都是冷信号，也就是值改变了，也不会触发，只有订阅了这个信号，这个信号才会变为热信号，值改变了才会触发。
* 如何订阅信号：调用信号RACSignal的subscribeNext就能订阅。

一个简单例子:

{% codeblock "RACSignal" lang:objectivec %}
  RACSignal *signal = [RACSignal createSignal:^RACDisposable *(id<RACSubscriber> subscriber) {
    // block调用时刻：每当有订阅者订阅信号，就会调用block。
    // 发送信号
    [subscriber sendNext:@1];
    // 发送完成信号
    [subscriber sendCompleted];
    return nil;
  }];
  
  // 订阅信号,才会激活信号.
  [signal subscribeNext:^(id x) {
    // block调用时刻：每当有信号发出数据，就会调用block.
    NSLog(@"接收到数据:%@",x);
  }];
{% endcodeblock %}
同时也支持使用宏来快速地生成信号

{% codeblock "KVO" lang:objectivec %}
  [RACObserve(self, searchText) subscribeNext:^(NSString *text) {
    NSLog(@"%@", text);
  }];
{% endcodeblock %}
`RACObserve`通过`- (RACSignal *)rac_valuesForKeyPath: observer:`来生成了一个信号，
其使用了KVO来监听property的变化，只要searchText被自己或外部改变，block就会被执行。只要是支持KVO的property都可以被RACObserve来生成一个信号。
## Operators
信号的处理是非常方便的，可以被修改(map)，也可以被过滤（filter），还可以被节流(throttle,一段时间内不在发送新的信号)等等。

{% codeblock "Operators" lang:objectivec %}
  [[[RACObserve(self, searchText)
     filter:^BOOL(NSString *text) {
       return text.length > 2;
     }]
    throttle:0.5]
   subscribeNext:^(NSString *searchText) {
     [self search:searchText];
   }];
{% endcodeblock %}
以上的代码通过对原始信号的处理（filter,throttle），生成了一下新的信号，过滤了输入字符长度小于等于2，同时在一定500毫秒内，不接收任何信号内容，过了500毫秒才获取最后发送的信号内容发出。
# Implementation
当然由于block的循环引用，我们必须像往常一样使用weakSelf，strongSelf。RAC在RACEXTScope.h中定义了 `@weakify()` 和 `@strongify()` 来方便我们使用。`@weakify()`实际上定义了一个_weak的`self_weak_` 变量，而`@strongify()`则在block定义了一个指向`self_weak_`的_strong的self指针。最终代码：

{% codeblock "Final Code" lang:objectivec %}
  @weakify(self);
  [[[RACObserve(self, searchText)
     filter:^BOOL(NSString *text) {
       return text.length > 2;
     }]
    throttle:0.5]
   subscribeNext:^(NSString *searchText) {
     @strongify(self);
     [self search:searchText];
   }]
{% endcodeblock %}

-------------

Written by 饿了么iOS组 － [zhungxd](https://github.com/zhungxd)