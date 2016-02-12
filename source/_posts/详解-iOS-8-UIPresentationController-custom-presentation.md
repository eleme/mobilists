title: 详解 iOS 8 `UIPresentationController` Custom Presentation
date: 2016-02-12 13:28:40
author: axl411
tags:
- iOS
- UIPresentationController
- Custom Presentation
- iOS 8
category: iOS
---

现在大多数 app 都已经支持 iOS 7+ 有一段时间了，距离支持 iOS 8+ 的时间也是屈指可数（希望如此...）了。iOS 8 新增的 API 中有一个 `UIPresentationController` 一直比较陌生，本文将简略介绍使用 `UIPresentationController` 来实现一个自定义 presentation 的过程，然后详细解读 `UIKit` 是如何操作这一过程以及我们能够如何地参与其中。

# Final Result

下图是 demo 的效果：黄色背景的 view controller （之后简称vc）present 了一个红色背景的 vc，present 的过程是自定义的，红色背景的 vc 被 present 出来后没有占满整个屏幕，周围有一圈黑色半透明背景可以透视看到黄色 vc。
{% asset_img final_result.gif 最终的结果 %}

# Implementation

Demo 的效果用 iOS 7 的自定义 presentation 动画的 API 就能够实现，只需要使 presented vc 的背景色是黑色半透明，然后在上面加一个比自己 view 小一圈的红色区域就行。这里我们先不讨论为什么能够用 iOS 7 的 API 实现了，还需要用 iOS 8 的 `UIPresentationController`，直接先看如何实现。







我们创建一个 `UIPresentationController` 的 subclass，在其中自己管理一个 `dimmingView`（黑色半透明），并 override 一些方法，在 present 的过程中把 presented vc 的 view 的 `frame` 设置得小一些，并将其加到 `dimmingView` 上，然后把 `dimmingView` 加入到视图结构中去。

{% codeblock "MyPresentationController" lang:swift %}
class MyPresentationController: UIPresentationController {
  
  let dimmingView = UIView()
  
  override init(presentedViewController: UIViewController, presentingViewController: UIViewController) {
    dimmingView.backgroundColor = UIColor.blackColor().colorWithAlphaComponent(0.4)
    
    super.init(presentedViewController: presentedViewController, presentingViewController: presentingViewController)
  }
  
  override func frameOfPresentedViewInContainerView() -> CGRect {
    if let frame = containerView?.bounds {
      return CGRectInset(frame, 50, 50)
    } else {
      return super.frameOfPresentedViewInContainerView()
    }
  }
  
  override func containerViewWillLayoutSubviews() {
    guard let containerView = containerView else { return }
    dimmingView.frame = containerView.bounds
  }
  
  override func presentationTransitionWillBegin() {
    guard
      let containerView = containerView,
      let presentedView = presentedView(),
      let coordinator = presentingViewController.transitionCoordinator()
      else { return }

    dimmingView.alpha = 0.0
    containerView.addSubview(dimmingView)
    dimmingView.addSubview(presentedView)
    coordinator.animateAlongsideTransition({ (context) -> Void in
      self.dimmingView.alpha = 1.0
      }, completion: nil)
  }
  
  override func presentationTransitionDidEnd(completed: Bool) {
    if !completed {
      dimmingView.removeFromSuperview()
    }
  }
  
  override func dismissalTransitionWillBegin() {
    guard let coordinator = presentedViewController.transitionCoordinator() else { return }
    coordinator.animateAlongsideTransition({ (context) -> Void in
      self.dimmingView.alpha = 0.0
      }, completion: nil)
  }
  
  override func dismissalTransitionDidEnd(completed: Bool) {
    if completed {
      dimmingView.removeFromSuperview()
    }
  }

}
{% endcodeblock %}







然后我们需要一个 animator，涉及的都是 iOS 7 的 API，这里不多做说明。注意 `transitionContext.viewForKey(UITransitionContextToViewKey)` 是 iOS 8 新增的 API，这里必须这样来取得 `toView` 是因为 presentation controller 可能会提供并不是 presented vc 的 view 来用做 presentation。另外 `toView` 的 `finalFrame` 同样需要从 context 获取，因为 `finalFrame` 可以被 `UIPresentationController` 修改为并不是整个屏幕的大小。

{% codeblock "TransitioningAnimator" lang:swift %}
class TransitioningAnimator: NSObject, UIViewControllerAnimatedTransitioning {
  
