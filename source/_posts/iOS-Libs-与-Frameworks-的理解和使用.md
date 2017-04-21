title: iOS Libs 与 Frameworks 的理解和使用
date: 2017-02-28 13:31:03
author: axl411
category: iOS
tags:
	- cocoapods
	- lib
	- framework
---

本文将从两个角度——理论与实践，来介绍 iOS 开发中接触到的动态库、静态库、framework。理论部分会以简单的例子来建立对概念的理解；实践部分则是使用 cocoapods 的一些技巧。

# 名词

首先我们熟悉一下以下名词概念：

- 代码（code）：不止是指源代码（source code）形式的代码，也指代编译后产生的二进制代码。

- Mach-O：操作系统能够使用的二进制文件格式，很多种类的文件都是 Mach-O 文件，包括动态库、静态库、可执行文件，都是 Mach-O 文件。本文将替换使用多种代称，比如 `object file`、`对象文件`，都是指同一个概念。

- 动态库、 dynamic linked library、dynamic library、shared library、embedded shared library 这些名词都是指动态库。

# 理解 Libs 与 Frameworks

Libs（库），或是 Frameworks，无论静态还是动态，都是一种依赖管理的形式，其最终目的都是将程序依赖的`代码`载入到程序所在进程的地址空间中，从而让我们的程序能够使用它们。静态库、动态库只是用了不同的机制来实现这个目的。

## 静态库

我们直接以一个简单的例子讲述如何创建静态库并使用它，从而对静态库建立一个简单的概念。

### 制作静态库

有如下两个简单的源代码 `bar.h` 和 `bar.c`。`bar.c` 中声明了 `fizz` 函数，使用 `CoreFoundation` 的方法打印一个字符串 `buzz`，`bar.h` 将 `fizz` 函数暴露了出来：

```objc
// bar.h
#ifndef __foo__bar__
#define __foo__bar__
#include <stdio.h>

int fizz();

#endif /* defined(__foo__bar__) */

// bar.c
#include "bar.h"
#include <CoreFoundation/CoreFoundation.h>

int fizz() {
  CFShow(CFSTR("buzz"));
  return 0;
}
```

使用 `clang` 将 `bar.c` 编译为  `bar.o`。为了简化问题，我们只输出为 `x86_64` 处理器架构编译的结果。从 `file` 命令的输出可以看到，输出的 `bar.o` 是 `Mach-O` object file：

```bash
$ clang -c bar.c -o bar.o -arch x86_64
$ file bar.o
bar.o: Mach-O 64-bit object x86_64
```

使用 `libtool`，以 `bar.o` 为输入，输出一个名称为 `libfoo_static.a` 的静态库。从 `file` 的输出可以看到，静态库的文件类型是 `current ar archive random library`：

```bash
$ libtool -static bar.o -o libfoo_static.a
$ file libfoo_static.a
libfoo_static.a: current ar archive random library
```

### 使用静态库

有如下简单的 `main.c` 源代码，通过 `bar.h` 调用了 `fizz` 函数：

```objc
// main.c
#include "bar.h"
int main() {
  return fizz();
}
```

和制作静态库一样，用 `clang` 将 `main.c` 编译为 `main.o`。`main.o` 和 `bar.o` 的类型一样，都是 object file：

```bash
$ clang -c main.c -o main.o -arch x86_64
$ file main.o
main.o: Mach-O 64-bit object x86_64
```

用 `ld`（linker／链接器）来输出一个名为 `test_static` 的可执行文件。`ld` 接收的输入有：`main.o`、`CoreFoundation` framework、额外指定了当前文件夹为 library search path（`-L.`）、`libfoo_static`（`-lfoo_static`，正是因为额外指定了当前文件夹为 library search path 才能够找到它）、为简化问题只对 `x86_64` 架构编译（-lSystem 表示 libsystem，可以忽略，不影响对概念的理解）。通过 `file` 的输出可以看到 `test_static` 可执行文件也是一种 `Mach-O` 文件：

