# Mobilists

Blog for Eleme mobile team.

We're using [Hexo](https://hexo.io/).

## First Time Checkout

```
git clone git@github.com:eleme/mobilists.git
cd mobilists
git submodule init // themes/next is configured as a git submodule, which needs to be initialized if you are checking out the first time.
git submodule update // keep themes/next update to date
```

## Install Dev Tools

Firstly install these tools:

```
npm install hexo-cli -g
npm install hexo-generator-feed --save
npm install hexo-generator-category --save
npm install hexo-generator-archive --save
npm install hexo-deployer-git --save
```

Then cd the foler:
```
npm install
```

Then start writing following documentation on [Hexo](https://hexo.io/docs).

## Before Writing

Pull from remote master branch, so your deploy will include other people's new posts.

Run `git submodule update --remote` to update the theme.

## After Deploying

After deploying, you should push your changes to remote master branch so that when another person writes  and deploys, your post is included.
