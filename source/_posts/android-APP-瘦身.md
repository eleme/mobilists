title: android APP 瘦身
date: 2016-02-25 17:18:09
author: JackCho
tags:
- Android
- Shrink
- APP 瘦身
category: Android
---


随着饿了么业务的快速发展，直接面向用户的APP的功能也越来越多，APP的体积也随之增长。虽然我们研发一直在有意识的从代码和资源角度打磨产品，但是仍是不能比较可观的抑制体积的增长，经历整个2015年多个版本的迭代，增长了一倍不止。所以到了这个时候，为了更小的减少用户升级更新的成本，APP瘦身之旅势在必行。下面将根据不同的瘦身角度来实战分析。 


## 1、PNG
  1.切图只要xxhdpi
      基于数据分析，绝大多数用户的设备分辨率都是2x、3x，
      在切图方面只选取xxhdpi一套图，通过在不同分辨率的机器上测试，UI效果以及内存开销都可以接受

2.切图技巧
	  大尺寸的切图，可考虑分切成多个小图片
	  不需要alpha通道的图片，可以考虑使用jpg
	  如果minsdk为4.2.1+，可以考虑把png全部换成webp；低版本可以通过第三方webp解码lib使用
	  
  3.切图压缩
      切图统一压缩，以防万一，在release打包的时候，再一次性压缩。
      压缩的工具可以选取[TinyPng](https://tinypng.com/) 、[ImageMagick](http://www.imagemagick.org/)（可以封装成GUI/command tool/gradle task）
      
   4.SVG/Vector Drawable
      自Lollipop开始，Android已经支持[VectorDrawable](http://developer.android.com/intl/zh-cn/reference/android/graphics/drawable/VectorDrawable.html)和[AnimatedVectorDrawable](http://developer.android.com/intl/zh-cn/reference/android/graphics/drawable/AnimatedVectorDrawable.html)，这个通过xml文本file完成原来切图png的功能，切图的工作基本就被托管了
      Lollipop以下，更新你的support library到[23.2](http://android-developers.blogspot.com/2016/02/android-support-library-232.html)，VectorDrawableCompat已经可以兼容到api7了，AnimatedVectorDrawableCompat兼容到api11
      
   5.删除无用资源
      通过**lint**发现无用资源删除
      android gradle plugin 开启[shrinkResources](http://tools.android.com/tech-docs/new-build-system/resource-shrinking)   
	  ...
	  
## 2、资源res

有同学会有疑问，res混淆和APP瘦身有什么关系呢？
这就需要大家对Android中资源的查找有一定的了解，code通过R文件中的常量值访问资源，但是是如何映射到具体的资源文件上的呢？这里就需要介绍resources.arsc，简单理解这是一个二进制文件，负责存储res资源的映射关系。如果我们精简资源的路径，如把res/drawable-xxhdpi/hello.png转为 a/z/p.png，这样的话resources.arsc中存储的信息量就会变少，对应的体积就会缩小。
	目前这种思路有开源的方案，可参考[AndResGuard](https://github.com/shwenzhang/AndResGuard)

## 3、jniLibs
	
根据业务面向的用户及设备，可考虑移除mips、x86平台的so
	 
64位的cpu会兼容32位，可以考虑不保留armeabi-64
	 
主流的arm架构有armv5、armv7、armv8，而它们是向后兼容的。在计算性能可接受的情况下，只保留armeabi一个；armv7加了FPU，大大提升了浮点运算的效率，必要时也可放入armeabi，在使用的时候手动去基于cpu abi手动load
	 
应用市场升级安装，我们无法把控具体升级的机器cpu abi。但是如果APP内升级的话，我们可以通过[ABIs Splits](http://tools.android.com/tech-docs/new-build-system/user-guide/apk-splits)打出多个apk升级包，基于不同的abi分发不同的最新apk
	 
如果so文件体积比较大的情况下，可不打入apk中，后面通过在线加载后再手动load。一个比较典型的场景就是集成自定义WebView的时候，内核so的体积很大，高达10MB+，这个时候WIFI在线load就是个不错的方案
	 
优化native code。native code会直接影响so的大小，所以从根源上做努力很有必要，比如Do not use Exceptions and RTTI。具体参考[Link](https://blog.algolia.com/android-ndk-how-to-reduce-libs-size/	 )
     
     
## 4、proguard
不知道大家有没有注意到，打包的code文件中包含很多的信息，其中有个就是 **LineNumber**
这个有什么作用呢，就是记录code对应的行号，执行过程中没啥意义。但是如果遇到crash，抓取stack trace去分析的时候，就可以具体到哪一行出了问题。
如果你足够丧心病狂、足够对code有信心的话，你可以移除**LineNumber**信息。
      
## 5、library

debug依赖的lib，统一在release时不打进APK，或者依赖的lib提供一套空实现    
大而全的Llbrary的引入有谨慎，guava这样的库就算了。如果你只用到一小部分功能，可以考虑自己做个抽取，或者替换为一个更精小的lib    
时刻关注library的依赖关系，别一个小lib直接或间接的依赖着一个超大的  
在重构过程中，记得check下是否有可以删除的lib      
      
## 6、online load
上面提到过一些，这里详细列举下
资源加载：大的图片、db文件、so等
code加载：即插件化，在线download jar再load，目前有很多开源项目可参考
	  
以上所列举的措施很多，在瘦身的过程中，基于自身的业务及需求，考虑选取合适的建议。我们饿了么APP这边的目标就是在满足业务的前提下，力求压缩到极致，同时也实现瘦身自动化。在持续优化的过程中，我们团队内部也逐渐积累了一些工具和lib，我们会在合适的时候给开源出来，有兴趣的同学持续关注。

**希望我们的经验能给有需求的同学一些参考和启发，也欢迎大家积极comment**


**APP瘦身是一条持续优化的路，这关乎产品，更关乎情怀**