```bash
$ ld main.o -framework CoreFoundation -lSystem -L. -lfoo_static -o test_static -arch x86_64
$ file test_static
test_static: Mach-O 64-bit executable x86_64
```

执行 `test_static`，功能正常，输出了 `buzz`：

```bash
$ ./test_static
buzz
```

### 分析

用 `nm` 查看 `test_static` 可执行文件的符号表（symbol table），留意如下信息：

- `_CFShow`、`___CFConstantStringClassReference` 是来自 `CoreFoundation` framework 的 symbol，在这里还未被 resolve（即还没有指令所在的地址），这是因为 `CoreFoundation` framework 是动态链接的，两个 symbol 代表的指令的地址并不会在编译时被 resolve。（后面讲动态链接会介绍动态链接的 symbol 是如何 resolve 的）

- `_fizz` symbol 是来自静态库 `libfoo_static` 的，在这里已经被 resolve 了，即具体的指令已经存在于 `test_static` 的二进制中了。

```bash
$ nm test_static
                 U _CFShow
                 U ___CFConstantStringClassReference
0000000100000000 T __mh_execute_header
0000000100000f70 T _fizz
0000000100000f50 T _main
                 U dyld_stub_binder
```

查看 `libfoo_static` 以及 `bar.o` 的符号表，我们发现：

- `libfoo_static` 和 `bar.o` 的符号表内容是完全一样的。

- 从 `libfoo_static.a(bar.o):` 看出，静态库会把它包含的所有 object file 的符号表分别输出，静态库只是简单的 object file 的集合，这里 `libfoo_static` 只包含了一个 `bar.o`。

- 一样有 unresolved 的 `CoreFoundation` 的 symbol。

```bash
$ nm libfoo_static.a
libfoo_static.a(bar.o):
                 U _CFShow
                 U ___CFConstantStringClassReference
0000000000000000 T _fizz

$ nm bar.o
                 U _CFShow
                 U ___CFConstantStringClassReference
0000000000000000 T _fizz
```

用 `otool` 查看 `libfoo_static` 对 shared library 的依赖，没有看到任何依赖信息，因此指定依赖的责任自然就到了静态库的使用方。

```bash
$ otool -L libfoo_static.a
Archive : libfoo_static.a
libfoo_static.a(bar.o):
```

一个典型的静态库的例子是微信 SDK。它的接入文档会提到：
> SDK文件包括 libWeChatSDK.a，WXApi.h，WXApiObject.h 三个

并且：
> 开发者需要在工程中链接上:SystemConfiguration.framework, libz.dylib, libsqlite3.0.dylib, libc++.dylib, Security.framework, CoreTelephony.framework, CFNetwork.framework

这和我们看到的例子中自己制作的静态库概念是一样的。

### 小结

经过具体的例子，我们可以理解关于静态库的如下概念：

- 静态库就是 object file 的集合。

- 因此，在使用静态库的时候需要自行指定静态库的任何依赖。

- 静态链接会直接将静态库中的 object file 加到 target（比如 `test_static` 可执行文件） 中去。

## 动态库

动态库和静态库的最大区别是，动态库的代码不会直接加入到目标程序中，而是在启动时由 dynamic link editor `dyld` 加载到 app 的内存地址空间；另外，动态库包含自己的依赖信息。下面我们依然通过实例来理解这个概念。
 
### 制作动态库

复用前面制作静态库时编译出的 `bar.o`，依然使用 `libtool`，生成名为 `libfoo_dynamic.dylib` 的动态库。注意这里需要指定 `CoreFoundation` framework（可以忽略 -lSystem，不影响对概念的理解）。生成的 `libfoo_dynamic` 的文件类型是动态库：

```bash
$ libtool -dynamic bar.o -o libfoo_dynamic.dylib -framework CoreFoundation -lSystem
$ file libfoo_dynamic.dylib
libfoo_dynamic.dylib: Mach-O 64-bit dynamically linked shared library x86_64
```