  func transitionDuration(transitionContext: UIViewControllerContextTransitioning?) -> NSTimeInterval {
    return 1.0
  }
  
  func animateTransition(transitionContext: UIViewControllerContextTransitioning) {
    guard
      let toViewController = transitionContext.viewControllerForKey(UITransitionContextToViewControllerKey),
      let toView = transitionContext.viewForKey(UITransitionContextToViewKey),
      let containerView = transitionContext.containerView()
      else { return }
    
    let finalFrame = transitionContext.finalFrameForViewController(toViewController)
    toView.frame = finalFrame
    toView.transform = CGAffineTransformMakeScale(0.2, 0.2)
    toView.alpha = 0.0
    containerView.addSubview(toView)
    
    UIView.animateWithDuration(transitionDuration(transitionContext), delay: 0, usingSpringWithDamping: 0.5, initialSpringVelocity: 0, options: [], animations: { _ in
      toView.transform = CGAffineTransformIdentity
      toView.alpha = 1.0
      }) { completed -> Void in
        transitionContext.completeTransition(completed)
    }
  }
  
}
{% endcodeblock %}







另外还需要一个 `TransitioningDelegate `，其作用就是提供之前创建的 presentation controller 以及 animator

{% codeblock "TransitioningDelegate" lang:swift %}
class TransitioningDelegate: NSObject, UIViewControllerTransitioningDelegate {

  func presentationControllerForPresentedViewController(presented: UIViewController, presentingViewController presenting: UIViewController, sourceViewController source: UIViewController) -> UIPresentationController? {
    let presentationController = MyPresentationController(presentedViewController: presented, presentingViewController: presenting)
    return presentationController
  }
  
  func animationControllerForPresentedController(presented: UIViewController, presentingController presenting: UIViewController, sourceController source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
    let animator = TransitioningAnimator()
    return animator;
  }
  
}
{% endcodeblock %}







最后，在 present 之前把 `TransitioningDelegate` 赋值给 presenting 以及 presented vc。

{% codeblock "黄色vc的按钮触发的方法内" lang:swift %}
let vc = MyViewController()
let myTransitioningDelegate = TransitioningDelegate()
transitioningDelegate = myTransitioningDelegate
vc.transitioningDelegate = myTransitioningDelegate

presentViewController(vc, animated: true, completion: nil)
{% endcodeblock %}





通过以上的代码就实现了 demo 所示的效果。你肯定会问，我用 iOS 7 的 animator 一样可以做到啊，这是何苦又要多增加一个类（`MyPresentationController`）呢？下面我们详细撸一遍 iOS 8 下 present 的过程，撸完之后应该就能够理解了。


# UIPresentationController

为了便于参考，把 `UIPresentationController` 的 API 放在这里，可以直接跳到下一章阅读。
{% codeblock "UIPresentationController" lang:swift %}
@available(iOS 8.0, *)
public class UIPresentationController : NSObject, UIAppearanceContainer, UITraitEnvironment, UIContentContainer, UIFocusEnvironment {
    
    public var presentingViewController: UIViewController { get }
    public var presentedViewController: UIViewController { get }
    
    public var presentationStyle: UIModalPresentationStyle { get }
    
    // The view in which a presentation occurs. It is an ancestor of both the presenting and presented view controller's views.
    // This view is being passed to the animation controller.
    public var containerView: UIView? { get }
    
    weak public var delegate: UIAdaptivePresentationControllerDelegate?
    
    public init(presentedViewController: UIViewController, presentingViewController: UIViewController)
    
    // By default this implementation defers to the delegate, if one exists, or returns the current presentation style. UIFormSheetPresentationController, and
    // UIPopoverPresentationController override this implementation to return UIModalPresentationStyleFullscreen if the delegate does not provide an
    // implementation for adaptivePresentationStyleForPresentationController:
    public func adaptivePresentationStyle() -> UIModalPresentationStyle
    @available(iOS 8.3, *)
    public func adaptivePresentationStyleForTraitCollection(traitCollection: UITraitCollection) -> UIModalPresentationStyle
    
    public func containerViewWillLayoutSubviews()
    public func containerViewDidLayoutSubviews()
    
    // A view that's going to be animated during the presentation. Must be an ancestor of a presented view controller's view
    // or a presented view controller's view itself.
    // (Default: presented view controller's view)
    public func presentedView() -> UIView?
    
