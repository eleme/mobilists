FROM node:6.9
MAINTAINER stephenwzl 991405736@qq.com
EXPOSE 4000 8090
VOLUME ["/root/.ssh"]
VOLUME ["/data/app"]
COPY run.sh /
RUN chmod +x /run.sh
RUN npm install hexo-cli -g
CMD . /run.sh