使用 linker `ld` 来输出一个可执行文件 `test_dynamic`。这次的输入是同样复用前面编译出的 `main.o`、`foo_dynamic` 动态库（忽略 `-lSystem`），并指定当前文件夹 `.`（也就是 `foo_dynamic` 动态库所在的文件夹） 为 library search path。`test_dynamic` 同样是 `Mach-O` 可执行文件：

```bash
$ ld main.o -lSystem -L. -lfoo_dynamic -o test_dynamic -arch x86_64
$ file test_dynamic
test_dynamic: Mach-O 64-bit executable x86_64
```

执行 `test_dynamic`，同样能够输出正确的结果：

```bash
$ ./test_dynamic
buzz
```

### 分析

用 `nm` 查看 `test_dynamic` 可执行文件的 symbol table，留意如下信息：

- 来自 `CoreFoundation` framework 的 `_CFShow`、`___CFConstantStringClassReference` symbol 并没有存在于 `test_dynamic` 的符号表中。`_fizz` 符号只是个 reference，并没有被 resolve。

- 来自动态库 `libfoo_dynamic` 的 `_fizz` symbol 在这里并没有被 resolve。

```bash
$ nm test_dynamic
0000000100000000 T __mh_execute_header
                 U _fizz
0000000100000f70 T _main
                 U dyld_stub_binder
```

查看 `libfoo_dynamic` 以及 `bar.o` 的符号表，我们发现：

- `libfoo_dynamic` 和 `bar.o` 的 symbol table 内容并不是完全一样的，`_fizz` symbol 的地址在两者的 symbol table 中是不同的。

```bash
$ nm libfoo_dynamic.dylib
                 U _CFShow
                 U ___CFConstantStringClassReference
0000000000000f70 T _fizz
                 U dyld_stub_binder

$ nm bar.o
                 U _CFShow
                 U ___CFConstantStringClassReference
0000000000000000 T _fizz
```

用 `otool` 查看 `libfoo_dynamic` 的依赖信息，可以看到 `CoreFoundation` 是在里面的（同样，忽略 `libSystem`），因此使用方就不需要指定这个依赖了：

```bash
$ otool -L libfoo_dynamic.dylib
libfoo_dynamic.dylib:
	libfoo_dynamic.dylib (compatibility version 0.0.0, current version 0.0.0)
	/System/Library/Frameworks/CoreFoundation.framework/Versions/A/CoreFoundation (compatibility version 150.0.0, current version 1348.28.0)
	/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1238.0.0)
```

经过具体的例子，我们可以理解关于动态库的如下概念：

- 动态库包含了自己的依赖信息，因此，在使用动态库的时候直接使用动态库就可以。

- 动态链接并不会直接将动态库中的 object file 加到 target（比如 `test_dynamic` 可执行文件） 中去。

### 程序是如何使用动态库的

当执行程序时，例如执行 `./test_dynamic` 时，在其 `main` 函数被调用前，Kernel 除了会把 `test_dynamic` 载入到为其分配的内存空间外，还会载入 `dyld` linker，然后 `dyld` 会根据 `test_dynamic` 的依赖信息，将它依赖的 shared library（也就是 `libfoo_dynamic`）以及这些 shared library 的依赖（也就是 `CoreFoundation`）同样载入到内存地址空间。`test_dynamic` 中未 resolve 的 `_fizz` symbol 会在这时被 resolve。

这些 shared library 实际上在设备的物理内存中只存在一份，通过一个 mapping 的机制让它们能同时存在于多个应用的内存地址空间中。

另外，既然在物理内存中只存在一份，那多个应用使用的同一个 shared library 中的同一个变量是如何有对于该应用而言独有的 value 的呢？知道 Copy on Write 机制，字面意思就是在写操作时就 copy 一份这个概念就行了。