    // Position of the presented view in the container view by the end of the presentation transition.
    // (Default: container view bounds)
    public func frameOfPresentedViewInContainerView() -> CGRect
    
    // By default each new presentation is full screen.
    // This behavior can be overriden with the following method to force a current context presentation.
    // (Default: YES)
    public func shouldPresentInFullscreen() -> Bool
    
    // Indicate whether the view controller's view we are transitioning from will be removed from the window in the end of the
    // presentation transition
    // (Default: NO)
    public func shouldRemovePresentersView() -> Bool
    
    public func presentationTransitionWillBegin()
    public func presentationTransitionDidEnd(completed: Bool)
    public func dismissalTransitionWillBegin()
    public func dismissalTransitionDidEnd(completed: Bool)
    
    // Modifies the trait collection for the presentation controller.
    @NSCopying public var overrideTraitCollection: UITraitCollection?
}
{% endcodeblock %}








# The Presentation Process

我们来详细解读一下 presentation 的过程：

1. 我们初始化好将要被 present 的 vc 以及我们的 `TransitioningDelegate`，并将之赋值给 presenting 及 presented vc，然后通过我们再熟悉不过的 `presentViewController:animated:completion:` 启动 presentation。
2. `UIKit` 通过 `presentationControllerForPresentedViewController(_:presentingViewController:sourceViewController:)` 来向我们的 `TransitioningDelegate` 要一个 `UIPresentationController`，在我们的实现中，我们提供了自己写的它的子类 `MyPresentationController`。
3. `UIKit` 向 `UIPresentationController` 的 `shouldPresentInFullscreen()` 咨询这次 presentation 是否覆盖全屏幕。它的默认值就是 `true`。我们也可以返回 `false` 从而来一次覆盖部分屏幕的 presentation。`UIKit` 在整个 presentation 的过程中会多次咨询这个方法。
4. `UIKit` 咨询 `adaptivePresentationStyleForTraitCollection(traitCollection:)` 来获取一个在特定 trait collection 下 make sense 的 presentation style。比如说在横屏的 phone 上以 popover 来 present 了一个 vc，然后切换成竖屏，考虑到竖屏下横向空间是紧凑的话可以把 popover 调整为 fullscreen。这个方法的本质是咨询 `UIPresentationController` 的 `delegate` 的 `adaptivePresentationStyleForPresentationController:traitCollection:` 来得到一个 style，如果 `delegate` 不存在的话则返回 `.None`，就是完全不适配不同的 trait collection。
5. `UIKit` 向我们的 `TransitioningDelegate` 通过 `animationControllerForPresentedController(_:presentingController:sourceController:)` 要一个 animator，这里我们是提供 `TransitioningAnimator` 来实现自定义的 presentation animation。重申一下在 animator 中我们的 `toView`, `finalFrame` 之类的一切属性都要从 context 拿，不能简单地假设 frame 就是整个屏幕或者 `toView` 就是 presented vc 的 view 之类的。
6. 我们的 `TransitioningDelegate` 提供了所有 `UIKit` 需要的信息，它被释放了。
7. `UIKit` 向 `UIPresentationController` 的 `shouldRemovePresentersView()` 询问是不是要在 presentation 动画结束后移除掉 presenting 者的 view。我们的 presentation 完成之后是能够透过半透明的视图看到 presenting vc 的，所以应该返回 false（默认就是 false，因此不用重载）。`UIKit` 在整个 presentation 的过程中会多次咨询这个方法。
8. `UIPresentationController` 的 `presentationTransitionWillBegin()` 被调用。这里我们把自己提供的 `dimmingView` 拿出来，把 presented vc 的 view 加到 `dimmingView` 上，然后把 `dimmingView` 加到 containerView 上，并且用 coordinator 来将 `dimmingView` 的 `alpha` 从 0 animate 到 1。我们在这里做的事情和 Apple 文档中写的一模一样：把自定义的 view 加入到视图结构中并且 animate 与之相关的东西。
9. 在前一步中我们调用了 `UIPresentationController` 的 `presentedView()`。它默认返回 presented vc 的 view，我们可以提供一个不同的 view 来被 present，比如把 presented vc 的 view 包在一个 `UINavigationController` 的 view 内再提供出去。注意这个方法会被 `UIKit` 调用多次，所以不能在这里进行视图结构的设置，这些应该在第 8 步完成，这里需要迅速返回一个 view。额外扯一下，这是一个微妙的能力，因为国内 iOS 开发者肯定是开发 iPhone app 居多，我们在 present 一个 vc 之前是不是基本上都需要把它包在一个 `UINavigationController` 内呢？那么在 iOS 8 之后，我们可以指定 present 的 controller 是一个会把 presented vc 包装在 `UINavigationController` 内的 presentation controller，然后只管 present 就行。从实际看它省不了代码（反而还变多了...），不过从另一方面来看它解耦了代码的逻辑：vc 做的事情已经够多了，包装 presented vc 这样的杂事还是交给一个专门的 controller 来做。。。
10. 然后我们的 animator 的 `transitionDuration(_ transitionContext:)` 以及 `animateTransition(_ transitionContext:)` 被调用，开始进行自定义 presentation 的动画。这里当我们从 context 中取 `toViewController` 的 `finalFrame` 时，实际是从 `UIPresentationController` 的 `frameOfPresentedViewInContainerView()` 中拿的，`frameOfPresentedViewInContainerView()` 默认返回 container view 的大小，而在我们的实现中需要 presented vc 的 view 比整个屏幕小一圈，所以我们返回一个自己算的 frame。`UIKit` 会调用 `frameOfPresentedViewInContainerView()` 多次，所以这里的计算不能太复杂。这里有个微妙的地方是：这里的 frame 是 presented view 在 container view 中的 frame，而我们实际是把 presented view 加在了自己的 `dimmingView` 上的，因此这里要注意一致性。我们的 animator 提供的自定义动画会和之前 `UIPresentationController` 中 `presentationTransitionWillBegin()` 里 coordinator 设置的动画同时进行。
11. 在动画真正跑起来之前，`containerViewWillLayoutSubviews()` 以及 `containerViewDidLayoutSubviews()` 会被调用，这里 Apple 的说法是在 `containerViewWillLayoutSubviews()` 里调整自定义 view 的位置（我们的 `dimmingView`的位置就是在这里设置的），在 `containerViewDidLayoutSubviews()` 里对视图结构再作额外的调整。
12. 经过我们在 animator 里设置好的时间，animator 的动画跑完了，其 completion handler 被调用。
13. `presentationTransitionDidEnd(completed:)` 被调用，这里如果是未完成的话（比如是 interactive 的 presentation，人为取消了）我们需要把 `dimmingView` 移除掉，毕竟是自己加上去的。
14. 至此整个 presentation 就算完成了，`presentViewController:animated:completion:` 的 completion 会被调用。
15. 有趣的是，之前通过 coordinator 设置好的动画的 completion 是最后被调用的。

