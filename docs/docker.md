![](https://ws1.sinaimg.cn/large/8696f529gy1fctm7nzgwqj207405zglw)  
> mobilists的 docker镜像是为了中心化而构建的，不过目前也适用于个人，本文档仅对饿了么内网用户

## 安装Docker
> for macOS  

访问 [https://www.docker.com/](https://www.docker.com/)下载 docker安装包并安装

## 拉取镜像  
1. 登录 docker.elenet.me，确认自己的账户密码
2. `docker login docker.elenet.me`
3. `docker pull docker.elenet.me/zhilong.wang/mobilists:stable`

## 运行

```
docker run -v path/to/mobilists:/data/app -v /Users/yourname/.ssh:/root/.ssh -p 8090:8090 -p 4000:4000 docker.elenet.me/zhilong.wang/mobilists:stable
```
请把 `path/to/mobilists` 改成 `mobilists`的本地绝对路径，`/Users/yourname/.ssh` 中的 yourname变量改为你的计算机用户名  
如果你希望这个容器后台运行，请在 `docker run` 后添加 `-d`  

随后访问 [localhost:8090]()进入UI编辑器，访问[localhost:4000]()预览博客效果  

## 写作指导
请查看 [写作指导](edit.md)