具体的细节可以参考[这集WWDC](https://developer.apple.com/videos/play/wwdc2016/406/)。

## Framework

在理解了动态库、静态库的基础上，framework 只是一个后缀为 `.framework` 的文件夹，包含了额外的资源，例如头文件、图片、文档、多语言支持资源、nib 等等。虽然 Framework  还有版本的概念，可以同时包含多个版本的 framework 在同一个 `.framework` 内，但对于 iOS 来说这不重要，因为我们的 Framework 是随 app 的 bundle 一起发布的，不存在被多方使用的问题。动态库在 app bundle 内的位置如下：

```bash
MyApp.app
├── Frameworks
│   └── MyDylib.dylib
│   └── MyFramework.framework
```

# （用 cocoapods）使用 Libs 与 Frameworks

> 将 libWeChatSDK.a，WXApi.h，WXApiObject.h 这三个拖到主工程

> 开发者需要在工程中链接上:a.framework, b.dylib, c.dylib, d.dylib, e.framework, f.framework, g.framework

> 将 a.png，b.png，c.js 拖到主工程

手动接入某个库或 Framework 往往需要做上面这些手动的事情，时间一长、接入的多了，非常不利于项目的维护。

[`cocoapods`](https://cocoapods.org/) 提供了非常好的依赖管理机制，并且可以用来对我们要使用的库、framework 进行封装，方便管理维护，不管是静态库、动态库还是 framework，只要填写一份统一的 `podspec`，就能完成对依赖的封装。如下所示，封装一个依赖的 `podspec` 通常涉及到填写这些属性：

- `vendored_frameworks`：要封装的 framework 的路径
- `vendored_libraries`：要封装的 lib 的路径
- `source_files`：这里只需要填写想要暴露的头文件的路径
- `libraries`：要封装的库所需要的依赖库
- `frameworks`：要封装的库所依赖的 framework
- `weak_framework`：要封装的库所依赖的 weak link 的 framework，例如 `UserNotifications` framework 是一个 iOS 10 才有的 framework，通过 weak linking + runtime availability check，可以在低于 iOS 10 的平台上安全地跑起来

```ruby
spec.vendored_frameworks = 'a.framework', 'b.framework'
spec.vendored_libraries = 'liba.a', 'libb.a'
spec.source_files = ‘Headers/Public/*.h'
spec.libraries = 'xml2', 'z'
spec.frameworks = 'QuartzCore', ‘CoreData'
spec.weak_framework = ‘UserNotifications’
```

## 静态库转动态库

一般不推荐这么做，不过把静态库转动态库也是可行的。

操作的方法是：

- 确保该静态库包含全部需要的架构。
- 用 Xcode 创建一个 Cocoa Touch Framework 的 project，用来封装静态库。
- 把静态库、静态库的头文件正常手动加入到项目中。
- 在 Build Settings 中的 Other Linker Flags 中加入 `-all_load` flag，从而在 link 时把所有静态库中的代码加载进来。
- 在 Build Settings 中的 Framework Search Paths 以及 Library Search Paths 中添加静态库所在的路径，从而在 compile 时能找到该静态库。
- 在 Build Phase 中的 Link Binary With Libraries 区域加入添加的静态库。
- 在 Build Phase 中的 Headers 区域把要暴露的头文件移到 Public。
- 根据静态库的接入文档，在工程中链接上需要的其他库、framework。
- 到这一步应该编译通过了。
- 目前的 Xcode 只会输出 only 模拟器 or only device 架构的动态库，因此为了生成一个可同时被模拟器以及真机使用的动态库，需要输出两次，并用 `lipo` 工具把架构合并。
- 蛋疼的是，当使用这个动态库的工程打包时，又需要用 `lipo` 工具把不需要的架构去掉（也就是为真机打包时，要去掉模拟器的架构）。

正是因为需要做这么多额外的工作，因此不推荐这么做。不过，把生成的动态库用 cocoapods 封装的话，cocoapods 在安装时会生成自动去除不需要架构的 build phase。

这么做有一个风险就是，由于改变了链接库的方式，最后库的资源在 iOS app 中的路径也会改变，如果库的开发者在编写库时取资源的姿势做了简单的假设的话（假设资源肯定在 app 的 main bundle 中），就会取不到资源了。下一章将详细介绍一下在库中取资源的姿势。

## 资源的读取

在 pod 中取资源不能简单假设资源所在的位置，否则会取不到资源。我们直接通过例子来看这个问题。假设有下面这样一个 pod：

- 名字叫 `MyPod`
- 通过 `resources` 来指定资源，这是不推荐的做法
- 通过 `resource_bundles` 来指定资源，这是推荐的做法
- 包含的资源是名叫 `img.png` 的图片

```ruby
s.name = ‘MyPod’

# 不推荐的做法
s.resources = “#{PATH_TO_RESOURCE}”

s.resource_bundles = { 'MyPod' => "#{PATH_TO_RESOURCE}" }
```

然后，我们有一个 iOS app 叫做 `MyApp`，用 3 种姿势来使用这个 pod：

- case 1：在 `Podfile` 里用 `use_frameworks!` 来安装 pod（pod 会被编译为动态库）
- case 2：在 `Podfile` 里不用 `use_frameworks!` 来安装 pod（pod 会被编译为静态库）
- case 3：在 `MyApp` 工程里手动建一个名叫 `MyHandMadeFramework` 的 Cocoa Touch Framework，并通过 pod 把 `MyPod` 安装在 `MyHandMadeFramework` 的 target 上，然后 `MyApp` 手动引入 `MyHandMadeFramework` 来使用。这种 case 虽然绕了点，但也是完全合理的一种使用姿势，并且资源在这种 case 下所在的位置是比较特别的。

### 用 `resources` 指定资源的情况

最终 `img.png` 在3种情况下编译出来的 app 中的路径如下：

```
// "case 1"
MyApp.app/Frameworks/MyPod.framework/img.png
// "case 2"
MyApp.app/img.png
// "case 3"
MyApp.app/Frameworks/MyHandMadeFramework.framework/img.png
```

因此，如果在取资源的时候简单地假设资源肯定在 main bundle，用如下姿势去取的话，肯定是不 work 的：

```objc
[[NSBundle mainBundle] pathForResource:@"img" ofType:@“png”];
```

正确的做法是用 `bundleForClass` 取出 `MyPod` 的代码所在的 bundle:

```objc
NSBundle *bundleContainingPodsCode = [NSBundle bundleForClass:[self class]];
```

`bundleContainingPodsCode` 的路径分别是：

```
// "case 1"
MyApp.app/Frameworks/MyPod.framework/
// "case 2"
MyApp.app/
// "case 3"
MyApp.app/Frameworks/MyHandMadeFramework.framework/
```

然后以这个 bundle 的相对路径去取资源就始终能取到正确的资源了：

```objc
NSString *imgPath = [bundleContainingPodsCode pathForResource:@"img" ofType:@“png”];
```

### 用 `resource_bundles` 指定资源的情况

最终 `img.png` 在3种情况下编译出来的 app 中的路径如下：

```
// "case 1"
MyApp.app/Frameworks/MyPod.framework/MyPod.bundle/img.png
// "case 2"
MyApp.app/MyPod.bundle/img.png
// "case 3"
MyApp.app/Frameworks/MyHandMadeFramework.framework/MyPod.bundle/img.png
```

可以看到这种情况和 `resources` 的情况区别在于：`img.png` 被额外放在了名叫 `MyPod.bundle` 的 bundle 内。因此，取资源的姿势上要额外把这个 bundle 取出来，再用相对路径去取资源：

```objc
NSBundle *libBundle = [NSBundle bundleForClass:[self class]];
NSString *resourceBundlePath = [[libBundle bundlePath] stringByAppendingPathComponent:@"MyPod.bundle"];
NSBundle *resourceBundle = [NSBundle bundleWithPath:resourceBundlePath]; // 这里应该把 resourceBundle 缓存下来

NSString *imgPath = [resourceBundle pathForResource:@"img" ofType:@“png”];
```

当然，如果你的 app 的 deployment target 为 iOS 8，那么可以直接用如下这个新的 api 来从 resource bundle 里取图片：

```objc
UIImage *img = [UIImage imageNamed:@"img" inBundle:resourceBundle compatibleWithTraitCollection:nil];
```


---

全文完