以上就是 presentation 过程 `UIPresentationController` 在 `UIKit` 中是如何工作的详解，知道了这些，我们在使用 `UIPresentationController` 进行自定义 presentation 的过程中就能最大限度地与之配合好好工作了。

有 present 就要有 dismiss，dismiss 的过程与之是类似的，这里不再描述。

`UIPresentationController` 还能通过其 `delegate` 配合设备的 trait collection 的变化进行 adaptive 的调整。

看到这里是不是额头上已经冒汗了？搞这么麻烦究竟是为什么啊？

# Why?

我对 `UIPresentationController` 的理解是逻辑的解耦。通过 `UIPresentationController`，被 present 的 vc 可以不必知道自己还需要提供一个半透明的视图能透过去看到 presenting vc，它只需要提供自己的 view 出来；而 presenting vc 也不必亲自对 presented vc 的 view 进行额外处理（比如将其 embed 到 `UINavigationController`），它只需要调用 present 就行，present 相关的逻辑都由 `UIPresentationController` 来处理；animator 纯粹就是用来 animate presentation 的过程，它不需要知道任何造成耦合的假设，任何信息都从 context 中直接拿；present 完成后，整个 presentation 的环境可以是 adaptive 的（通过 `UIAdaptivePresentationControllerDelegate`），并且这个 adaptive 的能力是由 presentation controller 提供的，被 present 的 vc 只要管好自己的 view 就行。

经过以上的分析，是不是能够理解 Apple 这样调整的理由了呢？

-------------

Written by 饿了么iOS组 － [axl411](https://github.com/axl411)