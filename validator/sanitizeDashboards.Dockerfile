FROM node:slim
WORKDIR /scripts
VOLUME  /definitions
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install
COPY . .
CMD ["npm", "run", "sanitize-dashboards"]
